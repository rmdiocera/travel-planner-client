<script setup lang="ts">
// The trip page's place photo at its phone size (76px). Without a photo it shows the same map-pin placeholder.
defineProps<{
  src?: string
}>()
</script>

<template>
  <NuxtImg
    v-if="src"
    :src="src"
    alt=""
    width="152"
    height="152"
    class="size-19 shrink-0 rounded-md object-cover"
  />
  <div
    v-else
    class="flex size-19 shrink-0 items-center justify-center rounded-md bg-primary/10"
  >
    <UIcon
      name="i-lucide-map-pin"
      class="size-8 text-primary"
    />
  </div>
</template>
