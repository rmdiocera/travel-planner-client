<template>
  <div
    class="flex flex-col gap-4"
    data-testid="days-skeleton"
  >
    <USkeleton class="h-7 w-2/3" />
    <USkeleton class="h-4 w-1/3" />
    <div
      v-for="day in 3"
      :key="day"
      class="flex flex-col gap-3 rounded-md border border-default p-4"
    >
      <USkeleton class="h-5 w-32" />
      <div
        v-for="stop in 2"
        :key="stop"
        class="flex items-center gap-3"
      >
        <USkeleton class="h-8 w-10" />
        <div class="flex flex-1 flex-col gap-2">
          <USkeleton class="h-4 w-3/4" />
          <USkeleton class="h-3 w-1/3" />
        </div>
        <USkeleton class="size-10 rounded-md" />
      </div>
    </div>
  </div>
</template>
