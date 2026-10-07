import { useThreadRuntime } from '@assistant-ui/react'
import React, { useRef, useState } from 'react'

import { Icon } from '@linagora/twake-icons'
import ActionsMenu from 'cozy-ui/transpiled/react/ActionsMenu'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import Chip from 'cozy-ui/transpiled/react/Chips'
import Typography from 'cozy-ui/transpiled/react/Typography'

import { useScribe } from '@/components/Scribe/ScribeProvider'
import styles from '@/components/Scribe/styles.styl'

/**
 * A prompt about the text of the app: the chip sends it, or opens a menu of
 * prompts
 */
function SuggestionChip({ suggestion, onSend }) {
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
        icon={suggestion.icon && <Icon icon={suggestion.icon} size={16} />}
        label={
          <Typography variant="caption" color="textSecondary" component="span">
            {suggestion.label}
          </Typography>
        }
        clickable
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
 * conversation, centered, and above the composer when the app gives another
 * text
 */
export function ScribeSuggestions({ isCentered = false }) {
  const { suggestions } = useScribe()
  const threadRuntime = useThreadRuntime()

  if (suggestions.length === 0) return null

  // The conversation shows the request, the chat sends the prompt of the
  // catalogue that goes with it. The message is added to the thread with its
  // run config, not through the composer, which would keep it for the next
  // message typed.
  const handleSend = suggestion => {
    threadRuntime.append({
      role: 'user',
      content: [{ type: 'text', text: suggestion.request }],
      runConfig: {
        custom: {
          ...(suggestion.prompt && { prompt: suggestion.prompt }),
          ...(suggestion.instructions && {
            instructions: suggestion.instructions
          })
        }
      }
    })
  }

  return (
    <div
      className={
        isCentered
          ? `${styles['scribe-suggestions']} u-flex-justify-center`
          : styles['scribe-suggestions']
      }
    >
      {suggestions.map(suggestion => (
        <SuggestionChip
          key={suggestion.name}
          suggestion={suggestion}
          onSend={handleSend}
        />
      ))}
    </div>
  )
}
