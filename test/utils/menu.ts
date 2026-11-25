import type { VueWrapper } from '@vue/test-utils'
import type { DropdownMenuItem } from '@nuxt/ui'
import { nextTick } from 'vue'

// Nuxt UI menus open on pointer events and teleport their items to <body>, so tests read a menu's items
// from the component instead of opening it.
export function menuItems(wrapper: VueWrapper, triggerTestId: string): DropdownMenuItem[] {
  // The menu has no usable component name, so start from its trigger and walk up to the component with an items prop.
  const trigger = wrapper.findAllComponents({ name: 'DropdownMenuTrigger' })
    .find(component => component.html().includes(`data-testid="${triggerTestId}"`))
  let owner = trigger?.vm.$parent ?? null
  while (owner && !Array.isArray(owner.$props?.items)) {
    owner = owner.$parent
  }
  if (!owner) {
    throw new Error(`No menu has a trigger with data-testid="${triggerTestId}"`)
  }
  return (owner.$props.items as (DropdownMenuItem | DropdownMenuItem[])[]).flat()
}

export async function selectMenuItem(wrapper: VueWrapper, triggerTestId: string, label: string) {
  const item = menuItems(wrapper, triggerTestId).find(menuItem => menuItem.label === label)
  if (!item) {
    throw new Error(`The menu of "${triggerTestId}" has no item "${label}"`)
  }
  item.onSelect?.(new Event('select'))
  await nextTick()
}
