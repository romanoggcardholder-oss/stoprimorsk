"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { Menu } from "lucide-react"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export const adminLinks = [
  { href: "/admin", label: "Главная", exact: true },
  { href: "/admin/customers", label: "Клиенты" },
  { href: "/admin/vehicles", label: "Автомобили" },
  { href: "/admin/services", label: "История обслуживания" },
  { href: "/admin/services/new", label: "Создать обслуживание" },
  { href: "/admin/categories", label: "Справочник работ" },
  { href: "/admin/settings", label: "Настройки" },
]

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const links = (
    <ul className="grid gap-1">
      {adminLinks.map((link) => {
        const active =
          link.href === "/admin/services"
            ? pathname === "/admin/services" || (pathname.startsWith("/admin/services/") && !pathname.startsWith("/admin/services/new"))
            : link.exact
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "block rounded-xl px-3 py-2.5 text-sm",
                active ? "bg-yellow font-semibold text-graphite" : "text-white/80 hover:bg-white/10",
              )}
            >
              {link.label}
            </Link>
          </li>
        )
      })}
    </ul>
  )
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-graphite p-4 text-white lg:flex">
        <Link href="/admin" className="px-2 py-2">
          <Logo inverted />
        </Link>
        <p className="mt-6 px-3 text-xs text-white/50">Администратор</p>
        <p className="px-3 pb-4 font-medium">{name}</p>
        {links}
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-white px-4 py-3 lg:hidden">
        <Link href="/admin">
          <Logo compact />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Открыть меню">
              <Menu />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="bg-graphite text-white">
            <SheetTitle className="text-white">Разделы</SheetTitle>
            <div className="mt-6">{links}</div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  )
}
