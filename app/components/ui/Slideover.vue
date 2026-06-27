<script setup lang="ts">
const open = defineModel<boolean>('open')
</script>

<template>
  <USlideover
    v-model:open="open"
    :close="{
      'color': 'primary',
      'variant': 'outline',
      'class': 'rounded-full',
      'data-testid': 'close-slideover-btn',
    }"
  >
    <slot name="button" />

    <template #body>
      <slot name="form" />
    </template>

    <template #footer>
      <slot name="action" />
    </template>
  </USlideover>
</template>
