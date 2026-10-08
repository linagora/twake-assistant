import uniqBy from 'lodash/uniqBy'

import {
  FileTypeNote,
  Globe,
  Mail,
  getFileTypeIcon
} from '@linagora/twake-icons'
import { generateWebLink, models } from 'cozy-client'

import DocsIcon from '@/components/Search/Icons/DocsIcon'
import { DOCTYPE_EMAILS, DOCTYPE_FILES } from '@/doctypes'

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

function makeAppHref(client, slug, hash) {
  return generateWebLink({
    slug,
    cozyUrl: client.getStackClient().uri,
    subDomainType: client.getInstanceOptions().subdomain,
    hash
  })
}

function makeFileHref(client, file) {
  if (models.file.isNote(file)) {
    return makeAppHref(client, 'notes', `/n/${file._id}`)
  }
  if (models.file.isDocs(file)) {
    return makeAppHref(
      client,
      'docs',
      `/bridge/docs/${file.metadata.externalId}`
    )
  }
  return makeAppHref(client, 'drive', `/folder/${file.dir_id}/file/${file._id}`)
}

function getFileIcon(file) {
  // A note and a document of Docs have mime types of their own, unknown to
  // the icons
  if (models.file.isNote(file)) return FileTypeNote
  if (models.file.isDocs(file)) return DocsIcon
  return getFileTypeIcon(file.name, file.mime)
}

// The indexing of the mails prefixes their ids, unlike the mail app
const TMAIL_PREFIX = 'tmail_'

function getEmailDate(email) {
  const time = Date.parse(email.datetime)
  return Number.isNaN(time) ? null : new Date(time).toISOString().slice(0, 10)
}

function makeEmailLink(client, email) {
  const id = email.id.startsWith(TMAIL_PREFIX)
    ? email.id.slice(TMAIL_PREFIX.length)
    : email.id

  return {
    key: `email:${email.id}`,
    label:
      [getEmailDate(email), email['email.subject']]
        .filter(Boolean)
        .join(' - ') || null,
    secondary: email['email.preview'] || null,
    href: makeAppHref(client, 'mail', `/bridge/dashboard/${id}`),
    icon: Mail
  }
}

// A link of a web source opens only a web page, not a script
function isHttpUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url.trim())
}

function getFolderPath(file) {
  if (typeof file.path !== 'string') return null
  return file.path.slice(0, file.path.lastIndexOf('/') + 1)
}

/**
 * The sources of an answer the user can open: the files, by their names
 * and folders, the mails and the web pages
 *
 * @param {object} options
 * @param {object[]} options.sources - the sources of an answer
 * @param {import('cozy-client/types/types').IOCozyFile[]} options.files -
 * the files among the sources
 * @param {import('cozy-client/types/CozyClient').default} options.client
 * @returns {{ key: string, label: string|null, secondary: string|null, href: string, icon: Function }[]}
 */
export function makeSourceLinks({ sources, files, client }) {
  const fileLinks = files.map(file => ({
    key: `file:${file._id}`,
    label: file.name,
    secondary: getFolderPath(file),
    href: makeFileHref(client, file),
    icon: getFileIcon(file)
  }))
  const emails = uniqBy(
    sources.filter(
      source =>
        source.doctype === DOCTYPE_EMAILS && typeof source.id === 'string'
    ),
    'id'
  )
  const emailLinks = emails.map(email => makeEmailLink(client, email))
  const urls = [
    ...new Set(
      sources
        .filter(
          source =>
            source.sourceType === WEB_SOURCE_TYPE && isHttpUrl(source.url)
        )
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

  return [...fileLinks, ...emailLinks, ...webLinks]
}
