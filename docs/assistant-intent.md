# Assistant Intent

This document describes the **Assistant intent** exposed by Twake Assistant.

It assumes you already know how to create and run a Cozy intent (requesting an intent, loading the returned service URL, and handling the generic `ready` / `done` / `error` / `cancel` postMessage flow). It documents what is specific to the Assistant service: its data, its messages (see [Protocol](#protocol)), and how they line up with the draft standard of Open Buro (see [Interoperability with Open Buro](#interoperability-with-open-buro)).

## Intent identity

Open the assistant by requesting this intent:

```ts
action = 'OPEN'
type = 'io.cozy.ai.chat.conversations'
```

The service renders the AI assistant in the frame of the calling app, on a new conversation: the assistant of the Twake Assistant app, with its conversations and its assistants. The frame can be a modal or a side panel: the assistant adapts to the width it is given.

Unlike a picker, this intent does not end with a result. The assistant stays open for as many requests as the user makes. The calling app closes the intent.

## Configuration

Pass the Assistant configuration in the intent data.

- With `IntentDialogOpener`, pass it as the `options` prop.
- With `IntentIframe`, pass it as the `data` prop.
- With `cozy-interapp`, pass it as the third argument of `intents.create()`.
- In a raw intent, post it to the service in reply to its `ready` message.

The assistant only reads the data it receives in that handshake. It does not read `attributes.data` of the intent document: with `cozy-interapp` 0.20.1 or later, the data are not sent to the cozy-stack at all when the intent is created.

```json
{
  "theme": { "type": "dark" }
}
```

## AssistantIntentConfig

```ts
interface AssistantIntentConfig {
  /**
   * Theme used to render the assistant.
   * Defaults to the theme of the Cozy instance.
   */
  theme?: { type: 'light' | 'dark' }
}
```

## Defaults

When no config is provided, the assistant uses:

```js
{
  theme: { type: undefined }
}
```

A field that is missing, `null` or of another type falls back to its default. The assistant never fails on a configuration it cannot read: it opens with what it understands.

### Theme

Use `theme.type` with `light` or `dark` to force the theme of the assistant. The theme is fixed when the intent is opened and does not change while it remains open.

`undefined`, an invalid value or an omitted value makes the assistant follow the Cozy instance theme, with the system color scheme as a fallback. Following the Cozy instance theme implies a request to the backend. So if the calling app knows its theme, it should pass it.

The assistant paints its own background with its theme: it does not show the background of the calling app through its frame.

`IntentDialogOpener` and `IntentIframe` from `cozy-ui-plus` also apply an explicit theme to their dialog, close button and loading surface. Custom intent containers remain responsible for styling their own UI. The option never changes Cozy settings, local storage or the caller's global theme.

## End of the intent

The assistant never sends a `done` message: the promise of the intent does not resolve with a document.

The calling app ends the intent when the user closes its modal or its panel, by stopping the intent or by removing its iframe. The assistant has no button to close itself.

## Error handling

The intent does not throw errors back to the calling app: it never sends an `error` message.

When the assistant cannot start, it displays a message in its frame.

## Cancel result

There is no Assistant cancellation payload.

The assistant only sends the generic intent `cancel` when its page is unloaded while the intent is still open.

## `readyToUse` signal

In addition to the generic intent `ready` handshake, the assistant sends a `readyToUse` message once its UI is rendered with the data of the intent.

The signal fires exactly once per intent.

## Protocol

The messages of the assistant intent, in order. They all go through `window.postMessage`, and the type of each one holds the id of the intent.

| # | Direction | Message | Content | API |
| --- | --- | --- | --- | --- |
| 1 | Assistant → app | `intent-{id}:ready` | none | handled by `cozy-interapp` |
| 2 | App → assistant | the data, without envelope | `AssistantIntentConfig` | third argument of `intents.create()`, `service.getData()` |
| 3 | Assistant → app | `intent-{id}:readyToUse` | none, once | `onReadyToUse` option of `start()` |
| 4 | Assistant → app | `intent-{id}:cancel` | none, only when the page of the assistant is unloaded | the intent promise resolves with `null` |

The calling app ends the exchange itself, by stopping the intent or removing its iframe (see [End of the intent](#end-of-the-intent)). The assistant never sends `done`, `error` or `resize`.

Each side checks where a message comes from: `cozy-interapp` takes the messages of the client from the origin of the assistant only, with the id of its intent, and the assistant takes the messages of the service from the origin of the calling app only (`attributes.client` of the intent document).

The messages of an exchange, one per line:

```jsonc
// 1. ready
{ "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:ready" }
// 2. the data
{ "theme": { "type": "light" } }
// 3. readyToUse
{ "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:readyToUse" }
```

## Interoperability with Open Buro

[Open Buro](https://github.com/openburo) drafts a standard for applications that do not know each other to work together, each one showing its own interface in an iframe of the other and talking with `postMessage`. Its TechSprint #02 (June 2026) wrote an Editor's Draft for a first use case, the file picker: [TechSprint-n-02-juin-2026-FilePicker](https://github.com/openburo/TechSprint-n-02-juin-2026-FilePicker).

That draft is not normative yet: its message catalogue, the shape of its envelope and of its answers, and the API of its Bridge are marked as reserved. The assistant intent does not follow it to the letter. It is kept in line with it: the same model, messages that map one to one, and no choice that a future Open Buro binding could not carry.

### The same model

| Open Buro draft | Assistant intent |
| --- | --- |
| A **consumer** casts an intent, a **provider** serves it | The calling app casts the intent, Twake Assistant serves it |
| The provider declares its capabilities in a manifest, a platform registry lists them, a chooser picks one | The assistant declares its intent in its manifest (`intents`), the cozy-stack lists the services of an intent (`POST /intents`) |
| The provider supplies the whole interface, the consumer none | The same |
| The consumer owns the lifecycle and tears the iframe down | The same: the assistant never closes itself |
| `intent:ready`, provider → consumer | `intent-{id}:ready` |
| `intent:init`, consumer → provider, with the parameters | The data, in reply to `ready` |
| `intent:resize`, optional | `intent-{id}:resize`, not sent by the assistant |
| `intent:cancel`, `intent:error` | `intent-{id}:cancel` on unload, no error |
| An `intentId` in every message | The id of the intent in the type of every message |
| Strict origins: no `*` target, the origin of every message checked | The same (see [Protocol](#protocol)) |

### The differences, and how they are bridged

- **Envelope.** Open Buro leans towards `{ type: "intent:done", intentId, payload }`, where `cozy-interapp` puts the id in the type (`intent-{id}:readyToUse`) and replies to `ready` with the data alone. The mapping is mechanical: an Open Buro binding of `cozy-interapp` can speak both, without a change to the assistant.
- **`readyToUse`.** No Open Buro equivalent. Like `intent:resize` there, it is optional: a calling app must not wait for it.
- **Capability.** Open Buro only defines `PICK` and `SAVE`. The assistant is `OPEN` on `io.cozy.ai.chat.conversations`; as an Open Buro capability it would be a new action, declared in the manifest of the provider.
- **Source of the messages.** Open Buro also binds every message to the `Window` it expects (`event.source === iframe.contentWindow`). `cozy-interapp` checks the origin and the id of the intent, not the window yet: the check to add for an Open Buro binding.

## Opening the assistant

With `IntentDialogOpener`:

```jsx
<IntentDialogOpener
  action="OPEN"
  doctype="io.cozy.ai.chat.conversations"
  options={{ theme: { type: 'dark' } }}
  waitForReadyToUse
>
  <Button label={t('assistant.open')} />
</IntentDialogOpener>
```

## Limitations

The assistant in the frame expects the bar of an app above it: in a frame of the full height of the window, an empty band of the height of the bar stays under its composer.
