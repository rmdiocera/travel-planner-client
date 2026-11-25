<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Itinerary } from '~/types/itinerary'
import { isPastTrip, tripBadge } from '~/utils/trip/badge'
import { tripDateLine } from '~/utils/trip/days'

const props = defineProps<{
  trip: Itinerary
  // null until the page is in the browser: today's date comes from the traveller's clock, not the server's.
  today: string | null
}>()

const emit = defineEmits<{
  edit: []
  delete: []
}>()

const badge = computed(() => props.today ? tripBadge(props.trip.start_date, props.trip.end_date, props.today) : null)
const isPast = computed(() => !!props.today && isPastTrip(props.trip.end_date, props.today))

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Edit trip',
      icon: 'i-lucide-pencil',
      disabled: isPast.value,
      onSelect: () => emit('edit'),
    },
    ...(isPast.value ? [{ type: 'label' as const, label: 'Past trips can\'t be edited' }] : []),
  ],
  [
    {
      label: 'Delete trip',
      icon: 'i-lucide-trash',
      color: 'error' as const,
      onSelect: () => emit('delete'),
    },
  ],
])
</script>

<template>
  <div class="flex flex-col gap-2">
    <UButton
      label="Trips"
      variant="link"
      color="neutral"
      icon="i-lucide-arrow-left"
      to="/"
      class="self-start px-0"
      data-testid="trip-back-link"
    />
    <div class="flex items-start justify-between gap-4">
      <div class="flex flex-col gap-1">
        <h1
          class="text-xl font-semibold"
          data-testid="trip-name"
        >
          {{ trip.name }}
        </h1>
        <p class="text-muted text-sm flex flex-wrap items-center gap-2">
          <UIcon name="i-lucide-calendar-1" />
          <span data-testid="trip-dates">{{ tripDateLine(trip.start_date, trip.end_date) }}</span>
          <UBadge
            v-if="badge"
            :label="badge"
            :color="badge === 'Ended' ? 'neutral' : 'primary'"
            variant="soft"
            data-testid="trip-badge"
          />
        </p>
      </div>
      <UDropdownMenu
        :items="menuItems"
        :content="{ align: 'end', sideOffset: 4 }"
      >
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="outline"
          aria-label="Trip options"
          data-testid="trip-menu-btn"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
