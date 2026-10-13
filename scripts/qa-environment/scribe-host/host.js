// Opens the assistant intent in a side panel and lists what it sends back, with the raw
// protocol of cozy-interapp: POST /intents, an iframe on the service, the data posted in
// reply to its `ready` message, then `intent-<id>:data` for new data.
const TEXT = 'bonjour à tous, la réunion de demain est decalé a jeudi 14h'

const PRESETS = {
  'Full scribe (text and answer actions)': {
    content: TEXT,
    answerActions: [
      { name: 'insert', label: 'Insert in the note' },
      { name: 'replace', label: 'Replace the selection' }
    ]
  },
  'Text only': { content: TEXT },
  'Answer actions only': { answerActions: [{ name: 'insert' }, { name: 'replace' }] },
  'Capabilities': {
    content: TEXT,
    answerActions: [{ name: 'insert' }],
    capabilities: [
      {
        name: 'insert_slide',
        label: 'Insert the slide',
        description:
          'add a new slide after the current one in the presentation the user is editing, with a title and bullet points. Pick it when the user asks for a new slide.',
        examples: [{ message: 'Add a slide about the budget', needs_documents: false }],
        parameters: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'the title of the slide, short' },
            bullets: {
              type: 'array',
              items: { type: 'string' },
              description: 'the bullet points of the slide, 3 to 6 short lines'
            }
          },
          required: ['title', 'bullets']
        },
        confirm: true
      },
      {
        name: 'search',
        description: 'reserved name: left out by the assistant',
        parameters: { type: 'object', properties: { query: { type: 'string' } } }
      }
    ]
  },
  'Suggestions': {
    content: TEXT,
    answerActions: [{ name: 'insert' }],
    suggestions: [
      { name: 'fix', prompt: 'correct-grammar' },
      { name: 'catalogue' },
      { name: 'agenda', label: 'Write an agenda', message: 'Write the agenda of the meeting' },
      {
        name: 'translate',
        label: 'Translate',
        options: [
          { name: 'fr', prompt: 'translate-french' },
          { name: 'en', prompt: 'translate-english' }
        ]
      }
    ]
  },
  'Dark theme': { content: TEXT, answerActions: [{ name: 'insert' }], theme: { type: 'dark' } },
  'Nothing (the assistant as in its app)': {},
  'Invalid fields (must open anyway)': {
    content: 42,
    answerActions: [{ label: 'no name' }, 'insert'],
    capabilities: 'none',
    theme: { type: 'purple' }
  }
}

const cozy = JSON.parse(document.getElementById('app').dataset.cozy)
const stackURL = `${window.location.protocol}//${cozy.domain}`

const $ = id => document.getElementById(id)
let current = null

const log = (kind, payload) => {
  const li = document.createElement('li')
  li.textContent = `${new Date().toLocaleTimeString()} ${kind}${
    payload === undefined ? '' : ` ${JSON.stringify(payload, null, 2)}`
  }`
  $('messages').appendChild(li)
  li.scrollIntoView({ block: 'nearest' })
}

const readConfig = () => {
  try {
    const config = JSON.parse($('config').value || '{}')
    $('config-error').textContent = ''
    return config
  } catch (err) {
    $('config-error').textContent = `Invalid JSON: ${err.message}`
    return null
  }
}

const setOpen = open => {
  $('panel').classList.toggle('open', open)
  $('send').disabled = !open
  $('close').disabled = !open
}

const close = () => {
  if (!current) return
  window.removeEventListener('message', current.listener)
  current.iframe.remove()
  current = null
  setOpen(false)
}

const createIntent = async () => {
  const res = await fetch(`${stackURL}/intents`, {
    method: 'POST',
    // The token of a webapp only goes with the session of the user
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${cozy.token}`,
      'Content-Type': 'application/vnd.api+json',
      Accept: 'application/vnd.api+json'
    },
    body: JSON.stringify({
      data: {
        type: 'io.cozy.intents',
        attributes: { action: 'OPEN', type: 'io.cozy.ai.chat.conversations', permissions: [] }
      }
    })
  })
  if (!res.ok) throw new Error(`POST /intents: ${res.status} ${await res.text()}`)
  const { data } = await res.json()
  const service = data.attributes.services?.[0]
  if (!service) throw new Error('No app offers the OPEN intent on io.cozy.ai.chat.conversations')
  return { id: data.id, href: service.href }
}

const open = async () => {
  const config = readConfig()
  if (config === null) return
  close()
  let intent
  try {
    intent = await createIntent()
  } catch (err) {
    log('error', err.message)
    return
  }
  const origin = new URL(intent.href).origin
  const iframe = document.createElement('iframe')
  iframe.title = 'Assistant'
  iframe.src = intent.href
  const listener = event => {
    if (event.origin !== origin || typeof event.data?.type !== 'string') return
    const [, id, subtype] = /^intent-(.*):(.*)$/.exec(event.data.type) || []
    if (id !== intent.id) return
    const { type, ...payload } = event.data
    log(subtype, Object.keys(payload).length > 0 ? payload : undefined)
    if (subtype === 'ready') {
      current.window = event.source
      event.source.postMessage(current.config, event.origin)
    } else if (['done', 'cancel', 'error'].includes(subtype)) {
      close()
    }
  }
  current = { id: intent.id, origin, iframe, listener, config, window: null }
  window.addEventListener('message', listener)
  $('panel').appendChild(iframe)
  setOpen(true)
  log('opened', { intent: intent.id, href: intent.href })
}

const sendAgain = () => {
  const config = readConfig()
  if (config === null || !current) return
  current.config = config
  if (current.window) {
    current.window.postMessage({ type: `intent-${current.id}:data`, data: config }, current.origin)
    log('sent', config)
  }
}

for (const name of Object.keys(PRESETS)) {
  const option = document.createElement('option')
  option.value = option.textContent = name
  $('preset').appendChild(option)
}
const showPreset = () => {
  $('config').value = JSON.stringify(PRESETS[$('preset').value], null, 2)
  $('config-error').textContent = ''
}
$('preset').addEventListener('change', showPreset)
$('open').addEventListener('click', open)
$('send').addEventListener('click', sendAgain)
$('close').addEventListener('click', close)
$('clear').addEventListener('click', () => ($('messages').textContent = ''))
showPreset()
