/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { RecipeUrlParser } from './recipe-url-parser'

// Mock fetch
global.fetch = vi.fn()

describe('RecipeUrlParser', () => {
  let parser: RecipeUrlParser

  beforeEach(() => {
    parser = new RecipeUrlParser()
    vi.clearAllMocks()
  })

  describe('extractFromUrl', () => {
    it('should extract recipe from JSON-LD structured data', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@type": "Recipe",
                "name": "Chocolate Chip Cookies",
                "description": "Classic chocolate chip cookies",
                "prepTime": "PT15M",
                "cookTime": "PT12M",
                "totalTime": "PT27M",
                "recipeYield": "24 cookies",
                "recipeIngredient": [
                  "2 cups all-purpose flour",
                  "1 cup butter, softened",
                  "1 cup chocolate chips"
                ],
                "recipeInstructions": [
                  {
                    "@type": "HowToStep",
                    "text": "Preheat oven to 375°F"
                  },
                  {
                    "@type": "HowToStep",
                    "text": "Mix ingredients together"
                  }
                ],
                "image": "https://example.com/cookie.jpg",
                "author": {
                  "@type": "Person",
                  "name": "Test Chef"
                }
              }
            </script>
          </head>
          <body>Recipe content</body>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result).toEqual({
        title: 'Chocolate Chip Cookies',
        description: 'Classic chocolate chip cookies',
        prepTime: 15,
        cookTime: 12,
        totalTime: 27,
        yield: '24 cookies',
        servings: 24,
        ingredients: [
          '2 cups all-purpose flour',
          '1 cup butter, softened',
          '1 cup chocolate chips'
        ],
        instructions: [
          'Preheat oven to 375°F',
          'Mix ingredients together'
        ],
        image: 'https://example.com/cookie.jpg',
        sourceName: 'Test Chef',
        sourceUrl: 'https://example.com/recipe'
      })
    })

    it('should handle recipes in @graph structure', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@context": "https://schema.org",
                "@graph": [
                  {
                    "@type": "WebPage",
                    "name": "Recipe Page"
                  },
                  {
                    "@type": "Recipe",
                    "name": "Pasta Carbonara",
                    "recipeIngredient": ["Pasta", "Eggs", "Bacon"],
                    "recipeInstructions": ["Cook pasta", "Mix with eggs"]
                  }
                ]
              }
            </script>
          </head>
          <body>Recipe content</body>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result.title).toBe('Pasta Carbonara')
      expect(result.ingredients).toEqual(['Pasta', 'Eggs', 'Bacon'])
      expect(result.instructions).toEqual(['Cook pasta', 'Mix with eggs'])
    })

    it('should fallback to HTML parsing when no structured data', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Apple Pie Recipe</title>
            <meta property="og:description" content="Delicious homemade apple pie">
            <meta property="og:image" content="https://example.com/pie.jpg">
          </head>
          <body>
            <h1 class="recipe-title">Apple Pie</h1>
            <ul class="recipe-ingredients">
              <li>6 apples, sliced</li>
              <li>1 cup sugar</li>
              <li>Pie crust</li>
            </ul>
            <ol class="recipe-instructions">
              <li>Prepare the filling</li>
              <li>Place in pie crust</li>
              <li>Bake at 375°F for 45 minutes</li>
            </ol>
            <div>Prep time: 30 minutes</div>
            <div>Cook time: 45 minutes</div>
            <div>Serves: 8</div>
          </body>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result.title).toBe('Apple Pie')
      expect(result.description).toBe('Delicious homemade apple pie')
      expect(result.image).toBe('https://example.com/pie.jpg')
      expect(result.ingredients).toEqual([
        '6 apples, sliced',
        '1 cup sugar',
        'Pie crust'
      ])
      expect(result.instructions).toEqual([
        'Prepare the filling',
        'Place in pie crust',
        'Bake at 375°F for 45 minutes'
      ])
      expect(result.prepTime).toBe(30)
      expect(result.cookTime).toBe(45)
      expect(result.servings).toBe(8)
    })

    it('should handle relative image URLs', async () => {
      const mockHtml = `
        <html>
          <head>
            <meta property="og:image" content="/images/recipe.jpg">
          </head>
          <body>
            <h1>Test Recipe</h1>
            <ul class="ingredients">
              <li>Ingredient 1</li>
            </ul>
            <ol class="instructions">
              <li>Step 1</li>
            </ol>
          </body>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipes/test')

      expect(result.image).toBe('https://example.com/images/recipe.jpg')
    })

    it('should parse various time formats', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Test Recipe",
                "prepTime": "PT1H30M",
                "cookTime": "PT45M",
                "recipeIngredient": ["Test ingredient"]
              }
            </script>
          </head>
          <body>Recipe</body>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result.prepTime).toBe(90) // 1 hour 30 minutes
      expect(result.cookTime).toBe(45)
    })

    it('should handle numeric and string recipe yield', async () => {
      const mockHtml1 = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Test Recipe 1",
                "recipeYield": 6,
                "recipeIngredient": ["Test"]
              }
            </script>
          </head>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml1
      })

      const result1 = await parser.extractFromUrl('https://example.com/recipe1')
      expect(result1.servings).toBe(6)

      const mockHtml2 = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Test Recipe 2",
                "recipeYield": "12 muffins",
                "recipeIngredient": ["Test"]
              }
            </script>
          </head>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml2
      })

      const result2 = await parser.extractFromUrl('https://example.com/recipe2')
      expect(result2.yield).toBe('12 muffins')
      expect(result2.servings).toBe(12)
    })

    it('should extract nutrition information', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Healthy Salad",
                "recipeIngredient": ["Lettuce", "Tomatoes"],
                "nutrition": {
                  "@type": "NutritionInformation",
                  "calories": "150 calories",
                  "proteinContent": "5g",
                  "fatContent": "10g",
                  "carbohydrateContent": "15g"
                }
              }
            </script>
          </head>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result.nutrition).toEqual({
        calories: '150 calories',
        protein: '5g',
        fat: '10g',
        carbohydrates: '15g'
      })
    })

    it('should extract keywords and categories', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Italian Pasta",
                "recipeIngredient": ["Pasta"],
                "recipeCategory": "Main Course",
                "recipeCuisine": "Italian",
                "keywords": "pasta, italian, dinner"
              }
            </script>
          </head>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result.category).toBe('Main Course')
      expect(result.cuisine).toBe('Italian')
      expect(result.keywords).toEqual(['pasta', 'italian', 'dinner'])
    })

    it('should throw error for non-recipe pages', async () => {
      const mockHtml = `
        <html>
          <head>
            <title>Not a Recipe</title>
          </head>
          <body>
            <h1>About Us</h1>
            <p>This is not a recipe page</p>
          </body>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      await expect(parser.extractFromUrl('https://example.com/about')).rejects.toThrow(
        'No valid recipe data found on this page'
      )
    })

    it('should throw error for invalid URLs', async () => {
      await expect(parser.extractFromUrl('not-a-url')).rejects.toThrow()
    })

    it('should throw error when fetch fails', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      await expect(parser.extractFromUrl('https://example.com/404')).rejects.toThrow(
        'Failed to fetch URL: 404 Not Found'
      )
    })

    it('should handle malformed JSON-LD gracefully', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              { invalid json }
            </script>
            <title>Fallback Recipe</title>
          </head>
          <body>
            <h1>Simple Recipe</h1>
            <ul class="ingredients">
              <li>Ingredient 1</li>
            </ul>
            <ol class="instructions">
              <li>Step 1</li>
            </ol>
          </body>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result.title).toBe('Simple Recipe')
      expect(result.ingredients).toEqual(['Ingredient 1'])
    })

    it('should handle various instruction formats', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Test Recipe",
                "recipeIngredient": ["Test"],
                "recipeInstructions": [
                  "Simple string instruction",
                  {
                    "@type": "HowToStep",
                    "text": "Step with text property"
                  },
                  {
                    "@type": "HowToStep",
                    "name": "Step with name property"
                  }
                ]
              }
            </script>
          </head>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      const result = await parser.extractFromUrl('https://example.com/recipe')

      expect(result.instructions).toEqual([
        'Simple string instruction',
        'Step with text property',
        'Step with name property'
      ])
    })

    it('should validate recipe has minimum required fields', async () => {
      const mockHtml = `
        <html>
          <head>
            <script type="application/ld+json">
              {
                "@type": "Recipe",
                "name": "Title Only Recipe"
              }
            </script>
          </head>
        </html>
      `

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => mockHtml
      })

      await expect(parser.extractFromUrl('https://example.com/recipe')).rejects.toThrow(
        'No valid recipe data found on this page'
      )
    })
  })
})