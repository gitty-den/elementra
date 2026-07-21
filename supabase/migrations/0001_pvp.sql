-- Elementra — Async-PVP (Langzeit-Hebel 3).
-- Modell: KEIN Echtzeit-Netcode. Man kämpft gegen den TEAM-SCHNAPPSCHUSS eines
-- anderen Spielers (dessen Aufstellung, von der KI gespielt) — wie Super Auto Pets.
-- Damit reicht eine simple Datenbank; battle.js bleibt unverändert.
--
-- Anti-Cheat-Grundsatz: Der Client darf NIE seine Wertung schreiben. Wertung und
-- Kampf-Protokoll laufen ausschliesslich ueber SECURITY DEFINER-Funktionen.
-- Stufe 2 (spaeter): Edge Function rechnet den Kampf mit battle.js nach —
-- die Engine ist deterministisch (kein Math.random, kein Date.now), also
-- liefert derselbe Input immer denselben Sieger.

-- ---------------------------------------------------------------- Spieler ----

create table if not exists public.players (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 16),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.players enable row level security;

-- Namen sind oeffentlich lesbar (Rangliste), aber nur selbst schreibbar.
drop policy if exists players_read_all on public.players;
create policy players_read_all on public.players
  for select using (true);
drop policy if exists players_write_own on public.players;
create policy players_write_own on public.players
  for insert with check (auth.uid() = id);
drop policy if exists players_update_own on public.players;
create policy players_update_own on public.players
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ------------------------------------------------------- Team-Schnappschuss ---
-- units: [{ "cid": "fire_drache", "level": 5, "item": "toxinzahn", "slot": 0 }, ...]
-- Genau das Format, das createBattle() als allyDefs/enemyDefs erwartet.

create table if not exists public.team_snapshots (
  id          uuid primary key default gen_random_uuid(),
  player_id   uuid not null references public.players (id) on delete cascade,
  season      int  not null,
  power       int  not null check (power >= 0),   -- grober Staerke-Index fuers Matchmaking
  units       jsonb not null,
  created_at  timestamptz not null default now(),
  unique (player_id, season)
);

create index if not exists team_snapshots_matchmaking
  on public.team_snapshots (season, power);

alter table public.team_snapshots enable row level security;

-- Alle Schnappschuesse sind lesbar — sie SIND der Gegner-Pool.
drop policy if exists snapshots_read_all on public.team_snapshots;
create policy snapshots_read_all on public.team_snapshots
  for select using (true);
drop policy if exists snapshots_write_own on public.team_snapshots;
create policy snapshots_write_own on public.team_snapshots
  for insert with check (auth.uid() = player_id);
drop policy if exists snapshots_update_own on public.team_snapshots;
create policy snapshots_update_own on public.team_snapshots
  for update using (auth.uid() = player_id) with check (auth.uid() = player_id);

-- ---------------------------------------------------------------- Rangliste ---

create table if not exists public.ladder (
  player_id   uuid not null references public.players (id) on delete cascade,
  season      int  not null,
  rating      int  not null default 1000,
  wins        int  not null default 0,
  losses      int  not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (player_id, season)
);

create index if not exists ladder_rank on public.ladder (season, rating desc);

alter table public.ladder enable row level security;

-- Lesen ja, schreiben NEIN: die Wertung aendert nur submit_match().
drop policy if exists ladder_read_all on public.ladder;
create policy ladder_read_all on public.ladder
  for select using (true);

-- ----------------------------------------------------------- Kampf-Protokoll --
-- Jeder Kampf wird mitgeschrieben: Beleg fuer die Wertung und Eingabe fuer die
-- spaetere serverseitige Nachrechnung (verified).

create table if not exists public.matches (
  id               uuid primary key default gen_random_uuid(),
  season           int  not null,
  attacker_id      uuid not null references public.players (id) on delete cascade,
  defender_id      uuid not null references public.players (id) on delete cascade,
  attacker_units   jsonb not null,
  defender_units   jsonb not null,
  mods             text[] not null default '{}',   -- Wochen-Modifikatoren (ascension.js)
  winner           text not null check (winner in ('attacker', 'defender')),
  duration_ms      int  not null check (duration_ms >= 0),
  verified         boolean not null default false, -- true, sobald der Server nachgerechnet hat
  created_at       timestamptz not null default now()
);

create index if not exists matches_by_attacker
  on public.matches (attacker_id, created_at desc);

alter table public.matches enable row level security;

-- Nur die eigenen Kaempfe lesen; Schreiben ausschliesslich ueber submit_match().
drop policy if exists matches_read_own on public.matches;
create policy matches_read_own on public.matches
  for select using (auth.uid() = attacker_id or auth.uid() = defender_id);

-- ------------------------------------------------------------------ Funktionen

-- Eigenen Team-Schnappschuss setzen (Upsert je Season).
create or replace function public.upsert_snapshot(p_season int, p_power int, p_units jsonb)
returns void
language plpgsql
security invoker
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if jsonb_array_length(p_units) between 1 and 3 then
    insert into public.team_snapshots (player_id, season, power, units)
    values (auth.uid(), p_season, p_power, p_units)
    on conflict (player_id, season)
    do update set power = excluded.power, units = excluded.units, created_at = now();
  else
    raise exception 'team must hold 1..3 units';
  end if;
end;
$$;

-- Gegner suchen: naechstliegende Staerke, nie man selbst, zufaellig aus den
-- besten Treffern (damit nicht alle gegen denselben kaempfen).
create or replace function public.find_opponent(p_season int, p_power int)
returns table (player_id uuid, name text, power int, units jsonb, rating int)
language sql
security definer
set search_path = public
as $$
  select s.player_id, p.name, s.power, s.units, coalesce(l.rating, 1000) as rating
  from public.team_snapshots s
  join public.players p on p.id = s.player_id
  left join public.ladder l on l.player_id = s.player_id and l.season = s.season
  where s.season = p_season
    and s.player_id <> auth.uid()
  order by abs(s.power - p_power), random()
  limit 1;
$$;

-- Kampf melden. Der Client liefert das Ergebnis, ABER die Wertung rechnet der
-- Server (Elo). Der Client kann `ladder` nicht direkt anfassen.
-- Stufe 2: hier zusaetzlich die Edge Function aufrufen, die battle.js nachrechnet,
-- und `verified` setzen bzw. bei Abweichung die Wertung zurueckdrehen.
create or replace function public.submit_match(
  p_season int,
  p_defender uuid,
  p_attacker_units jsonb,
  p_defender_units jsonb,
  p_mods text[],
  p_winner text,
  p_duration_ms int
) returns int                    -- neue Wertung des Angreifers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_att uuid := auth.uid();
  v_ra int; v_rd int;
  v_expected numeric; v_score numeric; v_delta int;
  v_recent int;
begin
  if v_att is null then raise exception 'not authenticated'; end if;
  if v_att = p_defender then raise exception 'cannot fight yourself'; end if;
  if p_winner not in ('attacker', 'defender') then raise exception 'bad winner'; end if;

  -- Missbrauchsbremse: hoechstens 30 gewertete Kaempfe pro Stunde.
  select count(*) into v_recent from public.matches
   where attacker_id = v_att and created_at > now() - interval '1 hour';
  if v_recent >= 30 then raise exception 'rate limit'; end if;

  insert into public.ladder (player_id, season) values (v_att, p_season)
    on conflict do nothing;
  insert into public.ladder (player_id, season) values (p_defender, p_season)
    on conflict do nothing;

  select rating into v_ra from public.ladder where player_id = v_att and season = p_season;
  select rating into v_rd from public.ladder where player_id = p_defender and season = p_season;

  -- Elo, K = 24
  v_expected := 1.0 / (1.0 + power(10.0, (v_rd - v_ra) / 400.0));
  v_score := case when p_winner = 'attacker' then 1 else 0 end;
  v_delta := round(24 * (v_score - v_expected));

  update public.ladder
     set rating = rating + v_delta,
         wins = wins + case when p_winner = 'attacker' then 1 else 0 end,
         losses = losses + case when p_winner = 'attacker' then 0 else 1 end,
         updated_at = now()
   where player_id = v_att and season = p_season;

  update public.ladder
     set rating = rating - v_delta,
         wins = wins + case when p_winner = 'defender' then 1 else 0 end,
         losses = losses + case when p_winner = 'defender' then 0 else 1 end,
         updated_at = now()
   where player_id = p_defender and season = p_season;

  insert into public.matches (season, attacker_id, defender_id, attacker_units,
                              defender_units, mods, winner, duration_ms)
  values (p_season, v_att, p_defender, p_attacker_units, p_defender_units,
          coalesce(p_mods, '{}'), p_winner, p_duration_ms);

  select rating into v_ra from public.ladder where player_id = v_att and season = p_season;
  return v_ra;
end;
$$;

-- Rangliste einer Season (Top N).
create or replace function public.leaderboard(p_season int, p_limit int default 50)
returns table (rank bigint, player_id uuid, name text, rating int, wins int, losses int)
language sql
security definer
set search_path = public
as $$
  select row_number() over (order by l.rating desc) as rank,
         l.player_id, p.name, l.rating, l.wins, l.losses
  from public.ladder l
  join public.players p on p.id = l.player_id
  where l.season = p_season
  order by l.rating desc
  limit p_limit;
$$;
