<script setup lang="ts">
import type { NestedPlace } from '~/types/place'
import { mapsUrl, websiteHref } from '~/utils/trip/maps'

defineProps<{
  place: NestedPlace
}>()
</script>

<template>
  <div class="flex flex-col gap-2 pb-3 text-sm">
    <p
      v-if="place.details"
      class="text-muted"
    >
      {{ place.details }}
    </p>
    <p
      v-if="place.address"
      class="flex flex-wrap items-center gap-x-2"
    >
      <span>{{ place.address }}</span>
      <ULink
        :to="mapsUrl(place)"
        target="_blank"
        rel="noopener"
        class="inline-flex items-center gap-1 text-primary"
        data-testid="place-maps-link"
      >
        <UIcon name="i-lucide-map" />
        Open in Maps
      </ULink>
    </p>
    <ULink
      v-if="place.phone"
      :to="`tel:${place.phone}`"
      class="inline-flex items-center gap-1 self-start text-primary"
      data-testid="place-phone-link"
    >
      <UIcon name="i-lucide-phone" />
      {{ place.phone }}
    </ULink>
    <ULink
      v-if="place.website"
      :to="websiteHref(place.website)"
      target="_blank"
      rel="noopener"
      class="inline-flex items-center gap-1 self-start text-primary"
      data-testid="place-website-link"
    >
      <UIcon name="i-lucide-globe" />
      {{ place.website.replace(/^https?:\/\//, '') }}
    </ULink>
    <div class="flex flex-wrap gap-2 pt-1">
      <slot />
    </div>
  </div>
</template>
