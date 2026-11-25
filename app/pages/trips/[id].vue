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
      <TripHeader
        v-else
        :trip="trip"
        :today="today"
      />
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import EmptyState from '~/components/ui/EmptyState.vue'
import TripDaysSkeleton from '~/components/trip/DaysSkeleton.vue'
import TripHeader from '~/components/trip/Header.vue'
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
