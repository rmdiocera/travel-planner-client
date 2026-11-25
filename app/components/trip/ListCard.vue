<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripListNameEditor from '~/components/trip/ListNameEditor.vue'
import TripListPlaceRow from '~/components/trip/ListPlaceRow.vue'
import TripNoteEditor from '~/components/trip/NoteEditor.vue'
import TripNoteItem from '~/components/trip/NoteItem.vue'
import { injectConfirmDelete, injectTripDialogs } from '~/composables/tripDialogs'
import { injectTripLists } from '~/composables/useTripLists'
import type { ItineraryList } from '~/types/list'
import { listDeleteText } from '~/utils/trip/deleteText'

const props = defineProps<{
  list: ItineraryList
  isFirst: boolean
  isLast: boolean
  // The list place opened in the lists column, if any: opening one closes the other.
  openItemId?: string | null
}>()

defineEmits<{
  toggleItem: [id: string]
}>()

const lists = injectTripLists()
const dialogs = injectTripDialogs()
const confirmDelete = injectConfirmDelete()

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

function askToDelete() {
  const count = (type: string) => props.list.items.filter(item => item.type === type).length
  const text = listDeleteText(props.list.name, { places: count('place'), checklists: count('checklist'), notes: count('note') })
  confirmDelete({ ...text, run: () => lists.deleteList(props.list) })
}

// "+ Note": nothing is created until Save, and the text stays in its box when saving fails.
const addingNote = ref(false)
const noteSaving = ref(false)
const noteError = ref('')

function startNote() {
  noteError.value = ''
  addingNote.value = true
}

async function saveNote(content: string) {
  noteSaving.value = true
  const result = await lists.createNote(props.list, content)
  noteSaving.value = false
  if (result.ok) {
    addingNote.value = false
  }
  else {
    noteError.value = result.error ?? ''
  }
}

// Cancelling after a failed save deletes the empty note the API already created.
async function cancelNote() {
  addingNote.value = false
  await lists.discardNoteDraft(props.list)
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
    { label: 'Delete list', icon: 'i-lucide-trash', color: 'error', onSelect: askToDelete },
  ],
])
</script>

<template>
  <section
    class="rounded-md border border-default p-4"
    data-testid="list-card"
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
    >
      <template
        v-for="(item, index) in list.items"
        :key="item.id"
      >
        <TripListPlaceRow
          v-if="item.type === 'place'"
          :list="list"
          :item="item"
          :is-first="index === 0"
          :is-last="index === list.items.length - 1"
          :open="openItemId === item.id"
          @toggle="$emit('toggleItem', item.id)"
        />
        <TripNoteItem
          v-else-if="item.type === 'note'"
          :list="list"
          :item="item"
          :is-first="index === 0"
          :is-last="index === list.items.length - 1"
        />
      </template>
      <TripNoteEditor
        v-if="addingNote"
        :error="noteError"
        :saving="noteSaving"
        @save="saveNote"
        @cancel="cancelNote"
      />
    </div>
    <div class="flex flex-wrap gap-2 border-t border-default pt-3">
      <UButton
        label="Place"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
        data-testid="list-add-place-btn"
        @click="dialogs.openPlaceSearch({ kind: 'list', list })"
      />
      <UButton
        label="Note"
        icon="i-lucide-plus"
        variant="outline"
        size="xs"
        data-testid="list-add-note-btn"
        @click="startNote"
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
