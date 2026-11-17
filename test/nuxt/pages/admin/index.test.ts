import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { readFileSync } from 'fs'
import { Blob, File } from 'node:buffer'
import { resolve } from 'path'
import { mountAdminPage } from '../../../utils/mountAdminPage'

globalThis.Blob = Blob as any
globalThis.File = File as any

const dataRef = ref<string[]>([])
const pendingRef = ref(false)
const errorRef = ref<Error | null>(null)
const widthRef = ref(768)
const SELECTORS = {
  openBtn: 'button[data-testid="open-slideover-btn"]',
  closeBtn: 'button[data-testid="close-slideover-btn"]',
  submitBtn: 'button[data-testid="submit-place-btn"]',
  countrySelect: 'button[data-testid="select-country-select"]',
  tagsSelect: 'button[data-testid="select-tags-select"]',
}
const TEXT_FIELDS = ['name', 'address', 'city', 'website', 'phone']
const ALL_FIELDS = ['images', ...TEXT_FIELDS, 'country']

const { clientMock, toastAddMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  toastAddMock: vi.fn(),
}))

mockNuxtImport('useToast', () => {
  return () => ({
    add: toastAddMock,
  })
})

mockNuxtImport('useFetch', () => {
  return (url: string) => {
    if (url === '/api/countries') {
      dataRef.value = ['Canada', 'United States of America', 'Mexico']
    }

    return {
      data: dataRef,
      pending: pendingRef,
      error: errorRef,
    }
  }
})

mockNuxtImport('useSanctumFetch', () => {
  return (url: string) => {
    if (url === '/api/v1/tags') {
      return {
        data: ref({ data: [{ id: 1, name: 'Park' }, { id: 2, name: 'Shrine' }] }),
        pending: ref(false),
        error: ref(null),
      }
    }
  }
})

mockNuxtImport('useSanctumClient', () => () => clientMock)

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

describe('Admin index page', () => {
  beforeEach(() => {
    for (const mock of [clientMock, toastAddMock]) {
      mock.mockReset()
    }
  })

  afterEach(() => {
    pendingRef.value = false
    errorRef.value = null
    widthRef.value = 768
  })

  describe('Open/close behavior', () => {
    it('shows the slideover if the "Open" button is clicked', async () => {
      const { bodyWrapper } = await mountAdminPage()
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(true)
    })

    it('hides the slideover if "Close (X)" is clicked', async () => {
      const { bodyWrapper } = await mountAdminPage()
      await bodyWrapper.find(SELECTORS.closeBtn).trigger('click')
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })

    it('resets form fields if the slideover is closed', async () => {
      const { wrapper, bodyWrapper } = await mountAdminPage()

      const imageBuffer = readFileSync(resolve(__dirname, '../../../fixtures/oc1.jpg'))
      const image = new File([imageBuffer], 'oc1.jpg', { type: 'image/jpeg' })

      const fileInput = bodyWrapper.find('input[name="images"]')
      Object.defineProperty(fileInput.element, 'files', {
        value: [image],
        configurable: true,
      })
      await fileInput.trigger('change')
      expect(bodyWrapper.find('[data-slot="files"]').exists()).toBe(true)

      for (const field of TEXT_FIELDS) {
        const input = bodyWrapper.find(`input[name="${field}"]`)
        await input.setValue('Test')
        expect((input.element as HTMLInputElement).value).toBe('Test')
      }

      const selectBtn = bodyWrapper.find(SELECTORS.countrySelect)
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

      await bodyWrapper.find(SELECTORS.closeBtn).trigger('click')
      await wrapper.find(SELECTORS.openBtn).trigger('click')

      expect(bodyWrapper.find('[data-slot="files"]').exists()).toBe(false)

      TEXT_FIELDS.forEach((field) => {
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
      const { bodyWrapper } = await mountAdminPage()

      ALL_FIELDS.forEach((field) => {
        expect(bodyWrapper.find(`input[name="${field}"]`).exists()).toBe(true)
      })

      expect(bodyWrapper.find('textarea[name="details"]').exists()).toBe(true)
    })

    it('renders fields empty on initial open', async () => {
      const { bodyWrapper } = await mountAdminPage()

      ALL_FIELDS.forEach((field) => {
        const input = bodyWrapper.find(`input[name="${field}"]`).element as HTMLInputElement
        expect(input.value).toBe('')
      })

      const detailsTextarea = bodyWrapper.find(`textarea[name="details"]`).element as HTMLInputElement
      expect(detailsTextarea.value).toBe('')
    })
  })

  describe('Form submission, success path', () => {
    beforeEach(() => {
      clientMock.mockResolvedValue({})
    })

    it('posts the form to the places endpoint', async () => {
      const { bodyWrapper } = await mountAdminPage()
      await bodyWrapper.find(SELECTORS.submitBtn).trigger('click')
      await flushPromises()

      expect(clientMock).toHaveBeenCalledWith('/api/v1/places', {
        method: 'POST',
        body: expect.any(FormData),
      })
    })

    it('closes the slideover on successful POST', async () => {
      const { bodyWrapper } = await mountAdminPage()
      await bodyWrapper.find(SELECTORS.submitBtn).trigger('click')
      await flushPromises()

      expect(clientMock).toHaveBeenCalled()
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })

    it('shows a success toast with the correct title and icon on successful POST', async () => {
      const { bodyWrapper } = await mountAdminPage()
      await bodyWrapper.find(SELECTORS.submitBtn).trigger('click')
      await flushPromises()

      expect(toastAddMock).toHaveBeenCalledWith({
        title: 'Place created successfully',
        icon: 'i-lucide-circle-check',
      })
    })

    it('shows a loading state while the POST request is in flight and removes it on finish', async () => {
      let resolveFetch: (value: unknown) => void = () => {}

      clientMock.mockImplementation(() => {
        return new Promise((resolve) => {
          resolveFetch = resolve
        })
      })

      const { bodyWrapper } = await mountAdminPage()
      const submitBtn = bodyWrapper.find(SELECTORS.submitBtn)
      await submitBtn.trigger('click')
      await flushPromises()

      expect(submitBtn.attributes()).toHaveProperty('disabled')

      resolveFetch({})
      await flushPromises()

      expect(submitBtn.attributes('disabled')).toBeUndefined()
    })
  })

  describe('Form submission, error path', () => {
    it('shows the correct validation errors on a 422 response', async () => {
      clientMock.mockRejectedValue({
        data: {
          message: 'The name field is required. (and 4 more errors)',
          errors: {
            name: ['The name field is required.'],
            details: ['The details field is required.'],
            address: ['The address field is required.'],
            country: ['The country field is required.'],
            city: ['The city field is required.'],
          },
        },
        statusCode: 422,
      })

      const { bodyWrapper } = await mountAdminPage()
      await bodyWrapper.find(SELECTORS.submitBtn).trigger('click')

      await flushPromises()

      const fieldNames = ['name', 'details', 'address', 'country', 'city']
      const errors = bodyWrapper.findAll('.text-error')

      fieldNames.forEach((field) => {
        const target = errors.find(e => e.text().includes(`The ${field} field is required.`))
        expect(target?.exists()).toBe(true)
      })
    })

    it('shows an error toast with the correct title, icon, description and color on failed POST', async () => {
      clientMock.mockRejectedValue(new Error('Network Error'))

      const { bodyWrapper } = await mountAdminPage()
      await bodyWrapper.find(SELECTORS.submitBtn).trigger('click')
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
    it('is disabled if an error occured', async () => {
      errorRef.value = new Error('Failed to fetch countries')

      const { bodyWrapper } = await mountAdminPage()
      const selectBtn = bodyWrapper.find(SELECTORS.countrySelect)
      expect(selectBtn.attributes()).toHaveProperty('disabled')
    })

    it('shows a loading state if it\'s still pending', async () => {
      pendingRef.value = true

      const { bodyWrapper } = await mountAdminPage()
      const loaderIcon = bodyWrapper.find('[data-slot="leadingIcon"][class*="loader-circle"]')
      expect(loaderIcon.exists()).toBe(true)
    })

    it('shows the correct error placeholder', async () => {
      errorRef.value = new Error('Failed to fetch countries')

      const { bodyWrapper } = await mountAdminPage()
      const errorPlaceholder = bodyWrapper.find(`button[data-testid="select-country-select"] > span[data-slot="placeholder"]`)
      expect(errorPlaceholder.text()).toBe('Failed to get countries')
    })
  })

  describe('Tags select', () => {
    it('lists the tags from the API', async () => {
      const { bodyWrapper } = await mountAdminPage()
      await bodyWrapper.find(SELECTORS.tagsSelect).trigger('click')

      const options = bodyWrapper.findAll('div[role="option"]').map(option => option.text())
      expect(options).toEqual(['Park', 'Shrine'])
    })
  })

  describe('Integration with Slideover', async () => {
    it('Side value changes based on window width', async () => {
      const { bodyWrapper } = await mountAdminPage()
      expect(bodyWrapper.find('[data-side="right"]').exists()).toBe(true)

      widthRef.value = 767
      await flushPromises()
      expect(bodyWrapper.find('[data-side="bottom"]').exists()).toBe(true)
    })
  })

  describe('Route guard', () => {
    it('sends a guest who opens /admin to the login page', async () => {
      const router = useRouter()
      onTestFinished(async () => {
        await router.replace('/')
      })

      await router.push('/admin')

      expect(router.currentRoute.value.path).toBe('/login')
    })
  })
})
