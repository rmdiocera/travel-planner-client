<script setup lang="ts">
import TripListCard from '~/components/trip/ListCard.vue'
import TripListNameEditor from '~/components/trip/ListNameEditor.vue'
import TripListsSkeleton from '~/components/trip/ListsSkeleton.vue'
import ConfirmModal from '~/components/ui/ConfirmModal.vue'
import EmptyState from '~/components/ui/EmptyState.vue'
import { confirmDeleteKey } from '~/composables/tripDialogs'
import { useDragReorder } from '~/composables/useDragReorder'
import type { ConfirmDeleteRequest } from '~/composables/tripDialogs'
import { injectTripLists } from '~/composables/useTripLists'

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

// Deleting a list, note or checklist asks first, in one confirmation. Components below ask for it with confirmDeleteKey.
const request = ref<ConfirmDeleteRequest | null>(null)
const confirmOpen = ref(false)
const isDeleting = ref(false)

provide(confirmDeleteKey, (asked) => {
  request.value = asked
  confirmOpen.value = true
})

async function confirmDelete() {
  if (!request.value) {
    return
  }

  isDeleting.value = true
  await request.value.run()
  isDeleting.value = false
  confirmOpen.value = false
}

// Dragging a list by its name, within the lists column.
const listsEl = useTemplateRef<HTMLElement>('listsEl')
useDragReorder(listsEl, () => lists.value.map(list => list.id), ids => void tripLists.reorderLists(ids), { draggable: '[data-testid="list-card"]', handle: '[data-list-handle]' })

// One list place is open at a time in the lists column.
const openItemId = ref<string | null>(null)
function toggleItem(id: string) {
  openItemId.value = openItemId.value === id ? null : id
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
        <div
          ref="listsEl"
          class="flex flex-col gap-4"
        >
          <TripListCard
            v-for="(list, index) in lists"
            :key="list.id"
            :list="list"
            :is-first="index === 0"
            :is-last="index === lists.length - 1"
            :open-item-id="openItemId"
            @toggle-item="toggleItem"
          />
        </div>
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
        :title="request?.title"
      >
        <template #description>
          <UAlert
            color="error"
            variant="soft"
            icon="i-lucide-triangle-alert"
            :ui="{ root: 'items-center' }"
            :title="request?.body"
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
              data-testid="confirm-delete-btn"
              @click="confirmDelete"
            />
          </div>
        </template>
      </ConfirmModal>
    </ClientOnly>
  </div>
</template>
