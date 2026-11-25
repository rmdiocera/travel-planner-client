<template>
  <NuxtLayout :name="layout">
    <ClientOnly>
      <Modal
        v-if="!isMobile"
        v-model:open="editOpen"
        title="Edit trip"
      >
        <template #form>
          <ItineraryForm
            ref="itineraryForm"
            :selected-itinerary="trip ?? undefined"
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
      >
        <template #form>
          <ItineraryForm
            ref="itineraryForm"
            :selected-itinerary="trip ?? undefined"
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
              :disabled="isLoading"
              @click="confirmOpen = false"
            />
            <UButton
              label="Delete"
              color="error"
              :loading="isLoading"
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
        <TripDaysSkeleton v-else-if="daysPending" />
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
            />
          </div>
          <TripOutsideSection
            v-if="outside.length"
            :stops="outside"
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
import TripHeader from '~/components/trip/Header.vue'
import TripOutsideSection from '~/components/trip/OutsideSection.vue'
import { useWindowSize } from '@vueuse/core'
import { tripDaysKey, useTripDays } from '~/composables/useTripDays'
import type { Itinerary, ItineraryResponse } from '~/types/itinerary'
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
const { pending: daysPending, error: daysError, refresh: refreshDays, days: tripDays, outside, stopCount } = days

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)
const { showToast } = useAppToast()
const client = useSanctumClient()

// One flag for the edit dialog: only the modal (computer) or the sheet (phone) is rendered.
const editOpen = ref(false)
const confirmOpen = ref(false)
const isLoading = ref(false)

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

  isLoading.value = true
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
    isLoading.value = false
  }
}

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
