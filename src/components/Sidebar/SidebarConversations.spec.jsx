import {
  fireEvent,
  render,
  screen,
  waitFor,
  within
} from '@testing-library/react'
import React from 'react'
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigationType
} from 'react-router-dom'

import { CozyProvider, createMockClient } from 'cozy-client'
import AlertProvider from 'cozy-ui/transpiled/react/providers/Alert'
import { BreakpointsProvider } from 'cozy-ui/transpiled/react/providers/Breakpoints'
import CozyTheme from 'cozy-ui/transpiled/react/providers/CozyTheme'
import { I18n, initTranslation } from 'twake-i18n'

import { SidebarConversations } from '@/components/Sidebar/SidebarConversations'
import en from '@/locales/en.json'

jest.mock('cozy-flags', () => ({ __esModule: true, default: () => false }))
jest.mock('@/components/AssistantProvider', () => ({
  useAssistant: () => ({
    isOpenSearchConversation: false,
    setIsOpenSearchConversation: () => {}
  })
}))
const someConversations = [
  { _id: 'c1', name: 'Open conversation' },
  { _id: 'c2', name: 'Other conversation' }
]
let mockFetchResult
jest.mock('@/hooks/useFetchConversations', () => ({
  __esModule: true,
  default: () => mockFetchResult
}))

function Location() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()
  return <p data-testid="location">{`${navigationType} ${pathname}`}</p>
}

function setup() {
  const client = createMockClient({})
  client.destroy = jest.fn().mockResolvedValue({})
  const { rerender } = render(<Sidebar client={client} />)
  return { client, rerender: () => rerender(<Sidebar client={client} />) }
}

function Sidebar({ client }) {
  return (
    <CozyProvider client={client}>
      <I18n lang="en" polyglot={initTranslation('en', () => en)}>
        <CozyTheme>
          <BreakpointsProvider>
            <AlertProvider>
              <MemoryRouter
                initialEntries={['/', '/assistant/c1']}
                initialIndex={1}
              >
                <Routes>
                  <Route
                    path="assistant/:conversationId"
                    element={
                      <>
                        <SidebarConversations />
                        <Location />
                      </>
                    }
                  />
                </Routes>
              </MemoryRouter>
            </AlertProvider>
          </BreakpointsProvider>
        </CozyTheme>
      </I18n>
    </CozyProvider>
  )
}

async function deleteConversation(name) {
  const item = screen.getByText(name).closest('li')
  fireEvent.click(within(item).getByRole('button', { expanded: false }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' })
  )
  await waitFor(() => expect(screen.queryByRole('dialog')).toBe(null))
}

describe('SidebarConversations', () => {
  beforeEach(() => {
    mockFetchResult = {
      conversations: someConversations,
      hasMore: false,
      isLoading: false
    }
  })

  it('shows a caption under Recent once the fetched list is empty', () => {
    mockFetchResult = { conversations: [], hasMore: false, isLoading: false }
    const { rerender } = setup()
    // Nothing fetched yet: no caption flashes before the first result
    expect(screen.queryByText('Your conversations will appear here')).toBe(null)

    mockFetchResult = { ...mockFetchResult, isLoading: true }
    rerender()
    expect(screen.queryByText('Your conversations will appear here')).toBe(null)

    mockFetchResult = { ...mockFetchResult, isLoading: false }
    rerender()
    expect(
      screen.queryByText('Your conversations will appear here')
    ).toBeInTheDocument()
  })

  it('hides the empty caption when there are conversations', () => {
    const { rerender } = setup()
    mockFetchResult = { ...mockFetchResult, isLoading: true }
    rerender()
    mockFetchResult = { ...mockFetchResult, isLoading: false }
    rerender()

    expect(screen.queryByText('Your conversations will appear here')).toBe(null)
    expect(screen.queryByText('Open conversation')).toBeInTheDocument()
  })

  it('shows the full name of a truncated conversation on hover', async () => {
    setup()
    const name = screen.getByText('Open conversation')
    Object.defineProperty(name, 'scrollWidth', { value: 300 })
    Object.defineProperty(name, 'clientWidth', { value: 150 })

    fireEvent.mouseEnter(name)
    fireEvent.mouseOver(name)

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Open conversation'
    )
  })

  it('shows no tooltip on a name that fits', async () => {
    setup()
    const name = screen.getByText('Open conversation')

    fireEvent.mouseEnter(name)
    fireEvent.mouseOver(name)

    await new Promise(resolve => setTimeout(resolve, 600))
    expect(screen.queryByRole('tooltip')).toBe(null)
  })

  it('replaces the deleted open conversation with a new one in the history', async () => {
    const { client } = setup()

    await deleteConversation('Open conversation')

    expect(client.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c1' })
    )
    expect(screen.getByTestId('location')).toHaveTextContent(
      /^REPLACE \/assistant\/\d+-\d{5}$/
    )
  })

  it('stays on the open conversation when another one is deleted', async () => {
    const { client } = setup()

    await deleteConversation('Other conversation')

    expect(client.destroy).toHaveBeenCalledWith(
      expect.objectContaining({ _id: 'c2' })
    )
    expect(screen.getByTestId('location')).toHaveTextContent(
      'POP /assistant/c1'
    )
  })
})
