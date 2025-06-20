import { Page } from '@playwright/test'

export async function mockAuthentication(page: Page) {
  // Mock Supabase auth session
  await page.addInitScript(() => {
    // Mock localStorage with auth tokens
    window.localStorage.setItem('supabase.auth.token', JSON.stringify({
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      expires_at: Date.now() + 3600000, // 1 hour from now
      user: {
        id: 'test-user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      }
    }))
  })

  // Intercept Supabase auth calls
  await page.route('**/auth/v1/token**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 3600,
        user: {
          id: 'test-user-123',
          email: 'test@example.com'
        }
      })
    })
  })

  // Intercept user session calls
  await page.route('**/auth/v1/user', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'test-user-123',
        email: 'test@example.com',
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString()
      })
    })
  })
}