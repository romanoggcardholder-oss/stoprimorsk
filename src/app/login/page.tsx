import { Suspense } from "react"
import { AuthShell } from "@/components/auth/auth-shell"
import { LoginForm } from "@/components/auth/auth-forms"
import { safeNextPath } from "@/lib/search"

export const metadata = { title: "Вход" }

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  return (
    <Suspense fallback={<AuthShell title="Вход для сотрудников" text="Клиенты открывают сервисную книжку по персональной ссылке и не создают аккаунт."><p className="text-sm text-muted-foreground">Загрузка…</p></AuthShell>}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  )
}

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  return (
    <AuthShell title="Вход для сотрудников" text="Клиенты открывают сервисную книжку по персональной ссылке и не создают аккаунт.">
      <LoginForm next={params.next ? safeNextPath(params.next, "") : undefined} />
    </AuthShell>
  )
}
