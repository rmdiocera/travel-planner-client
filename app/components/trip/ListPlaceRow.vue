<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripDragGrip from '~/components/trip/DragGrip.vue'
import TripPlaceDetails from '~/components/trip/PlaceDetails.vue'
import TripPlacePhoto from '~/components/trip/PlacePhoto.vue'
import { injectTripDialogs } from '~/composables/tripDialogs'
import { injectTripDays } from '~/composables/useTripDays'
import { injectTripLists } from '~/composables/useTripLists'
import type { ItineraryList, ListItem } from '~/types/list'
import { onDaysLabel } from '~/utils/trip/onDays'

const props = defineProps<{
  list: ItineraryList
  item: ListItem
  isFirst: boolean
  isLast: boolean
  // Opened to show the place's details. No visited mark or times: a list place is only being considered.
  open?: boolean
}>()

defineEmits<{
  toggle: []
}>()

const days = injectTripDays()
const lists = injectTripLists()
const dialogs = injectTripDialogs()

// The place was deleted from Dayfarer (the API leaves the list item with no place).
const place = computed(() => props.item.place?.place ?? null)
const onDays = computed(() => place.value ? onDaysLabel(days.daysWithPlace(place.value.id)) : null)

const remove: DropdownMenuItem = {
  label: 'Remove from list',
  icon: 'i-lucide-minus-circle',
  onSelect: () => {
    void lists.deleteItem(props.list, props.item)
  },
}

function addToDay() {
  if (place.value) {
    dialogs.openDayPicker({ mode: 'add', placeId: place.value.id, placeName: place.value.name })
  }
}

const menuItems = computed<DropdownMenuItem[][]>(() => {
  if (!place.value) {
    return [[remove]]
  }

  const noDays = days.days.value.length === 0
  return [
    [
      { label: 'Add to a day', icon: 'i-lucide-calendar-plus', disabled: noDays, onSelect: addToDay },
      ...(noDays ? [{ type: 'label' as const, label: 'Add the trip\'s dates first' }] : []),
      {
        label: 'Move up',
        icon: 'i-lucide-arrow-up',
        disabled: props.isFirst,
        onSelect: () => {
          void lists.moveItem(props.list, props.item, -1)
        },
      },
      {
        label: 'Move down',
        icon: 'i-lucide-arrow-down',
        disabled: props.isLast,
        onSelect: () => {
          void lists.moveItem(props.list, props.item, 1)
        },
      },
    ],
    [remove],
  ]
})
</script>

<template>
  <div
    class="group border-t border-default first:border-t-0"
    data-list-item
    :data-testid="`list-place-${item.id}`"
  >
    <div
      class="flex items-center gap-3 py-3"
      data-item-handle
    >
      <TripDragGrip />
      <p
        v-if="!place"
        class="flex-1 text-sm text-muted"
      >
        This place was removed
      </p>
      <template v-else>
        <button
          type="button"
          class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
          :aria-expanded="open ? 'true' : 'false'"
          :data-testid="`list-place-toggle-${item.id}`"
          @click="$emit('toggle')"
        >
          <div class="min-w-0 flex-1">
            <p class="line-clamp-2 wrap-anywhere font-medium">
              {{ place.name }}
            </p>
            <!-- aria-hidden: the preview sits inside the toggle button, so it would otherwise be read out with the button's name. -->
            <p
              v-if="!open && place.details?.trim()"
              class="hidden text-sm text-muted md:line-clamp-2"
              aria-hidden="true"
              data-testid="place-details-preview"
            >
              {{ place.details }}
            </p>
          </div>
          <TripPlacePhoto :place="place" />
        </button>
      </template>
      <UDropdownMenu
        :items="menuItems"
        :content="{ align: 'end', sideOffset: 4 }"
      >
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          size="sm"
          :aria-label="place ? `Options for ${place.name}` : 'Place options'"
          :data-testid="`item-menu-btn-${item.id}`"
        />
      </UDropdownMenu>
    </div>
    <div
      v-if="place"
      class="pb-2"
    >
      <p
        v-if="onDays"
        class="text-xs text-primary"
        data-testid="list-place-days"
      >
        {{ onDays }}
      </p>
      <UButton
        v-else
        label="Add to a day"
        variant="link"
        size="xs"
        class="px-0"
        data-testid="add-to-day-btn"
        :disabled="days.days.value.length === 0"
        @click="addToDay"
      />
    </div>
    <TripPlaceDetails
      v-if="open && place"
      :place="place"
    />
  </div>
</template>
