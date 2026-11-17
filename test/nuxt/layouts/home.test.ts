import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, vi } from 'vitest'
import HomeLayout from '@/layouts/home.vue'

const userRef = ref<Record<string, unknown> | null>(null)
mockNuxtImport('useSanctumAuth', () => () => ({ user: userRef, logout: vi.fn() }))
const AVATAR = '[data-testid="header-user-menu-btn"]'

describe('Home layout', () => {
  it('shows the first letter of first_name in the avatar button', async () => {
    userRef.value = { first_name: 'Sam', last_name: null }
    expect((await mountSuspended(HomeLayout)).find(AVATAR).text()).toBe('S')
  })

  it('renders an empty avatar instead of throwing when first_name is empty', async () => {
    userRef.value = { first_name: '', last_name: null }
    expect((await mountSuspended(HomeLayout)).find(AVATAR).text()).toBe('')
  })
})
