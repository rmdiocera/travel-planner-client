import { getLocalTimeZone, today } from '@internationalized/date'
import { FetchError } from 'ofetch'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'
import { createApiSession } from '../utils/apiSession'
import type { ItineraryResponse } from '../../app/types/itinerary'
import type { ChecklistEntryResponse, ListItemResponse, ListResponse, ListsResponse } from '../../app/types/list'
import type { PlaceResponse } from '../../app/types/place'
import type { SpotResponse, SpotsGroupedResponse } from '../../app/types/spot'

// The requests the trip page sends, checked against the real API. Everything it creates it deletes.
describe('Trip page API', () => {
  const { ensureLoggedIn, fetch, $fetch } = createApiSession({ saved: inject('apiSession') })
  beforeAll(ensureLoggedIn)

  const start = today(getLocalTimeZone()).add({ months: 1 })
  const firstDay = start.toString()
  const trip = { name: 'E2E trip page', start_date: firstDay, end_date: start.add({ days: 6 }).toString() }

  let tripId: string
  let placeId: string
  let spot1Id: string
  let spot2Id: string
  let listId: string
  let placeItemId: string
  let noteId: string
  let checklistId: string
  let entryId: string

  const base = () => `/api/v1/itineraries/${tripId}`

  beforeAll(async () => {
    try {
      const formData = new FormData()
      formData.append('name', 'E2E trip page place')
      formData.append('address', '1 Test Street')
      formData.append('city', 'Testville')
      formData.append('country', 'Japan')
      formData.append('details', 'A place made by the trip page e2e test.')
      placeId = (await $fetch<PlaceResponse>('/api/v1/places', { method: 'POST', body: formData })).data.id

      tripId = (await $fetch<ItineraryResponse>('/api/v1/itineraries', { method: 'POST', body: trip })).data.id
    }
    catch (error) {
      if (error instanceof FetchError) {
        console.log(error.data)
      }
      throw error
    }
  })

  // Removes what a failed run left behind: Vitest runs afterAll even when a beforeAll or a test fails.
  afterAll(async () => {
    if (tripId) {
      await fetch(`/api/v1/itineraries/${tripId}`, { method: 'DELETE' })
    }
    if (placeId) {
      await fetch(`/api/v1/places/${placeId}`, { method: 'DELETE' })
    }
  })

  describe('stops (spots)', () => {
    it('returns [] for a trip with no stops', async () => {
      const response = await $fetch<SpotsGroupedResponse>(`${base()}/spots`, { params: { group_by_date: 1 } })

      expect(response.data).toEqual([])
    })

    it('creates stops at the end of their day, without times', async () => {
      const first = await $fetch<SpotResponse>(`${base()}/spots`, { method: 'POST', body: { place_id: placeId, visit_date: firstDay } })
      spot1Id = first.data.id
      const second = await $fetch<SpotResponse>(`${base()}/spots`, { method: 'POST', body: { place_id: placeId, visit_date: firstDay } })
      spot2Id = second.data.id

      for (const spot of [first.data, second.data]) {
        expect(spot.visit_date).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00/)
        expect(spot.start_time).toBeNull()
        expect(spot.marked_visited).toBe(false)
      }
      expect(second.data.sort_order).toBeGreaterThan(first.data.sort_order)
    })

    it('takes times as HH:MM and returns HH:MM:SS', async () => {
      const response = await $fetch<SpotResponse>(`${base()}/spots/${spot1Id}`, {
        method: 'PATCH',
        body: { visit_date: firstDay, start_time: '09:00', end_time: '10:00' },
      })

      expect(response.data.start_time).toBe('09:00:00')
      expect(response.data.end_time).toBe('10:00:00')
    })

    it('reorders a day and keeps that order', async () => {
      const reordered = await fetch(`${base()}/spots/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ visit_date: firstDay, spot_ids: [spot2Id, spot1Id] }),
      })
      expect(reordered.status).toBe(204)

      const grouped = await $fetch<SpotsGroupedResponse>(`${base()}/spots`, { params: { group_by_date: 1 } })
      const day = (grouped.data as Record<string, { id: string }[]>)[firstDay]!
      expect(day.map(spot => spot.id)).toEqual([spot2Id, spot1Id])
    })
  })

  describe('lists', () => {
    it('creates a list without an items key', async () => {
      const response = await $fetch<ListResponse>(`${base()}/lists`, { method: 'POST', body: { name: 'E2E list' } })
      listId = response.data.id

      expect(response.data).not.toHaveProperty('items')
    })

    it('adds a place item, with its place', async () => {
      const response = await $fetch<ListItemResponse>(`${base()}/lists/${listId}/items`, { method: 'POST', body: { type: 'place', place_id: placeId } })
      placeItemId = response.data.id

      // The page shows the place right away, so the create response must carry it.
      expect(response.data.place?.place.name).toBe('E2E trip page place')
      expect(response.data.place?.marked_visited).toBe(false)
    })

    it('creates a note empty, then sets its text', async () => {
      const created = await $fetch<ListItemResponse>(`${base()}/lists/${listId}/items`, { method: 'POST', body: { type: 'note' } })
      noteId = created.data.id
      expect(created.data).not.toHaveProperty('place')
      expect(created.data).not.toHaveProperty('checklist_items')

      const saved = await $fetch<ListItemResponse>(`${base()}/lists/${listId}/items/${noteId}`, {
        method: 'PATCH',
        body: { type: 'note', content: 'Bring an umbrella' },
      })
      expect(saved.data.content).toBe('Bring an umbrella')
    })

    it('creates a checklist, sets its title, and adds an item that is not ticked', async () => {
      const created = await $fetch<ListItemResponse>(`${base()}/lists/${listId}/items`, { method: 'POST', body: { type: 'checklist' } })
      checklistId = created.data.id
      const titled = await $fetch<ListItemResponse>(`${base()}/lists/${listId}/items/${checklistId}`, {
        method: 'PATCH',
        body: { type: 'checklist', title: 'Packing' },
      })
      expect(titled.data.title).toBe('Packing')

      const entry = await $fetch<ChecklistEntryResponse>(`${base()}/lists/${listId}/items/${checklistId}/checklist`, { method: 'POST', body: { label: 'Passport' } })
      entryId = entry.data.id
      // A new entry comes back with is_checked null, which the client treats as not ticked.
      expect(entry.data.is_checked ?? false).toBe(false)

      const ticked = await $fetch<ChecklistEntryResponse>(`${base()}/lists/${listId}/items/${checklistId}/checklist/${entryId}`, {
        method: 'PATCH',
        body: { is_checked: true },
      })
      expect(ticked.data.is_checked).toBe(true)
    })

    it('loads lists with items, places and checklist items in order', async () => {
      const response = await $fetch<ListsResponse>(`${base()}/lists`)

      const list = response.data.find(other => other.id === listId)!
      expect(list.items.map(item => item.id)).toEqual([placeItemId, noteId, checklistId])
      expect(list.items[0]!.place?.place.name).toBe('E2E trip page place')
      expect(list.items[2]!.checklist_items.map(entry => entry.label)).toEqual(['Passport'])
    })

    it('reorders items with the full list of ids', async () => {
      const reordered = await fetch(`${base()}/lists/${listId}/items/reorder`, {
        method: 'PATCH',
        body: JSON.stringify({ list_item_ids: [checklistId, noteId, placeItemId] }),
      })
      expect(reordered.status).toBe(204)

      const response = await $fetch<ListsResponse>(`${base()}/lists`)
      expect(response.data.find(other => other.id === listId)!.items.map(item => item.id)).toEqual([checklistId, noteId, placeItemId])
    })
  })

  describe('places in spots and lists', () => {
    it('nests each place with its images, [] when it has none', async () => {
      const grouped = await $fetch<SpotsGroupedResponse>(`${base()}/spots`, { params: { group_by_date: 1 } })
      const stops = (grouped.data as Record<string, { place: { images?: unknown[] } }[]>)[firstDay]!
      expect(stops[0]!.place.images).toEqual([])

      const lists = await $fetch<ListsResponse>(`${base()}/lists`)
      const item = lists.data.find(other => other.id === listId)!.items.find(other => other.type === 'place')!
      expect(item.place?.place.images).toEqual([])
    })
  })
})
