import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountVerifyEmailPage } from '../../utils/mountVerifyEmailPage'
import verificationRule from '@/middleware/verification.global'

const { rawMock, refreshIdentityMock, logoutMock, navigateToMock, showToastMock } = vi.hoisted(() => ({
  rawMock: vi.fn(),
  refreshIdentityMock: vi.fn(),
  logoutMock: vi.fn(),
  navigateToMock: vi.fn(),
  showToastMock: vi.fn(),
}))
const userRef = ref<Record<string, unknown>>({})
mockNuxtImport('useSanctumClient', () => () => ({ raw: rawMock }))
mockNuxtImport('useSanctumAuth', () => () => ({ refreshIdentity: refreshIdentityMock, logout: logoutMock }))
mockNuxtImport('useSanctumUser', () => () => userRef)
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useAppToast', () => () => ({ showToast: showToastMock }))

const focusRef = ref(true)
vi.mock(import('@vueuse/core'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useWindowFocus: () => focusRef,
  }
})

const KEY = 'dayfarer:resend-cooldown:u1'
const S = {
  btn: '[data-testid="verify-resend-btn"]',
  alert: '[data-testid="verify-alert"]',
  cooldown: '[data-testid="verify-cooldown-text"]',
  announce: '[data-testid="verify-resend-announcement"]',
}
const respond = (status: number, headers: Record<string, string> = {}) => ({ status, headers: new Headers(headers) })

async function click(wrapper: Awaited<ReturnType<typeof mountVerifyEmailPage>>['wrapper']) {
  await wrapper.find(S.btn).trigger('click')
  await flushPromises()
}

async function focusAgain() {
  focusRef.value = false
  await nextTick()
  focusRef.value = true
  await flushPromises()
}

describe('Verify-email page', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    localStorage.clear()
    focusRef.value = true
    for (const mock of [rawMock, refreshIdentityMock, logoutMock, navigateToMock, showToastMock]) {
      mock.mockReset()
    }
    userRef.value = { id: 'u1', email: 'sam@example.com', email_verified_at: null }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('shows the heading, the email and an enabled Resend button', async () => {
      const { wrapper } = await mountVerifyEmailPage()
      await flushPromises()
      expect(wrapper.find('h1').text()).toBe('Check your email')
      expect(wrapper.text()).toContain('We sent a verification link to sam@example.com. Click it to verify your account.')
      expect(wrapper.find(S.btn).text()).toBe('Resend email')
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBeUndefined()
      expect(wrapper.find(S.cooldown).exists()).toBe(false)
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('continues a stored cooldown after a refresh', async () => {
      localStorage.setItem(KEY, String(Date.now() + 200_000))
      const { wrapper } = await mountVerifyEmailPage()
      await flushPromises()
      expect(wrapper.find(S.btn).text()).toBe('Resend email')
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBe('true')
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 3:20')
    })
  })

  describe('Resend outcomes', () => {
    it('202: success message, read out, then a disabled button with the countdown under it', async () => {
      rawMock.mockResolvedValue(respond(202))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(rawMock).toHaveBeenCalledWith('/email/verification-notification', { method: 'POST', ignoreResponseError: true })
      expect(wrapper.find(S.alert).text()).toContain('Verification email sent. Check your inbox.')
      // The status region beside the button reads it out. The alert isn't a live region too, or it would be read twice.
      expect(wrapper.find(S.announce).text()).toBe('Verification email sent. Check your inbox.')
      expect(wrapper.find(S.alert).attributes('role')).toBeUndefined()
      expect(wrapper.find(S.btn).text()).toBe('Resend email')
      // aria-disabled rather than disabled, so the button can keep keyboard focus.
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBe('true')
      expect(wrapper.find(S.btn).attributes('disabled')).toBeUndefined()
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 5:00')
      await vi.advanceTimersByTimeAsync(1000)
      await flushPromises()
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 4:59')
    })

    it('at 0:00 the countdown text goes, the button is usable, the success alert clears and "You can resend now." is announced', async () => {
      rawMock.mockResolvedValue(respond(202))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(wrapper.find(S.announce).text()).toBe('Verification email sent. Check your inbox.')
      expect(wrapper.find(S.cooldown).attributes('aria-live')).toBeUndefined()
      expect(wrapper.find(S.cooldown).attributes('role')).toBeUndefined()
      await vi.advanceTimersByTimeAsync(300_000)
      await flushPromises()
      expect(wrapper.find(S.cooldown).exists()).toBe(false)
      expect(wrapper.find(S.btn).text()).toBe('Resend email')
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBeUndefined()
      expect(wrapper.find(S.alert).exists()).toBe(false)
      expect(wrapper.find(S.announce).text()).toBe('You can resend now.')
    })

    it('429: counts down from Retry-After and shows the info alert', async () => {
      rawMock.mockResolvedValue(respond(429, { 'Retry-After': '120' }))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 2:00')
      expect(wrapper.find(S.alert).text()).toContain('A verification email was sent recently. Try again later.')
      expect(wrapper.find(S.announce).text()).toBe('A verification email was sent recently. Try again later.')
      expect(wrapper.find(S.alert).attributes('role')).toBeUndefined()
    })

    it('429 without a readable Retry-After falls back to 5:00', async () => {
      rawMock.mockResolvedValue(respond(429))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 5:00')
    })

    it('429 with Retry-After 0 means try now: a one-second wait, not the 5:00 fallback', async () => {
      rawMock.mockResolvedValue(respond(429, { 'Retry-After': '0' }))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 0:01')
      await vi.advanceTimersByTimeAsync(1000)
      await flushPromises()
      expect(wrapper.find(S.cooldown).exists()).toBe(false)
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBeUndefined()
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('clears the "sent recently" alert when that countdown ends', async () => {
      rawMock.mockResolvedValue(respond(429, { 'Retry-After': '2' }))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(wrapper.find(S.alert).exists()).toBe(true)
      await vi.advanceTimersByTimeAsync(2000)
      await flushPromises()
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it.each([500, 503])('%i: says the email could not be sent and counts down from 5:00, as the server does', async (status) => {
      rawMock.mockResolvedValue(respond(status))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(wrapper.find(S.alert).text()).toContain('We couldn\'t send the verification email. Try again when the countdown ends.')
      // role="alert" is read out as soon as it appears, so the status region stays out of it.
      expect(wrapper.find(S.alert).attributes('role')).toBe('alert')
      expect(wrapper.find(S.announce).text()).toBe('')
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBe('true')
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 5:00')
    })

    it('clears the "could not send" alert when that countdown ends', async () => {
      rawMock.mockResolvedValue(respond(500))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      await vi.advanceTimersByTimeAsync(300_000)
      await flushPromises()
      expect(wrapper.find(S.alert).exists()).toBe(false)
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBeUndefined()
    })

    it('keeps an error alert when a countdown started in another tab ends', async () => {
      rawMock.mockRejectedValue(new TypeError('fetch failed'))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      const endsAt = String(Date.now() + 2000)
      localStorage.setItem(KEY, endsAt)
      window.dispatchEvent(new StorageEvent('storage', { key: KEY, newValue: endsAt, storageArea: localStorage }))
      await flushPromises()
      expect(wrapper.find(S.cooldown).text()).toBe('Try again in 0:02')
      await vi.advanceTimersByTimeAsync(2000)
      await flushPromises()
      expect(wrapper.find(S.alert).text()).toContain('Something went wrong. Try again in a moment.')
    })

    it('204: refreshes the identity, shows the verified toast and goes to /', async () => {
      rawMock.mockResolvedValue(respond(204))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(refreshIdentityMock).toHaveBeenCalled()
      expect(showToastMock).toHaveBeenCalledWith('Your email is verified.', 'i-lucide-circle-check', undefined)
      expect(navigateToMock).toHaveBeenCalledWith('/')
    })

    it('204 when the identity can\'t be refreshed: loads the verified landing in full, with no alert', async () => {
      rawMock.mockResolvedValue(respond(204))
      refreshIdentityMock.mockRejectedValue(new TypeError('fetch failed'))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(navigateToMock).toHaveBeenCalledExactlyOnceWith('/?verified=1', { external: true })
      expect(showToastMock).not.toHaveBeenCalled()
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('401: session-expired toast, the session is cleared and /login is reachable, no alert', async () => {
      rawMock.mockResolvedValue(respond(401))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(showToastMock).toHaveBeenCalledWith('Your session has expired.', 'i-lucide-circle-x', 'Log in to continue.', 'error')
      expect(navigateToMock).toHaveBeenCalledWith('/login')
      expect(wrapper.find(S.alert).exists()).toBe(false)
      // The request skips the module's own 401 handling, so the page must clear the user itself;
      // otherwise the redirect rule sends /login straight back to /verify-email.
      expect(userRef.value).toBeNull()
      navigateToMock.mockClear()
      verificationRule({ path: '/login', query: {} } as any, {} as any)
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it.each([
      ['a 419', () => rawMock.mockResolvedValue(respond(419))],
      ['no response at all', () => rawMock.mockRejectedValue(new TypeError('fetch failed'))],
    ])('%s: generic alert and the button stays usable', async (_name, arrange) => {
      arrange()
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(wrapper.find(S.alert).text()).toContain('Something went wrong. Try again in a moment.')
      expect(wrapper.find(S.alert).attributes('role')).toBe('alert')
      expect(wrapper.find(S.btn).attributes('aria-disabled')).toBeUndefined()
    })

    it('ignores a second click while the request is pending', async () => {
      rawMock.mockReturnValue(new Promise(() => {}))
      const { wrapper } = await mountVerifyEmailPage()
      const button = wrapper.find(S.btn)
      // Both clicks land before the next render disables the button, as a quick double click can in a browser.
      await Promise.all([button.trigger('click'), button.trigger('click')])
      await flushPromises()
      expect(rawMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Keyboard focus', () => {
    // Holds the Resend request until the returned function answers it.
    function holdRequest() {
      let answer: (response: ReturnType<typeof respond>) => void = () => {}
      rawMock.mockReturnValue(new Promise((resolve) => {
        answer = resolve
      }))
      return (response: ReturnType<typeof respond>) => answer(response)
    }

    it('gives focus back to Resend once the result is in', async () => {
      const answer = holdRequest()
      const { wrapper } = await mountVerifyEmailPage()
      const button = wrapper.find(S.btn).element as HTMLButtonElement
      button.focus()
      await click(wrapper)
      // While loading, the button is disabled, and a browser moves focus off a disabled button to the page itself.
      // happy-dom leaves it there, so the test moves it.
      document.body.focus()
      answer(respond(202))
      await flushPromises()
      expect(document.activeElement).toBe(button)
    })

    it('leaves focus where the user moved it while the request ran', async () => {
      const answer = holdRequest()
      const { wrapper } = await mountVerifyEmailPage()
      const button = wrapper.find(S.btn).element as HTMLButtonElement
      button.focus()
      await click(wrapper)
      const logout = wrapper.find('[data-testid="verify-logout-btn"]').element as HTMLButtonElement
      logout.focus()
      answer(respond(202))
      await flushPromises()
      expect(document.activeElement).toBe(logout)
    })

    it('doesn\'t move focus to Resend when it didn\'t have it', async () => {
      rawMock.mockResolvedValue(respond(202))
      const { wrapper } = await mountVerifyEmailPage()
      await click(wrapper)
      expect(document.activeElement).not.toBe(wrapper.find(S.btn).element)
    })
  })

  describe('Tab focus check', () => {
    // Holds every refreshIdentity call until finish() runs, then reports the user as verified.
    function verifyOnFinish() {
      let finish = () => {}
      const finished = new Promise<void>((resolve) => {
        finish = resolve
      })
      refreshIdentityMock.mockImplementation(async () => {
        await finished
        userRef.value = { ...userRef.value, email_verified_at: '2026-11-03T00:00:00Z' }
      })
      return finish
    }

    it('shows the verified toast once when a second check starts before the first has finished', async () => {
      const finish = verifyOnFinish()
      await mountVerifyEmailPage()
      await focusAgain()
      await focusAgain()
      finish()
      await flushPromises()
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith('Your email is verified.', 'i-lucide-circle-check', undefined)
      expect(navigateToMock).toHaveBeenCalledExactlyOnceWith('/')
    })

    it('shows the verified toast once when Resend gets a 204 while a check is running', async () => {
      const finish = verifyOnFinish()
      rawMock.mockResolvedValue(respond(204))
      const { wrapper } = await mountVerifyEmailPage()
      await focusAgain()
      await click(wrapper)
      finish()
      await flushPromises()
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith('Your email is verified.', 'i-lucide-circle-check', undefined)
      expect(navigateToMock).toHaveBeenCalledExactlyOnceWith('/')
    })

    it('verified elsewhere: regaining focus shows the toast and goes to /', async () => {
      refreshIdentityMock.mockImplementation(async () => {
        userRef.value = { ...userRef.value, email_verified_at: '2026-11-03T00:00:00Z' }
      })
      await mountVerifyEmailPage()
      await focusAgain()
      expect(showToastMock).toHaveBeenCalledWith('Your email is verified.', 'i-lucide-circle-check', undefined)
      expect(navigateToMock).toHaveBeenCalledWith('/')
    })

    it('still unverified: stays and stays silent', async () => {
      refreshIdentityMock.mockResolvedValue(undefined)
      const { wrapper } = await mountVerifyEmailPage()
      await focusAgain()
      expect(refreshIdentityMock).toHaveBeenCalledTimes(1)
      expect(navigateToMock).not.toHaveBeenCalled()
      expect(showToastMock).not.toHaveBeenCalled()
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('a 401 during the check goes to /login', async () => {
      refreshIdentityMock.mockRejectedValue({ response: { status: 401 } })
      await mountVerifyEmailPage()
      await focusAgain()
      expect(navigateToMock).toHaveBeenCalledWith('/login')
    })

    it('other failures stay silent', async () => {
      refreshIdentityMock.mockRejectedValue(new TypeError('fetch failed'))
      const { wrapper } = await mountVerifyEmailPage()
      await focusAgain()
      expect(refreshIdentityMock).toHaveBeenCalledTimes(1)
      expect(navigateToMock).not.toHaveBeenCalled()
      expect(showToastMock).not.toHaveBeenCalled()
      expect(wrapper.find(S.alert).exists()).toBe(false)
    })

    it('checks when focus returns but not when it is lost', async () => {
      await mountVerifyEmailPage()
      focusRef.value = false
      await flushPromises()
      expect(refreshIdentityMock).not.toHaveBeenCalled()
      focusRef.value = true
      await flushPromises()
      expect(refreshIdentityMock).toHaveBeenCalledTimes(1)
    })
  })

  describe('Log out', () => {
    it('calls the standard logout', async () => {
      const { wrapper } = await mountVerifyEmailPage()
      const link = wrapper.find('[data-testid="verify-logout-btn"]')
      expect(link.text()).toBe('Log out')
      await link.trigger('click')
      expect(logoutMock).toHaveBeenCalledTimes(1)
    })

    it('goes to /login with the session cleared when the session is already gone (401)', async () => {
      logoutMock.mockRejectedValue({ response: { status: 401 } })
      const { wrapper } = await mountVerifyEmailPage()
      await wrapper.find('[data-testid="verify-logout-btn"]').trigger('click')
      await flushPromises()
      expect(userRef.value).toBeNull()
      expect(navigateToMock).toHaveBeenCalledWith('/login')
    })

    it('keeps the user here and shows the generic alert when logging out fails for another reason', async () => {
      logoutMock.mockRejectedValue(new TypeError('fetch failed'))
      const { wrapper } = await mountVerifyEmailPage()
      await wrapper.find('[data-testid="verify-logout-btn"]').trigger('click')
      await flushPromises()
      expect(wrapper.find(S.alert).text()).toContain('Something went wrong. Try again in a moment.')
      expect(userRef.value).not.toBeNull()
      expect(navigateToMock).not.toHaveBeenCalled()
    })
  })
})
