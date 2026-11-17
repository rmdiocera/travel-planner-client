import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountRegisterPage } from '../../utils/mountRegisterPage'

const { clientMock, refreshIdentityMock, navigateToMock, toastAddMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  refreshIdentityMock: vi.fn(),
  navigateToMock: vi.fn(),
  toastAddMock: vi.fn(),
}))

mockNuxtImport('useSanctumClient', () => () => clientMock)
mockNuxtImport('useSanctumAuth', () => () => ({ refreshIdentity: refreshIdentityMock }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const S = {
  first: 'input[data-testid="register-first-name-input"]',
  last: 'input[data-testid="register-last-name-input"]',
  email: 'input[data-testid="register-email-input"]',
  password: 'input[data-testid="register-password-input"]',
  confirm: 'input[data-testid="register-confirm-password-input"]',
  togglePassword: 'button[data-testid="register-toggle-password-btn"]',
  toggleConfirm: 'button[data-testid="register-toggle-confirm-password-btn"]',
  submit: 'button[data-testid="register-submit-btn"]',
  alert: '[data-testid="register-alert"]',
  loginLink: 'a[data-testid="register-login-link"]',
}

const VALID = { first: 'Sam', last: 'Rivera', email: 'sam@example.com', password: 'secret123', confirm: 'secret123' }

async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountRegisterPage>>['wrapper'],
  overrides: Partial<typeof VALID> = {},
) {
  const values = { ...VALID, ...overrides }
  await wrapper.find(S.first).setValue(values.first)
  await wrapper.find(S.last).setValue(values.last)
  await wrapper.find(S.email).setValue(values.email)
  await wrapper.find(S.password).setValue(values.password)
  await wrapper.find(S.confirm).setValue(values.confirm)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe('Register page', () => {
  beforeEach(() => {
    for (const mock of [clientMock, refreshIdentityMock, navigateToMock, toastAddMock]) {
      mock.mockReset()
    }
  })

  describe('Rendering', () => {
    it('renders the heading, labelled fields and links', async () => {
      const { wrapper } = await mountRegisterPage()
      expect(wrapper.find('h1').text()).toBe('Create an account to start planning your trips')
      for (const label of ['First name', 'Last name (optional)', 'Email', 'Password', 'Confirm password']) {
        expect(wrapper.text()).toContain(label)
      }
      expect(wrapper.find(S.first).attributes('autocomplete')).toBe('given-name')
      expect(wrapper.find(S.last).attributes('autocomplete')).toBe('family-name')
      expect(wrapper.find(S.email).attributes('autocomplete')).toBe('email')
      expect(wrapper.find(S.password).attributes('autocomplete')).toBe('new-password')
      expect(wrapper.find(S.confirm).attributes('autocomplete')).toBe('new-password')
      expect(wrapper.find(S.submit).text()).toBe('Create account')
      expect(wrapper.find(S.loginLink).attributes('href')).toBe('/login')
      expect(wrapper.text()).toContain('Already have an account?')
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('marks first name, email, password and confirmation as required without native validation', async () => {
      const { wrapper } = await mountRegisterPage()
      for (const input of [S.first, S.email, S.password, S.confirm]) {
        expect(wrapper.find(input).attributes('aria-required')).toBe('true')
      }
      expect(wrapper.find('form').attributes('novalidate')).toBeDefined()
    })

    it('toggles each password field independently', async () => {
      const { wrapper } = await mountRegisterPage()
      await wrapper.find(S.togglePassword).trigger('click')
      expect(wrapper.find(S.password).attributes('type')).toBe('text')
      expect(wrapper.find(S.confirm).attributes('type')).toBe('password')
      await wrapper.find(S.toggleConfirm).trigger('click')
      expect(wrapper.find(S.confirm).attributes('type')).toBe('text')
      expect(wrapper.find(S.password).attributes('type')).toBe('text')
      await wrapper.find(S.togglePassword).trigger('click')
      expect(wrapper.find(S.password).attributes('type')).toBe('password')
      expect(wrapper.find(S.confirm).attributes('type')).toBe('text')
    })
  })

  describe('Client validation', () => {
    it('shows every message and does not call the API when empty', async () => {
      const { wrapper } = await mountRegisterPage()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      for (const message of ['Enter your first name', 'Enter your email', 'Enter a password']) {
        expect(wrapper.text()).toContain(message)
      }
      expect(clientMock).not.toHaveBeenCalled()
    })

    it('rejects a malformed email', async () => {
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper, { email: 'sam@' })
      expect(wrapper.text()).toContain('Enter a valid email address')
      expect(clientMock).not.toHaveBeenCalled()
    })

    it('rejects a confirmation that differs', async () => {
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper, { confirm: 'different1' })
      expect(wrapper.text()).toContain('Passwords do not match')
      expect(clientMock).not.toHaveBeenCalled()
    })

    it('rejects a first name of only spaces', async () => {
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper, { first: '   ' })
      expect(wrapper.text()).toContain('Enter your first name')
      expect(clientMock).not.toHaveBeenCalled()
    })

    it('shows no message when focus leaves an untouched field', async () => {
      const { wrapper } = await mountRegisterPage()
      await wrapper.find(S.first).trigger('blur')
      await flushPromises()
      expect(wrapper.text()).not.toContain('Enter your first name')
    })

    it('checks a field once its value has changed', async () => {
      const { wrapper } = await mountRegisterPage()
      await wrapper.find(S.email).setValue('sam@')
      await flushPromises()
      expect(wrapper.text()).toContain('Enter a valid email address')
    })

    it('re-checks the confirmation when the password changes', async () => {
      const { wrapper } = await mountRegisterPage()
      await wrapper.find(S.password).setValue('secret12')
      await wrapper.find(S.confirm).setValue('secret123')
      await flushPromises()
      expect(wrapper.text()).toContain('Passwords do not match')
      await wrapper.find(S.password).setValue('secret123')
      await flushPromises()
      expect(wrapper.text()).not.toContain('Passwords do not match')
      await wrapper.find(S.password).setValue('secret1234')
      await flushPromises()
      expect(wrapper.text()).toContain('Passwords do not match')
    })

    it('leaves an empty confirmation alone while the password is typed', async () => {
      const { wrapper } = await mountRegisterPage()
      await wrapper.find(S.password).setValue('secret123')
      await flushPromises()
      expect(wrapper.text()).not.toContain('Passwords do not match')
    })

    // Nuxt UI reports typing to the form 300 ms after it happens, so typing at the very end of one test is reported
    // during the next one. test/nuxt/setup.ts gives each test its own form id, so that report finds no form.
    describe('Typing reported after its test has ended', () => {
      it('types into First name as the test ends', async () => {
        const { wrapper } = await mountRegisterPage()
        await wrapper.find(S.first).setValue('   ')
      })

      it('does not reach the next test\'s form', async () => {
        const { wrapper } = await mountRegisterPage()
        await wrapper.find(S.first).trigger('blur')
        await new Promise(resolve => setTimeout(resolve, 400))
        await flushPromises()
        expect(wrapper.text()).not.toContain('Enter your first name')
      })
    })
  })

  describe('Form submission', () => {
    it('posts the trimmed fields, sending the password exactly as typed', async () => {
      clientMock.mockResolvedValue(undefined)
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper, {
        first: '  Sam  ',
        last: ' Rivera ',
        email: ' sam@example.com ',
        password: ' secret 123 ',
        confirm: ' secret 123 ',
      })
      expect(clientMock).toHaveBeenCalledWith('/register', {
        method: 'POST',
        body: {
          first_name: 'Sam',
          last_name: 'Rivera',
          email: 'sam@example.com',
          password: ' secret 123 ',
          password_confirmation: ' secret 123 ',
        },
      })
    })

    it('omits last_name when blank', async () => {
      clientMock.mockResolvedValue(undefined)
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper, { last: '' })
      expect(clientMock.mock.calls[0][1].body).not.toHaveProperty('last_name')
    })

    it('refreshes the identity, then goes to /verify-email', async () => {
      clientMock.mockResolvedValue(undefined)
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper)
      expect(navigateToMock).toHaveBeenCalledWith('/verify-email')
      expect(refreshIdentityMock.mock.invocationCallOrder[0]!).toBeLessThan(navigateToMock.mock.invocationCallOrder[0]!)
    })

    it('reloads /verify-email in full, without an alert, when refreshing the identity fails', async () => {
      clientMock.mockResolvedValue(undefined)
      refreshIdentityMock.mockRejectedValue(new Error('boom'))
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper)
      // A client-side navigation would meet the redirect rule with no user and land on /login;
      // a full page load lets the server read the new session.
      expect(navigateToMock).toHaveBeenCalledWith('/verify-email', { external: true })
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('shows a loading button and ignores a second submit while pending', async () => {
      clientMock.mockReturnValue(new Promise(() => {}))
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper)
      expect(wrapper.find(S.submit).attributes('disabled')).toBeDefined()
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(clientMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Error handling', () => {
    it('maps a 422 onto the fields and shows no top alert', async () => {
      clientMock.mockRejectedValue({
        response: { status: 422 },
        data: { message: 'x', errors: { email: ['The email has already been taken.'] } },
      })
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper)
      expect(wrapper.text()).toContain('The email has already been taken.')
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('shows a 422 error for a field the form does not have in the top alert', async () => {
      clientMock.mockRejectedValue({
        response: { status: 422 },
        data: { message: 'x', errors: { terms: ['The terms field must be accepted.'] } },
      })
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper)
      expect(wrapper.find(S.alert).text()).toContain('The terms field must be accepted.')
      expect(wrapper.find(S.alert).attributes('role')).toBe('alert')
    })

    it.each([
      ['a 429', { response: { status: 429 } }, 'Too many attempts. Try again in a moment.'],
      ['a 422 without errors', { response: { status: 422 }, data: {} }, 'Something went wrong. Try again in a moment.'],
      ['a 500', { response: { status: 500 } }, 'Something went wrong. Try again in a moment.'],
      ['no response', new TypeError('fetch failed'), 'Something went wrong. Try again in a moment.'],
    ])('%s shows the top alert, keeps the fields and shows no toast', async (_name, error, message) => {
      clientMock.mockRejectedValue(error)
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper)
      expect(wrapper.find(S.alert).text()).toContain(message)
      expect(wrapper.find(S.alert).attributes('role')).toBe('alert')
      expect((wrapper.find(S.password).element as HTMLInputElement).value).toBe('secret123')
      expect(toastAddMock).not.toHaveBeenCalled()
    })

    it('clears the alert on the next submit', async () => {
      clientMock.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce(undefined)
      const { wrapper } = await mountRegisterPage()
      await fillAndSubmit(wrapper)
      expect(wrapper.find(S.alert).exists()).toBe(true)
      await fillAndSubmit(wrapper)
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })
  })
})
