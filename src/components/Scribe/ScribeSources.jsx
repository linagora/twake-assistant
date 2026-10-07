import React, { useMemo, useState } from 'react'

import { Icon, MultiFiles, Right } from '@linagora/twake-icons'
import { useClient, useQuery } from 'cozy-client'
import Chip from 'cozy-ui/transpiled/react/Chips'
import Grow from 'cozy-ui/transpiled/react/Grow'
import ListItem from 'cozy-ui/transpiled/react/ListItem'
import ListItemIcon from 'cozy-ui/transpiled/react/ListItemIcon'
import ListItemText from 'cozy-ui/transpiled/react/ListItemText'
import Paper from 'cozy-ui/transpiled/react/Paper'
import { useI18n } from 'twake-i18n'

import { getFileSourceIds, makeSourceLinks } from '@/lib/sources'
import { buildFilesByIdsQuery } from '@/queries'

const GROW_STYLE = { transformOrigin: '0 0 0' }

/**
 * The documents an answer comes from, when the user asked for their
 * documents: a chip that shows them, as the assistant does in full screen
 */
export function ScribeSources({ sources }) {
  const { t } = useI18n()
  const client = useClient()
  const [isOpen, setIsOpen] = useState(false)
  const fileIds = useMemo(() => getFileSourceIds(sources), [sources])
  const filesQuery = buildFilesByIdsQuery(fileIds)
  const { data: files } = useQuery(filesQuery.definition, filesQuery.options)

  const links = makeSourceLinks({ sources, files: files ?? [], client })
  if (links.length === 0) return null

  const handleToggle = () => setIsOpen(value => !value)

  return (
    <div className="u-mt-1">
      <Chip
        icon={<Icon icon={MultiFiles} className="u-ml-half" />}
        label={t('scribe.sources', { smart_count: links.length })}
        aria-expanded={isOpen}
        // The arrow of the chip is its delete icon, which toggles it too
        deleteIcon={
          <Icon className="u-h-1" icon={Right} rotate={isOpen ? 90 : 0} />
        }
        clickable
        onClick={handleToggle}
        onDelete={handleToggle}
      />
      <Grow in={isOpen} style={GROW_STYLE} mountOnEnter unmountOnExit>
        <div className="u-mt-1">
          {links.map(link => (
            <Paper
              key={link.key}
              variant="outlined"
              className="u-mb-half u-ov-hidden"
            >
              <ListItem
                component="a"
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                button
              >
                <ListItemIcon>
                  <Icon icon={link.icon} size={32} />
                </ListItemIcon>
                <ListItemText
                  primary={link.label}
                  // An empty line for null, but nothing for undefined
                  secondary={link.secondary ?? undefined}
                />
              </ListItem>
            </Paper>
          ))}
        </div>
      </Grow>
    </div>
  )
}
