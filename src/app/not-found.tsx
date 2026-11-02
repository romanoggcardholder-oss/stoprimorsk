import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center px-4">
      <p className="text-sm text-muted-foreground">404</p>
      <h1 className="mt-2 font-display text-4xl">Страница не найдена</h1>
      <Button className="mt-6" asChild>
        <Link href="/">На главную</Link>
      </Button>
    </main>
  )
}
