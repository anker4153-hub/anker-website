-- Reservierungen für "Zum Anker"
--
-- RLS-Hinweis: Die anonyme INSERT-Policy ist ABSICHTLICH — das öffentliche
-- Reservierungsformular auf der Website schreibt mit dem anon-Key. Anonyme
-- Nutzer dürfen jedoch NICHT lesen, ändern oder löschen. Lesen/Bearbeiten
-- ist authentifizierten Nutzern (Admin-Login) vorbehalten.

create extension if not exists "pgcrypto";

create table if not exists public.reservations (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  first_name        text not null,
  last_name         text not null,
  email             text not null,
  phone             text not null,
  reservation_date  date not null,
  reservation_time  text not null,
  party_size        integer not null check (party_size > 0 and party_size <= 50),
  seating           text not null default 'Terrasse'
                      check (seating in ('Terrasse', 'Innen')),
  special_requests  text,
  table_number      text,
  status            text not null default 'Ausstehend'
                      check (status in (
                        'Ausstehend', 'Bestätigt', 'Platziert', 'Abgelehnt',
                        'Storniert', 'No-Show', 'Erledigt'
                      ))
);

create index if not exists reservations_date_idx
  on public.reservations (reservation_date, reservation_time);

-- Row Level Security
alter table public.reservations enable row level security;

-- Öffentliches Formular darf anlegen (anon + authenticated).
drop policy if exists "public can insert reservations" on public.reservations;
create policy "public can insert reservations"
  on public.reservations
  for insert
  to anon, authenticated
  with check (true);

-- Nur authentifizierte Nutzer (Admin) dürfen lesen.
drop policy if exists "authenticated can read reservations" on public.reservations;
create policy "authenticated can read reservations"
  on public.reservations
  for select
  to authenticated
  using (true);

-- Nur authentifizierte Nutzer (Admin) dürfen ändern.
drop policy if exists "authenticated can update reservations" on public.reservations;
create policy "authenticated can update reservations"
  on public.reservations
  for update
  to authenticated
  using (true)
  with check (true);

-- Nur authentifizierte Nutzer (Admin) dürfen löschen.
drop policy if exists "authenticated can delete reservations" on public.reservations;
create policy "authenticated can delete reservations"
  on public.reservations
  for delete
  to authenticated
  using (true);

-- Realtime aktivieren, damit die Admin-Oberfläche neue Buchungen live sieht.
alter publication supabase_realtime add table public.reservations;
