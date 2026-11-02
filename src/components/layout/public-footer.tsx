import Link from "next/link"
import { Logo } from "@/components/brand/logo"
import type { WorkshopInfo } from "@/lib/config"

export function PublicFooter({ info }: { info: WorkshopInfo }) {
  return (
    <footer className="bg-graphite text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo inverted />
          <p className="mt-4 max-w-sm text-sm text-white/75">{info.about}</p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-yellow">Контакты</p>
          <a className="mt-3 block text-lg font-semibold" href={info.phoneHref}>
            {info.phoneDisplay}
          </a>
          <p className="mt-2 text-white/75">{info.address}</p>
        </div>
        <div className="text-sm">
          <p className="font-medium text-yellow">Документы</p>
          <Link className="mt-3 block text-white/80 hover:text-white" href="/privacy">
            Политика обработки персональных данных
          </Link>
          <Link className="mt-2 block text-white/80 hover:text-white" href="/install">
            Установить приложение
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/60">
        {info.name}. История обслуживания хранится в электронной сервисной книжке.
      </div>
    </footer>
  )
}
