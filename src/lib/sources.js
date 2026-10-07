import { FileTypeNote, Globe, getFileTypeIcon } from '@linagora/twake-icons'
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

function getFileIcon(file) {
  // A note has a mime type of its own, unknown to the icons
  return models.file.isNote(file)
    ? FileTypeNote
    : getFileTypeIcon(file.name, file.mime)
}

function getFolderPath(file) {
  if (typeof file.path !== 'string') return null
  return file.path.slice(0, file.path.lastIndexOf('/') + 1)
}

/**
 * The sources of an answer the user can open: the files, by their names
 * and folders, and the web pages
 *
 * @param {object} options
 * @param {object[]} options.sources - the sources of an answer
 * @param {import('cozy-client/types/types').IOCozyFile[]} options.files -
 * the files among the sources
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @returns {{ key: string, label: string, secondary: string|null, href: string, icon: Function }[]}
 */
export function makeSourceLinks({ sources, files, client }) {
  const fileLinks = files.map(file => ({
    key: `file:${file._id}`,
    label: file.name,
    secondary: getFolderPath(file),
    href: makeFileHref(client, file),
    icon: getFileIcon(file)
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
    secondary: url,
    href: url,
    icon: Globe
  }))

  return [...fileLinks, ...webLinks]
}
