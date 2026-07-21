-- ===================================================================
-- Cloud-Spielstand (21.07.2026, Runde 9)
-- ===================================================================
-- Problem: Profile lagen bisher NUR im localStorage des jeweiligen Browsers.
-- Vom iPhone sah man die PC-Profile nicht und umgekehrt.
--
-- Loesung: Der Spielstand wird unter einem kurzen CODE + 4-stelliger PIN in der
-- Cloud abgelegt. Auf einem anderen Geraet gibt man Code + PIN ein und laedt ihn.
--
-- Sicherheitsmodell (bewusst einfach, Hobby-Spiel):
-- - Die Tabelle hat KEINE Lese-Policy. Kein Client kann sie direkt abfragen.
-- - Zugriff laeuft ausschliesslich ueber die beiden SECURITY-DEFINER-Funktionen,
--   die Code + PIN im Server pruefen.
-- - Der Code ist 8 Zeichen aus einem unverwechselbaren Alphabet (32^8 ~ 1e12);
--   zusammen mit der PIN reicht das gegen zufaelliges Raten. Es ist KEIN
--   Kontoschutz — wer Code UND PIN kennt, hat den Spielstand.

create table if not exists public.cloud_saves (
  code        text primary key,
  owner_id    uuid references auth.users(id) on delete set null,
  pin         text not null,
  name        text not null default 'Spieler',
  data        jsonb not null,
  updated_at  timestamptz not null default now(),
  pulls       int not null default 0
);

alter table public.cloud_saves enable row level security;
-- Absicht: KEINE Policy. Damit ist die Tabelle fuer Clients komplett dicht;
-- nur die Funktionen unten (security definer) kommen heran.

-- Code erzeugen: 8 Zeichen, ohne 0/O/1/I/L (Verwechslungsgefahr beim Abtippen).
create or replace function public.cloud_new_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alpha text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  v_code text;
  v_i int;
begin
  loop
    v_code := '';
    for v_i in 1..8 loop
      v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1);
    end loop;
    exit when not exists (select 1 from public.cloud_saves where code = v_code);
  end loop;
  return v_code;
end;
$$;

-- Hochladen. p_code leer/null => neuer Code wird erzeugt und zurueckgegeben.
-- Bei vorhandenem Code muss die PIN stimmen (sonst kann niemand fremde
-- Spielstaende ueberschreiben).
create or replace function public.cloud_push(
  p_code text,
  p_pin  text,
  p_name text,
  p_data jsonb
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := nullif(upper(trim(coalesce(p_code, ''))), '');
  v_row  public.cloud_saves%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if p_pin is null or length(p_pin) <> 4 then raise exception 'pin must be 4 digits'; end if;
  if p_data is null then raise exception 'no data'; end if;
  -- Grobe Groessengrenze: ein Spielstand ist wenige KB.
  if length(p_data::text) > 400000 then raise exception 'save too large'; end if;

  if v_code is null then
    v_code := public.cloud_new_code();
    insert into public.cloud_saves (code, owner_id, pin, name, data)
    values (v_code, auth.uid(), p_pin, coalesce(nullif(trim(p_name), ''), 'Spieler'), p_data);
    return v_code;
  end if;

  select * into v_row from public.cloud_saves where code = v_code;
  if not found then raise exception 'unknown code'; end if;
  if v_row.pin <> p_pin then raise exception 'wrong pin'; end if;

  update public.cloud_saves
     set data = p_data,
         name = coalesce(nullif(trim(p_name), ''), name),
         owner_id = auth.uid(),
         updated_at = now()
   where code = v_code;
  return v_code;
end;
$$;

-- Herunterladen. Liefert genau eine Zeile mit Name, Daten und Zeitstempel.
create or replace function public.cloud_pull(p_code text, p_pin text)
returns table (name text, data jsonb, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := nullif(upper(trim(coalesce(p_code, ''))), '');
  v_row  public.cloud_saves%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if v_code is null then raise exception 'no code'; end if;

  select * into v_row from public.cloud_saves where code = v_code;
  if not found then raise exception 'unknown code'; end if;
  if v_row.pin <> coalesce(p_pin, '') then raise exception 'wrong pin'; end if;

  update public.cloud_saves set pulls = pulls + 1 where code = v_code;

  name := v_row.name; data := v_row.data; updated_at := v_row.updated_at;
  return next;
end;
$$;

revoke all on function public.cloud_new_code() from anon, authenticated;
grant execute on function public.cloud_push(text, text, text, jsonb) to authenticated;
grant execute on function public.cloud_pull(text, text) to authenticated;
