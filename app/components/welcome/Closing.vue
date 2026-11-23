<template>
  <!-- flex-1 stretches the band to the bottom of a tall window (the home layout is a min-h-screen column). -->
  <section class="flex-1 border-t border-teal-100 bg-teal-50 dark:border-teal-900 dark:bg-teal-950/40">
    <UContainer class="pt-18 pb-20 text-center">
      <h2 class="text-2xl lg:text-[30px] leading-tight font-bold tracking-tight text-highlighted">
        Ready to plan your next trip?
      </h2>
      <UButton
        label="Create account"
        color="primary"
        size="lg"
        to="/register"
        class="mt-5"
        data-testid="closing-register-btn"
      />
    </UContainer>
  </section>
</template>
