import { FormEvent, useEffect, useMemo, useState } from "react"
import { Icon } from "@/components/ui"
import { isSupabaseConfigured } from "@/lib/supabase"
import type {
  NewReservation,
  Reservation,
  ReservationStatus,
  Seating,
} from "@/lib/supabase"
import { sendConfirmationEmail } from "@/lib/reservations"
import {
  addClosedDay,
  fetchClosedDays,
  removeClosedDay,
  subscribeClosedDays,
} from "@/lib/closedDays"
import { useReservations } from "./useReservations"

/* ---------- Datums-Helfer --------------------------------------------- */

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`
}
function todayISO(offset = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return iso(d)
}
function parseISO(s: string): Date {
  return new Date(s + "T00:00:00")
}
function formatLong(s: string): string {
  return parseISO(s).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}
function formatDot(s: string): string {
  return parseISO(s).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/* ---------- Status-Metadaten ------------------------------------------ */

const statusClass: Record<ReservationStatus, string> = {
  Ausstehend: "ausstehend",
  Bestätigt: "bestätigt",
  Platziert: "platziert",
  Abgelehnt: "abgelehnt",
  Storniert: "storniert",
  "No-Show": "noshow",
  Erledigt: "erledigt",
}

// Reihenfolge der Filter-Tabs wie im Entwurf.
const TAB_STATUSES: (ReservationStatus | "Alle")[] = [
  "Alle",
  "Bestätigt",
  "Abgelehnt",
  "Storniert",
]

const WEEKDAYS = ["MO", "DI", "MI", "DO", "FR", "SA", "SO"]

function initialsOf(r: Reservation): string {
  return `${r.first_name[0] ?? ""}${r.last_name[0] ?? ""}`.toUpperCase()
}
function fullName(r: { first_name: string; last_name: string }): string {
  return `${r.first_name} ${r.last_name}`.trim()
}

/* ====================================================================== */

export default function AdminPanel({ exit }: { exit: () => void }) {
  const { reservations, loading, error, reload, add, patch, remove } =
    useReservations()

  const [day, setDay] = useState<string>(todayISO())
  const [month, setMonth] = useState<Date>(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [query, setQuery] = useState("")
  const [tab, setTab] = useState<ReservationStatus | "Alle">("Alle")
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Reservation | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const [closedDays, setClosedDays] = useState<string[]>([])
  const [closeInput, setCloseInput] = useState("")

  useEffect(() => {
    fetchClosedDays().then(setClosedDays)
    const unsub = subscribeClosedDays(() =>
      fetchClosedDays().then(setClosedDays),
    )
    return unsub
  }, [])

  const isClosed = (d: string) => closedDays.includes(d)

  async function runAction(fn: () => Promise<void>) {
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setActionError((err as Error).message)
    }
  }

  /* ---- abgeleitete Daten --------------------------------------------- */

  const dayReservations = useMemo(
    () => reservations.filter((r) => r.reservation_date === day),
    [reservations, day],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      Alle: dayReservations.length,
      Bestätigt: 0,
      Abgelehnt: 0,
      Storniert: 0,
    }
    for (const r of dayReservations) if (c[r.status] !== undefined) c[r.status]++
    return c
  }, [dayReservations])

  const filtered = useMemo(() => {
    let rows = dayReservations
    if (tab !== "Alle") rows = rows.filter((r) => r.status === tab)
    const q = query.trim().toLowerCase()
    if (q)
      rows = rows.filter((r) =>
        [fullName(r), r.phone, r.email].join(" ").toLowerCase().includes(q),
      )
    return [...rows].sort((a, b) =>
      a.reservation_time.localeCompare(b.reservation_time),
    )
  }, [dayReservations, tab, query])

  // Gruppierung nach Uhrzeit (Akkordeon-Blöcke).
  const groups = useMemo(() => {
    const map = new Map<string, Reservation[]>()
    for (const r of filtered) {
      const list = map.get(r.reservation_time) ?? []
      list.push(r)
      map.set(r.reservation_time, list)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [filtered])

  // KPIs beziehen sich auf den gewählten Tag.
  const guestsToday = dayReservations
    .filter((r) => !["Storniert", "Abgelehnt"].includes(r.status))
    .reduce((s, r) => s + (r.party_size || 0), 0)
  const pendingToday = dayReservations.filter(
    (r) => r.status === "Ausstehend",
  ).length
  const confirmedToday = dayReservations.filter(
    (r) => r.status === "Bestätigt",
  ).length
  const tablesToday = new Set(
    dayReservations
      .filter((r) => r.table_number)
      .map((r) => r.table_number),
  ).size

  // Tage mit Reservierungen (für Kalender-Punkte).
  const daysWithReservations = useMemo(
    () => new Set(reservations.map((r) => r.reservation_date)),
    [reservations],
  )

  /* ---- Aktionen ------------------------------------------------------ */

  function setStatus(r: Reservation, status: ReservationStatus) {
    runAction(() => patch(r.id, { status }))
  }
  async function handleDelete(r: Reservation) {
    if (!confirm(`Reservierung von ${fullName(r)} wirklich stornieren?`)) return
    await runAction(() => patch(r.id, { status: "Storniert" }))
  }
  async function addClose() {
    if (!closeInput) return
    await addClosedDay(closeInput)
    setCloseInput("")
  }

  const calendar = buildCalendar(month)

  return (
    <main className="rez">
      <div className="rez-wrap">
        <header className="rez-head">
          <div>
            <h1>Reservierungen</h1>
            <p>
              {formatDot(day)}
              {day === todayISO() && (
                <>
                  {" — "}
                  <span className="rez-today">Heute</span>
                </>
              )}
            </p>
          </div>
          <div className="rez-head-actions">
            <button className="rez-btn gold" onClick={() => setShowCreate(true)}>
              <Icon name="plus" size={14} /> Neue Reservierung
            </button>
            <button className="rez-btn dark" onClick={() => window.print()}>
              <Icon name="book" size={14} /> Drucken
            </button>
            <button className="rez-btn dark" onClick={reload}>
              <Icon name="refresh" size={14} /> Aktualisieren
            </button>
            <button
              className="rez-btn ghost"
              onClick={exit}
              title="Zur Website"
            >
              <Icon name="logout" size={14} />
            </button>
          </div>
        </header>

        {!isSupabaseConfigured && (
          <div className="rez-banner">
            <b>Demo-Modus.</b> Supabase ist nicht konfiguriert — Daten werden
            lokal gespeichert. Siehe SUPABASE_SETUP.md.
          </div>
        )}
        {error && <div className="rez-banner error">{error}</div>}
        {actionError && (
          <div className="rez-banner error">Fehler: {actionError}</div>
        )}

        {/* KPIs */}
        <section className="rez-kpis">
          <article className="k-green">
            <div>
              <small>GÄSTE HEUTE</small>
              <Icon name="users" size={18} />
            </div>
            <b>{guestsToday}</b>
          </article>
          <article className="k-gold">
            <div>
              <small>AUSSTEHEND</small>
              <Icon name="clock" size={18} />
            </div>
            <b>{pendingToday}</b>
          </article>
          <article className="k-teal">
            <div>
              <small>BESTÄTIGT HEUTE</small>
              <Icon name="check" size={18} />
            </div>
            <b>{confirmedToday}</b>
          </article>
          <article className="k-red">
            <div>
              <small>GESCHLOSSENE TAGE</small>
              <Icon name="close" size={18} />
            </div>
            <b>{closedDays.length}</b>
          </article>
        </section>

        <div className="rez-grid">
          {/* Linke Spalte */}
          <aside className="rez-left">
            <div className="rez-card cal">
              <div className="cal-head">
                <button
                  onClick={() =>
                    setMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() - 1, 1),
                    )
                  }
                  aria-label="Vorheriger Monat"
                >
                  ‹
                </button>
                <b>
                  {month.toLocaleDateString("de-DE", {
                    month: "long",
                    year: "numeric",
                  })}
                </b>
                <button
                  onClick={() =>
                    setMonth(
                      (m) => new Date(m.getFullYear(), m.getMonth() + 1, 1),
                    )
                  }
                  aria-label="Nächster Monat"
                >
                  ›
                </button>
              </div>
              <div className="cal-grid">
                {WEEKDAYS.map((w) => (
                  <span className="cal-wd" key={w}>
                    {w}
                  </span>
                ))}
                {calendar.map((cell, i) =>
                  cell === null ? (
                    <span key={`e${i}`} />
                  ) : (
                    <button
                      key={cell}
                      className={[
                        "cal-day",
                        cell === day ? "sel" : "",
                        cell === todayISO() ? "today" : "",
                        isClosed(cell) ? "closed" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => setDay(cell)}
                    >
                      {parseISO(cell).getDate()}
                      {daysWithReservations.has(cell) && (
                        <i className="cal-dot" />
                      )}
                    </button>
                  ),
                )}
              </div>
              <div className="cal-legend">
                <span>
                  <i className="lg-dot" /> Reservierungen
                </span>
                <span>
                  <i className="lg-closed" /> Ruhetag / Geschlossen
                </span>
                <span>
                  <i className="lg-today" /> Heute
                </span>
              </div>
            </div>

            <div className="rez-card status-card">
              <h3>
                <Icon name="close" size={14} /> RESTAURANT-STATUS
              </h3>
              <label className="status-label">TAG SCHLIESSEN</label>
              <input
                type="date"
                value={closeInput}
                onChange={(e) => setCloseInput(e.target.value)}
              />
              <button className="close-day-btn" onClick={addClose}>
                <Icon name="close" size={13} /> Tag schliessen
              </button>
              {closedDays.length > 0 && (
                <>
                  <label className="status-label mt">GESCHLOSSENE TAGE</label>
                  <div className="closed-list">
                    {closedDays.map((d) => (
                      <div className="closed-row" key={d}>
                        <span>{formatDot(d)}</span>
                        <button
                          onClick={() => removeClosedDay(d)}
                          aria-label="Entfernen"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </aside>

          {/* Rechte Spalte */}
          <section className="rez-right">
            <div className="rez-daybar">
              <div>
                <b>{formatDot(day)}</b>
                <small>{day === todayISO() ? "Heute" : formatLong(day)}</small>
              </div>
              <div className="daybar-stats">
                <div>
                  <b>{guestsToday}</b>
                  <small>GÄSTE</small>
                </div>
                <div>
                  <b>{tablesToday}</b>
                  <small>TISCHE</small>
                </div>
              </div>
            </div>

            <div className="rez-list-card">
              <label className="rez-search">
                <Icon name="search" size={15} />
                <input
                  placeholder="Gast suchen (Name oder Telefon)…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>

              <div className="rez-tabs">
                {TAB_STATUSES.map((t) => (
                  <button
                    key={t}
                    className={tab === t ? "active" : ""}
                    onClick={() => setTab(t)}
                  >
                    {t} <span>{counts[t] ?? 0}</span>
                  </button>
                ))}
              </div>
            </div>

            {isClosed(day) && (
              <div className="rez-closed-note">
                <Icon name="close" size={14} /> Dieser Tag ist als geschlossen
                markiert.
              </div>
            )}

            {loading && <div className="rez-empty">Lädt Reservierungen…</div>}

            {!loading && groups.length === 0 && (
              <div className="rez-empty">
                Keine Reservierungen für diese Auswahl.
              </div>
            )}

            {!loading &&
              groups.map(([time, rows]) => {
                const guests = rows.reduce(
                  (s, r) => s + (r.party_size || 0),
                  0,
                )
                return (
                  <div className="time-block" key={time}>
                    <div className="time-head">
                      <span className="time-label">
                        <Icon name="clock" size={15} /> {time}
                      </span>
                      <span className="time-meta res">
                        {rows.length}{" "}
                        {rows.length === 1 ? "Reservierung" : "Reservierungen"}
                      </span>
                      <span className="time-meta gold">{guests} Gäste</span>
                    </div>
                    {rows.map((r) => (
                      <GuestRow
                        key={r.id}
                        r={r}
                        onConfirm={() => setStatus(r, "Bestätigt")}
                        onReject={() => setStatus(r, "Abgelehnt")}
                        onEdit={() => setEditing(r)}
                        onCancel={() => handleDelete(r)}
                      />
                    ))}
                  </div>
                )
              })}
          </section>
        </div>
      </div>

      {showCreate && (
        <ReservationModal
          title="Neue Reservierung"
          submitLabel="Erstellen"
          defaultDate={day}
          onClose={() => setShowCreate(false)}
          onSubmit={async (input) => {
            await runAction(async () => {
              const created = await add(input)
              const mail = await sendConfirmationEmail(created)
              if (!mail.ok) console.warn("E-Mail nicht gesendet:", mail.error)
            })
            setShowCreate(false)
          }}
        />
      )}

      {editing && (
        <ReservationModal
          title="Reservierung bearbeiten"
          submitLabel="Speichern"
          existing={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (input) => {
            await runAction(() => patch(editing.id, input))
            setEditing(null)
          }}
        />
      )}
    </main>
  )
}

/* ---------- Gast-Zeile ------------------------------------------------- */

function GuestRow({
  r,
  onConfirm,
  onReject,
  onEdit,
  onCancel,
}: {
  r: Reservation
  onConfirm: () => void
  onReject: () => void
  onEdit: () => void
  onCancel: () => void
}) {
  return (
    <div className="guest-card">
      <div className="guest-main">
        <div className="guest-name">
          <b>{fullName(r)}</b>
          <i className={`gbadge ${statusClass[r.status]}`}>{r.status}</i>
        </div>
        <div className="guest-meta">
          <span>
            <Icon name="users" size={13} /> {r.party_size} Gäste
          </span>
          <span>
            <Icon name="phone" size={13} /> {r.phone}
          </span>
          {r.email && (
            <span>
              <Icon name="mail" size={13} /> {r.email}
            </span>
          )}
          {r.table_number && (
            <span>
              <Icon name="layout" size={13} /> {r.table_number}
            </span>
          )}
        </div>
        {r.special_requests && (
          <p className="guest-note">
            <Icon name="book" size={13} /> {r.special_requests}
          </p>
        )}
      </div>
      <div className="guest-actions">
        {r.status === "Ausstehend" && (
          <button className="ga-confirm" onClick={onConfirm} title="Bestätigen">
            <Icon name="check" size={16} />
          </button>
        )}
        <button className="ga-edit" onClick={onEdit} title="Bearbeiten">
          <Icon name="edit" size={16} />
        </button>
        <button
          className="ga-cancel"
          onClick={r.status === "Ausstehend" ? onReject : onCancel}
          title={r.status === "Ausstehend" ? "Ablehnen" : "Stornieren"}
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  )
}

/* ---------- Modal (Erstellen / Bearbeiten) ---------------------------- */

function splitName(full: string): { first_name: string; last_name: string } {
  const parts = full.trim().split(/\s+/)
  if (parts.length === 1) return { first_name: parts[0], last_name: "" }
  return {
    first_name: parts.slice(0, -1).join(" "),
    last_name: parts[parts.length - 1],
  }
}

function ReservationModal({
  title,
  submitLabel,
  defaultDate,
  existing,
  onClose,
  onSubmit,
}: {
  title: string
  submitLabel: string
  defaultDate?: string
  existing?: Reservation
  onClose: () => void
  onSubmit: (input: NewReservation) => Promise<void>
}) {
  const [name, setName] = useState(existing ? fullName(existing) : "")
  const [phone, setPhone] = useState(existing?.phone ?? "")
  const [email, setEmail] = useState(existing?.email ?? "")
  const [date, setDate] = useState(
    existing?.reservation_date ?? defaultDate ?? todayISO(),
  )
  const [time, setTime] = useState(existing?.reservation_time ?? "18:00")
  const [guests, setGuests] = useState(existing?.party_size ?? 2)
  const [seating, setSeating] = useState<Seating>(existing?.seating ?? "Innen")
  const [notes, setNotes] = useState(existing?.special_requests ?? "")
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    const { first_name, last_name } = splitName(name)
    try {
      await onSubmit({
        first_name,
        last_name,
        email,
        phone,
        reservation_date: date,
        reservation_time: time,
        party_size: guests,
        seating,
        special_requests: notes.trim() ? notes.trim() : null,
        status: existing ? existing.status : "Bestätigt",
      })
    } finally {
      setBusy(false)
    }
  }

  const times: string[] = []
  for (let h = 11; h <= 23; h++) {
    times.push(`${String(h).padStart(2, "0")}:00`)
    times.push(`${String(h).padStart(2, "0")}:30`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <form className="modal-form" onSubmit={submit}>
          <label className="mf-full">
            <span>NAME *</span>
            <input
              required
              placeholder="Vollständiger Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <div className="mf-row">
            <label>
              <span>TELEFON</span>
              <input
                placeholder="+49 123 456789"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            <label>
              <span>E-MAIL (OPTIONAL)</span>
              <input
                type="email"
                placeholder="gast@beispiel.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          </div>
          <div className="mf-row three">
            <label>
              <span>DATUM *</span>
              <input
                required
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              <span>UHRZEIT *</span>
              <select value={time} onChange={(e) => setTime(e.target.value)}>
                {times.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              <span>GÄSTE *</span>
              <input
                required
                type="number"
                min={1}
                max={30}
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value) || 1)}
              />
            </label>
          </div>
          <label className="mf-full">
            <span>BEREICH</span>
            <select
              value={seating}
              onChange={(e) => setSeating(e.target.value as Seating)}
            >
              <option value="Innen">Innen</option>
              <option value="Terrasse">Terrasse</option>
            </select>
          </label>
          <label className="mf-full">
            <span>ANMERKUNGEN (OPTIONAL)</span>
            <textarea
              rows={3}
              placeholder="Allergien, Anlass…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <div className="modal-foot">
            <button type="button" className="mf-cancel" onClick={onClose}>
              Abbrechen
            </button>
            <button className="mf-submit" disabled={busy}>
              {busy ? "…" : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ---------- Kalender-Zellen ------------------------------------------- */

function buildCalendar(month: Date): (string | null)[] {
  const year = month.getFullYear()
  const m = month.getMonth()
  const first = new Date(year, m, 1)
  // Montag = 0
  const lead = (first.getDay() + 6) % 7
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  const cells: (string | null)[] = []
  for (let i = 0; i < lead; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(iso(new Date(year, m, d)))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}
