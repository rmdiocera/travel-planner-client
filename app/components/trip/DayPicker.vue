<script setup lang="ts">
import { injectTripDays } from '~/composables/useTripDays'
import { formatDayDate } from '~/utils/trip/days'
import { formatTime } from '~/utils/trip/times'

defineProps<{
  // A day that can't be chosen, such as the stop's own day when moving it.
  disabledDate?: string
}>()

// The date of the chosen day.
const selected = defineModel<string | null>('selected', { default: null })

const { days } = injectTripDays()
</script>

<template>
  <div
    role="radiogroup"
    aria-label="Days of the trip"
    class="flex flex-col gap-2"
  >
    <div
      v-for="day in days"
      :key="day.date"
    >
      <button
        type="button"
        role="radio"
        :aria-checked="selected === day.date ? 'true' : 'false'"
        :disabled="day.date === disabledDate"
        class="flex w-full flex-col gap-1 rounded-md border p-3 text-left disabled:opacity-50"
        :class="selected === day.date ? 'border-primary bg-primary/5' : 'border-default'"
        :data-testid="`day-option-${day.date}`"
        @click="selected = day.date"
      >
        <span class="font-medium">
          Day {{ day.number }}
          <span class="font-normal text-muted">{{ formatDayDate(day.date) }}</span>
        </span>
        <span class="truncate text-sm text-muted">
          {{ day.stops.length ? day.stops.map(stop => stop.place.name).join(', ') : 'Nothing planned yet' }}
        </span>
      </button>
      <ul
        v-if="selected === day.date && day.stops.length"
        class="mt-1 flex flex-col gap-1 pl-3 text-sm"
        :data-testid="`day-times-${day.date}`"
      >
        <li
          v-for="stop in day.stops"
          :key="stop.id"
          class="flex gap-3"
        >
          <span class="w-24 shrink-0 tabular-nums text-muted">
            {{ stop.start_time ? `${formatTime(stop.start_time)}${stop.end_time ? `–${formatTime(stop.end_time)}` : ''}` : 'Any time' }}
          </span>
          <span class="truncate">{{ stop.place.name }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>
