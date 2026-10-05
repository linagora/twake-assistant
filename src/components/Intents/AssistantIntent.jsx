import React, { useEffect, useMemo, useRef, useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

import { RealTimeQueries } from 'cozy-client'
import Intents from 'cozy-interapp'
import Minilog from 'cozy-minilog'
import { AssistantView } from 'cozy-search'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { IntentProviders } from '@/components/IntentProviders'
import { ScribeView } from '@/components/Scribe/ScribeView'
import {
  DOCTYPE_AI_CHAT_ASSISTANTS,
  DOCTYPE_AI_CHAT_CONVERSATIONS
} from '@/doctypes'
import { ASSISTANT_ROUTE_PATH, makeConversationId } from '@/lib/conversation'
import { getIntentConfig } from '@/lib/intent'
import {
  makeScribeAnswerActions,
  makeScribePrepareQuery,
  makeScribeSuggestions
} from '@/lib/scribe'

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

function Scribe({ service, config }) {
  const { t } = useI18n()
  const [conversationId] = useState(makeConversationId)

  const scribeProps = useMemo(() => {
    const { content, answerActions } = config

    return {
      // The assistant stays open after an action: the answer is a result
      // handed to the app, not the end of the intent, which the app closes
      // itself
      answerActions: makeScribeAnswerActions(answerActions, t, result =>
        service.sendResult(result)
      ),
      // The answers of a scribe go into the document of the app: the LLM is
      // told so, in a system message
      instructions: t('scribe.instructions'),
      ...(content && {
        suggestions: makeScribeSuggestions(t),
        prepareQuery: makeScribePrepareQuery(content, t)
      })
    }
  }, [service, config, t])

  return <ScribeView conversationId={conversationId} {...scribeProps} />
}

function AssistantIntentView({ service, config }) {
  const hasNotifiedReadyRef = useRef(false)
  // With a text or actions of the app, the assistant works for it
  const isScribe = config.content !== '' || config.answerActions.length > 0

  // The assistant is rendered: an app that waits for it can show the intent
  useEffect(() => {
    if (hasNotifiedReadyRef.current) return
    hasNotifiedReadyRef.current = true
    service.notifyReadyToUse()
  }, [service])

  return isScribe ? (
    <Scribe service={service} config={config} />
  ) : (
    <PlainAssistant />
  )
}

/**
 * The assistant opened by another app, as a scribe when the app gives a text
 * or takes the answers back (see docs/assistant-intent.md)
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
      {service ? (
        <AssistantIntentView service={service} config={config} />
      ) : (
        <IntentError />
      )}
    </IntentProviders>
  )
}
