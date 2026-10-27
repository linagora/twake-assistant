import { useComposerRuntime } from '@assistant-ui/react'
import cx from 'classnames'
import React from 'react'

import { FileTypeFolder, Icon } from '@linagora/twake-icons'
import Button from 'cozy-ui/transpiled/react/Buttons'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { useCozyTheme } from 'cozy-ui/transpiled/react/providers/CozyTheme'
import { useI18n } from 'twake-i18n'

import { useSelectedAssistantKnowledgeBase } from '../KnowledgeBase/useSelectedAssistantKnowledgeBase'
import styles from './styles.styl'

import { FOLDER_ACTIONS as ACTIONS } from '@/lib/scribe'

/** The folder the answers come from, at the end of a subtitle */
export const WelcomeFolderName = ({ folderName }) => (
  <>
    <Icon
      icon={FileTypeFolder}
      size={16}
      preserveColor
      aria-hidden="true"
      className="u-mh-half"
    />
    {folderName}
  </>
)

/**
 * The welcome of an empty conversation: the assistant and its folder, with
 * short actions on it, or the plain assistant without a folder.
 * `inputRef` is the prompt input, focused once an action fills it.
 */
export const ConversationWelcome = ({ inputRef }) => {
  const { t } = useI18n()
  const { isLight } = useCozyTheme()
  const { isMobile } = useBreakpoints()
  const composerRuntime = useComposerRuntime()
  // The name from the same document as the folder: the list of assistants
  // may load later, and the title would flash the sentinel's name
  const { assistant, hasFolder, folderName, isRoot } =
    useSelectedAssistantKnowledgeBase()

  const handleAction = action => {
    composerRuntime.setText(
      t(`assistant.welcome.actions.${action.name}.prompt`)
    )
    inputRef?.current?.focus()
  }

  return (
    <div
      className={cx(
        'u-pos-relative u-w-100 u-maw-7 u-mh-auto u-bxz u-flex u-flex-auto u-flex-column u-flex-items-center u-flex-justify-center',
        // On mobile the 48px sidebar bar lies over the top: the margin clears
        // it, so the content centers between the bar and the composer
        isMobile ? 'u-ph-1 u-mt-3' : 'u-ph-2 u-mb-3',
        styles['welcome']
      )}
    >
      <div
        aria-hidden="true"
        className={cx(styles['welcome-halo'], {
          [styles['welcome-halo--dark']]: !isLight
        })}
      />
      <Typography
        variant={isMobile ? 'h3' : 'h2'}
        className={cx('u-pos-relative u-fw-normal u-ta-center', {
          [styles['welcome-title']]: !isMobile
        })}
      >
        {hasFolder
          ? t('assistant.welcome.title', { name: assistant.name })
          : t('assistant.welcome.default_title')}
      </Typography>
      <Typography
        variant="body1"
        component="p"
        className={cx(
          'u-pos-relative u-mt-1 u-ta-center u-flex u-flex-wrap u-flex-items-center u-flex-justify-center',
          isMobile ? 'u-fz-small' : 'u-fz-large'
        )}
      >
        {hasFolder ? (
          <>
            {t(
              isRoot
                ? 'assistant.welcome.subtitle'
                : 'assistant.welcome.folder_subtitle'
            )}
            <WelcomeFolderName folderName={folderName} />
          </>
        ) : (
          t('assistant.welcome.default_subtitle')
        )}
      </Typography>
      {hasFolder && (
        <div className="u-pos-relative u-mt-2 u-flex u-flex-wrap u-flex-justify-center u-g-half">
          {/* Two on mobile, to fit on one line */}
          {(isMobile ? ACTIONS.slice(0, 2) : ACTIONS).map(action => (
            <Button
              key={action.name}
              variant="ghost"
              size="small"
              className="u-fz-small"
              startIcon={<Icon icon={action.icon} size={16} />}
              label={t(`assistant.welcome.actions.${action.name}.label`)}
              onClick={() => handleAction(action)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
