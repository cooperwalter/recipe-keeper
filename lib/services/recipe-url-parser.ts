import { load } from 'cheerio'

export interface ExtractedRecipe {
  title?: string
  description?: string
  ingredients?: string[]
  instructions?: string[]
  prepTime?: number
  cookTime?: number
  totalTime?: number
  servings?: number
  image?: string
  sourceName?: string
  sourceUrl: string
  yield?: string
  category?: string
  cuisine?: string
  keywords?: string[]
  nutrition?: {
    calories?: string
    protein?: string
    fat?: string
    carbohydrates?: string
  }
}

export class RecipeUrlParser {
  /**
   * Extract recipe data from a URL
   */
  async extractFromUrl(url: string): Promise<ExtractedRecipe> {
    try {
      // Validate URL
      const validUrl = new URL(url)
      
      // Fetch the page content
      const response = await fetch(validUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; RecipeKeeper/1.0; +https://recipekeeper.com/bot)'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
      }

      const html = await response.text()
      const $ = load(html)

      // Try to extract structured data first
      const structuredData = this.extractStructuredData($)
      if (structuredData && this.isValidRecipe(structuredData)) {
        return { ...structuredData, sourceUrl: url }
      }

      // Fallback to HTML parsing
      const htmlData = this.extractFromHtml($, url)
      if (this.isValidRecipe(htmlData)) {
        return htmlData
      }

      throw new Error('No valid recipe data found on this page')
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Failed to extract recipe from URL')
    }
  }

  /**
   * Extract recipe data from JSON-LD structured data
   */
  private extractStructuredData($: ReturnType<typeof load>): Omit<ExtractedRecipe, 'sourceUrl'> | null {
    const scripts = $('script[type="application/ld+json"]')
    
    for (let i = 0; i < scripts.length; i++) {
      try {
        const data = JSON.parse($(scripts[i]).html() || '{}')
        
        // Handle single recipe
        if (data['@type'] === 'Recipe') {
          return this.parseRecipeSchema(data)
        }
        
        // Handle array of items
        if (Array.isArray(data)) {
          const recipe = data.find(item => item['@type'] === 'Recipe')
          if (recipe) {
            return this.parseRecipeSchema(recipe)
          }
        }
        
        // Handle @graph structure
        if (data['@graph'] && Array.isArray(data['@graph'])) {
          const recipe = data['@graph'].find((item: unknown) => (item as Record<string, unknown>)['@type'] === 'Recipe')
          if (recipe) {
            return this.parseRecipeSchema(recipe)
          }
        }
      } catch {
        // Continue to next script tag
        continue
      }
    }
    
    return null
  }

  /**
   * Parse Schema.org Recipe format
   */
  private parseRecipeSchema(data: Record<string, unknown>): Omit<ExtractedRecipe, 'sourceUrl'> {
    const recipe: Partial<ExtractedRecipe> = {}

    // Basic info
    recipe.title = data.name as string
    recipe.description = data.description as string
    recipe.image = this.extractImageUrl(data.image)
    const author = data.author as Record<string, unknown> | undefined
    const publisher = data.publisher as Record<string, unknown> | undefined
    recipe.sourceName = (author?.name || publisher?.name) as string | undefined

    // Times (convert ISO 8601 duration to minutes)
    recipe.prepTime = this.parseDuration(data.prepTime as string)
    recipe.cookTime = this.parseDuration(data.cookTime as string)
    recipe.totalTime = this.parseDuration(data.totalTime as string)

    // Servings and yield
    if (data.recipeYield) {
      if (typeof data.recipeYield === 'number') {
        recipe.servings = data.recipeYield
      } else if (typeof data.recipeYield === 'string') {
        recipe.yield = data.recipeYield
        const match = data.recipeYield.match(/\d+/)
        if (match) {
          recipe.servings = parseInt(match[0])
        }
      }
    }

    // Ingredients
    if (Array.isArray(data.recipeIngredient)) {
      recipe.ingredients = data.recipeIngredient.map((ing: string) => ing.trim())
    }

    // Instructions
    if (Array.isArray(data.recipeInstructions)) {
      recipe.instructions = data.recipeInstructions.map((inst) => {
        if (typeof inst === 'string') {
          return inst.trim()
        } else if (typeof inst === 'object' && inst !== null) {
          const instruction = inst as Record<string, unknown>
          if (instruction.text) {
            return (instruction.text as string).trim()
          } else if (instruction.name) {
            return (instruction.name as string).trim()
          }
        }
        return ''
      }).filter(Boolean)
    }

    // Categories and keywords
    recipe.category = data.recipeCategory as string
    recipe.cuisine = data.recipeCuisine as string
    if (data.keywords) {
      recipe.keywords = typeof data.keywords === 'string' 
        ? (data.keywords as string).split(',').map((k) => k.trim())
        : data.keywords as string[]
    }

    // Nutrition
    if (data.nutrition) {
      const nutrition = data.nutrition as Record<string, unknown>
      recipe.nutrition = {
        calories: nutrition.calories as string,
        protein: nutrition.proteinContent as string,
        fat: nutrition.fatContent as string,
        carbohydrates: nutrition.carbohydrateContent as string
      }
    }

    return recipe as Omit<ExtractedRecipe, 'sourceUrl'>
  }

  /**
   * Fallback HTML parsing for sites without structured data
   */
  private extractFromHtml($: ReturnType<typeof load>, url: string): ExtractedRecipe {
    const recipe: ExtractedRecipe = { sourceUrl: url }

    // Title - try multiple selectors
    recipe.title = 
      $('h1.recipe-name').text().trim() ||
      $('h1.recipe-title').text().trim() ||
      $('h1[itemprop="name"]').text().trim() ||
      $('h1').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      $('title').text().trim()

    // Description
    recipe.description = 
      $('div.recipe-description').text().trim() ||
      $('p.recipe-description').text().trim() ||
      $('[itemprop="description"]').text().trim() ||
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="description"]').attr('content')

    // Image
    recipe.image = 
      $('img.recipe-image').attr('src') ||
      $('[itemprop="image"]').attr('src') ||
      $('meta[property="og:image"]').attr('content')

    // Make image URL absolute
    if (recipe.image && !recipe.image.startsWith('http')) {
      try {
        const baseUrl = new URL(url)
        recipe.image = new URL(recipe.image, baseUrl.origin).toString()
      } catch {
        // Invalid image URL
        delete recipe.image
      }
    }

    // Ingredients - try multiple patterns
    const ingredients: string[] = []
    
    // Common ingredient selectors
    const ingredientSelectors = [
      'ul.recipe-ingredients li',
      'ul.ingredients li',
      'div.recipe-ingredients li',
      'div.ingredients li',
      '[itemprop="recipeIngredient"]',
      'ul.wprm-recipe-ingredients li',
      'div.tasty-recipes-ingredients li'
    ]

    for (const selector of ingredientSelectors) {
      if ($(selector).length > 0) {
        $(selector).each((_, el) => {
          const text = $(el).text().trim()
          if (text) ingredients.push(text)
        })
        break
      }
    }

    if (ingredients.length > 0) {
      recipe.ingredients = ingredients
    }

    // Instructions - try multiple patterns
    const instructions: string[] = []
    
    const instructionSelectors = [
      'ol.recipe-instructions li',
      'ol.instructions li',
      'div.recipe-instructions li',
      'div.instructions li',
      '[itemprop="recipeInstructions"]',
      'ol.wprm-recipe-instructions li',
      'div.tasty-recipes-instructions li',
      'div.recipe-method li',
      'div.directions li'
    ]

    for (const selector of instructionSelectors) {
      if ($(selector).length > 0) {
        $(selector).each((_, el) => {
          const text = $(el).text().trim()
          if (text) instructions.push(text)
        })
        break
      }
    }

    if (instructions.length > 0) {
      recipe.instructions = instructions
    }

    // Times - look for common patterns
    const timeText = $('body').text()
    
    // Prep time
    const prepMatch = timeText.match(/prep(?:\s+time)?:\s*(\d+)\s*(?:hours?|hrs?|minutes?|mins?)/i)
    if (prepMatch) {
      recipe.prepTime = this.parseTimeString(prepMatch[1] + ' ' + prepMatch[0])
    }

    // Cook time
    const cookMatch = timeText.match(/cook(?:\s+time)?:\s*(\d+)\s*(?:hours?|hrs?|minutes?|mins?)/i)
    if (cookMatch) {
      recipe.cookTime = this.parseTimeString(cookMatch[1] + ' ' + cookMatch[0])
    }

    // Servings
    const servingsMatch = timeText.match(/(?:serves?|servings?|yield):\s*(\d+)/i)
    if (servingsMatch) {
      recipe.servings = parseInt(servingsMatch[1])
    }

    // Source name from domain
    try {
      const urlObj = new URL(url)
      recipe.sourceName = urlObj.hostname.replace('www.', '')
    } catch {
      // Invalid URL
    }

    return recipe
  }

  /**
   * Parse ISO 8601 duration to minutes
   */
  private parseDuration(duration?: string): number | undefined {
    if (!duration) return undefined
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
    if (!match) return undefined
    
    const hours = parseInt(match[1] || '0')
    const minutes = parseInt(match[2] || '0')
    
    return hours * 60 + minutes
  }

  /**
   * Parse time string like "30 minutes" to minutes
   */
  private parseTimeString(timeStr: string): number | undefined {
    const match = timeStr.match(/(\d+)\s*(?:hours?|hrs?|h)?\s*(?:(\d+)\s*)?(?:minutes?|mins?|m)?/i)
    if (!match) return undefined
    
    const hours = timeStr.toLowerCase().includes('hour') || timeStr.toLowerCase().includes('hr') 
      ? parseInt(match[1] || '0') 
      : 0
    const minutes = hours > 0 && match[2] 
      ? parseInt(match[2]) 
      : parseInt(match[1] || '0')
    
    return hours * 60 + minutes
  }

  /**
   * Extract image URL from various formats
   */
  private extractImageUrl(image: unknown): string | undefined {
    if (!image) return undefined
    
    if (typeof image === 'string') return image
    if (typeof image === 'object' && image !== null) {
      const imgObj = image as Record<string, unknown>
      if (imgObj.url) return imgObj.url as string
      if (imgObj['@id']) return imgObj['@id'] as string
    }
    if (Array.isArray(image) && image.length > 0) {
      return this.extractImageUrl(image[0])
    }
    
    return undefined
  }

  /**
   * Check if extracted data contains enough information to be a valid recipe
   */
  private isValidRecipe(data: Partial<ExtractedRecipe>): boolean {
    // Must have at least a title and either ingredients or instructions
    return !!(
      data.title && 
      (
        (data.ingredients && data.ingredients.length > 0) ||
        (data.instructions && data.instructions.length > 0)
      )
    )
  }
}