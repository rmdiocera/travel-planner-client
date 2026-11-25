<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripPlacePhoto from '~/components/trip/PlacePhoto.vue'
import { injectTripDays } from '~/composables/useTripDays'
import type { Spot } from '~/types/spot'
import { formatDayDate, visitDate } from '~/utils/trip/days'
import { formatTime } from '~/utils/trip/times'

const props = defineProps<{
  stop: Spot
  // 'outside' is a stop on a date that isn't a day of the trip: its old date stands where its times would be.
  variant: 'day' | 'outside'
  highlighted?: boolean
}>()

const days = injectTripDays()

const menuItems = computed<DropdownMenuItem[][]>(() => [[
  {
    label: props.variant === 'day' ? 'Remove from day' : 'Remove from trip',
    icon: 'i-lucide-calendar-minus',
    onSelect: () => {
      void days.removeStop(props.stop)
    },
  },
]])
</script>

<template>
  <div
    class="flex items-center gap-3 border-t border-default py-3 transition-colors first:border-t-0"
    :class="highlighted ? 'bg-primary/10' : ''"
    data-testid="trip-stop"
  >
    <div class="w-14 shrink-0 text-sm tabular-nums">
      <template v-if="variant === 'outside'">
        <span class="text-warning">{{ formatDayDate(visitDate(stop)) }}</span>
      </template>
      <template v-else-if="stop.start_time">
        <span>{{ formatTime(stop.start_time) }}</span>
        <span
          v-if="stop.end_time"
          class="block text-muted"
        >{{ formatTime(stop.end_time) }}</span>
      </template>
      <span
        v-else
        class="text-dimmed"
      >Any time</span>
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate font-medium">
        {{ stop.place.name }}
      </p>
      <p class="truncate text-sm text-muted">
        {{ stop.place.city }}
      </p>
    </div>
    <TripPlacePhoto :place="stop.place" />
    <UDropdownMenu
      :items="menuItems"
      :content="{ align: 'end', sideOffset: 4 }"
    >
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Stop options"
        :data-testid="`stop-menu-btn-${stop.id}`"
      />
    </UDropdownMenu>
  </div>
</template>
