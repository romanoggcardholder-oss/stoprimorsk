/**
 * Публичные реквизиты автосервиса.
 * Эти значения — источник по умолчанию для сайта и кабинетов.
 * Администратор может переопределить телефон, адрес и описание
 * в разделе «Настройки»: тогда интерфейс показывает сохранённые значения.
 */
export const workshopConfig = {
  name: "СТО НА ПРИМОРСКОМ",
  shortName: "СТО Приморский",
  description:
    "Электронная сервисная книжка и обслуживание автомобилей в Новороссийске. Меняем масла, фильтры, ремни ГРМ и тормозные компоненты и сохраняем историю работ.",
  phoneDisplay: "+7 989 768 07 07",
  phoneHref: "tel:+79897680707",
  address: "г. Новороссийск, ул. Видова, 222, Т/Ц Приморский.",
  city: "Новороссийск",
  mapUrl:
    "https://yandex.ru/maps/?text=" +
    encodeURIComponent("г. Новороссийск, ул. Видова, 222, Т/Ц Приморский"),
  timeZone: "Europe/Moscow",
  reminderMileageKm: 1000,
  reminderDays: 14,
} as const

export type WorkshopInfo = {
  name: string
  shortName: string
  description: string
  phoneDisplay: string
  phoneHref: string
  address: string
  city: string
  mapUrl: string
  about: string
}

export function defaultWorkshopInfo(): WorkshopInfo {
  return {
    name: workshopConfig.name,
    shortName: workshopConfig.shortName,
    description: workshopConfig.description,
    phoneDisplay: workshopConfig.phoneDisplay,
    phoneHref: workshopConfig.phoneHref,
    address: workshopConfig.address,
    city: workshopConfig.city,
    mapUrl: workshopConfig.mapUrl,
    about: workshopConfig.description,
  }
}

export async function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
  if (configured && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configured)) return configured
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() || process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
  try {
    const { headers } = await import("next/headers")
    const headerList = await headers()
    const host = (headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "").split(",")[0]?.trim()
    if (host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host)) {
      const proto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https"
      return `${proto}://${host}`
    }
  } catch {
    // Вне запроса остаётся локальный адрес.
  }
  return configured || "http://localhost:3000"
}
