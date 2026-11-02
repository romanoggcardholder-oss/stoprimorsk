"use server"

import { randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { requireAdmin, requireClient } from "@/lib/auth/session"
import { dateTimeLocalToIso } from "@/lib/format"
import { failure, success, translateDbError, validationFailure, type ActionResult } from "@/lib/errors"
import { moneyOrZero, toServiceDraft, type ServiceFormValues } from "@/lib/service-payload"
import { slugify } from "@/lib/slug"
import { sanitizeSearch } from "@/lib/search"
import { getSiteUrl } from "@/lib/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { createBookToken, hashBookToken, isBookToken } from "@/lib/book-token"
import { profileSchema } from "@/lib/validations/auth"
import {
  cancelSchema,
  categorySchema,
  customerInviteSchema,
  intervalSchema,
  noteSchema,
  serviceDraftSchema,
  servicePublishSchema,
  settingsSchema,
  vehicleClaimSchema,
  vehicleSchema,
} from "@/lib/validations/domain"

function refresh() {
  revalidatePath("/admin", "layout")
  revalidatePath("/client", "layout")
  revalidatePath("/book/[token]", "page")
}

export async function searchCustomers(query: string) {
  const { supabase } = await requireAdmin()
  const text = sanitizeSearch(query)
  if (text.length < 2) return []
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, email")
    .eq("role", "client")
    .or(`first_name.ilike.%${text}%,last_name.ilike.%${text}%,phone.ilike.%${text}%,email.ilike.%${text}%`)
    .limit(8)
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: `${row.last_name} ${row.first_name}`,
    phone: row.phone as string | null,
    email: row.email as string | null,
  }))
}

export async function vehiclesOfCustomer(customerId: string) {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from("vehicles")
    .select("id, make, model, year, license_plate, current_mileage")
    .eq("owner_id", customerId)
    .order("make")
  return data ?? []
}

async function upsertInvitation(input: {
  email: string
  firstName: string
  lastName: string
  phone: string
  userId: string | null
  invitedBy: string
}) {
  const supabase = await createClient()
  await supabase.from("customer_invitations").insert({
    email: input.email,
    first_name: input.firstName,
    last_name: input.lastName,
    phone: input.phone,
    invited_by: input.invitedBy,
    auth_user_id: input.userId,
    status: input.userId ? "accepted" : "pending",
    accepted_at: input.userId ? new Date().toISOString() : null,
  })
}

export async function createCustomer(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = customerInviteSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const { user } = await requireAdmin()
  const admin = createAdminClient()
  const metadata = {
    first_name: parsed.data.firstName,
    last_name: parsed.data.lastName,
    phone: parsed.data.phone,
  }

  const { data: existing } = await admin.from("profiles").select("id").eq("email", parsed.data.email).maybeSingle()
  if (existing?.id) {
    await admin
      .from("profiles")
      .update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, phone: parsed.data.phone })
      .eq("id", existing.id)
      .eq("role", "client")
    await upsertInvitation({ ...parsed.data, userId: existing.id, invitedBy: user.id })
    refresh()
    return success("Клиент с этой почтой уже есть. Имя и телефон обновлены. Пароль не создавался.")
  }

  const password = randomBytes(32).toString("base64url")
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error || !data.user) {
    return failure("Не удалось создать карточку клиента. Проверьте service role key и что эта почта ещё не занята.")
  }
  await admin
    .from("profiles")
    .update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, phone: parsed.data.phone })
    .eq("id", data.user.id)
  await upsertInvitation({ ...parsed.data, userId: data.user.id, invitedBy: user.id })
  refresh()
  return success("Карточка клиента создана. Пароль не сохраняется и никому не показывается. Ссылку на книжку создайте в карточке.")
}

export async function updateCustomer(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "")
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const { supabase } = await requireAdmin()
  const { error } = await supabase
    .from("profiles")
    .update({ first_name: parsed.data.firstName, last_name: parsed.data.lastName, phone: parsed.data.phone })
    .eq("id", id)
    .eq("role", "client")
  if (error) return failure("Не удалось сохранить карточку клиента.")
  refresh()
  return success("Данные клиента сохранены")
}

function vehiclePayload(parsed: ReturnType<typeof vehicleSchema.parse>) {
  return {
    owner_id: parsed.ownerId,
    make: parsed.make,
    model: parsed.model,
    year: parsed.year,
    vin: parsed.vin || null,
    license_plate: parsed.licensePlate || null,
    engine_info: parsed.engineInfo || null,
    fuel_type: parsed.fuelType,
    transmission_type: parsed.transmissionType,
    current_mileage: parsed.currentMileage,
    notes: parsed.notes || null,
  }
}

export async function saveVehicle(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const year = String(formData.get("year") ?? "")
  const mileage = String(formData.get("currentMileage") ?? "")
  const parsed = vehicleSchema.safeParse({
    ownerId: formData.get("ownerId"),
    make: formData.get("make"),
    model: formData.get("model"),
    year: year.trim() === "" ? null : Number(year),
    vin: formData.get("vin") ?? "",
    licensePlate: formData.get("licensePlate") ?? "",
    engineInfo: formData.get("engineInfo") ?? "",
    fuelType: formData.get("fuelType") || "unknown",
    transmissionType: formData.get("transmissionType") || "unknown",
    currentMileage: mileage.trim() === "" ? Number.NaN : Number(mileage),
    notes: formData.get("notes") ?? "",
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const { supabase } = await requireAdmin()
  const id = String(formData.get("id") ?? "")
  const payload = vehiclePayload(parsed.data)
  const query = id
    ? supabase.from("vehicles").update(payload).eq("id", id).select("id").single()
    : supabase.from("vehicles").insert(payload).select("id").single()
  const { data, error } = await query
  if (error || !data) return failure(translateDbError(error, "Не удалось сохранить автомобиль."))
  refresh()
  return success("Автомобиль сохранён", { id: data.id })
}

export async function uploadVehicleImage(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const vehicleId = String(formData.get("vehicleId") ?? "")
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return failure("Выберите фотографию.")
  if (file.size > 5 * 1024 * 1024) return failure("Файл больше 5 МБ.")
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return failure("Допустимы JPG, PNG и WebP.")
  const { supabase, user } = await requireAdmin()
  const path = `${vehicleId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.()-]+/g, "_")}`
  const { error: uploadError } = await supabase.storage.from("vehicle-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) return failure("Не удалось загрузить фотографию.")
  const { error } = await supabase.from("vehicles").update({ image_path: path }).eq("id", vehicleId)
  if (error) return failure("Фотография загружена, но не привязалась к автомобилю.")
  void user
  refresh()
  return success("Фотография сохранена")
}

export async function requestVehicleClaim(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const year = String(formData.get("year") ?? "")
  const parsed = vehicleClaimSchema.safeParse({
    make: formData.get("make"),
    model: formData.get("model"),
    year: year.trim() === "" ? null : Number(year),
    vin: formData.get("vin") ?? "",
    licensePlate: formData.get("licensePlate") ?? "",
    comment: formData.get("comment") ?? "",
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const user = await requireClient()
  const supabase = await createClient()
  const { error } = await supabase.from("vehicle_claims").insert({
    user_id: user.id,
    make: parsed.data.make,
    model: parsed.data.model,
    year: parsed.data.year,
    vin: parsed.data.vin || null,
    license_plate: parsed.data.licensePlate || null,
    comment: parsed.data.comment || null,
    status: "pending",
  })
  if (error) return failure("Не удалось отправить запрос.")
  refresh()
  return success("Запрос отправлен администратору. Автомобиль появится после подтверждения.")
}

export async function reviewClaim(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "")
  const decision = formData.get("decision") === "approve" ? "approve" : "reject"
  const { supabase, user } = await requireAdmin()
  if (decision === "reject") {
    await supabase
      .from("vehicle_claims")
      .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pending")
    refresh()
    return
  }
  const { data: claim } = await supabase.from("vehicle_claims").select("*").eq("id", id).eq("status", "pending").maybeSingle()
  if (!claim) return
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert({
      owner_id: claim.user_id,
      make: claim.make,
      model: claim.model,
      year: claim.year,
      vin: claim.vin,
      license_plate: claim.license_plate,
      notes: claim.comment,
      current_mileage: 0,
    })
    .select("id")
    .single()
  if (error || !vehicle) return
  await supabase
    .from("vehicle_claims")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      created_vehicle_id: vehicle.id,
    })
    .eq("id", id)
  refresh()
}

export async function saveNote(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = noteSchema.safeParse({
    id: String(formData.get("id") ?? "") || null,
    vehicleId: formData.get("vehicleId"),
    title: formData.get("title"),
    content: formData.get("content"),
    status: formData.get("status") === "done" ? "done" : "active",
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const user = await requireClient()
  const supabase = await createClient()
  if (parsed.data.id) {
    const { error } = await supabase
      .from("vehicle_notes")
      .update({
        vehicle_id: parsed.data.vehicleId,
        title: parsed.data.title,
        content: parsed.data.content,
        status: parsed.data.status,
      })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
    if (error) return failure("Не удалось обновить заметку.")
  } else {
    const { error } = await supabase.from("vehicle_notes").insert({
      vehicle_id: parsed.data.vehicleId,
      user_id: user.id,
      title: parsed.data.title,
      content: parsed.data.content,
      status: parsed.data.status,
    })
    if (error) return failure("Не удалось сохранить заметку. Проверьте, что автомобиль привязан к вам.")
  }
  refresh()
  return success("Заметка сохранена")
}

export async function deleteNote(formData: FormData) {
  const id = String(formData.get("id") ?? "")
  const user = await requireClient()
  const supabase = await createClient()
  await supabase.from("vehicle_notes").delete().eq("id", id).eq("user_id", user.id)
  refresh()
}

export async function saveService(values: ServiceFormValues, intent: "draft" | "preview" | "publish"): Promise<ActionResult> {
  const { supabase } = await requireAdmin()
  const parsed = (intent === "publish" ? servicePublishSchema : serviceDraftSchema).safeParse(toServiceDraft(values))
  if (!parsed.success) return validationFailure(parsed.error)
  const serviceDate = dateTimeLocalToIso(parsed.data.serviceDate)
  if (!serviceDate) return failure("Укажите корректные дату и время.")

  const payload = {
    id: parsed.data.id,
    vehicle_id: parsed.data.vehicleId,
    customer_id: parsed.data.customerId,
    service_date: serviceDate,
    mileage: parsed.data.mileage,
    work_order_number: parsed.data.workOrderNumber,
    performed_by: parsed.data.performedBy,
    general_comment: parsed.data.generalComment,
    next_service_mileage: parsed.data.nextServiceMileage,
    next_service_date: parsed.data.nextServiceDate,
    master_recommendations: parsed.data.masterRecommendations,
    items: parsed.data.items.map((item) => ({
      client_key: item.clientKey,
      category_id: item.categoryId,
      service_name: item.serviceName,
      description: item.description,
      labor_price: item.laborPrice ? moneyOrZero(item.laborPrice) : "0.00",
      is_completed: item.isCompleted,
      technical_details: item.technicalDetails,
    })),
    parts: parsed.data.parts.map((part) => ({
      item_client_key: part.itemClientKey,
      name: part.name,
      manufacturer: part.manufacturer,
      article_number: part.articleNumber,
      quantity: part.quantity.replace(",", "."),
      unit: part.unit,
      unit_price: part.unitPrice ? moneyOrZero(part.unitPrice) : "0.00",
    })),
  }

  const saved = await supabase.rpc("save_service_record", { payload })
  if (saved.error || !saved.data) return failure(translateDbError(saved.error, "Не удалось сохранить обслуживание."))
  const id = String(saved.data)
  if (intent === "publish") {
    const published = await supabase.rpc("publish_service_record", { p_id: id })
    if (published.error) {
      return failure(translateDbError(published.error, "Черновик сохранён, но опубликовать запись не удалось."))
    }
  }
  refresh()
  return success(
    intent === "publish" ? "Обслуживание опубликовано в сервисной книжке" : "Черновик сохранён",
    { id },
  )
}

export async function cancelService(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = cancelSchema.safeParse({ id: formData.get("id"), reason: formData.get("reason") })
  if (!parsed.success) return validationFailure(parsed.error)
  const { supabase } = await requireAdmin()
  const { error } = await supabase.rpc("cancel_service_record", { p_id: parsed.data.id, p_reason: parsed.data.reason })
  if (error) return failure(translateDbError(error, "Не удалось отменить запись."))
  refresh()
  return success("Запись отменена. Она остаётся в истории со статусом отмены.")
}

export async function deleteDraft(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(formData.get("id"))
  if (!id.success) return failure("Некорректная запись.")
  const { supabase } = await requireAdmin()
  const { error } = await supabase.rpc("delete_draft_service_record", { p_id: id.data })
  if (error) return failure(translateDbError(error, "Не удалось удалить черновик."))
  refresh()
  redirect("/admin/services")
}

export async function uploadAttachment(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const recordId = String(formData.get("recordId") ?? "")
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return failure("Выберите файл.")
  if (file.size > 5 * 1024 * 1024) return failure("Файл больше 5 МБ.")
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
  if (!allowed.includes(file.type)) return failure("Допустимы JPG, PNG, WebP и PDF.")
  const { supabase, user } = await requireAdmin()
  const path = `${recordId}/${crypto.randomUUID()}-${file.name.replace(/[^\w.()-]+/g, "_")}`
  const uploaded = await supabase.storage.from("service-attachments").upload(path, file, { contentType: file.type })
  if (uploaded.error) return failure("Не удалось загрузить файл.")
  const { error } = await supabase.from("service_record_attachments").insert({
    service_record_id: recordId,
    file_path: path,
    file_name: file.name,
    content_type: file.type,
    uploaded_by: user.id,
  })
  if (error) return failure("Файл загружен, но не прикрепился к заказ-наряду.")
  refresh()
  return success("Файл прикреплён")
}

export async function saveCategory(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = categorySchema.safeParse({
    id: String(formData.get("id") ?? "") || null,
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    templateKey: formData.get("templateKey") || "generic",
    isActive: formData.get("isActive") === "on",
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const { supabase } = await requireAdmin()
  const slugBase = slugify(parsed.data.name)
  if (parsed.data.id) {
    const { error } = await supabase
      .from("service_categories")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
        template_key: parsed.data.templateKey,
        is_active: parsed.data.isActive,
      })
      .eq("id", parsed.data.id)
    if (error) return failure("Не удалось обновить категорию.")
  } else {
    const { error } = await supabase.from("service_categories").insert({
      name: parsed.data.name,
      slug: `${slugBase}-${crypto.randomUUID().slice(0, 8)}`,
      description: parsed.data.description || null,
      template_key: parsed.data.templateKey,
      is_active: parsed.data.isActive,
    })
    if (error) return failure("Не удалось добавить категорию.")
  }
  refresh()
  return success("Справочник обновлён")
}

export async function saveInterval(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const mileage = String(formData.get("nextMileage") ?? "")
  const parsed = intervalSchema.safeParse({
    vehicleId: formData.get("vehicleId"),
    categoryId: String(formData.get("categoryId") ?? "") || null,
    nextMileage: mileage.trim() === "" ? null : Number(mileage),
    nextDate: String(formData.get("nextDate") ?? "") || null,
    note: formData.get("note") ?? "",
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const { supabase, user } = await requireAdmin()
  const { error } = await supabase.from("service_intervals").insert({
    vehicle_id: parsed.data.vehicleId,
    category_id: parsed.data.categoryId,
    next_mileage: parsed.data.nextMileage,
    next_date: parsed.data.nextDate,
    note: parsed.data.note || null,
    created_by: user.id,
  })
  if (error) return failure(translateDbError(error, "Не удалось сохранить интервал."))
  refresh()
  return success("Интервал назначен только этому автомобилю")
}

export async function deleteInterval(formData: FormData) {
  const { supabase } = await requireAdmin()
  await supabase.from("service_intervals").delete().eq("id", String(formData.get("id") ?? ""))
  refresh()
}

export async function saveSettings(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse({
    phoneDisplay: formData.get("phoneDisplay"),
    phoneHref: formData.get("phoneHref"),
    address: formData.get("address"),
    about: formData.get("about"),
    mapUrl: formData.get("mapUrl"),
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const { supabase, user } = await requireAdmin()
  const entries = [
    ["phone_display", parsed.data.phoneDisplay],
    ["phone_href", parsed.data.phoneHref],
    ["address", parsed.data.address],
    ["about", parsed.data.about],
    ["map_url", parsed.data.mapUrl],
  ] as const
  for (const [key, value] of entries) {
    const { error } = await supabase.from("app_settings").upsert({
      key,
      value,
      updated_by: user.id,
    })
    if (error) return failure("Не удалось сохранить настройки.")
  }
  refresh()
  revalidatePath("/")
  return success("Настройки автосервиса сохранены")
}

export async function issueBookLink(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const customerId = z.uuid().safeParse(formData.get("customerId"))
  const vehicleRaw = String(formData.get("vehicleId") ?? "")
  const vehicleId = vehicleRaw ? z.uuid().safeParse(vehicleRaw) : null
  if (!customerId.success || (vehicleId && !vehicleId.success)) return failure("Некорректная карточка.")
  const { supabase } = await requireAdmin()
  const { token, hash } = createBookToken()
  const { error } = await supabase.rpc("issue_access_grant", {
    p_customer: customerId.data,
    p_vehicle: vehicleId ? vehicleId.data : null,
    p_token_hash: hash,
  })
  if (error) return failure(translateDbError(error, "Не удалось создать ссылку. Примените миграцию персональных ссылок."))
  refresh()
  return success("Ссылка создана. Скопируйте её сейчас: повторно система её не показывает.", {
    secretLink: `${await getSiteUrl()}/book/${token}`,
  })
}

export async function revokeBookLink(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const id = z.uuid().safeParse(formData.get("id"))
  if (!id.success) return failure("Некорректная ссылка.")
  const { supabase } = await requireAdmin()
  const { error } = await supabase.rpc("revoke_access_grant", { p_id: id.data })
  if (error) return failure(translateDbError(error, "Не удалось отозвать ссылку."))
  refresh()
  return success("Ссылка отозвана. Старый адрес больше не открывает книжку.")
}

export async function saveBookNote(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "")
  if (!isBookToken(token)) return failure("Ссылка недействительна или отозвана.")
  const parsed = noteSchema.safeParse({
    id: String(formData.get("id") ?? "") || null,
    vehicleId: formData.get("vehicleId"),
    title: formData.get("title"),
    content: formData.get("content"),
    status: formData.get("status") === "done" ? "done" : "active",
  })
  if (!parsed.success) return validationFailure(parsed.error)
  const supabase = await createClient()
  const { error } = await supabase.rpc("book_save_note", {
    p_token_hash: hashBookToken(token),
    p_note_id: parsed.data.id,
    p_vehicle_id: parsed.data.vehicleId,
    p_title: parsed.data.title,
    p_content: parsed.data.content,
    p_status: parsed.data.status,
  })
  if (error) return failure(translateDbError(error, "Не удалось сохранить заметку."))
  refresh()
  return success("Заметка сохранена")
}

export async function deleteBookNote(_state: ActionResult, formData: FormData): Promise<ActionResult> {
  const token = String(formData.get("token") ?? "")
  const id = z.uuid().safeParse(formData.get("id"))
  if (!isBookToken(token) || !id.success) return failure("Ссылка недействительна или отозвана.")
  const supabase = await createClient()
  const { error } = await supabase.rpc("book_delete_note", {
    p_token_hash: hashBookToken(token),
    p_note_id: id.data,
  })
  if (error) return failure(translateDbError(error, "Не удалось удалить заметку."))
  refresh()
  return success("Заметка удалена")
}
