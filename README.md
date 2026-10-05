# Twake Assistant

The AI assistant of Twake Workplace as a standalone Cozy app. It renders the
assistant of [cozy-search](https://github.com/cozy/cozy-libs/tree/master/packages/cozy-search),
the one embedded in Twake Drive and Home, on its own route.

## Routes

- `#/assistant/:conversationId`: a conversation.
- Any other route opens a new conversation.

## Requirements on the instance

- The flags `cozy.assistant.enabled` and `ai.available`.
- A RAG server configured in cozy-stack (`rag:` in `cozy.yml`).
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
