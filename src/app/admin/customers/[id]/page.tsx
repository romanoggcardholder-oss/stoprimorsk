import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { BookLinkPanel } from "@/components/admin/book-link-panel"
import { CustomerEditForm } from "@/components/admin/record-forms"
import { Badge } from "@/components/ui/badge"
import { getCustomerCard, listActiveBookLinks } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { formatDateTime, formatMileage, formatMoney, fullName } from "@/lib/format"

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Загрузка клиента…</p>}>
      <CustomerContent params={params} />
    </Suspense>
  )
}

async function CustomerContent({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return null
  const { id } = await params
  const [data, links] = await Promise.all([getCustomerCard(id), listActiveBookLinks(id)])
  if (!data) notFound()
  const customerLink = links?.find((link) => link.vehicleId === null) ?? null
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-3xl">{fullName(data.profile.firstName, data.profile.lastName)}</h1>
        <p className="text-sm text-muted-foreground">{data.profile.email} · {data.profile.phone}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">ID для привязки автомобиля: {data.profile.id}</p>
      </div>
      <CustomerEditForm profile={data.profile} />
      <BookLinkPanel
        customerId={data.profile.id}
        active={customerLink ? { id: customerLink.id, createdAt: customerLink.createdAt } : null}
        unavailable={links === null}
      />
      <section className="grid gap-3">
        <h2 className="font-medium">Автомобили</h2>
        {data.vehicles.length === 0 ? <p className="text-sm text-muted-foreground">Автомобилей нет.</p> : null}
        {data.vehicles.map((vehicle) => (
          <Link key={vehicle.id} href={`/admin/vehicles/${vehicle.id}`} className="rounded-2xl bg-white p-4">
            {vehicle.make} {vehicle.model} · {vehicle.licensePlate || "без номера"} · {formatMileage(vehicle.currentMileage)}
          </Link>
        ))}
        <Link className="text-sm underline" href={`/admin/vehicles?owner=${data.profile.id}`}>Добавить автомобиль</Link>
      </section>
      <section className="grid gap-3">
        <h2 className="font-medium">История обслуживания</h2>
        {data.records.map((record) => (
          <Link key={record.id} href={`/admin/services/${record.id}`} className="rounded-2xl bg-white p-4 text-sm">
            {formatDateTime(record.service_date)} · {record.make} {record.model} · {formatMoney(record.grand_total)}
            <Badge className="ml-2" variant="secondary">{record.status}</Badge>
          </Link>
        ))}
      </section>
      <section className="grid gap-3">
        <h2 className="font-medium">Заметки клиента</h2>
        <p className="text-sm text-muted-foreground">Это личные заметки. Они не являются записями СТО.</p>
        {data.notes.length === 0 ? <p className="text-sm">Заметок нет.</p> : null}
        {data.notes.map((note) => (
          <article key={note.id} className="rounded-2xl bg-white p-4 text-sm">
            <p className="font-medium">{note.title}</p>
            <p>{note.content}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
