import { Page } from '@playwright/test'

export async function setupAPIMocks(page: Page) {
  // Mock storage bucket endpoints
  await page.route('**/storage/v1/object/list/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  await page.route('**/storage/v1/bucket', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 'recipe-photos', name: 'recipe-photos', public: false },
        { id: 'ocr-uploads', name: 'ocr-uploads', public: false },
        { id: 'original-recipe-cards', name: 'original-recipe-cards', public: false }
      ])
    })
  })
  // Mock recipe list endpoint
  await page.route('**/api/recipes', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          recipes: [
            {
              id: 'test-recipe-123',
              title: 'Test Recipe',
              description: 'A test recipe for e2e testing',
              servings: 4,
              prep_time: 15,
              cook_time: 30,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              user_id: 'test-user-123',
              is_public: true,
              recipe_photos: []
            }
          ]
        })
      })
    }
  })

  // Mock single recipe endpoint
  await page.route('**/api/recipes/test-recipe-123', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-recipe-123',
        title: 'Test Recipe',
        description: 'A test recipe for e2e testing',
        servings: 4,
        prep_time: 15,
        cook_time: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'test-user-123',
        is_public: true,
        ingredients: [
          {
            id: '1',
            recipe_id: 'test-recipe-123',
            name: 'Flour',
            amount: '2',
            unit: 'cups',
            order_index: 1,
            is_adjustable: true
          },
          {
            id: '2',
            recipe_id: 'test-recipe-123',
            name: 'Sugar',
            amount: '1',
            unit: 'cup',
            order_index: 2,
            is_adjustable: true
          },
          {
            id: '3',
            recipe_id: 'test-recipe-123',
            name: 'Salt',
            amount: '0.5',
            unit: 'tsp',
            order_index: 3,
            is_adjustable: false
          },
          {
            id: '4',
            recipe_id: 'test-recipe-123',
            name: 'Vanilla extract',
            amount: null,
            unit: null,
            order_index: 4,
            is_adjustable: false
          }
        ],
        instructions: [
          {
            id: '1',
            recipe_id: 'test-recipe-123',
            step_number: 1,
            instruction: 'Mix dry ingredients',
            time_in_minutes: 5
          },
          {
            id: '2',
            recipe_id: 'test-recipe-123',
            step_number: 2,
            instruction: 'Add wet ingredients',
            time_in_minutes: 5
          }
        ],
        recipe_photos: []
      })
    })
  })

  // Mock update recipe endpoint
  await page.route('**/api/recipes/test-recipe-123', async (route) => {
    if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}')
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...body,
          id: 'test-recipe-123',
          updated_at: new Date().toISOString()
        })
      })
    }
  })

  // Mock Supabase REST endpoints
  await page.route('**/rest/v1/recipes**', async (route) => {
    if (route.request().url().includes('id=eq.test-recipe-123')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'test-recipe-123',
          title: 'Test Recipe',
          description: 'A test recipe for e2e testing',
          servings: 4,
          prep_time: 15,
          cook_time: 30,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          user_id: 'test-user-123',
          is_public: true
        }])
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    }
  })

  // Mock ingredients endpoint
  await page.route('**/rest/v1/ingredients**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          recipe_id: 'test-recipe-123',
          name: 'Flour',
          amount: '2',
          unit: 'cups',
          order_index: 1,
          is_adjustable: true
        },
        {
          id: '2',
          recipe_id: 'test-recipe-123',
          name: 'Sugar',
          amount: '1',
          unit: 'cup',
          order_index: 2,
          is_adjustable: true
        },
        {
          id: '3',
          recipe_id: 'test-recipe-123',
          name: 'Salt',
          amount: '0.5',
          unit: 'tsp',
          order_index: 3,
          is_adjustable: false
        },
        {
          id: '4',
          recipe_id: 'test-recipe-123',
          name: 'Vanilla extract',
          amount: null,
          unit: null,
          order_index: 4,
          is_adjustable: false
        }
      ])
    })
  })

  // Mock instructions endpoint
  await page.route('**/rest/v1/instructions**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: '1',
          recipe_id: 'test-recipe-123',
          step_number: 1,
          instruction: 'Mix dry ingredients',
          time_in_minutes: 5
        },
        {
          id: '2',
          recipe_id: 'test-recipe-123',
          step_number: 2,
          instruction: 'Add wet ingredients',
          time_in_minutes: 5
        }
      ])
    })
  })

  // Mock recipe photos endpoint
  await page.route('**/rest/v1/recipe_photos**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  // Mock favorites endpoint
  await page.route('**/rest/v1/favorites**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  // Mock recipe_tags endpoint
  await page.route('**/rest/v1/recipe_tags**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })

  // Mock recipe_categories endpoint
  await page.route('**/rest/v1/recipe_categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    })
  })
}

export async function setupNavigationMocks(page: Page) {
  // Navigate directly to recipe page with authentication
  await page.goto('/protected/recipes/test-recipe-123', { waitUntil: 'networkidle' })
}