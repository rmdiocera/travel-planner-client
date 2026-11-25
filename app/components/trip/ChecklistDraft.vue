<script setup lang="ts">
import { injectTripLists } from '~/composables/useTripLists'
import type { ItineraryList, ListItem } from '~/types/list'

const props = defineProps<{
  list: ItineraryList
}>()

const emit = defineEmits<{
  created: [item: ListItem]
  cancel: []
}>()

const lists = injectTripLists()

// Nothing is created until a title or a first item is saved: a blank checklist creates nothing.
const title = ref('')
const label = ref('')
const saving = ref(false)

const canSave = computed(() => !saving.value && (!!title.value.trim() || !!label.value.trim()))

async function save() {
  if (!canSave.value) {
    return
  }

  saving.value = true
  const created = await lists.createChecklist(props.list, title.value.trim() || null)
  if (created) {
    const firstItem = label.value.trim()
    if (firstItem) {
      await lists.addEntry(props.list, created, firstItem)
    }
    emit('created', created)
  }
  saving.value = false
}
</script>

<template>
  <div class="flex flex-col gap-2 py-2">
    <UInput
      v-model="title"
      autofocus
      maxlength="255"
      placeholder="Title (optional)"
      aria-label="Checklist title"
      class="w-full"
      data-testid="checklist-title-input"
      @keydown.esc="emit('cancel')"
    />
    <UInput
      v-model="label"
      maxlength="255"
      placeholder="Add an item"
      aria-label="First item"
      class="w-full"
      data-testid="checklist-item-input"
      @keydown.enter.prevent="save"
      @keydown.esc="emit('cancel')"
    />
    <p class="text-xs text-dimmed">
      Press Enter to add the next one.
    </p>
    <div class="flex justify-end gap-2">
      <UButton
        label="Cancel"
        variant="ghost"
        color="neutral"
        size="sm"
        :disabled="saving"
        data-testid="checklist-cancel-btn"
        @click="emit('cancel')"
      />
      <UButton
        label="Save"
        size="sm"
        :loading="saving"
        :disabled="!canSave"
        data-testid="checklist-save-btn"
        @click="save"
      />
    </div>
  </div>
</template>
