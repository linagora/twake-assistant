import { orderHistory } from '@/components/Scribe/ScribeHistory'

const conversation = (id, updatedAt, favorite) => ({
  _id: id,
  cozyMetadata: { updatedAt, ...(favorite !== undefined && { favorite }) }
})

describe('orderHistory', () => {
  it('puts the pinned conversations first, the last updated first in each', () => {
    const old = conversation('old', '2026-01-01', true)
    const recent = [
      conversation('c3', '2026-10-03'),
      conversation('c2', '2026-10-02', true),
      conversation('c1', '2026-10-01', false)
    ]

    expect(orderHistory([recent[1], old], recent).map(c => c._id)).toEqual([
      'c2',
      'old',
      'c3',
      'c1'
    ])
  })

  it('places a conversation unpinned since its query by its date', () => {
    const unpinned = conversation('c1', '2026-10-01', false)

    expect(
      orderHistory([unpinned], [conversation('c2', '2026-10-02'), unpinned])
    ).toEqual([conversation('c2', '2026-10-02'), unpinned])
  })
})
