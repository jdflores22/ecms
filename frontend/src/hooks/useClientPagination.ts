import { useEffect, useMemo, useState } from 'react'

export const LIST_PAGE_SIZE = 10

export function useClientPagination<T>(items: T[], resetKey = '') {
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [resetKey])

  const total = items.length
  const maxPage = Math.max(0, Math.ceil(total / LIST_PAGE_SIZE) - 1)
  const safePage = Math.min(page, maxPage)

  const paginatedItems = useMemo(() => {
    const start = safePage * LIST_PAGE_SIZE
    return items.slice(start, start + LIST_PAGE_SIZE)
  }, [items, safePage])

  return {
    page: safePage,
    setPage,
    total,
    paginatedItems,
    showPagination: total > LIST_PAGE_SIZE,
  }
}
