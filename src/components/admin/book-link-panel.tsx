"use client"

import { useState } from "react"
import { useActionState } from "react"
import { issueBookLink, revokeBookLink } from "@/lib/actions/workshop"
import { Button } from "@/components/ui/button"
import type { ActionResult } from "@/lib/errors"
import { formatDateTime } from "@/lib/format"

const initial: ActionResult = { ok: true }

export function BookLinkPanel({
  customerId,
  vehicleId,
  active,
  unavailable,
}: {
  customerId: string
  vehicleId?: string
  active: { id: string; createdAt: string } | null
  unavailable?: boolean
}) {
  const [issueState, issue, issuePending] = useActionState(issueBookLink, initial)
  const [revokeState, revoke, revokePending] = useActionState(revokeBookLink, initial)
  const [copied, setCopied] = useState(false)
  const link = issueState.secretLink

  return (
    <section className="grid gap-3 rounded-3xl bg-white p-5">
      <h2 className="font-medium">Ссылка на сервисную книжку</h2>
      {unavailable ? (
        <p className="text-sm text-muted-foreground">
          Ссылки появятся после применения миграции персональных ссылок в Supabase.
        </p>
      ) : null}
      {active ? (
        <p className="text-sm text-muted-foreground">
          Ссылка активна с {formatDateTime(active.createdAt)}. Сам адрес хранится только у клиента: в базе записан хеш.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Активной ссылки нет. Клиент открывает книжку без регистрации.</p>
      )}
      {issueState.message ? (
        <p className={issueState.ok ? "text-sm text-success" : "text-sm text-destructive"}>{issueState.message}</p>
      ) : null}
      {link ? (
        <div className="grid gap-2">
          <input readOnly value={link} className="w-full rounded-xl bg-secondary px-3 py-2 text-sm" aria-label="Персональная ссылка" />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(link).then(() => setCopied(true))
            }}
          >
            {copied ? "Скопировано" : "Скопировать ссылку"}
          </Button>
        </div>
      ) : null}
      <form
        action={issue}
        onSubmit={(event) => {
          if (active && !confirm("Прежняя ссылка перестанет открывать книжку. Создать новую?")) event.preventDefault()
        }}
      >
        <input type="hidden" name="customerId" value={customerId} />
        {vehicleId ? <input type="hidden" name="vehicleId" value={vehicleId} /> : null}
        <Button type="submit" disabled={issuePending || unavailable}>
          {issuePending ? "Создаём…" : active ? "Перевыпустить ссылку" : "Создать ссылку на сервисную книжку"}
        </Button>
      </form>
      {active ? (
        <form
          action={revoke}
          onSubmit={(event) => {
            if (!confirm("Отозвать ссылку? Клиент больше не откроет книжку по старому адресу.")) event.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={active.id} />
          {revokeState.message ? (
            <p className={revokeState.ok ? "mb-2 text-sm text-success" : "mb-2 text-sm text-destructive"}>{revokeState.message}</p>
          ) : null}
          <Button type="submit" variant="destructive" disabled={revokePending}>
            {revokePending ? "Отзываем…" : "Отозвать ссылку"}
          </Button>
        </form>
      ) : null}
    </section>
  )
}
