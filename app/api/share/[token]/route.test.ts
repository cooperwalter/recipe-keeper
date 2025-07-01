import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    query: {
      shareLinks: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}))

describe('Public Share API', () => {
  const mockRecipe = {
    id: 'test-recipe-id',
    title: 'Test Recipe',
    description: 'A test recipe',
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    sourceName: 'Test Chef',
    sourceNotes: 'Family recipe',
    badges: ['vegetarian'],
    ingredients: [
      { id: '1', ingredient: 'Flour', amount: '2', unit: 'cups', orderIndex: 0 },
      { id: '2', ingredient: 'Sugar', amount: '1', unit: 'cup', orderIndex: 1 },
    ],
    instructions: [
      { id: '1', stepNumber: 1, instruction: 'Mix ingredients' },
      { id: '2', stepNumber: 2, instruction: 'Bake for 30 minutes' },
    ],
    photos: [
      { id: '1', photoUrl: '/photo1.jpg', caption: 'Final dish', isOriginal: false },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockShareLink = {
    id: 'share-link-id',
    recipeId: 'test-recipe-id',
    token: 'test-token-123',
    createdBy: 'test-user-id',
    createdAt: new Date(),
    viewCount: 5,
    expiresAt: null,
    recipe: mockRecipe,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns shared recipe for valid token', async () => {
    vi.mocked(db.query.shareLinks.findFirst).mockResolvedValue(mockShareLink as unknown as Awaited<ReturnType<typeof db.query.shareLinks.findFirst>>)
    
    const mockUpdate = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(db.update).mockReturnValue(mockUpdate as unknown as ReturnType<typeof db.update>)

    const request = new NextRequest('http://localhost:3000/api/share/test-token-123')
    const response = await GET(request, { params: Promise.resolve({ token: 'test-token-123' }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.recipe).toMatchObject({
      id: 'test-recipe-id',
      title: 'Test Recipe',
      ingredients: expect.arrayContaining([
        expect.objectContaining({ ingredient: 'Flour' }),
      ]),
    })
    
    // Verify view count was incremented
    expect(mockUpdate.set).toHaveBeenCalledWith({
      viewCount: 6,
      lastViewedAt: expect.any(Date),
    })
  })

  it('returns 404 for invalid token', async () => {
    vi.mocked(db.query.shareLinks.findFirst).mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/share/invalid-token')
    const response = await GET(request, { params: Promise.resolve({ token: 'invalid-token' }) })
    
    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe('Share link not found')
  })

  it('returns 410 for expired share link', async () => {
    const expiredShareLink = {
      ...mockShareLink,
      expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
    }
    vi.mocked(db.query.shareLinks.findFirst).mockResolvedValue(expiredShareLink as unknown as Awaited<ReturnType<typeof db.query.shareLinks.findFirst>>)

    const request = new NextRequest('http://localhost:3000/api/share/test-token-123')
    const response = await GET(request, { params: Promise.resolve({ token: 'test-token-123' }) })
    
    expect(response.status).toBe(410)
    const data = await response.json()
    expect(data.error).toBe('Share link has expired')
  })

  it('handles database errors gracefully', async () => {
    vi.mocked(db.query.shareLinks.findFirst).mockRejectedValue(new Error('Database error'))

    const request = new NextRequest('http://localhost:3000/api/share/test-token-123')
    const response = await GET(request, { params: Promise.resolve({ token: 'test-token-123' }) })
    
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('Failed to fetch shared recipe')
  })
})