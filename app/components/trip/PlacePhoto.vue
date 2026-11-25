<script setup lang="ts">
import type { NestedPlace } from '~/types/place'

const props = defineProps<{
  place: NestedPlace
}>()

const url = computed(() => props.place.images[0]?.url)

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
  <!-- A plain img, not NuxtImg: the API serves full-size files from its own host and no resizing is set up for them. -->
  <img
    v-if="showPhoto"
    :src="url"
    alt=""
    loading="lazy"
    class="size-10 shrink-0 rounded-md object-cover"
    data-testid="place-photo"
    @error="failedUrl = url"
  >
  <div
    v-else
    class="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10"
    data-testid="place-photo-placeholder"
  >
    <UIcon
      name="i-lucide-map-pin"
      class="text-primary"
    />
  </div>
</template>
