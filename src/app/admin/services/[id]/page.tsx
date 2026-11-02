import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { AttachmentForm, CancelRecordForm, DeleteDraftForm } from "@/components/admin/record-forms"
import { ServiceForm } from "@/components/service/service-form"
import { Button } from "@/components/ui/button"
import { getServiceRecord, listAudit, listCategories } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { toDateTimeLocalValue } from "@/lib/format"
import { formFromRecord } from "@/lib/service-payload"

const actionText: Record<string, string> = {
  "service_record.created": "Создал запись",
  "service_record.updated": "Изменил запись",
  "service_record.deleted": "Удалил черновик",
  "service_record.items_created": "Добавил работы и материалы",
  "service_record.items_replaced": "Обновил работы и материалы",
}

export default function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Открываем запись…</p>}>
      <EditService params={params} />
    </Suspense>
  )
}

async function EditService({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return null
  const { id } = await params
  const [record, categories, audit] = await Promise.all([
    getServiceRecord(id),
    listCategories(true),
    listAudit(id),
  ])
  if (!record) notFound()
  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Обслуживание</h1>
        <Button variant="outline" asChild>
          <Link href={`/admin/services/${record.id}/preview`}>Предпросмотр</Link>
        </Button>
      </div>
      {record.status !== "cancelled" ? (
        <ServiceForm
          categories={categories.filter((category) => category.isActive || category.id === record.items.find((item) => item.categoryId)?.categoryId)}
          initial={formFromRecord(record, toDateTimeLocalValue(record.serviceDate))}
          status={record.status}
          vehicleLabel={`${record.vehicleLabel ?? "Автомобиль"} · ${record.customerName ?? ""}`}
          lastMileage={record.mileage}
        />
      ) : (
        <p className="rounded-2xl bg-red-50 p-4 text-sm">Запись отменена. Причина: {record.cancellationReason}</p>
      )}
      {record.status !== "cancelled" ? <AttachmentForm recordId={record.id} /> : null}
      {record.status !== "cancelled" ? <CancelRecordForm recordId={record.id} /> : null}
      {record.status === "draft" ? <DeleteDraftForm recordId={record.id} /> : null}
      <section className="rounded-3xl bg-white p-5">
        <h2 className="font-medium">Журнал изменений</h2>
        <ul className="mt-3 grid gap-2 text-sm">
          {audit.map((entry) => (
            <li key={entry.id}>
              {actionText[entry.action] ?? entry.action} · {entry.actorName}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
