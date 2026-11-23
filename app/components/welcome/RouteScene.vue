<script setup lang="ts">
import { useElementSize, usePreferredReducedMotion } from '@vueuse/core'
import { bubbleShape, buildScene, sceneSizes } from '~/utils/routeScene/buildScene'
import { createRouteCycle } from '~/utils/routeScene/cycle'
import type { RouteCycle } from '~/utils/routeScene/cycle'
import { LAYOUTS, ROUTES, TIMING } from '~/utils/routeScene/routes'
import type { SceneLayoutName } from '~/utils/routeScene/routes'

// The Welcome page's hero: a dashed route that stops at each landmark of a city and draws it, then
// fades and moves on to the next city. Ported from docs/superpowers/specs/2026-11-20-guest-home-hero-reference.html.
const props = defineProps<{ layout: SceneLayoutName }>()

const id = useId()
const root = useTemplateRef<HTMLElement>('root')
const { width } = useElementSize(root)
const reducedMotion = usePreferredReducedMotion()
const isReduced = computed(() => reducedMotion.value === 'reduce')
const { paused: rememberedPause, setPaused } = useHeroPause()

const cityIndex = ref(0)
// Keys the SVG, so each city (or each restart of one) starts its CSS animations from the beginning.
const run = ref(0)
const isFading = ref(false)
const isPaused = ref(false)
// Every line and name in its final state, with no animation: for reduced motion, or a remembered pause.
const isStill = ref(false)

const layoutSettings = computed(() => LAYOUTS[props.layout])
const scene = computed(() => buildScene(ROUTES[cityIndex.value]![props.layout], layoutSettings.value))
// Until the scene has been measured, one drawing unit stands for one pixel.
const sizes = computed(() => sceneSizes(props.layout, width.value || layoutSettings.value.right - layoutSettings.value.left))

const textWidths = ref<number[]>([])
const bubbles = computed(() => scene.value.bubbles.map((bubble, i) => ({
  ...bubble,
  // happy-dom has no getBBox, so a name's width is estimated until it can be measured.
  shape: bubbleShape(bubble.ax, bubble.ay, textWidths.value[i] || bubble.name.length * sizes.value.bubble.font * 0.6, sizes.value, layoutSettings.value),
})))

function measure() {
  const texts = root.value?.querySelectorAll<SVGTextElement>('.bub-text') ?? []
  textWidths.value = [...texts].map(text => (typeof text.getBBox === 'function' ? text.getBBox().width : 0))
}
watch([run, sizes], measure, { flush: 'post' })

let cycle: RouteCycle | undefined

function showStill(index: number) {
  cycle?.stop()
  isFading.value = false
  isPaused.value = false
  isStill.value = true
  cityIndex.value = index
}

function play(index: number) {
  isStill.value = false
  isPaused.value = false
  cycle?.start(index)
}

function togglePause() {
  if (isStill.value) {
    setPaused(false)
    play(cityIndex.value)
  }
  else if (isPaused.value) {
    isPaused.value = false
    cycle?.resume()
    setPaused(false)
  }
  else {
    isPaused.value = true
    cycle?.pause()
    setPaused(true)
  }
}

onMounted(() => {
  cycle = createRouteCycle({
    cityCount: ROUTES.length,
    secondsFor: index => buildScene(ROUTES[index]![props.layout], layoutSettings.value).seconds,
    holdMs: TIMING.holdMs,
    fadeMs: TIMING.fadeMs,
    onCity: (index) => {
      isFading.value = false
      cityIndex.value = index
      run.value++
    },
    onFade: () => {
      isFading.value = true
    },
  })
  if (isReduced.value || rememberedPause.value) {
    showStill(0)
  }
  else {
    play(0)
  }
  measure()
  document.fonts?.ready.then(measure)
})

// Crossing between the phone and desktop layouts starts the current city again in the new one. A
// paused scene shows that city finished instead, since restarting it would leave it blank.
watch(() => props.layout, () => {
  if (!cycle || isReduced.value) return
  if (isStill.value || isPaused.value) {
    showStill(cityIndex.value)
  }
  else {
    cycle.start(cityIndex.value)
  }
})

// Turning reduced motion on while the page is open stops the scene too, since the pause button goes away.
// Turning it off leaves the scene still, with "Play animation", until the visitor presses play.
watch(isReduced, (reduce) => {
  if (cycle && reduce) showStill(0)
})

onBeforeUnmount(() => {
  cycle?.stop()
})

const seconds = (value: number) => `${value.toFixed(2)}s`
</script>

<template>
  <div
    ref="root"
    data-testid="route-scene"
    class="route-scene relative"
    :class="{ 'is-paused': isPaused, 'is-fading': isFading, 'is-still': isStill }"
  >
    <svg
      :key="run"
      class="rt"
      :viewBox="sizes.viewBox"
      aria-hidden="true"
    >
      <defs>
        <template
          v-for="(leg, i) in scene.legs"
          :key="i"
        >
          <!-- The dashed route is revealed by a solid copy of itself drawing inside a mask. -->
          <mask
            :id="`${id}-m${i}`"
            maskUnits="userSpaceOnUse"
            x="-400"
            y="-300"
            width="1400"
            height="900"
          >
            <path
              class="ln reveal"
              pathLength="1"
              :d="leg.d"
              :style="{ '--delay': seconds(leg.delay), '--dur': `${leg.duration}s`, 'strokeWidth': sizes.lineWidth * 6 }"
            />
          </mask>
          <template v-if="leg.fade">
            <linearGradient
              :id="`${id}-f${i}-g`"
              gradientUnits="userSpaceOnUse"
              :x1="leg.fade.x0"
              y1="0"
              :x2="leg.fade.x1"
              y2="0"
            >
              <stop
                offset="0"
                stop-color="#fff"
                stop-opacity="0"
              />
              <stop
                offset="1"
                stop-color="#fff"
              />
            </linearGradient>
            <mask
              :id="`${id}-f${i}`"
              maskUnits="userSpaceOnUse"
              x="-400"
              y="-300"
              width="1400"
              height="900"
            >
              <rect
                x="-400"
                y="-300"
                width="1400"
                height="900"
                :fill="`url(#${id}-f${i}-g)`"
              />
            </mask>
          </template>
        </template>
      </defs>

      <!-- Each leg of the route, then the drawing it leads to; the last leg is the trail. -->
      <template
        v-for="(leg, i) in scene.legs"
        :key="i"
      >
        <g :mask="leg.fade ? `url(#${id}-f${i})` : undefined">
          <path
            class="route"
            :mask="`url(#${id}-m${i})`"
            :d="leg.d"
            :style="{ strokeWidth: sizes.lineWidth, strokeDasharray: `${sizes.dash} ${sizes.dash}` }"
          />
        </g>
        <g
          v-if="scene.drawings[i]"
          :transform="`translate(${scene.drawings[i].translateX} ${scene.drawings[i].translateY}) scale(${scene.drawings[i].scale})`"
        >
          <path
            v-for="(path, k) in scene.drawings[i].paths"
            :key="k"
            class="ln"
            pathLength="1"
            :d="path.d"
            :style="{ '--delay': seconds(path.delay), '--dur': `${TIMING.lineSeconds}s`, 'strokeWidth': sizes.lineWidth / scene.drawings[i].scale }"
          />
        </g>
      </template>

      <g
        v-for="bubble in bubbles"
        :key="bubble.name"
        class="bub"
        :style="{ '--delay': seconds(bubble.delay) }"
      >
        <path
          class="bub-shape"
          :d="bubble.shape.path"
          :style="{ strokeWidth: sizes.unit }"
        />
        <!-- Lucide's map-pin -->
        <g
          class="bub-pin"
          :transform="bubble.shape.iconTransform"
        >
          <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
          <circle
            cx="12"
            cy="10"
            r="3"
          />
        </g>
        <text
          class="bub-text"
          :x="bubble.shape.textX"
          :y="bubble.shape.textY"
          :style="{ fontSize: `${sizes.bubble.font}px` }"
        >{{ bubble.name }}</text>
      </g>
    </svg>

    <button
      v-if="!isReduced"
      type="button"
      data-testid="hero-pause-btn"
      class="absolute bottom-0 grid size-7 cursor-pointer place-items-center rounded-full border border-default bg-default text-muted transition-colors hover:border-inverted hover:bg-inverted hover:text-inverted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="layout === 'phone' ? 'right-4' : 'right-0'"
      :aria-label="isPaused || isStill ? 'Play animation' : 'Pause animation'"
      @click="togglePause"
    >
      <UIcon
        :name="isPaused || isStill ? 'i-lucide-play' : 'i-lucide-pause'"
        class="size-3.5"
      />
    </button>
  </div>
</template>

<style scoped>
.rt { display: block; width: 100%; height: auto; overflow: visible; }
.rt .ln { fill: none; stroke: #0d9488; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1 1; stroke-dashoffset: 1; opacity: 0; animation: rt-draw var(--dur) ease-in-out var(--delay) forwards; }
.rt .reveal { stroke: #fff; }
.rt .route { fill: none; stroke: #0d9488; stroke-linecap: round; }
.rt .bub { opacity: 0; animation: rt-pop .45s ease-out var(--delay) forwards; }
.rt .bub-shape { fill: #fff; stroke: #e5e5e5; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, .08)); }
.rt .bub-pin { fill: none; stroke: #0d9488; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
.rt .bub-text { font-family: 'Fraunces', serif; font-weight: 600; font-variation-settings: 'opsz' 14; fill: #404040; dominant-baseline: central; }

/* Not :global(.dark): Vue would turn the whole rule into a bare `.dark` rule. Scoping only marks the last part, so this works. */
.dark .rt .ln:not(.reveal), .dark .rt .route, .dark .rt .bub-pin { stroke: #2dd4bf; }
.dark .rt .bub-shape { fill: #262626; stroke: #404040; }
.dark .rt .bub-text { fill: #e5e5e5; }

.route-scene.is-fading { animation: rt-fade .6s ease forwards; }
.route-scene.is-still .ln { animation: none; stroke-dashoffset: 0; opacity: 1; }
.route-scene.is-still .bub { animation: none; opacity: 1; }
/* After the rules above: an `animation` shorthand would set the play state back to running. */
.route-scene.is-paused, .route-scene.is-paused .ln, .route-scene.is-paused .bub { animation-play-state: paused; }

@keyframes rt-draw { 0% { stroke-dashoffset: 1; opacity: 0 } 1% { opacity: 1 } 100% { stroke-dashoffset: 0; opacity: 1 } }
@keyframes rt-pop { from { opacity: 0; transform: translateY(4px) } to { opacity: 1; transform: none } }
@keyframes rt-fade { from { opacity: 1 } to { opacity: 0 } }

@media (prefers-reduced-motion: reduce) {
  .rt .ln { animation: none; stroke-dashoffset: 0; opacity: 1; }
  .rt .bub { animation: none; opacity: 1; }
}
</style>
