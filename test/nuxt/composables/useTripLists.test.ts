import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { injectTripLists, useTripLists } from '~/composables/useTripLists'
import type { ListsResponse } from '~/types/list'
import { makeList } from '../../utils/tripFixtures'

const { clientMock, lazyFetchMock, toastAddMock, refreshMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  lazyFetchMock: vi.fn(),
  toastAddMock: vi.fn(),
  refreshMock: vi.fn(),
}))

const listsRef = ref<ListsResponse>({ data: [] })

mockNuxtImport('useLazySanctumFetch', () => {
  return (url: string, options?: Record<string, unknown>) => {
    lazyFetchMock(url, options)
    return { data: listsRef, pending: ref(false), error: ref(null), refresh: refreshMock }
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

const URL = '/api/v1/itineraries/t1/lists'

describe('useTripLists: lists', () => {
  beforeEach(() => {
    for (const mock of [clientMock, lazyFetchMock, toastAddMock, refreshMock]) {
      mock.mockReset()
    }
    listsRef.value = { data: [] }
  })

  it('loads the lists with their items', () => {
    useTripLists('t1')

    expect(lazyFetchMock).toHaveBeenCalledWith(URL, undefined)
  })

  it('counts the lists', () => {
    listsRef.value = { data: [makeList('l1', 'Before we go'), makeList('l2', 'Food')] }
    const { listCount } = useTripLists('t1')

    expect(listCount.value).toBe(2)
  })

  it('creates a list at the end, with no items yet', async () => {
    listsRef.value = { data: [makeList('l1', 'Before we go')] }
    clientMock.mockResolvedValue({ data: { id: 'l2', itinerary_id: 't1', name: 'Food', sort_order: 2 } })
    const { lists, createList } = useTripLists('t1')

    expect(await createList('Food')).toEqual({ ok: true })

    expect(clientMock).toHaveBeenCalledWith(URL, { method: 'POST', body: { name: 'Food' } })
    expect(lists.value.map(list => list.id)).toEqual(['l1', 'l2'])
    expect(lists.value[1]!.items).toEqual([])
  })

  it('renames a list and keeps its items', async () => {
    const item = { id: 'n1', itinerary_lists_id: 'l1', type: 'note' as const, title: null, content: 'Hi', sort_order: 1, place: null, checklist_items: [] }
    listsRef.value = { data: [makeList('l1', 'Before we go', { items: [item] })] }
    clientMock.mockResolvedValue({ data: { id: 'l1', itinerary_id: 't1', name: 'Pack list', sort_order: 1 } })
    const { lists, renameList } = useTripLists('t1')

    expect(await renameList(lists.value[0]!, 'Pack list')).toEqual({ ok: true })

    expect(clientMock).toHaveBeenCalledWith(`${URL}/l1`, { method: 'PATCH', body: { name: 'Pack list' } })
    expect(lists.value[0]!.name).toBe('Pack list')
    expect(lists.value[0]!.items).toHaveLength(1)
  })

  it('returns the API\'s message on a 422, without a toast', async () => {
    clientMock.mockRejectedValue({ statusCode: 422, data: { errors: { name: ['The name field must not be greater than 255 characters.'] } } })
    const { createList } = useTripLists('t1')

    expect(await createList('x'.repeat(300))).toEqual({ ok: false, error: 'The name field must not be greater than 255 characters.' })
    expect(toastAddMock).not.toHaveBeenCalled()
  })

  it('shows the error toast for any other failure', async () => {
    clientMock.mockRejectedValue(new Error('Network Error'))
    const { lists, createList } = useTripLists('t1')

    expect(await createList('Food')).toEqual({ ok: false })
    expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    expect(lists.value).toEqual([])
  })

  it('deletes a list after the API confirms', async () => {
    listsRef.value = { data: [makeList('l1', 'Before we go'), makeList('l2', 'Food')] }
    clientMock.mockResolvedValue(undefined)
    const { lists, deleteList } = useTripLists('t1')

    expect(await deleteList(lists.value[0]!)).toBe(true)

    expect(clientMock).toHaveBeenCalledWith(`${URL}/l1`, { method: 'DELETE' })
    expect(lists.value.map(list => list.id)).toEqual(['l2'])
  })

  it('keeps the list and shows the error toast when deleting fails', async () => {
    listsRef.value = { data: [makeList('l1', 'Before we go')] }
    clientMock.mockRejectedValue(new Error('Network Error'))
    const { lists, deleteList } = useTripLists('t1')

    expect(await deleteList(lists.value[0]!)).toBe(false)
    expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
    expect(lists.value).toHaveLength(1)
  })

  it('reorders the lists at once and sends every list id', async () => {
    listsRef.value = { data: [makeList('l1', 'A'), makeList('l2', 'B')] }
    clientMock.mockResolvedValue(undefined)
    const { lists, reorderLists } = useTripLists('t1')

    const saving = reorderLists(['l2', 'l1'])
    expect(lists.value.map(list => list.id)).toEqual(['l2', 'l1'])
    await saving

    expect(clientMock).toHaveBeenCalledWith(`${URL}/reorder`, { method: 'PATCH', body: { list_ids: ['l2', 'l1'] } })
  })

  it('reloads the lists when reordering fails', async () => {
    listsRef.value = { data: [makeList('l1', 'A'), makeList('l2', 'B')] }
    clientMock.mockRejectedValue(new Error('Network Error'))
    const { reorderLists } = useTripLists('t1')

    await reorderLists(['l2', 'l1'])

    expect(refreshMock).toHaveBeenCalled()
    expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
  })

  it('moves a list down, and not past the end', async () => {
    listsRef.value = { data: [makeList('l1', 'A'), makeList('l2', 'B')] }
    clientMock.mockResolvedValue(undefined)
    const { lists, moveList } = useTripLists('t1')

    await moveList(lists.value[0]!, 1)
    expect(clientMock).toHaveBeenCalledWith(`${URL}/reorder`, { method: 'PATCH', body: { list_ids: ['l2', 'l1'] } })

    clientMock.mockClear()
    await moveList(lists.value[1]!, 1)
    expect(clientMock).not.toHaveBeenCalled()
  })

  it('throws when it was not provided', () => {
    expect(() => injectTripLists()).toThrow('useTripLists was not provided')
  })
})
