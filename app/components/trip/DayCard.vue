<script setup lang="ts">
import { insertNodeAt, removeNode, useSortable } from '@vueuse/integrations/useSortable'
import TripStopRow from '~/components/trip/StopRow.vue'
import { injectTripDays } from '~/composables/useTripDays'
import type { TripDayWithStops } from '~/composables/useTripDays'
import { formatDayDate } from '~/utils/trip/days'
import { moveId } from '~/utils/trip/order'

const props = defineProps<{
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

const tripDays = injectTripDays()

// Dragging: the grip with a mouse, press and hold on touch so scrolling never starts a drag.
// Sortable moves the row in the DOM itself, so it is put back and the order goes through reorderDay,
// which re-renders the rows (and sends the request).
const stopList = useTemplateRef<HTMLElement>('stopList')
const hasFinePointer = import.meta.client && typeof matchMedia === 'function' && matchMedia('(pointer: fine)').matches
useSortable(stopList, () => props.day.stops, {
  watchElement: true,
  animation: 150,
  delay: 300,
  delayOnTouchOnly: true,
  handle: hasFinePointer ? '[data-drag-handle]' : undefined,
  onUpdate(event) {
    removeNode(event.item)
    insertNodeAt(event.from, event.item, event.oldIndex!)
    void tripDays.reorderDay(props.day.date, moveId(props.day.stops.map(stop => stop.id), event.oldIndex!, event.newIndex!))
  },
})
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
      v-if="day.outOfOrder"
      class="flex items-center gap-1 pt-1 text-xs text-warning"
      data-testid="times-out-of-order"
    >
      <UIcon name="i-lucide-clock-alert" />
      Times out of order
    </p>
    <p
      v-if="!day.stops.length"
      class="py-2 text-sm text-dimmed"
    >
      Nothing planned yet.
    </p>
    <div
      v-else
      ref="stopList"
    >
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
