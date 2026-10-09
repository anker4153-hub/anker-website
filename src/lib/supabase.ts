import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * True when both env vars are present. When false, the app still renders
 * and every data call fails soft with a clear German message instead of
 * crashing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in a .env
 * file to enable the live backend (see SUPABASE_SETUP.md).
 */
export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    "[Supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY fehlen. " +
      "Die App läuft im Demo-Modus ohne Backend. Siehe SUPABASE_SETUP.md.",
  )
}

/**
 * Singleton client. When env vars are missing we still create a client with
 * harmless placeholder values so imports don't throw; guard real calls with
 * `isSupabaseConfigured`.
 */
export const supabase: SupabaseClient = createClient(
  url ?? "https://placeholder.supabase.co",
  anonKey ?? "placeholder-anon-key",
)

export type ReservationStatus =
  | "Ausstehend"
  | "Bestätigt"
  | "Platziert"
  | "Abgelehnt"
  | "Storniert"
  | "No-Show"
  | "Erledigt"

export const RESERVATION_STATUSES: ReservationStatus[] = [
  "Ausstehend",
  "Bestätigt",
  "Platziert",
  "Abgelehnt",
  "Storniert",
  "No-Show",
  "Erledigt",
]

export type Seating = "Terrasse" | "Innen"

export type Reservation = {
  id: string
  created_at: string
  updated_at?: string | null
  first_name: string
  last_name: string
  email: string
  phone: string
  reservation_date: string
  reservation_time: string
  party_size: number
  seating: Seating
  special_requests: string | null
  status: ReservationStatus
  table_number: string | null
}

export type NewReservation = {
  first_name: string
  last_name: string
  email: string
  phone: string
  reservation_date: string
  reservation_time: string
  party_size: number
  seating: Seating
  special_requests?: string | null
  status?: ReservationStatus
  table_number?: string | null
}
