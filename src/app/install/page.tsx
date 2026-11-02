import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { defaultWorkshopInfo } from "@/lib/config"

export const metadata = { title: "Установка приложения" }

export default function InstallPage() {
  const info = defaultWorkshopInfo()
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
        <h1 className="font-display text-4xl">Установить приложение</h1>
        <p className="mt-3 text-muted-foreground">
          Сервисная книжка открывается как сайт и может стоять на домашнем экране. Установка не требует магазина приложений.
        </p>
        <div className="mt-6 grid gap-4">
          <article className="rounded-2xl bg-white p-5">
            <h2 className="font-display text-xl">Android</h2>
            <p className="mt-2 text-sm">Откройте сайт в Chrome, меню браузера, пункт «Установить приложение» или «Добавить на главный экран».</p>
          </article>
          <article className="rounded-2xl bg-white p-5">
            <h2 className="font-display text-xl">iPhone</h2>
            <p className="mt-2 text-sm">Откройте сайт в Safari, нажмите «Поделиться», затем «На экран Домой».</p>
          </article>
          <article className="rounded-2xl bg-white p-5">
            <h2 className="font-display text-xl">Компьютер</h2>
            <p className="mt-2 text-sm">В Chrome или Edge у адресной строки может появиться значок установки. Сайт при этом продолжает работать и в обычной вкладке.</p>
          </article>
        </div>
      </main>
      <PublicFooter info={info} />
    </div>
  )
}
