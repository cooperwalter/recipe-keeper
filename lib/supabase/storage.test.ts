import { describe, it, expect, vi, beforeEach } from 'vitest'
import { StorageService } from './storage'
import { createClient } from '@/lib/supabase/client'

vi.mock('@/lib/supabase/client')

// Mock File
class MockFile extends Blob {
  name: string
  lastModified: number

  constructor(chunks: BlobPart[], filename: string, options?: BlobPropertyBag) {
    super(chunks, options)
    this.name = filename
    this.lastModified = Date.now()
  }
}

global.File = MockFile as unknown as typeof File

describe('StorageService', () => {
  let service: StorageService
  let mockSupabase: {
    auth: {
      getUser: ReturnType<typeof vi.fn>
    }
    storage: {
      from: ReturnType<typeof vi.fn>
    }
  }
  let mockStorageClient: {
    upload: ReturnType<typeof vi.fn>
    download: ReturnType<typeof vi.fn>
    remove: ReturnType<typeof vi.fn>
    getPublicUrl: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock storage client
    mockStorageClient = {
      upload: vi.fn().mockResolvedValue({
        data: { path: 'test-path' },
        error: null,
      }),
      download: vi.fn().mockResolvedValue({
        data: new Blob(['test data']),
        error: null,
      }),
      remove: vi.fn().mockResolvedValue({
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test-file.jpg' },
      }),
    }

    // Create mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'test-user-id' } },
        }),
      },
      storage: {
        from: vi.fn().mockReturnValue(mockStorageClient),
      },
    }

    ;(createClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockSupabase)
    service = new StorageService()
  })

  describe('upload', () => {
    it('should upload a file and return public URL', async () => {
      const file = new File(['test content'], 'test.jpg', { type: 'image/jpeg' })
      const options = {
        bucket: 'recipe-photos' as const,
        path: 'test/path/test.jpg',
        file,
      }

      const result = await service.upload(options)

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('recipe-photos')
      expect(mockStorageClient.upload).toHaveBeenCalledWith(
        'test/path/test.jpg',
        file,
        { upsert: false }
      )
      expect(result).toBe('https://example.com/test-file.jpg')
    })

    it('should validate file size', async () => {
      // Create a file larger than 10MB
      const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      })

      await expect(
        service.upload({
          bucket: 'recipe-photos',
          path: 'test.jpg',
          file: largeFile,
        })
      ).rejects.toThrow('File size exceeds 10MB limit')
    })

    it('should validate file type', async () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })

      await expect(
        service.upload({
          bucket: 'recipe-photos',
          path: 'test.pdf',
          file,
        })
      ).rejects.toThrow('File type not supported')
    })
  })

  describe('download', () => {
    it('should download a file', async () => {
      const options = {
        bucket: 'recipe-photos' as const,
        path: 'test/path/test.jpg',
      }

      const result = await service.download(options)

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('recipe-photos')
      expect(mockStorageClient.download).toHaveBeenCalledWith('test/path/test.jpg')
      expect(result).toBeInstanceOf(Blob)
    })
  })

  describe('delete', () => {
    it('should delete a file', async () => {
      const options = {
        bucket: 'recipe-photos' as const,
        path: 'test/path/test.jpg',
      }

      await service.delete(options)

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('recipe-photos')
      expect(mockStorageClient.remove).toHaveBeenCalledWith(['test/path/test.jpg'])
    })
  })

  describe('getPublicUrl', () => {
    it('should get public URL for a file', () => {
      const options = {
        bucket: 'recipe-photos' as const,
        path: 'test/path/test.jpg',
      }

      const result = service.getPublicUrl(options)

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('recipe-photos')
      expect(result).toBe('https://example.com/test-file.jpg')
    })
  })

  describe('uploadRecipePhoto', () => {
    it('should upload a recipe photo with generated path', async () => {
      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
      const recipeId = 'recipe-123'

      vi.spyOn(Date, 'now').mockReturnValue(1234567890)

      const result = await service.uploadRecipePhoto(recipeId, file)

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('recipe-photos')
      expect(mockStorageClient.upload).toHaveBeenCalledWith(
        'test-user-id/recipe-123/1234567890.jpg',
        file,
        { upsert: false }
      )
      expect(result).toBe('https://example.com/test-file.jpg')
    })

    it('should throw error if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
      })

      const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })

      await expect(service.uploadRecipePhoto('recipe-123', file)).rejects.toThrow(
        'User not authenticated'
      )
    })
  })

  describe('uploadOriginalRecipeCard', () => {
    it('should upload an original recipe card', async () => {
      const file = new File(['test'], 'card.jpg', { type: 'image/jpeg' })
      const recipeId = 'recipe-123'

      vi.spyOn(Date, 'now').mockReturnValue(1234567890)

      const result = await service.uploadOriginalRecipeCard(recipeId, file)

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('original-recipe-cards')
      expect(mockStorageClient.upload).toHaveBeenCalledWith(
        'test-user-id/recipe-123/original-1234567890.jpg',
        file,
        { upsert: false }
      )
      expect(result).toBe('https://example.com/test-file.jpg')
    })
  })

  describe('generateUniqueFilename', () => {
    it('should generate unique filename', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890)
      vi.spyOn(Math, 'random').mockReturnValue(0.123456)

      const result = service.generateUniqueFilename('photo.jpg')

      expect(result).toMatch(/^1234567890-[a-z0-9]+\.jpg$/)
    })
  })

  describe('batchUpload', () => {
    it('should upload multiple files', async () => {
      const files = [
        {
          file: new File(['test1'], 'photo1.jpg', { type: 'image/jpeg' }),
          bucket: 'recipe-photos' as const,
          path: 'path1.jpg',
        },
        {
          file: new File(['test2'], 'photo2.jpg', { type: 'image/jpeg' }),
          bucket: 'recipe-photos' as const,
          path: 'path2.jpg',
        },
      ]

      const results = await service.batchUpload(files)

      expect(results).toHaveLength(2)
      expect(results).toEqual([
        'https://example.com/test-file.jpg',
        'https://example.com/test-file.jpg',
      ])
    })
  })

  describe('file validation', () => {
    it('should accept valid image types', async () => {
      const validTypes = [
        { type: 'image/jpeg', name: 'test.jpg' },
        { type: 'image/png', name: 'test.png' },
        { type: 'image/webp', name: 'test.webp' },
        { type: 'image/gif', name: 'test.gif' },
      ]

      for (const { type, name } of validTypes) {
        const file = new File(['test'], name, { type })
        await expect(
          service.upload({
            bucket: 'recipe-photos',
            path: name,
            file,
          })
        ).resolves.toBeTruthy()
      }
    })
  })
})