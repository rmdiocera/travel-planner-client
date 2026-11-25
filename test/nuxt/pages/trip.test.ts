import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountTripPage } from '../../utils/mountTripPage'
import { menuItems } from '../../utils/menu'

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

mockNuxtImport('useLazySanctumFetch', () => {
  return (url: string, options?: Record<string, unknown>) => {
    lazyFetchMock(url, options)
    if (url === '/api/v1/itineraries/t1') {
      return { data: tripRef, pending: tripPending, error: tripError, refresh: tripRefreshMock }
    }
    return { data: spotsRef, pending: ref(false), error: ref(null), refresh: spotsRefreshMock }
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
})
