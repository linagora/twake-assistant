import { useThreadRuntime } from '@assistant-ui/react'
import React, { useRef, useState } from 'react'

import ActionsMenu from 'cozy-ui/transpiled/react/ActionsMenu'
import ActionsMenuItem from 'cozy-ui/transpiled/react/ActionsMenu/ActionsMenuItem'
import Chip from 'cozy-ui/transpiled/react/Chips'
import Typography from 'cozy-ui/transpiled/react/Typography'

import { useScribe } from '@/components/Scribe/ScribeProvider'

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
        className="u-mr-half u-mb-half"
        label={suggestion.label}
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
 * The prompts about the text of the app, above the composer of an empty
 * conversation
 */
export function ScribeSuggestions() {
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
      runConfig: { custom: { prompt: suggestion.prompt } }
    })
  }

  return (
    <div className="u-flex u-flex-wrap">
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
