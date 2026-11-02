"use client"

import { useActionState } from "react"
import { useState } from "react"
import { deleteNote, saveNote } from "@/lib/actions/workshop"
import { fieldError, Field } from "@/components/ui-extra/field"
import { controlClass } from "@/components/ui-extra/field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/format"
import type { ActionResult } from "@/lib/errors"
import type { VehicleNote } from "@/lib/types"

export function NoteManager({
  notes,
  vehicles,
  initialVehicleId,
}: {
  notes: VehicleNote[]
  vehicles: { id: string; label: string }[]
  initialVehicleId?: string
}) {
  const [editing, setEditing] = useState<VehicleNote | null>(null)
  const [state, action, pending] = useActionState(saveNote, { ok: true } satisfies ActionResult)
  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl">Мои заметки</h1>
      <p className="text-sm text-muted-foreground">Заметка остаётся вашей. Она не становится записью автосервиса.</p>
      <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <Field label="Автомобиль" htmlFor="vehicleId" error={fieldError(state.fieldErrors, "vehicleId")}>
          <select id="vehicleId" name="vehicleId" className={controlClass} defaultValue={editing?.vehicleId ?? initialVehicleId ?? vehicles[0]?.id ?? ""}>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Заголовок" htmlFor="title" error={fieldError(state.fieldErrors, "title")}>
          <Input id="title" name="title" defaultValue={editing?.title ?? ""} required />
        </Field>
        <Field label="Текст" htmlFor="content" error={fieldError(state.fieldErrors, "content")}>
          <Textarea id="content" name="content" defaultValue={editing?.content ?? ""} required />
        </Field>
        <Field label="Статус" htmlFor="status">
          <select id="status" name="status" className={controlClass} defaultValue={editing?.status ?? "active"}>
            <option value="active">Активная</option>
            <option value="done">Выполненная</option>
          </select>
        </Field>
        {state.message ? <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</p> : null}
        <Button type="submit" disabled={pending || vehicles.length === 0}>
          {pending ? "Сохраняем…" : editing ? "Обновить заметку" : "Добавить заметку"}
        </Button>
      </form>
      <div className="grid gap-3">
        {notes.length === 0 ? <p className="text-sm text-muted-foreground">Заметок пока нет.</p> : null}
        {notes.map((note) => (
          <article key={note.id} className="rounded-3xl bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-medium">{note.title}</h2>
                <p className="text-xs text-muted-foreground">{note.vehicleLabel}</p>
              </div>
              <Badge variant={note.status === "done" ? "secondary" : "default"}>{note.status === "done" ? "Выполнена" : "Активная"}</Badge>
            </div>
            <p className="mt-2 text-sm">{note.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Создана {formatDateTime(note.createdAt)} · изменена {formatDateTime(note.updatedAt)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(note)}>
                Изменить
              </Button>
              <form action={deleteNote}>
                <input type="hidden" name="id" value={note.id} />
                <Button type="submit" variant="destructive" onClick={(event) => {
                  if (!confirm("Удалить заметку?")) event.preventDefault()
                }}>
                  Удалить
                </Button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
