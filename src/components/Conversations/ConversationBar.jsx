import { ComposerPrimitive, useComposer } from '@assistant-ui/react'
import cx from 'classnames'
import React, { forwardRef } from 'react'

import { isMobile as isMobileDevice } from 'cozy-device-helper'
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

/**
 * `inputRef` gets the textarea: the welcome focuses it after a short action.
 * Enter sends the question, except on a phone or a tablet, where it is a new
 * line.
 */
const ConversationBar = ({
  placeholder,
  inputRef,
  onHeightChange,
  ...props
}) => {
  const { t } = useI18n()
  const { isMobile } = useBreakpoints()
  const value = useComposer(state => state.text)

  return (
    <SearchBar
      {...props}
      // Not a form: Enter submits the closest one, which must be the
      // composer's
      component="div"
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
            onHeightChange,
            submitOnEnter: !isMobileDevice()
          },
          autoFocus: !isMobile,
          inputComponent: ComposerInput
        }
      }}
    />
  )
}

export default ConversationBar
