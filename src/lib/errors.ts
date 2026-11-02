import type { ZodError } from "zod"

export type FieldErrors = Record<string, string[]>

export type ActionResult = {
  ok: boolean
  message?: string
  fieldErrors?: FieldErrors
  id?: string
  secretLink?: string
}

export function zodFieldErrors(error: ZodError): FieldErrors {
  const fieldErrors: FieldErrors = {}
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form"
    fieldErrors[key] ??= []
    fieldErrors[key].push(issue.message)
  }
  return fieldErrors
}

export function validationFailure(error: ZodError): ActionResult {
  return {
    ok: false,
    message: "Проверьте заполнение формы",
    fieldErrors: zodFieldErrors(error),
  }
}

const knownMessages: Record<string, string> = {
  "app:forbidden": "Недостаточно прав для этого действия.",
  "app:not_found": "Запись не найдена.",
  "app:vehicle_owner": "Автомобиль не принадлежит выбранному клиенту.",
  "app:negative": "Количество и цена не могут быть отрицательными.",
  "app:quantity": "Количество запчасти должно быть больше нуля.",
  "app:no_items": "Добавьте хотя бы одну работу перед публикацией.",
  "app:cancelled": "Отменённую запись нельзя изменить.",
  "app:not_draft": "Удалить можно только черновик.",
  "app:published_locked": "Опубликованную историю нельзя удалить. Запись можно отменить с указанием причины.",
  "app:role_locked": "Роль пользователя нельзя изменить этим способом.",
  "app:reason": "Укажите причину отмены.",
  "app:bad_details": "Проверьте заголовок, текст и статус заметки.",
  "app:bad_token": "Не удалось создать ссылку.",
}

export function translateDbError(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : typeof error === "object" && error && "message" in error ? String(error.message) : ""
  const code = message.match(/app:[a-z_]+/)?.[0]
  if (code && knownMessages[code]) return knownMessages[code]
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return "Такой VIN, госномер или адрес почты уже используется."
  }
  console.error(error)
  return fallback
}

export function failure(message: string, fieldErrors?: FieldErrors): ActionResult {
  return { ok: false, message, fieldErrors }
}

export function success(message: string, extra?: Partial<ActionResult>): ActionResult {
  return { ok: true, message, ...extra }
}
