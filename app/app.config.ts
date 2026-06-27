export default defineAppConfig({
  ui: {
    colors: {
      primary: 'teal',
    },
    input: {
      slots: {
        base: 'focus:bg-teal-50 dark:focus:bg-teal-950',
      },
    },
    formField: {
      slots: {
        error: 'mt-1',
        label: 'text-neutral-700 dark:text-neutral-300',
      },
    },
  },
})
