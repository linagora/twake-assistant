import { Q } from 'cozy-client'

import { ROOT_DIR_ID } from './knowledgeBase'
import {
  RAG_INDEX_FILES_DEBOUNCE,
  createRagIndexTriggers,
  fetchAssistants,
  findRagIndexTriggers,
  makeRagIndexTriggerAttributes,
  migrateKnowledgeBases
} from './ragIndexing'

const FILES = 'io.cozy.files'
const ASSISTANTS = 'io.cozy.ai.chat.assistants'

const filesTrigger = {
  _id: 'trigger-files',
  _type: 'io.cozy.triggers',
  type: '@event',
  worker: 'rag-index',
  arguments: FILES,
  debounce: '30s',
  message: { doctype: FILES }
}
const assistantsTrigger = {
  _id: 'trigger-assistants',
  _type: 'io.cozy.triggers',
  type: '@event',
  worker: 'rag-index',
  arguments: ASSISTANTS,
  message: { doctype: FILES }
}
const cronFilesTrigger = {
  _id: 'trigger-cron-files',
  _type: 'io.cozy.triggers',
  type: '@cron',
  worker: 'rag-index',
  arguments: FILES,
  message: { doctype: FILES }
}

const makeClient = ({ triggers = [], assistants = [] } = {}) => {
  const triggersCollection = {
    find: jest.fn().mockResolvedValue({ data: triggers }),
    create: jest.fn(async attributes => ({
      data: { _id: `created-${attributes.arguments}`, ...attributes }
    })),
    launch: jest.fn().mockResolvedValue({ data: { _id: 'job-1' } }),
    destroy: jest.fn(async trigger => ({ data: trigger }))
  }
  const client = {
    collection: jest.fn(doctype => {
      if (doctype === 'io.cozy.triggers') return triggersCollection
      throw new Error(`unexpected collection ${doctype}`)
    }),
    queryAll: jest.fn(async () => assistants),
    save: jest.fn(async doc => ({ data: doc }))
  }
  return { client, triggersCollection }
}

describe('makeRagIndexTriggerAttributes', () => {
  it('debounces the files trigger only', () => {
    expect(makeRagIndexTriggerAttributes(FILES)).toEqual({
      type: '@event',
      arguments: FILES,
      debounce: RAG_INDEX_FILES_DEBOUNCE,
      worker: 'rag-index',
      message: { doctype: FILES }
    })
    expect(makeRagIndexTriggerAttributes(ASSISTANTS)).toEqual({
      type: '@event',
      arguments: ASSISTANTS,
      worker: 'rag-index',
      message: { doctype: FILES }
    })
    expect(RAG_INDEX_FILES_DEBOUNCE).toBe('30s')
  })
})

describe('findRagIndexTriggers', () => {
  it('sorts the triggers by kind', async () => {
    const { client, triggersCollection } = makeClient({
      triggers: [filesTrigger, assistantsTrigger]
    })
    const found = await findRagIndexTriggers(client)
    expect(triggersCollection.find).toHaveBeenCalledWith({
      worker: 'rag-index'
    })
    expect(found.files).toBe(filesTrigger)
    expect(found.assistants).toBe(assistantsTrigger)
  })

  it('returns nulls when there is nothing', async () => {
    const { client } = makeClient()
    expect(await findRagIndexTriggers(client)).toEqual({
      files: null,
      assistants: null
    })
  })

  it('ignores a rag-index trigger that is not an @event trigger', async () => {
    const { client } = makeClient({ triggers: [cronFilesTrigger] })
    const found = await findRagIndexTriggers(client)
    expect(found.files).toBeNull()
    expect(found.assistants).toBeNull()
  })
})

const relationship = (...data) => ({ knowledgeBase: { data } })

describe('migrateKnowledgeBases', () => {
  it('moves the knowledge bases to the relationship, with a folder', async () => {
    const { client } = makeClient({
      assistants: [
        {
          _id: 'a1',
          _type: ASSISTANTS,
          knowledgeBase: [{ doctype: 'com.linagora.email' }]
        },
        {
          _id: 'a2',
          _type: ASSISTANTS,
          relationships: {
            provider: { data: { _id: 'p' } },
            ...relationship({ _id: 'd', _type: FILES })
          }
        },
        {
          _id: 'a3',
          _type: ASSISTANTS,
          knowledgeBase: [{ doctype: FILES, dirId: 'd' }],
          relationships: { provider: { data: { _id: 'p' } } }
        },
        { _id: 'a4', _type: ASSISTANTS }
      ]
    })
    const migrated = await migrateKnowledgeBases(client)
    expect(migrated).toEqual(['a1', 'a3', 'a4'])
    expect(client.queryAll).toHaveBeenCalledWith(Q(ASSISTANTS).limitBy(1000), {
      as: `${ASSISTANTS}/all`
    })
    expect(client.save).toHaveBeenCalledTimes(3)
    expect(client.save).toHaveBeenCalledWith({
      _id: 'a1',
      _type: ASSISTANTS,
      knowledgeBase: [
        { doctype: 'com.linagora.email' },
        { doctype: FILES, dirId: ROOT_DIR_ID }
      ],
      relationships: relationship(
        { _type: 'com.linagora.email' },
        { _id: ROOT_DIR_ID, _type: FILES }
      )
    })
    expect(client.save).toHaveBeenCalledWith({
      _id: 'a3',
      _type: ASSISTANTS,
      knowledgeBase: [{ doctype: FILES, dirId: 'd' }],
      relationships: {
        provider: { data: { _id: 'p' } },
        ...relationship({ _id: 'd', _type: FILES })
      }
    })
    expect(client.save).toHaveBeenCalledWith({
      _id: 'a4',
      _type: ASSISTANTS,
      knowledgeBase: [{ doctype: FILES, dirId: ROOT_DIR_ID }],
      relationships: relationship({ _id: ROOT_DIR_ID, _type: FILES })
    })
  })

  it('gives the root folder to a relationship without folder', async () => {
    const { client } = makeClient({
      assistants: [
        {
          _id: 'a1',
          _type: ASSISTANTS,
          relationships: relationship({ _type: 'com.linagora.email' })
        }
      ]
    })
    expect(await migrateKnowledgeBases(client)).toEqual(['a1'])
  })

  it('ignores a conflict on one assistant and goes on', async () => {
    const { client } = makeClient({
      assistants: [
        { _id: 'a1', _type: ASSISTANTS },
        { _id: 'a2', _type: ASSISTANTS }
      ]
    })
    client.save.mockImplementationOnce(async () => {
      throw Object.assign(new Error('conflict'), { status: 409 })
    })
    expect(await migrateKnowledgeBases(client)).toEqual(['a2'])
  })
})

describe('createRagIndexTriggers', () => {
  it('creates the missing triggers and launches the files one', async () => {
    const { client, triggersCollection } = makeClient()
    await expect(createRagIndexTriggers(client)).resolves.toEqual([
      ASSISTANTS,
      FILES
    ])
    expect(triggersCollection.create).toHaveBeenCalledTimes(2)
    expect(triggersCollection.launch).toHaveBeenCalledTimes(1)
  })

  it('creates nothing when both triggers exist', async () => {
    const { client, triggersCollection } = makeClient({
      triggers: [filesTrigger, assistantsTrigger]
    })
    await expect(createRagIndexTriggers(client)).resolves.toEqual([])
    expect(triggersCollection.create).not.toHaveBeenCalled()
    expect(triggersCollection.launch).not.toHaveBeenCalled()
  })

  it('removes the files trigger it could not launch', async () => {
    const { client, triggersCollection } = makeClient()
    const launchError = new Error('launch failed')
    triggersCollection.launch.mockRejectedValue(launchError)

    await expect(createRagIndexTriggers(client)).rejects.toBe(launchError)
    expect(triggersCollection.destroy).toHaveBeenCalledTimes(1)
    expect(triggersCollection.destroy.mock.calls[0][0]._id).toBe(
      'created-io.cozy.files'
    )
  })

  it('creates the files trigger when the existing one is not an @event trigger', async () => {
    const { client, triggersCollection } = makeClient({
      triggers: [cronFilesTrigger, assistantsTrigger]
    })
    await expect(createRagIndexTriggers(client)).resolves.toEqual([FILES])
    expect(triggersCollection.create).toHaveBeenCalledWith(
      makeRagIndexTriggerAttributes(FILES)
    )
  })

  it('creates the assistants trigger without launching it', async () => {
    const { client, triggersCollection } = makeClient({
      triggers: [filesTrigger]
    })
    await expect(createRagIndexTriggers(client)).resolves.toEqual([ASSISTANTS])
    expect(triggersCollection.launch).not.toHaveBeenCalled()
  })
})

describe('fetchAssistants', () => {
  it('lists every assistant', async () => {
    const assistants = [{ _id: 'a' }, { _id: 'b' }]
    const { client } = makeClient({ assistants })
    await expect(fetchAssistants(client)).resolves.toEqual(assistants)
    expect(client.queryAll).toHaveBeenCalledTimes(1)
  })
})

describe('migrateKnowledgeBases with the assistants given', () => {
  it('does not query them again', async () => {
    const { client } = makeClient()
    const assistants = [
      { _id: 'bare', _type: ASSISTANTS },
      {
        _id: 'ok',
        _type: ASSISTANTS,
        relationships: relationship({ _id: 'dir-1', _type: FILES })
      }
    ]
    await expect(migrateKnowledgeBases(client, assistants)).resolves.toEqual([
      'bare'
    ])
    expect(client.queryAll).not.toHaveBeenCalled()
    expect(client.save).toHaveBeenCalledTimes(1)
  })
})
