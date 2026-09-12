import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

type PaginationProps = {
  page: number
  totalPages: number
  onPage: (page: number) => void
}

/**
 * Offset paging, one page at a time. Both lists page the same way, so this
 * takes a callback rather than rendering `Link`s: which search param a page
 * number lands in is the route's business, not this control's.
 */
const Pagination = ({ page, totalPages, onPage }: PaginationProps) => {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center gap-4"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        <ChevronLeft />
        Previous
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Next
        <ChevronRight />
      </Button>
    </nav>
  )
}

export { Pagination }
