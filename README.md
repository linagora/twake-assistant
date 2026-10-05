# Twake Assistant

The AI assistant of Twake Workplace as a standalone Cozy app. It renders the
assistant of [cozy-search](https://github.com/cozy/cozy-libs/tree/master/packages/cozy-search),
the one embedded in Twake Drive and Home, on its own route.

## Routes

- `#/assistant/:conversationId`: a conversation.
- Any other route opens a new conversation.

## Intent

Another app opens the assistant with the `OPEN` intent on
`io.cozy.ai.chat.conversations`, in a modal or in a side panel. With a text
or answer actions in its data, the assistant is a scribe: it offers prompts
about the text of the app, and hands its answers back for the app to insert
them. See [the Assistant intent](docs/assistant-intent.md).

## Requirements on the instance

- The flag `cozy.assistant.enabled`.
- A RAG server configured in cozy-stack (`rag:` in `cozy.yml`).
- For the scribe, a cozy-stack that knows the `documents` and `instructions`
  options of `POST /ai/chat/conversations/:id`.
- For the answers of the scribe, a `cozy-interapp` with the `result`
  message (`service.sendResult()`), in the assistant and in the app that
  opens it.
- Optional: `cozy.assistant.autoprovision` lists the assistants to create. The
  app sets them up at startup, with the `rag-index` triggers that index their
  folders.

## Develop

```sh
yarn install
yarn build
cozy-stack apps install aiassistant file://$PWD/build --domain cozy.localhost:8080
```

Use `yarn watch` to rebuild on change, `yarn lint` and `yarn test` before
committing.
