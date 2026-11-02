export function SetupNotice() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <h1 className="font-display text-3xl">Кабинет ещё не подключён</h1>
      <p className="mt-3 text-muted-foreground">
        Задайте NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в файле .env.local, примените SQL-миграцию и перезапустите сервер. Пока ключей нет, вход и сервисная книжка не открываются.
      </p>
    </div>
  )
}
