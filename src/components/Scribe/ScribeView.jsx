import {
  ThreadPrimitive,
  useComposerRuntime,
  useThread
} from '@assistant-ui/react'
import React, { useEffect, useRef, useState } from 'react'

import {
  CrossSmall,
  History,
  Icon,
  Note,
  Previous
} from '@linagora/twake-icons'
import { RealTimeQueries, isQueryLoading, useQuery } from 'cozy-client'
import Minilog from 'cozy-minilog'
import Button from 'cozy-ui/transpiled/react/Buttons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import DocumentAssistant from '@/assets/illu-document-assistant.svg'
import { ScribeAnswer } from '@/components/Scribe/ScribeAnswer'
import { ScribeComposer } from '@/components/Scribe/ScribeComposer'
import { ScribeHistory } from '@/components/Scribe/ScribeHistory'
import { ScribeIncludeZone } from '@/components/Scribe/ScribeIncludeZone'
import { ScribeProvider, useScribe } from '@/components/Scribe/ScribeProvider'
import { ScribeRequest } from '@/components/Scribe/ScribeRequest'
import { ScribeSuggestions } from '@/components/Scribe/ScribeSuggestions'
import { handleCardKey } from '@/components/Scribe/scribeKeyboard'
import styles from '@/components/Scribe/styles.styl'
import { makeConversationId } from '@/components/helpers'
import { DOCTYPE_AI_CHAT_CONVERSATIONS } from '@/doctypes'
import { getScribeWording, makeChatMessages } from '@/lib/scribe'
import { buildConversationByIdQuery } from '@/queries'

const log = Minilog('🤖 [ScribeView]')

const MESSAGE_COMPONENTS = {
  UserMessage: ScribeRequest,
  AssistantMessage: ScribeAnswer
}

function makeNewConversation() {
  return { id: makeConversationId(), messages: [] }
}

function HeaderButton({ label, isPressed, onClick, children }) {
  return (
    <Tooltip title={label}>
      <IconButton
        size="small"
        color="inherit"
        aria-label={label}
        aria-pressed={isPressed}
        onClick={onClick}
      >
        {children}
      </IconButton>
    </Tooltip>
  )
}

function handleThreadKeyDown(event) {
  if (event.nativeEvent.isComposing) return
  const root = event.currentTarget
  const composer = root.querySelector('[data-scribe-composer]')
  if (handleCardKey(event, root, composer)) event.preventDefault()
}

// The draft of the app goes into the composer of the first conversation only
function useComposerDraft(draftRef) {
  const composerRuntime = useComposerRuntime()

  useEffect(() => {
    if (!draftRef.current) return
    composerRuntime.setText(draftRef.current)
    draftRef.current = null
  }, [composerRuntime, draftRef])
}

// Hidden, not unmounted, under the history: an answer goes on. Without a
// text, the app opened it on the user's documents, like the file list of
// Drive: the answers come from the whole Drive.
function ScribeConversation({ isHidden, hasText, draftRef }) {
  const { t } = useI18n()
  const isEmpty = useThread(state => state.messages.length === 0)
  const { hasDocuments } = useScribe()
  const inputRef = useRef(null)
  const { welcome, placeholder } = getScribeWording(t, {
    hasText,
    hasDocuments
  })
  useComposerDraft(draftRef)

  return (
    <ThreadPrimitive.Root
      data-scribe-thread
      className={`u-flex u-flex-column u-flex-auto u-ov-hidden${isHidden ? ' u-hide' : ''}`}
      onKeyDown={handleThreadKeyDown}
    >
      <ThreadPrimitive.Viewport
        autoScroll
        className={styles['scribe-messages']}
      >
        {isEmpty && (
          <div className="u-flex u-flex-column u-flex-items-center u-flex-justify-center u-h-100 u-pt-2 u-bxz">
            <DocumentAssistant aria-hidden="true" />
            <Typography
              variant="body2"
              component="h2"
              color="textSecondary"
              className="u-ta-center u-mt-1-half u-mb-1 u-o-70"
            >
              {welcome}
            </Typography>
            <ScribeSuggestions inputRef={inputRef} />
          </div>
        )}
        <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
      </ThreadPrimitive.Viewport>
      <div className={styles['scribe-footer']}>
        {/* Without a text, the prompts stay in the welcome: not over a past
            conversation opened again */}
        {hasText && !isEmpty && <ScribeSuggestions inputRef={inputRef} />}
        <ScribeIncludeZone />
        <ScribeComposer placeholder={placeholder} inputRef={inputRef} />
        <Typography
          variant="overline"
          color="textSecondary"
          component="p"
          className="u-mt-1 u-mb-0 u-ta-center"
        >
          {t('assistant.disclaimer')}
        </Typography>
      </div>
    </ThreadPrimitive.Root>
  )
}

function ScribeCompactConversation({
  conversationId,
  draftRef,
  onPanelRequest
}) {
  const { t } = useI18n()
  const composerRuntime = useComposerRuntime()
  useComposerDraft(draftRef)

  const handlePanelRequest = () =>
    onPanelRequest(composerRuntime.getState().text, conversationId)

  return (
    <ThreadPrimitive.Root
      data-scribe-thread
      className="u-flex u-flex-column"
      onKeyDown={handleThreadKeyDown}
    >
      <ScribeSuggestions />
      {onPanelRequest && (
        <Button
          variant="text"
          className="u-flex-self-start u-mv-half"
          startIcon={<Icon icon={Note} size={16} />}
          label={t('scribe.panel')}
          onClick={handlePanelRequest}
        />
      )}
      <ScribeIncludeZone />
      <ScribeComposer placeholder={t('scribe.placeholder')} />
      <ThreadPrimitive.Messages components={MESSAGE_COMPONENTS} />
    </ThreadPrimitive.Root>
  )
}

function ScribeHeader({
  isHistoryOpen,
  onBack,
  onNew,
  onToggleHistory,
  onClose
}) {
  const { t } = useI18n()

  return (
    <header className="u-flex u-flex-items-center u-flex-shrink-0 u-pt-1 u-ph-1">
      {isHistoryOpen && (
        <HeaderButton label={t('scribe.back')} onClick={onBack}>
          <Icon icon={Previous} size={16} />
        </HeaderButton>
      )}
      <Typography
        variant="h5"
        component="h1"
        className="u-flex-auto u-ellipsis"
      >
        {t('scribe.title')}
      </Typography>
      <HeaderButton label={t('scribe.new')} onClick={onNew}>
        <Icon icon={Note} size={16} color="var(--secondaryTextColor)" />
      </HeaderButton>
      <HeaderButton
        label={t('scribe.history.title')}
        isPressed={isHistoryOpen}
        onClick={onToggleHistory}
      >
        <Icon icon={History} size={16} color="var(--secondaryTextColor)" />
      </HeaderButton>
      {onClose && (
        <HeaderButton label={t('scribe.close')} onClick={onClose}>
          <Icon icon={CrossSmall} size={16} color="var(--secondaryTextColor)" />
        </HeaderButton>
      )}
    </header>
  )
}

function ScribeLayout({
  layout = 'panel',
  initialConversation = null,
  draft = null,
  onClose = null,
  onPanelRequest = null,
  onResize = null,
  ...props
}) {
  const { t } = useI18n()
  const rootRef = useRef(null)
  const draftRef = useRef(draft)
  const [conversation, setConversation] = useState(
    initialConversation ?? makeNewConversation
  )
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const isCompact = layout === 'compact'

  useEffect(() => {
    if (!onResize) return
    const root = rootRef.current
    const observer = new ResizeObserver(() =>
      onResize({ height: root.scrollHeight })
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [onResize])

  const handleNew = () => {
    setConversation(makeNewConversation())
    setIsHistoryOpen(false)
  }
  const handleToggleHistory = () => setIsHistoryOpen(isOpen => !isOpen)
  const handleCloseHistory = () => setIsHistoryOpen(false)
  const handleOpen = past => {
    if (past._id !== conversation.id) {
      setConversation({
        id: past._id,
        messages: makeChatMessages(past.messages, t)
      })
    }
    setIsHistoryOpen(false)
  }
  // The conversation on screen is deleted: a new one takes its place
  const handleDelete = deleted => {
    if (deleted._id === conversation.id) setConversation(makeNewConversation())
  }

  return (
    <div
      ref={rootRef}
      // Compact, as high as its content: the app sizes its popover after it
      className={
        isCompact
          ? 'u-flex u-flex-column u-bxz u-w-100 u-p-1'
          : styles['scribe']
      }
    >
      <RealTimeQueries doctype={DOCTYPE_AI_CHAT_CONVERSATIONS} />
      {!isCompact && (
        <ScribeHeader
          isHistoryOpen={isHistoryOpen}
          onBack={handleCloseHistory}
          onNew={handleNew}
          onToggleHistory={handleToggleHistory}
          onClose={onClose}
        />
      )}
      {isHistoryOpen && (
        <ScribeHistory
          conversationId={conversation.id}
          onOpen={handleOpen}
          onDelete={handleDelete}
        />
      )}
      <ScribeProvider
        key={conversation.id}
        {...props}
        layout={layout}
        onCancel={onClose}
        conversationId={conversation.id}
        messages={conversation.messages}
      >
        {isCompact ? (
          <ScribeCompactConversation
            conversationId={conversation.id}
            draftRef={draftRef}
            onPanelRequest={onPanelRequest}
          />
        ) : (
          <ScribeConversation
            isHidden={isHistoryOpen}
            hasText={Boolean(props.text)}
            draftRef={draftRef}
          />
        )}
      </ScribeProvider>
    </div>
  )
}

function isNotFound(error) {
  return error?.status === 404
}

// The stack does not have a conversation before its first request, as the
// one of a draft handed over: the scribe goes on with its id. On another
// error, a new conversation: no request goes to one whose history is not shown
function makeHandedConversation(conversationId, result, t) {
  if (result.data) {
    return {
      id: conversationId,
      messages: makeChatMessages(result.data.messages, t)
    }
  }
  return isNotFound(result.lastError)
    ? { id: conversationId, messages: [] }
    : null
}

function ScribeOnConversation({ conversationId, ...props }) {
  const { t } = useI18n()
  const query = buildConversationByIdQuery(conversationId)
  const result = useQuery(query.definition, {
    ...query.options,
    onError: error => {
      if (isNotFound(error)) return
      log.error(`Cannot load the conversation ${conversationId}`, error)
    }
  })

  if (isQueryLoading(result)) return null

  return (
    <ScribeLayout
      {...props}
      initialConversation={makeHandedConversation(conversationId, result, t)}
    />
  )
}

/**
 * The assistant as a scribe: it works on a text of the app that opened it,
 * and hands its answers back. See ScribeProvider for the other props.
 *
 * @param {object} props
 * @param {'panel'|'compact'} [props.layout] - 'compact' for a popover: no
 * header, the prompts and the composer first, then the latest exchange only
 * @param {string} [props.conversation] - the id of the conversation to start
 * on
 * @param {string} [props.draft] - the text to start the composer with
 * @param {Function} [props.onClose] - no close button without it
 * @param {Function} [props.onPanelRequest] - called with the text of the
 * composer and the id of the conversation, to go on in a panel: no row for
 * it without it
 * @param {Function} [props.onResize] - called with the height of the scribe
 * each time it changes
 */
export function ScribeView({ conversation = null, ...props }) {
  // The app opens the scribe on a conversation: its next data do not move it
  const [conversationId] = useState(conversation)

  if (conversationId) {
    return <ScribeOnConversation conversationId={conversationId} {...props} />
  }
  return <ScribeLayout {...props} />
}
