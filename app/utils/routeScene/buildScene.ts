import { LANDMARKS } from './landmarks'
import { BUBBLE_PX, LAYOUTS, ROUTES, TIMING } from './routes'
import type { RouteLayout, SceneLayout, SceneLayoutName } from './routes'

// Ported from docs/superpowers/specs/2026-11-20-guest-home-hero-reference.html, which builds the
// same scene as an HTML string. Keep the two in step.

// fade: the line fades from invisible at x0 to fully drawn at x1 (x0 > x1 fades it out to the right).
export interface SceneLeg { d: string, delay: number, duration: number, fade?: { x0: number, x1: number } }
export interface SceneDrawing { translateX: number, translateY: number, scale: number, paths: { d: string, delay: number }[] }
export interface SceneBubble { name: string, ax: number, ay: number, delay: number }
// legs[i] leads to drawings[i] and bubbles[i]; the last leg is the trail after the last name.
export interface SceneModel { legs: SceneLeg[], drawings: SceneDrawing[], bubbles: SceneBubble[], seconds: number }

export function buildScene(route: RouteLayout, layout: SceneLayout): SceneModel {
  let t = 0
  const legs: SceneLeg[] = []
  const drawings: SceneDrawing[] = []
  const bubbles: SceneBubble[] = []
  const [firstId, firstX, , firstScale] = route.stops[0]!
  const startX = layout.leadDX ? firstX - LANDMARKS[firstId].hw * firstScale - layout.leadDX : layout.leadStartX ?? 0
  let fromX = startX
  let fromY = route.startY
  let fromHandleX: number | null = null
  let previousX = startX
  let lead = { handle1X: 0, handle2X: 0, endX: 0, endY: 0 }

  for (const [i, [id, x, y, scale]] of route.stops.entries()) {
    const landmark = LANDMARKS[id]
    const travelsRight = previousX < x
    const entryX = travelsRight ? x - landmark.hw * scale : x + landmark.hw * scale
    const exitX = travelsRight ? x + landmark.hw * scale : x - landmark.hw * scale
    const bend = Math.max(layout.minBend, Math.abs(entryX - fromX) * 0.5)
    const handle1X = fromHandleX ?? fromX + (entryX - fromX) * 0.5
    const handle2X = entryX + (travelsRight ? -bend : bend)
    const toStop: SceneLeg = { d: `M${fromX} ${fromY} C${handle1X} ${fromY} ${handle2X} ${y} ${entryX} ${y}`, delay: t, duration: TIMING.routeSeconds }
    if (i === 0) {
      lead = { handle1X, handle2X, endX: entryX, endY: y }
      if (layout.fadeEnds) {
        toStop.fade = { x0: startX, x1: startX + (entryX - startX) * 0.6 }
      }
    }
    legs.push(toStop)
    t += TIMING.routeSeconds

    // The ground line draws first, in the direction of travel.
    const groundStart = travelsRight ? landmark.cx - landmark.hw : landmark.cx + landmark.hw
    const groundEnd = travelsRight ? landmark.cx + landmark.hw : landmark.cx - landmark.hw
    const paths = [`M${groundStart} ${landmark.ground} L${groundEnd} ${landmark.ground}`, ...landmark.paths]
    drawings.push({
      translateX: x - landmark.cx * scale,
      translateY: y - landmark.ground * scale,
      scale,
      paths: paths.map((d, k) => ({ d, delay: t + k * TIMING.staggerSeconds })),
    })
    t += (paths.length - 1) * TIMING.staggerSeconds + TIMING.lineSeconds

    const ay = y - (landmark.ground - landmark.top) * scale - 4
    bubbles.push({ name: landmark.name, ax: x, ay: Number(ay.toFixed(1)), delay: t - TIMING.bubbleLeadSeconds })
    t += TIMING.bubbleGapSeconds

    fromX = exitX
    fromY = y
    fromHandleX = exitX + (travelsRight ? bend : -bend)
    previousX = x
  }

  // Once the last name is up, the line carries on to the right as the mirror image of the line that
  // came in: same length, same curve, rising where that one fell, and fading out the way it faded in.
  const rise = lead.endY - route.startY
  const mirrorX = (px: number) => fromX + (lead.endX - px)
  const trailEndX = mirrorX(startX)
  const trail: SceneLeg = {
    d: `M${fromX} ${fromY} C${mirrorX(lead.handle2X)} ${fromY} ${mirrorX(lead.handle1X)} ${fromY - rise} ${trailEndX} ${fromY - rise}`,
    delay: t,
    duration: TIMING.trailSeconds,
  }
  if (layout.fadeEnds) {
    trail.fade = { x0: trailEndX, x1: trailEndX - (trailEndX - fromX) * 0.6 }
  }
  legs.push(trail)
  t += TIMING.trailSeconds

  return { legs, drawings, bubbles, seconds: t }
}

// The top of the tallest drawing in any city, so every city gets the same headroom.
export function highestPoint(layoutName: SceneLayoutName): number {
  return Math.min(...ROUTES.flatMap(route => route[layoutName].stops.map(([id, , y, scale]) => y - (LANDMARKS[id].ground - LANDMARKS[id].top) * scale)))
}

// bubble: BUBBLE_PX turned into drawing units.
export interface SceneSizes { viewBox: string, unit: number, lineWidth: number, dash: number, bubble: typeof BUBBLE_PX }

// Turns the pixel sizes into drawing units once the scene's width (hostWidth, in pixels) is known.
export function sceneSizes(layoutName: SceneLayoutName, hostWidth: number): SceneSizes {
  const layout = LAYOUTS[layoutName]
  const width = layout.right - layout.left
  const unit = width / hostWidth
  const bubble = Object.fromEntries(Object.entries(BUBBLE_PX).map(([key, value]) => [key, value * unit])) as typeof BUBBLE_PX
  // The same headroom for every city, so the hero doesn't change height between them.
  const top = highestPoint(layoutName) - 4 - bubble.tail - bubble.h - 4 * unit
  return {
    viewBox: `${layout.left} ${top.toFixed(1)} ${width} ${(layout.bottom - top).toFixed(1)}`,
    unit,
    lineWidth: layout.linePx * unit,
    dash: layout.dashPx * unit,
    bubble,
  }
}

// The bubble around a name whose text is textWidth wide, with its tail on (ax, ay), kept inside the scene.
export function bubbleShape(ax: number, ay: number, textWidth: number, sizes: SceneSizes, layout: SceneLayout): { path: string, textX: number, textY: number, iconTransform: string } {
  const { bubble: b, unit } = sizes
  const w = b.padX * 2 + b.icon + b.gap + textWidth
  const by = ay - b.tail - b.h
  const bx = Math.min(Math.max(ax - w / 2, layout.left + 2 * unit), layout.right - 2 * unit - w)
  const t = b.tail * 1.2
  const { r } = b
  return {
    path: `M${bx + r} ${by} H${bx + w - r} A${r} ${r} 0 0 1 ${bx + w} ${by + r} V${by + b.h - r}`
      + ` A${r} ${r} 0 0 1 ${bx + w - r} ${by + b.h} H${ax + t} L${ax} ${ay} L${ax - t} ${by + b.h} H${bx + r}`
      + ` A${r} ${r} 0 0 1 ${bx} ${by + b.h - r} V${by + r} A${r} ${r} 0 0 1 ${bx + r} ${by} Z`,
    textX: bx + b.padX + b.icon + b.gap,
    textY: by + b.h / 2 + 0.5 * unit,
    // The pin is a 24-unit Lucide icon.
    iconTransform: `translate(${bx + b.padX} ${by + (b.h - b.icon) / 2}) scale(${b.icon / 24})`,
  }
}
