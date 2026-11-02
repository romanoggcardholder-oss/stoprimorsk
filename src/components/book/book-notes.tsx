"use client"

import { useState } from "react"
import { useActionState } from "react"
import { deleteBookNote, saveBookNote } from "@/lib/actions/workshop"
import { controlClass, fieldError, Field } from "@/components/ui-extra/field"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/format"
import type { ActionResult } from "@/lib/errors"
import type { VehicleNote } from "@/lib/types"

const initial: ActionResult = { ok: true }

export function BookNotes({
  token,
  notes,
  vehicles,
}: {
  token: string
  notes: VehicleNote[]
  vehicles: { id: string; label: string }[]
}) {
  const [editing, setEditing] = useState<VehicleNote | null>(null)
  const [state, action, pending] = useActionState(saveBookNote, initial)
  const [removeState, remove, removePending] = useActionState(deleteBookNote, initial)

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="font-display text-2xl">Мои заметки</h2>
        <p className="mt-1 text-sm text-muted-foreground">Заметка остаётся вашей. Она не становится записью автосервиса.</p>
      </div>
      <form action={action} className="grid gap-3 rounded-3xl bg-white p-5">
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <Field label="Автомобиль" htmlFor="vehicleId" error={fieldError(state.fieldErrors, "vehicleId")}>
          <select id="vehicleId" name="vehicleId" className={controlClass} defaultValue={editing?.vehicleId ?? vehicles[0]?.id ?? ""}>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>{vehicle.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Заголовок" htmlFor="note-title" error={fieldError(state.fieldErrors, "title")}>
          <Input id="note-title" name="title" defaultValue={editing?.title ?? ""} required />
        </Field>
        <Field label="Текст" htmlFor="note-content" error={fieldError(state.fieldErrors, "content")}>
          <Textarea id="note-content" name="content" defaultValue={editing?.content ?? ""} required />
        </Field>
        <Field label="Статус" htmlFor="note-status">
          <select id="note-status" name="status" className={controlClass} defaultValue={editing?.status ?? "active"}>
            <option value="active">Активная</option>
            <option value="done">Выполненная</option>
          </select>
        </Field>
        {state.message ? <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</p> : null}
        <Button type="submit" disabled={pending || vehicles.length === 0}>
          {pending ? "Сохраняем…" : editing ? "Обновить заметку" : "Добавить заметку"}
        </Button>
      </form>
      {removeState.message && !removeState.ok ? <p className="text-sm text-destructive">{removeState.message}</p> : null}
      <div className="grid gap-3">
        {notes.length === 0 ? <p className="text-sm text-muted-foreground">Заметок пока нет.</p> : null}
        {notes.map((note) => (
          <article key={note.id} className="rounded-3xl bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{note.title}</h3>
                <p className="text-xs text-muted-foreground">{note.vehicleLabel}</p>
              </div>
              <Badge variant={note.status === "done" ? "secondary" : "default"}>{note.status === "done" ? "Выполнена" : "Активная"}</Badge>
            </div>
            <p className="mt-2 text-sm">{note.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Создана {formatDateTime(note.createdAt)} · изменена {formatDateTime(note.updatedAt)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(note)}>Изменить</Button>
              <form
                action={remove}
                onSubmit={(event) => {
                  if (!confirm("Удалить заметку?")) event.preventDefault()
                }}
              >
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="id" value={note.id} />
                <Button type="submit" variant="destructive" disabled={removePending}>Удалить</Button>
              </form>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
