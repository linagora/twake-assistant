import cx from 'classnames'
import React, { useRef, useState } from 'react'

import {
  Cross,
  FileTypeFolder,
  Icon,
  LinkOut,
  Pen
} from '@linagora/twake-icons'
import { useClient, generateWebLink } from 'cozy-client'
import flag from 'cozy-flags'
import ActionsMenu from 'cozy-ui/transpiled/react/ActionsMenu'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import Chip from 'cozy-ui/transpiled/react/Chips'
import Tooltip from 'cozy-ui/transpiled/react/Tooltip'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import FolderPickerDialog from './FolderPickerDialog'
import styles from './styles.styl'
import { CHIP_CLASSES } from '../TwakeKnowledges/SourceButton'
import sourceStyles from '../TwakeKnowledges/styles.styl'

/**
 * The folder the assistant answers from. Clicking opens a menu rather than
 * Drive: open the folder in a new tab, or change it with the folder picker,
 * saved on the assistant at once. Changing it follows the flag of editing
 * assistants. With `onRemove`, a cross leaves the folder out of the
 * conversation.
 */
const KnowledgeBaseChip = ({
  className,
  dirId,
  folderName,
  isUnavailable,
  onChangeFolder,
  onRemove
}) => {
  const { t } = useI18n()
  const client = useClient()
  const chipRef = useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const canChangeFolder = flag('cozy.assistant.create-assistant.enabled')
  const hasActions = !isUnavailable || canChangeFolder

  const closeMenu = () => setIsMenuOpen(false)

  const handleChangeFolder = () => {
    closeMenu()
    setIsPickerOpen(true)
  }

  const folderUrl = generateWebLink({
    slug: 'drive',
    cozyUrl: client?.getStackClient().uri,
    subDomainType: client?.getInstanceOptions().subdomain,
    hash: `/folder/${dirId}`
  })

  return (
    <>
      {/* No hint on a folder that is gone */}
      <Tooltip
        title={isUnavailable ? '' : t('assistant.knowledge_base.folder_hint')}
        placement="top"
        classes={{
          tooltip: styles['folder-tooltip'],
          arrow: styles['folder-tooltip-arrow']
        }}
      >
        <div ref={chipRef} className={className}>
          <Chip
            icon={<Icon icon={FileTypeFolder} size={16} preserveColor />}
            label={folderName}
            clickable={hasActions}
            aria-haspopup={hasActions ? 'menu' : undefined}
            aria-expanded={hasActions ? isMenuOpen : undefined}
            onClick={hasActions ? () => setIsMenuOpen(true) : undefined}
            {...(onRemove && {
              onDelete: onRemove,
              deleteIcon: (
                <Icon
                  icon={Cross}
                  size={16}
                  aria-label={t('assistant.knowledge_base.remove')}
                />
              )
            })}
            className={cx(sourceStyles['source-chip'], styles['folder-chip'])}
            classes={{
              ...CHIP_CLASSES,
              deleteIcon: styles['folder-chip-remove']
            }}
          />
        </div>
      </Tooltip>
      {isMenuOpen && (
        <ActionsMenu
          open
          ref={chipRef}
          onClose={closeMenu}
          actions={[]}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {!isUnavailable && (
            <ActionsMenuItem
              component="a"
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={closeMenu}
            >
              <div className="u-flex u-flex-items-center">
                <Icon icon={LinkOut} size={16} className="u-mr-half" />
                <Typography variant="body1">
                  {t('assistant.knowledge_base.open_folder')}
                </Typography>
              </div>
            </ActionsMenuItem>
          )}
          {canChangeFolder && (
            <ActionsMenuItem onClick={handleChangeFolder}>
              <div className="u-flex u-flex-items-center">
                <Icon icon={Pen} size={16} className="u-mr-half" />
                <Typography variant="body1">
                  {t('assistant.knowledge_base.change_folder')}
                </Typography>
              </div>
            </ActionsMenuItem>
          )}
        </ActionsMenu>
      )}
      {canChangeFolder && isPickerOpen && (
        <FolderPickerDialog
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={onChangeFolder}
        />
      )}
    </>
  )
}

export default KnowledgeBaseChip
