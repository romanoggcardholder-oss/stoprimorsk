import { Suspense } from "react"
import Link from "next/link"
import { InviteForm } from "@/components/admin/record-forms"
import { Pagination } from "@/components/ui-extra/pagination"
import { QuerySearch } from "@/components/ui-extra/query-search"
import { listCustomers } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { fullName } from "@/lib/format"
import { readParam } from "@/lib/search"

export const metadata = { title: "Клиенты" }

export default function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<p>Загрузка клиентов…</p>}>
      <CustomersContent searchParams={searchParams} />
    </Suspense>
  )
}

async function CustomersContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!hasSupabaseEnv()) return null
  const params = await searchParams
  const page = await listCustomers(params)
  const query = readParam(params.q)
  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl">Клиенты</h1>
      <QuerySearch placeholder="Имя, фамилия, телефон или почта" />
      <div className="grid gap-3">
        {page.items.length === 0 ? <p className="text-sm text-muted-foreground">Никого не нашли.</p> : null}
        {page.items.map((customer) => (
          <Link key={customer.id} href={`/admin/customers/${customer.id}`} className="rounded-2xl bg-white p-4">
            <p className="font-medium">{fullName(customer.firstName, customer.lastName)} {customer.isDemo ? "· тест" : ""}</p>
            <p className="text-sm text-muted-foreground">{customer.phone} · {customer.email}</p>
          </Link>
        ))}
      </div>
      <Pagination page={page.page} pageSize={page.pageSize} total={page.total} pathname="/admin/customers" params={query ? { q: query } : {}} />
      <InviteForm />
    </div>
  )
}
