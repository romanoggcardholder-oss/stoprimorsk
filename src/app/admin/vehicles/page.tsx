import Link from "next/link"
import { Suspense } from "react"
import { reviewClaim } from "@/lib/actions/workshop"
import { VehicleForm } from "@/components/admin/record-forms"
import { Pagination } from "@/components/ui-extra/pagination"
import { QuerySearch } from "@/components/ui-extra/query-search"
import { Button } from "@/components/ui/button"
import { listPendingClaims, listVehicleDirectory } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { formatMileage } from "@/lib/format"
import { readParam } from "@/lib/search"

export const metadata = { title: "Автомобили" }

export default function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<p>Загрузка автомобилей…</p>}>
      <VehiclesContent searchParams={searchParams} />
    </Suspense>
  )
}

async function VehiclesContent({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!hasSupabaseEnv()) return null
  const params = await searchParams
  const [page, claims] = await Promise.all([listVehicleDirectory(params), listPendingClaims()])
  const query = readParam(params.q)
  const owner = readParam(params.owner)
  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl">Автомобили</h1>
      <QuerySearch placeholder="Госномер, VIN, марка, модель, владелец или телефон" />
      {claims.length > 0 ? (
        <section className="grid gap-3">
          <h2 className="font-medium">Запросы клиентов</h2>
          {claims.map((claim) => (
            <article key={claim.id} className="rounded-2xl bg-secondary p-4 text-sm">
              <p className="font-medium">{claim.make} {claim.model} · {claim.userName}</p>
              <p>{claim.licensePlate || "без номера"} · VIN {claim.vin || "не указан"}</p>
              {claim.comment ? <p>{claim.comment}</p> : null}
              <div className="mt-3 flex gap-2">
                <form action={reviewClaim}>
                  <input type="hidden" name="id" value={claim.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <Button type="submit" size="sm">Подтвердить</Button>
                </form>
                <form action={reviewClaim}>
                  <input type="hidden" name="id" value={claim.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <Button type="submit" size="sm" variant="outline">Отклонить</Button>
                </form>
              </div>
            </article>
          ))}
        </section>
      ) : null}
      <div className="grid gap-3">
        {page.items.map((vehicle) => (
          <Link key={vehicle.id} href={`/admin/vehicles/${vehicle.id}`} className="rounded-2xl bg-white p-4">
            <p className="font-medium">{vehicle.make} {vehicle.model} {vehicle.isDemo ? "· тест" : ""}</p>
            <p className="text-sm text-muted-foreground">
              {vehicle.licensePlate || "без номера"} · {vehicle.vin || "VIN не указан"} · {vehicle.ownerName} · {formatMileage(vehicle.currentMileage)}
            </p>
          </Link>
        ))}
      </div>
      <Pagination page={page.page} pageSize={page.pageSize} total={page.total} pathname="/admin/vehicles" params={query ? { q: query } : {}} />
      <VehicleForm ownerId={owner || undefined} />
    </div>
  )
}
