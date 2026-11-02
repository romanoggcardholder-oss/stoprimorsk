import "server-only"

import { redirect } from "next/navigation"
import type { AppRole } from "@/lib/access"
import { roleHome } from "@/lib/access"
import { createClient } from "@/lib/supabase/server"

export type CurrentUser = {
  id: string
  email: string | null
  firstName: string
  lastName: string
  phone: string | null
  role: AppRole
  isDemo: boolean
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, email, role, is_demo")
    .eq("id", data.user.id)
    .maybeSingle()

  if (!profile || (profile.role !== "client" && profile.role !== "admin")) return null

  return {
    id: profile.id,
    email: profile.email ?? data.user.email ?? null,
    firstName: profile.first_name,
    lastName: profile.last_name,
    phone: profile.phone,
    role: profile.role,
    isDemo: profile.is_demo,
  }
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireClient() {
  const user = await requireUser()
  if (user.role !== "client") redirect(roleHome(user.role))
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== "admin") redirect(roleHome(user.role))
  const supabase = await createClient()
  return { user, supabase }
}
