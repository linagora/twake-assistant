/**
 * Runs assistant-ui on a conversation of the stack: the history comes from
 * CouchDB, the answers from the chat shared with the scribe.
 */

import { AssistantRuntimeProvider } from '@assistant-ui/react'
import type { ThreadMessageLike } from '@assistant-ui/react'
import React, { useMemo, useEffect, ReactNode } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { useQuery, isQueryLoading } from 'cozy-client'
import Minilog from 'cozy-minilog'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Spinner from 'cozy-ui/transpiled/react/Spinner'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import { useAssistant } from './AssistantProvider'
import { resolveConversationAssistantId } from './KnowledgeBase/conversationAssistant'
import { useDefaultAssistantId } from './KnowledgeBase/useDefaultAssistantId'
import { DEFAULT_ASSISTANT } from './constants'
import { buildChatConversationQueryById } from './queries'

import { useChatRuntime } from '@/hooks/useChatRuntime'
import { makeChatMessages } from '@/lib/scribe'

const log = Minilog('🔍 [CozyAssistantRuntimeProvider]')

interface Conversation {
  _id: string
  messages?: object[]
  relationships?: {
    assistant?: {
      data: {
        _id: string
      }
    }
  }
}

interface CozyAssistantRuntimeProviderProps {
  children: ReactNode
}

const NO_MESSAGES: object[] = []

const ConversationLoader = ({
  children,
  conversationId
}: CozyAssistantRuntimeProviderProps & {
  conversationId: string
}): JSX.Element | null => {
  const { t } = useI18n()
  const { setSelectedAssistantId } = useAssistant()
  const conversationQuery = buildChatConversationQueryById(conversationId)
  const queryResult = useQuery(
    conversationQuery.definition,
    conversationQuery.options
  ) as { data: Conversation | undefined; fetchStatus: string }
  const conversation = queryResult.data
  const isLoading = isQueryLoading(queryResult)
  const boundId = conversation?.relationships?.assistant?.data?._id
  const defaultId = useDefaultAssistantId()
  // The assistant picked to start this conversation on, set by
  // useConversation when navigating here
  const { state: locationState } = useLocation() as {
    state: { assistantId?: string } | null
  }
  const requestedId = locationState?.assistantId

  const initialMessages = useMemo(
    () => makeChatMessages(conversation?.messages ?? NO_MESSAGES, t),
    [conversation?.messages, t]
  )

  // Undefined until the conversation, and the default a new one starts
  // on, are known: the runtime waits, or a message could go to the
  // sentinel assistant before the configured default is selected.
  const resolvedAssistantId = resolveConversationAssistantId({
    boundId,
    conversation,
    isLoading,
    defaultId,
    requestedId
  })

  // Again on every conversation: the user may have left the knowledge base
  // of the assistant in the previous one, which selected the sentinel
  useEffect(() => {
    if (resolvedAssistantId) setSelectedAssistantId(resolvedAssistantId)
  }, [conversationId, resolvedAssistantId, setSelectedAssistantId])

  if (resolvedAssistantId === undefined) {
    return (
      <div className="u-flex u-flex-items-center u-flex-justify-center u-h-100 u-w-100">
        <Spinner size="xxlarge" />
      </div>
    )
  }

  return (
    <CozyAssistantRuntimeProviderInner
      key={conversationId}
      conversationId={conversationId}
      initialMessages={initialMessages}
    >
      {children}
    </CozyAssistantRuntimeProviderInner>
  )
}

const CozyAssistantRuntimeProviderInner = ({
  children,
  conversationId,
  initialMessages
}: CozyAssistantRuntimeProviderProps & {
  conversationId: string
  initialMessages: ThreadMessageLike[]
}): JSX.Element => {
  const { selectedAssistantId, websearchEnabled } = useAssistant()
  const request = useMemo(
    () => ({
      hasDocuments: true,
      // The default assistant is a client-side sentinel with no CouchDB
      // document behind it: the stack answers with its own
      assistantId:
        selectedAssistantId !== DEFAULT_ASSISTANT._id
          ? selectedAssistantId
          : null,
      websearch: websearchEnabled
    }),
    [selectedAssistantId, websearchEnabled]
  )
  const { runtime } = useChatRuntime({
    conversationId,
    messages: initialMessages,
    request
  })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  )
}

/** Must be rendered under a route with a `conversationId` param. */
const CozyAssistantRuntimeProvider = ({
  children
}: CozyAssistantRuntimeProviderProps): JSX.Element | null => {
  const { conversationId } = useParams<{ conversationId: string }>()

  if (!conversationId) {
    return null
  }

  return (
    <ConversationLoader conversationId={conversationId}>
      {children}
    </ConversationLoader>
  )
}

class CozyAssistantErrorBoundary extends React.Component<
  { children: ReactNode; t: (key: string) => string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; t: (key: string) => string }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): {
    hasError: boolean
    error: Error
  } {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    log.error('Assistant Runtime UI crashed:', error, errorInfo)
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="u-flex u-flex-column u-flex-items-center u-flex-justify-center u-h-100 u-w-100 u-ta-center">
          <Typography variant="h4" className="u-mb-1" color="error">
            {this.props.t('assistant.default_error')}
          </Typography>
          <Button
            label={this.props.t('assistant.actions.reload')}
            onClick={this.handleRetry}
            variant="secondary"
          />
        </div>
      )
    }

    return this.props.children
  }
}

const CozyAssistantRuntimeProviderWithErrorBoundary = (
  props: CozyAssistantRuntimeProviderProps
): JSX.Element | null => {
  const { t } = useI18n()
  return (
    <CozyAssistantErrorBoundary t={t}>
      <CozyAssistantRuntimeProvider {...props} />
    </CozyAssistantErrorBoundary>
  )
}

export default CozyAssistantRuntimeProviderWithErrorBoundary
