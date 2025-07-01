import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, GET, DELETE } from './route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    query: {
      recipes: {
        findFirst: vi.fn(),
      },
      shareLinks: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('Share Recipe API', () => {
  const mockUser = { id: 'test-user-id' }
  const mockRecipe = { id: 'test-recipe-id', createdBy: 'test-user-id', title: 'Test Recipe' }
  const mockShareLink = { 
    id: 'share-link-id',
    recipeId: 'test-recipe-id',
    token: 'test-token-123',
    createdBy: 'test-user-id',
    createdAt: new Date(),
    viewCount: 0,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  })

  describe('POST /api/recipes/[id]/share', () => {
    it('creates a new share link for recipe owner', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)
      vi.mocked(db.query.recipes.findFirst).mockResolvedValue(mockRecipe as unknown as Awaited<ReturnType<typeof db.query.recipes.findFirst>>)
      vi.mocked(db.query.shareLinks.findFirst).mockResolvedValue(null)
      
      const mockInsert = {
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([mockShareLink]),
      }
      vi.mocked(db.insert).mockReturnValue(mockInsert as unknown as ReturnType<typeof db.insert>)

      const request = new NextRequest('http://localhost:3000/api/recipes/test-recipe-id/share', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-recipe-id' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        shareUrl: 'http://localhost:3000/share/test-token-123',
        token: 'test-token-123',
      })
      expect(db.insert).toHaveBeenCalled()
    })

    it('returns existing share link if already exists', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)
      vi.mocked(db.query.recipes.findFirst).mockResolvedValue(mockRecipe as unknown as Awaited<ReturnType<typeof db.query.recipes.findFirst>>)
      vi.mocked(db.query.shareLinks.findFirst).mockResolvedValue(mockShareLink as unknown as Awaited<ReturnType<typeof db.query.shareLinks.findFirst>>)

      const request = new NextRequest('http://localhost:3000/api/recipes/test-recipe-id/share', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-recipe-id' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({
        shareUrl: 'http://localhost:3000/share/test-token-123',
        token: 'test-token-123',
      })
      expect(db.insert).not.toHaveBeenCalled()
    })

    it('returns 401 for unauthenticated requests', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Not authenticated') }),
        },
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)

      const request = new NextRequest('http://localhost:3000/api/recipes/test-recipe-id/share', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-recipe-id' }) })
      
      expect(response.status).toBe(401)
    })

    it('returns 404 for non-existent recipe', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)
      vi.mocked(db.query.recipes.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/recipes/test-recipe-id/share', {
        method: 'POST',
      })

      const response = await POST(request, { params: Promise.resolve({ id: 'test-recipe-id' }) })
      
      expect(response.status).toBe(404)
    })
  })

  describe('GET /api/recipes/[id]/share', () => {
    it('returns share link details', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)
      vi.mocked(db.query.shareLinks.findFirst).mockResolvedValue({
        ...mockShareLink,
        lastViewedAt: new Date(),
      } as unknown as Awaited<ReturnType<typeof db.query.shareLinks.findFirst>>)

      const request = new NextRequest('http://localhost:3000/api/recipes/test-recipe-id/share', {
        method: 'GET',
      })

      const response = await GET(request, { params: Promise.resolve({ id: 'test-recipe-id' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        shareUrl: 'http://localhost:3000/share/test-token-123',
        token: 'test-token-123',
        viewCount: 0,
      })
    })
  })

  describe('DELETE /api/recipes/[id]/share', () => {
    it('deletes share link successfully', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
        },
      }
      vi.mocked(createClient).mockResolvedValue(mockSupabase as unknown as ReturnType<typeof createClient>)
      
      const mockDelete = {
        where: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(db.delete).mockReturnValue(mockDelete as unknown as ReturnType<typeof db.delete>)

      const request = new NextRequest('http://localhost:3000/api/recipes/test-recipe-id/share', {
        method: 'DELETE',
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'test-recipe-id' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(db.delete).toHaveBeenCalled()
    })
  })
})