<script setup lang="ts">
const props = defineProps<{
  initial?: string
  // The API's message for the text, shown under the box.
  error?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [content: string]
  cancel: []
}>()

const content = ref(props.initial ?? '')
const canSave = computed(() => !!content.value.trim() && !props.saving)

function save() {
  if (canSave.value) {
    emit('save', content.value.trim())
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 py-2">
    <UTextarea
      v-model="content"
      autoresize
      autofocus
      :rows="2"
      aria-label="Note"
      class="w-full"
      data-testid="note-input"
      @keydown.esc="emit('cancel')"
    />
    <p
      v-if="error"
      role="alert"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <div class="flex justify-end gap-2">
      <UButton
        label="Cancel"
        variant="ghost"
        color="neutral"
        size="sm"
        :disabled="saving"
        data-testid="note-cancel-btn"
        @click="emit('cancel')"
      />
      <UButton
        label="Save"
        size="sm"
        :loading="saving"
        :disabled="!canSave"
        data-testid="note-save-btn"
        @click="save"
      />
    </div>
  </div>
</template>
