import { render, screen } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'

import { NewConversation } from '@/components/Views/NewConversation'

const Conversation = () => {
  const { conversationId } = useParams()
  return <div>{conversationId}</div>
}

describe('NewConversation', () => {
  it('should open a new conversation', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="assistant/:conversationId" element={<Conversation />} />
          <Route path="*" element={<NewConversation />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.queryByText(/^\d+-\d{5}$/)).toBeInTheDocument()
  })
})
