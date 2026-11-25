<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripNoteEditor from '~/components/trip/NoteEditor.vue'
import { injectConfirmDelete } from '~/composables/tripDialogs'
import { injectTripLists } from '~/composables/useTripLists'
import type { ItineraryList, ListItem } from '~/types/list'
import { NOTE_DELETE_TEXT } from '~/utils/trip/deleteText'

const props = defineProps<{
  list: ItineraryList
  item: ListItem
  isFirst: boolean
  isLast: boolean
}>()

const lists = injectTripLists()
const confirmDelete = injectConfirmDelete()

// Tapping the text edits it in place. The text stays in its box when saving fails.
const editing = ref(false)
const saving = ref(false)
const error = ref('')

async function save(content: string) {
  saving.value = true
  const result = await lists.updateNote(props.list, props.item, content)
  saving.value = false
  if (result.ok) {
    editing.value = false
    error.value = ''
  }
  else {
    error.value = result.error ?? ''
  }
}

const menuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: 'Move up',
      icon: 'i-lucide-arrow-up',
      disabled: props.isFirst,
      onSelect: () => {
        void lists.moveItem(props.list, props.item, -1)
      },
    },
    {
      label: 'Move down',
      icon: 'i-lucide-arrow-down',
      disabled: props.isLast,
      onSelect: () => {
        void lists.moveItem(props.list, props.item, 1)
      },
    },
  ],
  [
    {
      label: 'Delete',
      icon: 'i-lucide-trash',
      color: 'error',
      onSelect: () => confirmDelete({ ...NOTE_DELETE_TEXT, run: () => lists.deleteItem(props.list, props.item) }),
    },
  ],
])
</script>

<template>
  <div
    class="border-t border-default first:border-t-0"
    :data-testid="`note-${item.id}`"
  >
    <TripNoteEditor
      v-if="editing"
      :initial="item.content ?? ''"
      :error="error"
      :saving="saving"
      @save="save"
      @cancel="editing = false"
    />
    <div
      v-else
      class="flex items-start gap-2 py-3"
    >
      <UIcon
        name="i-lucide-file-text"
        class="mt-0.5 shrink-0 text-muted"
      />
      <button
        type="button"
        class="min-w-0 flex-1 cursor-pointer whitespace-pre-line text-left text-sm"
        :data-testid="`note-text-${item.id}`"
        @click="editing = true"
      >
        {{ item.content }}
      </button>
      <UDropdownMenu
        :items="menuItems"
        :content="{ align: 'end', sideOffset: 4 }"
      >
        <UButton
          icon="i-lucide-ellipsis"
          color="neutral"
          variant="ghost"
          size="sm"
          aria-label="Note options"
          :data-testid="`item-menu-btn-${item.id}`"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
