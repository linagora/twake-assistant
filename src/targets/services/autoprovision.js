import CozyClient from 'cozy-client'
import flag from 'cozy-flags'
import log from 'cozy-logger'

import { autoprovisionAssistants } from '@/components/KnowledgeBase/autoprovision'

// Runs once after the install, so the folders are indexed before the
// assistant is first opened
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
