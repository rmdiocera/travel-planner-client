<template>
  <NuxtLayout :name="layout">
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
import EmptyState from '~/components/ui/EmptyState.vue'
import TripDaysSkeleton from '~/components/trip/DaysSkeleton.vue'
import TripDayCard from '~/components/trip/DayCard.vue'
import TripHeader from '~/components/trip/Header.vue'
import TripOutsideSection from '~/components/trip/OutsideSection.vue'
import { tripDaysKey, useTripDays } from '~/composables/useTripDays'
import type { Itinerary, ItineraryResponse } from '~/types/itinerary'

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
const { pending: daysPending, error: daysError, refresh: refreshDays, days: tripDays, outside } = days

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
