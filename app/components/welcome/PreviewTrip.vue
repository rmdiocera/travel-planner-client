<script setup lang="ts">
import { tripDateLine } from '~/utils/trip/days'

// Sample data, drawn like a card in the Trips page's Upcoming group.
const dateLine = tripDateLine('2027-03-28', '2027-04-03')
</script>

<template>
  <div class="flex flex-col gap-2">
    <p class="itinerary-heading">
      Upcoming
    </p>
    <div class="relative">
      <div class="aspect-video overflow-hidden">
        <NuxtImg
          src="/oc1.jpg"
          alt=""
          class="size-full rounded-md object-cover"
        />
      </div>
      <div class="flex flex-col px-2 py-4">
        <p class="font-semibold">
          Japan in spring
        </p>
        <p class="flex items-center gap-2 text-sm text-pretty text-muted">
          <UIcon name="i-lucide-calendar-1" />
          {{ dateLine }}
        </p>
      </div>
      <UButton
        icon="i-lucide-ellipsis"
        color="primary"
        variant="ghost"
        size="sm"
        aria-label="Trip options"
        class="absolute top-2 right-2"
        :ui="{ base: 'rounded-full text-white bg-black/25' }"
      />
    </div>
  </div>
</template>
