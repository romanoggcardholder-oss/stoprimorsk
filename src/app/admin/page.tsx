import Link from "next/link"
import { MonthlyChart } from "@/components/admin/monthly-chart"
import { Button } from "@/components/ui/button"
import { workshopConfig } from "@/lib/config"
import { getAdminDashboard } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { formatDateTime, formatMoney, fullName } from "@/lib/format"

export const metadata = { title: "Панель" }

const actions = [
  ["Добавить клиента", "/admin/customers"],
  ["Добавить автомобиль", "/admin/vehicles"],
  ["Создать обслуживание", "/admin/services/new"],
  ["История обслуживания", "/admin/services"],
  ["Клиенты", "/admin/customers"],
  ["Автомобили", "/admin/vehicles"],
  ["Справочник работ", "/admin/categories"],
  ["Настройки", "/admin/settings"],
] as const

export default async function AdminHomePage() {
  if (!hasSupabaseEnv()) return null
  const data = await getAdminDashboard()
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date()
    date.setDate(1)
    date.setMonth(date.getMonth() - (5 - index))
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const label = new Intl.DateTimeFormat("ru-RU", { month: "short", timeZone: workshopConfig.timeZone }).format(date)
    return { key, month: label, count: 0 }
  })
  for (const row of data.chartRows) {
    const date = new Date(row.service_date)
    const key = `${date.getFullYear()}-${date.getMonth()}`
    const bucket = months.find((item) => item.key === key)
    if (bucket) bucket.count += 1
  }

  const cards = [
    ["Клиенты", data.customers],
    ["Автомобили", data.vehicles],
    ["Записи обслуживания", data.records],
    ["В этом месяце", data.monthRecords],
  ]

  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl">Панель сервиса</h1>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value]) => (
          <article key={label} className="rounded-3xl bg-white p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-display text-4xl">{value}</p>
          </article>
        ))}
      </div>
      <section className="rounded-3xl bg-white p-5">
        <h2 className="font-display text-xl">Обслуживания по месяцам</h2>
        <div className="mt-4">
          <MonthlyChart data={months.map(({ month, count }) => ({ month, count }))} />
        </div>
      </section>
      <div className="flex flex-wrap gap-2">
        {actions.map(([label, href]) => (
          <Button key={label} variant={label.startsWith("Создать") ? "default" : "outline"} asChild>
            <Link href={href}>{label}</Link>
          </Button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl bg-white p-5">
          <h2 className="font-medium">Последние записи</h2>
          <ul className="mt-3 grid gap-3 text-sm">
            {data.recentRecords.length === 0 ? <li className="text-muted-foreground">Записей пока нет.</li> : null}
            {data.recentRecords.map((record) => (
              <li key={record.id}>
                <Link href={`/admin/services/${record.id}`} className="font-medium underline">
                  {record.make} {record.model}
                </Link>
                <p className="text-muted-foreground">
                  {formatDateTime(record.service_date)} · {record.last_name} {record.first_name} · {formatMoney(record.grand_total)} · {record.status}
                </p>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl bg-white p-5">
          <h2 className="font-medium">Новые клиенты</h2>
          <ul className="mt-3 grid gap-3 text-sm">
            {data.recentCustomers.length === 0 ? <li className="text-muted-foreground">Клиентов пока нет.</li> : null}
            {data.recentCustomers.map((customer) => (
              <li key={customer.id}>
                <Link href={`/admin/customers/${customer.id}`} className="font-medium underline">
                  {fullName(customer.first_name, customer.last_name)}
                </Link>
                <p className="text-muted-foreground">{customer.phone || customer.email}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
