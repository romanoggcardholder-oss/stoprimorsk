import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { buildReminders } from "@/lib/reminders"
import { formatDateTime, formatMileage, fullName } from "@/lib/format"
import { getClientCabinet } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { workshopConfig } from "@/lib/config"

export const metadata = { title: "Кабинет" }

export default async function ClientHomePage() {
  if (!hasSupabaseEnv()) return null
  const data = await getClientCabinet()
  const latest = new Map<string, (typeof data.records)[number]>()
  for (const record of data.records) {
    if (!latest.has(record.vehicle_id)) latest.set(record.vehicle_id, record)
  }
  const reminders = buildReminders(
    [
      ...data.vehicles.flatMap((vehicle) => {
        const record = latest.get(vehicle.id)
        return [
          {
            id: `record-${vehicle.id}`,
            title: `${vehicle.make} ${vehicle.model}`,
            currentMileage: vehicle.currentMileage,
            nextMileage: record?.next_service_mileage ?? null,
            nextDate: record?.next_service_date ?? null,
          },
          ...data.intervals
            .filter((interval) => interval.vehicleId === vehicle.id)
            .map((interval) => ({
              id: interval.id,
              title: interval.categoryName ?? `${vehicle.make} ${vehicle.model}`,
              currentMileage: vehicle.currentMileage,
              nextMileage: interval.nextMileage,
              nextDate: interval.nextDate,
            })),
        ]
      }),
    ],
    new Date(),
  )

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm text-muted-foreground">Здравствуйте</p>
        <h1 className="font-display text-3xl">{fullName(data.user.firstName, data.user.lastName)}</h1>
      </div>
      {reminders.length > 0 ? (
        <div className="grid gap-2">
          {reminders.map((reminder) => (
            <article key={reminder.id} className={reminder.level === "due" ? "rounded-2xl bg-red-50 p-4 text-sm" : "rounded-2xl bg-secondary p-4 text-sm"}>
              <p className="font-medium">{reminder.title}</p>
              <p>{reminder.message}</p>
            </article>
          ))}
        </div>
      ) : null}
      {data.vehicles.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-white p-5 text-sm">
          Автомобилей пока нет. Их добавляет администратор. Можно отправить запрос в разделе «Авто».
        </div>
      ) : (
        data.vehicles.map((vehicle) => {
          const record = latest.get(vehicle.id)
          const works = Array.isArray(record?.service_record_items)
            ? record.service_record_items
            : record?.service_record_items
              ? [record.service_record_items]
              : []
          return (
            <article key={vehicle.id} className="rounded-3xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl">
                    {vehicle.make} {vehicle.model}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.licensePlate || "госномер не указан"} · {vehicle.year || "год не указан"}
                  </p>
                </div>
                {vehicle.isDemo ? <Badge variant="outline">Тест</Badge> : null}
              </div>
              <p className="mt-4 font-display text-4xl tracking-tight">{formatMileage(vehicle.currentMileage)}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Последнее обслуживание: {record ? formatDateTime(record.service_date) : "ещё не было"}
              </p>
              {works.length > 0 ? <p className="mt-1 text-sm">{works.map((item) => item.service_name).join(", ")}</p> : null}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button asChild>
                  <Link href={`/client/vehicles/${vehicle.id}/history`}>Открыть сервисную книжку</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/client/notes?vehicle=${vehicle.id}`}>Добавить заметку</Link>
                </Button>
              </div>
            </article>
          )
        })
      )}
      <article className="rounded-3xl bg-graphite p-5 text-white">
        <h2 className="font-display text-xl text-yellow">{workshopConfig.name}</h2>
        <a className="mt-2 block text-lg font-semibold" href={workshopConfig.phoneHref}>
          {workshopConfig.phoneDisplay}
        </a>
        <p className="mt-1 text-sm text-white/70">{workshopConfig.address}</p>
      </article>
    </div>
  )
}
