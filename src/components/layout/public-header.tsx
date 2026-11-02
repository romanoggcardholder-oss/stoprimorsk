"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"

const links = [
  { href: "/#services", label: "Услуги" },
  { href: "/#benefits", label: "Сервисная книжка" },
  { href: "/#contacts", label: "Контакты" },
]

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="СТО НА ПРИМОРСКОМ">
          <Logo compact />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-medium md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="text-muted-foreground hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <Button variant="outline" asChild>
            <Link href="/login">Вход для сотрудников</Link>
          </Button>
        </div>
        <Button variant="outline" size="icon" className="md:hidden" onClick={() => setOpen((value) => !value)} aria-label={open ? "Закрыть меню" : "Открыть меню"}>
          {open ? <X /> : <Menu />}
        </Button>
      </div>
      {open ? (
        <div className="space-y-2 border-t px-4 py-3 md:hidden">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="block py-2 text-base" onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">Вход для сотрудников</Link>
          </Button>
        </div>
      ) : null}
    </header>
  )
}
