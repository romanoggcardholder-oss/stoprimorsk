import Link from "next/link"
import { Suspense } from "react"
import { controlClass } from "@/components/ui-extra/field"
import { Pagination } from "@/components/ui-extra/pagination"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listCategories, listServiceDirectory } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { formatDateTime, formatMileage, formatMoney } from "@/lib/format"
import { readParam } from "@/lib/search"

export const metadata = { title: "История обслуживания" }

export default function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<p>Загрузка истории…</p>}>
      <ServicesContent searchParams={searchParams} />
    </Suspense>
  )
}

async function ServicesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!hasSupabaseEnv()) return null
  const params = await searchParams
  const [page, categories] = await Promise.all([listServiceDirectory(params), listCategories(true)])
  const kept = {
    q: readParam(params.q),
    status: readParam(params.status),
    from: readParam(params.from),
    to: readParam(params.to),
    performer: readParam(params.performer),
    category: readParam(params.category),
  }
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl">История обслуживания</h1>
        <Button asChild><Link href="/admin/services/new">Создать</Link></Button>
      </div>
      <form className="grid gap-3 rounded-3xl bg-white p-4 md:grid-cols-3" action="/admin/services">
        <Input name="q" defaultValue={kept.q} placeholder="Клиент, номер, VIN, госномер" aria-label="Поиск" />
        <select name="status" className={controlClass} defaultValue={kept.status}>
          <option value="">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="published">Опубликовано</option>
          <option value="cancelled">Отменено</option>
        </select>
        <select name="category" className={controlClass} defaultValue={kept.category}>
          <option value="">Все работы</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <Input name="from" type="date" defaultValue={kept.from} aria-label="Дата с" />
        <Input name="to" type="date" defaultValue={kept.to} aria-label="Дата по" />
        <Input name="performer" defaultValue={kept.performer} placeholder="Мастер" aria-label="Мастер" />
        <Button type="submit">Найти</Button>
      </form>
      <div className="grid gap-3">
        {page.items.length === 0 ? <p className="text-sm text-muted-foreground">Записей не найдено.</p> : null}
        {page.items.map((record) => (
          <Link key={record.id} href={`/admin/services/${record.id}`} className="rounded-2xl bg-white p-4 text-sm">
            <p className="font-medium">{record.make} {record.model} · {record.license_plate || "без номера"}</p>
            <p className="text-muted-foreground">
              {record.last_name} {record.first_name} · {formatDateTime(record.service_date)} · {formatMileage(record.mileage)} · {formatMoney(record.grand_total)} · {record.status}
              {record.performed_by ? ` · ${record.performed_by}` : ""}
            </p>
          </Link>
        ))}
      </div>
      <Pagination
        page={page.page}
        pageSize={page.pageSize}
        total={page.total}
        pathname="/admin/services"
        params={Object.fromEntries(Object.entries(kept).filter(([, value]) => value))}
      />
    </div>
  )
}
