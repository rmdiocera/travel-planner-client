<script setup lang="ts">
const open = defineModel<boolean>('open')
</script>

<template>
  <UModal
    v-model:open="open"
    :close="{
      'color': 'neutral',
      'variant': 'outline',
      'class': 'rounded-full',
      'data-testid': 'close-confirm-modal-btn',
    }"
  >

    <template #body>
      <slot name="description" />
    </template>

    <template #footer>
      <slot name="action" />
    </template>
  </UModal>
</template>
