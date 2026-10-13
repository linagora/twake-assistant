// Fake openRAG for the QA environment: the routes of openRAG that cozy-stack calls (model/rag),
// in memory, with canned answers instead of an LLM. No dependency: node server.mjs.
//
// The answer of a chat completion is streamed word by word (FAKE_RAG_DELAY_MS between two
// chunks, so that the user can stop it), after a short reasoning. It is deterministic, and some
// words of the last user message change it, for the tests that need it:
//
//   fake-error     the stream ends on an error event
//   fake-http-500  the completion is answered with a 500
//   fake-slow      10 times slower
//   fake-long      a long answer (scrolls)
//   fake-markdown  an answer with a title, a list, a table, a link and code
//   fake-empty     an empty answer
//   fake-nosource  no source, even from the documents
//
// The answers from the documents (model ragondin-*) cite up to FAKE_RAG_SOURCES of the files
// the instance indexed in the workspace of the assistant (or in the whole partition), those
// with a word of the question in their name or content first. With websearch, a web source.
import http from 'node:http'

const PORT = Number(process.env.PORT || 8000)
const DELAY_MS = Number(process.env.FAKE_RAG_DELAY_MS || 40)
const MAX_SOURCES = Number(process.env.FAKE_RAG_SOURCES || 2)
// The callbacks of the indexer go to the stack by its name on the network: the instances are
// <uid>.cozy.localhost, which only the browser resolves
const STACK_HOST = process.env.STACK_HOST || 'cozystack'
const EXTENSIONS = [
  'txt', 'md', 'markdown', 'csv', 'json', 'html', 'htm', 'xml',
  'pdf', 'docx', 'doc', 'odt', 'pptx', 'ppt', 'odp', 'xlsx', 'xls', 'ods', 'rtf', 'eml'
]

// partition (instance domain) -> { files: Map<fileId, file>, workspaces: Map<id, name> }
const partitions = new Map()

const partition = (domain, create = false) => {
  if (!partitions.has(domain) && create) {
    partitions.set(domain, { files: new Map(), workspaces: new Map() })
  }
  return partitions.get(domain)
}

const log = (...args) => console.log(new Date().toISOString(), ...args)

const send = (res, status, body) => {
  if (body === undefined) {
    res.writeHead(status)
    res.end()
    return
  }
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readBody = req =>
  new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', chunk => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })

const readJSON = async req => {
  const raw = await readBody(req)
  if (raw.length === 0) return {}
  return JSON.parse(raw.toString('utf8'))
}

const readForm = async (req, url) => {
  const body = await readBody(req)
  const request = new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': req.headers['content-type'] || '' },
    body
  })
  return request.formData()
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// The text of a file, for the sources: only what reads as text
const textOf = async file => {
  if (!file || typeof file.text !== 'function') return ''
  const text = await file.text()
  // eslint-disable-next-line no-control-regex
  return /[\u0000-\u0008\u000e-\u001f]/.test(text.slice(0, 2000)) ? '' : text
}

// Tells the stack the file is indexed, as the indexer of openRAG does once it is done
const callback = (callbackURL, payload) => {
  if (!callbackURL) return
  let url
  try {
    url = new URL(callbackURL)
  } catch {
    return
  }
  const body = JSON.stringify(payload)
  const req = http.request(
    {
      host: STACK_HOST,
      port: url.port || 80,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        Host: url.host,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    res => {
      res.resume()
      log('callback', url.host, payload.file_id, payload.status, '->', res.statusCode)
    }
  )
  req.on('error', err => log('callback', url.host, payload.file_id, 'failed:', err.message))
  req.end(body)
}

const upload = async (req, res, url, domain, fileId, isNew) => {
  const p = partition(domain, true)
  if (isNew && p.files.has(fileId)) {
    return send(res, 409, { detail: `File '${fileId}' already exists in partition ${domain}` })
  }
  if (!isNew && !p.files.has(fileId)) {
    return send(res, 404, { detail: `File '${fileId}' not found in partition ${domain}` })
  }
  const form = await readForm(req, url)
  const file = form.get('file')
  const name = url.searchParams.get('name') || file?.name || fileId
  let metadata = {}
  try {
    metadata = JSON.parse(form.get('metadata') || '{}')
  } catch {
    metadata = {}
  }
  let workspaces = []
  try {
    workspaces = JSON.parse(form.get('workspace_ids') || '[]')
  } catch {
    workspaces = []
  }
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : ''
  const text = await textOf(file)
  p.files.set(fileId, {
    id: fileId,
    name,
    dirId: url.searchParams.get('dir_id') || '',
    md5sum: url.searchParams.get('md5sum') || metadata.md5sum || '',
    metadata,
    text,
    workspaces: new Set(workspaces)
  })
  log(isNew ? 'index' : 'reindex', domain, fileId, name, workspaces)
  send(res, isNew ? 201 : 202, { task_status_url: `/indexer/task/${fileId}` })
  setTimeout(
    () =>
      callback(form.get('callback_url'), {
        partition: domain,
        file_id: fileId,
        status: EXTENSIONS.includes(ext) ? 'success' : 'notsupported',
        metadata: { doc_rev: metadata.doc_rev || '' }
      }),
    500
  )
}

// Fake answers

const lastUserMessage = messages => {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return String(messages[i].content || '')
  }
  return ''
}

const words = text => (text.toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []).slice(0, 50)

const pickSources = (domain, workspace, question) => {
  const p = partition(domain)
  if (!p) return []
  const files = [...p.files.values()].filter(f => !workspace || f.workspaces.has(workspace))
  const terms = words(question)
  const score = f => {
    const haystack = `${f.name} ${f.text}`.toLowerCase()
    return terms.filter(t => haystack.includes(t)).length
  }
  return files
    .map(f => ({ f, s: score(f) }))
    .sort((a, b) => b.s - a.s || a.f.name.localeCompare(b.f.name))
    .slice(0, MAX_SOURCES)
    .map(({ f }) => ({
      file_url: `/indexer/partition/${domain}/file/${f.id}`,
      chunk_url: `/indexer/partition/${domain}/file/${f.id}/chunk/0`,
      chunk: {
        file_id: f.id,
        filename: f.name,
        doctype: f.metadata.doctype || 'io.cozy.files',
        parent_id: f.dirId,
        datetime: f.metadata.datetime || f.metadata.created_at || '',
        page: 1
      },
      content: f.text.slice(0, 300)
    }))
}

const MARKDOWN = `# Fake answer

This is a **fake** answer of the QA environment, with _Markdown_:

- a first item
- a second item, with \`inline code\`

| Name  | Role      |
|-------|-----------|
| Alice | Developer |
| Bob   | Designer  |

A link: [Twake](https://twake.app).

\`\`\`js
console.log('hello')
\`\`\`
`

const answerFor = (question, sources, direct) => {
  const lower = question.toLowerCase()
  if (lower.includes('fake-empty')) return ''
  if (lower.includes('fake-markdown')) return MARKDOWN
  const quoted = question.replace(/\s+/g, ' ').trim()
  const short = quoted.length > 120 ? `${quoted.slice(0, 117)}...` : quoted
  let answer = `This is a fake answer of the QA environment to: "${short}".`
  if (direct) {
    answer += ' It comes from the LLM alone, without the documents.'
  } else if (sources.length > 0) {
    const names = sources.map(s => s.chunk?.filename || s.title).join(', ')
    answer += ` It is based on ${names}. [Sources: ${sources.map((_, i) => i + 1).join(', ')}]`
  } else {
    answer += ' No document was found to answer it.'
  }
  if (lower.includes('fake-long')) {
    const paragraph =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ' +
      'incididunt ut labore et dolore magna aliqua.'
    answer += '\n\n' + Array.from({ length: 20 }, (_, i) => `${i + 1}. ${paragraph}`).join('\n\n')
  }
  return answer
}

const chunk = (id, created, model, delta, finish, extra) => ({
  id,
  object: 'chat.completion.chunk',
  created,
  model,
  choices: [{ index: 0, delta, finish_reason: finish }],
  ...(extra && { extra: JSON.stringify(extra) })
})

const completions = async (req, res) => {
  const payload = await readJSON(req)
  const model = String(payload.model || 'fake-llm')
  const direct = !model.startsWith('ragondin-')
  const domain = direct ? '' : model.slice('ragondin-'.length)
  const metadata = payload.metadata || {}
  const messages = Array.isArray(payload.messages) ? payload.messages : []
  const question = lastUserMessage(messages)
  const lower = question.toLowerCase()
  log('completion', direct ? '(direct)' : domain, metadata.workspace || '', JSON.stringify(question.slice(0, 80)))

  if (!direct && !partition(domain)) {
    return send(res, 404, { detail: `Partition '${domain}' not found` })
  }
  if (lower.includes('fake-http-500')) {
    return send(res, 500, { detail: 'Fake internal error' })
  }

  let sources = []
  if (!lower.includes('fake-nosource')) {
    if (!direct) sources = pickSources(domain, metadata.workspace, question)
    if (metadata.websearch) {
      sources.push({
        source_type: 'web',
        url: 'https://twake.app/',
        title: 'Twake Workplace',
        snippet: 'A fake web result of the QA environment.'
      })
    }
  }
  const extra = sources.length > 0 ? { sources } : undefined
  const answer = answerFor(question, sources, direct)
  const id = `chatcmpl-fake-${Date.now()}`
  const created = Math.floor(Date.now() / 1000)

  if (payload.stream === false) {
    return send(res, 200, {
      id,
      object: 'chat.completion',
      created,
      model,
      choices: [{ index: 0, message: { role: 'assistant', content: answer }, finish_reason: 'stop' }],
      ...(extra && { extra: JSON.stringify(extra) })
    })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  let closed = false
  res.on('close', () => {
    closed = true
  })
  const delay = lower.includes('fake-slow') ? DELAY_MS * 10 : DELAY_MS
  const emit = async event => {
    if (closed) return false
    res.write(`data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`)
    await sleep(delay)
    return !closed
  }

  for (const piece of ['Reading ', 'the ', 'question. ', 'Writing ', 'a ', 'fake ', 'answer.']) {
    if (!(await emit(chunk(id, created, model, { reasoning_content: piece }, null)))) return
  }
  const pieces = answer.match(/\s*\S+\s*/g) || ['']
  for (const [i, piece] of pieces.entries()) {
    if (lower.includes('fake-error') && i === Math.min(5, pieces.length - 1)) {
      await emit({ error: { code: 'fake_error', message: 'Fake error in the middle of the answer' } })
      res.end()
      return
    }
    if (!(await emit(chunk(id, created, model, { content: piece }, null, extra)))) {
      log('completion stopped by the client')
      return
    }
  }
  await emit(chunk(id, created, model, {}, 'stop', extra))
  await emit('[DONE]')
  res.end()
}

// Routes

const routes = [
  ['GET', /^\/health_check$/, (req, res) => send(res, 200, { status: 'ok' })],
  ['GET', /^\/indexer\/supported\/types$/, (req, res) => send(res, 200, { extensions: EXTENSIONS })],
  ['POST', /^\/v1\/chat\/completions$/, completions],
  ['GET', /^\/v1\/models$/, (req, res) => send(res, 200, { object: 'list', data: [] })],
  ['POST', /^\/v1\/tools\/execute$/, (req, res) => send(res, 404, { detail: 'No tool in the fake openRAG' })],

  ['POST', /^\/partition\/([^/]+)$/, (req, res, [domain]) => {
    if (partition(domain)) return send(res, 409, { detail: 'Partition already exists' })
    partition(domain, true)
    log('partition', domain)
    send(res, 201, { partition: domain })
  }],
  ['GET', /^\/partition\/([^/]+)\/?$/, (req, res, [domain]) => {
    const p = partition(domain)
    if (!p) return send(res, 404, { detail: `Partition '${domain}' not found` })
    send(res, 200, {
      files: [...p.files.keys()].map(id => ({ link: `/partition/${domain}/file/${id}` }))
    })
  }],
  ['DELETE', /^\/partition\/([^/]+)$/, (req, res, [domain]) => {
    partitions.delete(domain)
    send(res, 204)
  }],
  ['DELETE', /^\/instances\/([^/]+)$/, (req, res, [domain]) => {
    partitions.delete(domain)
    send(res, 204)
  }],

  ['GET', /^\/partition\/([^/]+)\/file\/([^/]+)$/, (req, res, [domain, fileId]) => {
    const f = partition(domain)?.files.get(fileId)
    if (!f) return send(res, 404, { detail: `File '${fileId}' not found` })
    send(res, 200, { file_id: f.id, metadata: { ...f.metadata, md5sum: f.md5sum, filename: f.name } })
  }],
  ['POST', /^\/indexer\/partition\/([^/]+)\/file\/([^/]+)$/, (req, res, [domain, fileId], url) =>
    upload(req, res, url, domain, fileId, true)],
  ['PUT', /^\/indexer\/partition\/([^/]+)\/file\/([^/]+)$/, (req, res, [domain, fileId], url) =>
    upload(req, res, url, domain, fileId, false)],
  ['DELETE', /^\/indexer\/partition\/([^/]+)\/file\/([^/]+)$/, (req, res, [domain, fileId]) => {
    const p = partition(domain)
    if (!p?.files.delete(fileId)) return send(res, 404, { detail: `File '${fileId}' not found` })
    log('unindex', domain, fileId)
    send(res, 204)
  }],

  ['GET', /^\/partition\/([^/]+)\/workspaces$/, (req, res, [domain]) => {
    const p = partition(domain)
    if (!p) return send(res, 404, { detail: `Partition '${domain}' not found` })
    send(res, 200, {
      workspaces: [...p.workspaces].map(([id, name]) => ({ workspace_id: id, display_name: name }))
    })
  }],
  ['POST', /^\/partition\/([^/]+)\/workspaces$/, async (req, res, [domain]) => {
    const body = await readJSON(req)
    const p = partition(domain, true)
    if (p.workspaces.has(body.workspace_id)) return send(res, 409, { detail: 'Workspace already exists' })
    p.workspaces.set(body.workspace_id, body.display_name || body.workspace_id)
    log('workspace', domain, body.workspace_id, body.display_name)
    send(res, 201, { workspace_id: body.workspace_id })
  }],
  ['GET', /^\/partition\/([^/]+)\/workspaces\/([^/]+)$/, (req, res, [domain, id]) => {
    const name = partition(domain)?.workspaces.get(id)
    if (name === undefined) return send(res, 404, { detail: `Workspace '${id}' not found` })
    send(res, 200, { workspace_id: id, display_name: name })
  }],
  ['DELETE', /^\/partition\/([^/]+)\/workspaces\/([^/]+)$/, (req, res, [domain, id]) => {
    const p = partition(domain)
    if (!p?.workspaces.delete(id)) return send(res, 404, { detail: `Workspace '${id}' not found` })
    for (const f of p.files.values()) f.workspaces.delete(id)
    send(res, 204)
  }],
  ['POST', /^\/partition\/([^/]+)\/workspaces\/([^/]+)\/files$/, async (req, res, [domain, id]) => {
    const body = await readJSON(req)
    const p = partition(domain)
    if (!p?.workspaces.has(id)) return send(res, 404, { detail: `Workspace '${id}' not found` })
    for (const fileId of body.file_ids || []) p.files.get(fileId)?.workspaces.add(id)
    send(res, 200, { workspace_id: id, file_ids: body.file_ids || [] })
  }],
  ['DELETE', /^\/partition\/([^/]+)\/workspaces\/([^/]+)\/files\/([^/]+)$/, (req, res, [domain, id, fileId]) => {
    const f = partition(domain)?.files.get(fileId)
    if (!f?.workspaces.delete(id)) return send(res, 404, { detail: 'Not in the workspace' })
    send(res, 204)
  }],
  ['GET', /^\/partition\/([^/]+)\/files\/([^/]+)\/workspaces$/, (req, res, [domain, fileId]) => {
    const f = partition(domain)?.files.get(fileId)
    if (!f) return send(res, 404, { detail: `File '${fileId}' not found` })
    send(res, 200, { workspace_ids: [...f.workspaces] })
  }]
]

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`)
  const path = decodeURIComponent(url.pathname)
  try {
    for (const [method, pattern, handler] of routes) {
      if (req.method !== method) continue
      const match = pattern.exec(path)
      if (match) {
        await handler(req, res, match.slice(1), url)
        return
      }
    }
    log('unknown route', req.method, path)
    send(res, 404, { detail: `No route ${req.method} ${path} in the fake openRAG` })
  } catch (err) {
    log('error', req.method, path, err.stack || err)
    if (!res.headersSent) send(res, 500, { detail: String(err.message || err) })
    else res.end()
  }
})

server.listen(PORT, () => log(`fake openRAG listening on ${PORT}`))
