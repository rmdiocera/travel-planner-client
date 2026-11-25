import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { injectTripDays, useTripDays } from '~/composables/useTripDays'
import type { Itinerary } from '~/types/itinerary'
import type { SpotsGroupedResponse } from '~/types/spot'
import { makeSpot } from '../../utils/tripFixtures'

const { clientMock, lazyFetchMock, toastAddMock, refreshMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  lazyFetchMock: vi.fn(),
  toastAddMock: vi.fn(),
  refreshMock: vi.fn(),
}))

const spotsRef = ref<SpotsGroupedResponse>({ data: [] })

mockNuxtImport('useLazySanctumFetch', () => {
  return (url: string, options?: Record<string, unknown>) => {
    lazyFetchMock(url, options)
    return { data: spotsRef, pending: ref(false), error: ref(null), refresh: refreshMock }
  }
})
mockNuxtImport('useSanctumClient', () => () => clientMock)
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const ERROR_TOAST = {
  title: 'Something went wrong',
  icon: 'i-lucide-circle-x',
  description: 'There was a problem with your request',
  color: 'error',
}

describe('useTripDays', () => {
  let trip: Ref<Itinerary | null>

  beforeEach(() => {
    for (const mock of [clientMock, lazyFetchMock, toastAddMock, refreshMock]) {
      mock.mockReset()
    }
    spotsRef.value = { data: [] }
    trip = ref({ id: 't1', name: 'Japan', start_date: '2027-03-12', end_date: '2027-03-14' })
  })

  it('requests the stops grouped by date', () => {
    useTripDays('t1', trip)
    expect(lazyFetchMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots', { params: { group_by_date: 1 } })
  })

  it('builds every day of the trip with its stops in order', () => {
    spotsRef.value = { data: { '2027-03-13': [makeSpot('s1', '2027-03-13'), makeSpot('s2', '2027-03-13')] } }
    const { days } = useTripDays('t1', trip)

    expect(days.value).toHaveLength(3)
    expect(days.value[1]!.stops.map(stop => stop.id)).toEqual(['s1', 's2'])
  })

  it('treats an empty [] response as no stops', () => {
    const { days, stopCount } = useTripDays('t1', trip)

    expect(stopCount.value).toBe(0)
    expect(days.value.every(day => day.stops.length === 0)).toBe(true)
  })

  it('lists the stops outside the trip dates', () => {
    spotsRef.value = { data: { '2027-03-16': [makeSpot('s9', '2027-03-16')] } }
    const { outside, stopCount } = useTripDays('t1', trip)

    expect(outside.value.map(stop => stop.id)).toEqual(['s9'])
    expect(stopCount.value).toBe(1)
  })

  it('has no days for a trip without dates, and every stop is outside', () => {
    spotsRef.value = { data: { '2027-03-13': [makeSpot('s1', '2027-03-13')] } }
    trip.value = { id: 't1', name: 'Iceland', start_date: null, end_date: null }
    const { days, outside } = useTripDays('t1', trip)

    expect(days.value).toEqual([])
    expect(outside.value.map(stop => stop.id)).toEqual(['s1'])
  })

  describe('adding a stop', () => {
    it('adds it at the end of its day', async () => {
      spotsRef.value = { data: { '2027-03-13': [makeSpot('s1', '2027-03-13')] } }
      const created = makeSpot('s9', '2027-03-13')
      clientMock.mockResolvedValue({ data: created })
      const { days, addStop } = useTripDays('t1', trip)

      const result = await addStop('p9', '2027-03-13')

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots', {
        method: 'POST',
        body: { place_id: 'p9', visit_date: '2027-03-13' },
      })
      expect(days.value[1]!.stops.map(stop => stop.id)).toEqual(['s1', 's9'])
      expect(result).toEqual(created)
    })

    it('shows the error toast and returns null when adding fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { days, addStop } = useTripDays('t1', trip)

      expect(await addStop('p9', '2027-03-13')).toBeNull()
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
      expect(days.value[1]!.stops).toEqual([])
    })
  })

  describe('removing a stop', () => {
    it('removes it after the API confirms', async () => {
      const stop = makeSpot('s1', '2027-03-13')
      spotsRef.value = { data: { '2027-03-13': [stop] } }
      clientMock.mockResolvedValue(undefined)
      const { days, removeStop } = useTripDays('t1', trip)

      expect(await removeStop(stop)).toBe(true)
      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/s1', { method: 'DELETE' })
      expect(days.value[1]!.stops).toEqual([])
    })

    it('keeps the stop and shows the error toast when removing fails', async () => {
      const stop = makeSpot('s1', '2027-03-13')
      spotsRef.value = { data: { '2027-03-13': [stop] } }
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { days, removeStop } = useTripDays('t1', trip)

      expect(await removeStop(stop)).toBe(false)
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
      expect(days.value[1]!.stops.map(s => s.id)).toEqual(['s1'])
    })
  })

  it('throws when it was not provided', () => {
    expect(() => injectTripDays()).toThrow('useTripDays was not provided')
  })
})
