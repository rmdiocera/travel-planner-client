import { describe, expect, it } from 'vitest'
import { LANDMARKS } from '../../app/utils/routeScene/landmarks'
import { LAYOUTS, ROUTES } from '../../app/utils/routeScene/routes'
import { bubbleShape, buildScene, highestPoint, sceneSizes } from '../../app/utils/routeScene/buildScene'

// The expected values come from running the reference's own code
// (docs/superpowers/specs/2026-11-20-guest-home-hero-reference.html).
describe('route scene data', () => {
  it('names only existing landmarks', () => {
    for (const route of ROUTES) {
      for (const [id] of [...route.desktop.stops, ...route.phone.stops]) {
        expect(LANDMARKS).toHaveProperty(id)
      }
    }
  })

  it('has 3 computer stops and 2 phone stops per city', () => {
    expect(ROUTES.every(route => route.desktop.stops.length === 3 && route.phone.stops.length === 2)).toBe(true)
  })

  it('uses only computer stops on the phone', () => {
    for (const route of ROUTES) {
      const desktopIds = route.desktop.stops.map(([id]) => id)
      expect(desktopIds).toEqual(expect.arrayContaining(route.phone.stops.map(([id]) => id)))
    }
  })

  it('has unique bubble names', () => {
    expect(new Set(Object.values(LANDMARKS).map(landmark => landmark.name)).size).toBe(12)
  })

  it('loops Tokyo, Paris, Manila, London', () => {
    expect(ROUTES.map(route => route.city)).toEqual(['Tokyo', 'Paris', 'Manila', 'London'])
  })
})

describe('buildScene', () => {
  it('builds Tokyo on a computer', () => {
    const scene = buildScene(ROUTES[0]!.desktop, LAYOUTS.desktop)
    expect(scene.seconds).toBeCloseTo(10.15, 2)
    expect(scene.legs).toHaveLength(4)
    expect(scene.legs[0]!.d).toBe('M-192 60 C-92 60 -92 210 8 210')
    expect(scene.legs[3]!.d).toBe('M599.5 425 C699.5 425 699.5 275 799.5 275')
    expect(scene.legs[0]!.fade).toBeDefined()
    expect(scene.legs[3]!.fade).toBeDefined()
    expect(scene.bubbles.map(bubble => bubble.name)).toEqual(['Senso-ji', 'Tokyo Skytree', 'Meiji Jingu'])
  })

  it('builds Tokyo on a phone, with no fades', () => {
    const scene = buildScene(ROUTES[0]!.phone, LAYOUTS.phone)
    expect(scene.seconds).toBeCloseTo(7.23, 2)
    expect(scene.legs[0]!.d).toBe('M-20 20 C27.5 20 25 130 75 130')
    expect(scene.legs.every(leg => !leg.fade)).toBe(true)
    expect(scene.bubbles.map(bubble => bubble.name)).toEqual(['Senso-ji', 'Meiji Jingu'])
  })

  it('times every city like the reference', () => {
    expect(buildScene(ROUTES[2]!.desktop, LAYOUTS.desktop).seconds).toBeCloseTo(10.78, 2)
    expect(buildScene(ROUTES[3]!.phone, LAYOUTS.phone).legs.at(-1)!.d).toBe('M379 270 C434 270 434 110 489 110')
  })
})

describe('sizing', () => {
  it('finds the highest drawing per layout', () => {
    expect(highestPoint('desktop')).toBeCloseTo(50.32, 2)
    expect(highestPoint('phone')).toBeCloseTo(38.5, 2)
  })

  it('turns screen pixels into drawing units', () => {
    const sizes = sceneSizes('desktop', 492) // unit 2
    expect(sizes.unit).toBe(2)
    expect(sizes.lineWidth).toBeCloseTo(3.2)
    expect(sizes.dash).toBe(12)
    expect(sizes.viewBox).toBe('-172 -19.7 984 459.7')
  })

  it('keeps a bubble inside the scene', () => {
    const shape = bubbleShape(812, 100, 200, sceneSizes('desktop', 492), LAYOUTS.desktop)
    expect(shape.textX + 200).toBeCloseTo(794)
    expect(shape.textY).toBeCloseTo(67)
  })
})
