<script setup lang="ts">
const props = defineProps<{
  initial: string
  // The API's message for the name, shown under the box.
  error?: string
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [name: string]
  cancel: []
}>()

const name = ref(props.initial)
const canSave = computed(() => !!name.value.trim() && !props.saving)

function save() {
  if (canSave.value) {
    emit('save', name.value.trim())
  }
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <UInput
      v-model="name"
      autofocus
      maxlength="255"
      aria-label="List name"
      class="w-full"
      data-testid="list-name-input"
      @keydown.enter.prevent="save"
      @keydown.esc="emit('cancel')"
    />
    <p
      v-if="error"
      role="alert"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <p
      v-else
      class="text-xs text-dimmed"
    >
      Name the list, like "Food to try" or "Packing".
    </p>
    <div class="flex justify-end gap-2">
      <UButton
        label="Cancel"
        variant="ghost"
        color="neutral"
        size="sm"
        :disabled="saving"
        data-testid="list-name-cancel-btn"
        @click="emit('cancel')"
      />
      <UButton
        label="Save"
        size="sm"
        :loading="saving"
        :disabled="!canSave"
        data-testid="list-name-save-btn"
        @click="save"
      />
    </div>
  </div>
</template>
