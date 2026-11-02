import { Suspense } from "react"
import { connection } from "next/server"
import { ClientNav } from "@/components/layout/client-nav"
import { SetupNotice } from "@/components/layout/setup-notice"
import { Logo } from "@/components/brand/logo"
import { requireClient } from "@/lib/auth/session"
import { hasSupabaseEnv } from "@/lib/supabase/server"

export const instant = false

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6 text-sm text-muted-foreground">Открываем кабинет…</p>}>
      <ClientFrame>{children}</ClientFrame>
    </Suspense>
  )
}

async function ClientFrame({ children }: { children: React.ReactNode }) {
  await connection()
  if (!hasSupabaseEnv()) {
    return (
      <>
        <SetupNotice />
        {children}
      </>
    )
  }
  await requireClient()
  return (
    <div className="min-h-dvh md:mx-auto md:grid md:max-w-5xl md:grid-cols-[220px_1fr]">
      <div className="hidden px-4 py-6 md:block">
        <Logo />
        <div className="mt-6">
          <ClientNav />
        </div>
      </div>
      <div className="safe-bottom px-4 py-4 md:py-6">{children}</div>
      <div className="md:hidden">
        <ClientNav />
      </div>
    </div>
  )
}
