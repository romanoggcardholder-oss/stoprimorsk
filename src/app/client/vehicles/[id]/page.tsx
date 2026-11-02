import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { Button } from "@/components/ui/button"
import { labelOf, fuelTypes, transmissionTypes } from "@/lib/catalog"
import { getOwnedVehicle } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { formatDateTime, formatMileage } from "@/lib/format"

export default function VehiclePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Загрузка автомобиля…</p>}>
      <VehicleContent params={params} />
    </Suspense>
  )
}

async function VehicleContent({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return null
  const { id } = await params
  const data = await getOwnedVehicle(id)
  if (!data) notFound()
  const { vehicle } = data
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">
        {vehicle.make} {vehicle.model}
      </h1>
      {vehicle.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={vehicle.imageUrl} alt={`${vehicle.make} ${vehicle.model}`} className="max-h-72 w-full rounded-3xl object-cover" />
      ) : (
        <div className="rounded-3xl bg-secondary px-4 py-10 text-center text-sm text-muted-foreground">Фотография не загружена</div>
      )}
      <p className="font-display text-4xl">{formatMileage(vehicle.currentMileage)}</p>
      <dl className="grid gap-2 rounded-3xl bg-white p-5 text-sm">
        <Row label="Год" value={vehicle.year ? String(vehicle.year) : "не указан"} />
        <Row label="VIN" value={vehicle.vin || "не указан"} />
        <Row label="Госномер" value={vehicle.licensePlate || "не указан"} />
        <Row label="Двигатель" value={vehicle.engineInfo || "не указан"} />
        <Row label="Топливо" value={labelOf(fuelTypes, vehicle.fuelType)} />
        <Row label="Трансмиссия" value={labelOf(transmissionTypes, vehicle.transmissionType)} />
        <Row label="В книжке с" value={formatDateTime(vehicle.createdAt)} />
        {vehicle.notes ? <Row label="Комментарий" value={vehicle.notes} /> : null}
      </dl>
      <Button asChild>
        <Link href={`/client/vehicles/${vehicle.id}/history`}>Открыть сервисную книжку</Link>
      </Button>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  )
}
