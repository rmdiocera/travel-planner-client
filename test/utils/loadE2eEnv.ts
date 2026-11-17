import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseEnv } from 'node:util'

// The E2E_ settings for the e2e project: the ones in .env, with any set in the shell taking precedence.
// Node's parseEnv keeps a `$` as typed, where Vite's loadEnv would expand `$word` in a password to nothing.
export function loadE2eEnv(dir = process.cwd(), shellEnv: Partial<Record<string, string>> = process.env) {
  const envFile = join(dir, '.env')
  const fromFile = existsSync(envFile) ? parseEnv(readFileSync(envFile, 'utf8')) : {}

  const settings: Record<string, string> = {}
  for (const [name, value] of Object.entries({ ...fromFile, ...shellEnv })) {
    if (name.startsWith('E2E_') && value !== undefined) {
      settings[name] = value
    }
  }
  return settings
}
