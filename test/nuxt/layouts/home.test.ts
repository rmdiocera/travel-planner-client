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

  it('labels the nav item "Trips" for a User', async () => {
    userRef.value = { first_name: 'Sam', last_name: null }
    expect((await mountSuspended(HomeLayout)).text()).toContain('Trips')
  })

  it('offers a Guest Log in and Create account', async () => {
    userRef.value = null
    const wrapper = await mountSuspended(HomeLayout)
    expect(wrapper.find('[data-testid="header-login-btn"]').attributes('href')).toBe('/login')
    expect(wrapper.find('[data-testid="header-register-btn"]').attributes('href')).toBe('/register')
  })

  it('hides Create account in the header on phones', async () => {
    userRef.value = null
    const classes = (await mountSuspended(HomeLayout)).find('[data-testid="header-register-btn"]').classes()
    expect(classes).toContain('hidden')
    expect(classes).toContain('sm:inline-flex')
  })

  it.each([
    ['a Guest', null],
    ['a User', { first_name: 'Sam', last_name: null }],
  ])('has no menu button for %s', async (_name, user) => {
    userRef.value = user
    expect((await mountSuspended(HomeLayout)).find('button[aria-label="Open menu"]').exists()).toBe(false)
  })

  it('renders the after slot outside the container', async () => {
    userRef.value = null
    const wrapper = await mountSuspended(HomeLayout, {
      slots: {
        default: () => h('div', { 'data-testid': 'default-slot' }),
        after: () => h('div', { 'data-testid': 'after-slot' }),
      },
    })
    expect(wrapper.find('[data-testid="default-slot"]').element.closest('[data-testid="home-container"]')).not.toBeNull()
    expect(wrapper.find('[data-testid="after-slot"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="after-slot"]').element.closest('[data-testid="home-container"]')).toBeNull()
  })
})
