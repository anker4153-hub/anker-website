import {
  supabase,
  isSupabaseConfigured,
  type NewReservation,
  type Reservation,
  type ReservationStatus,
} from "./supabase"

const TABLE = "reservations"
const DEMO_KEY = "zumanker.demo.reservations"

/* ---------- Demo-Modus (ohne Backend) --------------------------------- */
/* Hält Reservierungen im localStorage, damit die Admin-Oberfläche auch   */
/* ohne Supabase-Konfiguration vollständig benutzbar ist.                 */

function todayISO(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const demoSeed: Reservation[] = [
  {
    id: "demo-1",
    created_at: new Date().toISOString(),
    first_name: "Clara",
    last_name: "Weber",
    email: "clara.weber@beispiel.de",
    phone: "+49 151 2345678",
    reservation_date: todayISO(),
    reservation_time: "18:00",
    party_size: 2,
    seating: "Terrasse",
    special_requests: "Fensterplatz, wenn möglich.",
    status: "Platziert",
    table_number: "T04",
  },
  {
    id: "demo-2",
    created_at: new Date().toISOString(),
    first_name: "Familie",
    last_name: "Schmitz",
    email: "schmitz@beispiel.de",
    phone: "+49 170 9876543",
    reservation_date: todayISO(),
    reservation_time: "18:30",
    party_size: 5,
    seating: "Innen",
    special_requests: null,
    status: "Bestätigt",
    table_number: "T12",
  },
  {
    id: "demo-3",
    created_at: new Date().toISOString(),
    first_name: "Lena",
    last_name: "Hoffmann",
    email: "lena.h@beispiel.de",
    phone: "+49 160 1122334",
    reservation_date: todayISO(),
    reservation_time: "19:00",
    party_size: 2,
    seating: "Terrasse",
    special_requests: "Feiert Geburtstag.",
    status: "Ausstehend",
    table_number: null,
  },
  {
    id: "demo-4",
    created_at: new Date().toISOString(),
    first_name: "Michael",
    last_name: "Kühn",
    email: "m.kuehn@beispiel.de",
    phone: "+49 151 5566778",
    reservation_date: todayISO(1),
    reservation_time: "19:30",
    party_size: 4,
    seating: "Innen",
    special_requests: "Allergie: Nüsse.",
    status: "Bestätigt",
    table_number: "T09",
  },
  {
    id: "demo-5",
    created_at: new Date().toISOString(),
    first_name: "Sophie",
    last_name: "Bernard",
    email: "sophie.b@beispiel.de",
    phone: "+49 152 2233445",
    reservation_date: todayISO(1),
    reservation_time: "20:00",
    party_size: 3,
    seating: "Terrasse",
    special_requests: null,
    status: "Ausstehend",
    table_number: null,
  },
]

function demoRead(): Reservation[] {
  if (typeof localStorage === "undefined") return [...demoSeed]
  const raw = localStorage.getItem(DEMO_KEY)
  if (!raw) {
    localStorage.setItem(DEMO_KEY, JSON.stringify(demoSeed))
    return [...demoSeed]
  }
  try {
    return JSON.parse(raw) as Reservation[]
  } catch {
    return [...demoSeed]
  }
}

function demoWrite(rows: Reservation[]): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(DEMO_KEY, JSON.stringify(rows))
}

const demoListeners = new Set<() => void>()
function demoNotify() {
  demoListeners.forEach((fn) => fn())
}

/* ---------- Öffentliche API ------------------------------------------- */

export async function fetchReservations(): Promise<Reservation[]> {
  if (!isSupabaseConfigured) {
    return demoRead().sort(sortByDateTime)
  }
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("reservation_date", { ascending: true })
    .order("reservation_time", { ascending: true })
  if (error) throw error
  return (data ?? []) as Reservation[]
}

export async function createReservation(
  input: NewReservation,
): Promise<Reservation> {
  const row = {
    status: "Ausstehend" as ReservationStatus,
    special_requests: null,
    table_number: null,
    ...input,
  }
  if (!isSupabaseConfigured) {
    const created: Reservation = {
      ...row,
      id: `demo-${Date.now()}`,
      created_at: new Date().toISOString(),
    }
    const rows = [created, ...demoRead()]
    demoWrite(rows)
    demoNotify()
    return created
  }
  const { data, error } = await supabase
    .from(TABLE)
    .insert(row)
    .select()
    .single()
  if (error) throw error
  return data as Reservation
}

export async function updateReservation(
  id: string,
  patch: Partial<Reservation>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    const rows = demoRead().map((r) => (r.id === id ? { ...r, ...patch } : r))
    demoWrite(rows)
    demoNotify()
    return
  }
  const { error } = await supabase
    .from(TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error) throw error
}

export async function deleteReservation(id: string): Promise<void> {
  if (!isSupabaseConfigured) {
    demoWrite(demoRead().filter((r) => r.id !== id))
    demoNotify()
    return
  }
  const { error } = await supabase.from(TABLE).delete().eq("id", id)
  if (error) throw error
}

/**
 * Subscribe to live changes. Returns an unsubscribe function.
 * In demo mode this listens to localStorage changes within the tab.
 */
export function subscribeReservations(onChange: () => void): () => void {
  if (!isSupabaseConfigured) {
    demoListeners.add(onChange)
    return () => demoListeners.delete(onChange)
  }
  const channel = supabase
    .channel("reservations-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE },
      () => onChange(),
    )
    .subscribe()
  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Fire the confirmation email via the Supabase Edge Function. Never throws
 * in a way that blocks the reservation — email is best-effort.
 */
export async function sendConfirmationEmail(
  reservation: Reservation | NewReservation,
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) {
    console.info("[Demo] E-Mail würde gesendet an:", reservation.email)
    return { ok: true }
  }
  try {
    const { error } = await supabase.functions.invoke(
      "send-reservation-email",
      { body: reservation },
    )
    if (error) return { ok: false, error: error.message }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}

function sortByDateTime(a: Reservation, b: Reservation): number {
  const d = a.reservation_date.localeCompare(b.reservation_date)
  if (d !== 0) return d
  return a.reservation_time.localeCompare(b.reservation_time)
}
