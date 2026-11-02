import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { canManageOfficialRecords, canReadServiceRecord, canReadVehicle, roleHome } from "@/lib/access"
import { initialServiceCatalog } from "@/lib/catalog"
import { addKopecks, formatKopecks, lineTotalKopecks, parseMoneyToKopecks } from "@/lib/money"
import { buildReminders } from "@/lib/reminders"
import { zodFieldErrors } from "@/lib/errors"
import { serviceIssueLines } from "@/lib/service-issues"
import { materialPartForItem, toServiceDraft } from "@/lib/service-payload"
import { servicePublishSchema } from "@/lib/validations/domain"
import { createBookToken, hashBookToken, isBookToken } from "@/lib/book-token"

describe("деньги", () => {
  it("считает копейки без двоичной ошибки 0.1 + 0.2", () => {
    const sum = addKopecks([parseMoneyToKopecks("0,10") ?? 0, parseMoneyToKopecks("0,20") ?? 0])
    expect(sum).toBe(30)
    expect(formatKopecks(sum)).toBe("0,30 ₽")
  })

  it("отклоняет отрицательную цену и считает строку материалов", () => {
    expect(parseMoneyToKopecks("-1")).toBeNull()
    expect(lineTotalKopecks("1,5", 10000)).toBe(15000)
    expect(lineTotalKopecks("0", 100)).toBeNull()
  })
})

describe("доступ", () => {
  it("клиент видит только опубликованную запись своего автомобиля", () => {
    expect(canReadServiceRecord({
      role: "client",
      userId: "u1",
      status: "draft",
      customerId: "u1",
      ownerId: "u1",
    })).toBe(false)
    expect(canReadServiceRecord({
      role: "client",
      userId: "u1",
      status: "published",
      customerId: "u2",
      ownerId: "u2",
    })).toBe(false)
    expect(canReadServiceRecord({
      role: "client",
      userId: "u1",
      status: "published",
      customerId: "u1",
      ownerId: "u1",
    })).toBe(true)
    expect(canReadVehicle({ role: "client", userId: "u1", ownerId: "u2" })).toBe(false)
    expect(canManageOfficialRecords("client")).toBe(false)
    expect(roleHome("admin")).toBe("/admin")
  })
})

describe("напоминания", () => {
  const today = new Date(2026, 9, 26)

  it("не придумывает дату, если интервал не задан", () => {
    expect(buildReminders([{
      id: "1",
      title: "Camry",
      currentMileage: 10000,
      nextMileage: null,
      nextDate: null,
    }], today)).toEqual([])
  })

  it("предупреждает только рядом с назначенным пробегом", () => {
    const far = buildReminders([{
      id: "1",
      title: "Camry",
      currentMileage: 10000,
      nextMileage: 20000,
      nextDate: null,
    }], today)
    const close = buildReminders([{
      id: "1",
      title: "Camry",
      currentMileage: 19200,
      nextMileage: 20000,
      nextDate: null,
    }], today)
    expect(far).toEqual([])
    expect(close[0]?.level).toBe("upcoming")
  })
})

describe("обслуживание", () => {
  it("переносит стоимость материала в запчасти один раз и требует работу для публикации", () => {
    const draft = toServiceDraft({
      id: "",
      customerId: "8d0b0b62-6f4e-4a7c-9c1e-0c2d3e4f5a6b",
      vehicleId: "8d0b0b62-6f4e-4a7c-9c1e-0c2d3e4f5a6c",
      serviceDate: "2026-10-26T10:00",
      mileage: "1000",
      workOrderNumber: "",
      performedBy: "",
      generalComment: "",
      nextServiceMileage: "",
      nextServiceDate: "",
      masterRecommendations: "",
      items: [{
        clientKey: "work-1",
        categoryId: "",
        serviceName: "Замена моторного масла",
        description: "",
        laborPrice: "1500",
        isCompleted: true,
        technicalDetails: { manufacturer: "Test", material_cost: "3200", viscosity: "5W-30" },
      }],
      parts: [],
    })
    expect(draft.parts).toHaveLength(1)
    expect(draft.parts[0]?.unitPrice).toBe("3200")
    expect(draft.items[0]?.technicalDetails.material_cost).toBeUndefined()
    expect(servicePublishSchema.safeParse({ ...draft, items: [] }).success).toBe(false)
    const missing = toServiceDraft({
      id: "",
      customerId: "",
      vehicleId: "",
      serviceDate: "",
      mileage: "",
      workOrderNumber: "",
      performedBy: "",
      generalComment: "",
      nextServiceMileage: "",
      nextServiceDate: "",
      masterRecommendations: "",
      items: [{
        clientKey: "work-1",
        categoryId: "",
        serviceName: "",
        description: "",
        laborPrice: "",
        isCompleted: true,
        technicalDetails: { manufacturer: "Test", material_cost: "-5" },
      }],
      parts: [{
        clientKey: "part-1",
        itemClientKey: "",
        name: "Фильтр",
        manufacturer: "",
        articleNumber: "",
        quantity: "1",
        unit: "шт.",
        unitPrice: "xx",
      }],
    })
    const parsed = servicePublishSchema.safeParse(missing)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const lines = serviceIssueLines(zodFieldErrors(parsed.error), { items: missing.items, parts: missing.parts })
      expect(lines).toEqual(expect.arrayContaining([
        "Клиент — выберите клиента",
        "Автомобиль — выберите автомобиль",
        "Дата и время — укажите дату обслуживания",
        "Пробег, км — укажите пробег целым числом километров",
        "Работа 1, наименование — укажите название работы",
        "Работа 1, стоимость материала — укажите неотрицательную сумму с точностью до копеек",
        "Дополнительная запчасть 1, цена — укажите неотрицательную сумму с точностью до копеек",
      ]))
      expect(lines.join(" ")).not.toMatch(/Invalid|NaN|UUID/)
    }
    const noWork = servicePublishSchema.safeParse({ ...draft, items: [] })
    if (!noWork.success) {
      expect(serviceIssueLines(zodFieldErrors(noWork.error))).toContain(
        "Выполненные работы — добавьте хотя бы одну работу перед публикацией",
      )
    }
    expect(materialPartForItem({
      clientKey: "x",
      categoryId: "",
      serviceName: "Работа",
      description: "",
      laborPrice: "",
      isCompleted: true,
      technicalDetails: {},
    })).toBeNull()
  })

  it("хеширует персональную ссылку и не хранит сам токен", () => {
    const { token, hash } = createBookToken()
    expect(isBookToken(token)).toBe(true)
    expect(hash).toHaveLength(64)
    expect(hash).toBe(hashBookToken(token))
    expect(hash).not.toContain(token)
  })
})

describe("миграция", () => {
  const sql = readFileSync("supabase/migrations/20261026000000_init.sql", "utf8")
  const links = readFileSync("supabase/migrations/20261026010000_access_links.sql", "utf8")

  it("включает RLS и не позволяет клиенту самому стать администратором", () => {
    for (const table of [
      "profiles",
      "vehicles",
      "service_categories",
      "service_records",
      "service_record_items",
      "parts_used",
      "vehicle_notes",
      "service_record_attachments",
      "audit_logs",
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`)
    }
    expect(sql).toContain("app:role_locked")
    expect(sql).toContain("app:published_locked")
    expect(sql).toContain("status = 'published'")
    expect(sql).not.toContain("service_role key")
  })

  it("содержит начальные категории работ", () => {
    for (const category of initialServiceCatalog) {
      expect(sql).toContain(`'${category.slug}'`)
    }
  })

  it("хранит только хеш ссылки и не открывает книжку чужому автомобилю", () => {
    expect(links).toContain("token_hash")
    expect(links).toContain("revoked_at is null")
    expect(links).toContain("v_grant.vehicle_id is null or v.id = v_grant.vehicle_id")
    expect(links).toContain("r.status = 'published'")
    expect(links).toContain("revoke all on function public.issue_access_grant(uuid, uuid, text) from public, anon")
    expect(links).not.toContain("grant execute on function public.issue_access_grant(uuid, uuid, text) to anon")
    expect(links).not.toContain("grant select on table public.access_grants to anon")
  })
})
