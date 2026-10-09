import CozyClient from 'cozy-client'
import flag from 'cozy-flags'
import log from 'cozy-logger'

import { autoprovisionAssistants } from '@/components/KnowledgeBase/autoprovision'

// Runs daily: a change of the flag emits no event, and the app only sets
// the assistants up when it is opened
const run = async () => {
  const client = CozyClient.fromEnv(process.env)
  await flag.initialize(client)
  const result = await autoprovisionAssistants(client)
  log('info', `autoprovision: ${JSON.stringify(result)}`)
}

run().catch(error => {
  log('critical', error.message)
  process.exit(1)
})
