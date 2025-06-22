import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useDuplicateCheck } from './use-duplicate-check'
import { TestProviders, createTestQueryClient } from '@/lib/test-utils'

// Mock fetch
global.fetch = vi.fn()

describe('useDuplicateCheck', () => {
  const mockFetch = global.fetch as ReturnType<typeof vi.fn>
  let queryClient: ReturnType<typeof createTestQueryClient>

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestProviders queryClient={queryClient}>{children}</TestProviders>
  )

  it('calls the API and returns data on success', async () => {
    const responseData = { duplicates: [], totalChecked: 1 }
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => responseData,
    } as Response)

    const { result } = renderHook(() => useDuplicateCheck(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({ title: 'Chocolate Cake' })
    })

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/recipes/check-duplicates',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Chocolate Cake' }),
      })
    )
    await waitFor(() => {
      expect(result.current.data).toEqual(responseData)
      expect(result.current.isError).toBe(false)
    })
  })

  it('sets an error when the API response is not ok', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    } as Response)

    const { result } = renderHook(() => useDuplicateCheck(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ title: 'Bad Recipe' })).rejects.toThrow(
        'Server error'
      )
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const { result } = renderHook(() => useDuplicateCheck(), { wrapper })

    await act(async () => {
      await expect(result.current.mutateAsync({ title: 'Test Recipe' })).rejects.toThrow(
        'Network error'
      )
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBeInstanceOf(Error)
    })
  })

  it('reflects pending state while the request is in flight', async () => {
    let resolvePromise: (value: Response) => void
    const promise = new Promise<Response>((resolve) => {
      resolvePromise = resolve
    })

    mockFetch.mockReturnValueOnce(promise as unknown as Promise<Response>)

    const { result } = renderHook(() => useDuplicateCheck(), { wrapper })

    act(() => {
      result.current.mutate({ title: 'Slow Recipe' })
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(true)
    })

    act(() => {
      resolvePromise({
        ok: true,
        json: async () => ({ duplicates: [], totalChecked: 0 }),
      } as Response)
    })

    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
  })
})