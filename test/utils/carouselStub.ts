import { Fragment, defineComponent, h } from 'vue'
import type { PropType } from 'vue'
import { vi } from 'vitest'

export const scrollToMock = vi.fn()
export const scrollPrevMock = vi.fn()
export const scrollNextMock = vi.fn()

// Stands in for UCarousel in tests. Embla needs layout that happy-dom doesn't have (a zero-size carousel collapses
// to one snap and can't be navigated), so every item is drawn next to a button that reports it as selected.
// The classes passed to the arrow buttons show up as data-prev-class / data-next-class.
export default defineComponent({
  props: {
    items: { type: Array as PropType<unknown[]>, default: () => [] },
    arrows: { type: Boolean, default: false },
    prev: { type: Object as PropType<{ class?: string }>, default: undefined },
    next: { type: Object as PropType<{ class?: string }>, default: undefined },
  },
  emits: ['select'],
  setup(props, { slots, emit, expose }) {
    expose({ emblaApi: { scrollTo: scrollToMock, scrollPrev: scrollPrevMock, scrollNext: scrollNextMock } })

    return () => h(
      'div',
      {
        'data-testid': 'carousel-stub',
        'data-arrows': String(props.arrows),
        'data-prev-class': props.prev?.class,
        'data-next-class': props.next?.class,
      },
      props.items.map((item, index) => h(Fragment, { key: index }, [
        h('div', slots.default?.({ item, index })),
        h('button', { 'type': 'button', 'data-testid': `carousel-stub-select-${index}`, 'onClick': () => emit('select', index) }),
      ])),
    )
  },
})
