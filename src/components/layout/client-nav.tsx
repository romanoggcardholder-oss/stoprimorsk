"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Car, LayoutDashboard, NotebookPen, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

const items = [
  { href: "/client", label: "Главная", icon: LayoutDashboard, exact: true },
  { href: "/client/vehicles", label: "Авто", icon: Car },
  { href: "/client/notes", label: "Заметки", icon: NotebookPen },
  { href: "/client/profile", label: "Профиль", icon: UserRound },
]

export function ClientNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur md:static md:border-0 md:bg-transparent">
      <ul className="mx-auto flex max-w-3xl justify-around px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:justify-start md:gap-2 md:px-0">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-2 text-xs font-medium md:flex-row md:text-sm",
                  active ? "bg-secondary text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
