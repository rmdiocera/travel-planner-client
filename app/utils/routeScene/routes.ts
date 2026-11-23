import type { LandmarkId } from './landmarks'

export type SceneLayoutName = 'desktop' | 'phone'

// x and y are where the center of the landmark's ground line goes.
export type Stop = [id: LandmarkId, x: number, y: number, scale: number]

// startY: the height the line comes in at. Every route runs left to right.
export interface RouteLayout {
  startY: number
  stops: Stop[]
}

export interface Route {
  city: string
  desktop: RouteLayout
  phone: RouteLayout
}

// left/right/bottom: the scene's extent in drawing units. Sizes ending in Px are screen pixels,
// whatever the scene's size. The line either comes in leadDX before the first drawing (and fades
// in and out at its ends) or starts at leadStartX, off screen.
export interface SceneLayout {
  left: number
  right: number
  bottom: number
  minBend: number
  linePx: number
  dashPx: number
  leadDX?: number
  leadStartX?: number
  fadeEnds?: boolean
}

export const ROUTES: Route[] = [
  { city: 'Tokyo',
    desktop: { startY: 60, stops: [['sensoji', 100, 210, 1], ['skytree', 320, 250, 0.78], ['meiji', 540, 425, 0.85]] },
    phone: { startY: 20, stops: [['sensoji', 144, 130, 0.75], ['meiji', 341.5, 270, 0.75]] } },
  { city: 'Paris',
    desktop: { startY: 300, stops: [['louvre', 100, 400, 0.8], ['arc', 320, 210, 0.8], ['eiffel', 550, 430, 0.68]] },
    phone: { startY: 30, stops: [['arc', 129.6, 150, 0.7], ['eiffel', 350, 285, 0.55]] } },
  { city: 'Manila',
    desktop: { startY: 110, stops: [['binondo', 95, 230, 0.85], ['intramuros', 320, 390, 0.85], ['rizal', 555, 320, 0.9]] },
    phone: { startY: 40, stops: [['binondo', 143, 150, 0.7], ['rizal', 347, 285, 0.7]] } },
  { city: 'London',
    desktop: { startY: 110, stops: [['bigben', 85, 270, 0.72], ['eye', 310, 190, 0.8], ['towerbridge', 530, 420, 0.8]] },
    phone: { startY: 60, stops: [['bigben', 121, 220, 0.62], ['towerbridge', 317, 270, 0.62]] } },
]

// On desktop the drawings take the middle 640 units, 65% of the scene's width. On the phone the
// scene is 80% size and runs edge to edge.
export const LAYOUTS: Record<SceneLayoutName, SceneLayout> = {
  desktop: { left: -172, right: 812, bottom: 440, minBend: 70, linePx: 1.6, dashPx: 6, leadDX: 200, fadeEnds: true },
  phone: { left: 0, right: 469, bottom: 315, minBend: 50, linePx: 2.2, dashPx: 8, leadStartX: -20 },
}

// The name bubble, in screen pixels: font size, height, corner radius, side padding, icon size,
// gap after the icon, tail height.
export const BUBBLE_PX = { font: 14, h: 24, r: 6, padX: 7, icon: 12, gap: 4, tail: 5 }

export const TIMING = {
  routeSeconds: 1.3,
  lineSeconds: 0.6,
  staggerSeconds: 0.09,
  trailSeconds: 1.3,
  holdMs: 1500,
  fadeMs: 600,
  bubbleLeadSeconds: 0.2,
  bubbleGapSeconds: 0.3,
}
