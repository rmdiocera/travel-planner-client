import type { InjectionKey } from 'vue'
import type { ItineraryList, ListResponse, ListsResponse } from '~/types/list'
import { moveId } from '~/utils/trip/order'

// The result of saving typed text. `error` is the API's first 422 message, for the box that was saving.
export type SaveResult = { ok: true } | { ok: false, error?: string }

// A trip's lists with their items, and every request that changes them.
// The page creates it and shares it with its components through tripListsKey (ADR 0001).
// Responses leave out children (`items`, `place`, `checklist_items`), so they are merged into local state, never swapped in.
export function useTripLists(itineraryId: string) {
  const listsUrl = `/api/v1/itineraries/${itineraryId}/lists`
  const client = useSanctumClient()
  const { showToast } = useAppToast()

  const { data, pending, error, refresh } = useLazySanctumFetch<ListsResponse>(listsUrl)

  // Local copy, so a change shows at once without touching the fetch's cache. A refresh replaces it.
  const lists = ref<ItineraryList[]>([])
  watch(data, (response) => {
    lists.value = response?.data ?? []
  }, { immediate: true })

  const listCount = computed(() => lists.value.length)

  // Ids with a change in flight.
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

  function showError() {
    showToast('Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error')
  }

  // A 422 gives its message back for the box that was saving; anything else shows the error toast.
  function failure(caught: unknown): SaveResult {
    const errors = caught as { statusCode?: number, data?: { errors?: Record<string, string[]> } } | null
    const message = errors?.statusCode === 422 ? Object.values(errors.data?.errors ?? {})[0]?.[0] : undefined
    if (message) {
      return { ok: false, error: message }
    }

    showError()
    return { ok: false }
  }

  function updateList(id: string, change: (list: ItineraryList) => ItineraryList) {
    lists.value = lists.value.map(list => list.id === id ? change(list) : list)
  }

  async function createList(name: string): Promise<SaveResult> {
    try {
      const response = await client<ListResponse>(listsUrl, { method: 'POST', body: { name } })
      lists.value = [...lists.value, { ...response.data, items: [] }]
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  async function renameList(list: ItineraryList, name: string): Promise<SaveResult> {
    try {
      const response = await client<ListResponse>(`${listsUrl}/${list.id}`, { method: 'PATCH', body: { name } })
      updateList(list.id, current => ({ ...current, ...response.data }))
      return { ok: true }
    }
    catch (caught) {
      return failure(caught)
    }
  }

  async function deleteList(list: ItineraryList): Promise<boolean> {
    try {
      await client<unknown>(`${listsUrl}/${list.id}`, { method: 'DELETE' })
      lists.value = lists.value.filter(other => other.id !== list.id)
      return true
    }
    catch {
      showError()
      return false
    }
  }

  // Shown at once; on failure the lists are loaded again. Always sends every list id (the API doesn't check a partial array).
  async function reorderLists(listIds: string[]): Promise<void> {
    if (isSaving('lists')) {
      return
    }

    setSaving('lists', true)
    lists.value = listIds.map(id => lists.value.find(list => list.id === id)).filter((list): list is ItineraryList => !!list)
    try {
      await client<unknown>(`${listsUrl}/reorder`, { method: 'PATCH', body: { list_ids: listIds } })
    }
    catch {
      await refresh()
      showError()
    }
    finally {
      setSaving('lists', false)
    }
  }

  // Move up or down by one place, for the menu: the keyboard way to do what dragging does.
  async function moveList(list: ItineraryList, offset: -1 | 1): Promise<void> {
    const ids = lists.value.map(other => other.id)
    const from = ids.indexOf(list.id)
    const to = from + offset
    if (from === -1 || to < 0 || to >= ids.length) {
      return
    }
    await reorderLists(moveId(ids, from, to))
  }

  return {
    lists,
    pending,
    error,
    refresh,
    listCount,
    isSaving,
    createList,
    renameList,
    deleteList,
    reorderLists,
    moveList,
  }
}

export type TripLists = ReturnType<typeof useTripLists>

export const tripListsKey: InjectionKey<TripLists> = Symbol('tripLists')

export function injectTripLists(): TripLists {
  const lists = inject(tripListsKey)
  if (!lists) {
    throw new Error('useTripLists was not provided')
  }
  return lists
}
