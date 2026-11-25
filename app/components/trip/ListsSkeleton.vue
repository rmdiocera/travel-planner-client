<template>
  <div
    class="flex flex-col gap-4"
    data-testid="lists-skeleton"
  >
    <div
      v-for="list in 2"
      :key="list"
      class="flex flex-col gap-3 rounded-md border border-default p-4"
    >
      <USkeleton class="h-5 w-40" />
      <USkeleton class="h-4 w-3/4" />
      <USkeleton class="h-4 w-1/2" />
    </div>
  </div>
</template>
