import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountTripPage } from '../../utils/mountTripPage'
import { menuItems, selectMenuItem } from '../../utils/menu'
import { makeSpot } from '../../utils/tripFixtures'

const widthRef = ref(1024)

const { clientMock, lazyFetchMock, toastAddMock, tripRefreshMock, spotsRefreshMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  lazyFetchMock: vi.fn(),
  toastAddMock: vi.fn(),
  tripRefreshMock: vi.fn(),
  spotsRefreshMock: vi.fn(),
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
    for (const mock of [clientMock, lazyFetchMock, toastAddMock, tripRefreshMock, spotsRefreshMock]) {
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
