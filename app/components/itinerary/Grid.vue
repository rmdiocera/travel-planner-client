<script setup lang="ts">
import type { Itinerary } from '~/types/itinerary'

defineProps<{
  itineraries: Itinerary[]
}>()
</script>

<template>
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
    <div
      v-for="itinerary in itineraries"
      :key="itinerary.id"
      class="relative"
    >
      <div class="aspect-video overflow-hidden">
        <NuxtImg
          src="/oc1.jpg"
          class="w-full rounded-md"
        />
      </div>
      <UDropdownMenu class="absolute top-2 right-2">
        <UButton
          icon="i-lucide-ellipsis"
          color="primary"
          variant="ghost"
          size="sm"
          :ui="{ base: 'rounded-full text-white bg-black/25 hover:bg-black/50 cursor-pointer' }"
        />
      </UDropdownMenu>
      <div class="flex flex-col p-4">
        <p class="font-semibold">
          {{ itinerary.name }}
        </p>
        <p class="text-muted text-pretty text-sm flex items-center gap-2">
          <UIcon name="i-lucide-calendar-1" />{{ formatStartEndDate(new Date(itinerary.start_date), new Date(itinerary.end_date)) }} • {{ dateDiffInDays(new Date(itinerary.start_date), new Date(itinerary.end_date)) }}
        </p>
      </div>
    </div>
  </div>
</template>
