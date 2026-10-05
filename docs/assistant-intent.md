# Assistant Intent

This document describes the **Assistant intent** exposed by Twake Assistant.

It assumes you already know how to create and run a Cozy intent (requesting an intent, loading the returned service URL, and handling the generic `ready` / `done` / `error` / `cancel` postMessage flow). It only documents what is specific to the Assistant service.

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

The assistant only reads the data it receives in that handshake. It does not read `attributes.data` of the intent document.

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
