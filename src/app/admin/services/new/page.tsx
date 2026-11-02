import { Suspense } from "react"
import { ServiceForm } from "@/components/service/service-form"
import { listCategories } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import type { ServiceFormValues } from "@/lib/service-payload"

export const metadata = { title: "Новое обслуживание" }

const initial: ServiceFormValues = {
  id: "",
  customerId: "",
  vehicleId: "",
  serviceDate: "",
  mileage: "",
  workOrderNumber: "",
  performedBy: "",
  generalComment: "",
  nextServiceMileage: "",
  nextServiceDate: "",
  masterRecommendations: "",
  items: [],
  parts: [],
}

export default function NewServicePage() {
  return (
    <Suspense fallback={<p>Готовим форму…</p>}>
      <NewService />
    </Suspense>
  )
}

async function NewService() {
  if (!hasSupabaseEnv()) return null
  const categories = await listCategories(false)
  return (
    <div className="grid gap-4">
      <h1 className="font-display text-3xl">Новое обслуживание</h1>
      <ServiceForm categories={categories} initial={initial} status="new" />
    </div>
  )
}
