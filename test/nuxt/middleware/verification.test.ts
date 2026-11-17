import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import middleware from '@/middleware/verification.global'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
const userRef = ref<{ email_verified_at: string | null } | null>(null)
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useSanctumUser', () => () => userRef)

const VERIFIED_AT = '2026-11-03T00:00:00Z'
const run = (path: string, query: Record<string, string> = {}) => middleware({ path, query } as any, {} as any)

describe('Verification redirect rule', () => {
  beforeEach(() => {
    navigateToMock.mockReset()
    userRef.value = null
  })

  describe('Logged-out visitor', () => {
    it('leaves a logged-out visitor alone on other pages', () => {
      expect(run('/')).toBeUndefined()
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('sends a logged-out visitor on /verify-email to /login', () => {
      run('/verify-email')
      expect(navigateToMock).toHaveBeenCalledWith('/login')
    })
  })

  describe('Unverified user', () => {
    beforeEach(() => {
      userRef.value = { email_verified_at: null }
    })

    it('lets an unverified user stay on /verify-email', () => {
      run('/verify-email')
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it.each(['/', '/login', '/register', '/admin'])('sends an unverified user on %s to /verify-email with the query', (path) => {
      run(path, { verified: '1' })
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/verify-email', query: { verified: '1' } })
    })
  })

  describe('Verified user', () => {
    beforeEach(() => {
      userRef.value = { email_verified_at: VERIFIED_AT }
    })

    it('sends a verified user on /verify-email to / and keeps the query', () => {
      run('/verify-email', { verified: '0' })
      expect(navigateToMock).toHaveBeenCalledWith({ path: '/', query: { verified: '0' } })
    })

    it('leaves a verified user alone on other pages', () => {
      run('/')
      expect(navigateToMock).not.toHaveBeenCalled()
    })
  })
})
