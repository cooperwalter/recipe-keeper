import { RecipeFormData } from '@/components/recipes/form/RecipeFormContext'

const DRAFT_KEY = 'recipe-draft'
const DRAFT_TIMESTAMP_KEY = 'recipe-draft-timestamp'
const DRAFT_EXPIRY_HOURS = 24 // Drafts expire after 24 hours

export interface DraftData {
  formData: RecipeFormData
  timestamp: number
}

export const draftPersistence = {
  save: (formData: RecipeFormData) => {
    try {
      // Don't save empty drafts
      if (!formData.title?.trim() && 
          formData.ingredients.length === 0 && 
          formData.instructions.length === 0) {
        return
      }

      // Convert File objects to serializable format (we'll lose the actual files but keep names)
      const serializableData = {
        ...formData,
        photos: formData.photos.map(file => ({
          name: file.name,
          size: file.size,
          type: file.type
        }))
      }

      const draftData: DraftData = {
        formData: serializableData as RecipeFormData,
        timestamp: Date.now()
      }

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData))
      localStorage.setItem(DRAFT_TIMESTAMP_KEY, Date.now().toString())
    } catch (error) {
      console.error('Failed to save draft:', error)
    }
  },

  load: (): RecipeFormData | null => {
    try {
      const draftJson = localStorage.getItem(DRAFT_KEY)
      const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY)
      
      if (!draftJson || !timestamp) return null

      const draftTimestamp = parseInt(timestamp)
      const now = Date.now()
      const expiryTime = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000

      // Check if draft has expired
      if (now - draftTimestamp > expiryTime) {
        draftPersistence.clear()
        return null
      }

      const draftData: DraftData = JSON.parse(draftJson)
      
      // Restore formData but clear photos (they can't be serialized properly)
      return {
        ...draftData.formData,
        photos: [] // Files can't be persisted in localStorage
      }
    } catch (error) {
      console.error('Failed to load draft:', error)
      return null
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(DRAFT_TIMESTAMP_KEY)
    } catch (error) {
      console.error('Failed to clear draft:', error)
    }
  },

  getTimestamp: (): Date | null => {
    try {
      const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY)
      if (!timestamp) return null
      return new Date(parseInt(timestamp))
    } catch {
      return null
    }
  },

  exists: (): boolean => {
    try {
      const draftJson = localStorage.getItem(DRAFT_KEY)
      const timestamp = localStorage.getItem(DRAFT_TIMESTAMP_KEY)
      
      if (!draftJson || !timestamp) return false

      const draftTimestamp = parseInt(timestamp)
      const now = Date.now()
      const expiryTime = DRAFT_EXPIRY_HOURS * 60 * 60 * 1000

      return now - draftTimestamp <= expiryTime
    } catch {
      return false
    }
  }
}