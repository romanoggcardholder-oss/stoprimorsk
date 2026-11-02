import { SettingsForm } from "@/components/admin/record-forms"
import { getWorkshopInfo } from "@/lib/data/read"

export const metadata = { title: "Настройки" }

export default async function SettingsPage() {
  const info = await getWorkshopInfo()
  return (
    <div className="grid max-w-2xl gap-4">
      <h1 className="font-display text-3xl">Настройки автосервиса</h1>
      <p className="text-sm text-muted-foreground">
        Значения по умолчанию лежат в файле конфигурации. Сохранённые здесь телефон, адрес и описание заменяют их на сайте, когда база подключена.
      </p>
      <SettingsForm info={info} />
    </div>
  )
}
