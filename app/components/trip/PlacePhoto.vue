<script setup lang="ts">
import TripPhotoViewer from '~/components/trip/PhotoViewer.vue'
import type { NestedPlace } from '~/types/place'

const props = defineProps<{
  place: NestedPlace
}>()

const url = computed(() => props.place.images[0]?.url)
const photoCount = computed(() => props.place.images.length)
const label = computed(() => photoCount.value > 1
  ? `View ${photoCount.value} photos of ${props.place.name}`
  : `View photo of ${props.place.name}`)

// The img is only rendered once the page is in the browser. One in the server HTML can fail before Vue
// attaches @error, and the failure is then never seen, which would leave a broken image.
const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

// An image file can be missing from the API's storage, so a failed load is remembered until the URL changes.
const failedUrl = ref<string>()
const showPhoto = computed(() => mounted.value && !!url.value && failedUrl.value !== url.value)
</script>

<template>
  <!-- The photo is the viewer's trigger: a click opens all of the place's photos. Without a photo there is nothing to open. -->
  <TripPhotoViewer
    v-if="showPhoto"
    :place="place"
  >
    <button
      type="button"
      class="relative block shrink-0 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :aria-label="label"
      data-testid="place-photo-btn"
    >
      <!-- A plain img, not NuxtImg: the API serves full-size files from its own host and no resizing is set up for them. -->
      <img
        :src="url"
        alt=""
        loading="lazy"
        class="size-19 shrink-0 rounded-md object-cover md:h-24 md:w-36"
        data-testid="place-photo"
        @error="failedUrl = url"
      >
      <span
        v-if="photoCount > 1"
        class="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-black/60 py-0.5 pr-1.5 pl-1 text-[10px] font-semibold text-white backdrop-blur-sm md:bottom-1.5 md:left-1.5 md:gap-1 md:pr-2 md:pl-1.5 md:text-[11px]"
        aria-hidden="true"
        data-testid="place-photo-chip"
      >
        <UIcon
          name="i-lucide-images"
          class="size-2.5 md:size-3"
        />
        {{ photoCount }}
      </span>
    </button>
  </TripPhotoViewer>
  <div
    v-else
    class="flex size-19 shrink-0 items-center justify-center rounded-md bg-primary/10 md:h-24 md:w-36"
    data-testid="place-photo-placeholder"
  >
    <UIcon
      name="i-lucide-map-pin"
      class="size-8 text-primary md:size-10"
      data-testid="place-photo-pin"
    />
  </div>
</template>
