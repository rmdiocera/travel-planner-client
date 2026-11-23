export interface RouteCycleOptions {
  cityCount: number
  // The drawing time of that city's scene.
  secondsFor: (index: number) => number
  holdMs: number
  fadeMs: number
  // A city starts drawing.
  onCity: (index: number) => void
  // The finished city starts fading out.
  onFade: () => void
}

export interface RouteCycle {
  start(index?: number): void
  pause(): void
  resume(): void
  stop(): void
  readonly paused: boolean
}

interface PausableTimer {
  pause(): void
  resume(): void
  clear(): void
}

// A timeout that can be paused and later runs out the time it had left. Once it has run, it never runs again.
function pausableTimer(fn: () => void, ms: number): PausableTimer {
  let started = Date.now()
  let left = ms
  let done = false
  const run = () => {
    done = true
    fn()
  }
  let id = setTimeout(run, ms)
  return {
    pause() {
      clearTimeout(id)
      left -= Date.now() - started
    },
    resume() {
      if (!done) {
        started = Date.now()
        id = setTimeout(run, left)
      }
    },
    clear() {
      clearTimeout(id)
      done = true
    },
  }
}

// Shows each city in turn: it draws, holds, fades, then the next one starts, looping after the last.
export function createRouteCycle(options: RouteCycleOptions): RouteCycle {
  let timers: PausableTimer[] = []
  let paused = false

  function clear() {
    for (const timer of timers) timer.clear()
    timers = []
  }

  function start(index = 0) {
    clear()
    paused = false
    options.onCity(index)
    const fadeAt = options.secondsFor(index) * 1000 + options.holdMs
    timers = [
      pausableTimer(options.onFade, fadeAt),
      pausableTimer(() => start((index + 1) % options.cityCount), fadeAt + options.fadeMs),
    ]
  }

  return {
    start,
    pause() {
      if (paused) return
      paused = true
      for (const timer of timers) timer.pause()
    },
    resume() {
      if (!paused) return
      paused = false
      for (const timer of timers) timer.resume()
    },
    stop() {
      clear()
      paused = false
    },
    get paused() {
      return paused
    },
  }
}
