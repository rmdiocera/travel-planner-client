<template>
  <NuxtLayout :name="layout">
    <Modal
      v-if="!isMobile"
      v-model:open="modalOpen"
      title="Create itinerary"
    >
      <template #button>
        <UButton
          label="Open"
          color="neutral"
          variant="subtle"
          data-testid="open-modal-btn"
          @click="() => { modalOpen = true }"
        />
      </template>
      <template #form>
        <ItineraryForm
          ref="itineraryForm"
          @loading="isLoading = $event"
          @is-modal-open="modalOpen = $event"
        />
      </template>
      <template #action>
        <div class="flex justify-end gap-2 w-full">
          <div class="flex justify-end gap-2 w-full">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isLoading"
              @click="() => { modalOpen = false }"
            />
            <UButton
              label="Create"
              color="primary"
              :loading="isLoading"
              data-testid="create-itinerary-btn"
              @click="triggerSubmit"
            />
          </div>
        </div>
      </template>
    </Modal>
    <Slideover
      v-else
      v-model:open="slideoverOpen"
      side="bottom"
      title="Create itinerary"
    >
      <template #button>
        <UButton
          label="Open"
          color="neutral"
          variant="subtle"
          data-testid="open-slideover-btn"
          @click="() => { slideoverOpen = true }"
        />
      </template>
      <template #form>
        <ItineraryForm
          ref="itineraryForm"
          @loading="isLoading = $event"
          @is-modal-open="slideoverOpen = $event"
        />
      </template>
      <template #action>
        <div class="flex gap-2 w-full">
          <UButton
            block
            class="basis-1/3"
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="() => { slideoverOpen = false }"
          />
          <UButton
            block
            class="basis-2/3"
            label="Submit"
            color="primary"
            :loading="isLoading"
            data-testid="submit-place-btn"
            @click="triggerSubmit"
          />
        </div>
      </template>
    </Slideover>
  </NuxtLayout>
</template>

<script setup lang="ts">
import ItineraryForm from '@/components/ItineraryForm.vue'
import Modal from '@/components/ui/Modal.vue'
import Slideover from '@/components/ui/Slideover.vue'
import { useWindowSize } from '@vueuse/core'

definePageMeta({
  layout: false, // disable default layout so we can set it dynamically
})

const layout = 'home'

const modalOpen = ref(false)
const slideoverOpen = ref(false)
const isLoading = ref(false)

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

const itineraryFormRef = useTemplateRef('itineraryForm')

function triggerSubmit() {
  (itineraryFormRef.value as any)?.triggerSubmit()
}
</script>
