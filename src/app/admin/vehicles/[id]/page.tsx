import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { deleteInterval } from "@/lib/actions/workshop"
import { BookLinkPanel } from "@/components/admin/book-link-panel"
import { IntervalForm, VehicleForm, VehicleImageForm } from "@/components/admin/record-forms"
import { Button } from "@/components/ui/button"
import { listCategories, getAdminVehicle, listActiveBookLinks } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { formatDate, formatDateTime, formatMileage, formatMoney } from "@/lib/format"

export default function AdminVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Загрузка автомобиля…</p>}>
      <Content params={params} />
    </Suspense>
  )
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return null
  const { id } = await params
  const [data, categories] = await Promise.all([getAdminVehicle(id), listCategories(true)])
  if (!data) notFound()
  const links = await listActiveBookLinks(data.vehicle.ownerId)
  const vehicleLink = links?.find((link) => link.vehicleId === data.vehicle.id) ?? null
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="font-display text-3xl">{data.vehicle.make} {data.vehicle.model}</h1>
        <p className="text-sm text-muted-foreground">
          {data.vehicle.ownerName} · {data.vehicle.ownerPhone} · {formatMileage(data.vehicle.currentMileage)}
        </p>
        <p className="text-sm">В книжке с {formatDateTime(data.vehicle.createdAt)} · {data.fuelLabel} · {data.transmissionLabel}</p>
      </div>
      {data.vehicle.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={data.vehicle.imageUrl} alt="" className="max-h-72 rounded-3xl object-cover" />
      ) : <p className="text-sm text-muted-foreground">Фотографии нет.</p>}
      <section className="grid gap-2">
        <h2 className="font-medium">История</h2>
        {data.records.map((record) => (
          <Link key={record.id} href={`/admin/services/${record.id}`} className="rounded-2xl bg-white p-4 text-sm">
            {formatDateTime(record.service_date)} · {formatMileage(record.mileage)} · {formatMoney(record.grand_total)} · {record.status}
          </Link>
        ))}
      </section>
      <section className="grid gap-2">
        <h2 className="font-medium">Назначенные интервалы</h2>
        {data.intervals.map((interval) => (
          <form key={interval.id} action={deleteInterval} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4 text-sm">
            <input type="hidden" name="id" value={interval.id} />
            <span>
              {interval.categoryName || "Общий"} · {interval.nextMileage ? formatMileage(interval.nextMileage) : ""} {interval.nextDate ? formatDate(interval.nextDate) : ""}
            </span>
            <Button type="submit" variant="outline" size="sm">Удалить</Button>
          </form>
        ))}
      </section>
      <BookLinkPanel
        customerId={data.vehicle.ownerId}
        vehicleId={data.vehicle.id}
        active={vehicleLink ? { id: vehicleLink.id, createdAt: vehicleLink.createdAt } : null}
        unavailable={links === null}
      />
      <IntervalForm vehicleId={data.vehicle.id} categories={categories} />
      <VehicleImageForm vehicleId={data.vehicle.id} />
      <VehicleForm vehicle={data.vehicle} />
    </div>
  )
}
