import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RealTimeQueries } from 'cozy-client'
import Intents from 'cozy-interapp'
import Minilog from 'cozy-minilog'
import { AssistantView } from 'cozy-search'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { IntentProviders } from '@/components/IntentProviders'
import {
  DOCTYPE_AI_CHAT_ASSISTANTS,
  DOCTYPE_AI_CHAT_CONVERSATIONS
} from '@/doctypes'
import { ASSISTANT_ROUTE_PATH, makeConversationId } from '@/lib/conversation'
import { getIntentConfig } from '@/lib/intent'

const log = Minilog('🤖 [AssistantIntent]')

function IntentError() {
  const { t } = useI18n()

  return (
    <div className="u-flex u-flex-items-center u-flex-justify-center u-h-100">
      <Typography role="alert" color="error">
        {t('intent.error')}
      </Typography>
    </div>
  )
}

// The assistant as it is in the app, on a new conversation
function PlainAssistant() {
  const [conversationId] = useState(makeConversationId)

  return (
    <MemoryRouter initialEntries={[`/assistant/${conversationId}`]}>
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_CONVERSATIONS} />
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_ASSISTANTS} />
      <div className="u-w-100 u-h-100 u-flex u-flex-column">
        <Routes>
          <Route path={ASSISTANT_ROUTE_PATH} element={<AssistantView />} />
        </Routes>
      </div>
    </MemoryRouter>
  )
}

function AssistantIntentView({ service }) {
  const hasNotifiedReadyRef = useRef(false)

  // The assistant is rendered: an app that waits for it can show the intent
  useEffect(() => {
    if (hasNotifiedReadyRef.current) return
    hasNotifiedReadyRef.current = true
    service.notifyReadyToUse()
  }, [service])

  return <PlainAssistant />
}

/**
 * The assistant opened by another app (see docs/assistant-intent.md)
 */
export function AssistantIntent({ client, lang, polyglot, intentId }) {
  const [service, setService] = useState(null)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const fetchService = async () => {
      try {
        const intents = new Intents({ client })
        setService(await intents.createService(intentId, window))
      } catch (error) {
        log.error('Cannot start the assistant intent', error)
        setHasError(true)
      }
    }

    fetchService()
  }, [client, intentId])

  const config = useMemo(() => getIntentConfig(service?.getData()), [service])

  // Nothing is shown before the data of the intent are known: its theme is
  // among them, and another one would flash first
  if (!service && !hasError) return null

  return (
    <IntentProviders
      client={client}
      lang={lang}
      polyglot={polyglot}
      themeType={config.theme.type}
    >
      {service ? <AssistantIntentView service={service} /> : <IntentError />}
    </IntentProviders>
  )
}
