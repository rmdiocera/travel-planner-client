import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import WelcomeRouteScene from '~/components/welcome/RouteScene.vue'
import { buildScene } from '~/utils/routeScene/buildScene'
import { LAYOUTS, ROUTES, TIMING } from '~/utils/routeScene/routes'
import type { SceneLayoutName } from '~/utils/routeScene/routes'

const motionRef = ref<'reduce' | 'no-preference'>('no-preference')

vi.mock(import('@vueuse/core'), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    usePreferredReducedMotion: () => motionRef,
  }
})

const PAUSE_BTN = '[data-testid="hero-pause-btn"]'
const ROOT = '[data-testid="route-scene"]'
// From the moment a city starts drawing to the moment the next one starts.
const cityMs = (index: number, layout: SceneLayoutName = 'desktop') => buildScene(ROUTES[index]![layout], LAYOUTS[layout]).seconds * 1000 + TIMING.holdMs + TIMING.fadeMs
const tokyoMs = cityMs(0)

async function mountScene(layout: SceneLayoutName = 'desktop') {
  const wrapper = await mountSuspended(WelcomeRouteScene, { props: { layout } })
  onTestFinished(() => wrapper.unmount())
  return wrapper
}

function names(wrapper: Awaited<ReturnType<typeof mountScene>>) {
  return wrapper.findAll('.bub-text').map(text => text.text())
}

describe('WelcomeRouteScene', () => {
  beforeEach(() => {
    // Only the cycle's timers are faked, so Nuxt's own start-up isn't held up.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    localStorage.clear()
    motionRef.value = 'no-preference'
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Drawing', () => {
    it('shows Tokyo\'s three names on a computer', async () => {
      const wrapper = await mountScene()
      expect(names(wrapper)).toEqual(['Senso-ji', 'Tokyo Skytree', 'Meiji Jingu'])
    })

    it('shows two names on a phone', async () => {
      const wrapper = await mountScene('phone')
      expect(names(wrapper)).toEqual(['Senso-ji', 'Meiji Jingu'])
    })

    it('moves on to Paris', async () => {
      const wrapper = await mountScene()
      vi.advanceTimersByTime(tokyoMs)
      await nextTick()
      expect(names(wrapper)).toEqual(['Louvre', 'Arc de Triomphe', 'Eiffel Tower'])
    })

    it('restarts the current city when the layout changes', async () => {
      const wrapper = await mountScene()
      vi.advanceTimersByTime(tokyoMs)
      await nextTick()

      await wrapper.setProps({ layout: 'phone' })
      expect(names(wrapper)).toEqual(['Arc de Triomphe', 'Eiffel Tower'])

      vi.advanceTimersByTime(cityMs(1, 'phone'))
      await nextTick()
      expect(names(wrapper)).toEqual(['Binondo', 'Rizal Park'])
    })
  })

  describe('Pausing', () => {
    it('pauses and plays', async () => {
      const wrapper = await mountScene()
      const button = wrapper.find(PAUSE_BTN)
      expect(button.attributes('aria-label')).toBe('Pause animation')

      await button.trigger('click')
      expect(button.attributes('aria-label')).toBe('Play animation')
      expect(wrapper.find(ROOT).classes()).toContain('is-paused')
      vi.advanceTimersByTime(60_000)
      await nextTick()
      expect(names(wrapper)).toEqual(['Senso-ji', 'Tokyo Skytree', 'Meiji Jingu'])

      await button.trigger('click')
      expect(button.attributes('aria-label')).toBe('Pause animation')
      expect(wrapper.find(ROOT).classes()).not.toContain('is-paused')
      vi.advanceTimersByTime(tokyoMs)
      await nextTick()
      expect(names(wrapper)).toEqual(['Louvre', 'Arc de Triomphe', 'Eiffel Tower'])
    })

    it('remembers a pause', async () => {
      localStorage.setItem('dayfarer:hero-paused', 'true')
      const wrapper = await mountScene()
      const button = wrapper.find(PAUSE_BTN)
      expect(button.attributes('aria-label')).toBe('Play animation')
      expect(wrapper.find(ROOT).classes()).toContain('is-still')

      vi.advanceTimersByTime(60_000)
      await nextTick()
      expect(names(wrapper)).toEqual(['Senso-ji', 'Tokyo Skytree', 'Meiji Jingu'])

      await button.trigger('click')
      expect(localStorage.getItem('dayfarer:hero-paused')).toBe('false')
      expect(wrapper.find(ROOT).classes()).not.toContain('is-still')
      expect(button.attributes('aria-label')).toBe('Pause animation')
    })

    it('stores a pause', async () => {
      const wrapper = await mountScene()
      await wrapper.find(PAUSE_BTN).trigger('click')
      expect(localStorage.getItem('dayfarer:hero-paused')).toBe('true')
    })

    it('holds a still Tokyo for reduced motion', async () => {
      motionRef.value = 'reduce'
      const wrapper = await mountScene()
      expect(wrapper.find(PAUSE_BTN).exists()).toBe(false)
      expect(wrapper.find(ROOT).classes()).toContain('is-still')

      vi.advanceTimersByTime(60_000)
      await nextTick()
      expect(names(wrapper)).toEqual(['Senso-ji', 'Tokyo Skytree', 'Meiji Jingu'])
    })

    it('stops when reduced motion is turned on', async () => {
      const wrapper = await mountScene()
      motionRef.value = 'reduce'
      await nextTick()
      expect(wrapper.find(PAUSE_BTN).exists()).toBe(false)
      expect(wrapper.find(ROOT).classes()).toContain('is-still')

      vi.advanceTimersByTime(60_000)
      await nextTick()
      expect(names(wrapper)).toEqual(['Senso-ji', 'Tokyo Skytree', 'Meiji Jingu'])
    })
  })

  it('clears its timers on unmount', async () => {
    const wrapper = await mountSuspended(WelcomeRouteScene, { props: { layout: 'desktop' } })
    expect(vi.getTimerCount()).toBeGreaterThan(0)
    wrapper.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
