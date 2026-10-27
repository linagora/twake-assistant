import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

import { ConversationWelcome } from './ConversationWelcome'

const mockSetText = jest.fn()
const mockKnowledgeBase = jest.fn()

jest.mock('@assistant-ui/react', () => ({
  useComposerRuntime: () => ({ setText: mockSetText })
}))
jest.mock('twake-i18n', () => ({
  useI18n: () => ({
    t: (key, options) => (options?.name ? `${key}:${options.name}` : key)
  })
}))
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const useBreakpoints = () => ({ isMobile: false })
  return { __esModule: true, default: useBreakpoints, useBreakpoints }
})
jest.mock('cozy-ui/transpiled/react/providers/CozyTheme', () => ({
  useCozyTheme: () => ({ isLight: true })
}))
jest.mock('../KnowledgeBase/useSelectedAssistantKnowledgeBase', () => ({
  useSelectedAssistantKnowledgeBase: () => mockKnowledgeBase()
}))

describe('ConversationWelcome', () => {
  beforeEach(() => {
    mockSetText.mockReset()
  })

  it('names the assistant and its folder, and starts a prompt from a short action', () => {
    mockKnowledgeBase.mockReturnValue({
      assistant: { _id: 'meeting', name: 'Meeting assistant' },
      hasFolder: true,
      folderName: 'Meeting recordings'
    })
    const inputRef = { current: { focus: jest.fn() } }
    render(<ConversationWelcome inputRef={inputRef} />)

    expect(screen.getByRole('heading')).toHaveTextContent(
      'assistant.welcome.title:Meeting assistant'
    )
    expect(screen.queryByText(/Meeting recordings/)).toBeInTheDocument()
    expect(
      screen.queryByText(/assistant.welcome.folder_subtitle/)
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'assistant.welcome.actions.summarize.label'
      })
    )

    expect(mockSetText).toHaveBeenCalledWith(
      'assistant.welcome.actions.summarize.prompt'
    )
    expect(inputRef.current.focus).toHaveBeenCalled()
  })

  it('says the answers come from any file of the whole Drive', () => {
    mockKnowledgeBase.mockReturnValue({
      assistant: { _id: 'meeting', name: 'Meeting assistant' },
      hasFolder: true,
      isRoot: true,
      folderName: 'Drive'
    })
    render(<ConversationWelcome />)

    expect(screen.queryByText(/assistant.welcome.subtitle/)).toBeInTheDocument()
    expect(screen.queryByText(/assistant.welcome.folder_subtitle/)).toBe(null)
  })

  it('welcomes to the plain assistant without a folder, with no short action', () => {
    mockKnowledgeBase.mockReturnValue({ hasFolder: false, folderName: '' })
    render(<ConversationWelcome />)

    expect(screen.getByRole('heading')).toHaveTextContent(
      'assistant.welcome.default_title'
    )
    expect(
      screen.queryByText('assistant.welcome.default_subtitle')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button')).toBe(null)
  })
})
