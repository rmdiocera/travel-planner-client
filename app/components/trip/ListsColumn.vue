<script setup lang="ts">
import TripListCard from '~/components/trip/ListCard.vue'
import TripListNameEditor from '~/components/trip/ListNameEditor.vue'
import TripListsSkeleton from '~/components/trip/ListsSkeleton.vue'
import ConfirmModal from '~/components/ui/ConfirmModal.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import { injectTripLists } from '~/composables/useTripLists'
import type { ItineraryList } from '~/types/list'
import { listDeleteText } from '~/utils/trip/deleteText'

const tripLists = injectTripLists()
const { lists, pending, error, refresh } = tripLists

const creating = ref(false)
const createError = ref('')
const createSaving = ref(false)

function startCreating() {
  createError.value = ''
  creating.value = true
}

async function saveNew(name: string) {
  createSaving.value = true
  const result = await tripLists.createList(name)
  createSaving.value = false
  if (result.ok) {
    creating.value = false
  }
  else {
    createError.value = result.error ?? ''
  }
}

// Delete list asks first, and says what goes with the list.
const deleting = ref<ItineraryList | null>(null)
const confirmOpen = ref(false)
const isDeleting = ref(false)

function askToDelete(list: ItineraryList) {
  deleting.value = list
  confirmOpen.value = true
}

const deleteText = computed(() => {
  const items = deleting.value?.items ?? []
  const count = (type: string) => items.filter(item => item.type === type).length
  return listDeleteText(deleting.value?.name ?? '', { places: count('place'), checklists: count('checklist'), notes: count('note') })
})

async function confirmDelete() {
  if (!deleting.value) {
    return
  }

  isDeleting.value = true
  await tripLists.deleteList(deleting.value)
  isDeleting.value = false
  confirmOpen.value = false
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <EmptyState
      v-if="error"
      icon="i-lucide-triangle-alert"
      title="Your lists couldn't be loaded"
      description="Check your connection and try again. Your days are still here."
      :ui="{ avatar: '[&>[data-slot=icon]]:text-error bg-error/10 rounded-xl' }"
    >
      <template #action>
        <UButton
          label="Try again"
          color="neutral"
          variant="outline"
          icon="i-lucide-refresh-cw"
          @click="refresh()"
        />
      </template>
    </EmptyState>
    <TripListsSkeleton v-else-if="pending" />
    <template v-else>
      <EmptyState
        v-if="!lists.length && !creating"
        icon="i-lucide-list"
        title="No lists yet"
        description="Keep places you're considering, notes and checklists here. For example, backup places in case one is closed, or things to pack."
      >
        <template #action>
          <UButton
            label="New list"
            icon="i-lucide-plus"
            data-testid="new-list-btn"
            @click="startCreating"
          />
        </template>
      </EmptyState>
      <template v-else>
        <TripListCard
          v-for="(list, index) in lists"
          :key="list.id"
          :list="list"
          :is-first="index === 0"
          :is-last="index === lists.length - 1"
          @delete="askToDelete"
        />
        <div
          v-if="creating"
          class="rounded-md border border-default p-4"
        >
          <TripListNameEditor
            initial=""
            :error="createError"
            :saving="createSaving"
            @save="saveNew"
            @cancel="creating = false"
          />
        </div>
        <UButton
          v-else
          label="New list"
          icon="i-lucide-plus"
          variant="outline"
          color="neutral"
          block
          class="border-dashed"
          data-testid="new-list-btn"
          @click="startCreating"
        />
      </template>
    </template>
    <ClientOnly>
      <ConfirmModal
        v-model:open="confirmOpen"
        :title="deleteText.title"
      >
        <template #description>
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :ui="{ root: 'items-center' }"
            :title="deleteText.body"
          />
        </template>
        <template #action>
          <div class="flex w-full justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              :disabled="isDeleting"
              @click="confirmOpen = false"
            />
            <UButton
              label="Delete"
              color="error"
              :loading="isDeleting"
              data-testid="delete-list-btn"
              @click="confirmDelete"
            />
          </div>
        </template>
      </ConfirmModal>
    </ClientOnly>
  </div>
</template>
