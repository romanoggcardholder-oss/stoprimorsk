"use client"

import { useActionState } from "react"
import { requestVehicleClaim } from "@/lib/actions/workshop"
import { fieldError, Field } from "@/components/ui-extra/field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { ActionResult } from "@/lib/errors"

export function ClaimForm() {
  const [state, action, pending] = useActionState(requestVehicleClaim, { ok: true } satisfies ActionResult)
  return (
    <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
      <h2 className="font-display text-xl">Запросить добавление автомобиля</h2>
      <p className="text-sm text-muted-foreground">Запрос увидит администратор. Сама по себе заявка не создаёт автомобиль в книжке.</p>
      {state.message ? <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</p> : null}
      <Field label="Марка" htmlFor="make" error={fieldError(state.fieldErrors, "make")}>
        <Input id="make" name="make" required />
      </Field>
      <Field label="Модель" htmlFor="model" error={fieldError(state.fieldErrors, "model")}>
        <Input id="model" name="model" required />
      </Field>
      <Field label="Год" htmlFor="year">
        <Input id="year" name="year" inputMode="numeric" />
      </Field>
      <Field label="VIN" htmlFor="vin" hint="Можно оставить пустым">
        <Input id="vin" name="vin" />
      </Field>
      <Field label="Госномер" htmlFor="licensePlate">
        <Input id="licensePlate" name="licensePlate" />
      </Field>
      <Field label="Комментарий" htmlFor="comment">
        <Textarea id="comment" name="comment" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Отправляем…" : "Отправить на подтверждение"}
      </Button>
    </form>
  )
}
