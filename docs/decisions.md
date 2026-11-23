# Decisions

Decisions taken on twake-assistant, oldest first. Append only: a decision that changes gets a new entry that replaces the old one and cites it. Entry format: the `twake-decisions` skill of [linagora/twake-guidelines](https://github.com/linagora/twake-guidelines/blob/main/skills/twake-decisions/SKILL.md).

Categories: UX, UI, Product, Architecture, Infra, Tech.

## 2026-11-23, [Architecture] A call the LLM writes as text is read as a call

- Decision: until cozy-stack sends a call without a result as a tool call in the history, the assistant reads an answer of the form `(Proposed to the user: <tool> {params})`, for a tool of the request, as the call of that tool, and shows nothing of that text; this workaround goes once the stack is fixed.
- Decided by: Paul Tran-Van, in a session with an agent (Claude Code), 2026-11-23
- Why: the LLM imitates the text the stack writes the past calls as, and the scribe showed that text raw, with Insert and Replace.
- Scope: desktop and mobile, the answers of the scribe and of the assistant, live and in past conversations.
