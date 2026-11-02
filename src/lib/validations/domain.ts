import { z } from "zod"
import { lineTotalKopecks, parseMoneyToKopecks } from "@/lib/money"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : null))

const moneyField = z.string().trim().superRefine((value, context) => {
  if (value === "") return
  const parsed = parseMoneyToKopecks(value)
  if (parsed == null) {
    context.addIssue({ code: "custom", message: "Укажите неотрицательную сумму с точностью до копеек" })
  }
})

export const serviceItemSchema = z.object({
  clientKey: z.string().min(1).max(80),
  categoryId: z.uuid({ error: "Выберите категорию из списка" }).nullable(),
  serviceName: z.string().trim().min(1, { error: "Укажите название работы" }).max(200),
  description: optionalText(2000),
  laborPrice: moneyField,
  isCompleted: z.boolean(),
  technicalDetails: z.record(z.string(), z.string().trim().max(300)),
})

export const servicePartSchema = z
  .object({
    clientKey: z.string().min(1).max(80),
    itemClientKey: z.string().max(80).nullable(),
    name: z.string().trim().min(1, { error: "Укажите наименование запчасти" }).max(200),
    manufacturer: optionalText(160),
    articleNumber: optionalText(120),
    quantity: z.string().trim().min(1, { error: "Укажите количество" }),
    unit: z.string().trim().min(1, { error: "Укажите единицу" }).max(20),
    unitPrice: moneyField,
  })
  .superRefine((part, context) => {
    const price = part.unitPrice === "" ? 0 : parseMoneyToKopecks(part.unitPrice)
    if (price == null) return
    if (lineTotalKopecks(part.quantity, price) == null) {
      context.addIssue({
        code: "custom",
        path: ["quantity"],
        message: "Количество должно быть больше нуля, не больше трёх знаков после запятой",
      })
    }
  })

export const serviceDraftSchema = z.object({
  id: z.uuid().nullable(),
  vehicleId: z.uuid({ error: "Выберите автомобиль" }),
  customerId: z.uuid({ error: "Выберите клиента" }),
  serviceDate: z.string().min(1, { error: "Укажите дату обслуживания" }),
  mileage: z
    .number({ error: "Укажите пробег целым числом километров" })
    .int({ error: "Пробег должен быть целым числом" })
    .nonnegative({ error: "Пробег не может быть отрицательным" }),
  workOrderNumber: optionalText(64),
  performedBy: optionalText(120),
  generalComment: optionalText(4000),
  nextServiceMileage: z
    .number({ error: "Следующий пробег укажите целым числом" })
    .int({ error: "Следующий пробег должен быть целым числом" })
    .nonnegative({ error: "Следующий пробег не может быть отрицательным" })
    .nullable(),
  nextServiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Укажите дату в формате ГГГГ-ММ-ДД" })
    .nullable(),
  masterRecommendations: optionalText(4000),
  items: z.array(serviceItemSchema),
  parts: z.array(servicePartSchema),
})

export const servicePublishSchema = serviceDraftSchema.extend({
  items: z.array(serviceItemSchema).min(1, { error: "Добавьте хотя бы одну работу перед публикацией" }),
})

export const vehicleSchema = z.object({
  ownerId: z.uuid({ error: "Выберите владельца" }),
  make: z.string().trim().min(1, { error: "Укажите марку" }).max(80),
  model: z.string().trim().min(1, { error: "Укажите модель" }).max(80),
  year: z.number().int().min(1950).max(2100).nullable(),
  vin: z
    .string()
    .trim()
    .toUpperCase()
    .refine((value) => value === "" || /^[A-HJ-NPR-Z0-9]{11,17}$/.test(value), {
      error: "VIN должен содержать 11–17 символов без I, O и Q",
    }),
  licensePlate: z.string().trim().toUpperCase().max(20),
  engineInfo: z.string().trim().max(160),
  fuelType: z.enum(["petrol", "diesel", "hybrid", "electric", "gas", "unknown"]),
  transmissionType: z.enum(["manual", "automatic", "cvt", "robot", "unknown"]),
  currentMileage: z.number().int().nonnegative({ error: "Пробег не может быть отрицательным" }),
  notes: z.string().trim().max(2000),
})

export const vehicleClaimSchema = z.object({
  make: z.string().trim().min(1, { error: "Укажите марку" }).max(80),
  model: z.string().trim().min(1, { error: "Укажите модель" }).max(80),
  year: z.number().int().min(1950).max(2100).nullable(),
  vin: z.string().trim().toUpperCase().max(17),
  licensePlate: z.string().trim().toUpperCase().max(20),
  comment: z.string().trim().max(1000),
})

export const noteSchema = z.object({
  id: z.uuid().nullable(),
  vehicleId: z.uuid({ error: "Выберите автомобиль" }),
  title: z.string().trim().min(2, { error: "Добавьте заголовок" }).max(160),
  content: z.string().trim().min(2, { error: "Добавьте текст заметки" }).max(4000),
  status: z.enum(["active", "done"]),
})

export const categorySchema = z.object({
  id: z.uuid().nullable(),
  name: z.string().trim().min(2, { error: "Укажите название" }).max(160),
  description: z.string().trim().max(500),
  templateKey: z.string().trim().min(1).max(40),
  isActive: z.boolean(),
})

export const customerInviteSchema = z.object({
  firstName: z.string().trim().min(2, { error: "Укажите имя" }).max(80),
  lastName: z.string().trim().min(2, { error: "Укажите фамилию" }).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s()-]{10,20}$/, { error: "Укажите телефон" }),
  email: z.email({ error: "Укажите корректную электронную почту" }),
})

export const intervalSchema = z
  .object({
    vehicleId: z.uuid(),
    categoryId: z.uuid().nullable(),
    nextMileage: z.number().int().nonnegative().nullable(),
    nextDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),
    note: z.string().trim().max(500),
  })
  .refine((value) => value.nextMileage != null || value.nextDate, {
    error: "Укажите пробег или дату. Пустой интервал не назначается.",
  })

export const settingsSchema = z.object({
  phoneDisplay: z.string().trim().min(5).max(40),
  phoneHref: z.string().trim().regex(/^tel:\+[0-9]{10,15}$/, {
    error: "Ссылка вызова должна быть в формате tel:+7…",
  }),
  address: z.string().trim().min(5).max(240),
  about: z.string().trim().min(10).max(800),
  mapUrl: z.url({ error: "Укажите ссылку на маршрут" }),
})

export const cancelSchema = z.object({
  id: z.uuid(),
  reason: z.string().trim().min(3, { error: "Укажите причину отмены" }).max(500),
})

export type ServiceDraftInput = z.infer<typeof serviceDraftSchema>
export type VehicleInput = z.infer<typeof vehicleSchema>
export type NoteInput = z.infer<typeof noteSchema>
