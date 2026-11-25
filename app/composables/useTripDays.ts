import type { InjectionKey, Ref } from 'vue'
import type { Itinerary } from '~/types/itinerary'
import type { Spot, SpotResponse, SpotsGroupedResponse } from '~/types/spot'
import { buildDays, normalizeSpotsByDate, spotsOutside } from '~/utils/trip/days'
import type { TripDay } from '~/utils/trip/days'

export type TripDayWithStops = TripDay & { stops: Spot[] }

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
  const days = computed<TripDayWithStops[]>(() => tripDays.value.map(day => ({ ...day, stops: byDate.value[day.date] ?? [] })))
  const outside = computed(() => spotsOutside(tripDays.value, byDate.value))
  const stopCount = computed(() => Object.values(byDate.value).reduce((count, stops) => count + stops.length, 0))

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

  return { pending, error, refresh, days, outside, stopCount, addStop, removeStop }
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
