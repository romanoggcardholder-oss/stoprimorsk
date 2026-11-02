import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Pagination({
  page,
  pageSize,
  total,
  pathname,
  params,
}: {
  page: number
  pageSize: number
  total: number
  pathname: string
  params: Record<string, string>
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  if (pages <= 1) return null
  const href = (nextPage: number) => {
    const search = new URLSearchParams(params)
    search.set("page", String(nextPage))
    return `${pathname}?${search.toString()}`
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="outline" disabled={page <= 1} asChild={page > 1}>
        {page > 1 ? <Link href={href(page - 1)}>Назад</Link> : <span>Назад</span>}
      </Button>
      <p className="text-sm text-muted-foreground">
        {page} из {pages}
      </p>
      <Button variant="outline" disabled={page >= pages} asChild={page < pages}>
        {page < pages ? <Link href={href(page + 1)}>Дальше</Link> : <span>Дальше</span>}
      </Button>
    </div>
  )
}
