<script setup lang="ts">
import WelcomePreviewPhoto from '~/components/welcome/PreviewPhoto.vue'
import { formatDayDate } from '~/utils/trip/days'

type PreviewStop = {
  name: string
  // A stop has both times or neither.
  time?: { start: string, end: string }
  // A file in public/, e.g. '/welcome/senso-ji.jpg'. Without one the placeholder shows.
  photo?: string
}

// Sample data, drawn like the trip page's days on a phone (the time under the name, none for "any time").
// Day 1 uses the hero's Tokyo places.
const days: { number: number, date: string, stops: PreviewStop[] }[] = [
  {
    number: 1,
    date: '2027-03-28',
    stops: [
      { name: 'Senso-ji', time: { start: '09:00', end: '10:30' } },
      { name: 'Tokyo Skytree', time: { start: '11:00', end: '12:30' } },
      { name: 'Meiji Jingu' },
    ],
  },
  {
    number: 2,
    date: '2027-03-29',
    stops: [
      { name: 'Tsukiji Outer Market', time: { start: '08:00', end: '09:30' } },
    ],
  },
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <section
      v-for="day in days"
      :key="day.number"
      class="rounded-md border border-default bg-default p-4"
    >
      <p class="flex items-center gap-2 font-semibold">
        Day {{ day.number }}
        <span class="font-normal text-muted">{{ formatDayDate(day.date) }}</span>
      </p>
      <div>
        <div
          v-for="stop in day.stops"
          :key="stop.name"
          class="flex items-center gap-3 border-t border-default py-3 first:border-t-0"
        >
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <div class="min-w-0 flex-1">
              <p class="line-clamp-2 wrap-anywhere font-medium">
                {{ stop.name }}
              </p>
              <p
                v-if="stop.time"
                class="text-sm font-medium tabular-nums text-primary"
              >
                {{ stop.time.start }} – {{ stop.time.end }}
              </p>
            </div>
            <WelcomePreviewPhoto :src="stop.photo" />
          </div>
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Stop options"
          />
        </div>
      </div>
      <UButton
        label="Add place"
        variant="link"
        icon="i-lucide-plus"
        class="px-0"
      />
    </section>
  </div>
</template>
