import React, { useRef, useState } from 'react'

import { Drive, Icon, LinkOut, Pen } from '@linagora/twake-icons'
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
import SourceButton, { CHIP_CLASSES } from '../TwakeKnowledges/SourceButton'
import sourceStyles from '../TwakeKnowledges/styles.styl'

/**
 * Clicking opens a menu rather than Drive: open the folder in a new tab, or
 * change it with the folder picker, saved on the assistant at once. Changing
 * it follows the flag of editing assistants. The icon variant, without a
 * label, names the folder at the top of the menu.
 */
const KnowledgeBaseChip = ({
  dirId,
  folder,
  isRoot,
  isUnavailable,
  onChangeFolder,
  variant = 'chip'
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

  const label = isUnavailable
    ? t('assistant.knowledge_base.unavailable')
    : isRoot
      ? t('assistant.twake_knowledges.drive')
      : (folder?.name ?? '…')

  return (
    <>
      {variant === 'icon' ? (
        <SourceButton
          ref={chipRef}
          icon={Drive}
          preserveColor
          label={label}
          isActive={!isUnavailable}
          aria-haspopup="menu"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen(true)}
        />
      ) : (
        // No hint on a folder that is gone
        <Tooltip
          title={isUnavailable ? '' : t('assistant.knowledge_base.folder_hint')}
          placement="top"
          classes={{
            tooltip: styles['folder-tooltip'],
            arrow: styles['folder-tooltip-arrow']
          }}
        >
          <div ref={chipRef}>
            <Chip
              icon={<Icon icon={Drive} size={16} preserveColor />}
              label={label}
              clickable={hasActions}
              aria-haspopup={hasActions ? 'menu' : undefined}
              aria-expanded={hasActions ? isMenuOpen : undefined}
              onClick={hasActions ? () => setIsMenuOpen(true) : undefined}
              className={sourceStyles['source-chip']}
              classes={CHIP_CLASSES}
            />
          </div>
        </Tooltip>
      )}
      {isMenuOpen && (
        <ActionsMenu
          open
          ref={chipRef}
          onClose={closeMenu}
          actions={[]}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {variant === 'icon' && (
            <Typography
              variant="body2"
              className="u-ph-1 u-pb-half u-ellipsis"
              component="div"
            >
              {label}
            </Typography>
          )}
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
