<template>
  <!-- Shown when a mouse points at the row (the parent has the `group` class). On touch the row drags after a press and hold. -->
  <span
    class="hidden shrink-0 cursor-grab text-dimmed pointer-fine:group-hover:flex"
    aria-hidden="true"
  >
    <UIcon name="i-lucide-grip-vertical" />
  </span>
</template>
