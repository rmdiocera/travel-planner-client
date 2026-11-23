<script setup lang="ts">
// Each placeholder stands in for a screenshot of that step, to be added later.
const steps = [
  {
    title: 'Create a trip',
    text: 'Give it a name and your travel dates.',
    placeholder: 'Screenshot: a new trip with its name and dates',
  },
  {
    title: 'Add places to each day',
    text: 'Find the places you want to see and put each one on the day you\'ll go.',
    placeholder: 'Screenshot: a day with its places',
  },
  {
    title: 'Keep notes and checklists',
    text: 'Make lists for the whole trip, like "Things to bring" or "Must see", with notes, checklists and places.',
    placeholder: 'Screenshot: a list with notes, a checklist and a place',
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
      >
        <div class="aspect-[4/3] grid place-items-center rounded-xl border border-default bg-default p-6 text-center text-sm text-dimmed">
          {{ step.placeholder }}
        </div>
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
