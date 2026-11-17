import { mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { formatCountdown, useResendCooldown } from '@/composables/useResendCooldown'

const KEY = 'dayfarer:resend-cooldown:u1'

describe('formatCountdown', () => {
  it.each([[300, '5:00'], [295, '4:55'], [65, '1:05'], [9, '0:09'], [0, '0:00']])(
    'formatCountdown(%i) is %s',
    (seconds, label) => {
      expect(formatCountdown(seconds)).toBe(label)
    },
  )
})

describe('useResendCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
    vi.setSystemTime(new Date('2026-07-01T12:00:00Z'))
    localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is idle until started', () => {
    expect(useResendCooldown('u1').remainingSeconds.value).toBe(0)
  })

  it('counts down from 300 in real time', async () => {
    const { remainingSeconds, start } = useResendCooldown('u1')
    start()
    expect(remainingSeconds.value).toBe(300)
    await vi.advanceTimersByTimeAsync(1000)
    expect(remainingSeconds.value).toBe(299)
    await vi.advanceTimersByTimeAsync(299_000)
    expect(remainingSeconds.value).toBe(0)
  })

  it('uses the given seconds, capped at 300, and falls back to 300 for NaN', () => {
    const { remainingSeconds, start } = useResendCooldown('u1')
    start(120)
    expect(remainingSeconds.value).toBe(120)
    start(9999)
    expect(remainingSeconds.value).toBe(300)
    start(Number.NaN)
    expect(remainingSeconds.value).toBe(300)
  })

  it('survives a remount', async () => {
    useResendCooldown('u1').start()
    await nextTick() // let the storage write land
    await vi.advanceTimersByTimeAsync(60_000)
    expect(useResendCooldown('u1').remainingSeconds.value).toBe(240)
  })

  it('keeps one cooldown per user', async () => {
    useResendCooldown('u1').start()
    await nextTick()
    expect(useResendCooldown('u2').remainingSeconds.value).toBe(0)
  })

  it.each([
    ['an expired value', 0, () => String(Date.now() - 1000)],
    ['garbage', 0, () => 'abc'],
    ['a value beyond five minutes', 300, () => String(Date.now() + 3_600_000)],
  ])('reads %s from storage as %i seconds', (_name, expected, stored) => {
    localStorage.setItem(KEY, stored())
    expect(useResendCooldown('u1').remainingSeconds.value).toBe(expected)
  })

  it('cuts a stored value beyond five minutes back to five minutes and counts down from there', async () => {
    localStorage.setItem(KEY, String(Date.now() + 3_600_000))
    const { remainingSeconds } = useResendCooldown('u1')
    expect(remainingSeconds.value).toBe(300)
    await vi.advanceTimersByTimeAsync(1000)
    expect(remainingSeconds.value).toBe(299)
  })

  it('cuts the cooldown back to five minutes when the clock moves backwards after it started', async () => {
    const { remainingSeconds, start } = useResendCooldown('u1')
    start()
    vi.setSystemTime(Date.now() - 3_600_000)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)
    expect(remainingSeconds.value).toBeLessThanOrEqual(299)
  })

  it('is ready after mount', async () => {
    const wrapper = await mountSuspended(defineComponent({
      setup() {
        const { isReady } = useResendCooldown('u1')
        return () => h('i', String(isReady.value))
      },
    }))
    expect(wrapper.text()).toBe('true')
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
      const { remainingSeconds, start } = useResendCooldown('u1')
      start()
      expect(remainingSeconds.value).toBe(300)
    }
    finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })
})
