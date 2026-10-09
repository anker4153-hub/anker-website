import { useCallback, useEffect, useRef, useState } from "react"
import {
  createReservation,
  deleteReservation,
  fetchReservations,
  subscribeReservations,
  updateReservation,
} from "@/lib/reservations"
import type { NewReservation, Reservation } from "@/lib/supabase"

export type ReservationsState = {
  reservations: Reservation[]
  loading: boolean
  error: string | null
  reload: () => void
  add: (input: NewReservation) => Promise<Reservation>
  patch: (id: string, patch: Partial<Reservation>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useReservations(): ReservationsState {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mounted = useRef(true)

  const reload = useCallback(async () => {
    try {
      setError(null)
      const data = await fetchReservations()
      if (mounted.current) setReservations(data)
    } catch (err) {
      if (mounted.current)
        setError(
          "Reservierungen konnten nicht geladen werden. " +
            (err as Error).message,
        )
    } finally {
      if (mounted.current) setLoading(false)
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    reload()
    const unsubscribe = subscribeReservations(() => reload())
    return () => {
      mounted.current = false
      unsubscribe()
    }
  }, [reload])

  // Optimistic add
  const add = useCallback(async (input: NewReservation) => {
    const created = await createReservation(input)
    setReservations((prev) =>
      [created, ...prev.filter((r) => r.id !== created.id)].sort(byDateTime),
    )
    return created
  }, [])

  // Optimistic update with rollback
  const patch = useCallback(
    async (id: string, nextPatch: Partial<Reservation>) => {
      let previous: Reservation | undefined
      setReservations((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            previous = r
            return { ...r, ...nextPatch }
          }
          return r
        }),
      )
      try {
        await updateReservation(id, nextPatch)
      } catch (err) {
        // rollback
        if (previous) {
          const snapshot = previous
          setReservations((prev) =>
            prev.map((r) => (r.id === id ? snapshot : r)),
          )
        }
        throw err
      }
    },
    [],
  )

  // Optimistic delete with rollback
  const remove = useCallback(async (id: string) => {
    let removed: Reservation | undefined
    setReservations((prev) => {
      removed = prev.find((r) => r.id === id)
      return prev.filter((r) => r.id !== id)
    })
    try {
      await deleteReservation(id)
    } catch (err) {
      if (removed) {
        const snapshot = removed
        setReservations((prev) => [snapshot, ...prev].sort(byDateTime))
      }
      throw err
    }
  }, [])

  return { reservations, loading, error, reload, add, patch, remove }
}

function byDateTime(a: Reservation, b: Reservation): number {
  const d = a.reservation_date.localeCompare(b.reservation_date)
  if (d !== 0) return d
  return a.reservation_time.localeCompare(b.reservation_time)
}
