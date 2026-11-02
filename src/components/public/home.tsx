import Link from "next/link"
import { BookOpen, MapPin, Phone, ShieldCheck, Wrench } from "lucide-react"
import { PublicFooter } from "@/components/layout/public-footer"
import { PublicHeader } from "@/components/layout/public-header"
import { Button } from "@/components/ui/button"
import { initialServiceCatalog } from "@/lib/catalog"
import type { WorkshopInfo } from "@/lib/config"

const advantages = [
  {
    title: "История не теряется",
    text: "Дата, пробег, работы, запчасти и стоимость остаются в книжке автомобиля, а не в бумажном талоне.",
  },
  {
    title: "Видно только своё",
    text: "Клиент открывает опубликованные записи своих автомобилей. Черновики сервиса ему не показываются.",
  },
  {
    title: "Напоминание по факту",
    text: "Предупреждение появляется, только если мастер указал следующий пробег или дату. Срок сам не назначается.",
  },
]

const reasons = [
  "Запись обслуживания можно сохранить черновиком и опубликовать отдельно.",
  "В заказ-наряде видны работы, материалы, артикулы и итоговая сумма.",
  "Исправления опубликованной истории сохраняются в журнале изменений.",
  "Свои заметки клиент ведёт отдельно от официальных работ сервиса.",
]

export function HomePage({ info }: { info: WorkshopInfo }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:py-20">
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">{info.city}</p>
            <h1 className="mt-3 max-w-xl font-display text-4xl leading-[1.15] sm:text-5xl lg:text-6xl">{info.name}</h1>
            <p className="mt-4 font-display text-2xl">Ваша электронная сервисная книжка</p>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">{info.description}</p>
            <p className="mt-4 max-w-xl text-muted-foreground">
              Книжка открывается по персональной ссылке от сервиса. Регистрация и пароль клиенту не нужны.
            </p>
            <div className="mt-6">
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">Вход для сотрудников</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-3xl bg-graphite p-6 text-white shadow-xl">
            <p className="text-sm text-white/60">Электронная сервисная книжка</p>
            <p className="mt-6 font-display text-5xl text-yellow">км</p>
            <p className="mt-2 text-white/80">Пробег фиксируется в момент обслуживания и остаётся в истории автомобиля.</p>
            <div className="mt-8 grid grid-cols-3 gap-2 text-center text-xs sm:gap-3 sm:text-sm">
              <div className="min-w-0 rounded-2xl bg-white/10 p-3">
                <Wrench className="mx-auto size-5 text-yellow" />
                <p className="mt-2">Работы</p>
              </div>
              <div className="min-w-0 rounded-2xl bg-white/10 p-3">
                <BookOpen className="mx-auto size-5 text-yellow" />
                <p className="mt-2">История</p>
              </div>
              <div className="min-w-0 rounded-2xl bg-white/10 p-3">
                <ShieldCheck className="mx-auto size-5 text-yellow" />
                <p className="mt-2">Доступ</p>
              </div>
            </div>
          </div>
        </section>

        <section id="benefits" className="bg-white py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl">Зачем электронная книжка</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {advantages.map((item) => (
                <article key={item.title} className="rounded-2xl border bg-background p-5">
                  <h3 className="font-display text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="font-display text-3xl">Основные услуги</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Список можно расширять в справочнике работ: новая категория не требует изменения программы.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {initialServiceCatalog.map((service) => (
              <li key={service.slug} className="rounded-2xl border bg-white px-4 py-3 text-sm font-medium">
                {service.name}
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-secondary py-14">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="font-display text-3xl">Почему выбирают нас</h2>
            <ul className="mt-6 grid gap-3 md:grid-cols-2">
              {reasons.map((reason) => (
                <li key={reason} className="rounded-2xl bg-white px-4 py-4 text-sm">
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="contacts" className="mx-auto grid max-w-6xl gap-4 px-4 py-14 md:grid-cols-2">
          <article className="rounded-3xl bg-white p-6 shadow-sm">
            <h2 className="font-display text-3xl">{info.name}</h2>
            <a className="mt-4 flex items-center gap-2 text-2xl font-semibold" href={info.phoneHref}>
              <Phone className="size-6" />
              {info.phoneDisplay}
            </a>
            <p className="mt-3 flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-1 size-5 shrink-0" />
              {info.address}
            </p>
            <Button className="mt-6" asChild>
              <a href={info.mapUrl} target="_blank" rel="noreferrer">
                Построить маршрут
              </a>
            </Button>
          </article>
          <article className="rounded-3xl bg-graphite p-6 text-white">
            <h2 className="font-display text-2xl text-yellow">Как открыть книжку</h2>
            <ol className="mt-4 grid gap-3 text-sm text-white/80">
              <li>1. Сервис заводит карточку клиента и автомобиль.</li>
              <li>2. Вы получаете персональную ссылку и открываете её на телефоне.</li>
              <li>3. После публикации обслуживания запись появляется в книжке.</li>
            </ol>
          </article>
        </section>
      </main>
      <PublicFooter info={info} />
    </div>
  )
}
