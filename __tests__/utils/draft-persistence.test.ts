import { describe, it, expect, beforeEach, vi } from 'vitest'
import { draftPersistence } from '@/lib/utils/draft-persistence'
import { RecipeFormData } from '@/components/recipes/form/RecipeFormContext'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

global.localStorage = localStorageMock as any

describe('draftPersistence', () => {
  const mockFormData: RecipeFormData = {
    title: 'Test Recipe',
    description: 'A test recipe',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    isPublic: false,
    sourceName: 'Test User',
    sourceNotes: 'Test notes',
    ingredients: [
      { ingredient: 'flour', amount: 2, unit: 'cups' }
    ],
    instructions: [
      { instruction: 'Mix ingredients', stepNumber: 1 }
    ],
    categoryIds: ['breakfast'],
    tags: ['easy'],
    photos: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('save', () => {
    it('should save draft to localStorage', () => {
      draftPersistence.save(mockFormData)

      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2)
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'recipe-draft',
        expect.stringContaining('Test Recipe')
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'recipe-draft-timestamp',
        expect.any(String)
      )
    })

    it('should not save empty drafts', () => {
      const emptyData: RecipeFormData = {
        title: '',
        description: '',
        ingredients: [],
        instructions: [],
        categoryIds: [],
        tags: [],
        photos: []
      }

      draftPersistence.save(emptyData)

      expect(localStorageMock.setItem).not.toHaveBeenCalled()
    })

    it('should handle save errors gracefully', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => draftPersistence.save(mockFormData)).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to save draft:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('load', () => {
    it('should load draft from localStorage', () => {
      const draftData = {
        formData: mockFormData,
        timestamp: Date.now()
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'recipe-draft') return JSON.stringify(draftData)
        if (key === 'recipe-draft-timestamp') return draftData.timestamp.toString()
        return null
      })

      const loaded = draftPersistence.load()

      expect(loaded).toEqual({
        ...mockFormData,
        photos: [] // Files are cleared when loading
      })
    })

    it('should return null if no draft exists', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const loaded = draftPersistence.load()

      expect(loaded).toBeNull()
    })

    it('should return null and clear expired drafts', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const draftData = {
        formData: mockFormData,
        timestamp: oldTimestamp
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'recipe-draft') return JSON.stringify(draftData)
        if (key === 'recipe-draft-timestamp') return oldTimestamp.toString()
        return null
      })

      const loaded = draftPersistence.load()

      expect(loaded).toBeNull()
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('recipe-draft')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('recipe-draft-timestamp')
    })

    it('should handle load errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const loaded = draftPersistence.load()

      expect(loaded).toBeNull()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load draft:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('clear', () => {
    it('should remove draft from localStorage', () => {
      draftPersistence.clear()

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('recipe-draft')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('recipe-draft-timestamp')
    })

    it('should handle clear errors gracefully', () => {
      localStorageMock.removeItem.mockImplementationOnce(() => {
        throw new Error('Storage error')
      })

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => draftPersistence.clear()).not.toThrow()
      expect(consoleSpy).toHaveBeenCalledWith('Failed to clear draft:', expect.any(Error))

      consoleSpy.mockRestore()
    })
  })

  describe('getTimestamp', () => {
    it('should return draft timestamp as Date', () => {
      const timestamp = Date.now()
      localStorageMock.getItem.mockReturnValue(timestamp.toString())

      const result = draftPersistence.getTimestamp()

      expect(result).toBeInstanceOf(Date)
      expect(result?.getTime()).toBe(timestamp)
    })

    it('should return null if no timestamp exists', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const result = draftPersistence.getTimestamp()

      expect(result).toBeNull()
    })
  })

  describe('exists', () => {
    it('should return true for valid draft', () => {
      const timestamp = Date.now()
      const draftData = {
        formData: mockFormData,
        timestamp
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'recipe-draft') return JSON.stringify(draftData)
        if (key === 'recipe-draft-timestamp') return timestamp.toString()
        return null
      })

      expect(draftPersistence.exists()).toBe(true)
    })

    it('should return false for expired draft', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const draftData = {
        formData: mockFormData,
        timestamp: oldTimestamp
      }

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'recipe-draft') return JSON.stringify(draftData)
        if (key === 'recipe-draft-timestamp') return oldTimestamp.toString()
        return null
      })

      expect(draftPersistence.exists()).toBe(false)
    })

    it('should return false if no draft exists', () => {
      localStorageMock.getItem.mockReturnValue(null)

      expect(draftPersistence.exists()).toBe(false)
    })
  })
})