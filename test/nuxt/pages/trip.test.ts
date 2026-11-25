import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TripPlaceSearch from '~/components/trip/PlaceSearch.vue'
import { mountTripPage } from '../../utils/mountTripPage'
import { menuItems, selectMenuItem } from '../../utils/menu'
import { makePlace, makeSpot } from '../../utils/tripFixtures'

const widthRef = ref(1024)

const { clientMock, lazyFetchMock, toastAddMock, tripRefreshMock, spotsRefreshMock, listsRefreshMock, navigateToMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  lazyFetchMock: vi.fn(),
  toastAddMock: vi.fn(),
  tripRefreshMock: vi.fn(),
  spotsRefreshMock: vi.fn(),
  listsRefreshMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

const japanTrip = { id: 't1', name: 'Japan with friends', start_date: '2027-03-12', end_date: '2027-03-18' }
const tripRef = ref<{ data: Record<string, string | null> } | null>({ data: japanTrip })
const tripError = ref<Record<string, unknown> | null>(null)
const tripPending = ref(false)
const spotsRef = ref<{ data: Record<string, unknown[]> | [] }>({ data: [] })
const spotsError = ref<Record<string, unknown> | null>(null)
const listsRef = ref<{ data: Record<string, unknown>[] }>({ data: [] })
const listsError = ref<Record<string, unknown> | null>(null)

mockNuxtImport('useLazySanctumFetch', () => {
  return (url: string, options?: Record<string, unknown>) => {
    lazyFetchMock(url, options)
    if (url === '/api/v1/itineraries/t1') {
      return { data: tripRef, pending: tripPending, error: tripError, refresh: tripRefreshMock }
    }
    if (url === '/api/v1/itineraries/t1/lists') {
      return { data: listsRef, pending: ref(false), error: listsError, refresh: listsRefreshMock }
    }
    return { data: spotsRef, pending: ref(false), error: spotsError, refresh: spotsRefreshMock }
  }
})
mockNuxtImport('useSanctumClient', () => () => clientMock)
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useRoute', () => () => ({
  params: { id: 't1' },
  path: '/trips/t1',
  fullPath: '/trips/t1',
  query: {},
  hash: '',
  meta: {},
  matched: [],
}))

vi.mock(import('@vueuse/core'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useWindowSize: () => ({ width: widthRef, height: ref(800) }),
  }
})

describe('Trip page', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2027-03-01T12:00:00'))
    widthRef.value = 1024
    for (const mock of [clientMock, lazyFetchMock, toastAddMock, tripRefreshMock, spotsRefreshMock, listsRefreshMock, navigateToMock]) {
      mock.mockReset()
    }
    tripRef.value = { data: japanTrip }
    tripError.value = null
    tripPending.value = false
    spotsRef.value = { data: [] }
    spotsError.value = null
    listsRef.value = { data: [] }
    listsError.value = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Header', () => {
    it('shows the trip\'s name, dates and badge', async () => {
      const { wrapper } = await mountTripPage()

      expect(wrapper.find('[data-testid="trip-name"]').text()).toBe('Japan with friends')
      expect(wrapper.find('[data-testid="trip-dates"]').text()).toBe('Mar 12, 2027 - Mar 18, 2027 • 7 days')
      expect(wrapper.find('[data-testid="trip-badge"]').text()).toBe('In 11 days')
    })

    it('links back to the Trips page', async () => {
      const { wrapper } = await mountTripPage()

      expect(wrapper.find('[data-testid="trip-back-link"]').attributes('href')).toBe('/')
    })

    it('titles the tab with the trip\'s name', async () => {
      await mountTripPage()

      await vi.waitFor(() => expect(document.title).toBe('Japan with friends · Dayfarer'))
    })

    it('turns Edit trip off for a past trip, with the reason', async () => {
      vi.setSystemTime(new Date('2027-03-20T12:00:00'))
      const { wrapper } = await mountTripPage()

      const items = menuItems(wrapper, 'trip-menu-btn')
      expect(items.find(item => item.label === 'Edit trip')?.disabled).toBe(true)
      expect(items.some(item => item.type === 'label' && item.label === 'Past trips can\'t be edited')).toBe(true)
      expect(wrapper.find('[data-testid="trip-badge"]').text()).toBe('Ended')
    })

    it('keeps Edit trip on for a trip that has not ended', async () => {
      const { wrapper } = await mountTripPage()

      const items = menuItems(wrapper, 'trip-menu-btn')
      expect(items.find(item => item.label === 'Edit trip')?.disabled).toBeFalsy()
      expect(items.some(item => item.type === 'label')).toBe(false)
    })

    it('shows No dates yet and no badge for a trip without dates', async () => {
      tripRef.value = { data: { ...japanTrip, start_date: null, end_date: null } }
      const { wrapper } = await mountTripPage()

      expect(wrapper.find('[data-testid="trip-dates"]').text()).toBe('No dates yet')
      expect(wrapper.find('[data-testid="trip-badge"]').exists()).toBe(false)
    })
  })

  describe('Loading and errors', () => {
    it.each([404, 403])('shows Trip not found for a %i', async (statusCode) => {
      tripRef.value = null
      tripError.value = { statusCode }
      const { wrapper } = await mountTripPage()

      expect(wrapper.text()).toContain('Trip not found')
      expect(wrapper.text()).toContain('It may have been deleted, or the link may be wrong.')
      expect(wrapper.find('[data-testid="back-to-trips-btn"]').attributes('href')).toBe('/')
    })

    it('shows the error state with Try again for any other failure', async () => {
      tripRef.value = null
      tripError.value = { statusCode: 500 }
      const { wrapper } = await mountTripPage()

      expect(wrapper.text()).toContain('An unexpected error has occured.')
      const tryAgain = wrapper.findAll('button').find(button => button.text() === 'Try again')!
      await tryAgain.trigger('click')
      await flushPromises()

      expect(tripRefreshMock).toHaveBeenCalled()
      expect(spotsRefreshMock).toHaveBeenCalled()
    })

    it('shows the skeleton while the trip loads', async () => {
      tripRef.value = null
      tripPending.value = true
      const { wrapper } = await mountTripPage()

      expect(wrapper.find('[data-testid="days-skeleton"]').exists()).toBe(true)
      expect(wrapper.find('[data-testid="trip-name"]').exists()).toBe(false)
    })
  })

  describe('Edit and delete', () => {
    const ERROR_TOAST = {
      title: 'Something went wrong',
      icon: 'i-lucide-circle-x',
      description: 'There was a problem with your request',
      color: 'error',
    }

    it('opens Edit trip with the trip\'s details', async () => {
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Edit trip')

      expect((bodyWrapper.find('input[name="name"]').element as HTMLInputElement).value).toBe('Japan with friends')
      expect(bodyWrapper.find('[data-testid="close-modal-btn"]').exists()).toBe(true)
    })

    it('opens Edit trip in a sheet on a phone', async () => {
      widthRef.value = 767
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Edit trip')

      expect(bodyWrapper.find('[data-testid="close-slideover-btn"]').exists()).toBe(true)
    })

    it('saves Edit trip and shows the new name', async () => {
      clientMock.mockResolvedValue({ data: { ...japanTrip, name: 'Japan and Korea' } })
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Edit trip')
      await bodyWrapper.find('[data-testid="save-trip-btn"]').trigger('click')
      await flushPromises()

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1', {
        method: 'PATCH',
        body: { name: 'Japan with friends', start_date: '2027-03-12', end_date: '2027-03-18' },
      })
      expect(wrapper.find('[data-testid="trip-name"]').text()).toBe('Japan and Korea')
    })

    it('does not leave Delete trip spinning when Edit trip is still saving', async () => {
      clientMock.mockReturnValue(new Promise(() => {}))
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Edit trip')
      await bodyWrapper.find('[data-testid="save-trip-btn"]').trigger('click')
      await flushPromises()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Delete trip')

      expect(bodyWrapper.find('[data-testid="delete-trip-btn"]').attributes()).not.toHaveProperty('disabled')
    })

    describe('the warning about places left outside the new dates', () => {
      async function openEditAndPickEnd(date: string) {
        const mounted = await mountTripPage()
        await selectMenuItem(mounted.wrapper, 'trip-menu-btn', 'Edit trip')
        await mounted.bodyWrapper.find('button[data-testid="select-end-date-btn"]').trigger('click')
        const days = mounted.bodyWrapper.findAll(`[data-testid="end-date-cal"] div[data-value="${date}"]`)
        await days.at(-1)!.trigger('click')
        await flushPromises()
        return mounted
      }

      it('warns when the new dates would leave places out', async () => {
        spotsRef.value = { data: { '2027-03-17': [makeSpot('s7', '2027-03-17')], '2027-03-18': [makeSpot('s8', '2027-03-18')] } }
        const { bodyWrapper } = await openEditAndPickEnd('2027-03-16')

        expect(bodyWrapper.find('[data-testid="outside-dates-warning"]').text())
          .toBe('2 places are on days outside these dates. They\'ll be kept under "Outside the trip dates" so you can move them.')
      })

      it('uses the singular for one place', async () => {
        spotsRef.value = { data: { '2027-03-18': [makeSpot('s8', '2027-03-18')] } }
        const { bodyWrapper } = await openEditAndPickEnd('2027-03-16')

        expect(bodyWrapper.find('[data-testid="outside-dates-warning"]').text())
          .toBe('1 place is on a day outside these dates. It\'ll be kept under "Outside the trip dates" so you can move it.')
      })

      it('does not warn while the dates are unchanged', async () => {
        spotsRef.value = { data: { '2027-03-18': [makeSpot('s8', '2027-03-18')] } }
        const { wrapper, bodyWrapper } = await mountTripPage()
        await selectMenuItem(wrapper, 'trip-menu-btn', 'Edit trip')

        expect(bodyWrapper.find('[data-testid="outside-dates-warning"]').exists()).toBe(false)
      })

      it('does not warn when every stop is still inside the new dates', async () => {
        spotsRef.value = { data: { '2027-03-13': [makeSpot('s1', '2027-03-13')] } }
        const { bodyWrapper } = await openEditAndPickEnd('2027-03-16')

        expect(bodyWrapper.find('[data-testid="outside-dates-warning"]').exists()).toBe(false)
      })
    })

    it('opens Edit trip from Add dates', async () => {
      tripRef.value = { data: { ...japanTrip, start_date: null, end_date: null } }
      const { wrapper, bodyWrapper } = await mountTripPage()
      await wrapper.find('[data-testid="add-dates-btn"]').trigger('click')

      expect((bodyWrapper.find('input[name="name"]').element as HTMLInputElement).value).toBe('Japan with friends')
    })

    it('asks before deleting the trip, with its count of places', async () => {
      spotsRef.value = { data: { '2027-03-13': [makeSpot('s1', '2027-03-13'), makeSpot('s2', '2027-03-13')] } }
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Delete trip')

      expect(bodyWrapper.text()).toContain('Delete this trip?')
      expect(bodyWrapper.text()).toContain('This will permanently delete Japan with friends, its 2 places on days. This cannot be undone.')
    })

    it('keeps the Trips page wording for a trip with nothing in it', async () => {
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Delete trip')

      expect(bodyWrapper.text()).toContain('This will permanently delete Japan with friends and all its associated data. This cannot be undone.')
    })

    it('deletes the trip and goes back to the Trips page', async () => {
      clientMock.mockResolvedValue(undefined)
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Delete trip')
      await bodyWrapper.find('[data-testid="delete-trip-btn"]').trigger('click')
      await flushPromises()

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1', { method: 'DELETE' })
      expect(toastAddMock).toHaveBeenCalledWith({ title: 'Trip deleted successfully', icon: 'i-lucide-circle-check' })
      expect(navigateToMock).toHaveBeenCalledWith('/')
    })

    it('keeps the trip and shows the error toast when deleting fails', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))
      const { wrapper, bodyWrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'trip-menu-btn', 'Delete trip')
      await bodyWrapper.find('[data-testid="delete-trip-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith(ERROR_TOAST)
      expect(navigateToMock).not.toHaveBeenCalled()
      expect(wrapper.find('[data-testid="trip-name"]').text()).toBe('Japan with friends')
    })
  })

  describe('Adding places', () => {
    const ameyoko = { id: 'p1', name: 'Ameyoko Market', city: 'Tokyo', details: '', address: '', country: 'Japan', website: '', phone: '', tags: [] }
    const meiji = { ...ameyoko, id: 'p2', name: 'Meiji Jingu' }

    async function openSearchForDay2() {
      const mounted = await mountTripPage()
      await mounted.wrapper.findAll('[data-testid="add-place-btn"]')[1]!.trigger('click')
      await flushPromises()
      return mounted
    }

    it('opens the search for a day', async () => {
      const { bodyWrapper } = await openSearchForDay2()

      expect(bodyWrapper.text()).toContain('Add places to day 2')
      expect(bodyWrapper.text()).toContain('Sat 13 Mar')
      expect(bodyWrapper.find('[data-testid="place-search-input"]').exists()).toBe(true)
    })

    it('adds the stop through useTripDays', async () => {
      clientMock.mockResolvedValue({ data: makeSpot('s9', '2027-03-13', { place_id: 'p1' }) })
      const { wrapper } = await openSearchForDay2()

      const added = await wrapper.findComponent(TripPlaceSearch).props('add')(ameyoko)
      await flushPromises()

      expect(added).toBe(true)
      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots', {
        method: 'POST',
        body: { place_id: 'p1', visit_date: '2027-03-13' },
      })
      expect(wrapper.findAll('[data-testid="trip-day"]')[1]!.text()).toContain('Place s9')
    })

    it('toasts what was added when Done is pressed', async () => {
      const { wrapper, bodyWrapper } = await openSearchForDay2()
      const search = wrapper.findComponent(TripPlaceSearch)
      search.vm.$emit('added', ameyoko)
      search.vm.$emit('added', meiji)
      await bodyWrapper.find('[data-testid="place-search-done-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith({
        title: 'Added 2 places to day 2',
        icon: 'i-lucide-circle-check',
        description: 'Ameyoko Market, Meiji Jingu',
      })
    })

    it('says place, not places, for one', async () => {
      const { wrapper, bodyWrapper } = await openSearchForDay2()
      wrapper.findComponent(TripPlaceSearch).vm.$emit('added', ameyoko)
      await bodyWrapper.find('[data-testid="place-search-done-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith(expect.objectContaining({ title: 'Added 1 place to day 2' }))
    })

    it('shows no toast when nothing was added', async () => {
      const { bodyWrapper } = await openSearchForDay2()
      await bodyWrapper.find('[data-testid="place-search-done-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).not.toHaveBeenCalled()
    })
  })

  describe('Lists', () => {
    const listItem = (id: string, type: 'place' | 'checklist' | 'note') => ({
      id,
      itinerary_lists_id: 'l1',
      type,
      title: null,
      content: null,
      sort_order: 1,
      place: null,
      checklist_items: [],
    })
    const beforeWeGo = {
      id: 'l1',
      itinerary_id: 't1',
      name: 'Before we go',
      sort_order: 1,
      items: [listItem('c1', 'checklist'), listItem('c2', 'checklist'), listItem('n1', 'note')],
    }
    const food = { ...beforeWeGo, id: 'l2', name: 'Food', sort_order: 2, items: [] }

    describe('layout', () => {
      it('puts days and lists side by side from 1024px, with tabs below', async () => {
        const { wrapper } = await mountTripPage()

        expect(wrapper.find('[data-testid="trip-tabs"]').classes()).toContain('lg:hidden')
        const days = wrapper.find('[data-testid="days-panel"]')
        const lists = wrapper.find('[data-testid="lists-panel"]')
        expect(days.classes()).not.toContain('hidden')
        expect(lists.classes()).toContain('hidden')
        expect(lists.classes()).toContain('lg:block')

        await wrapper.find('[data-testid="trip-tab-lists"]').trigger('click')
        expect(days.classes()).toContain('hidden')
        expect(days.classes()).toContain('lg:block')
        expect(lists.classes()).not.toContain('hidden')
      })

      it('marks the tabs and panels for assistive technology', async () => {
        const { wrapper } = await mountTripPage()

        expect(wrapper.find('[data-testid="trip-tab-days"]').attributes('role')).toBe('tab')
        expect(wrapper.find('[data-testid="trip-tab-days"]').attributes('aria-selected')).toBe('true')
        expect(wrapper.find('[data-testid="trip-tab-lists"]').attributes('aria-selected')).toBe('false')
        expect(wrapper.find('[data-testid="days-panel"]').attributes('role')).toBe('tabpanel')
        expect(wrapper.find('[data-testid="lists-panel"]').attributes('role')).toBe('tabpanel')
      })
    })

    it('shows No lists yet with New list for a new trip', async () => {
      const { wrapper } = await mountTripPage()

      expect(wrapper.text()).toContain('No lists yet')
      expect(wrapper.text()).toContain('Keep places you\'re considering, notes and checklists here. For example, backup places in case one is closed, or things to pack.')
      expect(wrapper.find('[data-testid="new-list-btn"]').exists()).toBe(true)
    })

    describe('creating a list', () => {
      async function openNameBox() {
        const mounted = await mountTripPage()
        await mounted.wrapper.find('[data-testid="new-list-btn"]').trigger('click')
        return mounted
      }

      it('creates a list from the name box, with its three add buttons', async () => {
        clientMock.mockResolvedValue({ data: { id: 'l1', itinerary_id: 't1', name: 'Before we go', sort_order: 1 } })
        const { wrapper } = await openNameBox()

        expect(wrapper.text()).toContain('Name the list, like "Food to try" or "Packing".')
        await wrapper.find('input[data-testid="list-name-input"]').setValue('Before we go')
        await wrapper.find('[data-testid="list-name-save-btn"]').trigger('click')
        await flushPromises()

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists', { method: 'POST', body: { name: 'Before we go' } })
        const card = wrapper.find('[data-testid="list-card"]')
        expect(card.text()).toContain('Before we go')
        expect(card.find('[data-testid="list-add-place-btn"]').exists()).toBe(true)
        expect(card.find('[data-testid="list-add-note-btn"]').exists()).toBe(true)
        expect(card.find('[data-testid="list-add-checklist-btn"]').exists()).toBe(true)
        // New list sits after the last list.
        const order = wrapper.findAll('[data-testid="list-card"], [data-testid="new-list-btn"]').map(el => el.attributes('data-testid'))
        expect(order).toEqual(['list-card', 'new-list-btn'])
      })

      it('keeps Save off while the name is blank', async () => {
        const { wrapper } = await openNameBox()

        expect(wrapper.find('[data-testid="list-name-save-btn"]').attributes()).toHaveProperty('disabled')
        await wrapper.find('input[data-testid="list-name-input"]').setValue('   ')
        expect(wrapper.find('[data-testid="list-name-save-btn"]').attributes()).toHaveProperty('disabled')
      })

      it('shows the API\'s message under the name box', async () => {
        clientMock.mockRejectedValue({ statusCode: 422, data: { errors: { name: ['The name field must not be greater than 255 characters.'] } } })
        const { wrapper } = await openNameBox()
        await wrapper.find('input[data-testid="list-name-input"]').setValue('x')
        await wrapper.find('[data-testid="list-name-save-btn"]').trigger('click')
        await flushPromises()

        expect(wrapper.text()).toContain('The name field must not be greater than 255 characters.')
        expect(toastAddMock).not.toHaveBeenCalled()
      })

      it('drops the name box on Cancel', async () => {
        const { wrapper } = await openNameBox()
        await wrapper.find('[data-testid="list-name-cancel-btn"]').trigger('click')

        expect(wrapper.find('input[data-testid="list-name-input"]').exists()).toBe(false)
        expect(clientMock).not.toHaveBeenCalled()
      })
    })

    describe('with lists', () => {
      beforeEach(() => {
        listsRef.value = { data: [beforeWeGo, food] }
      })

      it('renames a list in place', async () => {
        clientMock.mockResolvedValue({ data: { id: 'l1', itinerary_id: 't1', name: 'Pack list', sort_order: 1 } })
        const { wrapper } = await mountTripPage()
        await selectMenuItem(wrapper, 'list-menu-btn-l1', 'Rename')

        const input = wrapper.find('input[data-testid="list-name-input"]')
        expect((input.element as HTMLInputElement).value).toBe('Before we go')
        await input.setValue('Pack list')
        await wrapper.find('[data-testid="list-name-save-btn"]').trigger('click')
        await flushPromises()

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists/l1', { method: 'PATCH', body: { name: 'Pack list' } })
        expect(wrapper.text()).toContain('Pack list')
      })

      it('asks before deleting a list, with what goes with it', async () => {
        clientMock.mockResolvedValue(undefined)
        const { wrapper, bodyWrapper } = await mountTripPage()
        await selectMenuItem(wrapper, 'list-menu-btn-l1', 'Delete list')

        expect(bodyWrapper.text()).toContain('Delete "Before we go"?')
        expect(bodyWrapper.text()).toContain('Its 2 checklists and 1 note will be deleted too. This can\'t be undone.')
        await bodyWrapper.find('[data-testid="confirm-delete-btn"]').trigger('click')
        await flushPromises()

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists/l1', { method: 'DELETE' })
        expect(wrapper.findAll('[data-testid="list-card"]')).toHaveLength(1)
      })

      it('turns Move up off for the first list and Move down off for the last', async () => {
        const { wrapper } = await mountTripPage()

        const first = menuItems(wrapper, 'list-menu-btn-l1')
        expect(first.find(item => item.label === 'Move up')?.disabled).toBe(true)
        expect(first.find(item => item.label === 'Move down')?.disabled).toBe(false)
        const last = menuItems(wrapper, 'list-menu-btn-l2')
        expect(last.find(item => item.label === 'Move down')?.disabled).toBe(true)
      })

      it('moves a list down at once and sends every list id', async () => {
        clientMock.mockResolvedValue(undefined)
        const { wrapper } = await mountTripPage()
        await selectMenuItem(wrapper, 'list-menu-btn-l1', 'Move down')

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists/reorder', { method: 'PATCH', body: { list_ids: ['l2', 'l1'] } })
        expect(wrapper.findAll('[data-testid="list-card"]')[0]!.text()).toContain('Food')
      })

      it('counts the lists in Delete trip', async () => {
        spotsRef.value = { data: { '2027-03-13': [makeSpot('s1', '2027-03-13'), makeSpot('s2', '2027-03-13')] } }
        listsRef.value = { data: [beforeWeGo] }
        const { wrapper, bodyWrapper } = await mountTripPage()
        await selectMenuItem(wrapper, 'trip-menu-btn', 'Delete trip')

        expect(bodyWrapper.text()).toContain('its 2 places on days and its 1 list. This cannot be undone.')
      })
    })

    it('shows the lists\' own error with Try again when only the lists fail', async () => {
      listsError.value = { statusCode: 500 }
      const { wrapper } = await mountTripPage()

      expect(wrapper.text()).toContain('Your lists couldn\'t be loaded')
      expect(wrapper.text()).toContain('Check your connection and try again. Your days are still here.')
      expect(wrapper.findAll('[data-testid="trip-day"]').length).toBeGreaterThan(0)

      await wrapper.find('[data-testid="lists-panel"]').findAll('button').find(button => button.text() === 'Try again')!.trigger('click')
      expect(listsRefreshMock).toHaveBeenCalled()
      expect(spotsRefreshMock).not.toHaveBeenCalled()
    })
  })

  describe('Items in lists', () => {
    const ameyoko = makePlace({ id: 'p1', name: 'Ameyoko Market', city: 'Tokyo', details: 'An open-air market.' })
    const placeItem = {
      id: 'i1',
      itinerary_lists_id: 'l1',
      type: 'place',
      title: null,
      content: null,
      sort_order: 1,
      place: { id: 'lp1', itinerary_list_item_id: 'i1', place_id: 'p1', place: ameyoko, start_time: null, end_time: null, marked_visited: false },
      checklist_items: [],
    }
    const noteItem = { id: 'n1', itinerary_lists_id: 'l1', type: 'note', title: null, content: 'Bring an umbrella', sort_order: 2, place: null, checklist_items: [] }
    const list = (items: Record<string, unknown>[]) => ({ id: 'l1', itinerary_id: 't1', name: 'Before we go', sort_order: 1, items })
    const searchPlace = { id: 'p3', name: 'Meiji Jingu', city: 'Tokyo', details: '', address: '', country: 'Japan', website: '', phone: '', tags: [] }

    it('adds places to a list from the search', async () => {
      listsRef.value = { data: [list([])] }
      clientMock.mockResolvedValue({ data: { ...placeItem, id: 'i9' } })
      const { wrapper, bodyWrapper } = await mountTripPage()
      await wrapper.find('[data-testid="list-add-place-btn"]').trigger('click')
      await flushPromises()
      expect(bodyWrapper.text()).toContain('Add places to Before we go')

      const search = wrapper.findComponent(TripPlaceSearch)
      expect(await search.props('add')(searchPlace)).toBe(true)
      search.vm.$emit('added', searchPlace)
      await bodyWrapper.find('[data-testid="place-search-done-btn"]').trigger('click')
      await flushPromises()

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists/l1/items', { method: 'POST', body: { type: 'place', place_id: 'p3' } })
      expect(toastAddMock).toHaveBeenCalledWith({ title: 'Added 1 place to Before we go', icon: 'i-lucide-circle-check', description: 'Meiji Jingu' })
    })

    it('labels a list place with the days it is on', async () => {
      listsRef.value = { data: [list([placeItem])] }
      spotsRef.value = { data: { '2027-03-12': [makeSpot('s1', '2027-03-12', { place_id: 'p1' })], '2027-03-18': [makeSpot('s2', '2027-03-18', { place_id: 'p1' })] } }
      const { wrapper } = await mountTripPage()

      expect(wrapper.find('[data-testid="list-place-days"]').text()).toBe('On days 1 and 7')
      expect(wrapper.find('[data-testid="add-to-day-btn"]').exists()).toBe(false)
    })

    it('offers Add to a day for a list place that is on no day', async () => {
      listsRef.value = { data: [list([placeItem])] }
      const { wrapper } = await mountTripPage()

      expect(wrapper.find('[data-testid="list-place-days"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="add-to-day-btn"]').text()).toBe('Add to a day')
    })

    it('adds a list place to a day from the picker, without times', async () => {
      listsRef.value = { data: [list([placeItem])] }
      clientMock.mockResolvedValue({ data: makeSpot('s9', '2027-03-13', { place_id: 'p1' }) })
      const { wrapper, bodyWrapper } = await mountTripPage()
      await wrapper.find('[data-testid="add-to-day-btn"]').trigger('click')

      expect(bodyWrapper.text()).toContain('Add to a day')
      expect(bodyWrapper.text()).toContain('Ameyoko Market')
      await bodyWrapper.find('[data-testid="day-option-2027-03-13"]').trigger('click')
      expect(bodyWrapper.find('[data-testid="day-picker-confirm-btn"]').text()).toBe('Add to day 2')
      await bodyWrapper.find('[data-testid="day-picker-confirm-btn"]').trigger('click')
      await flushPromises()

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots', { method: 'POST', body: { place_id: 'p1', visit_date: '2027-03-13' } })
      expect(toastAddMock).toHaveBeenCalledWith({ title: 'Added to day 2', icon: 'i-lucide-circle-check', description: 'Ameyoko Market' })
      expect(wrapper.find('[data-testid="list-place-i1"]').exists()).toBe(true)
    })

    it('turns Add to a day off when the trip has no dates', async () => {
      tripRef.value = { data: { ...japanTrip, start_date: null, end_date: null } }
      listsRef.value = { data: [list([placeItem])] }
      const { wrapper } = await mountTripPage()

      const items = menuItems(wrapper, 'item-menu-btn-i1')
      expect(items.find(item => item.label === 'Add to a day')?.disabled).toBe(true)
      expect(items.some(item => item.type === 'label' && item.label === 'Add the trip\'s dates first')).toBe(true)
    })

    it('removes a list place without asking', async () => {
      listsRef.value = { data: [list([placeItem, noteItem])] }
      clientMock.mockResolvedValue(undefined)
      const { wrapper } = await mountTripPage()
      await selectMenuItem(wrapper, 'item-menu-btn-i1', 'Remove from list')
      await flushPromises()

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists/l1/items/i1', { method: 'DELETE' })
      expect(wrapper.find('[data-testid="list-place-i1"]').exists()).toBe(false)
    })

    it('shows a removed place with only Remove from list', async () => {
      listsRef.value = { data: [list([{ ...placeItem, place: null }])] }
      const { wrapper } = await mountTripPage()

      expect(wrapper.find('[data-testid="list-place-i1"]').text()).toContain('This place was removed')
      expect(menuItems(wrapper, 'item-menu-btn-i1').map(item => item.label)).toEqual(['Remove from list'])
    })

    it('opens a list place to show its details, without visited or times', async () => {
      listsRef.value = { data: [list([placeItem])] }
      const { wrapper } = await mountTripPage()
      await wrapper.find('[data-testid="list-place-toggle-i1"]').trigger('click')

      const row = wrapper.find('[data-testid="list-place-i1"]')
      expect(row.text()).toContain('An open-air market.')
      expect(row.find('[data-testid="stop-visited-btn"]').exists()).toBe(false)
      expect(row.find('[data-testid="stop-edit-times-btn"]').exists()).toBe(false)
    })

    it('adds a checklist from + Checklist, and opens its next box', async () => {
      listsRef.value = { data: [list([])] }
      clientMock
        .mockResolvedValueOnce({ data: { id: 'c9', itinerary_lists_id: 'l1', type: 'checklist', title: null, sort_order: 1 } })
        .mockResolvedValueOnce({ data: { id: 'c9', itinerary_lists_id: 'l1', type: 'checklist', title: 'Packing', sort_order: 1 } })
        .mockResolvedValueOnce({ data: { id: 'e1', itinerary_list_item_id: 'c9', label: 'Passport', is_checked: null, sort_order: 1 } })
      const { wrapper } = await mountTripPage()
      await wrapper.find('[data-testid="list-add-checklist-btn"]').trigger('click')
      await wrapper.find('input[data-testid="checklist-title-input"]').setValue('Packing')
      const input = wrapper.find('input[data-testid="checklist-item-input"]')
      await input.setValue('Passport')
      await input.trigger('keydown', { key: 'Enter' })
      await flushPromises()

      expect(clientMock).toHaveBeenNthCalledWith(1, '/api/v1/itineraries/t1/lists/l1/items', { method: 'POST', body: { type: 'checklist' } })
      expect(clientMock).toHaveBeenNthCalledWith(2, '/api/v1/itineraries/t1/lists/l1/items/c9', { method: 'PATCH', body: { type: 'checklist', title: 'Packing' } })
      expect(clientMock).toHaveBeenNthCalledWith(3, '/api/v1/itineraries/t1/lists/l1/items/c9/checklist', { method: 'POST', body: { label: 'Passport' } })
      const checklist = wrapper.find('[data-testid="checklist-c9"]')
      expect(checklist.text()).toContain('Packing')
      expect(checklist.text()).toContain('Passport')
      // The draft is gone and the checklist's own box is open for the next item.
      expect(wrapper.findAll('input[data-testid="checklist-item-input"]')).toHaveLength(1)
    })

    describe('notes', () => {
      beforeEach(() => {
        listsRef.value = { data: [list([noteItem])] }
      })

      it('creates a note only on Save', async () => {
        clientMock
          .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: null, sort_order: 3 } })
          .mockResolvedValueOnce({ data: { id: 'n9', itinerary_lists_id: 'l1', type: 'note', content: 'Book the ryokan', sort_order: 3 } })
        const { wrapper } = await mountTripPage()
        await wrapper.find('[data-testid="list-add-note-btn"]').trigger('click')

        expect(wrapper.find('[data-testid="note-save-btn"]').attributes()).toHaveProperty('disabled')
        expect(clientMock).not.toHaveBeenCalled()
        await wrapper.find('[data-testid="note-input"]').setValue('Book the ryokan')
        await wrapper.find('[data-testid="note-save-btn"]').trigger('click')
        await flushPromises()

        expect(clientMock).toHaveBeenCalledTimes(2)
        expect(wrapper.find('[data-testid="note-n9"]').text()).toContain('Book the ryokan')
        expect(wrapper.find('[data-testid="note-input"]').exists()).toBe(false)
      })

      it('keeps the typed text when saving a note fails', async () => {
        clientMock.mockRejectedValue(new Error('Network Error'))
        const { wrapper } = await mountTripPage()
        await wrapper.find('[data-testid="list-add-note-btn"]').trigger('click')
        await wrapper.find('[data-testid="note-input"]').setValue('Book the ryokan')
        await wrapper.find('[data-testid="note-save-btn"]').trigger('click')
        await flushPromises()

        expect((wrapper.find('[data-testid="note-input"]').element as HTMLTextAreaElement).value).toBe('Book the ryokan')
        expect(toastAddMock).toHaveBeenCalled()
      })

      it('edits a note by tapping its text', async () => {
        clientMock.mockResolvedValue({ data: { ...noteItem, content: 'Bring two umbrellas' } })
        const { wrapper } = await mountTripPage()
        await wrapper.find('[data-testid="note-text-n1"]').trigger('click')

        const input = wrapper.find('[data-testid="note-input"]')
        expect((input.element as HTMLTextAreaElement).value).toBe('Bring an umbrella')
        await input.setValue('Bring two umbrellas')
        await wrapper.find('[data-testid="note-save-btn"]').trigger('click')
        await flushPromises()

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists/l1/items/n1', { method: 'PATCH', body: { type: 'note', content: 'Bring two umbrellas' } })
        expect(wrapper.find('[data-testid="note-n1"]').text()).toContain('Bring two umbrellas')
      })

      it('asks before deleting a note', async () => {
        clientMock.mockResolvedValue(undefined)
        const { wrapper, bodyWrapper } = await mountTripPage()
        await selectMenuItem(wrapper, 'item-menu-btn-n1', 'Delete')

        expect(bodyWrapper.text()).toContain('Delete this note?')
        await bodyWrapper.find('[data-testid="confirm-delete-btn"]').trigger('click')
        await flushPromises()

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/lists/l1/items/n1', { method: 'DELETE' })
        expect(wrapper.find('[data-testid="note-n1"]').exists()).toBe(false)
      })
    })
  })

  describe('Days', () => {
    const stop1 = makeSpot('s1', '2027-03-13', { start_time: '08:00:00', end_time: '10:00:00' })
    const stop2 = makeSpot('s2', '2027-03-13')

    afterEach(() => {
      // happy-dom has no scrollIntoView, so the tests that need it set it themselves.
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
    })

    it('lists every day with its number and date', async () => {
      const { wrapper } = await mountTripPage()

      const days = wrapper.findAll('[data-testid="trip-day"]')
      expect(days).toHaveLength(7)
      expect(days[1]!.text()).toMatch(/^Day 2/)
      expect(days[1]!.text()).toContain('Sat 13 Mar')
    })

    it('says Nothing planned yet on an empty day', async () => {
      const { wrapper } = await mountTripPage()

      expect(wrapper.findAll('[data-testid="trip-day"]')[0]!.text()).toContain('Nothing planned yet.')
    })

    it('shows a stop\'s times, or Any time', async () => {
      spotsRef.value = { data: { '2027-03-13': [stop1, stop2] } }
      const { wrapper } = await mountTripPage()

      const day = wrapper.findAll('[data-testid="trip-day"]')[1]!.text()
      expect(day).toContain('08:00')
      expect(day).toContain('10:00')
      expect(day).toContain('Any time')
      expect(day).toContain('Place s1')
      expect(day).not.toContain('Nothing planned yet.')
    })

    it('marks today and scrolls to it during the trip', async () => {
      vi.setSystemTime(new Date('2027-03-14T12:00:00'))
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const { wrapper } = await mountTripPage({ attachTo: document.body })
      await flushPromises()

      const today = wrapper.find('#day-2027-03-14')
      expect(today.text()).toContain('Today')
      expect(today.classes()).toContain('border-primary')
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toBe(today.element)
    })

    it('does not scroll before the trip starts', async () => {
      const scrollIntoView = vi.fn()
      Element.prototype.scrollIntoView = scrollIntoView
      const { wrapper } = await mountTripPage({ attachTo: document.body })
      await flushPromises()

      expect(wrapper.text()).not.toContain('Today')
      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    describe('moving a stop to another day', () => {
      it('moves it, keeping its times', async () => {
        spotsRef.value = { data: { '2027-03-13': [stop1, stop2] } }
        clientMock.mockResolvedValue({ data: stop1 })
        const { wrapper, bodyWrapper } = await mountTripPage()

        await selectMenuItem(wrapper, 'stop-menu-btn-s1', 'Move to another day')
        expect(bodyWrapper.text()).toContain('Move to another day')
        await bodyWrapper.find('[data-testid="day-option-2027-03-15"]').trigger('click')
        await bodyWrapper.find('[data-testid="day-picker-confirm-btn"]').trigger('click')
        await flushPromises()

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/s1', {
          method: 'PATCH',
          body: { visit_date: '2027-03-15', start_time: '08:00', end_time: '10:00' },
        })
        expect(spotsRefreshMock).toHaveBeenCalled()
      })

      it('turns the own day of the stop off, and the confirm button off until a day is picked', async () => {
        spotsRef.value = { data: { '2027-03-13': [stop1] } }
        const { wrapper, bodyWrapper } = await mountTripPage()
        await selectMenuItem(wrapper, 'stop-menu-btn-s1', 'Move to another day')

        expect(bodyWrapper.find('[data-testid="day-option-2027-03-13"]').attributes()).toHaveProperty('disabled')
        expect(bodyWrapper.find('[data-testid="day-picker-confirm-btn"]').attributes()).toHaveProperty('disabled')
        await bodyWrapper.find('[data-testid="day-option-2027-03-14"]').trigger('click')
        expect(bodyWrapper.find('[data-testid="day-picker-confirm-btn"]').text()).toBe('Move to day 3')
      })

      it('offers Move to another day for a stop outside the trip dates', async () => {
        spotsRef.value = { data: { '2027-03-20': [makeSpot('s9', '2027-03-20')] } }
        const { wrapper } = await mountTripPage()

        expect(wrapper.find('[data-testid="outside-section"]').text()).toContain('Move these to a day of the trip, or remove them.')
        const labels = menuItems(wrapper, 'stop-menu-btn-s9').map(item => item.label)
        expect(labels).toContain('Move to another day')
        expect(labels).toContain('Remove from trip')
      })

      it('turns Move to another day off when the trip has no dates', async () => {
        tripRef.value = { data: { ...japanTrip, start_date: null, end_date: null } }
        spotsRef.value = { data: { '2027-03-13': [stop1] } }
        const { wrapper } = await mountTripPage()

        const move = menuItems(wrapper, 'stop-menu-btn-s1').find(item => item.label === 'Move to another day')
        expect(move?.disabled).toBe(true)
      })
    })

    describe('order within a day', () => {
      it('moves a stop up from its menu, at once', async () => {
        spotsRef.value = { data: { '2027-03-13': [stop1, stop2] } }
        clientMock.mockResolvedValue(undefined)
        const { wrapper } = await mountTripPage()

        await selectMenuItem(wrapper, 'stop-menu-btn-s2', 'Move up')

        expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/reorder', {
          method: 'PATCH',
          body: { visit_date: '2027-03-13', spot_ids: ['s2', 's1'] },
        })
        const names = wrapper.findAll('[data-testid="trip-stop"]').map(row => row.text())
        expect(names[0]).toContain('Place s2')
        expect(names[1]).toContain('Place s1')
      })

      it('turns Move up off for the first stop and Move down off for the last', async () => {
        spotsRef.value = { data: { '2027-03-13': [stop1, stop2] } }
        const { wrapper } = await mountTripPage()

        const first = menuItems(wrapper, 'stop-menu-btn-s1')
        expect(first.find(item => item.label === 'Move up')?.disabled).toBe(true)
        expect(first.find(item => item.label === 'Move down')?.disabled).toBe(false)
        const last = menuItems(wrapper, 'stop-menu-btn-s2')
        expect(last.find(item => item.label === 'Move up')?.disabled).toBe(false)
        expect(last.find(item => item.label === 'Move down')?.disabled).toBe(true)
      })

      it('has no Move up or Move down for a stop outside the trip dates', async () => {
        spotsRef.value = { data: { '2027-03-20': [makeSpot('s9', '2027-03-20')] } }
        const { wrapper } = await mountTripPage()

        const labels = menuItems(wrapper, 'stop-menu-btn-s9').map(item => item.label)
        expect(labels).not.toContain('Move up')
        expect(labels).not.toContain('Move down')
      })

      it('shows Times out of order when a day\'s times are out of order', async () => {
        const early = makeSpot('s3', '2027-03-13', { start_time: '07:00:00', end_time: '08:00:00' })
        spotsRef.value = { data: { '2027-03-13': [stop1, early] } }
        const { wrapper } = await mountTripPage()

        expect(wrapper.findAll('[data-testid="trip-day"]')[1]!.find('[data-testid="times-out-of-order"]').exists()).toBe(true)
        expect(wrapper.findAll('[data-testid="times-out-of-order"]')).toHaveLength(1)
      })

      it('shows no note when the times are in order', async () => {
        spotsRef.value = { data: { '2027-03-13': [stop1, stop2] } }
        const { wrapper } = await mountTripPage()

        expect(wrapper.find('[data-testid="times-out-of-order"]').exists()).toBe(false)
      })
    })

    it('opening one stop closes the other', async () => {
      spotsRef.value = { data: { '2027-03-13': [stop1, stop2] } }
      const { wrapper } = await mountTripPage()

      await wrapper.find('[data-testid="stop-toggle-s1"]').trigger('click')
      expect(wrapper.find('[data-testid="stop-toggle-s1"]').attributes('aria-expanded')).toBe('true')

      await wrapper.find('[data-testid="stop-toggle-s2"]').trigger('click')
      expect(wrapper.find('[data-testid="stop-toggle-s1"]').attributes('aria-expanded')).toBe('false')
      expect(wrapper.find('[data-testid="stop-toggle-s2"]').attributes('aria-expanded')).toBe('true')
    })

    it('removes a stop from its day without asking', async () => {
      spotsRef.value = { data: { '2027-03-13': [stop1, stop2] } }
      clientMock.mockResolvedValue(undefined)
      const { wrapper } = await mountTripPage()

      await selectMenuItem(wrapper, 'stop-menu-btn-s1', 'Remove from day')
      await flushPromises()

      expect(clientMock).toHaveBeenCalledWith('/api/v1/itineraries/t1/spots/s1', { method: 'DELETE' })
      expect(wrapper.text()).not.toContain('Place s1')
      expect(wrapper.text()).toContain('Place s2')
    })

    it('shows the days\' own error with Try again when only the stops fail', async () => {
      spotsError.value = { statusCode: 500 }
      const { wrapper } = await mountTripPage()

      expect(wrapper.text()).toContain('Your days couldn\'t be loaded')
      expect(wrapper.text()).toContain('Check your connection and try again.')
      expect(wrapper.find('[data-testid="trip-name"]').exists()).toBe(true)

      await wrapper.findAll('button').find(button => button.text() === 'Try again')!.trigger('click')
      expect(spotsRefreshMock).toHaveBeenCalled()
      expect(tripRefreshMock).not.toHaveBeenCalled()
    })

    describe('a trip without dates', () => {
      beforeEach(() => {
        tripRef.value = { data: { ...japanTrip, start_date: null, end_date: null } }
      })

      it('shows No dates yet with Add dates', async () => {
        const { wrapper } = await mountTripPage()

        expect(wrapper.text()).toContain('No dates yet')
        expect(wrapper.text()).toContain('Add the trip\'s dates to plan what you\'ll do each day.')
        expect(wrapper.find('[data-testid="add-dates-btn"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="add-place-btn"]').exists()).toBe(false)
      })

      it('shows the stops of a trip without dates under Outside the trip dates', async () => {
        spotsRef.value = { data: { '2027-03-13': [stop1] } }
        const { wrapper } = await mountTripPage()

        const section = wrapper.find('[data-testid="outside-section"]')
        expect(section.exists()).toBe(true)
        expect(section.text()).toContain('Place s1')
        expect(wrapper.find('[data-testid="add-place-btn"]').exists()).toBe(false)
      })
    })

    describe('stops outside the trip dates', () => {
      it('keeps them in their own section, with a notice', async () => {
        spotsRef.value = { data: { '2027-03-20': [makeSpot('s9', '2027-03-20')] } }
        const { wrapper } = await mountTripPage()

        expect(wrapper.find('[data-testid="outside-notice"]').text()).toContain('1 place is on a day outside the trip.')
        const section = wrapper.find('[data-testid="outside-section"]')
        expect(section.text()).toContain('Sat 20 Mar')
        expect(section.text()).toContain('Place s9')
        expect(menuItems(wrapper, 'stop-menu-btn-s9').some(item => item.label === 'Remove from trip')).toBe(true)
      })

      it('says how many places in the notice', async () => {
        spotsRef.value = { data: { '2027-03-20': [makeSpot('s8', '2027-03-20'), makeSpot('s9', '2027-03-20')] } }
        const { wrapper } = await mountTripPage()

        expect(wrapper.find('[data-testid="outside-notice"]').text()).toContain('2 places are on days outside the trip.')
      })

      it('shows no section or notice when every stop is inside the dates', async () => {
        spotsRef.value = { data: { '2027-03-13': [stop1] } }
        const { wrapper } = await mountTripPage()

        expect(wrapper.find('[data-testid="outside-section"]').exists()).toBe(false)
        expect(wrapper.find('[data-testid="outside-notice"]').exists()).toBe(false)
      })
    })
  })
})
