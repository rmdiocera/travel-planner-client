import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountLoginPage } from '../../utils/mountLoginPage'

const { loginMock, toastAddMock } = vi.hoisted(() => {
  return { loginMock: vi.fn(), toastAddMock: vi.fn() }
})

mockNuxtImport('useSanctumAuth', () => {
  return () => ({
    login: loginMock,
  })
})

mockNuxtImport('useToast', () => {
  return () => ({
    add: toastAddMock,
  })
})

const SELECTORS = {
  email: 'input[data-testid="login-email-input"]',
  password: 'input[data-testid="login-password-input"]',
  toggle: 'button[data-testid="login-toggle-password-btn"]',
  remember: 'button[data-testid="login-remember-checkbox"]',
  submit: 'button[data-testid="login-submit-btn"]',
  alert: '[data-testid="login-alert"]',
  forgotLink: 'a[data-testid="login-forgot-link"]',
  registerLink: 'a[data-testid="login-register-link"]',
}

async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountLoginPage>>['wrapper'],
  email = 'sam@example.com',
  password = 'secret123',
) {
  await wrapper.find(SELECTORS.email).setValue(email)
  await wrapper.find(SELECTORS.password).setValue(password)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Login page', () => {
  beforeEach(() => {
    loginMock.mockReset()
    toastAddMock.mockReset()
  })

  describe('Rendering', () => {
    it('renders the heading, fields and links', async () => {
      const { wrapper } = await mountLoginPage()

      expect(wrapper.find('h1').text()).toBe('Log in to start planning your trips')
      expect(wrapper.find(SELECTORS.email).attributes('type')).toBe('email')
      expect(wrapper.find(SELECTORS.email).attributes('autocomplete')).toBe('email')
      expect(wrapper.find(SELECTORS.password).attributes('type')).toBe('password')
      expect(wrapper.find(SELECTORS.password).attributes('autocomplete')).toBe('current-password')
      expect(wrapper.find(SELECTORS.forgotLink).attributes('href')).toBe('/forgot-password')
      expect(wrapper.find(SELECTORS.registerLink).attributes('href')).toBe('/register')
      expect(wrapper.find(SELECTORS.submit).text()).toBe('Log in')
    })

    it('marks both inputs as required for assistive tech without native validation', async () => {
      const { wrapper } = await mountLoginPage()

      expect(wrapper.find(SELECTORS.email).attributes('aria-required')).toBe('true')
      expect(wrapper.find(SELECTORS.password).attributes('aria-required')).toBe('true')
      expect(wrapper.find('form').attributes('novalidate')).toBeDefined()
    })

    it('leaves Remember me unchecked by default', async () => {
      const { wrapper } = await mountLoginPage()

      expect(wrapper.find(SELECTORS.remember).attributes('aria-checked')).toBe('false')
    })

    it('does not show an alert initially', async () => {
      const { wrapper } = await mountLoginPage()

      expect(wrapper.find(SELECTORS.alert).exists()).toBe(false)
    })
  })

  describe('Show/hide password', () => {
    it('toggles the password input type and button state', async () => {
      const { wrapper } = await mountLoginPage()
      const toggle = wrapper.find(SELECTORS.toggle)

      expect(toggle.attributes('aria-label')).toBe('Show password')
      expect(toggle.attributes('aria-pressed')).toBe('false')

      await toggle.trigger('click')
      expect(wrapper.find(SELECTORS.password).attributes('type')).toBe('text')
      expect(wrapper.find(SELECTORS.toggle).attributes('aria-label')).toBe('Hide password')
      expect(wrapper.find(SELECTORS.toggle).attributes('aria-pressed')).toBe('true')

      await wrapper.find(SELECTORS.toggle).trigger('click')
      expect(wrapper.find(SELECTORS.password).attributes('type')).toBe('password')
    })
  })

  describe('Client validation', () => {
    it('shows both messages and does not call login when empty', async () => {
      const { wrapper } = await mountLoginPage()

      await wrapper.find('form').trigger('submit')
      await flushPromises()

      expect(wrapper.text()).toContain('Enter your email')
      expect(wrapper.text()).toContain('Enter your password')
      expect(loginMock).not.toHaveBeenCalled()
    })

    it('rejects a malformed email', async () => {
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper, 'sam@')

      expect(wrapper.text()).toContain('Enter a valid email address')
      expect(loginMock).not.toHaveBeenCalled()
    })

    it('shows no message when focus leaves an untouched field', async () => {
      const { wrapper } = await mountLoginPage()

      await wrapper.find(SELECTORS.email).trigger('blur')
      await flushPromises()

      expect(wrapper.text()).not.toContain('Enter your email')
    })

    it('checks a field once its value has changed', async () => {
      const { wrapper } = await mountLoginPage()

      await wrapper.find(SELECTORS.email).setValue('sam@')
      await flushPromises()

      expect(wrapper.text()).toContain('Enter a valid email address')
    })
  })

  describe('Form submission', () => {
    it('calls login with email, password and remember', async () => {
      loginMock.mockResolvedValue(undefined)
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)

      expect(loginMock).toHaveBeenCalledWith({
        email: 'sam@example.com',
        password: 'secret123',
        remember: false,
      })
    })

    it('sends remember: true when the checkbox is ticked', async () => {
      loginMock.mockResolvedValue(undefined)
      const { wrapper } = await mountLoginPage()

      await wrapper.find(SELECTORS.remember).trigger('click')
      await fillAndSubmit(wrapper)

      expect(loginMock).toHaveBeenCalledWith(
        expect.objectContaining({ remember: true }),
      )
    })

    it('shows a loading button while the request is pending', async () => {
      let resolveLogin!: () => void
      loginMock.mockReturnValue(new Promise<void>((resolve) => {
        resolveLogin = resolve
      }))
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)
      expect(wrapper.find(SELECTORS.submit).attributes('disabled')).toBeDefined()

      resolveLogin()
      await flushPromises()
      expect(wrapper.find(SELECTORS.submit).attributes('disabled')).toBeUndefined()
    })

    it('does not show a success toast', async () => {
      loginMock.mockResolvedValue(undefined)
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)

      expect(toastAddMock).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('shows the credentials alert on 422, keeps the email and clears the password', async () => {
      loginMock.mockRejectedValue({
        response: { status: 422 },
        data: { message: 'These credentials do not match our records.', errors: { email: ['These credentials do not match our records.'] } },
      })
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)

      const alert = wrapper.find(SELECTORS.alert)
      expect(alert.text()).toContain('Incorrect email or password.')
      expect(alert.attributes('role')).toBe('alert')
      expect((wrapper.find(SELECTORS.email).element as HTMLInputElement).value).toBe('sam@example.com')
      expect((wrapper.find(SELECTORS.password).element as HTMLInputElement).value).toBe('')
      expect(toastAddMock).not.toHaveBeenCalled()
    })

    it('focuses the password field on 422', async () => {
      loginMock.mockRejectedValue({ response: { status: 422 } })
      const { wrapper } = await mountLoginPage()
      // UInput autofocuses Email from a timer; wait for it, or it can take focus back after the 422.
      await vi.waitFor(() => expect(document.activeElement).toBe(wrapper.find(SELECTORS.email).element))

      await fillAndSubmit(wrapper)

      expect(document.activeElement).toBe(wrapper.find(SELECTORS.password).element)
    })

    it('clears the alert on the next submit', async () => {
      loginMock.mockRejectedValueOnce({ response: { status: 422 } })
      loginMock.mockResolvedValueOnce(undefined)
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)
      expect(wrapper.find(SELECTORS.alert).exists()).toBe(true)

      await fillAndSubmit(wrapper)
      expect(wrapper.find(SELECTORS.alert).exists()).toBe(false)
    })

    it('shows the server message on 429', async () => {
      loginMock.mockRejectedValue({
        response: { status: 429 },
        data: { errors: { email: ['Too many login attempts. Please try again in 42 seconds.'] } },
      })
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)

      expect(wrapper.find(SELECTORS.alert).text()).toContain('Too many login attempts. Please try again in 42 seconds.')
    })

    it('falls back to a generic message on 429 without a server message', async () => {
      loginMock.mockRejectedValue({ response: { status: 429 } })
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)

      expect(wrapper.find(SELECTORS.alert).text()).toContain('Too many attempts. Try again in a moment.')
    })

    it('shows a generic alert on a 500, keeping the password and not showing a toast', async () => {
      loginMock.mockRejectedValue({ response: { status: 500 } })
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)

      const alert = wrapper.find(SELECTORS.alert)
      expect(alert.text()).toContain('Something went wrong. Try again in a moment.')
      expect(alert.text()).not.toContain('Incorrect email or password.')
      expect((wrapper.find(SELECTORS.password).element as HTMLInputElement).value).toBe('secret123')
      expect(toastAddMock).not.toHaveBeenCalled()
    })

    it('shows the generic alert when the request gets no response', async () => {
      loginMock.mockRejectedValue(new TypeError('fetch failed'))
      const { wrapper } = await mountLoginPage()

      await fillAndSubmit(wrapper)

      expect(wrapper.find(SELECTORS.alert).text()).toContain('Something went wrong. Try again in a moment.')
      expect((wrapper.find(SELECTORS.password).element as HTMLInputElement).value).toBe('secret123')
    })
  })
})
