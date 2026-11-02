import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { defaultWorkshopInfo } from "@/lib/config"

export const metadata = { title: "Политика обработки персональных данных" }

export default function PrivacyPage() {
  const info = defaultWorkshopInfo()
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
        <h1 className="font-display text-4xl">Политика обработки персональных данных</h1>
        <div className="mt-6 grid gap-4 text-sm leading-6 text-foreground">
          <p>
            Оператор: {info.name}, {info.address}, телефон {info.phoneDisplay}. Политика описывает, какие данные
            обрабатывает электронная сервисная книжка и зачем.
          </p>
          <p>
            Обрабатываются имя, фамилия, телефон, электронная почта, сведения об автомобиле (марка, модель, год, VIN,
            госномер, пробег) и история обслуживания. Данные нужны, чтобы вести сервисную книжку и связываться с
            клиентом по его автомобилю.
          </p>
          <p>
            Карточку клиента создаёт автосервис. Клиент открывает книжку по персональной ссылке и не задаёт пароль.
            Вход с паролем нужен сотрудникам. Записи обслуживания хранятся в PostgreSQL проекта Supabase.
          </p>
          <p>
            Клиент видит только свои автомобили, собственные заметки и опубликованные записи обслуживания. Черновики
            остаются у автосервиса. Фотографии и документы доступны по временной ссылке и только участникам записи.
          </p>
          <p>
            Чтобы уточнить или удалить данные, позвоните в сервис по телефону {info.phoneDisplay}. Восстановление
            пароля сотрудника отправляет Supabase, если в проекте настроен SMTP. Приложение само письма не имитирует.
          </p>
        </div>
      </main>
      <PublicFooter info={info} />
    </div>
  )
}
