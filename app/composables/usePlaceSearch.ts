import { watchDebounced } from '@vueuse/core'
import type { Place, PlacesResponse } from '~/types/place'

export type SearchPlace = Omit<Place, 'images'>

const SEARCH_DELAY_MS = 300
// The API answers a 422 for a longer term.
const MAX_TERM_LENGTH = 100

// Searches Dayfarer's own places as the traveller types (GET /places?search=, at most 10 results).
export function usePlaceSearch() {
  const client = useSanctumClient()
  const { showToast } = useAppToast()

  const term = ref('')
  const results = ref<SearchPlace[]>([])
  // The term the current results answer, for "No places match ...".
  const searchedTerm = ref('')
  const pending = ref(false)

  // Counts requests so an answer that arrives after a newer search is dropped.
  let latest = 0

  watchDebounced(term, async (value) => {
    const request = ++latest
    // A blank term would make the API return every place, so it is never sent.
    const search = value.trim().slice(0, MAX_TERM_LENGTH)
    if (!search) {
      results.value = []
      searchedTerm.value = ''
      pending.value = false
      return
    }

    pending.value = true
    try {
      const response = await client<PlacesResponse>('/api/v1/places', { params: { search } })
      if (request === latest) {
        results.value = response.data
        searchedTerm.value = search
      }
    }
    catch {
      if (request === latest) {
        showToast('Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error')
      }
    }
    finally {
      if (request === latest) {
        pending.value = false
      }
    }
  }, { debounce: SEARCH_DELAY_MS })

  return { term, results, searchedTerm, pending }
}
