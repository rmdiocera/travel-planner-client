<script setup lang="ts">
import TripStopRow from '~/components/trip/StopRow.vue'
import type { TripDayWithStops } from '~/composables/useTripDays'
import { formatDayDate } from '~/utils/trip/days'

defineProps<{
  day: TripDayWithStops
  isToday: boolean
  // Stops lit for a moment after they were added.
  highlightedIds?: string[]
  // The stop opened in the days column, if any: opening one closes the other.
  openStopId?: string | null
}>()

defineEmits<{
  addPlace: [day: TripDayWithStops]
  toggleStop: [id: string]
}>()
</script>

<template>
  <section
    :id="`day-${day.date}`"
    class="rounded-md border p-4"
    :class="isToday ? 'border-primary' : 'border-default'"
    data-testid="trip-day"
  >
    <h2 class="flex items-center gap-2 font-semibold">
      Day {{ day.number }}
      <span class="font-normal text-muted">{{ formatDayDate(day.date) }}</span>
      <UBadge
        v-if="isToday"
        label="Today"
        color="primary"
        class="ml-auto"
      />
    </h2>
    <p
      v-if="!day.stops.length"
      class="py-2 text-sm text-dimmed"
    >
      Nothing planned yet.
    </p>
    <div v-else>
      <TripStopRow
        v-for="(stop, index) in day.stops"
        :key="stop.id"
        :stop="stop"
        variant="day"
        :highlighted="highlightedIds?.includes(stop.id)"
        :open="openStopId === stop.id"
        :is-first="index === 0"
        :is-last="index === day.stops.length - 1"
        @toggle="$emit('toggleStop', stop.id)"
      />
    </div>
    <UButton
      label="Add place"
      variant="link"
      icon="i-lucide-plus"
      class="px-0"
      data-testid="add-place-btn"
      @click="$emit('addPlace', day)"
    />
  </section>
</template>
