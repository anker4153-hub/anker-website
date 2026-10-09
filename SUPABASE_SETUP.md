# Supabase + Resend einrichten

Ohne Konfiguration läuft die App im **Demo-Modus**: Reservierungen werden im
`localStorage` des Browsers gespeichert, damit sich die Admin-Oberfläche voll
bedienen lässt. Für den echten Betrieb folgende Schritte.

## 1. Supabase-Projekt & Client-Keys

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Unter **Project Settings → API** die Werte kopieren.
3. `.env.example` nach `.env` kopieren und ausfüllen:

   ```
   VITE_SUPABASE_URL=https://DEIN-PROJEKT.supabase.co
   VITE_SUPABASE_ANON_KEY=dein-anon-key
   ```

   `.env` ist bereits in `.gitignore` — niemals committen.

## 2. Datenbank-Migration

Die Tabelle `reservations` inkl. RLS-Policies und Realtime liegt in
`supabase/migrations/0001_reservations.sql`.

- Mit CLI: `supabase db push`
- Oder: SQL-Inhalt im **SQL Editor** des Dashboards ausführen.

Wichtig: Die **anonyme INSERT-Policy ist Absicht** — das öffentliche Formular
schreibt mit dem anon-Key. Lesen/Ändern/Löschen ist nur für eingeloggte
Admins erlaubt.

## 3. Edge Function für E-Mails (Resend)

Resend darf **nie aus dem Browser** aufgerufen werden (API-Key + CORS). Daher
läuft der Versand serverseitig in `supabase/functions/send-reservation-email`.

1. In Resend eine **Sender-Domain verifizieren** (oder zum Testen
   `onboarding@resend.dev` nutzen) und einen API-Key erzeugen.
2. Secrets setzen:

   ```
   supabase secrets set RESEND_API_KEY=re_xxx
   supabase secrets set FROM_EMAIL="Zum Anker <reservierung@deine-domain.de>"
   supabase secrets set RESTAURANT_EMAIL="info@deine-domain.de"   # optional
   ```

3. Function deployen:

   ```
   supabase functions deploy send-reservation-email
   ```

Der E-Mail-Versand ist **best-effort**: Schlägt er fehl, wird die Reservierung
trotzdem gespeichert, der Gast sieht einen dezenten Hinweis.

## 4. Admin-Zugang

Die Admin-Oberfläche liest Daten und benötigt dafür einen eingeloggten Nutzer
(RLS). Lege im Dashboard unter **Authentication → Users** einen Admin-Nutzer
(E-Mail + Passwort) an.

> Hinweis: In dieser Version ist die Admin-Ansicht über den Footer-Link
> „Admin Dashboard“ erreichbar. Für den Produktivbetrieb empfiehlt sich ein
> Login-Gate mit `supabase.auth.signInWithPassword` vor dem Dashboard — die
> Datenzugriffe sind bereits so gebaut, dass sie unter Auth greifen.

## 5. Prüfen

- `pnpm dev` starten, Formular auf der Website absenden → Zeile erscheint in
  Supabase (`reservations`) und live in der Admin-Oberfläche.
- Bestätigungs-E-Mail prüfen (Resend-Logs).
