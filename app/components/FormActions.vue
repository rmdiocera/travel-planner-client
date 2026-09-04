<script setup lang="ts">
defineProps<{
  isLoading: boolean
  useCustomClasses: boolean
}>()

const emit = defineEmits<{
  cancel: []
  submit: []
}>()
</script>

<template>
  <UButton
    :class="useCustomClasses ? 'basis-1/3' : ''"
    label="Cancel"
    color="neutral"
    variant="outline"
    :disabled="isLoading"
    @click="emit('cancel')"
  />
  <UButton
    :class="useCustomClasses ? 'basis-2/3' : ''"
    label="Create"
    color="primary"
    :loading="isLoading"
    data-testid="create-itinerary-btn"
    @click="emit('submit')"
  />
</template>
