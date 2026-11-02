import Link from "next/link"
import { Logo } from "@/components/brand/logo"

export function AuthShell({
  title,
  text,
  children,
}: {
  title: string
  text: string
  children: React.ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" className="mb-8">
        <Logo />
      </Link>
      <h1 className="font-display text-3xl">{title}</h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">{text}</p>
      <div className="rounded-3xl bg-white p-5 shadow-sm">{children}</div>
    </main>
  )
}
