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
  makeScribeCapabilities,
  makeScribePreparePrompt,
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
  const { content, answerActions, capabilities, suggestions, documents } =
    config

  // The assistant stays open after an action: the answer is a result handed
  // to the app, not the end of the intent, which the app closes itself
  const scribeActions = useMemo(
    () =>
      makeScribeAnswerActions(answerActions, t, result =>
        service.sendResult(result)
      ),
    [service, answerActions, t]
  )
  const scribeCapabilities = useMemo(
    () =>
      makeScribeCapabilities(
        capabilities,
        t,
        result => service.sendResult(result),
        suggestions
      ),
    [service, capabilities, suggestions, t]
  )
  const scribeSuggestions = useMemo(
    () =>
      content || suggestions
        ? makeScribeSuggestions(t, suggestions, scribeCapabilities)
        : [],
    [content, suggestions, scribeCapabilities, t]
  )
  const textProps = useMemo(
    () =>
      content
        ? {
            prepareQuery: makeScribePrepareQuery(content, t),
            instructions: t('scribe.instructions')
          }
        : {},
    [content, t]
  )
  const preparePrompt = useMemo(
    () => makeScribePreparePrompt(content),
    [content]
  )

  return (
    <ScribeView
      conversationId={conversationId}
      answerActions={scribeActions}
      capabilities={scribeCapabilities}
      suggestions={scribeSuggestions}
      preparePrompt={preparePrompt}
      documents={documents ?? content === ''}
      text={content}
      {...textProps}
      onClose={() => service.cancel()}
    />
  )
}

function AssistantIntentView({ service, config }) {
  const hasNotifiedReadyRef = useRef(false)
  const isScribe =
    config.content !== '' ||
    config.answerActions.length > 0 ||
    config.capabilities.length > 0 ||
    config.suggestions !== null

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
  // The app may give new data while the intent goes on, as another text
  const [data, setData] = useState(null)

  useEffect(() => {
    const fetchService = async () => {
      try {
        const intents = new Intents({ client })
        const intentService = await intents.createService(intentId, window)
        setData(intentService.getData())
        setService(intentService)
      } catch (error) {
        log.error('Cannot start the assistant intent', error)
        setHasError(true)
      }
    }

    fetchService()
  }, [client, intentId])

  useEffect(() => service?.onData?.(setData), [service])

  const config = useMemo(() => getIntentConfig(data), [data])
  // The theme is the one of the opening: new data do not change it
  const [themeType, setThemeType] = useState(null)
  if (service && themeType === null && config.theme.type !== null) {
    setThemeType(config.theme.type)
  }

  // Nothing is shown before the data of the intent are known: its theme is
  // among them, and another one would flash first
  if (!service && !hasError) return null

  return (
    <IntentProviders
      client={client}
      lang={lang}
      polyglot={polyglot}
      themeType={themeType ?? config.theme.type}
    >
      {service ? (
        <AssistantIntentView service={service} config={config} />
      ) : (
        <IntentError />
      )}
    </IntentProviders>
  )
}
