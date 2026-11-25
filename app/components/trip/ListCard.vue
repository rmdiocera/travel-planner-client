<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripListNameEditor from '~/components/trip/ListNameEditor.vue'
import { injectTripLists } from '~/composables/useTripLists'
import type { ItineraryList } from '~/types/list'

const props = defineProps<{
  list: ItineraryList
  isFirst: boolean
  isLast: boolean
}>()

const emit = defineEmits<{
  delete: [list: ItineraryList]
}>()

const lists = injectTripLists()

const renaming = ref(false)
const renameError = ref('')
const renameSaving = ref(false)

async function saveName(name: string) {
  renameSaving.value = true
  const result = await lists.renameList(props.list, name)
  renameSaving.value = false
  if (result.ok) {
    renaming.value = false
    renameError.value = ''
  }
  else {
    renameError.value = result.error ?? ''
  }
}

function startRename() {
  renameError.value = ''
  renaming.value = true
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    { label: 'Rename', icon: 'i-lucide-pencil', onSelect: startRename },
    {
      label: 'Move up',
      icon: 'i-lucide-arrow-up',
      disabled: props.isFirst,
      onSelect: () => {
        void lists.moveList(props.list, -1)
      },
    },
    {
      label: 'Move down',
      icon: 'i-lucide-arrow-down',
      disabled: props.isLast,
      onSelect: () => {
        void lists.moveList(props.list, 1)
      },
    },
  ],
  [
    { label: 'Delete list', icon: 'i-lucide-trash', color: 'error', onSelect: () => emit('delete', props.list) },
  ],
])
</script>

<template>
  <section
    class="rounded-md border border-default p-4"
    :data-testid="`list-card`"
  >
    <header class="flex items-center justify-between gap-2">
      <TripListNameEditor
        v-if="renaming"
        class="flex-1"
        :initial="list.name"
        :error="renameError"
        :saving="renameSaving"
        @save="saveName"
        @cancel="renaming = false"
      />
      <template v-else>
        <h3 class="min-w-0 flex-1 truncate font-semibold">
          {{ list.name }}
        </h3>
        <UDropdownMenu
          :items="menuItems"
          :content="{ align: 'end', sideOffset: 4 }"
        >
          <UButton
            icon="i-lucide-ellipsis"
            color="neutral"
            variant="ghost"
            size="sm"
            :aria-label="`Options for ${list.name}`"
            :data-testid="`list-menu-btn-${list.id}`"
          />
        </UDropdownMenu>
      </template>
    </header>
    <div
      class="flex flex-col"
      data-testid="list-items"
    />
    <div class="flex flex-wrap gap-2 border-t border-default pt-3">
      <UButton
        label="Place"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
        data-testid="list-add-place-btn"
      />
      <UButton
        label="Note"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
        data-testid="list-add-note-btn"
      />
      <UButton
        label="Checklist"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
        data-testid="list-add-checklist-btn"
      />
    </div>
  </section>
</template>
