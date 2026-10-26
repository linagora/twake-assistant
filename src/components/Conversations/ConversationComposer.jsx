import { useComposer, useThread } from '@assistant-ui/react'
import cx from 'classnames'
import React, { useCallback, useState } from 'react'

import flag from 'cozy-flags'
import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'

import { useAssistant } from '../AssistantProvider'
import { useSelectedAssistantKnowledgeBase } from '../KnowledgeBase/useSelectedAssistantKnowledgeBase'
import TwakeKnowledgeSelector from '../TwakeKnowledges/TwakeKnowledgeSelector'
import ConversationBar from './ConversationBar'
import { ConversationComposerRoot } from './ConversationComposerRoot'
import { ConversationSendButton } from './ConversationSendButton'
import styles from './styles.styl'

/**
 * A new conversation shows its sources in a row above the prompt, in a
 * card; otherwise the prompt is a single line, with its send button by the
 * text, that grows above the button for long prompts.
 */
const ConversationComposer = ({ placeholder, inputRef }) => {
  const { isMobile } = useBreakpoints()
  const isRunning = useThread(state => state.isRunning)
  const isThreadEmpty = useThread(state => state.messages.length === 0)
  const isEmpty = useComposer(state => state.isEmpty)
  const [isMultiline, setIsMultiline] = useState(false)
  const { websearchEnabled, setWebsearchEnabled } = useAssistant()
  const { hasFolder, isRealAssistant, hasEmail } =
    useSelectedAssistantKnowledgeBase()

  const showWebsearch = !!flag('cozy.assistant.websearch.enabled')
  const showMail =
    !!flag('cozy.assistant.source-knowledge.mail.enabled') &&
    (!isRealAssistant || hasEmail)
  const hasSources = isThreadEmpty && (hasFolder || showWebsearch || showMail)

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

  const handleToggleWebsearch = useCallback(() => {
    if (isRunning) return
    setWebsearchEnabled(prev => !prev)
  }, [isRunning, setWebsearchEnabled])

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
            <ConversationSendButton />
          </div>
        )}
      </div>
      {isMultiline && (
        <div
          className={cx('u-flex u-flex-justify-end', styles['composerActions'])}
        >
          <ConversationSendButton />
        </div>
      )}
    </ConversationComposerRoot>
  )
}

export default ConversationComposer
