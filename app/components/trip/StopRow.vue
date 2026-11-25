<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripPlaceDetails from '~/components/trip/PlaceDetails.vue'
import TripPlacePhoto from '~/components/trip/PlacePhoto.vue'
import TripTimesEditor from '~/components/trip/TimesEditor.vue'
import { injectTripDialogs } from '~/composables/tripDialogs'
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
const dialogs = injectTripDialogs()

// Edit times shows Arrive and Leave in the opened row, in place of its buttons.
const editingTimes = ref(false)
const rowEl = useTemplateRef<HTMLElement>('rowEl')

// The editor's buttons go away when it closes, so focus goes back to the Edit times button.
async function closeTimesEditor() {
  editingTimes.value = false
  await nextTick()
  rowEl.value?.querySelector<HTMLElement>('[data-testid="stop-edit-times-btn"]')?.focus()
}
watch(() => props.open, (open) => {
  if (!open) {
    editingTimes.value = false
  }
})

// Move up and Move down do what dragging does, for people who can't or don't drag. They are for stops on a day.
const orderItems = computed<DropdownMenuItem[]>(() => props.variant === 'day'
  ? [
      {
        label: 'Move up',
        icon: 'i-lucide-arrow-up',
        disabled: !!props.isFirst,
        onSelect: () => {
          void days.moveStop(props.stop, -1)
        },
      },
      {
        label: 'Move down',
        icon: 'i-lucide-arrow-down',
        disabled: !!props.isLast,
        onSelect: () => {
          void days.moveStop(props.stop, 1)
        },
      },
    ]
  : [])

const menuItems = computed<DropdownMenuItem[][]>(() => [[
  ...orderItems.value,
  {
    label: 'Move to another day',
    icon: 'i-lucide-calendar-days',
    // A trip without dates has no days to move to.
    disabled: days.days.value.length === 0,
    onSelect: () => dialogs.openDayPicker({ mode: 'move', stop: props.stop }),
  },
  {
    label: props.variant === 'day' ? 'Remove from day' : 'Remove from trip',
    icon: 'i-lucide-calendar-minus',
    onSelect: () => {
      void days.removeStop(props.stop)
    },
  },
]])

// On a phone the time (or, for an outside stop, its date) sits under the name; from 768px up it has its own column.
const inlineTime = computed<string | null>(() => {
  if (props.variant === 'outside') {
    return formatDayDate(visitDate(props.stop))
  }
  const start = formatTime(props.stop.start_time)
  const end = formatTime(props.stop.end_time)
  return start && end ? `${start} – ${end}` : start
})
</script>

<template>
  <div
    ref="rowEl"
    class="group border-t border-default transition-colors first:border-t-0"
    :class="highlighted ? 'bg-primary/10' : ''"
    data-testid="trip-stop"
  >
    <div class="flex items-center gap-3 py-3">
      <!-- The grip shows when a mouse points at the row. On touch the whole row drags, after a press and hold. -->
      <span
        v-if="variant === 'day'"
        data-drag-handle
        class="hidden cursor-grab text-dimmed pointer-fine:group-hover:flex"
      >
        <UIcon name="i-lucide-grip-vertical" />
      </span>
      <button
        type="button"
        class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        :aria-expanded="open ? 'true' : 'false'"
        :data-testid="`stop-toggle-${stop.id}`"
        @click="$emit('toggle')"
      >
        <div
          class="hidden w-14 shrink-0 text-sm tabular-nums md:block"
          data-testid="stop-time"
        >
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
          <p class="line-clamp-2 wrap-anywhere font-medium">
            {{ stop.place.name }}
          </p>
          <p
            v-if="inlineTime"
            class="text-sm font-medium tabular-nums md:hidden"
            :class="variant === 'outside' ? 'text-warning' : 'text-primary'"
            data-testid="stop-time-inline"
          >
            {{ inlineTime }}
          </p>
          <!-- aria-hidden: the preview sits inside the toggle button, so it would otherwise be read out with the button's name. -->
          <p
            v-if="!open && stop.place.details?.trim()"
            class="hidden text-sm text-muted md:line-clamp-2"
            aria-hidden="true"
            data-testid="place-details-preview"
          >
            {{ stop.place.details }}
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
            class="absolute -right-1 -top-1 flex size-5.5 items-center justify-center rounded-full bg-primary text-inverted md:size-6"
            data-testid="stop-visited-badge"
          >
            <UIcon
              name="i-lucide-check"
              class="size-3.5 md:size-4"
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
        @close="closeTimesEditor"
      />
      <UButton
        v-if="!editingTimes"
        :label="stop.marked_visited ? 'Mark as not visited' : 'Mark as visited'"
        icon="i-lucide-check"
        variant="outline"
        size="sm"
        :aria-disabled="days.isSaving(stop.id) ? 'true' : undefined"
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
