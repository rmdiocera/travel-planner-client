<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import TripChecklistEntryRow from '~/components/trip/ChecklistEntryRow.vue'
import { injectConfirmDelete } from '~/composables/tripDialogs'
import { injectTripLists } from '~/composables/useTripLists'
import type { ItineraryList, ListItem } from '~/types/list'
import { checklistDeleteText } from '~/utils/trip/deleteText'

const props = defineProps<{
  list: ItineraryList
  item: ListItem
  isFirst: boolean
  isLast: boolean
  // Opens the add box focused, for a checklist that was just made.
  autoAdd?: boolean
}>()

const lists = injectTripLists()
const confirmDelete = injectConfirmDelete()

// The title: tap it to change it. No title shows "Add a title".
const editingTitle = ref(false)
const title = ref('')
const titleSaving = ref(false)

function startTitle() {
  title.value = props.item.title ?? ''
  editingTitle.value = true
}

async function saveTitle() {
  if (titleSaving.value) {
    return
  }

  titleSaving.value = true
  const result = await lists.setChecklistTitle(props.list, props.item, title.value.trim() || null)
  titleSaving.value = false
  if (result.ok) {
    editingTitle.value = false
  }
}

// "+ Add an item": Enter saves the item and opens the next box. Enter is ignored while a save is running.
const adding = ref(!!props.autoAdd)
const newLabel = ref('')
const adder = useTemplateRef<{ $el: HTMLElement }>('adder')
const addSaving = ref(false)

function focusAdder() {
  nextTick(() => {
    adder.value?.$el.querySelector('input')?.focus()
  })
}

function startAdding() {
  adding.value = true
  focusAdder()
}

// The checklist can be on screen a moment before it is flagged as new, so the flag is watched too.
watch(() => props.autoAdd, (flagged) => {
  if (flagged) {
    startAdding()
  }
})

async function addEntry() {
  const label = newLabel.value.trim()
  if (addSaving.value || !label) {
    return
  }

  addSaving.value = true
  const result = await lists.addEntry(props.list, props.item, label)
  addSaving.value = false
  if (result.ok) {
    newLabel.value = ''
    focusAdder()
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
      onSelect: () => confirmDelete({
        ...checklistDeleteText(props.item.title, props.item.checklist_items.length),
        run: () => lists.deleteItem(props.list, props.item),
      }),
    },
  ],
])
</script>

<template>
  <div
    class="border-t border-default py-3 first:border-t-0"
    :data-testid="`checklist-${item.id}`"
  >
    <div class="flex items-center gap-2">
      <UIcon
        name="i-lucide-list-checks"
        class="shrink-0 text-muted"
      />
      <UInput
        v-if="editingTitle"
        v-model="title"
        autofocus
        maxlength="255"
        aria-label="Checklist title"
        class="flex-1"
        data-testid="checklist-title-input"
        @keydown.enter.prevent="saveTitle"
        @keydown.esc="editingTitle = false"
      />
      <button
        v-else
        type="button"
        class="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-medium"
        :class="item.title ? '' : 'text-dimmed'"
        data-testid="checklist-title-btn"
        @click="startTitle"
      >
        {{ item.title || 'Add a title' }}
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
          aria-label="Checklist options"
          :data-testid="`item-menu-btn-${item.id}`"
        />
      </UDropdownMenu>
    </div>
    <div class="mt-1 flex flex-col pl-6">
      <TripChecklistEntryRow
        v-for="(entry, index) in item.checklist_items"
        :key="entry.id"
        :list="list"
        :item="item"
        :entry="entry"
        :is-first="index === 0"
        :is-last="index === item.checklist_items.length - 1"
      />
      <UInput
        v-if="adding"
        ref="adder"
        v-model="newLabel"
        autofocus
        maxlength="255"
        placeholder="Add an item"
        aria-label="New item"
        class="mt-1"
        data-testid="checklist-item-input"
        @keydown.enter.prevent="addEntry"
        @keydown.esc="adding = false"
      />
      <p
        v-if="adding"
        class="text-xs text-dimmed"
      >
        Press Enter to add the next one.
      </p>
      <UButton
        v-else
        label="Add an item"
        icon="i-lucide-plus"
        variant="link"
        size="xs"
        class="self-start px-0"
        data-testid="checklist-add-item-btn"
        @click="startAdding"
      />
    </div>
  </div>
</template>
