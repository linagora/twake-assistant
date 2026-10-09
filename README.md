# Twake Assistant

The AI assistant of Twake Workplace as a standalone Cozy app.

## Routes

- `#/assistant/:conversationId`: a conversation.
- Any other route opens a new conversation.

## Intent

Another app opens the assistant with the `OPEN` intent on
`io.cozy.ai.chat.conversations`, in a modal or in a side panel. With a text,
answer actions, capabilities or suggestions in its data, the assistant is a
scribe: it offers prompts about the text of the app, hands its answers back
for the app to insert them, and calls the capabilities of the app, what it
can do beside taking an answer, when a request needs one. See
[the Assistant intent](docs/assistant-intent.md).

## Requirements on the instance

- The flag `cozy.assistant.enabled`.
- A RAG server configured in cozy-stack (`rag:` in `cozy.yml`).
- For the scribe, a cozy-stack that knows the `documents` and `instructions`
  options of `POST /ai/chat/conversations/:id`, and its `actions` for the
  capabilities.
- For the answers of the scribe, `cozy-interapp` 0.20.0 or later in the app
  that opens it.
- Optional: `cozy.assistant.autoprovision` lists the assistants to create. A
  service of the app sets them up once after the install, with the
  `rag-index` triggers that index their folders; the app checks them again
  when it opens.

## Develop

```sh
yarn install
yarn build
cozy-stack apps install aiassistant file://$PWD/build --domain cozy.localhost:8080
```

Use `yarn watch` to rebuild on change, `yarn lint` and `yarn test` before
committing.
