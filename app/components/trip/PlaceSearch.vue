<script setup lang="ts">
import { usePlaceSearch } from '~/composables/usePlaceSearch'
import type { SearchPlace } from '~/composables/usePlaceSearch'

const props = defineProps<{
  // Where places are added, in the words of "Added to day 2: ...".
  targetLabel: string
  // Adds one place; resolves false when it failed, and shows its own error.
  add: (place: SearchPlace) => Promise<boolean>
  // True for a place that's already there. Add still works, since a place can be added twice.
  isOnTarget?: (placeId: string) => boolean
}>()

const emit = defineEmits<{
  added: [place: SearchPlace]
}>()

const { term, results, searchedTerm, pending } = usePlaceSearch()

// Kept for as long as this search is open, so a place can't be added twice by mistake from here.
const adding = ref(new Set<string>())
const added = ref(new Set<string>())
const addedNames = ref<string[]>([])

async function addPlace(place: SearchPlace) {
  if (adding.value.has(place.id) || added.value.has(place.id)) {
    return
  }

  adding.value = new Set(adding.value).add(place.id)
  const succeeded = await props.add(place)
  const stillAdding = new Set(adding.value)
  stillAdding.delete(place.id)
  adding.value = stillAdding

  if (succeeded) {
    added.value = new Set(added.value).add(place.id)
    addedNames.value = [...addedNames.value, place.name]
    emit('added', place)
  }
}

const showNoMatch = computed(() => !pending.value && !!searchedTerm.value && !results.value.length && term.value.trim() === searchedTerm.value)
</script>

<template>
  <div class="flex flex-col gap-3">
    <UInput
      v-model="term"
      icon="i-lucide-search"
      placeholder="Search places or cities"
      maxlength="100"
      autofocus
      class="w-full"
      data-testid="place-search-input"
    />
    <p
      v-if="addedNames.length"
      class="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary"
      data-testid="place-search-added"
    >
      Added to {{ targetLabel }}: {{ addedNames.join(', ') }}
    </p>
    <p
      v-if="!term.trim()"
      class="text-sm text-muted"
    >
      Type a place or city name.
    </p>
    <p
      v-else-if="showNoMatch"
      class="text-sm text-muted"
    >
      No places match "{{ searchedTerm }}".
    </p>
    <ul class="flex flex-col gap-2">
      <li
        v-for="place in results"
        :key="place.id"
        class="flex items-center gap-3 rounded-md border border-default p-3"
        :data-testid="`search-result-${place.id}`"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate font-medium">
            {{ place.name }}
          </p>
          <p class="truncate text-sm text-muted">
            {{ place.tags[0] ? `${place.city} · ${place.tags[0].name}` : place.city }}
          </p>
          <p
            v-if="isOnTarget?.(place.id)"
            class="text-xs text-dimmed"
          >
            Already on this day
          </p>
        </div>
        <UButton
          :label="added.has(place.id) ? 'Added' : 'Add'"
          :icon="added.has(place.id) ? 'i-lucide-check' : undefined"
          size="sm"
          variant="outline"
          :loading="adding.has(place.id)"
          :disabled="added.has(place.id)"
          :data-testid="`add-result-${place.id}`"
          @click="addPlace(place)"
        />
      </li>
    </ul>
  </div>
</template>
