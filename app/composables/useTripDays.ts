import type { InjectionKey, Ref } from 'vue'
import type { Itinerary } from '~/types/itinerary'
import type { Spot, SpotResponse, SpotsGroupedResponse } from '~/types/spot'
import { buildDays, normalizeSpotsByDate, spotsOutside } from '~/utils/trip/days'
import type { TripDay } from '~/utils/trip/days'
import { moveId } from '~/utils/trip/order'
import { formatTime, timesOutOfOrder } from '~/utils/trip/times'

export type TripDayWithStops = TripDay & { stops: Spot[], outOfOrder: boolean }

// The trip page's days and their stops (the API's "spots"), and every request that changes them.
// The page creates it and shares it with its components through tripDaysKey (ADR 0001).
export function useTripDays(itineraryId: string, trip: Ref<Itinerary | null>) {
  const spotsUrl = `/api/v1/itineraries/${itineraryId}/spots`
  const client = useSanctumClient()
  const { showToast } = useAppToast()

  const { data, pending, error, refresh } = useLazySanctumFetch<SpotsGroupedResponse>(spotsUrl, {
    params: { group_by_date: 1 },
  })

  // Local copy, so a change shows at once without touching the fetch's cache. A refresh replaces it.
  const byDate = ref<Record<string, Spot[]>>({})
  watch(data, (response) => {
    byDate.value = normalizeSpotsByDate(response?.data)
  }, { immediate: true })

  const tripDays = computed(() => buildDays(trip.value?.start_date ?? null, trip.value?.end_date ?? null))
  const days = computed<TripDayWithStops[]>(() => tripDays.value.map((day) => {
    const stops = byDate.value[day.date] ?? []
    return { ...day, stops, outOfOrder: timesOutOfOrder(stops) }
  }))
  const outside = computed(() => spotsOutside(tripDays.value, byDate.value))
  const stopCount = computed(() => Object.values(byDate.value).reduce((count, stops) => count + stops.length, 0))

  // Ids with a change in flight: a stop's id for visited, a day's date for a reorder.
  const saving = ref(new Set<string>())
  function isSaving(id: string) {
    return saving.value.has(id)
  }
  function setSaving(id: string, on: boolean) {
    const next = new Set(saving.value)
    if (on) {
      next.add(id)
    }
    else {
      next.delete(id)
    }
    saving.value = next
  }

  function dayOf(stop: Spot) {
    return stop.visit_date.slice(0, 10)
  }

  // Replaces a stop in its day with a changed copy.
  function replaceStop(changed: Spot) {
    const date = dayOf(changed)
    byDate.value = { ...byDate.value, [date]: (byDate.value[date] ?? []).map(stop => stop.id === changed.id ? { ...stop, ...changed } : stop) }
  }

  function showError() {
    showToast('Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error')
  }

  async function addStop(placeId: string, date: string): Promise<Spot | null> {
    try {
      const response = await client<SpotResponse>(spotsUrl, {
        method: 'POST',
        body: { place_id: placeId, visit_date: date },
      })
      byDate.value = { ...byDate.value, [date]: [...(byDate.value[date] ?? []), response.data] }
      return response.data
    }
    catch {
      showError()
      return null
    }
  }

  async function removeStop(stop: Spot): Promise<boolean> {
    try {
      await client<unknown>(`${spotsUrl}/${stop.id}`, { method: 'DELETE' })
      const date = stop.visit_date.slice(0, 10)
      byDate.value = { ...byDate.value, [date]: (byDate.value[date] ?? []).filter(other => other.id !== stop.id) }
      return true
    }
    catch {
      showError()
      return false
    }
  }

  // Always sends both times, either may be null: the API only checks an end time against a start time in the same request.
  async function setTimes(stop: Spot, start: string | null, end: string | null): Promise<boolean> {
    try {
      const response = await client<SpotResponse>(`${spotsUrl}/${stop.id}`, {
        method: 'PATCH',
        body: { visit_date: dayOf(stop), start_time: start, end_time: end },
      })
      replaceStop({ ...stop, ...response.data })
      // A new start time can move the stop within its day on the server, so the day is loaded again.
      if (start !== formatTime(stop.start_time)) {
        await refresh()
      }
      return true
    }
    catch {
      showError()
      return false
    }
  }

  // Shown at once, and put back if the request fails.
  async function setVisited(stop: Spot, visited: boolean): Promise<void> {
    if (isSaving(stop.id)) {
      return
    }

    setSaving(stop.id, true)
    replaceStop({ ...stop, marked_visited: visited })
    try {
      await client<SpotResponse>(`${spotsUrl}/${stop.id}`, {
        method: 'PATCH',
        body: { visit_date: dayOf(stop), marked_visited: visited },
      })
    }
    catch {
      replaceStop({ ...stop, marked_visited: !visited })
      showError()
    }
    finally {
      setSaving(stop.id, false)
    }
  }

  async function moveToDay(stop: Spot, date: string): Promise<boolean> {
    try {
      await client<SpotResponse>(`${spotsUrl}/${stop.id}`, {
        method: 'PATCH',
        body: { visit_date: date, start_time: formatTime(stop.start_time), end_time: formatTime(stop.end_time) },
      })
      // It goes to the end of the new day, or into time order there, so the days are loaded again.
      await refresh()
      return true
    }
    catch {
      showError()
      return false
    }
  }

  // Shown at once; on failure the days are loaded again. A day ignores a new order while one is saving.
  async function reorderDay(date: string, spotIds: string[]): Promise<void> {
    if (isSaving(date)) {
      return
    }

    setSaving(date, true)
    const stops = byDate.value[date] ?? []
    byDate.value = { ...byDate.value, [date]: spotIds.map(id => stops.find(stop => stop.id === id)).filter((stop): stop is Spot => !!stop) }
    try {
      await client<unknown>(`${spotsUrl}/reorder`, {
        method: 'PATCH',
        body: { visit_date: date, spot_ids: spotIds },
      })
    }
    catch {
      await refresh()
      showError()
    }
    finally {
      setSaving(date, false)
    }
  }

  // Move up or down by one place, for the menu: the keyboard way to do what dragging does.
  async function moveStop(stop: Spot, offset: -1 | 1): Promise<void> {
    const date = dayOf(stop)
    const ids = (byDate.value[date] ?? []).map(other => other.id)
    const from = ids.indexOf(stop.id)
    const to = from + offset
    if (from === -1 || to < 0 || to >= ids.length) {
      return
    }
    await reorderDay(date, moveId(ids, from, to))
  }

  // The numbers of the trip's days that have a stop of this place. Stops outside the trip dates don't count.
  function daysWithPlace(placeId: string): number[] {
    return tripDays.value
      .filter(day => (byDate.value[day.date] ?? []).some(stop => stop.place_id === placeId))
      .map(day => day.number)
  }

  return { pending, error, refresh, days, outside, stopCount, addStop, removeStop, setTimes, setVisited, moveToDay, reorderDay, moveStop, isSaving, daysWithPlace }
}

export type TripDays = ReturnType<typeof useTripDays>

export const tripDaysKey: InjectionKey<TripDays> = Symbol('tripDays')

export function injectTripDays(): TripDays {
  const days = inject(tripDaysKey)
  if (!days) {
    throw new Error('useTripDays was not provided')
  }
  return days
}
