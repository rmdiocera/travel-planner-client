import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadE2eEnv } from '../utils/loadE2eEnv'

describe('loadE2eEnv', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dayfarer-e2e-env-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function writeEnv(content: string) {
    writeFileSync(join(dir, '.env'), content)
  }

  it.each([
    ['unquoted', 'E2E_USER_PASSWORD=MyP@ss$word1'],
    ['double-quoted', 'E2E_USER_PASSWORD="MyP@ss$word1"'],
    ['single-quoted', 'E2E_USER_PASSWORD=\'MyP@ss$word1\''],
  ])('keeps a $ as typed in a value that is %s', (_name, line) => {
    writeEnv(`${line}\n`)
    expect(loadE2eEnv(dir, {})).toEqual({ E2E_USER_PASSWORD: 'MyP@ss$word1' })
  })

  it('lets a setting from the shell win over .env', () => {
    writeEnv('E2E_USER_EMAIL=file@example.com\nE2E_ORIGIN=http://localhost:3000\n')
    expect(loadE2eEnv(dir, { E2E_USER_EMAIL: 'shell@example.com' })).toEqual({
      E2E_USER_EMAIL: 'shell@example.com',
      E2E_ORIGIN: 'http://localhost:3000',
    })
  })

  it('keeps only the E2E_ settings', () => {
    writeEnv('APP_KEY=base64:abc\nE2E_USER_EMAIL=sam@example.com\n')
    expect(loadE2eEnv(dir, { PATH: '/usr/bin' })).toEqual({ E2E_USER_EMAIL: 'sam@example.com' })
  })

  it('reads only the shell when there is no .env', () => {
    expect(loadE2eEnv(dir, { E2E_USER_EMAIL: 'shell@example.com' })).toEqual({ E2E_USER_EMAIL: 'shell@example.com' })
  })
})
