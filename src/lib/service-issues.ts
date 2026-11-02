import type { FieldErrors } from "@/lib/errors"
import { detailLabel } from "@/lib/service-templates"

const rootLabels: Record<string, string> = {
  customerId: "Клиент",
  vehicleId: "Автомобиль",
  serviceDate: "Дата и время",
  mileage: "Пробег, км",
  workOrderNumber: "Номер заказ-наряда",
  performedBy: "Мастер",
  generalComment: "Комментарий",
  nextServiceMileage: "Следующий пробег, км",
  nextServiceDate: "Следующая дата",
  masterRecommendations: "Рекомендации мастера",
  items: "Выполненные работы",
  form: "Форма",
}

const itemFields: Record<string, string> = {
  serviceName: "наименование",
  description: "комментарий",
  laborPrice: "стоимость работы",
  categoryId: "категория",
}

const partFields: Record<string, string> = {
  name: "наименование",
  manufacturer: "производитель",
  articleNumber: "артикул",
  quantity: "количество",
  unit: "единица",
  unitPrice: "цена",
}

export type ServiceIssueContext = {
  items?: { clientKey: string }[]
  parts?: { clientKey: string }[]
}

function withReason(label: string, message: string) {
  const reason = message.slice(0, 1).toLocaleLowerCase("ru-RU") + message.slice(1)
  return `${label} — ${reason}`
}

function titleFor(path: string, context: ServiceIssueContext) {
  const bits = path.split(".")
  if (bits[0] === "items" && /^\d+$/.test(bits[1] ?? "")) {
    const work = `Работа ${Number(bits[1]) + 1}`
    const field = bits[2]
    if (!field) return work
    if (field === "technicalDetails") {
      const key = bits[3]
      return key ? `${work}, ${detailLabel(key).toLocaleLowerCase("ru-RU")}` : work
    }
    return `${work}, ${itemFields[field] ?? field}`
  }
  if (bits[0] === "parts" && /^\d+$/.test(bits[1] ?? "")) {
    const index = Number(bits[1])
    const field = bits[2]
    const fieldLabel = field ? (partFields[field] ?? field) : ""
    const part = context.parts?.[index]
    if (part?.clientKey.startsWith("material-")) {
      const workKey = part.clientKey.slice("material-".length)
      const workIndex = context.items?.findIndex((item) => item.clientKey === workKey) ?? -1
      const work = workIndex >= 0 ? `Работа ${workIndex + 1}` : "Материал"
      if (field === "unitPrice") return `${work}, стоимость материала`
      if (field === "quantity") return `${work}, количество материала`
      if (field === "name") return `${work}, название материала`
      return fieldLabel ? `${work}, ${fieldLabel}` : work
    }
    const extraNumber =
      (context.parts ?? []).slice(0, index).filter((item) => !item.clientKey.startsWith("material-")).length + 1
    const name = context.parts ? `Дополнительная запчасть ${extraNumber}` : `Запчасть ${index + 1}`
    return fieldLabel ? `${name}, ${fieldLabel}` : name
  }
  return rootLabels[bits[0] ?? ""] ?? path
}

export function serviceIssueLines(errors: FieldErrors | undefined, context: ServiceIssueContext = {}) {
  if (!errors) return []
  const lines: string[] = []
  const seen = new Set<string>()
  for (const [path, messages] of Object.entries(errors)) {
    for (const message of messages) {
      const text = withReason(titleFor(path, context), message)
      if (seen.has(text)) continue
      seen.add(text)
      lines.push(text)
    }
  }
  return lines
}
