import { generateWebLink, models } from 'cozy-client'

import { DOCTYPE_FILES } from '@/doctypes'

const WEB_SOURCE_TYPE = 'web'

function isFileSource(source) {
  return (
    source.sourceType !== WEB_SOURCE_TYPE &&
    source.doctype === DOCTYPE_FILES &&
    typeof source.id === 'string'
  )
}

/**
 * @param {object[]} sources - the sources of an answer
 * @returns {string[]} the ids of the files among them, each one once: the
 * LLM may have read several parts of a same file
 */
export function getFileSourceIds(sources) {
  return [...new Set(sources.filter(isFileSource).map(source => source.id))]
}

function makeFileHref(client, file) {
  const isNote = models.file.isNote(file)

  return generateWebLink({
    slug: isNote ? 'notes' : 'drive',
    cozyUrl: client.getStackClient().uri,
    subDomainType: client.getInstanceOptions().subdomain,
    hash: isNote ? `/n/${file._id}` : `/folder/${file.dir_id}/file/${file._id}`
  })
}

/**
 * The sources of an answer the user can open: the files, by their names,
 * and the web pages
 *
 * @param {object} options
 * @param {object[]} options.sources - the sources of an answer
 * @param {import('cozy-client/types/types').IOCozyFile[]} options.files -
 * the files among the sources
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @returns {{ key: string, label: string, href: string }[]}
 */
export function makeSourceLinks({ sources, files, client }) {
  const fileLinks = files.map(file => ({
    key: `file:${file._id}`,
    label: file.name,
    href: makeFileHref(client, file)
  }))
  const urls = [
    ...new Set(
      sources
        .filter(source => source.sourceType === WEB_SOURCE_TYPE && source.url)
        .map(source => source.url)
    )
  ]
  const webLinks = urls.map(url => ({
    key: `web:${url}`,
    label: sources.find(source => source.url === url).title || url,
    href: url
  }))

  return [...fileLinks, ...webLinks]
}
