import { insertNodeAt, removeNode, useSortable } from '@vueuse/integrations/useSortable'
import type { Ref } from 'vue'
import { moveId } from '~/utils/trip/order'

// Drag-to-reorder for one container of siblings (lists, items in a list, checklist items). Sortable moves the
// row in the DOM itself, so it is put back, and the new order goes to `reorder`, which re-renders the rows and
// sends the request. A container only holds its own children, so nothing can be dropped into another list or checklist.
// On touch a drag needs a press and hold, so scrolling never starts one.
export function useDragReorder(
  container: Ref<HTMLElement | null | undefined>,
  ids: () => string[],
  reorder: (orderedIds: string[]) => void,
  // `draggable` picks the rows, `handle` the part of a row that starts a drag.
  options: { draggable: string, handle: string },
) {
  useSortable(container, ids, {
    watchElement: true,
    animation: 150,
    delay: 300,
    delayOnTouchOnly: true,
    draggable: options.draggable,
    handle: options.handle,
    filter: 'input, textarea',
    preventOnFilter: false,
    onUpdate(event) {
      removeNode(event.item)
      insertNodeAt(event.from, event.item, event.oldIndex!)
      reorder(moveId(ids(), event.oldIndex!, event.newIndex!))
    },
  })
}
