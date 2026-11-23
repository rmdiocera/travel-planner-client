import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRouteCycle } from '../../app/utils/routeScene/cycle'

describe('createRouteCycle', () => {
  const onCity = vi.fn()
  const onFade = vi.fn()
  // Each city draws for 10 s, holds for 1.5 s, then fades for 0.6 s: the next city starts at 12.1 s.
  const createCycle = () => createRouteCycle({ cityCount: 4, secondsFor: () => 10, holdMs: 1500, fadeMs: 600, onCity, onFade })

  beforeEach(() => {
    vi.useFakeTimers()
    for (const mock of [onCity, onFade]) mock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts at the given city', () => {
    createCycle().start(0)

    expect(onCity).toHaveBeenCalledTimes(1)
    expect(onCity).toHaveBeenCalledWith(0)
  })

  it('fades after the drawing and the hold, then moves on', () => {
    createCycle().start(0)

    vi.advanceTimersByTime(11_499)
    expect(onFade).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFade).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(600)
    expect(onCity).toHaveBeenLastCalledWith(1)
  })

  it('wraps after the last city', () => {
    createCycle().start(3)

    vi.advanceTimersByTime(12_100)
    expect(onCity).toHaveBeenLastCalledWith(0)
  })

  it('holds still while paused', () => {
    const cycle = createCycle()
    cycle.start(0)
    vi.advanceTimersByTime(5_000)
    cycle.pause()
    vi.advanceTimersByTime(60_000)
    expect(onFade).not.toHaveBeenCalled()

    cycle.resume()
    vi.advanceTimersByTime(6_499)
    expect(onFade).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFade).toHaveBeenCalledTimes(1)
  })

  it('ignores a second pause and a resume while running', () => {
    const cycle = createCycle()
    cycle.start(0)
    cycle.resume()
    vi.advanceTimersByTime(5_000)
    cycle.pause()
    cycle.pause()
    vi.advanceTimersByTime(60_000)
    cycle.resume()

    vi.advanceTimersByTime(6_499)
    expect(onFade).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFade).toHaveBeenCalledTimes(1)
    expect(cycle.paused).toBe(false)
  })

  it('stops for good', () => {
    const cycle = createCycle()
    cycle.start(0)
    cycle.stop()
    vi.advanceTimersByTime(60_000)

    expect(onFade).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
