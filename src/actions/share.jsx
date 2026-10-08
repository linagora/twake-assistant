import { Share } from '@linagora/twake-icons'

import makeActionComponent from './makeActionComponent'

export const share = ({ t }) => {
  const label = t('assistant.sidebar.conversation.actions.share')

  return {
    name: 'share',
    icon: Share,
    label,
    Component: makeActionComponent(label, Share),
    action: () => {
      // TODO: the backend cannot share a conversation yet
    }
  }
}
