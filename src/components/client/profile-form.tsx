"use client"

import { useActionState } from "react"
import { updateOwnProfile } from "@/lib/actions/auth"
import { fieldError, Field } from "@/components/ui-extra/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ActionResult } from "@/lib/errors"

export function ProfileForm({
  user,
}: {
  user: { firstName: string; lastName: string; phone: string | null; email: string | null }
}) {
  const [state, action, pending] = useActionState(updateOwnProfile, { ok: true } satisfies ActionResult)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      {state.message ? <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</p> : null}
      <Field label="Имя" htmlFor="firstName" error={fieldError(state.fieldErrors, "firstName")}>
        <Input id="firstName" name="firstName" defaultValue={user.firstName} required />
      </Field>
      <Field label="Фамилия" htmlFor="lastName" error={fieldError(state.fieldErrors, "lastName")}>
        <Input id="lastName" name="lastName" defaultValue={user.lastName} required />
      </Field>
      <Field label="Телефон" htmlFor="phone" error={fieldError(state.fieldErrors, "phone")}>
        <Input id="phone" name="phone" defaultValue={user.phone ?? ""} required />
      </Field>
      <Field label="Почта" htmlFor="email" hint="Почта меняется через письмо Supabase, в этой форме она только для просмотра.">
        <Input id="email" value={user.email ?? ""} readOnly />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить"}
      </Button>
    </form>
  )
}
