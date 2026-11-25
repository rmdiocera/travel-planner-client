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

  describe('changing a stop', () => {
    const s1 = makeSpot('s1', '2027-03-13', { place_id: 'p1', start_time: '08:00:00', end_time: '10:00:00' })
    const s2 = makeSpot('s2', '2027-03-13', { place_id: 'p2' })
    const s3 = makeSpot('s3', '2027-03-15', { place_id: 'p1' })

    beforeEach(() => {
      spotsRef.value = { data: { '2027-03-13': [s1, s2], '2027-03-15': [s3] } }
      trip.value = { id: 't1', name: 'Japan', start_date: '2027-03-12', end_date: '2027-03-18' }
    })

    function deferred() {
      let resolve: (value: unknown) => void = () => {}
      let reject: (reason?: unknown) => void = () => {}
      const promise = new Promise((done, fail) => {
        resolve = done
        reject = fail
      })
      return { promise, resolve, reject }
    }

    it('sends both times with the visit date', async () => {
      clientMock.mockResolvedValue({ data: { ...s2, start_time: '11:00:00', end_time: '12:00:00' } })
      const { days, setTimes } = useTripDays('t1', trip)

      expect(await setTimes(s2, '11:00', '12:00')).toBe(true)

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/s2', {
        method: 'PATCH',
        body: { visit_date: '2027-03-13', start_time: '11:00', end_time: '12:00' },
      })
      expect(days.value[1]!.stops.find(stop => stop.id === 's2')?.start_time).toBe('11:00:00')
    })

    it('reloads the days when the start time changes, and not when only the end changes', async () => {
      const { setTimes } = useTripDays('t1', trip)

      clientMock.mockResolvedValue({ data: { ...s1, start_time: '08:00:00', end_time: '11:00:00' } })
      await setTimes(s1, '08:00', '11:00')
      expect(refreshMock).not.toHaveBeenCalled()

      clientMock.mockResolvedValue({ data: { ...s1, start_time: '09:00:00', end_time: '10:00:00' } })
      await setTimes(s1, '09:00', '10:00')
      expect(refreshMock).toHaveBeenCalledTimes(1)
    })

    it('shows the error toast and returns false when saving times fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { setTimes } = useTripDays('t1', trip)

      expect(await setTimes(s1, '09:00', '10:00')).toBe(false)
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    })

    it('marks a stop visited at once and sends it', async () => {
      const request = deferred()
      clientMock.mockReturnValue(request.promise)
      const { days, setVisited, isSaving } = useTripDays('t1', trip)

      const saving = setVisited(s1, true)
      expect(days.value[1]!.stops[0]!.marked_visited).toBe(true)
      expect(isSaving('s1')).toBe(true)
      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/s1', {
        method: 'PATCH',
        body: { visit_date: '2027-03-13', marked_visited: true },
      })

      request.resolve({ data: { ...s1, marked_visited: true } })
      await saving
      expect(isSaving('s1')).toBe(false)
    })

    it('puts visited back and shows the error toast when it fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { days, setVisited } = useTripDays('t1', trip)

      await setVisited(s1, true)

      expect(days.value[1]!.stops[0]!.marked_visited).toBe(false)
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    })

    it('moves a stop to another day, keeping its times, and reloads the days', async () => {
      clientMock.mockResolvedValue({ data: { ...s1, visit_date: '2027-03-14T00:00:00.000000Z' } })
      const { moveToDay } = useTripDays('t1', trip)

      expect(await moveToDay(s1, '2027-03-14')).toBe(true)

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/s1', {
        method: 'PATCH',
        body: { visit_date: '2027-03-14', start_time: '08:00', end_time: '10:00' },
      })
      expect(refreshMock).toHaveBeenCalled()
    })

    it('reorders a day at once and sends every stop of it', async () => {
      const request = deferred()
      clientMock.mockReturnValue(request.promise)
      const { days, reorderDay } = useTripDays('t1', trip)

      const saving = reorderDay('2027-03-13', ['s2', 's1'])
      expect(days.value[1]!.stops.map(stop => stop.id)).toEqual(['s2', 's1'])
      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/reorder', {
        method: 'PATCH',
        body: { visit_date: '2027-03-13', spot_ids: ['s2', 's1'] },
      })

      request.resolve(undefined)
      await saving
    })

    it('reloads the day and shows the error toast when reordering fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { reorderDay } = useTripDays('t1', trip)

      await reorderDay('2027-03-13', ['s2', 's1'])

      expect(refreshMock).toHaveBeenCalled()
      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    })

    it('ignores a second reorder of the same day while the first is saving', async () => {
      const request = deferred()
      clientMock.mockReturnValue(request.promise)
      const { reorderDay } = useTripDays('t1', trip)

      const first = reorderDay('2027-03-13', ['s2', 's1'])
      await reorderDay('2027-03-13', ['s1', 's2'])
      expect(clientMock).toHaveBeenCalledTimes(1)

      request.resolve(undefined)
      await first
    })

    it('moves a stop down with moveStop, and not past the end', async () => {
      clientMock.mockResolvedValue(undefined)
      const { moveStop } = useTripDays('t1', trip)

      await moveStop(s1, 1)
      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/reorder', {
        method: 'PATCH',
        body: { visit_date: '2027-03-13', spot_ids: ['s2', 's1'] },
      })

      clientMock.mockClear()
      await moveStop(s3, 1)
      expect(clientMock).not.toHaveBeenCalled()
    })

    it('flags a day whose times are out of order', () => {
      spotsRef.value = { data: { '2027-03-13': [s1, makeSpot('s4', '2027-03-13', { start_time: '07:00:00' })] } }
      const { days } = useTripDays('t1', trip)

      expect(days.value[1]!.outOfOrder).toBe(true)
      expect(days.value[0]!.outOfOrder).toBe(false)
    })

    it('lists the days a place is on, and not days outside the trip', () => {
      const { daysWithPlace } = useTripDays('t1', trip)
      expect(daysWithPlace('p1')).toEqual([2, 4])

      trip.value = { id: 't1', name: 'Japan', start_date: '2027-03-12', end_date: '2027-03-14' }
      expect(daysWithPlace('p1')).toEqual([2])
    })
  })

  it('throws when it was not provided', () => {
    expect(() => injectTripDays()).toThrow('useTripDays was not provided')
  })
})
