import { Suspense } from "react"
import { connection } from "next/server"
import { logout } from "@/lib/actions/auth"
import { AdminNav } from "@/components/layout/admin-nav"
import { SetupNotice } from "@/components/layout/setup-notice"
import { Button } from "@/components/ui/button"
import { requireAdmin } from "@/lib/auth/session"
import { fullName } from "@/lib/format"
import { hasSupabaseEnv } from "@/lib/supabase/server"

export const instant = false

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Открываем панель…</p>}>
      <AdminFrame>{children}</AdminFrame>
    </Suspense>
  )
}

async function AdminFrame({ children }: { children: React.ReactNode }) {
  await connection()
  if (!hasSupabaseEnv()) {
    return (
      <>
        <SetupNotice />
        {children}
      </>
    )
  }
  const { user } = await requireAdmin()
  return (
    <div className="min-h-dvh lg:flex">
      <AdminNav name={fullName(user.firstName, user.lastName)} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto flex max-w-6xl justify-end px-4 pt-4">
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              Выйти
            </Button>
          </form>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-4">{children}</div>
      </div>
    </div>
  )
}
