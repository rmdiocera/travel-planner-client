<script setup lang="ts">
import { injectTripLists } from '~/composables/useTripLists'
import type { ChecklistEntry, ItineraryList, ListItem } from '~/types/list'

const props = defineProps<{
  list: ItineraryList
  item: ListItem
  entry: ChecklistEntry
  isFirst: boolean
  isLast: boolean
}>()

const lists = injectTripLists()

// Tapping the text edits it. The item being edited shows up, down and delete, which also make dragging optional.
const editing = ref(false)
const label = ref('')
const saving = ref(false)
const error = ref('')

function startEditing() {
  label.value = props.entry.label
  error.value = ''
  editing.value = true
}

async function save() {
  const text = label.value.trim()
  if (saving.value || !text) {
    return
  }
  if (text === props.entry.label) {
    editing.value = false
    return
  }

  saving.value = true
  const result = await lists.renameEntry(props.list, props.item, props.entry, text)
  saving.value = false
  if (result.ok) {
    editing.value = false
  }
  else {
    error.value = result.error ?? ''
  }
}

async function remove() {
  await lists.deleteEntry(props.list, props.item, props.entry)
}
</script>

<template>
  <div
    class="flex items-center gap-2 py-1"
    :data-testid="`entry-${entry.id}`"
  >
    <UCheckbox
      :model-value="!!entry.is_checked"
      :aria-label="`${entry.label}, ticked`"
      :data-testid="`entry-checkbox-${entry.id}`"
      @update:model-value="lists.toggleEntry(list, item, entry)"
    />
    <template v-if="editing">
      <UInput
        v-model="label"
        autofocus
        maxlength="255"
        aria-label="Item"
        class="flex-1"
        data-testid="entry-input"
        @keydown.enter.prevent="save"
        @keydown.esc="editing = false"
      />
      <UButton
        icon="i-lucide-arrow-up"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Move up"
        :disabled="isFirst"
        data-testid="entry-up-btn"
        @click="lists.moveEntry(list, item, entry, -1)"
      />
      <UButton
        icon="i-lucide-arrow-down"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Move down"
        :disabled="isLast"
        data-testid="entry-down-btn"
        @click="lists.moveEntry(list, item, entry, 1)"
      />
      <UButton
        icon="i-lucide-x"
        color="neutral"
        variant="ghost"
        size="xs"
        aria-label="Delete item"
        data-testid="entry-delete-btn"
        @click="remove"
      />
    </template>
    <button
      v-else
      type="button"
      class="min-w-0 flex-1 cursor-pointer text-left text-sm"
      :class="entry.is_checked ? 'text-dimmed line-through' : ''"
      :data-testid="`entry-text-${entry.id}`"
      @click="startEditing"
    >
      {{ entry.label }}
    </button>
  </div>
</template>
