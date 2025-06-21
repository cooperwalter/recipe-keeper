import { vi } from 'vitest'
import { SupabaseClient } from '@supabase/supabase-js'
import { createMockUser } from '../factories'

/**
 * Standard Supabase client mocks for testing
 */

export type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
    signIn: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
    signUp: ReturnType<typeof vi.fn>
    updateUser: ReturnType<typeof vi.fn>
    resetPasswordForEmail: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
  storage: {
    from: ReturnType<typeof vi.fn>
  }
}

export function createMockSupabaseClient(overrides?: Partial<MockSupabaseClient>): MockSupabaseClient {
  const defaultClient: MockSupabaseClient = {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      }),
      signIn: vi.fn().mockResolvedValue({
        data: { user: createMockUser(), session: {} },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: createMockUser(), session: {} },
        error: null,
      }),
      updateUser: vi.fn().mockResolvedValue({
        data: { user: createMockUser() },
        error: null,
      }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn((table: string) => createMockSupabaseTable()),
    storage: {
      from: vi.fn((bucket: string) => createMockStorageBucket()),
    },
    ...overrides,
  }

  return defaultClient
}

export function createMockSupabaseTable() {
  const table = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    throwOnError: vi.fn().mockReturnThis(),
  }

  // Make methods return the table object for chaining
  Object.keys(table).forEach((key) => {
    if (key !== 'single' && key !== 'maybeSingle' && typeof table[key as keyof typeof table] === 'function') {
      ;(table[key as keyof typeof table] as any).mockReturnValue(table)
    }
  })

  return table
}

export function createMockStorageBucket() {
  return {
    upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
    download: vi.fn().mockResolvedValue({ data: new Blob(['test']), error: null }),
    remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.jpg' } }),
    list: vi.fn().mockResolvedValue({ data: [], error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/signed' }, error: null }),
  }
}

export function setupSupabaseMocks(overrides?: Partial<MockSupabaseClient>) {
  const mockClient = createMockSupabaseClient(overrides)
  
  // Mock the createClient function from @/lib/supabase/server
  vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn().mockImplementation(async () => mockClient),
  }))
  
  // Mock the createBrowserClient function from @/lib/supabase/client
  vi.mock('@/lib/supabase/client', () => ({
    createBrowserClient: vi.fn().mockReturnValue(mockClient),
  }))
  
  return mockClient
}

export function createAuthenticatedSupabase(user?: Partial<ReturnType<typeof createMockUser>>) {
  return createMockSupabaseClient({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: createMockUser(user) },
        error: null,
      }),
      signIn: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
      updateUser: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  })
}

export function createUnauthenticatedSupabase() {
  return createMockSupabaseClient({
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
}