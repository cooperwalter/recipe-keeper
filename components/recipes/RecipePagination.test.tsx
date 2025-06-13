import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RecipePagination } from './RecipePagination'

describe('RecipePagination', () => {
  it('renders nothing when totalPages is 1 or less', () => {
    const { container } = render(
      <RecipePagination currentPage={1} totalPages={1} onPageChange={vi.fn()} />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('renders pagination controls when totalPages > 1', () => {
    render(<RecipePagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    
    expect(screen.getByText('Previous')).toBeInTheDocument()
    expect(screen.getByText('Next')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('disables previous button on first page', () => {
    render(<RecipePagination currentPage={1} totalPages={5} onPageChange={vi.fn()} />)
    
    const previousButton = screen.getByText('Previous').closest('a')
    expect(previousButton).toHaveClass('pointer-events-none', 'opacity-50')
  })

  it('disables next button on last page', () => {
    render(<RecipePagination currentPage={5} totalPages={5} onPageChange={vi.fn()} />)
    
    const nextButton = screen.getByText('Next').closest('a')
    expect(nextButton).toHaveClass('pointer-events-none', 'opacity-50')
  })

  it('calls onPageChange when clicking page number', () => {
    const onPageChange = vi.fn()
    render(<RecipePagination currentPage={1} totalPages={5} onPageChange={onPageChange} />)
    
    fireEvent.click(screen.getByText('3'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange when clicking previous', () => {
    const onPageChange = vi.fn()
    render(<RecipePagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
    
    fireEvent.click(screen.getByText('Previous'))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('calls onPageChange when clicking next', () => {
    const onPageChange = vi.fn()
    render(<RecipePagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
    
    fireEvent.click(screen.getByText('Next'))
    expect(onPageChange).toHaveBeenCalledWith(4)
  })

  it('shows current page as active', () => {
    render(<RecipePagination currentPage={3} totalPages={5} onPageChange={vi.fn()} />)
    
    const activePage = screen.getByText('3').closest('a')
    expect(activePage).toHaveAttribute('aria-current', 'page')
  })

  it('shows all pages when totalPages <= 7', () => {
    render(<RecipePagination currentPage={1} totalPages={7} onPageChange={vi.fn()} />)
    
    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(i.toString())).toBeInTheDocument()
    }
    
    expect(screen.queryByText('...')).not.toBeInTheDocument()
  })

  it('shows ellipsis for many pages', () => {
    render(<RecipePagination currentPage={5} totalPages={10} onPageChange={vi.fn()} />)
    
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getAllByText('More pages')).toHaveLength(2) // SR text for ellipsis
  })

  it('prevents default on page clicks', () => {
    const onPageChange = vi.fn()
    render(<RecipePagination currentPage={1} totalPages={5} onPageChange={onPageChange} />)
    
    const pageLink = screen.getByText('2').closest('a')!
    const event = new MouseEvent('click', { bubbles: true, cancelable: true })
    
    fireEvent(pageLink, event)
    
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not call onPageChange for current page', () => {
    const onPageChange = vi.fn()
    render(<RecipePagination currentPage={3} totalPages={5} onPageChange={onPageChange} />)
    
    fireEvent.click(screen.getByText('3'))
    expect(onPageChange).not.toHaveBeenCalled()
  })
})