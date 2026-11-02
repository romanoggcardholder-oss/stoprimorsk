import { amountToInput, lineTotalKopecks, parseMoneyToKopecks } from "@/lib/money"
import type { ServiceRecordView } from "@/lib/types"
import type { ServiceDraftInput } from "@/lib/validations/domain"

export type ServiceFormItem = {
  clientKey: string
  categoryId: string
  serviceName: string
  description: string
  laborPrice: string
  isCompleted: boolean
  technicalDetails: Record<string, string>
}

export type ServiceFormPart = {
  clientKey: string
  itemClientKey: string
  name: string
  manufacturer: string
  articleNumber: string
  quantity: string
  unit: string
  unitPrice: string
}

export type ServiceFormValues = {
  id: string
  customerId: string
  vehicleId: string
  serviceDate: string
  mileage: string
  workOrderNumber: string
  performedBy: string
  generalComment: string
  nextServiceMileage: string
  nextServiceDate: string
  masterRecommendations: string
  items: ServiceFormItem[]
  parts: ServiceFormPart[]
}

function cleanDetails(details: Record<string, string>) {
  const next: Record<string, string> = {}
  for (const [key, value] of Object.entries(details)) {
    if (key === "material_cost") continue
    const trimmed = value.trim()
    if (trimmed) next[key] = trimmed
  }
  return next
}

export function materialPartForItem(item: ServiceFormItem): ServiceFormPart | null {
  const details = item.technicalDetails
  const interesting = ["manufacturer", "product_name", "article", "viscosity", "specification", "volume", "material_cost", "pad_type"]
  const hasMaterial = interesting.some((key) => details[key]?.trim())
  if (!hasMaterial) return null
  const name = [details.product_name, details.viscosity || details.specification].filter((part) => part?.trim()).join(" ")
  const quantity = details.quantity?.trim() || "1"
  return {
    clientKey: `material-${item.clientKey}`,
    itemClientKey: item.clientKey,
    name: name || item.serviceName,
    manufacturer: details.manufacturer?.trim() ?? "",
    articleNumber: details.article?.trim() ?? "",
    quantity,
    unit: "шт.",
    unitPrice: details.material_cost?.trim() || "0",
  }
}

export function toServiceDraft(values: ServiceFormValues): ServiceDraftInput {
  const mileage = Number(values.mileage)
  const nextMileage = values.nextServiceMileage.trim()
  return {
    id: values.id || null,
    customerId: values.customerId,
    vehicleId: values.vehicleId,
    serviceDate: values.serviceDate,
    mileage: values.mileage.trim() === "" ? Number.NaN : mileage,
    workOrderNumber: values.workOrderNumber,
    performedBy: values.performedBy,
    generalComment: values.generalComment,
    nextServiceMileage: nextMileage === "" ? null : Number(nextMileage),
    nextServiceDate: values.nextServiceDate.trim() || null,
    masterRecommendations: values.masterRecommendations,
    items: values.items.map((item) => ({
      clientKey: item.clientKey,
      categoryId: item.categoryId || null,
      serviceName: item.serviceName,
      description: item.description,
      laborPrice: item.laborPrice.trim(),
      isCompleted: item.isCompleted,
      technicalDetails: cleanDetails(item.technicalDetails),
    })),
    parts: [
      ...values.items.map(materialPartForItem).filter((part): part is ServiceFormPart => part != null),
      ...values.parts.filter((part) => part.name.trim()),
    ].map((part) => ({
      clientKey: part.clientKey,
      itemClientKey: part.itemClientKey || null,
      name: part.name,
      manufacturer: part.manufacturer,
      articleNumber: part.articleNumber,
      quantity: part.quantity.trim() || "1",
      unit: part.unit.trim() || "шт.",
      unitPrice: part.unitPrice.trim(),
    })),
  }
}

function trimQuantity(value: string) {
  if (!value.includes(".")) return value
  return value.replace(/0+$/, "").replace(/\.$/, "")
}

export function formFromRecord(record: ServiceRecordView, serviceDate: string): ServiceFormValues {
  const linked = new Map(record.parts.filter((part) => part.itemId).map((part) => [part.itemId as string, part]))
  return {
    id: record.id,
    customerId: record.customerId,
    vehicleId: record.vehicleId,
    serviceDate,
    mileage: String(record.mileage),
    workOrderNumber: record.workOrderNumber ?? "",
    performedBy: record.performedBy ?? "",
    generalComment: record.generalComment ?? "",
    nextServiceMileage: record.nextServiceMileage == null ? "" : String(record.nextServiceMileage),
    nextServiceDate: record.nextServiceDate?.slice(0, 10) ?? "",
    masterRecommendations: record.masterRecommendations ?? "",
    items: record.items.map((item) => {
      const part = linked.get(item.id)
      return {
        clientKey: item.id,
        categoryId: item.categoryId ?? "",
        serviceName: item.serviceName,
        description: item.description ?? "",
        laborPrice: amountToInput(item.totalPrice),
        isCompleted: item.isCompleted,
        technicalDetails: {
          ...item.technicalDetails,
          ...(part
            ? {
                material_cost: amountToInput(part.unitPrice),
                quantity: trimQuantity(part.quantity),
                manufacturer: part.manufacturer ?? item.technicalDetails.manufacturer ?? "",
                article: part.articleNumber ?? item.technicalDetails.article ?? "",
              }
            : {}),
        },
      }
    }),
    parts: record.parts
      .filter((part) => !part.itemId)
      .map((part) => ({
        clientKey: part.id,
        itemClientKey: "",
        name: part.name,
        manufacturer: part.manufacturer ?? "",
        articleNumber: part.articleNumber ?? "",
        quantity: trimQuantity(part.quantity),
        unit: part.unit,
        unitPrice: amountToInput(part.unitPrice),
      })),
  }
}

export function moneyOrZero(value: string) {
  if (value.trim() === "") return "0.00"
  const kopecks = parseMoneyToKopecks(value)
  if (kopecks == null) return value
  const rubles = Math.floor(kopecks / 100)
  const fraction = kopecks % 100
  return `${rubles}.${fraction.toString().padStart(2, "0")}`
}

export function estimateTotals(values: ServiceFormValues) {
  const draft = toServiceDraft(values)
  let labor = 0
  let parts = 0
  let invalid = false
  for (const item of draft.items) {
    if (item.laborPrice === "") continue
    const kopecks = parseMoneyToKopecks(item.laborPrice)
    if (kopecks == null) invalid = true
    else labor += kopecks
  }
  for (const part of draft.parts) {
    const price = part.unitPrice === "" ? 0 : parseMoneyToKopecks(part.unitPrice)
    if (price == null) {
      invalid = true
      continue
    }
    const line = lineTotalKopecks(part.quantity, price)
    if (line == null) invalid = true
    else parts += line
  }
  return { labor, parts, grand: labor + parts, invalid }
}
