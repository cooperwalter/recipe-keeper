import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

describe('Logout Redirect', () => {
  const mockPush = vi.fn()
  const mockSignOut = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup router mock
    vi.mocked(useRouter).mockReturnValue({
      push: mockPush,
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn()
    } as any)

    // Setup Supabase mock
    vi.mocked(createClient).mockReturnValue({
      auth: {
        signOut: mockSignOut.mockResolvedValue({ error: null })
      }
    } as any)
  })

  describe('LogoutButton', () => {
    it('should redirect to home page after logout', async () => {
      render(<LogoutButton />)
      
      const logoutButton = screen.getByText('Logout')
      fireEvent.click(logoutButton)

      await waitFor(() => {
        expect(mockSignOut).toHaveBeenCalled()
        expect(mockPush).toHaveBeenCalledWith('/')
      })
    })
  })
})