<template>
  <NuxtLayout :name="layout">
    <ClientOnly>
      <Modal
        v-if="!isMobile"
        v-model:open="editOpen"
        title="Edit trip"
        :dismissible="!isLoading"
      >
        <template #form>
          <ItineraryForm
            ref="itineraryForm"
            :selected-itinerary="trip ?? undefined"
            :stop-dates="stopDates"
            @loading="isLoading = $event"
            @is-modal-open="editOpen = $event"
            @itinerary-updated="mergeUpdatedTrip($event)"
          />
        </template>
        <template #action>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isLoading"
              @click="editOpen = false"
            />
            <UButton
              label="Save changes"
              color="primary"
              :loading="isLoading"
              data-testid="save-trip-btn"
              @click="triggerSubmit"
            />
          </div>
        </template>
      </Modal>
      <Slideover
        v-else
        v-model:open="editOpen"
        side="bottom"
        title="Edit trip"
        :dismissible="!isLoading"
      >
        <template #form>
          <ItineraryForm
            ref="itineraryForm"
            :selected-itinerary="trip ?? undefined"
            :stop-dates="stopDates"
            @loading="isLoading = $event"
            @is-modal-open="editOpen = $event"
            @itinerary-updated="mergeUpdatedTrip($event)"
          />
        </template>
        <template #action>
          <div class="flex w-full gap-2">
            <UButton
              block
              class="basis-1/3"
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isLoading"
              @click="editOpen = false"
            />
            <UButton
              block
              class="basis-2/3"
              label="Save changes"
              color="primary"
              :loading="isLoading"
              data-testid="save-trip-sheet-btn"
              @click="triggerSubmit"
            />
          </div>
        </template>
      </Slideover>
      <Modal
        v-if="!isMobile"
        v-model:open="searchOpen"
        :title="`Add places to ${searchLabel}`"
        :description="searchDay ? formatDayDate(searchDay.date) : undefined"
      >
        <template #form>
          <TripPlaceSearch
            :target-label="searchLabel"
            :add="addToDay"
            :is-on-target="isOnSearchDay"
            @added="addedPlaceNames.push($event.name)"
          />
        </template>
        <template #action>
          <div class="flex w-full justify-end">
            <UButton
              label="Done"
              color="primary"
              data-testid="place-search-done-btn"
              @click="searchOpen = false"
            />
          </div>
        </template>
      </Modal>
      <Slideover
        v-else
        v-model:open="searchOpen"
        side="bottom"
        :title="`Add places to ${searchLabel}`"
        :description="searchDay ? formatDayDate(searchDay.date) : undefined"
      >
        <template #form>
          <TripPlaceSearch
            :target-label="searchLabel"
            :add="addToDay"
            :is-on-target="isOnSearchDay"
            @added="addedPlaceNames.push($event.name)"
          />
        </template>
        <template #action>
          <UButton
            block
            label="Done"
            color="primary"
            data-testid="place-search-done-sheet-btn"
            @click="searchOpen = false"
          />
        </template>
      </Slideover>
      <Modal
        v-if="!isMobile"
        v-model:open="dayPickerOpen"
        :dismissible="!isMoving"
        title="Move to another day"
        :description="dayPickerStop?.place.name"
      >
        <template #form>
          <TripDayPicker
            v-model:selected="pickedDate"
            :disabled-date="dayPickerStop ? visitDate(dayPickerStop) : undefined"
          />
        </template>
        <template #action>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isMoving"
              @click="dayPickerOpen = false"
            />
            <UButton
              :label="pickedDayLabel"
              color="primary"
              :disabled="!pickedDate"
              :loading="isMoving"
              data-testid="day-picker-confirm-btn"
              @click="confirmMove"
            />
          </div>
        </template>
      </Modal>
      <Slideover
        v-else
        v-model:open="dayPickerOpen"
        :dismissible="!isMoving"
        side="bottom"
        title="Move to another day"
        :description="dayPickerStop?.place.name"
      >
        <template #form>
          <TripDayPicker
            v-model:selected="pickedDate"
            :disabled-date="dayPickerStop ? visitDate(dayPickerStop) : undefined"
          />
        </template>
        <template #action>
          <UButton
            block
            :label="pickedDayLabel"
            color="primary"
            :disabled="!pickedDate"
            :loading="isMoving"
            data-testid="day-picker-confirm-sheet-btn"
            @click="confirmMove"
          />
        </template>
      </Slideover>
      <ConfirmModal
        v-model:open="confirmOpen"
        title="Delete this trip?"
      >
        <template #description>
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :ui="{ root: 'items-center' }"
          >
            <template #title>
              This will permanently delete <strong>{{ trip?.name }}</strong>{{ tripDeleteTail(stopCount, 0) }}. This cannot be undone.
            </template>
          </UAlert>
        </template>
        <template #action>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isDeleting"
              @click="confirmOpen = false"
            />
            <UButton
              label="Delete"
              color="error"
              :loading="isDeleting"
              data-testid="delete-trip-btn"
              @click="handleDelete"
            />
          </div>
        </template>
      </ConfirmModal>
    </ClientOnly>
    <div class="flex flex-col gap-6 pt-6 pb-12">
      <EmptyState
        v-if="isNotFound"
        icon="i-lucide-map-pin-off"
        title="Trip not found"
        description="It may have been deleted, or the link may be wrong."
      >
        <template #action>
          <UButton
            label="Back to trips"
            color="primary"
            to="/"
            data-testid="back-to-trips-btn"
          />
        </template>
      </EmptyState>
      <EmptyState
        v-else-if="tripError"
        icon="i-lucide-triangle-alert"
        title="An unexpected error has occured."
        description="Something went wrong while fetching your data. Check your connection and try again."
        :ui="{ avatar: '[&>[data-slot=icon]]:text-error bg-error/10 rounded-xl' }"
      >
        <template #action>
          <UButton
            label="Try again"
            color="neutral"
            variant="outline"
            icon="i-lucide-refresh-cw"
            @click="refreshAll()"
          />
        </template>
      </EmptyState>
      <TripDaysSkeleton v-else-if="!trip" />
      <template v-else>
        <TripHeader
          :trip="trip"
          :today="today"
          @edit="editOpen = true"
          @delete="confirmOpen = true"
        />
        <EmptyState
          v-if="daysError"
          icon="i-lucide-triangle-alert"
          title="Your days couldn't be loaded"
          description="Check your connection and try again."
          :ui="{ avatar: '[&>[data-slot=icon]]:text-error bg-error/10 rounded-xl' }"
        >
          <template #action>
            <UButton
              label="Try again"
              color="neutral"
              variant="outline"
              icon="i-lucide-refresh-cw"
              @click="refreshDays()"
            />
          </template>
        </EmptyState>
        <TripDaysSkeleton v-else-if="daysInitialLoading" />
        <template v-else>
          <UAlert
            v-if="outside.length"
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :title="outsideNotice"
            :actions="[{ label: 'Show them', color: 'neutral', variant: 'outline', onClick: showOutside }]"
            data-testid="outside-notice"
          />
          <EmptyState
            v-if="!hasDates"
            icon="i-lucide-calendar-x"
            title="No dates yet"
            description="Add the trip's dates to plan what you'll do each day."
          >
            <template #action>
              <UButton
                label="Add dates"
                color="primary"
                icon="i-lucide-calendar"
                data-testid="add-dates-btn"
                @click="editOpen = true"
              />
            </template>
          </EmptyState>
          <div
            v-else
            class="flex flex-col gap-4"
          >
            <TripDayCard
              v-for="day in tripDays"
              :key="day.date"
              :day="day"
              :is-today="day.date === today"
              :highlighted-ids="highlightedIds"
              :open-stop-id="openStopId"
              @add-place="openSearch"
              @toggle-stop="toggleStop"
            />
          </div>
          <TripOutsideSection
            v-if="outside.length"
            :stops="outside"
            :open-stop-id="openStopId"
            @toggle-stop="toggleStop"
          />
        </template>
      </template>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import ItineraryForm from '~/components/itinerary/Form.vue'
import ConfirmModal from '~/components/ui/ConfirmModal.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import Modal from '~/components/ui/Modal.vue'
import Slideover from '~/components/ui/Slideover.vue'
import TripDaysSkeleton from '~/components/trip/DaysSkeleton.vue'
import TripDayCard from '~/components/trip/DayCard.vue'
import TripDayPicker from '~/components/trip/DayPicker.vue'
import TripHeader from '~/components/trip/Header.vue'
import TripOutsideSection from '~/components/trip/OutsideSection.vue'
import TripPlaceSearch from '~/components/trip/PlaceSearch.vue'
import { useWindowSize } from '@vueuse/core'
import { tripDialogsKey } from '~/composables/tripDialogs'
import type { DayPickerRequest } from '~/composables/tripDialogs'
import { tripDaysKey, useTripDays } from '~/composables/useTripDays'
import type { Itinerary, ItineraryResponse } from '~/types/itinerary'
import type { SearchPlace } from '~/composables/usePlaceSearch'
import type { Spot } from '~/types/spot'
import { formatDayDate, visitDate } from '~/utils/trip/days'
import { tripDeleteTail } from '~/utils/trip/deleteText'

definePageMeta({
  layout: false,
  middleware: ['sanctum:auth'],
})

const layout = 'home'

const id = String(useRoute().params.id)
const today = useClientToday()

const { data: tripData, error: tripError, refresh: refreshTrip } = useLazySanctumFetch<ItineraryResponse>(`/api/v1/itineraries/${id}`)

// Kept as its own ref so Edit trip can update it without a reload.
const trip = ref<Itinerary | null>(null)
watch(tripData, (response) => {
  trip.value = response?.data ?? null
}, { immediate: true })

const days = useTripDays(id, trip)
provide(tripDaysKey, days)
// Destructured because refs nested in an object aren't unwrapped in the template.
const { pending: daysPending, initialLoading: daysInitialLoading, error: daysError, refresh: refreshDays, days: tripDays, outside, stopCount } = days

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)
const { showToast } = useAppToast()
const client = useSanctumClient()

// One flag for the edit dialog: only the modal (computer) or the sheet (phone) is rendered.
const editOpen = ref(false)
const confirmOpen = ref(false)
// Saving Edit trip and deleting the trip each have their own flag, so one can't leave the other spinning.
const isLoading = ref(false)
const isDeleting = ref(false)
// The form reports through emits, and Vue drops those from a form that has closed, so a flag left on is cleared here.
watch(editOpen, (open) => {
  if (!open) {
    isLoading.value = false
  }
})

const itineraryFormRef = useTemplateRef('itineraryForm')
function triggerSubmit() {
  (itineraryFormRef.value as any)?.triggerSubmit()
}

// The form already shows "Trip updated successfully".
function mergeUpdatedTrip(response: ItineraryResponse) {
  if (trip.value) {
    trip.value = { ...trip.value, ...response.data }
  }
}

async function handleDelete() {
  if (!trip.value) {
    return
  }

  isDeleting.value = true
  try {
    await client<unknown>(`/api/v1/itineraries/${trip.value.id}`, { method: 'DELETE' })
    confirmOpen.value = false
    showToast('Trip deleted successfully', 'i-lucide-circle-check')
    await navigateTo('/')
  }
  catch {
    confirmOpen.value = false
    showToast('Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error')
  }
  finally {
    isDeleting.value = false
  }
}

// Adding places to a day: the search stays open until Done, and the toast then says what was added.
const searchOpen = ref(false)
const searchDate = ref('')
const addedPlaceNames = ref<string[]>([])
const addedStopIds = ref<string[]>([])
const highlightedIds = ref<string[]>([])
const searchDay = computed(() => tripDays.value.find(day => day.date === searchDate.value))
const searchLabel = computed(() => searchDay.value ? `day ${searchDay.value.number}` : '')

function openSearch(day: { date: string }) {
  searchDate.value = day.date
  addedPlaceNames.value = []
  addedStopIds.value = []
  searchOpen.value = true
}

async function addToDay(place: SearchPlace) {
  const stop = await days.addStop(place.id, searchDate.value)
  if (stop) {
    addedStopIds.value.push(stop.id)
  }
  return !!stop
}

function isOnSearchDay(placeId: string) {
  return !!searchDay.value?.stops.some(stop => stop.place_id === placeId)
}

watch(searchOpen, (open) => {
  if (open || !addedPlaceNames.value.length) {
    return
  }

  const count = addedPlaceNames.value.length
  showToast(`Added ${count} ${count === 1 ? 'place' : 'places'} to ${searchLabel.value}`, 'i-lucide-circle-check', addedPlaceNames.value.join(', '))

  // The new stops are lit for a moment, so the traveller can see where they landed.
  highlightedIds.value = [...addedStopIds.value]
  setTimeout(() => {
    highlightedIds.value = []
  }, 2000)
})

// The day picker: where a stop can be moved to. Components deep in the page ask for it through tripDialogs.
const dayPickerOpen = ref(false)
const dayPickerStop = ref<Spot | null>(null)
const pickedDate = ref<string | null>(null)
const isMoving = ref(false)

provide(tripDialogsKey, {
  openDayPicker(request: DayPickerRequest) {
    dayPickerStop.value = request.stop
    pickedDate.value = null
    dayPickerOpen.value = true
  },
})

const pickedDayLabel = computed(() => {
  const day = tripDays.value.find(tripDay => tripDay.date === pickedDate.value)
  return day ? `Move to day ${day.number}` : 'Move'
})

async function confirmMove() {
  if (!dayPickerStop.value || !pickedDate.value) {
    return
  }

  isMoving.value = true
  await days.moveToDay(dayPickerStop.value, pickedDate.value)
  isMoving.value = false
  dayPickerOpen.value = false
}

// One stop is open at a time in the days column.
const openStopId = ref<string | null>(null)
function toggleStop(id: string) {
  openStopId.value = openStopId.value === id ? null : id
}

// Every stop's date, for Edit trip's warning about stops that new dates would leave outside the trip.
const stopDates = computed(() => [...tripDays.value.flatMap(day => day.stops), ...outside.value].map(visitDate))

const hasDates = computed(() => !!trip.value?.start_date && !!trip.value?.end_date)

const outsideNotice = computed(() => outside.value.length === 1
  ? '1 place is on a day outside the trip.'
  : `${outside.value.length} places are on days outside the trip.`)

function showOutside() {
  document.getElementById('outside-trip-dates')?.scrollIntoView({ block: 'start' })
}

// During the trip the page opens at today, once the days are on screen.
let scrolledToToday = false
watch([today, daysPending, tripDays], async () => {
  if (scrolledToToday || !today.value || daysPending.value) {
    return
  }

  const day = tripDays.value.find(tripDay => tripDay.date === today.value)
  if (!day) {
    return
  }

  scrolledToToday = true
  await nextTick()
  document.getElementById(`day-${day.date}`)?.scrollIntoView({ block: 'start' })
}, { immediate: true })

// The API answers a trip that isn't yours with a 403, and one that doesn't exist with a 404. Both read the same,
// so a link doesn't tell anyone that someone else's trip exists.
const isNotFound = computed(() => {
  const statusCode = (tripError.value as { statusCode?: number } | null)?.statusCode
  return statusCode === 403 || statusCode === 404
})

async function refreshAll() {
  await Promise.all([refreshTrip(), days.refresh()])
}

useSeoMeta({
  title: () => trip.value ? `${trip.value.name} · Dayfarer` : 'Trip · Dayfarer',
})
</script>
