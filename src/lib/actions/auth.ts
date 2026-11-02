"use server"

import { redirect } from "next/navigation"
import { roleHome } from "@/lib/access"
import { getCurrentUser } from "@/lib/auth/session"
import { getSiteUrl } from "@/lib/config"
import { failure, success, validationFailure, type ActionResult } from "@/lib/errors"
import { safeNextPath } from "@/lib/search"
import { createClient } from "@/lib/supabase/server"
import {
  forgotPasswordSchema,
  loginSchema,
  profileSchema,
  resetPasswordSchema,
} from "@/lib/validations/auth"

export async function login(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") || undefined,
  })
  if (!parsed.success) return validationFailure(parsed.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    return failure("Неверная почта или пароль. Если адрес ещё не подтверждён, откройте письмо от Supabase.")
  }

  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    await supabase.auth.signOut()
    return failure("Вход только для сотрудников сервиса. Книжка открывается по персональной ссылке.")
  }
  redirect(safeNextPath(parsed.data.next, roleHome(user.role)))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/")
}

export async function requestPasswordReset(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) return validationFailure(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await getSiteUrl()}/auth/callback?next=/reset-password`,
  })
  if (error) {
    return failure(
      "Письмо не отправлено. В проекте Supabase нужно включить email: Authentication → Emails. Пока провайдер не настроен, восстановление пароля не работает.",
    )
  }
  return success("Если почта зарегистрирована, Supabase отправит ссылку для нового пароля.")
}

export async function updatePassword(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    passwordConfirm: formData.get("passwordConfirm"),
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()
  if (!data.user) return failure("Ссылка недействительна или истекла. Запросите восстановление ещё раз.")
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return failure("Не удалось обновить пароль.")
  const user = await getCurrentUser()
  if (!user || user.role !== "admin") {
    await supabase.auth.signOut()
    redirect("/")
  }
  redirect("/admin")
}

export async function updateOwnProfile(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const user = await getCurrentUser()
  if (!user) return failure("Войдите в аккаунт.")
  const supabase = await createClient()
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
    })
    .eq("id", user.id)
  if (error) return failure("Не удалось сохранить профиль.")
  return success("Профиль обновлён")
}
