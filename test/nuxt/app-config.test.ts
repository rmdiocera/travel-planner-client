import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it, onTestFinished } from 'vitest'
import { UButton } from '#components'

async function buttonClasses(props: Record<string, unknown>) {
  const wrapper = await mountSuspended(UButton, { props: { label: 'Send', ...props } })
  onTestFinished(() => wrapper.unmount())
  return wrapper.find('button').classes()
}

describe('Button theme', () => {
  it('turns a disabled solid button gray with muted text', async () => {
    const classes = await buttonClasses({ disabled: true })

    expect(classes).toEqual(expect.arrayContaining(['disabled:bg-accented', 'disabled:text-muted', 'disabled:opacity-100']))
    expect(classes).not.toContain('disabled:bg-primary')
  })

  it('keeps a loading button in its own color', async () => {
    const classes = await buttonClasses({ loading: true })

    expect(classes).toContain('disabled:bg-primary')
    expect(classes).not.toContain('disabled:bg-accented')
  })

  it('leaves the other variants alone', async () => {
    const classes = await buttonClasses({ disabled: true, variant: 'outline' })

    expect(classes).not.toContain('disabled:bg-accented')
  })
})
