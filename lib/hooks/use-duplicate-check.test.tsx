import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDuplicateCheck } from './use-duplicate-check'
import { TestProviders, createTestQueryClient } from '@/lib/test-utils'

// Mock fetch
global.fetch = vi.fn()

describe.skip('useDuplicateCheck', () => {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  )

  it('should not check when title is empty', () => {
    renderHook(() => useDuplicateCheck(''), { wrapper })

    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('should check for duplicates with debounced title', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ duplicates: [] }),
    } as Response)

    const { result } = renderHook(() => useDuplicateCheck('Chocolate Cake'), { wrapper })

    // Initially should be idle
    expect(result.current.isChecking).toBe(false)

    // Wait for debounce and query to execute
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/recipes/check-duplicates?title=Chocolate%20Cake'
      )
    })

    await waitFor(() => {
      expect(result.current.duplicates).toEqual([])
      expect(result.current.isChecking).toBe(false)
    })
  })

  it('should return duplicate recipes', async () => {
    const mockDuplicates = [
      { id: '1', title: 'Chocolate Cake' },
      { id: '2', title: 'Chocolate Cake Recipe' },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ duplicates: mockDuplicates }),
    } as Response)

    const { result } = renderHook(() => useDuplicateCheck('Chocolate Cake'), { wrapper })

    await waitFor(() => {
      expect(result.current.duplicates).toEqual(mockDuplicates)
      expect(result.current.isChecking).toBe(false)
    })
  })

  it('should handle API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    } as Response)

    const { result } = renderHook(() => useDuplicateCheck('Test Recipe'), { wrapper })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(result.current.duplicates).toEqual([])
      expect(result.current.isChecking).toBe(false)
    })
  })

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDuplicateCheck('Test Recipe'), { wrapper })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(result.current.duplicates).toEqual([])
      expect(result.current.isChecking).toBe(false)
    })
  })

  it('should update when title changes', async () => {
    const { rerender } = renderHook(
      ({ title }) => useDuplicateCheck(title),
      {
        wrapper,
        initialProps: { title: 'Cake' },
      }
    )

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ duplicates: [{ id: '1', title: 'Cake Recipe' }] }),
    } as Response)

    // Change the title
    rerender({ title: 'Chocolate Cake' })

    await waitFor(() => {
      expect(mockFetch).toHaveBeenLastCalledWith(
        '/api/recipes/check-duplicates?title=Chocolate%20Cake'
      )
    })
  })

  it('should handle the isChecking state correctly', async () => {
    let resolvePromise: (value: Response) => void
    const promise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(promise)

    const { result } = renderHook(() => useDuplicateCheck('Slow Recipe'), { wrapper })

    // Should not be checking immediately (debounce)
    expect(result.current.isChecking).toBe(false)

    // Wait for debounce
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled()
    })

    // Should be checking while request is pending
    await waitFor(() => {
      expect(result.current.isChecking).toBe(true)
    })

    // Resolve the request
    act(() => {
      resolvePromise({
        ok: true,
        json: async () => ({ duplicates: [] }),
      } as Response)
    })

    // Should not be checking after request completes
    await waitFor(() => {
      expect(result.current.isChecking).toBe(false)
    })
  })
})