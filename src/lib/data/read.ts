import "server-only"

import { labelOf, fuelTypes, transmissionTypes } from "@/lib/catalog"
import { requireAdmin, requireClient, requireUser } from "@/lib/auth/session"
import { canReadServiceRecord } from "@/lib/access"
import { createClient, hasSupabaseEnv } from "@/lib/supabase/server"
import { defaultWorkshopInfo, type WorkshopInfo } from "@/lib/config"
import { pageNumber, readParam, sanitizeSearch } from "@/lib/search"
import type {
  PageResult,
  Profile,
  ServiceCategory,
  ServiceInterval,
  ServiceRecordView,
  Vehicle,
  VehicleClaim,
  VehicleNote,
} from "@/lib/types"

const pageSize = 12

function textDetails(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const details: Record<string, string> = {}
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.trim()) details[key] = item
    else if (typeof item === "number" || typeof item === "boolean") details[key] = String(item)
  }
  return details
}

async function signedUrl(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bucket: string,
  path: string | null,
) {
  if (!path) return null
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 30)
  return data?.signedUrl ?? null
}

export async function getWorkshopInfo(): Promise<WorkshopInfo> {
  const fallback = defaultWorkshopInfo()
  if (!hasSupabaseEnv()) return fallback
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.from("app_settings").select("key, value")
    if (error || !data) return fallback
    const map = new Map(data.map((row) => [row.key, typeof row.value === "string" ? row.value : fallback.about]))
    return {
      ...fallback,
      phoneDisplay: map.get("phone_display") || fallback.phoneDisplay,
      phoneHref: map.get("phone_href") || fallback.phoneHref,
      address: map.get("address") || fallback.address,
      about: map.get("about") || fallback.about,
      mapUrl: map.get("map_url") || fallback.mapUrl,
      description: map.get("about") || fallback.description,
    }
  } catch {
    return fallback
  }
}

export async function listCategories(includeInactive = false) {
  const supabase = await createClient()
  let query = supabase
    .from("service_categories")
    .select("id, name, slug, description, template_key, is_active, sort_order")
    .order("sort_order")
  if (!includeInactive) query = query.eq("is_active", true)
  const { data } = await query
  return (data ?? []).map(
    (row): ServiceCategory => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      templateKey: row.template_key,
      isActive: row.is_active,
      sortOrder: row.sort_order,
    }),
  )
}

function mapVehicle(row: {
  id: string
  owner_id: string
  make: string
  model: string
  year: number | null
  vin: string | null
  license_plate: string | null
  engine_info: string | null
  fuel_type: Vehicle["fuelType"]
  transmission_type: Vehicle["transmissionType"]
  current_mileage: number
  image_path: string | null
  notes: string | null
  is_demo: boolean
  created_at: string
  owner_first_name?: string
  owner_last_name?: string
  owner_phone?: string | null
  owner_email?: string | null
}, imageUrl: string | null): Vehicle {
  return {
    id: row.id,
    ownerId: row.owner_id,
    make: row.make,
    model: row.model,
    year: row.year,
    vin: row.vin,
    licensePlate: row.license_plate,
    engineInfo: row.engine_info,
    fuelType: row.fuel_type,
    transmissionType: row.transmission_type,
    currentMileage: row.current_mileage,
    imagePath: row.image_path,
    imageUrl,
    notes: row.notes,
    isDemo: row.is_demo,
    createdAt: row.created_at,
    ownerName: row.owner_last_name ? `${row.owner_last_name} ${row.owner_first_name ?? ""}`.trim() : undefined,
    ownerPhone: row.owner_phone,
    ownerEmail: row.owner_email,
  }
}

export async function getClientCabinet() {
  const user = await requireClient()
  const supabase = await createClient()
  const { data: vehicleRows } = await supabase
    .from("vehicles")
    .select("id, owner_id, make, model, year, vin, license_plate, engine_info, fuel_type, transmission_type, current_mileage, image_path, notes, is_demo, created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })

  const vehicles = await Promise.all(
    (vehicleRows ?? []).map(async (row) => mapVehicle(row, await signedUrl(supabase, "vehicle-images", row.image_path))),
  )
  const ids = vehicles.map((vehicle) => vehicle.id)

  const records = ids.length
    ? (
        await supabase
          .from("service_records")
          .select("id, vehicle_id, service_date, mileage, next_service_mileage, next_service_date, service_record_items(service_name)")
          .in("vehicle_id", ids)
          .eq("status", "published")
          .order("service_date", { ascending: false })
      ).data ?? []
    : []

  const intervals = ids.length
    ? (
        await supabase
          .from("service_intervals")
          .select("id, vehicle_id, category_id, next_mileage, next_date, note, category:service_categories(name)")
          .in("vehicle_id", ids)
      ).data ?? []
    : []

  const { data: noteRows } = await supabase
    .from("vehicle_notes")
    .select("id, vehicle_id, user_id, title, content, status, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(8)

  return {
    user,
    vehicles,
    records,
    intervals: (intervals ?? []).map((row): ServiceInterval => {
      const category = Array.isArray(row.category) ? row.category[0] : row.category
      return {
        id: row.id,
        vehicleId: row.vehicle_id,
        categoryId: row.category_id,
        categoryName: category?.name ?? null,
        nextMileage: row.next_mileage,
        nextDate: row.next_date,
        note: row.note,
      }
    }),
    notes: (noteRows ?? []).map(mapNote),
  }
}

function mapNote(row: {
  id: string
  vehicle_id: string
  user_id: string | null
  title: string
  content: string
  status: "active" | "done"
  created_at: string
  updated_at: string
  vehicle?: { make: string; model: string } | { make: string; model: string }[] | null
}): VehicleNote {
  const vehicle = Array.isArray(row.vehicle) ? row.vehicle[0] : row.vehicle
  return {
    id: row.id,
    vehicleId: row.vehicle_id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    vehicleLabel: vehicle ? `${vehicle.make} ${vehicle.model}` : undefined,
  }
}

export async function getOwnedVehicle(id: string) {
  const user = await requireClient()
  const supabase = await createClient()
  const { data } = await supabase
    .from("vehicles")
    .select("id, owner_id, make, model, year, vin, license_plate, engine_info, fuel_type, transmission_type, current_mileage, image_path, notes, is_demo, created_at")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle()
  if (!data) return null
  return { user, vehicle: mapVehicle(data, await signedUrl(supabase, "vehicle-images", data.image_path)) }
}

export async function listOwnNotes() {
  const user = await requireClient()
  const supabase = await createClient()
  const { data } = await supabase
    .from("vehicle_notes")
    .select("id, vehicle_id, user_id, title, content, status, created_at, updated_at, vehicle:vehicles(make, model)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
  return { user, notes: (data ?? []).map(mapNote) }
}

async function assembleRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  id: string,
): Promise<ServiceRecordView | null> {
  const { data: record } = await supabase
    .from("service_records")
    .select(
      "id, vehicle_id, customer_id, service_date, mileage, work_order_number, performed_by, general_comment, status, labor_total, parts_total, grand_total, next_service_mileage, next_service_date, master_recommendations, cancellation_reason, published_at, is_demo, vehicle:vehicles(make, model, license_plate, owner_id), customer:profiles!service_records_customer_id_fkey(first_name, last_name)",
    )
    .eq("id", id)
    .maybeSingle()
  if (!record || (record.status !== "draft" && record.status !== "published" && record.status !== "cancelled")) {
    return null
  }

  const vehicle = Array.isArray(record.vehicle) ? record.vehicle[0] : record.vehicle
  const customer = Array.isArray(record.customer) ? record.customer[0] : record.customer
  const user = await requireUser()
  if (
    !canReadServiceRecord({
      role: user.role,
      userId: user.id,
      status: record.status,
      customerId: record.customer_id,
      ownerId: vehicle?.owner_id ?? "",
    })
  ) {
    return null
  }

  const [{ data: items }, { data: parts }, { data: files }] = await Promise.all([
    supabase
      .from("service_record_items")
      .select("id, category_id, service_name, description, technical_details, is_completed, total_price, category:service_categories(name, template_key)")
      .eq("service_record_id", id)
      .order("created_at"),
    supabase
      .from("parts_used")
      .select("id, service_record_item_id, name, manufacturer, article_number, quantity, unit, unit_price, total_price")
      .eq("service_record_id", id)
      .order("created_at"),
    supabase
      .from("service_record_attachments")
      .select("id, file_name, content_type, file_path")
      .eq("service_record_id", id)
      .order("created_at"),
  ])

  const attachments = await Promise.all(
    (files ?? []).map(async (file) => ({
      id: file.id,
      fileName: file.file_name,
      contentType: file.content_type,
      url: await signedUrl(supabase, "service-attachments", file.file_path),
    })),
  )

  return {
    id: record.id,
    vehicleId: record.vehicle_id,
    customerId: record.customer_id,
    serviceDate: record.service_date,
    mileage: record.mileage,
    workOrderNumber: record.work_order_number,
    performedBy: record.performed_by,
    generalComment: record.general_comment,
    status: record.status,
    laborTotal: String(record.labor_total),
    partsTotal: String(record.parts_total),
    grandTotal: String(record.grand_total),
    nextServiceMileage: record.next_service_mileage,
    nextServiceDate: record.next_service_date,
    masterRecommendations: record.master_recommendations,
    cancellationReason: record.cancellation_reason,
    publishedAt: record.published_at,
    isDemo: record.is_demo,
    vehicleLabel: vehicle ? `${vehicle.make} ${vehicle.model}` : undefined,
    licensePlate: vehicle?.license_plate,
    customerName: customer ? `${customer.last_name} ${customer.first_name}` : undefined,
    items: (items ?? []).map((item) => {
      const category = Array.isArray(item.category) ? item.category[0] : item.category
      return {
        id: item.id,
        categoryId: item.category_id,
        categoryName: category?.name ?? null,
        templateKey: category?.template_key ?? null,
        serviceName: item.service_name,
        description: item.description,
        technicalDetails: textDetails(item.technical_details),
        isCompleted: item.is_completed,
        totalPrice: String(item.total_price),
      }
    }),
    parts: (parts ?? []).map((part) => ({
      id: part.id,
      itemId: part.service_record_item_id,
      name: part.name,
      manufacturer: part.manufacturer,
      articleNumber: part.article_number,
      quantity: String(part.quantity),
      unit: part.unit,
      unitPrice: String(part.unit_price),
      totalPrice: String(part.total_price),
    })),
    attachments,
  }
}

export async function getServiceRecord(id: string) {
  const supabase = await createClient()
  return assembleRecord(supabase, id)
}

export async function listPublishedHistory(vehicleId: string) {
  const owned = await getOwnedVehicle(vehicleId)
  if (!owned) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from("service_records")
    .select("id")
    .eq("vehicle_id", vehicleId)
    .eq("status", "published")
    .order("service_date", { ascending: false })
  const records = []
  for (const row of data ?? []) {
    const record = await assembleRecord(supabase, row.id)
    if (record) records.push(record)
  }
  return { ...owned, records }
}

export async function getAdminDashboard() {
  const { supabase, user } = await requireAdmin()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const chartStart = new Date(monthStart)
  chartStart.setMonth(chartStart.getMonth() - 5)

  const [customers, vehicles, records, monthRecords, recentRecords, recentCustomers, chartRows] =
    await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client"),
      supabase.from("vehicles").select("id", { count: "exact", head: true }),
      supabase.from("service_records").select("id", { count: "exact", head: true }),
      supabase
        .from("service_records")
        .select("id", { count: "exact", head: true })
        .gte("service_date", monthStart.toISOString()),
      supabase
        .from("service_directory")
        .select("id, service_date, status, make, model, license_plate, first_name, last_name, grand_total")
        .order("service_date", { ascending: false })
        .limit(6),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, phone, email, created_at, is_demo")
        .eq("role", "client")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("service_records").select("service_date").gte("service_date", chartStart.toISOString()),
    ])

  return {
    user,
    customers: customers.count ?? 0,
    vehicles: vehicles.count ?? 0,
    records: records.count ?? 0,
    monthRecords: monthRecords.count ?? 0,
    recentRecords: recentRecords.data ?? [],
    recentCustomers: (recentCustomers.data ?? []) as ProfileRow[],
    chartRows: chartRows.data ?? [],
  }
}

type ProfileRow = {
  id: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  created_at: string
  is_demo: boolean
}

export function mapProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    role: "client",
    isDemo: row.is_demo,
    createdAt: row.created_at,
  }
}

export async function listCustomers(params: Record<string, string | string[] | undefined>): Promise<PageResult<Profile>> {
  const { supabase } = await requireAdmin()
  const page = pageNumber(params.page)
  const queryText = sanitizeSearch(readParam(params.q))
  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, email, created_at, is_demo", { count: "exact" })
    .eq("role", "client")
    .order("created_at", { ascending: false })
  if (queryText) {
    query = query.or(
      `first_name.ilike.%${queryText}%,last_name.ilike.%${queryText}%,phone.ilike.%${queryText}%,email.ilike.%${queryText}%`,
    )
  }
  const from = (page - 1) * pageSize
  const { data, count } = await query.range(from, from + pageSize - 1)
  return { items: (data ?? []).map(mapProfile), page, pageSize, total: count ?? 0 }
}

export async function getCustomerCard(id: string) {
  const { supabase, user } = await requireAdmin()
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, phone, email, created_at, is_demo, role")
    .eq("id", id)
    .maybeSingle()
  if (!profile || profile.role !== "client") return null
  const [{ data: vehicles }, { data: records }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, owner_id, make, model, year, vin, license_plate, engine_info, fuel_type, transmission_type, current_mileage, image_path, notes, is_demo, created_at")
      .eq("owner_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_directory")
      .select("id, service_date, status, make, model, license_plate, grand_total, mileage")
      .eq("customer_id", id)
      .order("service_date", { ascending: false })
      .limit(30),
  ])
  const vehicleIds = (vehicles ?? []).map((row) => row.id)
  const { data: notes } = vehicleIds.length
    ? await supabase
        .from("vehicle_notes")
        .select("id, vehicle_id, user_id, title, content, status, created_at, updated_at, vehicle:vehicles(make, model)")
        .in("vehicle_id", vehicleIds)
        .order("updated_at", { ascending: false })
    : { data: [] }
  return {
    user,
    profile: mapProfile(profile),
    vehicles: await Promise.all(
      (vehicles ?? []).map(async (row) => mapVehicle(row, await signedUrl(supabase, "vehicle-images", row.image_path))),
    ),
    records: records ?? [],
    notes: (notes ?? []).map(mapNote),
  }
}

export async function listActiveBookLinks(customerId: string) {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from("access_grants")
    .select("id, vehicle_id, created_at")
    .eq("customer_id", customerId)
    .is("revoked_at", null)
  if (error) return null
  return (data ?? []).map((row) => ({
    id: row.id as string,
    vehicleId: (row.vehicle_id as string | null) ?? null,
    createdAt: row.created_at as string,
  }))
}

export async function listVehicleDirectory(params: Record<string, string | string[] | undefined>) {
  const { supabase } = await requireAdmin()
  const page = pageNumber(params.page)
  const queryText = sanitizeSearch(readParam(params.q))
  let query = supabase
    .from("vehicle_directory")
    .select(
      "id, owner_id, make, model, year, vin, license_plate, engine_info, fuel_type, transmission_type, current_mileage, image_path, notes, is_demo, created_at, owner_first_name, owner_last_name, owner_phone, owner_email",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
  if (queryText) {
    query = query.or(
      `license_plate.ilike.%${queryText}%,vin.ilike.%${queryText}%,make.ilike.%${queryText}%,model.ilike.%${queryText}%,owner_first_name.ilike.%${queryText}%,owner_last_name.ilike.%${queryText}%,owner_phone.ilike.%${queryText}%`,
    )
  }
  const from = (page - 1) * pageSize
  const { data, count } = await query.range(from, from + pageSize - 1)
  const items = await Promise.all(
    (data ?? []).map(async (row) => mapVehicle(row, await signedUrl(supabase, "vehicle-images", row.image_path))),
  )
  return { items, page, pageSize, total: count ?? 0 }
}

export async function getAdminVehicle(id: string) {
  const { supabase, user } = await requireAdmin()
  const { data } = await supabase.from("vehicle_directory").select("*").eq("id", id).maybeSingle()
  if (!data) return null
  const [{ data: records }, { data: intervals }, { data: claims }] = await Promise.all([
    supabase
      .from("service_directory")
      .select("id, service_date, status, mileage, grand_total, performed_by")
      .eq("vehicle_id", id)
      .order("service_date", { ascending: false }),
    supabase
      .from("service_intervals")
      .select("id, vehicle_id, category_id, next_mileage, next_date, note, category:service_categories(name)")
      .eq("vehicle_id", id),
    supabase.from("vehicle_claims").select("id, status").eq("created_vehicle_id", id),
  ])
  return {
    user,
    vehicle: mapVehicle(data, await signedUrl(supabase, "vehicle-images", data.image_path)),
    records: records ?? [],
    intervals: (intervals ?? []).map((row): ServiceInterval => {
      const category = Array.isArray(row.category) ? row.category[0] : row.category
      return {
        id: row.id,
        vehicleId: row.vehicle_id,
        categoryId: row.category_id,
        categoryName: category?.name ?? null,
        nextMileage: row.next_mileage,
        nextDate: row.next_date,
        note: row.note,
      }
    }),
    fuelLabel: labelOf(fuelTypes, data.fuel_type),
    transmissionLabel: labelOf(transmissionTypes, data.transmission_type),
    claims: claims ?? [],
  }
}

export async function listServiceDirectory(params: Record<string, string | string[] | undefined>) {
  const { supabase } = await requireAdmin()
  const page = pageNumber(params.page)
  const queryText = sanitizeSearch(readParam(params.q))
  const status = readParam(params.status)
  const fromDate = readParam(params.from)
  const toDate = readParam(params.to)
  const performer = sanitizeSearch(readParam(params.performer))
  const categoryId = readParam(params.category)
  let allowedIds: string[] | null = null
  if (categoryId) {
    const { data } = await supabase.from("service_record_items").select("service_record_id").eq("category_id", categoryId)
    allowedIds = [...new Set((data ?? []).map((row) => row.service_record_id))]
    if (allowedIds.length === 0) return { items: [], page, pageSize, total: 0 }
  }
  let query = supabase
    .from("service_directory")
    .select(
      "id, service_date, mileage, status, make, model, license_plate, vin, first_name, last_name, phone, performed_by, grand_total, work_order_number",
      { count: "exact" },
    )
    .order("service_date", { ascending: false })
  if (queryText) {
    query = query.or(
      `license_plate.ilike.%${queryText}%,vin.ilike.%${queryText}%,make.ilike.%${queryText}%,model.ilike.%${queryText}%,first_name.ilike.%${queryText}%,last_name.ilike.%${queryText}%,phone.ilike.%${queryText}%,work_order_number.ilike.%${queryText}%`,
    )
  }
  if (status === "draft" || status === "published" || status === "cancelled") query = query.eq("status", status)
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) query = query.gte("service_date", `${fromDate}T00:00:00+03:00`)
  if (/^\d{4}-\d{2}-\d{2}$/.test(toDate)) query = query.lte("service_date", `${toDate}T23:59:59+03:00`)
  if (performer) query = query.ilike("performed_by", `%${performer}%`)
  if (allowedIds) query = query.in("id", allowedIds)
  const from = (page - 1) * pageSize
  const { data, count } = await query.range(from, from + pageSize - 1)
  return { items: data ?? [], page, pageSize, total: count ?? 0 }
}

export async function listPendingClaims() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from("vehicle_claims")
    .select("id, user_id, make, model, year, vin, license_plate, comment, status, created_at, profile:profiles!vehicle_claims_user_id_fkey(first_name, last_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
  return (data ?? []).map((row): VehicleClaim => {
    const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
    return {
      id: row.id,
      userId: row.user_id,
      make: row.make,
      model: row.model,
      year: row.year,
      vin: row.vin,
      licensePlate: row.license_plate,
      comment: row.comment,
      status: row.status,
      createdAt: row.created_at,
      userName: profile ? `${profile.last_name} ${profile.first_name}` : undefined,
    }
  })
}

export async function listAudit(entityId: string) {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, created_at, actor:profiles!audit_logs_actor_id_fkey(first_name, last_name)")
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(12)
  return (data ?? []).map((row) => {
    const actor = Array.isArray(row.actor) ? row.actor[0] : row.actor
    return {
      id: row.id,
      action: row.action,
      createdAt: row.created_at,
      actorName: actor ? `${actor.last_name} ${actor.first_name}` : "Система",
    }
  })
}

export { fuelTypes, transmissionTypes }
