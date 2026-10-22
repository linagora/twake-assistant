import { ThreadPrimitive, useThread } from '@assistant-ui/react'
import cx from 'classnames'
import React, { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Filter, Icon } from '@linagora/twake-icons'
import Alert from 'cozy-ui/transpiled/react/Alert'
import Button from 'cozy-ui/transpiled/react/Buttons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { useI18n } from 'twake-i18n'

import ConversationComposer from './ConversationComposer'
import { ConversationWelcome } from './ConversationWelcome'
import styles from './styles.styl'
import useConversation from '../../hooks/useConversation'
import { useAssistant } from '../AssistantProvider'
import KnowledgeBaseChip from '../KnowledgeBase/KnowledgeBaseChip'
import { SourcesPanel } from '../KnowledgeBase/SourcesPanel'
import { useIsConversationAssistantGone } from '../KnowledgeBase/useIsConversationAssistantGone'
import { useSelectedAssistantKnowledgeBase } from '../KnowledgeBase/useSelectedAssistantKnowledgeBase'
import AssistantMessage from '../Messages/AssistantMessage'
import UserMessage from '../Messages/UserMessage'

const Conversation = ({ className }) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const { conversationId } = useParams()
  const { createNewConversation } = useConversation()
  // Also when the stack says so: deleted elsewhere, the cached assistant
  // still looks alive
  const isLastAnswerAssistantGone = useThread(
    state => state.messages.at(-1)?.metadata?.custom?.isAssistantGone === true
  )
  const isAssistantGone =
    useIsConversationAssistantGone(conversationId) || isLastAnswerAssistantGone
  const {
    isOpenSources: isOpenSourcesDesktop,
    setIsOpenSources: setIsOpenSourcesDesktop
  } = useAssistant()
  // Over the conversation on mobile: only on its button, and closed again
  // with the next conversation
  const [isOpenSourcesMobile, setIsOpenSourcesMobile] = useState(false)
  const isOpenSources = isMobile ? isOpenSourcesMobile : isOpenSourcesDesktop
  const setIsOpenSources = isMobile
    ? setIsOpenSourcesMobile
    : setIsOpenSourcesDesktop
  const {
    dirId,
    folderName,
    hasFolder,
    isRoot,
    isUnavailable,
    setKnowledgeBaseFolder
  } = useSelectedAssistantKnowledgeBase()

  const isThreadEmpty = useThread(state => state.messages.length === 0)
  // On mobile the conversation scrolls under the sidebar bar: once it has,
  // a fade below the bar dissolves the text instead of cutting it (at the
  // top of the scroll, the first message sits clear of the bar).
  const [isScrolled, setIsScrolled] = useState(false)
  // The prompt input, focused by the short actions of the welcome
  const inputRef = useRef(null)

  // A started conversation keeps its folder at its top, and details it in
  // the sources panel: beside the conversation on desktop, over it on
  // mobile, where its button stays to open and close it
  const hasSources = !isThreadEmpty && hasFolder
  const placeholder = hasFolder
    ? t('assistant.search.placeholder_folder')
    : t('assistant.search.placeholder')

  return (
    <div className="u-flex u-h-100">
      <ThreadPrimitive.Root
        className={cx(
          'u-flex-auto u-miw-0 u-flex u-flex-column u-flex-items-center u-flex-justify-between u-h-100 u-bxz u-pos-relative',
          className
        )}
      >
        <ThreadPrimitive.Empty>
          <ConversationWelcome inputRef={inputRef} />
        </ThreadPrimitive.Empty>
        {isMobile && !isThreadEmpty && (
          <div
            aria-hidden="true"
            className={cx(styles['viewport-fade-top'], {
              [styles['viewport-fade-top--visible']]: isScrolled
            })}
          />
        )}
        {/* The gutters: the messages, the welcome and the composer are
            centered up to a max width, and keep a margin from the edges when
            the screen is narrower. Inside the viewport, so that its scrollbar
            runs along the edge. */}
        <ThreadPrimitive.Viewport
          autoScroll
          onScroll={event => setIsScrolled(event.currentTarget.scrollTop > 0)}
          className={cx(
            'u-w-100 u-bxz u-ov-auto',
            isMobile ? 'u-ph-1' : 'u-ph-2',
            styles.conversationViewport,
            {
              'u-flex-auto': !isThreadEmpty,
              [styles['conversationViewport--filled']]: !isThreadEmpty,
              'u-mb-1': isThreadEmpty && !isMobile
            }
          )}
        >
          <div className="u-maw-7 u-mh-auto">
            {hasSources && (
              <div
                className={cx(
                  'u-flex u-flex-justify-end',
                  isMobile ? 'u-mt-1' : 'u-mt-2'
                )}
              >
                <KnowledgeBaseChip
                  dirId={dirId}
                  folderName={folderName}
                  isUnavailable={isUnavailable}
                  onChangeFolder={setKnowledgeBaseFolder}
                />
              </div>
            )}
            <ThreadPrimitive.Messages
              components={{
                UserMessage: UserMessage,
                AssistantMessage: AssistantMessage
              }}
            />
          </div>
        </ThreadPrimitive.Viewport>
        <div
          className={cx('u-w-100 u-bxz', isMobile ? 'u-ph-1' : 'u-ph-2', {
            [styles['composer-dock']]: !isThreadEmpty
          })}
        >
          {isAssistantGone ? (
            <Alert
              severity="info"
              className="u-w-100 u-maw-7 u-mh-auto u-bxz"
              action={
                <Button
                  variant="text"
                  size="small"
                  label={t('assistant.sidebar.create_new')}
                  onClick={() => createNewConversation()}
                />
              }
            >
              {t('chat.assistant_gone')}
            </Alert>
          ) : (
            <ConversationComposer
              placeholder={placeholder}
              inputRef={inputRef}
            />
          )}
          <Typography
            variant={isMobile ? 'overline' : 'caption'}
            color="textSecondary"
            component="p"
            className="u-w-100 u-maw-5-t u-maw-7 u-mh-auto u-mt-1-half  u-mb-0 u-ta-center"
          >
            {t(
              isMobile ? 'assistant.disclaimer_short' : 'assistant.disclaimer'
            )}
          </Typography>
        </div>
        {hasSources && (isMobile || !isOpenSources) && (
          <IconButton
            size="small"
            className={cx(
              'u-mr-1',
              isMobile ? 'u-mt-half' : 'u-mt-2',
              styles['sources-toggle']
            )}
            aria-label={t(
              isOpenSources
                ? 'assistant.sources_panel.close'
                : 'assistant.sources_panel.show'
            )}
            aria-pressed={isOpenSources}
            onClick={() => setIsOpenSources(open => !open)}
          >
            <Icon icon={Filter} size={20} aria-hidden="true" />
          </IconButton>
        )}
        {hasSources && isOpenSources && isMobile && (
          <SourcesPanel
            className={cx(
              'u-mt-2-half u-mh-1',
              styles['sources-panel'],
              styles['sources-panel--mobile']
            )}
            dirId={dirId}
            folderName={folderName}
            isRoot={isRoot}
            onClose={() => setIsOpenSources(false)}
          />
        )}
      </ThreadPrimitive.Root>
      {hasSources && isOpenSources && !isMobile && (
        <div className="u-flex-shrink-0 u-pt-1 u-pr-half">
          <SourcesPanel
            className={styles['sources-panel']}
            dirId={dirId}
            folderName={folderName}
            isRoot={isRoot}
            onClose={() => setIsOpenSources(false)}
          />
        </div>
      )}
    </div>
  )
}

export default Conversation
