<script setup lang="ts">
import WelcomePreviewDay from '~/components/welcome/PreviewDay.vue'
import WelcomePreviewList from '~/components/welcome/PreviewList.vue'
import WelcomePreviewTrip from '~/components/welcome/PreviewTrip.vue'

// Each step shows a piece of the app, drawn from sample data (no request is made).
const steps = [
  {
    title: 'Create a trip',
    text: 'Give it a name and your travel dates.',
    preview: WelcomePreviewTrip,
    label: 'A trip card on the Trips page: Japan in spring, Mar 28 to Apr 3, 2027, 7 days.',
    center: true,
    fade: false,
  },
  {
    title: 'Add places to each day',
    text: 'Find the places you want to see and put each one on the day you\'ll go.',
    preview: WelcomePreviewDay,
    label: 'Day 1 of a trip, Sun 28 Mar: Senso-ji from 09:00 to 10:30, Tokyo Skytree from 11:00 to 12:30, and Meiji Jingu at any time.',
    center: false,
    fade: true,
  },
  {
    title: 'Keep notes and checklists',
    text: 'Make lists for the whole trip, like "Things to bring" or "Must see", with notes, checklists and places.',
    preview: WelcomePreviewList,
    label: 'A list called Must see, with the place Tsukiji Outer Market (on day 2), a note: Go early, most stalls close by 2 PM, and a checklist called Book ahead: teamLab Planets (ticked) and Shibuya Sky.',
    center: false,
    fade: false,
  },
]
</script>

<template>
  <!-- scroll-mt keeps the section clear of the sticky header when "See how it works" scrolls to it. -->
  <section
    id="how-it-works"
    class="scroll-mt-20 border-t border-default py-14 lg:py-18"
    aria-labelledby="how-it-works-heading"
  >
    <h2
      id="how-it-works-heading"
      tabindex="-1"
      class="text-2xl lg:text-[32px] leading-tight font-bold tracking-tight text-highlighted focus:outline-none"
    >
      How it works
    </h2>
    <p class="mt-1.5 text-lg text-toned">
      Plan a trip in three steps.
    </p>

    <ol class="mt-8 grid gap-8 lg:grid-cols-3">
      <li
        v-for="(step, i) in steps"
        :key="step.title"
        class="min-w-0"
      >
        <WelcomePreviewFrame
          :label="step.label"
          :center="step.center"
          :fade="step.fade"
        >
          <component :is="step.preview" />
        </WelcomePreviewFrame>
        <h3 class="mt-4.5 flex items-center gap-2 text-lg font-semibold text-highlighted">
          <span
            class="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary"
            aria-hidden="true"
          >{{ i + 1 }}</span>
          {{ step.title }}
        </h3>
        <p class="mt-1.5 text-toned">
          {{ step.text }}
        </p>
      </li>
    </ol>

    <p class="mt-9 flex items-center gap-1.5 text-toned">
      <UIcon
        name="i-lucide-laptop"
        class="size-5 shrink-0 text-primary"
      />
      <UIcon
        name="i-lucide-smartphone"
        class="size-5 shrink-0 text-primary"
      />
      <span class="ml-1">Make your plan on your computer, then open it on your phone during the trip.</span>
    </p>
  </section>
</template>
