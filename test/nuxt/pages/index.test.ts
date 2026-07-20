import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import IndexPage from '@/pages/index.vue'

const widthRef = ref(768)

const fetchMock = vi.fn()
const { toastAddMock } = vi.hoisted(() => {
  return { toastAddMock: vi.fn() }
})

mockNuxtImport('useToast', () => {
  return () => ({
    add: toastAddMock,
  })
})

vi.mock(import('@vueuse/core'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useWindowSize: () => ({
      width: widthRef,
      height: ref(800),
    }),
  }
})

describe('Index page', () => {
  let wrapper: Awaited<ReturnType<typeof mountSuspended>>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-01'))
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.useRealTimers()
    // pendingRef.value = false
    // errorRef.value = null
  })

  describe('Open/close behavior', () => {
    it('shows the modal if the "Open" button is clicked', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(true)
    })

    it('hides the modal if "Close (X)" is clicked', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="close-modal-btn"]').trigger('click')

      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })

    it('resets form fields if the modal is closed', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const nameInput = bodyWrapper.find('input[name="name"]')
      await nameInput.setValue('Test')
      expect((nameInput.element as HTMLInputElement).value).toBe('Test')

      const startDateCalendar = bodyWrapper.find('button[data-testid="select-start-date-btn"]')
      await startDateCalendar.trigger('click')
      const matchingStartDateDiv = bodyWrapper.find('div[data-value="2026-07-21"]')
      await matchingStartDateDiv?.trigger('click')
      expect(startDateCalendar.find('span:not([aria-hidden])').text()).toBe('Jul 21, 2026')

      const endDateCalendar = bodyWrapper.find('button[data-testid="select-end-date-btn"]')
      await endDateCalendar.trigger('click')
      const matchingendDateDiv = bodyWrapper.find('div[data-value="2026-07-28"]')
      await matchingendDateDiv?.trigger('click')
      expect(endDateCalendar.find('span:not([aria-hidden])').text()).toBe('Jul 28, 2026')

      await bodyWrapper.find('button[data-testid="close-modal-btn"]').trigger('click')
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')
      await nextTick()

      const emptyNameInput = bodyWrapper.find('input[name="name"]')
      const resetStartDateCalendar = bodyWrapper.find('button[data-testid="select-start-date-btn"]')
      const resetEndDateCalendar = bodyWrapper.find('button[data-testid="select-end-date-btn"]')

      expect((emptyNameInput.element as HTMLInputElement).value).toBe('')
      expect(resetStartDateCalendar.find('span:not([aria-hidden])').text()).toBe('Select a date')
      expect(resetEndDateCalendar.find('span:not([aria-hidden])').text()).toBe('Select a date')
    })
  })

  describe('Field rendering', () => {
    it('shows the fields that can be filled out in the modal for creating an itinerary', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      expect(bodyWrapper.find('input[name="name"]').exists()).toBe(true)
      expect(bodyWrapper.find('button[data-testid="select-start-date-btn"]').exists()).toBe(true)
      expect(bodyWrapper.find('button[data-testid="select-end-date-btn"]').exists()).toBe(true)
    })

    it('renders name field empty and date fields in their default state', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)

      const nameInput = bodyWrapper.find('input[name="name"]')
      expect((nameInput.element as HTMLInputElement).value).toBe('')

      const startDateCalendar = bodyWrapper.find('button[data-testid="select-start-date-btn"]')
      expect(startDateCalendar.find('span:not([aria-hidden])').text()).toBe('Select a date')

      const endDateCalendar = bodyWrapper.find('button[data-testid="select-end-date-btn"]')
      expect(endDateCalendar.find('span:not([aria-hidden])').text()).toBe('Select a date')
    })

    it('shows that the dates before the time today are disabled in the calendar', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const startDateCalendar = bodyWrapper.find('button[data-testid="select-start-date-btn"]')
      await startDateCalendar.trigger('click')
      const dateTodayDiv = bodyWrapper.find('div[data-value="2026-07-01"]')
      expect(dateTodayDiv.attributes()).not.toHaveProperty('data-disabled')
      const dateYesterdayDiv = bodyWrapper.find('div[data-value="2026-06-30"]')
      expect(dateYesterdayDiv.attributes()).toHaveProperty('data-disabled')
    })
  })

  describe('Form submission, success path', () => {
    beforeEach(() => {
      vi.stubGlobal('$fetch', fetchMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('closes the modal on successful POST', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="create-itinerary-btn"]').trigger('click')
      await flushPromises()

      expect(fetchMock.mockResolvedValue({})).toHaveBeenCalled()
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })

    it('shows a success toast with the correct title and icon on successful POST', async () => {
      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="create-itinerary-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith({
        title: 'Itinerary created successfully',
        icon: 'i-lucide-circle-check',
      })
    })

    it('shows a loading state while the POST request is in flight and removes it on finish', async () => {
      let resolveFetch: (value: unknown) => void = () => {}

      fetchMock.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveFetch = resolve
        })
      })

      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const submitBtn = bodyWrapper.find('button[data-testid="create-itinerary-btn"]')
      await submitBtn.trigger('click')
      await flushPromises()

      expect(submitBtn.attributes()).toHaveProperty('disabled')

      resolveFetch({})
      await flushPromises()

      expect(submitBtn.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Form submission, error path', () => {
    beforeEach(() => {
      vi.stubGlobal('$fetch', fetchMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('shows the correct validation errors on a 422 response', async () => {
      fetchMock.mockRejectedValue({
        data: {
          data: {
            errors: {
              name: ['The name field is required.'],
              end_date: ['The end date field must be a date after or equal to start date.'],
            },
          },
        },
        statusCode: 422,
      })

      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const startDateCalendar = bodyWrapper.find('button[data-testid="select-start-date-btn"]')
      await startDateCalendar.trigger('click')
      const matchingStartDateDiv = bodyWrapper.find('div[data-value="2026-07-28"]')
      await matchingStartDateDiv?.trigger('click')
      expect(startDateCalendar.find('span:not([aria-hidden])').text()).toBe('Jul 28, 2026')

      const endDateCalendar = bodyWrapper.find('button[data-testid="select-end-date-btn"]')
      await endDateCalendar.trigger('click')
      const matchingendDateDiv = bodyWrapper.find('div[data-value="2026-07-21"]')
      await matchingendDateDiv?.trigger('click')
      expect(endDateCalendar.find('span:not([aria-hidden])').text()).toBe('Jul 21, 2026')

      await bodyWrapper.find('button[data-testid="create-itinerary-btn"]').trigger('click')
      await flushPromises()

      const errors = bodyWrapper.findAll('.text-error')
      expect(errors.find(e => e.text().includes('The name field is required.'))?.exists()).toBe(true)
      expect(errors.find(e => e.text().includes('The end date field must be a date after or equal to start date.'))?.exists()).toBe(true)
    })

    it('shows an error toast with the correct title, icon, description and color on failed POST', async () => {
      fetchMock.mockRejectedValue(new Error('Network Error'))

      wrapper = await mountSuspended(IndexPage)
      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="create-itinerary-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith({
        title: 'Something went wrong',
        icon: 'i-lucide-circle-x',
        description: 'There was a problem with your request',
        color: 'error',
      })
    })
  })

  describe('Integration with Modal and Slideover', async () => {
    it('shows a modal when page is accessed on medium and large devices', async () => {
      wrapper = await mountSuspended(IndexPage)
      expect(wrapper.find('button[data-testid="open-modal-btn"]').exists()).toBe(true)

      await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')
      const bodyWrapper = new DOMWrapper(document.body)
      expect(bodyWrapper.find('button[data-testid="close-modal-btn"]').exists()).toBe(true)
    })

    it('shows a slideover when page is accessed on small devices', async () => {
      widthRef.value = 767

      wrapper = await mountSuspended(IndexPage)
      expect(wrapper.find('button[data-testid="open-slideover-btn"]').exists()).toBe(true)

      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')
      const bodyWrapper = new DOMWrapper(document.body)
      expect(bodyWrapper.find('button[data-testid="close-slideover-btn"]').exists()).toBe(true)
    })
  })
})
