import cx from 'classnames'
import React from 'react'

import { Globe, Mail } from '@linagora/twake-icons'
import { useI18n } from 'twake-i18n'

import SourceButton from './SourceButton'
import KnowledgeBaseChip from '../KnowledgeBase/KnowledgeBaseChip'
import { useSelectedAssistantKnowledgeBase } from '../KnowledgeBase/useSelectedAssistantKnowledgeBase'

/**
 * The sources of the answers, in the composer of a new conversation: the
 * knowledge base folder of the assistant, which the user can leave out of
 * the conversation, and the flagged web and email sources. Emails show on
 * the default assistant always, on a custom one once enabled in the wizard:
 * sources are switched from the wizard, never from the composer.
 */
const TwakeKnowledgeSelector = ({
  className,
  showWebsearch,
  showMail,
  websearchEnabled,
  onToggleWebsearch
}) => {
  const { t } = useI18n()
  const {
    dirId,
    folderName,
    hasFolder,
    isUnavailable,
    setKnowledgeBaseFolder,
    removeKnowledgeBase
  } = useSelectedAssistantKnowledgeBase()

  // Pointer activation leaves the focus on the button, whose focus style
  // would then differ from the sibling sources until something else takes
  // it. Drop it for pointer activation only (`detail > 0`), so keyboard
  // users keep their focus ring.
  const handleToggleWebsearch = event => {
    if (event.detail > 0) {
      event.currentTarget.blur()
    }
    onToggleWebsearch(event)
  }

  return (
    <div
      role="group"
      aria-label={t('assistant.twake_knowledges.search_in')}
      className={cx('u-flex u-flex-items-center', className)}
    >
      {hasFolder && (
        <KnowledgeBaseChip
          dirId={dirId}
          folderName={folderName}
          isUnavailable={isUnavailable}
          onChangeFolder={setKnowledgeBaseFolder}
          onRemove={removeKnowledgeBase}
        />
      )}
      {showWebsearch && (
        <SourceButton
          icon={Globe}
          label={t('assistant.websearch.label')}
          isActive={websearchEnabled}
          aria-pressed={websearchEnabled}
          onClick={handleToggleWebsearch}
          className="u-ml-half"
        />
      )}
      {showMail && (
        <SourceButton
          icon={Mail}
          preserveColor
          label={t('assistant.twake_knowledges.mail')}
          className="u-ml-half"
        />
      )}
    </div>
  )
}

export default TwakeKnowledgeSelector
