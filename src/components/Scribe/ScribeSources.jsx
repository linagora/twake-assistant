import React, { useMemo } from 'react'

import { useClient, useQuery } from 'cozy-client'
import Link from 'cozy-ui/transpiled/react/Link'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useI18n } from 'twake-i18n'

import styles from '@/components/Scribe/styles.styl'
import { getFileSourceIds, makeSourceLinks } from '@/lib/sources'
import { buildFilesByIdsQuery } from '@/queries'

/**
 * The documents an answer comes from, when the user asked for their
 * documents
 */
export function ScribeSources({ sources }) {
  const { t } = useI18n()
  const client = useClient()
  const fileIds = useMemo(() => getFileSourceIds(sources), [sources])
  const filesQuery = buildFilesByIdsQuery(fileIds)
  const { data: files } = useQuery(filesQuery.definition, filesQuery.options)

  const links = makeSourceLinks({ sources, files: files ?? [], client })
  if (links.length === 0) return null

  return (
    <div className="u-mt-half">
      <Typography variant="caption" color="textSecondary">
        {t('scribe.sources', { smart_count: links.length })}
      </Typography>
      <ul className={styles['scribe-sources']}>
        {links.map(link => (
          <li key={link.key}>
            <Link href={link.href} target="_blank" rel="noopener noreferrer">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
