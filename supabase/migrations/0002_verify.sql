-- Serverseitige Kampf-Pruefung (Anti-Cheat, Stufe 2).
-- Bisher meldet der Client den Sieger. Die Edge Function `verify-match` rechnet
-- den Kampf mit derselben deterministischen Engine (battle.js) nach.
-- Damit die Pruefung eine falsche Meldung RUECKGAENGIG machen kann, muss die
-- angewandte Elo-Differenz gespeichert sein.

alter table public.matches
  add column if not exists rating_delta int not null default 0,
  add column if not exists cheated boolean not null default false,
  -- Eingabe-Protokoll: WANN der Spieler welche Ult gezuendet hat.
  -- Ohne das kann der Server den Kampf nicht exakt nachspielen, weil Ults
  -- manuell ausgeloest werden. Format: [{ "slot": 0, "t": 4820 }, ...]
  add column if not exists inputs jsonb not null default '[]'::jsonb;

-- submit_match schreibt Differenz und Eingabe-Protokoll mit.
drop function if exists public.submit_match(int, uuid, jsonb, jsonb, text[], text, int);
create or replace function public.submit_match(
  p_season int,
  p_defender uuid,
  p_attacker_units jsonb,
  p_defender_units jsonb,
  p_mods text[],
  p_winner text,
  p_duration_ms int,
  p_inputs jsonb default '[]'::jsonb
) returns int
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

  select count(*) into v_recent from public.matches
   where attacker_id = v_att and created_at > now() - interval '1 hour';
  if v_recent >= 30 then raise exception 'rate limit'; end if;

  insert into public.ladder (player_id, season) values (v_att, p_season) on conflict do nothing;
  insert into public.ladder (player_id, season) values (p_defender, p_season) on conflict do nothing;

  select rating into v_ra from public.ladder where player_id = v_att and season = p_season;
  select rating into v_rd from public.ladder where player_id = p_defender and season = p_season;

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
                              defender_units, mods, winner, duration_ms, rating_delta, inputs)
  values (p_season, v_att, p_defender, p_attacker_units, p_defender_units,
          coalesce(p_mods, '{}'), p_winner, p_duration_ms, v_delta,
          coalesce(p_inputs, '[]'::jsonb));

  select rating into v_ra from public.ladder where player_id = v_att and season = p_season;
  return v_ra;
end;
$$;

-- Wird NUR von der Edge Function (service_role) aufgerufen: Ergebnis der Pruefung
-- eintragen und bei Betrug die Wertung exakt zurueckdrehen.
create or replace function public.apply_verification(p_match uuid, p_true_winner text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare m record;
begin
  select * into m from public.matches where id = p_match;
  if not found then raise exception 'match not found'; end if;
  if m.verified then return; end if;                       -- schon geprueft

  if m.winner = p_true_winner then
    update public.matches set verified = true where id = p_match;
  else
    -- Falsche Meldung: angewandte Differenz zuruecknehmen, Sieg/Niederlage korrigieren.
    update public.ladder
       set rating = rating - m.rating_delta,
           wins = greatest(0, wins - case when m.winner = 'attacker' then 1 else 0 end),
           losses = greatest(0, losses - case when m.winner = 'attacker' then 0 else 1 end),
           updated_at = now()
     where player_id = m.attacker_id and season = m.season;
    update public.ladder
       set rating = rating + m.rating_delta,
           wins = greatest(0, wins - case when m.winner = 'defender' then 1 else 0 end),
           losses = greatest(0, losses - case when m.winner = 'defender' then 0 else 1 end),
           updated_at = now()
     where player_id = m.defender_id and season = m.season;
    update public.matches
       set verified = true, cheated = true, winner = p_true_winner
     where id = p_match;
  end if;
end;
$$;

revoke execute on function public.apply_verification(uuid, text) from anon, authenticated;
