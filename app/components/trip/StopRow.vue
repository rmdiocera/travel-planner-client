<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripPlaceDetails from '~/components/trip/PlaceDetails.vue'
import TripPlacePhoto from '~/components/trip/PlacePhoto.vue'
import TripTimesEditor from '~/components/trip/TimesEditor.vue'
import { injectTripDays } from '~/composables/useTripDays'
import type { Spot } from '~/types/spot'
import { formatDayDate, visitDate } from '~/utils/trip/days'
import { formatTime } from '~/utils/trip/times'

const props = defineProps<{
  stop: Spot
  // 'outside' is a stop on a date that isn't a day of the trip: its old date stands where its times would be.
  variant: 'day' | 'outside'
  highlighted?: boolean
  // Opened to show the place's details and its buttons.
  open?: boolean
  isFirst?: boolean
  isLast?: boolean
}>()

defineEmits<{
  toggle: []
}>()

const days = injectTripDays()

// Edit times shows Arrive and Leave in the opened row, in place of its buttons.
const editingTimes = ref(false)
watch(() => props.open, (open) => {
  if (!open) {
    editingTimes.value = false
  }
})

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
    class="border-t border-default transition-colors first:border-t-0"
    :class="highlighted ? 'bg-primary/10' : ''"
    data-testid="trip-stop"
  >
    <div class="flex items-center gap-3 py-3">
      <button
        type="button"
        class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        :aria-expanded="open ? 'true' : 'false'"
        :data-testid="`stop-toggle-${stop.id}`"
        @click="$emit('toggle')"
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
          <p
            v-if="stop.marked_visited"
            class="text-xs text-primary"
          >
            Visited
          </p>
        </div>
        <span class="relative">
          <TripPlacePhoto :place="stop.place" />
          <span
            v-if="stop.marked_visited"
            class="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-inverted"
          >
            <UIcon
              name="i-lucide-check"
              class="size-3"
            />
          </span>
        </span>
      </button>
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
    <TripPlaceDetails
      v-if="open"
      :place="stop.place"
    >
      <TripTimesEditor
        v-if="editingTimes"
        :stop="stop"
        class="w-full"
        @close="editingTimes = false"
      />
      <UButton
        v-if="!editingTimes"
        :label="stop.marked_visited ? 'Mark as not visited' : 'Mark as visited'"
        icon="i-lucide-check"
        variant="outline"
        size="sm"
        :disabled="days.isSaving(stop.id)"
        data-testid="stop-visited-btn"
        @click="days.setVisited(stop, !stop.marked_visited)"
      />
      <UButton
        v-if="!editingTimes"
        label="Edit times"
        icon="i-lucide-clock"
        variant="outline"
        color="neutral"
        size="sm"
        data-testid="stop-edit-times-btn"
        @click="editingTimes = true"
      />
    </TripPlaceDetails>
  </div>
</template>
