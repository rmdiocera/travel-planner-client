<script setup lang="ts">
import type { NestedPlace } from '~/types/place'

const props = defineProps<{
  place: NestedPlace
}>()

const open = ref(false)
const current = ref(0)
const carousel = useTemplateRef('carousel')
const strip = useTemplateRef('strip')

const images = computed(() => props.place.images)
// One photo has nothing to flip through, so it gets no arrows, counter or strip.
const multiple = computed(() => images.value.length > 1)

// The modal unmounts its content when it closes, so the carousel starts at the first photo again; this keeps the counter in step.
watch(open, (isOpen) => {
  if (isOpen) {
    current.value = 0
  }
})

// With more photos than fit, the strip scrolls sideways: keep the current one in view.
watch(current, () => {
  strip.value?.children[current.value]?.scrollIntoView?.({ inline: 'nearest', block: 'nearest' })
}, { flush: 'post' })

function showPhoto(index: number) {
  carousel.value?.emblaApi?.scrollTo(index)
}

const arrowClass = 'bg-white/90 text-neutral-800 shadow-sm hover:bg-white'
</script>

<template>
  <UModal
    v-model:open="open"
    :title="place.name"
    :description="`Photos of ${place.name}`"
    :ui="{ content: 'w-[calc(100vw-1.5rem)] max-w-none rounded-2xl p-2 ring-0 md:w-150 md:p-2.5' }"
  >
    <slot />

    <template #content>
      <div data-testid="photo-viewer">
        <!-- The carousel comes first in the DOM, so its focusable root is where focus lands when the viewer opens and the arrow keys work at once. -->
        <div class="relative">
          <UCarousel
            ref="carousel"
            v-slot="{ item, index }"
            :items="images"
            :arrows="multiple"
            :prev="{ color: 'neutral', variant: 'outline', class: arrowClass }"
            :next="{ color: 'neutral', variant: 'outline', class: arrowClass }"
            :ui="{
              root: 'rounded-lg focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-primary',
              container: 'ms-0',
              item: 'ps-0',
              prev: 'start-2 sm:start-3',
              next: 'end-2 sm:end-3',
            }"
            @select="current = $event"
          >
            <!-- A blurred, darkened copy of the photo fills the frame behind it, so photos of any shape leave no grey bars. -->
            <div class="relative h-53 overflow-hidden rounded-lg bg-black md:h-87.5">
              <img
                :src="item.url"
                alt=""
                aria-hidden="true"
                loading="lazy"
                class="absolute inset-0 size-full scale-125 object-cover blur-xl brightness-50 saturate-150"
              >
              <img
                :src="item.url"
                :alt="`${place.name}, photo ${index + 1} of ${images.length}`"
                loading="lazy"
                class="relative size-full object-contain"
                :data-testid="`photo-viewer-photo-${index}`"
              >
            </div>
          </UCarousel>
          <UButton
            icon="i-lucide-x"
            color="neutral"
            variant="outline"
            size="sm"
            aria-label="Close"
            class="absolute top-2 right-2 z-10 rounded-full md:top-3 md:right-3"
            :class="arrowClass"
            data-testid="photo-viewer-close"
            @click="open = false"
          />
          <span
            v-if="multiple"
            class="absolute right-2 bottom-2 z-10 rounded-full bg-black/55 px-2.5 py-0.5 text-xs font-medium text-white tabular-nums backdrop-blur-sm md:right-3 md:bottom-3"
            aria-live="polite"
            data-testid="photo-viewer-counter"
          >{{ current + 1 }} / {{ images.length }}</span>
        </div>
        <div
          v-if="multiple"
          ref="strip"
          class="flex gap-1.5 overflow-x-auto p-1 pt-3 md:gap-2"
        >
          <button
            v-for="(image, index) in images"
            :key="image.id"
            type="button"
            class="min-w-10 max-w-14 flex-1 cursor-pointer rounded-lg aspect-[56/40] first:ms-auto last:me-auto md:max-w-16 md:aspect-[64/44]"
            :class="current === index ? 'ring-2 ring-primary ring-offset-2 ring-offset-(--ui-bg)' : 'opacity-60 hover:opacity-100'"
            :aria-label="`Show photo ${index + 1} of ${images.length}`"
            :aria-current="current === index ? 'true' : undefined"
            :data-testid="`photo-viewer-thumb-${index}`"
            @click="showPhoto(index)"
          >
            <img
              :src="image.url"
              alt=""
              loading="lazy"
              class="size-full rounded-lg object-cover"
            >
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
