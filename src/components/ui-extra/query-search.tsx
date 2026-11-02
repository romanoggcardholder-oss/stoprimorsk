"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"

export function QuerySearch({ placeholder }: { placeholder: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const paramsString = params.toString()
  const [value, setValue] = useState(params.get("q") ?? "")

  useEffect(() => {
    const current = new URLSearchParams(paramsString).get("q") ?? ""
    if (current === value.trim()) return
    const timeout = window.setTimeout(() => {
      const next = new URLSearchParams(paramsString)
      const trimmed = value.trim()
      if (trimmed) next.set("q", trimmed)
      else next.delete("q")
      next.delete("page")
      const query = next.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    }, 350)
    return () => window.clearTimeout(timeout)
  }, [pathname, paramsString, router, value])

  return (
    <Input
      value={value}
      onChange={(event) => setValue(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
    />
  )
}
