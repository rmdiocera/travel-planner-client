import type { TestProject } from 'vitest/node'
import { createApiSession } from '../utils/apiSession'

// Logs in once for the whole e2e run: Laravel allows 5 logins a minute per email and IP,
// and successful logins count, so one login per test file would hit the limit on a quick re-run.
export default async function setup(project: TestProject) {
  const session = createApiSession({ env: project.config.env })

  try {
    await session.login()
    project.provide('apiSession', { cookies: session.cookies() })
  }
  catch (error) {
    // Throwing here would stop the other projects too; each e2e file reports it in beforeAll instead.
    project.provide('apiSession', { error: error instanceof Error ? error.message : String(error) })
  }
}
