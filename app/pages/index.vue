<template>
  <NuxtLayout :name="layout">
    <ClientOnly>
      <Modal
        v-if="!isMobile"
        v-model:open="modalOpen"
        title="Create Itinerary"
      >
        <template #form>
          <ItineraryForm
            ref="itineraryForm"
            @loading="isLoading = $event"
            @is-modal-open="modalOpen = $event"
          />
        </template>
        <template #action>
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
        </template>
      </Modal>
      <Slideover
        v-else
        v-model:open="slideoverOpen"
        side="bottom"
        title="Create Itinerary"
      >
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
    </ClientOnly>
    <div class="flex flex-col space-y-4 p-6">
      <div class="flex justify-between items-center">
        <h1 class="text-lg font-medium">
          Your Itineraries
        </h1>
        <div>
          <UButton
            v-if="!isMobile"
            label="Create Itinerary"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-modal-btn"
            @click="() => { modalOpen = true }"
          />
          <UButton
            v-else
            label="Create Itinerary"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-slideover-btn"
            @click="() => { slideoverOpen = true }"
          />
        </div>
      </div>
      <div
        v-if="hasItineraries"
        class="flex flex-col gap-4"
      >
        <div
          v-if="itineraries?.data.ongoing.length"
          class="space-y-4"
        >
          <h2 class="itinerary-heading">
            Ongoing
          </h2>
          <Grid :itineraries="itineraries.data.ongoing" />
        </div>
        <div
          v-if="itineraries?.data.upcoming.length"
          class="space-y-4"
        >
          <h2 class="itinerary-heading">
            Upcoming
          </h2>
          <Grid :itineraries="itineraries.data.upcoming" />
        </div>
        <div
          v-if="itineraries?.data.past.length"
          class="space-y-4"
        >
          <h2 class="itinerary-heading">
            Past
          </h2>
          <Grid
            v-if="itineraries"
            :itineraries="itineraries.data.past"
          />
        </div>
      </div>
      <UEmpty
        v-else
        icon="i-lucide-map"
        title="No itineraries yet"
        description="Start planning your next trip by creating your first itinerary."
      >
        <template #footer>
          <UButton
            v-if="!isMobile"
            label="Create Itinerary"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-modal-btn"
            @click="() => { modalOpen = true }"
          />

          <UButton
            v-else
            label="Create Itinerary"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-slideover-btn"
            @click="() => { slideoverOpen = true }"
          />
        </template>
      </UEmpty>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
import ItineraryForm from '@/components/itinerary/Form.vue'
import Modal from '@/components/ui/Modal.vue'
import Slideover from '@/components/ui/Slideover.vue'
import { useWindowSize } from '@vueuse/core'
import Grid from '~/components/itinerary/Grid.vue'

definePageMeta({
  layout: false,
})

type Itinerary = {
  id: string
  name: string
  start_date: Date
  end_date: Date
}

type ItinerariesGroupedResponse = {
  data: {
    past: Itinerary[]
    ongoing: Itinerary[]
    upcoming: Itinerary[]
  }
}

const layout = 'home'

const modalOpen = ref(false)
const slideoverOpen = ref(false)
const isLoading = ref(false)

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

const { data: itineraries } = useFetch<ItinerariesGroupedResponse>('/api/itineraries', {
  params: {
    grouped: true,
  },
})

const hasItineraries = computed(() => {
  const data = itineraries.value?.data
  return !!(data?.ongoing.length || data?.past.length || data?.upcoming.length)
})

const itineraryFormRef = useTemplateRef('itineraryForm')

function triggerSubmit() {
  (itineraryFormRef.value as any)?.triggerSubmit()
}
</script>
