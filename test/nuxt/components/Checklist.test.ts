import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TripChecklistDraft from '~/components/trip/ChecklistDraft.vue'
import TripChecklistItem from '~/components/trip/ChecklistItem.vue'
import { confirmDeleteKey } from '~/composables/tripDialogs'
import { tripListsKey } from '~/composables/useTripLists'
import type { ChecklistEntry, ItineraryList, ListItem } from '~/types/list'
import { menuItems } from '../../utils/menu'
import { makeList } from '../../utils/tripFixtures'

const fakeLists = {
  createChecklist: vi.fn(),
  setChecklistTitle: vi.fn(),
  addEntry: vi.fn(),
  renameEntry: vi.fn(),
  toggleEntry: vi.fn(),
  deleteEntry: vi.fn(),
  moveEntry: vi.fn(),
  moveItem: vi.fn(),
  deleteItem: vi.fn(),
}
const confirmDelete = vi.fn()

const entry = (id: string, label: string, isChecked: boolean, sortOrder: number): ChecklistEntry =>
  ({ id, itinerary_list_item_id: 'c1', label, is_checked: isChecked, sort_order: sortOrder })
const checklist: ListItem = {
  id: 'c1',
  itinerary_lists_id: 'l1',
  type: 'checklist',
  title: 'Packing',
  content: null,
  sort_order: 1,
  place: null,
  checklist_items: [entry('e1', 'Passport', false, 1), entry('e2', 'Adapter', true, 2)],
}
const list: ItineraryList = makeList('l1', 'Before we go', { items: [checklist] })

const provide = { [tripListsKey as symbol]: fakeLists, [confirmDeleteKey as symbol]: confirmDelete }

async function mountItem(props: Record<string, unknown> = {}, attachTo?: Element) {
  return mountSuspended(TripChecklistItem, { props: { list, item: checklist, isFirst: false, isLast: false, ...props }, global: { provide }, attachTo })
}

const enter = { key: 'Enter' }

describe('TripChecklistDraft', () => {
  beforeEach(() => {
    for (const mock of Object.values(fakeLists)) {
      mock.mockReset()
    }
    fakeLists.createChecklist.mockResolvedValue({ ...checklist, id: 'c9', title: 'Things to bring', checklist_items: [] })
    fakeLists.addEntry.mockResolvedValue({ ok: true })
  })

  async function mountDraft() {
    return mountSuspended(TripChecklistDraft, { props: { list }, global: { provide } })
  }

  it('creates the checklist when its first item is saved', async () => {
    const wrapper = await mountDraft()
    await wrapper.find('input[data-testid="checklist-title-input"]').setValue('Things to bring')
    const input = wrapper.find('input[data-testid="checklist-item-input"]')
    await input.setValue('Passport')
    await input.trigger('keydown', enter)
    await flushPromises()

    expect(fakeLists.createChecklist).toHaveBeenCalledWith(list, 'Things to bring')
    expect(fakeLists.addEntry).toHaveBeenCalledWith(list, expect.objectContaining({ id: 'c9' }), 'Passport')
    expect(wrapper.emitted('created')![0]![0]).toEqual(expect.objectContaining({ id: 'c9' }))
  })

  it('creates a checklist with only a title on Save', async () => {
    const wrapper = await mountDraft()
    await wrapper.find('input[data-testid="checklist-title-input"]').setValue('Things to bring')
    await wrapper.find('[data-testid="checklist-save-btn"]').trigger('click')
    await flushPromises()

    expect(fakeLists.createChecklist).toHaveBeenCalledWith(list, 'Things to bring')
    expect(fakeLists.addEntry).not.toHaveBeenCalled()
  })

  it('creates nothing for a blank checklist', async () => {
    const wrapper = await mountDraft()
    expect(wrapper.find('[data-testid="checklist-save-btn"]').attributes()).toHaveProperty('disabled')

    await wrapper.find('[data-testid="checklist-cancel-btn"]').trigger('click')
    await wrapper.find('input[data-testid="checklist-item-input"]').trigger('keydown', { key: 'Escape' })

    expect(fakeLists.createChecklist).not.toHaveBeenCalled()
    expect(wrapper.emitted('cancel')).toHaveLength(2)
  })

  it('adds one item when Enter is pressed twice while saving', async () => {
    let finish: (value: unknown) => void = () => {}
    fakeLists.createChecklist.mockReturnValue(new Promise((done) => {
      finish = done
    }))
    const wrapper = await mountDraft()
    const input = wrapper.find('input[data-testid="checklist-item-input"]')
    await input.setValue('Passport')
    await input.trigger('keydown', enter)
    await input.trigger('keydown', enter)

    expect(fakeLists.createChecklist).toHaveBeenCalledTimes(1)
    finish({ ...checklist, id: 'c9', checklist_items: [] })
    await flushPromises()
  })
})

describe('TripChecklistItem', () => {
  beforeEach(() => {
    for (const mock of Object.values(fakeLists)) {
      mock.mockReset()
    }
    confirmDelete.mockReset()
    fakeLists.addEntry.mockResolvedValue({ ok: true })
    fakeLists.renameEntry.mockResolvedValue({ ok: true })
    fakeLists.setChecklistTitle.mockResolvedValue({ ok: true })
    fakeLists.deleteEntry.mockResolvedValue(true)
  })

  it('shows the title and every item', async () => {
    const wrapper = await mountItem()

    expect(wrapper.text()).toContain('Packing')
    expect(wrapper.find('[data-testid="entry-e1"]').text()).toContain('Passport')
    expect(wrapper.find('[data-testid="entry-e2"]').text()).toContain('Adapter')
  })

  it('offers Add a title when there is none', async () => {
    const wrapper = await mountItem({ item: { ...checklist, title: null } })

    expect(wrapper.text()).toContain('Add a title')
  })

  it('opens the next box after Enter, empty and still focused', async () => {
    const wrapper = await mountItem({ autoAdd: true }, document.body)
    const input = wrapper.find('input[data-testid="checklist-item-input"]')
    await input.setValue('Tickets')
    await input.trigger('keydown', enter)
    await flushPromises()

    expect(fakeLists.addEntry).toHaveBeenCalledWith(list, checklist, 'Tickets')
    const next = wrapper.find('input[data-testid="checklist-item-input"]')
    expect((next.element as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(next.element)
    wrapper.unmount()
  })

  it('adds one item when Enter is pressed twice while saving', async () => {
    let finish: (value: unknown) => void = () => {}
    fakeLists.addEntry.mockReturnValue(new Promise((done) => {
      finish = done
    }))
    const wrapper = await mountItem({ autoAdd: true })
    const input = wrapper.find('input[data-testid="checklist-item-input"]')
    await input.setValue('Tickets')
    await input.trigger('keydown', enter)
    await input.trigger('keydown', enter)

    expect(fakeLists.addEntry).toHaveBeenCalledTimes(1)
    finish({ ok: true })
    await flushPromises()
  })

  it('ignores Enter on a blank box', async () => {
    const wrapper = await mountItem({ autoAdd: true })
    await wrapper.find('input[data-testid="checklist-item-input"]').trigger('keydown', enter)

    expect(fakeLists.addEntry).not.toHaveBeenCalled()
  })

  it('opens the add box from + Add an item', async () => {
    const wrapper = await mountItem()
    expect(wrapper.find('input[data-testid="checklist-item-input"]').exists()).toBe(false)

    await wrapper.find('[data-testid="checklist-add-item-btn"]').trigger('click')
    expect(wrapper.find('input[data-testid="checklist-item-input"]').exists()).toBe(true)
  })

  it('ticks a box right in the list', async () => {
    const wrapper = await mountItem()
    wrapper.findComponent('[data-testid="entry-checkbox-e1"]').vm.$emit('update:modelValue', true)

    expect(fakeLists.toggleEntry).toHaveBeenCalledWith(list, checklist, checklist.checklist_items[0])
  })

  describe('editing an item', () => {
    it('shows move and delete buttons on the item being edited, and only on it', async () => {
      const wrapper = await mountItem()
      expect(wrapper.find('[data-testid="entry-delete-btn"]').exists()).toBe(false)

      await wrapper.find('[data-testid="entry-text-e1"]').trigger('click')

      expect(wrapper.findAll('[data-testid="entry-delete-btn"]')).toHaveLength(1)
      expect(wrapper.find('[data-testid="entry-up-btn"]').attributes('aria-label')).toBe('Move up')
      expect(wrapper.find('[data-testid="entry-down-btn"]').attributes('aria-label')).toBe('Move down')
      expect(wrapper.find('[data-testid="entry-delete-btn"]').attributes('aria-label')).toBe('Delete item')
    })

    it('deletes the item without asking', async () => {
      const wrapper = await mountItem()
      await wrapper.find('[data-testid="entry-text-e1"]').trigger('click')
      await wrapper.find('[data-testid="entry-delete-btn"]').trigger('click')

      expect(fakeLists.deleteEntry).toHaveBeenCalledWith(list, checklist, checklist.checklist_items[0])
      expect(confirmDelete).not.toHaveBeenCalled()
    })

    it('moves the item down, and turns Move up off for the first', async () => {
      const wrapper = await mountItem()
      await wrapper.find('[data-testid="entry-text-e1"]').trigger('click')

      expect(wrapper.find('[data-testid="entry-up-btn"]').attributes()).toHaveProperty('disabled')
      await wrapper.find('[data-testid="entry-down-btn"]').trigger('click')
      expect(fakeLists.moveEntry).toHaveBeenCalledWith(list, checklist, checklist.checklist_items[0], 1)
    })

    it('saves an edited item on Enter, and cancels on Escape', async () => {
      const wrapper = await mountItem()
      await wrapper.find('[data-testid="entry-text-e1"]').trigger('click')
      const input = wrapper.find('input[data-testid="entry-input"]')
      expect((input.element as HTMLInputElement).value).toBe('Passport')
      await input.setValue('Passport and visa')
      await input.trigger('keydown', enter)
      await flushPromises()
      expect(fakeLists.renameEntry).toHaveBeenCalledWith(list, checklist, checklist.checklist_items[0], 'Passport and visa')
      expect(wrapper.find('input[data-testid="entry-input"]').exists()).toBe(false)

      await wrapper.find('[data-testid="entry-text-e2"]').trigger('click')
      await wrapper.find('input[data-testid="entry-input"]').trigger('keydown', { key: 'Escape' })
      expect(wrapper.find('input[data-testid="entry-input"]').exists()).toBe(false)
      expect(fakeLists.renameEntry).toHaveBeenCalledTimes(1)
    })
  })

  it('edits the title by tapping it', async () => {
    const wrapper = await mountItem()
    await wrapper.find('[data-testid="checklist-title-btn"]').trigger('click')
    const input = wrapper.find('input[data-testid="checklist-title-input"]')
    await input.setValue('Pack list')
    await input.trigger('keydown', enter)
    await flushPromises()

    expect(fakeLists.setChecklistTitle).toHaveBeenCalledWith(list, checklist, 'Pack list')
  })

  it('asks before deleting a checklist, counting its items', async () => {
    const wrapper = await mountItem()
    const deleteItem = menuItems(wrapper, 'item-menu-btn-c1').find(item => item.label === 'Delete')!
    deleteItem.onSelect?.(new Event('select'))

    expect(confirmDelete).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Delete "Packing"?',
      body: 'Its 2 items will be deleted too. This can\'t be undone.',
    }))
  })
})
