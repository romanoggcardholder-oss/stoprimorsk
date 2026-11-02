import { Suspense } from "react"
import { BookNotes } from "@/components/book/book-notes"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { SetupNotice } from "@/components/layout/setup-notice"
import { ServiceTimeline } from "@/components/service/timeline"
import { fuelTypes, labelOf, transmissionTypes } from "@/lib/catalog"
import { defaultWorkshopInfo } from "@/lib/config"
import { openPublicBook } from "@/lib/data/book"
import { hashBookToken, isBookToken } from "@/lib/book-token"
import { formatMileage } from "@/lib/format"
import { buildReminders } from "@/lib/reminders"
import { hasSupabaseEnv } from "@/lib/supabase/server"

export const metadata = { title: "Сервисная книжка" }

export default function BookPage({ params }: { params: Promise<{ token: string }> }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Открываем сервисную книжку…</p>}>
      <BookContent params={params} />
    </Suspense>
  )
}

async function BookContent({ params }: { params: Promise<{ token: string }> }) {
  const info = defaultWorkshopInfo()
  const { token } = await params
  if (!hasSupabaseEnv()) {
    return (
      <div className="flex min-h-dvh flex-col">
        <PublicHeader />
        <SetupNotice />
        <PublicFooter info={info} />
      </div>
    )
  }
  if (!isBookToken(token)) return <InvalidBook info={info} />

  const book = await openPublicBook(hashBookToken(token))
  if (!book) return <InvalidBook info={info} />

  const reminders = buildReminders(
    book.vehicles.map((vehicle) => {
      const latest = book.records.find((record) => record.vehicleId === vehicle.id)
      return {
        id: vehicle.id,
        title: `${vehicle.make} ${vehicle.model}`,
        currentMileage: vehicle.currentMileage,
        nextMileage: latest?.nextServiceMileage ?? null,
        nextDate: latest?.nextServiceDate ?? null,
      }
    }),
    new Date(),
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto grid w-full max-w-3xl flex-1 gap-6 px-4 py-6">
        <div>
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Ваша электронная сервисная книжка</p>
          <h1 className="mt-2 font-display text-3xl">{book.customerName || info.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Официальные записи ведёт только автосервис. Черновики здесь не показываются.</p>
        </div>
        {reminders.length > 0 ? (
          <ul className="grid gap-2">
            {reminders.map((item) => (
              <li key={item.id} className="rounded-2xl bg-secondary px-4 py-3 text-sm">{item.title}: {item.message}</li>
            ))}
          </ul>
        ) : null}
        <section className="grid gap-3">
          {book.vehicles.length === 0 ? <p className="text-sm text-muted-foreground">Автомобиль ещё не привязан.</p> : null}
          {book.vehicles.map((vehicle) => (
            <article key={vehicle.id} className="rounded-3xl bg-white p-5">
              <h2 className="font-display text-2xl">{vehicle.make} {vehicle.model}</h2>
              <p className="mt-2 font-display text-4xl">{formatMileage(vehicle.currentMileage)}</p>
              <dl className="mt-3 grid gap-1 text-sm">
                <Row label="Год" value={vehicle.year ? String(vehicle.year) : "не указан"} />
                <Row label="Госномер" value={vehicle.licensePlate || "не указан"} />
                <Row label="VIN" value={vehicle.vin || "не указан"} />
                <Row label="Двигатель" value={vehicle.engineInfo || "не указан"} />
                <Row label="Топливо" value={labelOf(fuelTypes, vehicle.fuelType)} />
                <Row label="Трансмиссия" value={labelOf(transmissionTypes, vehicle.transmissionType)} />
              </dl>
              {vehicle.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vehicle.imageUrl} alt="" className="mt-4 max-h-64 w-full rounded-2xl object-cover" />
              ) : null}
              {vehicle.notes ? <p className="mt-3 text-sm text-muted-foreground">{vehicle.notes}</p> : null}
            </article>
          ))}
        </section>
        <section className="grid gap-3">
          <h2 className="font-display text-2xl">История обслуживания</h2>
          <ServiceTimeline records={book.records} />
        </section>
        <BookNotes
          token={token}
          notes={book.notes}
          vehicles={book.vehicles.map((vehicle) => ({ id: vehicle.id, label: `${vehicle.make} ${vehicle.model}` }))}
        />
      </main>
      <PublicFooter info={info} />
    </div>
  )
}

function InvalidBook({ info }: { info: ReturnType<typeof defaultWorkshopInfo> }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto max-w-lg flex-1 px-4 py-16">
        <h1 className="font-display text-3xl">Ссылка недействительна</h1>
        <p className="mt-3 text-muted-foreground">
          Адрес книжки отозван или введён с ошибкой. Позвоните в {info.name}: {info.phoneDisplay}.
        </p>
      </main>
      <PublicFooter info={info} />
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
