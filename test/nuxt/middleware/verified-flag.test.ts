import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import middleware from '@/middleware/verified-flag.global'

const { navigateToMock, showToastMock } = vi.hoisted(() => ({ navigateToMock: vi.fn(), showToastMock: vi.fn() }))
const userRef = ref<{ email_verified_at: string | null } | null>(null)
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useAppToast', () => () => ({ showToast: showToastMock }))
mockNuxtImport('useSanctumUser', () => () => userRef)

const VERIFIED = ['Your email is verified.', 'i-lucide-circle-check']
const INVALID = ['This verification link is invalid or has expired.', 'i-lucide-circle-x']
const VERIFIED_AT = '2026-11-03T00:00:00Z'
const run = (path: string, query: Record<string, unknown>) => middleware({ path, query } as any, {} as any)

describe('Verified flag handler', () => {
  // Mocking useNuxtApp itself would break Nuxt's own start-up, so the real app is used:
  // its isHydrating flag is set per test and hookOnce is spied on.
  let nuxtApp: ReturnType<typeof useNuxtApp>
  let wasHydrating: boolean | undefined
  let hookOnceSpy: MockInstance

  beforeEach(() => {
    navigateToMock.mockReset()
    showToastMock.mockReset()
    userRef.value = null
    nuxtApp = useNuxtApp()
    wasHydrating = nuxtApp.isHydrating
    nuxtApp.isHydrating = false
    hookOnceSpy = vi.spyOn(nuxtApp.hooks, 'hookOnce').mockImplementation(() => () => {})
  })

  afterEach(() => {
    nuxtApp.isHydrating = wasHydrating
    hookOnceSpy.mockRestore()
  })

  describe('?verified=1', () => {
    it('verified user: success toast and param removed', () => {
      userRef.value = { email_verified_at: VERIFIED_AT }
      run('/', { verified: '1' })
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith(...VERIFIED, undefined)
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: {} }, { replace: true })
    })

    it('logged out: adds the log in hint', () => {
      run('/', { verified: '1' })
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith(...VERIFIED, 'Log in to continue.')
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: {} }, { replace: true })
    })

    it('other unverified account: no toast, param still removed', () => {
      userRef.value = { email_verified_at: null }
      run('/', { verified: '1' })
      expect(showToastMock).not.toHaveBeenCalled()
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: {} }, { replace: true })
    })
  })

  describe('?verified=0', () => {
    it('unverified user: error toast with the resend hint', () => {
      userRef.value = { email_verified_at: null }
      run('/', { verified: '0' })
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith(...INVALID, 'Press Resend email to get a new one.', 'error')
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: {} }, { replace: true })
    })

    it('logged out: error toast with the log in hint', () => {
      run('/', { verified: '0' })
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith(...INVALID, 'Log in to request a new one.', 'error')
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: {} }, { replace: true })
    })

    it('already verified: error toast without a hint', () => {
      userRef.value = { email_verified_at: VERIFIED_AT }
      run('/', { verified: '0' })
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith(...INVALID, undefined, 'error')
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: {} }, { replace: true })
    })
  })

  describe('Query handling', () => {
    it('keeps other query params', () => {
      userRef.value = { email_verified_at: VERIFIED_AT }
      run('/', { verified: '1', foo: 'bar' })
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: { foo: 'bar' } }, { replace: true })
    })

    it.each([['abc'], [''], [['1', '0']]])('ignores ?verified=%j', (value) => {
      run('/', { verified: value })
      expect(showToastMock).not.toHaveBeenCalled()
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('does nothing without the param', () => {
      run('/', {})
      expect(showToastMock).not.toHaveBeenCalled()
      expect(navigateToMock).not.toHaveBeenCalled()
    })
  })

  describe('During hydration', () => {
    beforeEach(() => {
      nuxtApp.isHydrating = true
    })

    it('cleans the URL at once but shows the toast only after hydration has finished', () => {
      userRef.value = { email_verified_at: VERIFIED_AT }
      run('/', { verified: '1' })
      expect(showToastMock).not.toHaveBeenCalled()
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: {} }, { replace: true })
      expect(hookOnceSpy).toHaveBeenCalledExactlyOnceWith('app:suspense:resolve', expect.any(Function))
      ;(hookOnceSpy.mock.calls[0]![1] as () => void)()
      expect(showToastMock).toHaveBeenCalledExactlyOnceWith(...VERIFIED, undefined)
    })

    it('queues nothing for a value it ignores', () => {
      run('/', { verified: 'abc' })
      expect(hookOnceSpy).not.toHaveBeenCalled()
      expect(showToastMock).not.toHaveBeenCalled()
    })
  })
})
