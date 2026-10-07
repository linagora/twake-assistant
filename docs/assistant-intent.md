# Assistant Intent

This document describes the **Assistant intent** exposed by Twake Assistant.

It assumes you already know how to create and run a Cozy intent (see [the intents of cozy-stack](https://docs.cozy.io/en/cozy-stack/intents/) and [cozy-interapp](https://github.com/linagora/cozy-libs/tree/master/packages/cozy-interapp)): requesting an intent, loading the returned service URL, and handling the generic `ready` / `done` / `error` / `cancel` postMessage flow. It documents what is specific to the Assistant service: its data, its messages (see [Protocol](#protocol)), and how they line up with the draft standard of Open Buro (see [Interoperability with Open Buro](#interoperability-with-open-buro)).

## Intent identity

Open the assistant by requesting this intent:

```ts
action = 'OPEN'
type = 'io.cozy.ai.chat.conversations'
```

The service renders the AI assistant in the frame of the calling app, on a new conversation. The frame can be a modal or a side panel: the assistant adapts to the width it is given.

Depending on its configuration, the assistant is opened as it is, the assistant of the Twake Assistant app with its conversations and its assistants, or as a **scribe**: an assistant that works for the calling app. It works on a text of the app and hands its answers back for the app to insert them, and it calls the **capabilities** of the app, what the app can do beside taking an answer, when a request of the user needs one. The scribe is a conversation of its own, made for a side panel: it has no sidebar, no list of the past conversations and no choice of the assistant.

Unlike a picker, this intent does not end with a result. The assistant stays open for as many requests as the user makes, and each answer the user picks is sent to the calling app while the intent goes on. The calling app closes the intent.

## Configuration

Pass the Assistant configuration in the intent data.

- With `IntentDialogOpener`, pass it as the `options` prop.
- With `IntentIframe`, pass it as the `data` prop.
- With `cozy-interapp`, pass it as the third argument of `intents.create()`.
- In a raw intent, post it to the service in reply to its `ready` message.

```json
{
  "content": "bonjour à tous, la réunion de demain est decalé a jeudi 14h",
  "answerActions": [
    { "name": "insert", "label": "Insert in the note" },
    { "name": "replace", "label": "Replace the selection" }
  ],
  "theme": { "type": "dark" }
}
```

## AssistantIntentConfig

```ts
interface AssistantIntentConfig {
  /**
   * The text of the calling app the scribe works on: the selection,
   * or the whole document.
   * Absent or empty means no text.
   */
  content?: string

  /**
   * The actions of the calling app on an answer.
   * Each answer of the assistant gets one button per action.
   * Absent or empty means no button.
   */
  answerActions?: AnswerAction[]

  /**
   * What the calling app can do, beside taking an answer: insert a slide,
   * create a folder, write a document. The assistant offers them to the LLM,
   * which proposes one when a request of the user needs it, with its
   * parameters filled. The app runs it.
   * Absent or empty means no capability.
   */
  capabilities?: Capability[]

  /**
   * The suggestions above the composer: the prompts of the assistant, the
   * capabilities of the app, or requests of the app, in its words.
   * Absent means the default menu of the scribe.
   */
  suggestions?: Suggestion[]

  /**
   * Whether the answers come from the documents of the user at first.
   * The user changes it in the composer.
   * Defaults to false with a `content`, true without.
   */
  documents?: boolean

  /**
   * Theme used to render the assistant.
   * Defaults to the theme of the Cozy instance.
   */
  theme?: { type: 'light' | 'dark' }
}
```

### AnswerAction

```ts
interface AnswerAction {
  /**
   * Name of the action.
   * Sent back with the answer when the user clicks the button.
   */
  name: string

  /**
   * Button label displayed by the assistant.
   * Resolve it in your app locale before sending it.
   * When absent, the assistant uses its own localized fallback.
   */
  label?: string
}
```

### Capability

A capability is a function of the calling app, described for the LLM as a tool of function calling is: what it does, when to pick it, and the parameters it takes. The description, the examples and the instructions are for the LLM: write them in English, whatever the language of the user. The label is for the user: resolve it in your app locale.

```ts
interface Capability {
  /**
   * Name of the capability: a lowercase letter, then lowercase letters,
   * digits and `_`. `search` is reserved, and two capabilities cannot share
   * a name. Sent back with the call.
   */
  name: string

  /**
   * Label of the button that confirms a call, displayed by the assistant.
   * Resolve it in your app locale before sending it.
   * When absent, the assistant uses its own localized fallback ("Apply").
   */
  label?: string

  /**
   * What the capability does, and when to pick it, for the LLM.
   */
  description: string

  /**
   * Requests for which the LLM picks the capability, each with whether it
   * needs the documents of the user.
   */
  examples?: { message: string; needs_documents: boolean }[]

  /**
   * The JSON schema of the parameters the LLM fills: an `object` with at
   * least one property, each a string or an array of strings, with a
   * `description`, and named with a letter, then letters, digits and `_`.
   * `required` lists the ones without which the capability is not
   * proposed, among the properties. Either `parameters` or `content`.
   */
  parameters?: {
    type: 'object'
    properties: Record<string, ParameterSchema>
    required?: string[]
  }

  /**
   * For a capability whose content the assistant writes, like a document:
   * the content is written as the answer, in Markdown starting with a
   * `# title` line, and the call gets the title as its only parameter and
   * the content as its text. `max_tokens` bounds the content (1024 by
   * default). Either `parameters` or `content`.
   */
  content?: { max_tokens?: number }

  /**
   * How to fill the parameters or write the content, for the LLM.
   */
  instructions?: string

  /**
   * Whether the user confirms a call before it is handed to the app.
   * Defaults to true: the assistant shows the call in a card with a button.
   * With false, the call is handed to the app as soon as the LLM proposes
   * it: for what the user can undo in the app, like a slide in the editor.
   */
  confirm?: boolean
}

interface ParameterSchema {
  type: 'string' | 'array'
  items?: { type: 'string' }
  description?: string
  /**
   * Only the values the user wrote in the conversation are kept, so that
   * the content of a document cannot add one, like a recipient.
   */
  'x-user-written'?: boolean
}
```

### Suggestion

A suggestion is a chip above the composer, offered until the first request about the text. It sends a prompt of the catalogue of the assistant, a request for a capability of the app, or a request of the app in its own words; or it opens a menu of them.

```ts
interface Suggestion {
  /**
   * Name of the suggestion. `catalogue` is reserved: it stands for the
   * default menu of the scribe, at that position.
   */
  name: string

  /**
   * Label of the chip or of the menu item.
   * Resolve it in your app locale before sending it.
   * When absent: the label of the prompt in the assistant, the label of the
   * capability, or the name.
   */
  label?: string

  /**
   * A prompt of the catalogue of the assistant, by its name:
   * correct-grammar, make-shorter, expand-context, emojify,
   * transform-to-bullets, change-tone-professional, change-tone-casual,
   * change-tone-polite, translate-french, translate-english,
   * translate-russian, translate-vietnamese, summarize.
   * The prompt is sent on the text, with its own instructions.
   */
  prompt?: string

  /**
   * A capability of the app, by its name: the chip sends `message` as the
   * request of the user, and the request is given to the LLM as an example
   * of the capability, so that it proposes it.
   */
  capability?: string

  /**
   * The request sent, and shown in the conversation. Required without a
   * `prompt`; for a prompt, it replaces the request the assistant shows.
   * Resolve it in your app locale before sending it.
   */
  message?: string

  /**
   * How to answer `message`, sent to the LLM as a system message in place
   * of the instructions of the scribe. For a request of the app only.
   */
  instructions?: string

  /**
   * The items of a menu, instead of a single chip.
   */
  options?: Suggestion[]
}
```

## Defaults

When no config is provided, the assistant uses:

```js
{
  content: '',
  answerActions: [],
  capabilities: [],
  suggestions: undefined,
  documents: undefined,
  theme: { type: undefined }
}
```

A field that is missing, `null` or of another type falls back to its default. An entry of `answerActions` without a non-empty string `name` is left out. A capability the stack would refuse is left out, since the stack refuses the whole message for it: an invalid or reserved name, the name of another capability, no description, an example without a message, both `parameters` and `content` or neither, parameters that are not a schema as described in [Capability](#capability), a negative `max_tokens`. The reason is written in the console of the browser, as `Capability <name> left out: <reason>`. Nothing is cut: the assistant does not limit the number of the capabilities nor the length of their texts. A suggestion that sends nothing, without `prompt` nor `message`, is left out, and so is a menu with no item left. The assistant never fails on a configuration it cannot read: it opens with what it understands.

Default labels:

| Action name | Default label |
| --- | --- |
| `insert` | `Insert` |
| `replace` | `Replace` |
| any other name | the name itself |

The default labels exist in English, French, Russian and Vietnamese, like the rest of the interface of the assistant.

## Modes

The configuration picks the mode. There is no mode option.

| Configuration | What the assistant shows | User's documents |
| --- | --- | --- |
| None of `content`, `answerActions`, `capabilities`, `suggestions` | The assistant as in the Twake Assistant app | Always used |
| `content` only | The prompts about the text | Optional, off by default |
| `answerActions` only | The action buttons under each answer | Optional, on by default |
| `content` and `answerActions` | The full scribe: prompts and action buttons | Optional, off by default |
| `capabilities`, with or without the others | The cards of the calls the LLM proposes | Optional, off with a `content`, on without |
| `suggestions`, with or without the others | The chips of the app above the composer | Optional, off with a `content`, on without |

In a scribe with a text, the answers come from the LLM alone, without the documents of the user and without sources. The user turns the Drive source of the composer on for a request that needs their documents: the documents an answer comes from are then listed under it. Without a text, the scribe works from the documents of the user at first: the app that opens the assistant on its capabilities, like the file list of Drive, expects answers about them. `documents` sets the start the app wants either way.

A scribe with a text also tells the LLM, in a system message, that its answer goes into a document as it is: a request to write or change a text is answered with that text only, and a question about the text is answered normally. Without a text, the LLM gets no such instructions.

### Theme

Use `theme.type` with `light` or `dark` to force the theme of the assistant. The theme is fixed when the intent is opened and does not change while it remains open.

`undefined`, an invalid value or an omitted value makes the assistant follow the Cozy instance theme, with the system color scheme as a fallback. Following the Cozy instance theme implies a request to the backend. So if the calling app knows its theme, it should pass it.

The assistant paints its own background with its theme: it does not show the background of the calling app through its frame.

`IntentDialogOpener` and `IntentIframe` from `cozy-ui-plus` also apply an explicit theme to their dialog, close button and loading surface. Custom intent containers remain responsible for styling their own UI. The option never changes Cozy settings, local storage or the caller's global theme.

## Working on a text

Set `content` to the text the user wants to work on:

```json
{
  "content": "bonjour à tous, la réunion de demain est decalé a jeudi 14h"
}
```

- Prompts about the text are offered above the composer of the empty conversation: correct, improve (make it shorter, expand context, emojify, transform to bullets), change tone (more professional, more casual, more polite), translate (into French, English, Russian or Vietnamese), and summarize.
- The user can also type any request about the text.
- The text is joined to the first message of the conversation only. The next messages are sent as they are: the conversation already holds the text and the previous answers, so a follow-up such as "shorter" works on the last answer.

### The prompts

The prompts are the ones of the catalogue of [linagora/ai-prompts](https://github.com/linagora/ai-prompts), evaluated there and published at `https://files.twake.app/prompts/scribe/latest.json`: the scribe of Twake Mail uses the same catalogue, and the assistant arranges them as its menu. The assistant bundles a copy of the catalogue (`yarn prompts:update` refreshes it), since the page of an app cannot fetch another domain under the content security policy of the cozy-stack.

- A prompt of the catalogue has a system message and a user message with the text in place of `{{input}}`. When the user picks one, the user message, with the text, is sent as the query of the chat, and the system message as its `instructions`.
- The conversation shows a short request instead, in the language of the user, such as "Correct the grammar and spelling of the text.".
- A typed request is sent with the instructions of the scribe: a question about the text gets a normal answer, a request to write or change a text gets that text only.

The text is plain text.

### Another text while the assistant is open

The calling app sends new data to the open assistant, with another `content`, when the user selects another text: `sendData(data)` on the started intent of `cozy-interapp`, or new `data` given to `IntentIframe`. They travel in a `data` message (see [Protocol](#protocol)), and replace the whole configuration: send the `answerActions` and the `theme` again with the new `content`. The theme does not change while the assistant is open. The assistant keeps its conversation:

- the next message, typed or from a prompt, gets the new text joined to it, and the messages after it are sent as they are;
- the prompts are offered again above the composer until that message;
- the action buttons follow the new `answerActions`, under every answer.

Send new data for another text only, not for a cursor that moves: the next message would be about the same text again.

## Suggestions

Set `suggestions` to choose the chips above the composer. Without it, a scribe with a text offers the default menu, the prompts of the catalogue (see [The prompts](#the-prompts)), and a scribe without a text offers nothing.

```json
{
  "suggestions": [
    { "name": "catalogue" },
    {
      "name": "new_slide",
      "capability": "insert_slide",
      "label": "New slide",
      "message": "Add a new slide after this one, about the text"
    },
    {
      "name": "more",
      "label": "More",
      "options": [
        { "name": "correct", "prompt": "correct-grammar" },
        {
          "name": "joke",
          "label": "A joke",
          "message": "Tell a joke about the text",
          "instructions": "Answer with the joke only, in the language of the text."
        }
      ]
    }
  ]
}
```

- The chips come in the order of the list. `{ "name": "catalogue" }` puts the default menu in its place.
- A chip with a `prompt` sends that prompt of the catalogue on the text, as the default menu does. Its label and the request shown are those of the assistant, unless the app gives `label` and `message`.
- A chip with a `capability` sends `message` as the request of the user. The assistant adds the request to the examples of the capability, so that the LLM proposes the capability for it (see [Capabilities](#capabilities)). The LLM still decides: with a text that the request does not fit, it may answer instead.
- A chip with a `message` alone sends it as the request of the user, with `instructions` as the system message when given, and with the instructions of the scribe otherwise.
- A chip with `options` opens a menu of them.
- The chips are offered until the first request about the text, and again when the app gives another text (see [Another text while the assistant is open](#another-text-while-the-assistant-is-open)). Without a text, they are offered until the first request.

The chips are the only prompts the app can change. The messages the user types are sent as they are.

## Capabilities

Set `capabilities` to let the assistant call what the app can do:

```json
{
  "capabilities": [
    {
      "name": "insert_slide",
      "label": "Insert the slide",
      "description": "add a new slide after the current one in the presentation the user is editing, with a title and bullet points. Pick it when the user asks for a new slide, a slide about a subject, a conclusion or a summary slide. Do not pick it to change, fix, shorten, translate or rewrite the text given with the message: that is an answer.",
      "examples": [
        { "message": "Ajoute une diapositive sur le budget", "needs_documents": false },
        { "message": "Add a closing slide", "needs_documents": false }
      ],
      "parameters": {
        "type": "object",
        "properties": {
          "title": { "type": "string", "description": "the title of the slide, short" },
          "bullets": {
            "type": "array",
            "items": { "type": "string" },
            "description": "the bullet points of the slide, 3 to 6 short lines, without bullet marks"
          }
        },
        "required": ["title", "bullets"]
      },
      "instructions": "Write the title and the bullets in the language of the text of the presentation given with the message. Build on that text when it is about the same subject; do not invent figures, names or dates it does not give.",
      "confirm": false
    }
  ]
}
```

### How a capability is called

1. The assistant sends the capabilities with each message, as the `actions` of the chat of cozy-stack (`POST /ai/chat/conversations/:id`, see its documentation): their definitions are given to the LLM as the tools of function calling are. The stack knows nothing of them but these definitions, and never runs one.
2. The router of the stack decides, from the conversation, whether the message is a plain request or one of the capabilities. For a plain request the answer comes as usual. For a capability, the LLM fills its parameters from the conversation, from the text of the app and from the documents of the user when the request needs them, and the stack proposes the call. A capability whose required parameters cannot be filled is not proposed: the message is answered instead.
3. The assistant shows the call in a card: the parameters the LLM filled, or the title of the content it wrote, and the button of the capability. A call the LLM proposes after an answer is shown under it.
4. The call is handed to the app in a `result` message (see [Result](#result)) when the user clicks the button, or at once when the capability has `confirm: false`. The card then says it is done. The assistant does not run anything: the app does, in its own way.
5. The assistant stays open. A call is handed once: the user asks again for another one.

### A capability with a content

For a capability with `content`, the assistant writes the content as its answer, in Markdown, with the description and the instructions of the capability, from the documents of the user when the request needs them (a report from the files of the user) or from the conversation (a document on a subject, a summary of the conversation). The content starts with a `# title` line: the call gets `{ "title" }` as its parameters, and the whole content as its `text`. A content without a title is given as a plain answer, without a call.

### Writing a capability

- `description` tells the router what the capability does and when to pick it, and when not to: name the requests it is for, and the ones that are answers. The router reads the whole conversation: a capability picked by mistake costs the user an answer.
- `examples` are requests the router should pick the capability for, as the user writes them, in any language. The requests of the suggestions for the capability are added to them.
- `parameters` take strings and arrays of strings only. Describe each one for the LLM: its language, its length, what it must not contain. Every parameter is present in the call, `""` or `[]` when unknown.
- `instructions` tell the LLM how to fill the parameters or write the content: the language, what to keep from the text of the app, what not to invent.
- `confirm: false` is for what the user can undo in the app, like a slide or a table in the editor. A call that creates something the user cannot take back, like a file, keeps the confirmation.
- The number of the capabilities, of their examples and parameters, and the length of their texts are up to the app: neither the assistant nor the stack limits them. They are all sent with each message, to the router and to the LLM: what fits depends on the LLM.

The capabilities are those of the calling app: it declares what it can run, and runs what it gets. The assistant has no catalogue of them.

## Answer actions

Set `answerActions` to get the answers of the assistant back:

```json
{
  "answerActions": [
    { "name": "insert", "label": "Insert in the note" },
    { "name": "replace" }
  ]
}
```

- Each answer gets one button per action, in the order of the list.
- The assistant does not run the action. It only tells the calling app which button was clicked on which answer: the calling app knows what `insert` or `replace` means for its document.
- Any name can be used. The names have no meaning for the assistant, except for the default labels of `insert` and `replace`.
- A click does not close the assistant. The user can click several buttons, on several answers.

## Result

On each click on an action button, and on each call of a capability, the assistant sends a `result` message. The intent goes on.

```ts
{
  type: `intent-${intentId}:result`
  result: AssistantIntentResult
}
```

`cozy-interapp` gives the `result` to the `onResult` option of `start()`. `IntentIframe` and `IntentDialogOpener` give it to their `onResult` prop.

### AssistantIntentResult

A result is an answer, for an action button, or a call, for a capability. The calling app tells them apart by their field: `answerAction` or `capability`.

```ts
type AssistantIntentResult = AnswerResult | CapabilityCall

interface AnswerResult {
  /**
   * Name of the action clicked, among the configured `answerActions`.
   */
  answerAction: string

  /**
   * The answer of the assistant.
   */
  text: string

  /**
   * Format of `text`.
   */
  format: 'markdown'
}

interface CapabilityCall {
  /**
   * Name of the capability called, among the configured `capabilities`.
   */
  capability: string

  /**
   * The parameters the LLM filled, every one of the schema: `""` or `[]`
   * when unknown. For a capability with a content: `{ title }`.
   */
  params: Record<string, string | string[]>

  /**
   * For a capability with a content: the content the assistant wrote,
   * starting with its `# title` line.
   */
  text?: string

  /**
   * Format of `text`, when given.
   */
  format?: 'markdown'
}
```

Examples:

```json
{
  "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:result",
  "result": {
    "answerAction": "replace",
    "text": "Bonjour à tous, la réunion de demain est décalée à jeudi 14h.",
    "format": "markdown"
  }
}
```

```json
{
  "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:result",
  "result": {
    "capability": "insert_slide",
    "params": {
      "title": "Risques du lancement",
      "bullets": ["Migration des clients pilotes", "Charge du support", "Formation des équipes"]
    }
  }
}
```

The label of the action or of the capability is not sent back, only its name. The calling app checks what it gets: a capability it did not declare, or parameters it cannot use, are left alone.

The app does not report the outcome of a call back to the assistant yet: the card says the call is done once it is handed over. An outcome message, with the URL of what was created or an error, is a planned extension of the protocol.

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
| 4 | Assistant → app | `intent-{id}:result` | `result: AssistantIntentResult`, an answer or a call, any number of times | `service.sendResult()`, `onResult` option of `start()` |
| 5 | App → assistant | `intent-{id}:data` | `data: AssistantIntentConfig`, any number of times | `sendData()` of the started intent, `service.onData()` |
| 6 | Assistant → app | `intent-{id}:cancel` | none, only when the page of the assistant is unloaded | the intent promise resolves with `null` |

The calling app ends the exchange itself, by stopping the intent or removing its iframe (see [End of the intent](#end-of-the-intent)). The assistant never sends `done`, `error` or `resize`.

Each side checks where a message comes from: `cozy-interapp` takes the messages of the client from the origin of the assistant only, with the id of its intent, and the assistant takes the messages of the service from the origin of the calling app only (`attributes.client` of the intent document).

The messages of an exchange, one per line:

```jsonc
// 1. ready
{ "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:ready" }
// 2. the data
{ "content": "bonjour à tous", "answerActions": [{ "name": "insert" }], "theme": { "type": "light" } }
// 3. readyToUse
{ "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:readyToUse" }
// 4. a result: an answer
{ "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:result", "result": { "answerAction": "insert", "text": "Bonjour à tous.", "format": "markdown" } }
// 4. a result: a call
{ "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:result", "result": { "capability": "insert_slide", "params": { "title": "Risques", "bullets": ["Charge du support"] } } }
// 5. new data
{ "type": "intent-2245b8f41dc4c0d1e13f69b75028fe07:data", "data": { "content": "Merci de confirmer", "answerActions": [{ "name": "insert" }, { "name": "replace" }], "theme": { "type": "light" } } }
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
| `intent:done`, which may be sent several times with `final: false` | `intent-{id}:result`, any number of times: a result that does not end the intent |
| `intent:cancel`, `intent:error` | `intent-{id}:cancel` on unload, no error |
| An `intentId` in every message | The id of the intent in the type of every message |
| Strict origins: no `*` target, the origin of every message checked | The same (see [Protocol](#protocol)) |

### The differences, and how they are bridged

- **Envelope.** Open Buro leans towards `{ type: "intent:done", intentId, payload }`, where `cozy-interapp` puts the id in the type (`intent-{id}:readyToUse`) and replies to `ready` with the data alone. The mapping is mechanical: an Open Buro binding of `cozy-interapp` can speak both, without a change to the assistant.
- **Results while the intent goes on.** The assistant hands each chosen answer over without ending the intent. Open Buro reaches the same with `intent:done` and `final: false`, which it plans for streamed documents. A `result` is a non-final `done`; no message of the assistant is final, since the calling app closes it.
- **New data while the intent is open.** The draft only has `intent:init`: its parameters cannot change once the provider has them. The assistant needs them to change, for another text selected while it is open. The `data` message carries the same payload as the first data; it is the extension Twake would bring to Open Buro, as an `intent:update` from the consumer for instance.
- **`readyToUse`.** No Open Buro equivalent. Like `intent:resize` there, it is optional: a calling app must not wait for it.
- **Capability.** Open Buro only defines `PICK` and `SAVE`. The assistant is `OPEN` on `io.cozy.ai.chat.conversations`; as an Open Buro capability it would be a new action, declared in the manifest of the provider, with `content`, `answerActions`, `capabilities` and `suggestions` as its parameters and `{ answerAction, text, format }` or `{ capability, params, text, format }` as its answer.
- **Capabilities of the consumer.** Open Buro declares the capabilities of the provider only. Here the consumer also declares some, the functions the provider may call back, with a definition the LLM reads: a description, examples and a JSON schema, as the tools of function calling. Nothing in the draft prevents it: they travel in the parameters of the intent, and each call is a non-final `done`. It is the second extension Twake would bring.
- **Source of the messages.** Open Buro also binds every message to the `Window` it expects (`event.source === iframe.contentWindow`). `cozy-interapp` checks the origin and the id of the intent, not the window yet: the check to add for an Open Buro binding.
- **Answer.** An Open Buro answer lists `documents` (`id`, `name`, `mimeType`, `url` or content). The assistant answers with a text and its format: a value, not a document, which an assistant capability would define as its own answer.

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

## Opening a scribe

With `cozy-interapp`:

```js
const intents = new Intents({ client })
const scribe = intents
  .create('OPEN', 'io.cozy.ai.chat.conversations', {
    content: selectedText,
    answerActions: [
      { name: 'insert', label: t('scribe.insert') },
      { name: 'replace', label: t('scribe.replace') }
    ],
    theme: { type: 'dark' }
  })
  .start(element, {
    onResult: ({ answerAction, text }) => {
      if (answerAction === 'replace') {
        replaceSelection(text)
        return
      }

      insertAfterSelection(text)
    }
  })

// When the user closes the panel
scribe.stop()
```

## Opening the assistant on capabilities

The file list of Drive opens the assistant on the documents of the user, with what it can do in the folder:

```js
const assistant = intents
  .create('OPEN', 'io.cozy.ai.chat.conversations', {
    capabilities: [
      {
        name: 'create_folder',
        label: t('assistant.createFolder'),
        description: 'create a folder in the folder of Drive the user is looking at...',
        parameters: {
          type: 'object',
          properties: { name: { type: 'string', description: 'the name of the folder, short, without a path' } },
          required: ['name']
        }
      },
      {
        name: 'create_document',
        label: t('assistant.createDocument'),
        description: 'write a text document saved in the folder of Drive the user is looking at...',
        content: { max_tokens: 2048 }
      }
    ],
    documents: true,
    theme: { type: 'light' }
  })
  .start(element, {
    onResult: result => {
      if (result.capability === 'create_folder') createFolder(result.params.name)
      if (result.capability === 'create_document') createDocument(result.params.title, result.text)
    }
  })
```

## Requirements

- `cozy-interapp` 0.20.0 or later in the calling app, for the `result` message (`service.sendResult()`, `onResult` option of `start()`). With an older one, the assistant opens but the clicks on the action buttons do not reach the calling app.
- To give another text while the assistant is open, `cozy-interapp` 0.21.0 or later in the calling app, for the `data` message (`sendData()` on the started intent). With an older one, the assistant keeps the first text.
- For the `onResult` prop and new `data` given to `IntentIframe` and `IntentDialogOpener`, `cozy-ui-plus` 14.0.0 or later, which requires `cozy-interapp` 0.21.0.
- For the scribe, a cozy-stack that knows the `documents` and `instructions` options of `POST /ai/chat/conversations/:id`.
- For the capabilities, a cozy-stack that knows the `actions` of `POST /ai/chat/conversations/:id` and proposes them with the `action` event of the chat. With an older one, the message is refused and the scribe shows an error.
