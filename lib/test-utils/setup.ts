import { vi, beforeEach, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { setupSupabaseMocks, createMockSupabaseClient } from './mocks/supabase'
import { setupRecipeServiceMock } from './mocks/services'
import { setupAnthropicMock, setupOpenAIMock } from './mocks/ai'

/**
 * Common test setup utilities
 */

export function setupTestEnvironment() {
  // Clean up after each test
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.resetModules()
  })
}

export function setupAuthenticatedTests(userOverrides?: any) {
  const mockSupabase = setupSupabaseMocks()
  const mockRecipeService = setupRecipeServiceMock()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  return {
    mockSupabase,
    mockRecipeService,
  }
}

export function setupUnauthenticatedTests() {
  const mockSupabase = setupSupabaseMocks({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  })
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  return {
    mockSupabase,
  }
}

export function setupAITests() {
  const mockAnthropic = setupAnthropicMock()
  const mockOpenAI = setupOpenAIMock()
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  return {
    mockAnthropic,
    mockOpenAI,
  }
}

export function mockConsoleError() {
  const originalError = console.error
  
  beforeEach(() => {
    console.error = vi.fn()
  })
  
  afterEach(() => {
    console.error = originalError
  })
  
  return {
    expectConsoleError: (message?: string | RegExp) => {
      expect(console.error).toHaveBeenCalled()
      if (message) {
        const calls = (console.error as any).mock.calls
        const found = calls.some((call: any[]) => {
          const arg = call[0]
          if (typeof message === 'string') {
            return arg.includes(message)
          } else {
            return message.test(arg)
          }
        })
        expect(found).toBe(true)
      }
    },
  }
}

export function mockRouter() {
  const push = vi.fn()
  const replace = vi.fn()
  const back = vi.fn()
  const forward = vi.fn()
  const refresh = vi.fn()
  const prefetch = vi.fn()
  
  vi.mock('next/navigation', () => ({
    useRouter: () => ({
      push,
      replace,
      back,
      forward,
      refresh,
      prefetch,
    }),
    usePathname: () => '/test-path',
    useSearchParams: () => new URLSearchParams(),
  }))
  
  return {
    push,
    replace,
    back,
    forward,
    refresh,
    prefetch,
  }
}

export function mockFetch() {
  const fetchMock = vi.fn()
  global.fetch = fetchMock
  
  afterEach(() => {
    fetchMock.mockClear()
  })
  
  return fetchMock
}

export function waitForAsync() {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export async function waitFor(condition: () => boolean, timeout = 5000) {
  const startTime = Date.now()
  
  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}