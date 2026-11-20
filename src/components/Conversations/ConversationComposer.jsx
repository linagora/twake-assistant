import { useComposer, useThread } from '@assistant-ui/react'
import cx from 'classnames'
import React, { useCallback, useState } from 'react'

import { Globe } from '@linagora/twake-icons'
import flag from 'cozy-flags'
import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { useI18n } from 'twake-i18n'

import { useAssistant } from '../AssistantProvider'
import { useSelectedAssistantKnowledgeBase } from '../KnowledgeBase/useSelectedAssistantKnowledgeBase'
import SourceButton from '../TwakeKnowledges/SourceButton'
import TwakeKnowledgeSelector from '../TwakeKnowledges/TwakeKnowledgeSelector'
import ConversationBar from './ConversationBar'
import { ConversationComposerRoot } from './ConversationComposerRoot'
import { ConversationSendButton } from './ConversationSendButton'
import styles from './styles.styl'

/**
 * A new conversation shows its sources in a row above the prompt, in a
 * card; otherwise the prompt is a single line, with its send button by the
 * text, that grows above the button for long prompts. A started one keeps
 * the web search toggle beside the send button, so its state stays visible.
 */
const ConversationComposer = ({ placeholder, inputRef }) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const isRunning = useThread(state => state.isRunning)
  const isThreadEmpty = useThread(state => state.messages.length === 0)
  const isEmpty = useComposer(state => state.isEmpty)
  const [isMultiline, setIsMultiline] = useState(false)
  const { websearchEnabled, setWebsearchEnabled } = useAssistant()
  const { dirId, isRealAssistant, hasEmail } =
    useSelectedAssistantKnowledgeBase()

  const showWebsearch = !!flag('cozy.assistant.websearch.enabled')
  const showMail =
    !!flag('cozy.assistant.source-knowledge.mail.enabled') &&
    (!isRealAssistant || hasEmail)
  const hasSources = isThreadEmpty && (!!dirId || showWebsearch || showMail)

  // Stays multiline until emptied: once the send button leaves its side,
  // the wider input could fit the text on one line and toggle in a loop
  if (isEmpty && isMultiline) {
    setIsMultiline(false)
  }

  const handleHeightChange = (height, { rowHeight }) => {
    if (height > rowHeight) {
      setIsMultiline(true)
    }
  }

  // Pointer activation leaves the focus on the button, whose focus style
  // would then differ from the sibling sources until something else takes
  // it. Drop it for pointer activation only (`detail > 0`), so keyboard
  // users keep their focus ring.
  const handleToggleWebsearch = useCallback(
    event => {
      if (event.detail > 0) {
        event.currentTarget.blur()
      }
      if (isRunning) return
      setWebsearchEnabled(prev => !prev)
    },
    [isRunning, setWebsearchEnabled]
  )

  const hasWebsearchToggle = !isThreadEmpty && showWebsearch
  const renderWebsearchToggle = className => (
    <SourceButton
      icon={Globe}
      label={t('assistant.websearch.label')}
      isActive={websearchEnabled}
      aria-pressed={websearchEnabled}
      disabled={isRunning}
      onClick={handleToggleWebsearch}
      className={className}
    />
  )

  return (
    <ConversationComposerRoot
      className={cx({
        [styles['composerContainer--single-line']]: !hasSources && !isMultiline
      })}
    >
      {hasSources && (
        <TwakeKnowledgeSelector
          className={cx('u-flex-wrap', isMobile ? 'u-mb-half' : 'u-mb-1')}
          showWebsearch={showWebsearch}
          showMail={showMail}
          websearchEnabled={websearchEnabled}
          onToggleWebsearch={handleToggleWebsearch}
        />
      )}
      <div className="u-flex u-flex-items-start u-flex-justify-between">
        <ConversationBar
          placeholder={placeholder}
          inputRef={inputRef}
          onHeightChange={handleHeightChange}
        />
        {!isMultiline && (
          <div className="u-flex u-flex-items-center u-flex-shrink-0">
            {hasWebsearchToggle && renderWebsearchToggle('u-mr-half')}
            <ConversationSendButton />
          </div>
        )}
      </div>
      {isMultiline && (
        <div
          className={cx(
            'u-flex u-flex-items-center u-flex-justify-end',
            styles['composerActions']
          )}
        >
          {hasWebsearchToggle && renderWebsearchToggle()}
          <ConversationSendButton />
        </div>
      )}
    </ConversationComposerRoot>
  )
}

export default ConversationComposer
