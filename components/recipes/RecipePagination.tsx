'use client'

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'

interface RecipePaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function RecipePagination({ currentPage, totalPages, onPageChange }: RecipePaginationProps) {
  if (totalPages <= 1) return null

  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const showEllipsisStart = currentPage > 3
    const showEllipsisEnd = currentPage < totalPages - 2

    if (totalPages <= 7) {
      // Show all pages if total is 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Always show first page
      pages.push(1)

      if (showEllipsisStart) {
        pages.push('...')
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i)
        }
      }

      if (showEllipsisEnd) {
        pages.push('...')
      }

      // Always show last page
      if (!pages.includes(totalPages)) {
        pages.push(totalPages)
      }
    }

    return pages
  }

  const handlePageClick = (page: number) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page)
    }
  }

  return (
    <Pagination className="mt-8">
      <PaginationContent>
        <PaginationItem>
          {currentPage > 1 ? (
            <PaginationPrevious
              href="#"
              onClick={handlePageClick(currentPage - 1)}
              className="cursor-pointer"
            />
          ) : (
            <PaginationPrevious
              href="#"
              onClick={(e) => e.preventDefault()}
              className="pointer-events-none opacity-50"
            />
          )}
        </PaginationItem>

        {getPageNumbers().map((page, index) => (
          <PaginationItem key={index}>
            {page === '...' ? (
              <PaginationEllipsis />
            ) : (
              <PaginationLink
                href="#"
                onClick={handlePageClick(page as number)}
                isActive={currentPage === page}
                className="cursor-pointer"
              >
                {page}
              </PaginationLink>
            )}
          </PaginationItem>
        ))}

        <PaginationItem>
          {currentPage < totalPages ? (
            <PaginationNext
              href="#"
              onClick={handlePageClick(currentPage + 1)}
              className="cursor-pointer"
            />
          ) : (
            <PaginationNext
              href="#"
              onClick={(e) => e.preventDefault()}
              className="pointer-events-none opacity-50"
            />
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}