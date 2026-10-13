import {
  ComposerPrimitive,
  useComposer,
  useComposerRuntime
} from '@assistant-ui/react'
import cx from 'classnames'
import React, { forwardRef } from 'react'

import SearchBar from 'cozy-ui/transpiled/react/SearchBar'
import { useBreakpoints } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { useI18n } from 'twake-i18n'

import styles from './styles.styl'

// Material UI hands a custom input its ref as `inputRef`: the textarea of
// assistant-ui takes a plain ref
const ComposerInput = forwardRef(({ inputRef, ...props }, ref) => (
  <ComposerPrimitive.Input ref={inputRef ?? ref} {...props} />
))
ComposerInput.displayName = 'ComposerInput'

/** `inputRef` gets the textarea: the welcome focuses it after a short action */
const ConversationBar = ({
  placeholder,
  inputRef,
  onHeightChange,
  ...props
}) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const composerRuntime = useComposerRuntime()
  const value = useComposer(state => state.text)
  const isEmpty = useComposer(state => state.isEmpty)

  const handleKeyDown = ev => {
    if (isEmpty || isMobile) return

    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault()
      composerRuntime.send()
    }
  }

  return (
    <SearchBar
      {...props}
      elevation={0}
      className={cx(styles['conversationBar'], {
        [styles['conversationBar--mobile']]: isMobile
      })}
      icon={null}
      size="auto"
      placeholder={placeholder ?? t('assistant.search.placeholder')}
      value={value}
      disabledClear
      disabledHover
      componentsProps={{
        inputBase: {
          inputRef: inputRef,
          className: 'u-pv-0 u-pl-0',
          rows: 1,
          multiline: true,
          inputProps: {
            className: styles['conversationBar-input'],
            onHeightChange
          },
          autoFocus: !isMobile,
          inputComponent: ComposerInput,
          onKeyDown: handleKeyDown
        }
      }}
    />
  )
}

export default ConversationBar
