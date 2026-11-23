import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, onTestFinished } from 'vitest'
import { useHeroPause } from '@/composables/useHeroPause'

const KEY = 'dayfarer:hero-paused'

async function mountHarness() {
  let heroPause!: ReturnType<typeof useHeroPause>
  const wrapper = await mountSuspended(defineComponent({
    setup() {
      heroPause = useHeroPause()
      return () => h('i')
    },
  }))
  onTestFinished(() => wrapper.unmount())
  return heroPause
}

describe('useHeroPause', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts unpaused', async () => {
    const { paused } = await mountHarness()
    expect(paused.value).toBe(false)
  })

  it('reads a stored pause', async () => {
    localStorage.setItem(KEY, 'true')
    const { paused } = await mountHarness()
    expect(paused.value).toBe(true)
  })

  it('stores a pause and a play', async () => {
    const { setPaused } = await mountHarness()
    setPaused(true)
    await nextTick() // let the storage write land
    expect(localStorage.getItem(KEY)).toBe('true')
    setPaused(false)
    await nextTick()
    expect(localStorage.getItem(KEY)).toBe('false')
  })

  it('falls back to memory when localStorage throws', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('denied')
      },
    })
    try {
      const { paused, setPaused } = useHeroPause()
      setPaused(true)
      expect(paused.value).toBe(true)
    }
    finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })
})
