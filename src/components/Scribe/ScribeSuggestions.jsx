import {
  useComposerRuntime,
  useThread,
  useThreadRuntime
} from '@assistant-ui/react'
import cx from 'classnames'
import React, { useRef, useState } from 'react'

import { Icon } from '@linagora/twake-icons'
import ActionsMenu from 'cozy-ui/transpiled/react/ActionsMenu'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import Chip from 'cozy-ui/transpiled/react/Chips'
import Typography from 'cozy-ui/transpiled/react/Typography'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

const CHIP_CLASSES = { icon: styles['scribe-suggestion-icon'] }

/**
 * A prompt about the text of the app: the chip sends it, or opens a menu of
 * prompts
 */
function SuggestionChip({ suggestion, isDisabled, onSend }) {
  const chipRef = useRef(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleClick = () => {
    if (suggestion.options) {
      setIsMenuOpen(true)
    } else {
      onSend(suggestion)
    }
  }
  const handleClose = () => setIsMenuOpen(false)
  const handleSelect = option => {
    setIsMenuOpen(false)
    onSend(option)
  }

  return (
    <>
      <Chip
        ref={chipRef}
        className={styles['scribe-suggestion']}
        classes={CHIP_CLASSES}
        icon={suggestion.icon && <Icon icon={suggestion.icon} size={16} />}
        label={
          <Typography variant="caption" color="textSecondary" component="span">
            {suggestion.label}
          </Typography>
        }
        clickable
        disabled={isDisabled}
        {...(suggestion.options && {
          'aria-haspopup': 'menu',
          'aria-expanded': isMenuOpen
        })}
        onClick={handleClick}
      />
      {isMenuOpen && (
        <ActionsMenu
          open
          ref={chipRef}
          onClose={handleClose}
          actions={[]}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          {suggestion.options.map(option => (
            // The menu gives its items a ref: no component of our own here
            <ActionsMenuItem
              key={option.name}
              onClick={() => handleSelect(option)}
            >
              <Typography variant="body1">{option.label}</Typography>
            </ActionsMenuItem>
          ))}
        </ActionsMenu>
      )}
    </>
  )
}

/**
 * The prompts about the text of the app: under the welcome of an empty
 * conversation, and above the composer after each request about the text.
 * Off while an answer runs: another request would cut it.
 * `inputRef` is the input of the composer, focused once a draft fills it.
 */
export function ScribeSuggestions({ inputRef, className }) {
  const { suggestions } = useScribe()
  const threadRuntime = useThreadRuntime()
  const composerRuntime = useComposerRuntime()
  const isRunning = useThread(state => state.isRunning)

  if (suggestions.length === 0) return null

  // The conversation shows the request, the chat sends the prompt of the
  // catalogue that goes with it. The message is added to the thread with its
  // run config, not through the composer, which would keep it for the next
  // message typed. Its metadata keeps it too, for an answer asked again.
  const handleSend = suggestion => {
    if (suggestion.draft) {
      composerRuntime.setText(suggestion.draft)
      inputRef?.current?.focus()
      return
    }
    const custom = {
      ...(suggestion.prompt && { prompt: suggestion.prompt }),
      ...(suggestion.instructions && {
        instructions: suggestion.instructions
      })
    }
    threadRuntime.append({
      role: 'user',
      content: [{ type: 'text', text: suggestion.request }],
      metadata: { custom },
      runConfig: { custom }
    })
  }

  return (
    <div className={cx(styles['scribe-suggestions'], className)}>
      {suggestions.map(suggestion => (
        <SuggestionChip
          key={suggestion.name}
          suggestion={suggestion}
          isDisabled={isRunning}
          onSend={handleSend}
        />
      ))}
    </div>
  )
}
