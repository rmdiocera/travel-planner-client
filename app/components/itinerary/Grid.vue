<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useWindowSize } from '@vueuse/core'
import type { Itinerary } from '~/types/itinerary'

const emit = defineEmits<{
  isModalOpen: [value: boolean]
  isSlideoverOpen: [value: boolean]
  isConfirmModalOpen: [value: boolean]
  isEditing: [value: boolean]
  selectedItinerary: [value: Itinerary]
}>()

defineProps<{
  itineraries: Itinerary[]
}>()

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

const items = (itinerary: Itinerary) => [
  {
    label: 'Edit',
    icon: 'i-lucide-pencil',
    onSelect: () => {
      if (!isMobile.value) {
        emit('isModalOpen', true)
      }
      else {
        emit('isSlideoverOpen', true)
      }

      emit('isEditing', true)
      emit('selectedItinerary', itinerary)
    },
    // A trip without dates isn't past, so it stays editable.
    disabled: !!itinerary.end_date && compareToToday(itinerary.end_date) < 0,
  },
  {
    label: 'Delete',
    color: 'error',
    icon: 'i-lucide-trash',
    onSelect: () => {
      emit('isConfirmModalOpen', true)
      emit('selectedItinerary', itinerary)
    },
  },
] satisfies DropdownMenuItem[]
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
          class="w-full h-full object-fit rounded-md"
        />
      </div>
      <UDropdownMenu
        :items="items(itinerary)"
        :content="{
          align: 'start',
          sideOffset: 4,
        }"
        class="absolute top-2 right-2"
      >
        <UButton
          icon="i-lucide-ellipsis"
          color="primary"
          variant="ghost"
          size="sm"
          :data-testid="`itinerary-menu-btn-${itinerary.id}`"
          :ui="{ base: 'rounded-full text-white bg-black/25 hover:bg-black/50 cursor-pointer' }"
        />
      </UDropdownMenu>
      <div class="flex flex-col px-2 py-4">
        <p class="font-semibold">
          {{ itinerary.name }}
        </p>
        <p class="text-muted text-pretty text-sm flex items-center gap-2">
          <UIcon name="i-lucide-calendar-1" />
          <template v-if="itinerary.start_date && itinerary.end_date">
            {{ formatStartEndDate(toLocalDate(itinerary.start_date), toLocalDate(itinerary.end_date)) }} • {{ dateDiffInDays(toLocalDate(itinerary.start_date), toLocalDate(itinerary.end_date)) }}
          </template>
          <template v-else>
            No dates yet
          </template>
        </p>
      </div>
    </div>
  </div>
</template>
