// Geschlossene Tage (Ruhetage / Schließungen).
//
// Aktuell lokal im localStorage gespeichert, damit das Feature sofort
// funktioniert. Die API ist bewusst asynchron gehalten, damit später eine
// Supabase-Tabelle `closed_days` ohne Änderung an den Aufrufern eingehängt
// werden kann (z. B. select/insert/delete auf public.closed_days).

const KEY = "zumanker.closedDays"

const listeners = new Set<() => void>()

function read(): string[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function write(days: string[]): void {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(KEY, JSON.stringify([...new Set(days)].sort()))
  listeners.forEach((fn) => fn())
}

export async function fetchClosedDays(): Promise<string[]> {
  return read()
}

export async function addClosedDay(date: string): Promise<void> {
  if (!date) return
  write([...read(), date])
}

export async function removeClosedDay(date: string): Promise<void> {
  write(read().filter((d) => d !== date))
}

export function subscribeClosedDays(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => listeners.delete(onChange)
}
