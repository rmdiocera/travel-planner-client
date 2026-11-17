export default defineAppConfig({
  ui: {
    colors: {
      primary: 'teal',
    },
    button: {
      compoundVariants: [
        {
          // Disabled solid buttons turn gray so they can't pass for active ones. A loading button is
          // disabled too, but it keeps its color.
          variant: 'solid',
          loading: false,
          class: 'disabled:bg-accented aria-disabled:bg-accented disabled:text-muted aria-disabled:text-muted disabled:opacity-100 aria-disabled:opacity-100',
        },
      ],
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
