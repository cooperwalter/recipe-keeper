export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      recipes: {
        Row: {
          id: string
          userId: string
          title: string
          description: string | null
          prepTime: number | null
          cookTime: number | null
          servings: number | null
          isPublic: boolean
          sourceName: string | null
          sourceNotes: string | null
          createdAt: string
          updatedAt: string
        }
        Insert: {
          id?: string
          userId: string
          title: string
          description?: string | null
          prepTime?: number | null
          cookTime?: number | null
          servings?: number | null
          isPublic?: boolean
          sourceName?: string | null
          sourceNotes?: string | null
          createdAt?: string
          updatedAt?: string
        }
        Update: {
          id?: string
          userId?: string
          title?: string
          description?: string | null
          prepTime?: number | null
          cookTime?: number | null
          servings?: number | null
          isPublic?: boolean
          sourceName?: string | null
          sourceNotes?: string | null
          createdAt?: string
          updatedAt?: string
        }
      }
      ingredients: {
        Row: {
          id: string
          recipeId: string
          ingredient: string
          amount: number | null
          unit: string | null
          orderIndex: number
          notes: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          recipeId: string
          ingredient: string
          amount?: number | null
          unit?: string | null
          orderIndex: number
          notes?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          recipeId?: string
          ingredient?: string
          amount?: number | null
          unit?: string | null
          orderIndex?: number
          notes?: string | null
          createdAt?: string
        }
      }
      instructions: {
        Row: {
          id: string
          recipeId: string
          stepNumber: number
          instruction: string
          createdAt: string
        }
        Insert: {
          id?: string
          recipeId: string
          stepNumber: number
          instruction: string
          createdAt?: string
        }
        Update: {
          id?: string
          recipeId?: string
          stepNumber?: number
          instruction?: string
          createdAt?: string
        }
      }
      recipe_photos: {
        Row: {
          id: string
          recipeId: string
          photoUrl: string
          caption: string | null
          isOriginal: boolean
          orderIndex: number
          createdAt: string
        }
        Insert: {
          id?: string
          recipeId: string
          photoUrl: string
          caption?: string | null
          isOriginal?: boolean
          orderIndex?: number
          createdAt?: string
        }
        Update: {
          id?: string
          recipeId?: string
          photoUrl?: string
          caption?: string | null
          isOriginal?: boolean
          orderIndex?: number
          createdAt?: string
        }
      }
      recipe_categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          iconName: string | null
          createdAt: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          iconName?: string | null
          createdAt?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          iconName?: string | null
          createdAt?: string
        }
      }
      recipe_category_map: {
        Row: {
          recipeId: string
          categoryId: string
          createdAt: string
        }
        Insert: {
          recipeId: string
          categoryId: string
          createdAt?: string
        }
        Update: {
          recipeId?: string
          categoryId?: string
          createdAt?: string
        }
      }
      recipe_tags: {
        Row: {
          recipeId: string
          tag: string
          createdAt: string
        }
        Insert: {
          recipeId: string
          tag: string
          createdAt?: string
        }
        Update: {
          recipeId?: string
          tag?: string
          createdAt?: string
        }
      }
      user_favorites: {
        Row: {
          userId: string
          recipeId: string
          createdAt: string
        }
        Insert: {
          userId: string
          recipeId: string
          createdAt?: string
        }
        Update: {
          userId?: string
          recipeId?: string
          createdAt?: string
        }
      }
      migration_history: {
        Row: {
          id: string
          name: string
          checksum: string
          executedAt: string
        }
        Insert: {
          id?: string
          name: string
          checksum: string
          executedAt?: string
        }
        Update: {
          id?: string
          name?: string
          checksum?: string
          executedAt?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}