import cx from 'classnames'
import React from 'react'

import { Cross, Drive, Icon, LinkOut, Next } from '@linagora/twake-icons'
import { useClient, generateWebLink } from 'cozy-client'
import Button from 'cozy-ui/transpiled/react/Buttons'
import IconButton from 'cozy-ui/transpiled/react/IconButton'
import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemIcon from 'cozy-ui/transpiled/react/ListItemIcon'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Paper from 'cozy-ui/transpiled/react/Paper'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import styles from './styles.styl'

/**
 * The sources of the answers of a conversation: the knowledge base folder
 * of its assistant, as a card beside the conversation
 */
export const SourcesPanel = ({
  className,
  dirId,
  folderName,
  isRoot,
  onClose
}) => {
  const { t } = useI18n()
  const client = useClient()

  const folderUrl = generateWebLink({
    slug: 'drive',
    cozyUrl: client?.getStackClient().uri,
    subDomainType: client?.getInstanceOptions().subdomain,
    hash: `/folder/${dirId}`
  })

  return (
    <Paper
      elevation={1}
      component="aside"
      aria-label={t('assistant.sources_panel.title')}
      className={cx('u-p-1 u-bdrs-8', className)}
    >
      <div className="u-flex u-flex-items-start u-flex-justify-between">
        <div>
          <Typography variant="body1">
            {t('assistant.sources_panel.title')}
          </Typography>
          <Typography variant="overline" component="p">
            {t('assistant.sources_panel.connected', { smart_count: 1 })}
          </Typography>
        </div>
        <IconButton
          size="small"
          className="u-mt-half-negative u-mr-half-negative"
          aria-label={t('assistant.sources_panel.close')}
          onClick={onClose}
        >
          <Icon icon={Cross} size={16} aria-hidden="true" />
        </IconButton>
      </div>
      <ListItem
        className={cx('u-bdrs-8 u-mt-half u-g-half', styles['sources-item'])}
      >
        <ListItemIcon>
          <Icon icon={Drive} size={20} preserveColor aria-hidden="true" />
        </ListItemIcon>
        <ListItemText
          // The whole Drive is not a folder of Drive
          primary={
            isRoot ? (
              t('assistant.twake_knowledges.drive')
            ) : (
              <span className="u-flex u-flex-items-center">
                {t('assistant.twake_knowledges.drive')}
                <Icon icon={Next} size={16} className="u-mh-half" />
                <span className="u-ellipsis">{folderName}</span>
              </span>
            )
          }
          primaryTypographyProps={{ variant: 'body2' }}
          secondary={t(
            isRoot
              ? 'assistant.sources_panel.any_content'
              : 'assistant.sources_panel.any_content_folder'
          )}
          secondaryTypographyProps={{ variant: 'caption' }}
          className="u-m-0 u-miw-0"
        />
      </ListItem>
      <Button
        variant="text"
        size="small"
        component="a"
        href={folderUrl}
        target="_blank"
        rel="noopener noreferrer"
        startIcon={<Icon icon={LinkOut} size={16} />}
        label={t('assistant.knowledge_base.open_folder')}
        className="u-mt-half"
      />
    </Paper>
  )
}
