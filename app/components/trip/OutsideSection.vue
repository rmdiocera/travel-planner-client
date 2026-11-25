<script setup lang="ts">
import TripStopRow from '~/components/trip/StopRow.vue'
import type { Spot } from '~/types/spot'

defineProps<{
  stops: Spot[]
}>()
</script>

<template>
  <section
    id="outside-trip-dates"
    class="rounded-md border border-warning p-4"
    data-testid="outside-section"
  >
    <h2 class="flex items-center gap-2 font-semibold">
      <UIcon
        name="i-lucide-triangle-alert"
        class="text-warning"
      />
      Outside the trip dates
      <span class="font-normal text-muted">{{ stops.length }}</span>
    </h2>
    <p class="py-1 text-sm text-muted">
      Change the trip's dates to bring them back, or remove them.
    </p>
    <TripStopRow
      v-for="stop in stops"
      :key="stop.id"
      :stop="stop"
      variant="outside"
    />
  </section>
</template>
