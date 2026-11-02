import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ServiceTimeline } from "@/components/service/timeline"
import { listPublishedHistory } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"

export default function HistoryPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Собираем историю…</p>}>
      <HistoryContent params={params} />
    </Suspense>
  )
}

async function HistoryContent({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return null
  const { id } = await params
  const data = await listPublishedHistory(id)
  if (!data) notFound()
  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display text-3xl">Сервисная книжка</h1>
        <p className="text-sm text-muted-foreground">
          {data.vehicle.make} {data.vehicle.model}
          {data.vehicle.licensePlate ? ` · ${data.vehicle.licensePlate}` : ""}
        </p>
      </div>
      <ServiceTimeline records={data.records} />
    </div>
  )
}
