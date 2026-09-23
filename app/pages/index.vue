<template>
  <NuxtLayout :name="layout">
    <ClientOnly>
      <Modal
        v-if="!isMobile"
        v-model:open="modalOpen"
        :title="!isEditing ? 'Create Itinerary' : 'Edit Itinerary'"
      >
        <template #form>
          <ItineraryForm
            ref="itineraryForm"
            :selected-itinerary="itineraryDisplayed"
            @loading="isLoading = $event"
            @is-modal-open="modalOpen = $event"
            @itinerary-created="itineraryCreated = $event"
            @itinerary-updated="itineraryUpdated = $event"
          />
        </template>
        <template #action>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isLoading"
              @click="() => { modalOpen = false; isEditing = false }"
            />
            <UButton
              :label="!isEditing ? 'Create' : 'Save Changes'"
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
        :title="!isEditing ? 'Create Itinerary' : 'Edit Itinerary'"
      >
        <template #form>
          <ItineraryForm
            ref="itineraryForm"
            :selected-itinerary="itineraryDisplayed"
            @loading="isLoading = $event"
            @is-modal-open="slideoverOpen = $event"
            @itinerary-created="itineraryCreated = $event"
            @itinerary-updated="itineraryUpdated = $event"
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
              @click="() => { slideoverOpen = false; isEditing = false }"
            />
            <UButton
              block
              class="basis-2/3"
              :label="!isEditing ? 'Create' : 'Save Changes'"
              color="primary"
              :loading="isLoading"
              data-testid="submit-place-btn"
              @click="triggerSubmit"
            />
          </div>
        </template>
      </Slideover>
      <ConfirmModal
        v-model:open="confirmModalOpen"
        title="Delete this itinerary?"
      >
        <template #description>
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :ui="{ root: 'items-center' }"
          >
            <template #title>
              This will permanently delete <strong>{{ itineraryDisplayed?.name }}</strong> and all its associated data. This cannot be undone.
            </template>
          </UAlert>
        </template>
        <template #action>
          <div class="flex justify-end gap-2 w-full">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isLoading"
              @click="() => { confirmModalOpen = false }"
            />
            <UButton
              label="Delete"
              color="error"
              :loading="isLoading"
              data-testid="delete-itinerary-btn"
              @click="handleDelete(itineraryDisplayed)"
            />
          </div>
        </template>
      </ConfirmModal>
    </ClientOnly>
    <div class="flex flex-col space-y-4 p-6">
      <div class="flex justify-between items-center">
        <h1 class="text-lg font-medium">
          Your Itineraries
        </h1>
        <div>
          <UButton
            v-if="!isMobile"
            label="Create"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-modal-btn"
            @click="() => { modalOpen = true; isEditing = false }"
          />
          <UButton
            v-else
            label="Create"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-slideover-btn"
            @click="() => { slideoverOpen = true; isEditing = false }"
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
          <Grid
            :itineraries="itineraries.data.ongoing"
            @is-editing="isEditing = $event"
            @is-modal-open="modalOpen = $event"
            @is-slideover-open="slideoverOpen = $event"
            @is-confirm-modal-open="confirmModalOpen = $event"
            @selected-itinerary="itineraryDisplayed = $event; itineraryBucket='ongoing'"
          />
        </div>
        <div
          v-if="itineraries?.data.upcoming.length"
          class="space-y-4"
        >
          <h2 class="itinerary-heading">
            Upcoming
          </h2>
          <Grid
            :itineraries="itineraries.data.upcoming"
            @is-editing="isEditing = $event"
            @is-modal-open="modalOpen = $event"
            @is-slideover-open="slideoverOpen = $event"
            @is-confirm-modal-open="confirmModalOpen = $event"
            @selected-itinerary="itineraryDisplayed = $event; itineraryBucket='upcoming'"
          />
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
            label="Create"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-modal-btn"
            @click="() => { modalOpen = true; isEditing = false }"
          />

          <UButton
            v-else
            label="Create"
            color="primary"
            variant="solid"
            icon="i-lucide-plus"
            data-testid="open-slideover-btn"
            @click="() => { slideoverOpen = true; isEditing = false }"
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
import ConfirmModal from '~/components/ui/ConfirmModal.vue'
import type { Itinerary, ItineraryResponse, ItinerariesGroupedResponse } from '~/types/itinerary'

definePageMeta({
  layout: false,
})

const layout = 'home'

const modalOpen = ref(false)
const slideoverOpen = ref(false)
const confirmModalOpen = ref(false)
const isLoading = ref(false)
const isEditing = ref(false)

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 768)

const { showToast } = useAppToast()

const itineraryBucket = ref<'ongoing' | 'upcoming'>()

const { data: itineraries } = useFetch<ItinerariesGroupedResponse>('/api/itineraries', {
  params: {
    grouped: true,
  },
})

const itineraryCreated = ref<ItineraryResponse>({} as ItineraryResponse)
watch(itineraryCreated, (value) => {
  if (itineraries.value?.data) {
    addNewItinerary(value)
  }
})

const itineraryDisplayed = ref<Itinerary | undefined>(undefined)

const hasItineraries = computed(() => {
  const data = itineraries.value?.data
  return !!(data?.ongoing.length || data?.past.length || data?.upcoming.length)
})

watch(modalOpen, (isOpen) => {
  if (!isOpen) {
    itineraryDisplayed.value = undefined
  }
})

watch(confirmModalOpen, (isOpen) => {
  if (!isOpen) {
    itineraryDisplayed.value = undefined
  }
})

const itineraryUpdated = ref<ItineraryResponse>({} as ItineraryResponse)
watch(itineraryUpdated, (value) => {
  const isDeleted = ref(false)

  if (itineraries.value?.data) {
    if (itineraryBucket.value) {
      const old_itinerary = itineraries.value.data[itineraryBucket.value].find(itinerary => itinerary.id === value.data.id)
      if (old_itinerary && (old_itinerary?.name !== value.data.name
        || old_itinerary?.start_date !== value.data.start_date
        || old_itinerary?.end_date !== value.data.end_date)) {
        const index = itineraries.value.data[itineraryBucket.value].indexOf(old_itinerary)
        itineraries.value.data[itineraryBucket.value].splice(index, 1)
        isDeleted.value = true
      }
    }

    if (isDeleted.value) {
      addNewItinerary(value)
    }
  }
})

const itineraryFormRef = useTemplateRef('itineraryForm')

function triggerSubmit() {
  (itineraryFormRef.value as any)?.triggerSubmit()
}

async function handleDelete(deletedItinerary: Itinerary | undefined) {
  if (!deletedItinerary) return

  isLoading.value = true

  try {
    await $fetch<void>(`/api/itineraries/${deletedItinerary.id}`, { method: 'DELETE' })

    confirmModalOpen.value = false
    showToast('Itinerary deleted successfully', 'i-lucide-circle-check')

    if (itineraries.value?.data) {
      if (itineraryBucket.value) {
        const index = itineraries.value.data[itineraryBucket.value]
          .map(itinerary => itinerary.id)
          .indexOf(deletedItinerary.id)

        itineraries.value.data[itineraryBucket.value].splice(index, 1)
        reorderItineraries()
      }
    }
  }
  catch (error: any) {
    confirmModalOpen.value = false
    showToast('Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error')
  }
  finally {
    isLoading.value = false
  }
}

function addNewItinerary(itinerary: ItineraryResponse) {
  reorderItineraries()

  if (itineraries.value?.data) {
    if (new Date(itinerary.data.start_date) > new Date()) {
      itineraries.value.data.upcoming.push(itinerary.data)
    }
    else {
      itineraries.value.data.ongoing.push(itinerary.data)
    }
  }
}

function reorderItineraries() {
  if (itineraries.value?.data) {
    itineraries.value = {
      'data': {
        'upcoming': itineraries.value.data.upcoming ? [...itineraries.value.data.upcoming] : [],
        'ongoing': itineraries.value.data.ongoing ? [...itineraries.value.data.ongoing] : [],
        'past': itineraries.value.data.past ? [...itineraries.value.data.past] : [],
      },
    }
  }
}
</script>
