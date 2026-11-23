# Decisions

Decisions taken on twake-assistant, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-23, [Architecture] A call the LLM writes as text is read as a call

- Decision: until cozy-stack sends a call without a result as a tool call in the history, the assistant reads an answer of the form `(Proposed to the user: <tool> {params})`, for a tool of the request, as the call of that tool, and shows nothing of that text; this workaround goes once the stack is fixed.
- Decided by: Paul Tran-Van, in a session with an agent (Claude Code), 2026-11-23
- Why: the LLM imitates the text the stack writes the past calls as, and the scribe showed that text raw, with Insert and Replace.
- Scope: desktop and mobile, the answers of the scribe and of the assistant, live and in past conversations.

## 2026-11-20, [UI] The scribe panel has the chat style of the assistant

- Decision: the scribe, in the side panel of Drive and in OnlyOffice, looks like the conversation of the assistant: the bouncing dots while an answer comes (not the animated logo), the rounded bubble of the assistant for the requests, the composer of the assistant, the messages fading out under the header and above the composer, and 16px under the bottom of the panel.
- Decided by: the design team, feedback to Paul Tran-Van on 2026-11-20, applied in [#181](https://github.com/linagora/twake-assistant/pull/181)
- Why: the same assistant should look the same everywhere.
- Scope: desktop and mobile, the scribe in its panel and compact layouts.

## 2026-11-20, [UI] The scribe keeps its running label beside the dots

- Decision: while an answer comes, the scribe shows the label of the prompt ("Processing…", "Translating to French…") beside the dots, where the assistant shows the dots alone.
- Decided by: agent ([#181](https://github.com/linagora/twake-assistant/pull/181)), to be confirmed by the design team
- Why: the label tells which prompt is running.
- Scope: desktop and mobile, the scribe in its panel and compact layouts.
