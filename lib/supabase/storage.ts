import { createClient } from '@/lib/supabase/client'

export interface UploadOptions {
  bucket: 'recipe-photos' | 'original-recipe-cards'
  path: string
  file: File
  upsert?: boolean
}

export interface DownloadOptions {
  bucket: 'recipe-photos' | 'original-recipe-cards'
  path: string
}

export class StorageService {
  private supabase = createClient()

  /**
   * Upload a file to Supabase storage
   */
  async upload(options: UploadOptions): Promise<string> {
    const { bucket, path, file, upsert = false } = options

    // Validate file
    this.validateFile(file)

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(path, file, { upsert })

    if (error) throw error

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  /**
   * Download a file from Supabase storage
   */
  async download(options: DownloadOptions): Promise<Blob> {
    const { bucket, path } = options

    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path)

    if (error) throw error
    return data
  }

  /**
   * Delete a file from Supabase storage
   */
  async delete(options: DownloadOptions): Promise<void> {
    const { bucket, path } = options

    const { error } = await this.supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(options: DownloadOptions): string {
    const { bucket, path } = options

    const { data } = this.supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return data.publicUrl
  }

  /**
   * Upload a recipe photo
   */
  async uploadRecipePhoto(recipeId: string, file: File): Promise<string> {
    const user = await this.supabase.auth.getUser()
    const userId = user.data.user?.id

    if (!userId) throw new Error('User not authenticated')

    const timestamp = Date.now()
    const extension = this.getFileExtension(file.name)
    const path = `${userId}/${recipeId}/${timestamp}.${extension}`

    return this.upload({
      bucket: 'recipe-photos',
      path,
      file,
    })
  }

  /**
   * Upload an original recipe card
   */
  async uploadOriginalRecipeCard(recipeId: string, file: File): Promise<string> {
    const user = await this.supabase.auth.getUser()
    const userId = user.data.user?.id

    if (!userId) throw new Error('User not authenticated')

    const timestamp = Date.now()
    const extension = this.getFileExtension(file.name)
    const path = `${userId}/${recipeId}/original-${timestamp}.${extension}`

    return this.upload({
      bucket: 'original-recipe-cards',
      path,
      file,
    })
  }

  /**
   * Optimize image before upload
   */
  async optimizeImage(file: File, maxWidth = 1920, maxHeight = 1080): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        const img = new Image()

        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height

          // Calculate new dimensions
          if (width > maxWidth || height > maxHeight) {
            const aspectRatio = width / height

            if (width > height) {
              width = maxWidth
              height = width / aspectRatio
            } else {
              height = maxHeight
              width = height * aspectRatio
            }
          }

          canvas.width = width
          canvas.height = height

          const ctx = canvas.getContext('2d')
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }

          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to create blob'))
                return
              }

              const optimizedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })

              resolve(optimizedFile)
            },
            'image/jpeg',
            0.85 // 85% quality
          )
        }

        img.onerror = () => reject(new Error('Failed to load image'))
        img.src = e.target?.result as string
      }

      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsDataURL(file)
    })
  }

  /**
   * Validate file before upload
   */
  private validateFile(file: File): void {
    const maxSize = 10 * 1024 * 1024 // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

    if (file.size > maxSize) {
      throw new Error('File size exceeds 10MB limit')
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('File type not supported. Please upload JPEG, PNG, WebP, or GIF images.')
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.')
    return parts[parts.length - 1].toLowerCase()
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    const extension = this.getFileExtension(originalName)
    return `${timestamp}-${random}.${extension}`
  }

  /**
   * Batch upload multiple files
   */
  async batchUpload(files: Array<{ file: File; bucket: UploadOptions['bucket']; path: string }>): Promise<string[]> {
    const uploadPromises = files.map((item) =>
      this.upload({
        bucket: item.bucket,
        path: item.path,
        file: item.file,
      })
    )

    return Promise.all(uploadPromises)
  }
}