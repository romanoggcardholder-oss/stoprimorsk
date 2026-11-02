"use client"

import Link from "next/link"
import { useActionState } from "react"
import { login, requestPasswordReset, updatePassword } from "@/lib/actions/auth"
import { fieldError, Field } from "@/components/ui-extra/field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ActionResult } from "@/lib/errors"

const initial: ActionResult = { ok: true }

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(login, initial)
  return (
    <form action={action} className="grid gap-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <Message state={state} />
      <Field label="Электронная почта" htmlFor="email" error={fieldError(state.fieldErrors, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Пароль" htmlFor="password" error={fieldError(state.fieldErrors, "password")}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Входим…" : "Войти"}
      </Button>
      <div className="text-sm">
        <Link href="/forgot-password" className="underline">
          Забыли пароль?
        </Link>
      </div>
    </form>
  )
}

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <Field label="Электронная почта" htmlFor="email" error={fieldError(state.fieldErrors, "email")}>
        <Input id="email" name="email" type="email" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Отправляем…" : "Прислать ссылку"}
      </Button>
    </form>
  )
}

export function ResetForm() {
  const [state, action, pending] = useActionState(updatePassword, initial)
  return (
    <form action={action} className="grid gap-4">
      <Message state={state} />
      <Field label="Новый пароль" htmlFor="password" error={fieldError(state.fieldErrors, "password")}>
        <Input id="password" name="password" type="password" required />
      </Field>
      <Field label="Повторите пароль" htmlFor="passwordConfirm" error={fieldError(state.fieldErrors, "passwordConfirm")}>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить пароль"}
      </Button>
    </form>
  )
}

function Message({ state }: { state: ActionResult }) {
  if (!state.message) return null
  return (
    <Alert variant={state.ok ? "default" : "destructive"}>
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  )
}
