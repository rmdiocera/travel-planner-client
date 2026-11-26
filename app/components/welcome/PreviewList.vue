<script setup lang="ts">
import WelcomePreviewPhoto from '~/components/welcome/PreviewPhoto.vue'

// Sample data, drawn like a list on the trip page: a place, a note and a checklist.
// Add a file in public/ (e.g. '/welcome/tsukiji.jpg') to show the place's photo.
const placePhoto: string | undefined = undefined
const entries = [
  { label: 'teamLab Planets', checked: true },
  { label: 'Shibuya Sky', checked: false },
]
</script>

<template>
  <section class="rounded-md border border-default bg-default p-4">
    <div class="flex items-center justify-between gap-2">
      <p class="min-w-0 flex-1 truncate font-semibold">
        Must see
      </p>
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="List options"
      />
    </div>
    <div class="flex flex-col">
      <div>
        <div class="flex items-center gap-3 py-3">
          <div class="flex min-w-0 flex-1 items-center gap-3">
            <p class="line-clamp-2 min-w-0 flex-1 wrap-anywhere font-medium">
              Tsukiji Outer Market
            </p>
            <WelcomePreviewPhoto :src="placePhoto" />
          </div>
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Place options"
          />
        </div>
        <p class="pb-2 text-xs text-primary">
          On day 2
        </p>
      </div>
      <div class="flex items-start gap-2 border-t border-default py-3">
        <UIcon
          name="i-lucide-file-text"
          class="mt-0.5 shrink-0 text-muted"
        />
        <p class="min-w-0 flex-1 text-sm">
          Tsukiji: go early, most stalls close by 2 PM.
        </p>
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Note options"
        />
      </div>
      <div class="border-t border-default py-3">
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-list-checks"
            class="shrink-0 text-muted"
          />
          <p class="min-w-0 flex-1 truncate text-sm font-medium">
            Book ahead
          </p>
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="sm"
            aria-label="Checklist options"
          />
        </div>
        <div class="mt-1 flex flex-col pl-6">
          <div
            v-for="entry in entries"
            :key="entry.label"
            class="flex items-center gap-2 py-1"
          >
            <UCheckbox
              :model-value="entry.checked"
              :aria-label="entry.label"
            />
            <span
              class="text-sm"
              :class="entry.checked ? 'text-dimmed line-through' : ''"
            >{{ entry.label }}</span>
          </div>
          <UButton
            label="Add an item"
            icon="i-lucide-plus"
            variant="link"
            size="xs"
            class="self-start px-0"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-wrap gap-2 border-t border-default pt-3">
      <UButton
        label="Place"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
      />
      <UButton
        label="Note"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
      />
      <UButton
        label="Checklist"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
      />
    </div>
  </section>
</template>
