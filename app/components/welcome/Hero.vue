<script setup lang="ts">
import { useWindowSize } from '@vueuse/core'

const { width } = useWindowSize()
// Matches the md breakpoint the wrapper classes below use.
const sceneLayout = computed(() => (width.value < 768 ? 'phone' : 'desktop'))

// The link scrolls to the section; this moves keyboard and screen reader focus there too.
async function focusHowItWorks() {
  await nextTick()
  document.getElementById('how-it-works-heading')?.focus({ preventScroll: true })
}
</script>

<template>
  <section class="py-12 lg:py-20 lg:grid lg:grid-cols-11 lg:gap-12 lg:items-center">
    <div class="lg:col-span-5">
      <h1 class="text-4xl lg:text-[52px] leading-tight lg:leading-[1.08] font-bold tracking-tight text-highlighted">
        {{ WELCOME_HEADLINE }}
      </h1>
      <p class="mt-4 max-w-[480px] text-lg text-toned">
        {{ WELCOME_TEXT }}
      </p>
      <div class="mt-7 flex flex-wrap items-center gap-3">
        <UButton
          label="Create account"
          color="primary"
          size="lg"
          to="/register"
          data-testid="hero-register-btn"
        />
        <UButton
          label="See how it works"
          color="neutral"
          variant="outline"
          size="lg"
          to="#how-it-works"
          data-testid="hero-how-btn"
          @click="focusHowItWorks"
        />
      </div>
    </div>

    <!-- Under 768px (the phone layout) the scene runs edge to edge; between 768px and 1024px it sits under the text. -->
    <div class="mt-10 lg:mt-0 lg:col-span-6 -mx-4 sm:-mx-6 md:mx-auto md:max-w-[640px] lg:mx-0 lg:max-w-none">
      <ClientOnly>
        <WelcomeRouteScene :layout="sceneLayout" />
        <template #fallback>
          <div class="aspect-[469/322] md:aspect-[984/459]" />
        </template>
      </ClientOnly>
    </div>
  </section>
</template>
