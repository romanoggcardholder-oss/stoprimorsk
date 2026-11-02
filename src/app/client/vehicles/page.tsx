import Link from "next/link"
import { ClaimForm } from "@/components/client/claim-form"
import { Badge } from "@/components/ui/badge"
import { getClientCabinet } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { formatMileage } from "@/lib/format"

export const metadata = { title: "Мои автомобили" }

export default async function VehiclesPage() {
  if (!hasSupabaseEnv()) return null
  const data = await getClientCabinet()
  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl">Мои автомобили</h1>
      {data.vehicles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Пока нет подтверждённых автомобилей.</p>
      ) : (
        data.vehicles.map((vehicle) => (
          <Link key={vehicle.id} href={`/client/vehicles/${vehicle.id}`} className="rounded-3xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl">
                {vehicle.make} {vehicle.model}
              </h2>
              {vehicle.isDemo ? <Badge variant="outline">Тест</Badge> : null}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {vehicle.licensePlate || "без номера"} · VIN {vehicle.vin || "не указан"}
            </p>
            <p className="mt-3 font-display text-3xl">{formatMileage(vehicle.currentMileage)}</p>
          </Link>
        ))
      )}
      <ClaimForm />
    </div>
  )
}
