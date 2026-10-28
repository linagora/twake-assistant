# Twake Assistant

The AI assistant of Twake Workplace as a standalone Cozy app.

## Routes

- `#/assistant/:conversationId`: a conversation.
- Any other route opens a new conversation.

## Intent

Another app opens the assistant with the `OPEN` intent on
`io.cozy.ai.chat.conversations`, in a modal or in a side panel. The
assistant opens as a scribe, whatever its data: it offers prompts about the
text of the app, hands its answers back for the app to insert them, and calls
the capabilities of the app, what it can do beside taking an answer, when a
request needs one. See
[the Assistant intent](docs/assistant-intent.md).

## Requirements on the instance

- The flag `cozy.assistant.enabled`.
- A RAG server configured in cozy-stack (`rag:` in `cozy.yml`).
- For the scribe, a cozy-stack that knows the `documents` and `instructions`
  options of `POST /ai/chat/conversations/:id`, and its `actions` for the
  capabilities.
- For the answers of the scribe, `cozy-interapp` 0.20.0 or later in the app
  that opens it.
- Optional: `cozy.assistant.autoprovision` lists the assistants to create. The
  app sets them up when it opens, and a service once a day to follow the
  changes of the flag, with the `rag-index` triggers that index their
  folders. An entry names an existing folder by `dirId` (a folder id or a
  magic folder like `io.cozy.apps/meet`), by `dirName` (a path from the
  root), or both: `dirName` is then used when `dirId` does not resolve, and
  the assistant stays on it afterwards. An entry whose folder does not exist
  is retried later, unless it sets `autoCreateFolder: true`: the `dirName`
  folder is then created or, for a magic folder, a folder at the root named
  after `name` (`dirName` if none), referenced by its app, which then uses
  it. The assistant's id derives from `name`, unless the entry sets `id`,
  to point at an assistant created outside the flag. The first entry with
  `default: true` is the one new conversations start on, and it replaces
  the built-in assistant in the menu.

## Develop

```sh
yarn install
yarn build
cozy-stack apps install aiassistant file://$PWD/build --domain cozy.localhost:8080
```

Use `yarn watch` to rebuild on change, `yarn lint` and `yarn test` before
committing.
