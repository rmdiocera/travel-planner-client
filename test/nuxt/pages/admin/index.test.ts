import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AdminPage from '@/pages/admin/index.vue'
import { DOMWrapper, flushPromises } from '@vue/test-utils'

const fetchMock = vi.fn()
const { toastAddMock } = vi.hoisted(() => {
  return { toastAddMock: vi.fn() }
})

const dataRef = ref(['Canada', 'United States of America', 'Mexico'])
const pendingRef = ref(false)
const errorRef = ref<Error | null>(null)

mockNuxtImport('useToast', () => {
  return () => ({
    add: toastAddMock,
  })
})
mockNuxtImport('useFetch', () => {
  return () => ({
    data: dataRef,
    pending: pendingRef,
    error: errorRef,
  })
})
const widthRef = ref(768)

vi.mock(import('@vueuse/core'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useWindowSize: () => ({
      width: widthRef,
      height: ref(800)
    }),
  }
})

describe('Admin index page', () => {
  let wrapper: Awaited<ReturnType<typeof mountSuspended>>

  afterEach(() => {
    wrapper?.unmount()
    pendingRef.value = false
    errorRef.value = null
  })

  describe('Open/close behavior', () => {
    it('shows the slideover if the "Open" button is clicked', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(true)
    })

    it('hides the slideover if "Close (X)" is clicked', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="close-slideover-btn"]').trigger('click')

      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })

    it('resets form fields if the slideover is closed', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const fieldNames = ['name', 'address', 'city', 'website', 'phone']

      for (const field of fieldNames) {
        const input = bodyWrapper.find(`input[name="${field}"]`)
        await input.setValue('Test')
        expect((input.element as HTMLInputElement).value).toBe('Test')
      }

      const selectBtn = bodyWrapper.find(`button[data-testid="select-country-select"]`)
      await selectBtn.trigger('click')
      const matchingDiv = bodyWrapper.findAll('div[role="option"]').find(div =>
        div.find('span').text() === 'Canada',
      )
      await matchingDiv?.trigger('click')
      const selectInput = bodyWrapper.find('input[name="country"]')
      expect((selectInput.element as HTMLInputElement).value).toBe('Canada')

      const details = bodyWrapper.find(`textarea[name="details"]`)
      await details.setValue('Test')
      expect((details.element as HTMLTextAreaElement).value).toBe('Test')

      await bodyWrapper.find('button[data-testid="close-slideover-btn"]').trigger('click')
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      fieldNames.forEach((field) => {
        const emptyInput = bodyWrapper.find(`input[name="${field}"]`).element as HTMLInputElement
        expect(emptyInput.value).toBe('')
      })

      const emptySelectInput = bodyWrapper.find('input[name="country"]')
      expect((emptySelectInput.element as HTMLInputElement).value).toBe('')

      const emptyDetails = bodyWrapper.find(`textarea[name="details"]`).element as HTMLInputElement
      expect(emptyDetails.value).toBe('')
    })
  })

  describe('Field rendering', () => {
    it('shows the fields that can be filled out in the slideover for creating a place', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const fieldNames = ['image', 'name', 'address', 'country', 'city', 'website', 'phone']

      fieldNames.forEach((field) => {
        expect(bodyWrapper.find(`input[name="${field}"]`).exists()).toBe(true)
      })

      expect(bodyWrapper.find('textarea[name="details"]').exists()).toBe(true)
    })

    it('renders fields empty on initial open', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const fieldNames = ['image', 'name', 'address', 'country', 'city', 'website', 'phone']

      fieldNames.forEach((field) => {
        const input = bodyWrapper.find(`input[name="${field}"]`).element as HTMLInputElement
        expect(input.value).toBe('')
      })

      const detailsTextarea = bodyWrapper.find(`textarea[name="details"]`).element as HTMLInputElement
      expect(detailsTextarea.value).toBe('')
    })
  })

  describe('Form submission, success path', () => {
    beforeEach(() => {
      vi.stubGlobal('$fetch', fetchMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('closes the slideover on successful POST', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="submit-place-btn"]').trigger('click')
      await flushPromises()

      expect(fetchMock.mockResolvedValue({})).toHaveBeenCalled()
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })

    it('shows a success toast with the correct title and icon on successful POST', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="submit-place-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith({
        title: 'Place created successfully',
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

      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const submitBtn = bodyWrapper.find('button[data-testid="submit-place-btn"]')
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
              details: ['The details field is required.'],
              address: ['The address field is required.'],
              country: ['The country field is required.'],
              city: ['The city field is required.'],
            },
          },
        },
        statusCode: 422,
      })

      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="submit-place-btn"]').trigger('click')

      await flushPromises()

      const fieldNames = ['name', 'details', 'address', 'country', 'city']
      const errors = bodyWrapper.findAll('.text-error')

      fieldNames.forEach((field) => {
        const target = errors.find(e => e.text().includes(`The ${field} field is required.`))
        expect(target?.exists()).toBe(true)
      })
    })

    it('shows an error toast with the correct title, icon, description and color on failed POST', async () => {
      fetchMock.mockRejectedValue(new Error('Network Error'))

      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      await bodyWrapper.find('button[data-testid="submit-place-btn"]').trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith({
        title: 'Something went wrong',
        icon: 'i-lucide-circle-x',
        description: 'There was a problem with your request',
        color: 'error',
      })
    })
  })

  describe('Country select states', () => {
    afterEach(() => {
      pendingRef.value = false
      errorRef.value = null
    })

    it('is disabled if an error occured', async () => {
      errorRef.value = new Error('Failed to fetch countries')

      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const selectBtn = bodyWrapper.find(`button[data-testid="select-country-select"]`)
      expect(selectBtn.attributes()).toHaveProperty('disabled')
    })

    it('shows a loading state if it\'s still pending', async () => {
      pendingRef.value = true

      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const loaderIcon = bodyWrapper.find('[data-slot="leadingIcon"][class*="loader-circle"]')
      expect(loaderIcon.exists()).toBe(true)
    })

    it('shows the correct error placeholder', async () => {
      errorRef.value = new Error('Failed to fetch countries')

      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      const errorPlaceholder = bodyWrapper.find(`button[data-testid="select-country-select"] > span[data-slot="placeholder"]`)
      expect(errorPlaceholder.text()).toBe('Failed to get countries')
    })
  })

  describe('Integration with Slideover', async () => {
    it('Side value changes based on window width', async () => {
      wrapper = await mountSuspended(AdminPage)
      await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')

      const bodyWrapper = new DOMWrapper(document.body)
      expect(bodyWrapper.find('[data-side="right"]').exists()).toBe(true)

      widthRef.value = 767
      await flushPromises()
      expect(bodyWrapper.find('[data-side="bottom"]').exists()).toBe(true)
    })
  })
})
