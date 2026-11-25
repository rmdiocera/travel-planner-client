import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TripPlaceSearch from '~/components/trip/PlaceSearch.vue'
import { mountTripPage } from '../../utils/mountTripPage'
import { menuItems, selectMenuItem } from '../../utils/menu'
import { makeSpot } from '../../utils/tripFixtures'

const widthRef = ref(1024)

const { clientMock, lazyFetchMock, toastAddMock, tripRefreshMock, spotsRefreshMock, navigateToMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  lazyFetchMock: vi.fn(),
  toastAddMock: vi.fn(),
  tripRefreshMock: vi.fn(),
  spotsRefreshMock: vi.fn(),
  navigateToMock: vi.fn(),
}))

const japanTrip = { id: 't1', name: 'Japan with friends', start_date: '2027-03-12', end_date: '2027-03-18' }
const tripRef = ref<{ data: Record<string, string | null> } | null>({ data: japanTrip })
const tripError = ref<Record<string, unknown> | null>(null)
const tripPending = ref(false)
const spotsRef = ref<{ data: Record<string, unknown[]> | [] }>({ data: [] })
const spotsError = ref<Record<string, unknown> | null>(null)

mockNuxtImport('useLazySanctumFetch', () => {
  return (url: string, options?: Record<string, unknown>) => {
    lazyFetchMock(url, options)
    if (url === '/api/v1/itineraries/t1') {
      return { data: tripRef, pending: tripPending, error: tripError, refresh: tripRefreshMock }
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
    for (const mock of [clientMock, lazyFetchMock, toastAddMock, tripRefreshMock, spotsRefreshMock, navigateToMock]) {
      mock.mockReset()
    }
    tripRef.value = { data: japanTrip }
    tripError.value = null
    tripPending.value = false
    spotsRef.value = { data: [] }
    spotsError.value = null
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
