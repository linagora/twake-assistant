import { Pin } from '@linagora/twake-icons'

import makeActionComponent from './makeActionComponent'

export const pin = ({ t, isPinned, onTogglePin }) => {
  const label = t(
    isPinned
      ? 'assistant.sidebar.conversation.actions.unpin'
      : 'assistant.sidebar.conversation.actions.pin'
  )

  return {
    name: 'pin',
    icon: Pin,
    label,
    Component: makeActionComponent(label, Pin),
    action: () => {
      onTogglePin()
    }
  }
}
