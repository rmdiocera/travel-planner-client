import { config } from '@vue/test-utils'
import { beforeEach } from 'vitest'

let testCount = 0

// Nuxt UI reports typing to a form 300 ms after it happens, on a channel named after the form's id. Vue gives a
// form the same id in every test, so typing at the end of one test would reach the next test's form.
// A new id prefix for each test keeps those channels apart.
beforeEach(() => {
  config.global.config.idPrefix = `test${++testCount}`
})
