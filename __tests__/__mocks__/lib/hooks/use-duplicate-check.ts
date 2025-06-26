import { vi } from 'vitest'

export const useDuplicateCheck = vi.fn(() => ({
  mutate: vi.fn(),
  mutateAsync: vi.fn().mockResolvedValue({ duplicates: [] }),
  isPending: false,
  isError: false,
  error: null,
  data: null,
  reset: vi.fn(),
}))