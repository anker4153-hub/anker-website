# Implementation Plan — Reservation Admin Panel (Supabase + Resend)

Restaurant site "Zum Anker". Stack: Vite 8 + React 19 + TS 5.9 + Tailwind v4, pnpm. Dev
server already runs on :8443 (do NOT start it). Verify with `pnpm exec tsc --noEmit` and
`pnpm build`. Code style: NO semicolons, double quotes, 2-space indent. UI is GERMAN.

## Decisions (made here, do not re-litigate)

- Status set (ONE canonical set, German, used in DB default, form, admin, CSS classes):
  `Ausstehend`, `Bestätigt`, `Platziert`, `Storniert`, `Abgeschlossen`, `No-Show`.
  Existing CSS already has lowercase status classes `.status.bestätigt`, `.status.platziert`,
  `.status.ausstehend`. Status CSS class = `status-<slug>` where slug is a lowercase ASCII
  slug (bestaetigt, platziert, ausstehend, storniert, abgeschlossen, no-show) to avoid umlaut
  class issues — add all six to index.css. Keep each badge's dark-theme color.
- Supabase client: singleton in `src/lib/supabase.ts` from `import.meta.env.VITE_SUPABASE_URL`
  and `VITE_SUPABASE_ANON_KEY`. Export `isSupabaseConfigured` boolean. When unset, export a
  `null` client (do NOT call createClient) and console.warn once. All callers check config and
  fail soft with the German message "Supabase nicht konfiguriert".
- Resend is server-side only via a Supabase Edge Function (Deno). The browser never sees the
  key. Form invokes it AFTER a successful insert; email failure never blocks the reservation.
- Admin auth: Supabase email/password gate (`signInWithPassword`) rendered before the dashboard
  when there is no session. No hardcoded credentials. Needed because anon cannot SELECT.
- Occupancy KPI: there is no table-inventory source, so define occupancy as
  `platzierte Reservierungen des Tages / Gesamtkapazität`, with capacity a module constant
  `TOTAL_TABLES = 22` documented inline as an assumption (easily changed). Show as a percent
  with the existing `.progress` bar.
- Admin nav: `Übersicht` (KPIs + today's list) and `Reservierungen` (full filterable list) are
  real views and switch content. `Tischplan`, `Speisekarte`, `Einstellungen` have no real data
  source; keep them visible but visibly disabled ("Bald verfügbar"), no dead silent buttons.
- The edge function and SQL live outside `src`, so `tsc`/`build` do not type-check them (tsconfig
  `include` is `["src","vite.config.ts"]`). That is intentional — Deno globals won't break build.

## Fail-soft contract (every data path)

- No config: public form submit shows a friendly German error, does NOT crash; admin shows
  "Supabase nicht konfiguriert" panel instead of data/login. App builds and renders fully.
- Insert/select/update errors: catch, surface a German message, roll back optimistic UI.
- Email invoke failure: log to console, show success to the guest anyway (soft warning at most).

## Steps

- [ ] 1. Add the Supabase client dependency.
      Run `pnpm add @supabase/supabase-js@^2` (latest v2, ~2.116). Confirm it lands in
      `dependencies` and the lockfile updates.
      Files: package.json, pnpm-lock.yaml
      Verify: `pnpm install` completes; `pnpm exec tsc --noEmit` still passes.

- [ ] 2. Type the client env vars and create the Supabase singleton.
      Augment `src/vite-env.d.ts` with an `ImportMetaEnv` interface declaring
      `readonly VITE_SUPABASE_URL: string` and `readonly VITE_SUPABASE_ANON_KEY: string` plus
      `interface ImportMeta { readonly env: ImportMetaEnv }`. Create `src/lib/supabase.ts`
      exporting `supabase` (SupabaseClient | null), `isSupabaseConfigured` (boolean), and a
      shared `Reservation` row type matching the DB columns. When env vars are missing, keep
      client null and console.warn once. No semicolons, double quotes.
      Files: src/vite-env.d.ts, src/lib/supabase.ts
      Verify: `pnpm exec tsc --noEmit` passes; `pnpm build` passes (no env vars set).

- [ ] 3. Write the reservations SQL migration.
      Create `supabase/migrations/0001_reservations.sql`. Top-of-file comment documents that the
      anon INSERT policy is intentional (public booking form). Table `reservations`: id uuid pk
      default gen_random_uuid(), created_at timestamptz default now(), updated_at timestamptz
      default now(), first_name text, last_name text, email text, phone text, reservation_date
      date, reservation_time text, party_size int, seating text (check in 'Terrasse','Innen'),
      special_requests text null, status text default 'Ausstehend' (check in the six canonical
      values), table_number text null. Enable RLS. Policies: anon INSERT allowed; SELECT/UPDATE/
      DELETE for `authenticated` only. Add an updated_at trigger.
      Files: supabase/migrations/0001_reservations.sql
      Verify: file present and internally consistent (SQL is applied manually later; it is not
      run by the build). `pnpm build` unaffected.

- [ ] 4. Write the Resend edge function.
      Create `supabase/functions/send-reservation-email/index.ts` using `Deno.serve`. Handle
      OPTIONS preflight with CORS headers (Access-Control-Allow-Origin \*, allow POST + headers).
      Read `RESEND_API_KEY`, `FROM_EMAIL`, `RESTAURANT_EMAIL` from `Deno.env`. Parse JSON body
      with reservation details, POST to https://api.resend.com/emails: a German HTML confirmation
      to the guest and a notification to the restaurant. Return JSON; on error return 200-soft or
      a clear error the caller tolerates. German email copy, brand name "Zum Anker".
      Files: supabase/functions/send-reservation-email/index.ts
      Verify: not part of the TS build; confirm by reading that CORS/preflight, env reads, and
      fetch shape are correct. `pnpm build` unaffected.

- [ ] 5. Rewrite the public Reservation form to persist + email.
      In `src/App.tsx`, keep the EXACT 3-step layout, seating options, and success screen. Add
      controlled state for date/time/guests/seating/first_name/last_name/email/phone/
      special_requests. On submit: if `!isSupabaseConfigured` show German error and stop; else
      INSERT into reservations (status 'Ausstehend'), on success `supabase.functions.invoke(
      "send-reservation-email", { body })` (await, tolerate failure), then show success screen.
      Add submitting + error UI states within the existing design. No new visual redesign.
      Files: src/App.tsx
      Verify: `pnpm exec tsc --noEmit` and `pnpm build` pass; without env vars the submit path
      shows the German error and does not throw (confirm by reading the code).

- [ ] 6. Create the admin data hook (realtime + fail-soft).
      Create `src/admin/useReservations.ts`: loads reservations on mount (guarded by
      isSupabaseConfigured), exposes loading/error/empty, subscribes via
      `supabase.channel("reservations").on("postgres_changes", {event:"*",schema:"public",
      table:"reservations"}, ...)` and cleans up on unmount. Expose CRUD helpers:
      `updateStatus`, `assignTable`, `createReservation`, `remove` with optimistic update +
      rollback on error. When not configured, return a not-configured flag and no-op mutations.
      Files: src/admin/useReservations.ts
      Verify: `pnpm exec tsc --noEmit` passes.

- [ ] 7. Build the admin login gate + shared admin pieces.
      Create `src/admin/AdminAuth.tsx` (email/password form, dark theme, uses existing
      `.btn`/field styles, German labels, `signInWithPassword`, error display) and
      `src/admin/adminUtils.ts` (initials, status slug map, date helpers, KPI calculators). If
      not configured, the gate area renders the "Supabase nicht konfiguriert" panel instead.
      Files: src/admin/AdminAuth.tsx, src/admin/adminUtils.ts
      Verify: `pnpm exec tsc --noEmit` passes.

- [ ] 8. Rewrite the Admin component into a real operations console.
      Create `src/admin/AdminPanel.tsx` (and small subcomponents: `ReservationRow`,
      `ReservationDrawer`, `ReservationForm`, `Kpis`, `Toolbar`). Features: session gate (show
      AdminAuth when no session, else panel; sign-out), live data via useReservations, date nav
      (prev/next/today/tomorrow/date input + "Alle"), free-text search (name/email/phone), status
      + seating filters (chips/select), sort by time and created_at, list with initials avatar/
      time/party/seating/table/status badge/quick contact, status actions (Bestätigen, Platzieren,
      Stornieren, Als No-Show markieren, Abschließen) with optimistic update, inline table_number
      edit, detail drawer with all fields + edit + delete (confirm), "+ Neue Reservierung" form
      (inserts as 'Bestätigt'), REAL KPIs (today's count, expected guests = sum party_size,
      pending count, occupancy per the decision), loading/error/empty states, nav view switching
      with disabled "Bald verfügbar" items. Replace the old `Admin` usage in `App.tsx` with the
      new component (default export wiring). Keep the dark aesthetic; reuse Icon/Logo (add icon
      paths search, mail, x, refresh, trash, edit, filter to the Icon component).
      Files: src/admin/AdminPanel.tsx, src/admin/*, src/App.tsx
      Verify: `pnpm exec tsc --noEmit` and `pnpm build` pass; admin renders the not-configured
      panel without env vars (confirm by reading code).

- [ ] 9. Extend admin CSS for the new UI.
      In `src/index.css`, extend the `/* Admin */` section: six `.status-<slug>` badge colors,
      search/filter/chip styles, drawer/modal, inline edit input, new-reservation form, loading/
      empty/error states, login-gate styles, "Bald verfügbar" disabled nav state. Keep dark
      palette (#171412 / #211d1a / #352e2a) and the 1000/760/440px breakpoints responsive.
      Files: src/index.css
      Verify: `pnpm build` passes; spot-check layout at the three breakpoints by reading the CSS.

- [ ] 10. Config + docs + env example.
      Create `.env.example` at repo root (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY; a comment
      that RESEND_API_KEY / FROM_EMAIL / RESTAURANT_EMAIL are Edge Function secrets, NOT VITE_
      vars). Confirm `.gitignore` already ignores `.env*` (it does). Create `SUPABASE_SETUP.md`:
      apply migration, `supabase secrets set RESEND_API_KEY=...`, `supabase functions deploy
      send-reservation-email`, verify a Resend sending domain, create an admin user.
      Files: .env.example, SUPABASE_SETUP.md
      Verify: no real secrets committed; `git status` shows no `.env` tracked.

- [ ] 11. Final verification.
      Run `pnpm install`, then `pnpm exec tsc --noEmit` and `pnpm build` — both pass. Confirm
      fail-soft: build without env vars does not throw; admin shows the German not-configured
      panel; public form submit shows a friendly German error. Confirm no secrets committed and
      `.env` is gitignored. Document what still needs real credentials (apply migration, deploy
      edge function, create admin user, verify Resend domain, one real booking round-trip).
      Files: (none — verification only)
      Verify: `pnpm exec tsc --noEmit` and `pnpm build` both exit 0.

## What still needs real credentials (document in the final report)

- Apply `0001_reservations.sql` to the Supabase project.
- `supabase functions deploy send-reservation-email` and `supabase secrets set RESEND_API_KEY=…`.
- Verify a sending domain in Resend; set FROM_EMAIL / RESTAURANT_EMAIL.
- Create an admin user (Supabase Auth) for the login gate.
- End-to-end booking round-trip (insert + email + realtime) requires the live project.
