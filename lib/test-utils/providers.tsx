import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create a new QueryClient for each test to ensure isolation
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Turn off retries for tests
        retry: false,
        // Set a short cache time for tests
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        // Turn off retries for tests
        retry: false,
      },
    },
  })
}

interface TestProvidersProps {
  children: React.ReactNode
  queryClient?: QueryClient
}

export function TestProviders({ children, queryClient }: TestProvidersProps) {
  const testQueryClient = queryClient || createTestQueryClient()
  
  return (
    <QueryClientProvider client={testQueryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Export a render function with providers
export function renderWithProviders(
  ui: React.ReactElement
) {
  const queryClient = createTestQueryClient()
  
  return {
    queryClient,
    element: (
      <TestProviders queryClient={queryClient}>{ui}</TestProviders>
    ),
  }
}