<script setup lang="ts">
// A picture of part of the app: screen readers get the label, and nothing inside can be clicked or focused.
defineProps<{
  label: string
  // Puts the content in the middle of the box instead of at the top.
  center?: boolean
  // Fades the bottom edge, for content that runs on past the box.
  fade?: boolean
}>()
</script>

<template>
  <div
    role="img"
    :aria-label="label"
    class="relative h-125 overflow-hidden rounded-xl border border-default bg-elevated"
    :class="center ? 'flex flex-col justify-center p-5' : 'px-5 pt-5'"
    data-testid="welcome-preview"
  >
    <div inert>
      <slot />
    </div>
    <div
      v-if="fade"
      class="absolute inset-x-0 bottom-0 h-20 bg-linear-to-b from-transparent to-(--ui-bg-elevated)"
    />
  </div>
</template>
