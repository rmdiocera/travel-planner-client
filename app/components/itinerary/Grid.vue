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
          class="w-full rounded-md"
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
