<script setup lang="ts">
defineProps<{
  icon?: string
  title?: string
  description?: string
}>()
</script>

<template>
  <UEmpty
    :icon="icon"
    :title="title"
    :description="description"
  >
    <template #footer>
      <slot name="action" />
    </template>
  </UEmpty>
</template>
