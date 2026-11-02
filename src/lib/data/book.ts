import "server-only"

import { z } from "zod"
import { fuelTypes, transmissionTypes } from "@/lib/catalog"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { ServiceRecordView, Vehicle, VehicleNote } from "@/lib/types"

const textValue = z.union([z.string(), z.number(), z.boolean()]).transform(String)

const detailsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).catch({})

const bookSchema = z.object({
  customer: z.object({
    first_name: z.string(),
    last_name: z.string(),
  }),
  vehicles: z.array(z.object({
    id: z.uuid(),
    make: z.string(),
    model: z.string(),
    year: z.number().int().nullable(),
    vin: z.string().nullable(),
    license_plate: z.string().nullable(),
    engine_info: z.string().nullable(),
    fuel_type: z.string(),
    transmission_type: z.string(),
    current_mileage: z.number().int(),
    image_path: z.string().nullable(),
    notes: z.string().nullable(),
    created_at: z.string(),
  })),
  records: z.array(z.object({
    id: z.uuid(),
    vehicle_id: z.uuid(),
    service_date: z.string(),
    mileage: z.number().int(),
    work_order_number: z.string().nullable(),
    performed_by: z.string().nullable(),
    general_comment: z.string().nullable(),
    labor_total: textValue,
    parts_total: textValue,
    grand_total: textValue,
    next_service_mileage: z.number().int().nullable(),
    next_service_date: z.string().nullable(),
    master_recommendations: z.string().nullable(),
    vehicle_label: z.string(),
    license_plate: z.string().nullable(),
    items: z.array(z.object({
      id: z.uuid(),
      service_name: z.string(),
      description: z.string().nullable(),
      technical_details: detailsSchema,
      is_completed: z.boolean(),
      total_price: textValue,
      category_name: z.string().nullable(),
      template_key: z.string().nullable(),
    })),
    parts: z.array(z.object({
      id: z.uuid(),
      name: z.string(),
      manufacturer: z.string().nullable(),
      article_number: z.string().nullable(),
      quantity: textValue,
      unit: z.string(),
      unit_price: textValue,
      total_price: textValue,
    })),
    attachments: z.array(z.object({
      id: z.uuid(),
      file_name: z.string(),
      content_type: z.string(),
      file_path: z.string(),
    })),
  })),
  notes: z.array(z.object({
    id: z.uuid(),
    vehicle_id: z.uuid(),
    user_id: z.uuid().nullable(),
    title: z.string(),
    content: z.string(),
    status: z.enum(["active", "done"]),
    created_at: z.string(),
    updated_at: z.string(),
    vehicle_label: z.string(),
  })),
})

export type PublicBook = {
  customerName: string
  vehicles: Vehicle[]
  records: ServiceRecordView[]
  notes: VehicleNote[]
}

function asOption<T extends string>(options: readonly { value: T }[], value: string): T {
  return options.some((item) => item.value === value) ? (value as T) : options[options.length - 1].value
}

async function signedPaths(bucket: string, paths: string[]) {
  const unique = [...new Set(paths.filter(Boolean))]
  const urls = new Map<string, string | null>()
  if (unique.length === 0) return urls
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    for (const path of unique) urls.set(path, null)
    return urls
  }
  try {
    const admin = createAdminClient()
    await Promise.all(unique.map(async (path) => {
      const { data } = await admin.storage.from(bucket).createSignedUrl(path, 60 * 30)
      urls.set(path, data?.signedUrl ?? null)
    }))
  } catch {
    for (const path of unique) urls.set(path, null)
  }
  return urls
}

export async function openPublicBook(tokenHash: string): Promise<PublicBook | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("open_service_book", { p_token_hash: tokenHash })
  if (error || !data) return null
  const parsed = bookSchema.safeParse(data)
  if (!parsed.success) return null

  const vehicleImages = await signedPaths("vehicle-images", parsed.data.vehicles.map((vehicle) => vehicle.image_path ?? ""))
  const attachmentUrls = await signedPaths(
    "service-attachments",
    parsed.data.records.flatMap((record) => record.attachments.map((file) => file.file_path)),
  )

  return {
    customerName: `${parsed.data.customer.first_name} ${parsed.data.customer.last_name}`.trim(),
    vehicles: parsed.data.vehicles.map((vehicle): Vehicle => ({
      id: vehicle.id,
      ownerId: "",
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      vin: vehicle.vin,
      licensePlate: vehicle.license_plate,
      engineInfo: vehicle.engine_info,
      fuelType: asOption(fuelTypes, vehicle.fuel_type),
      transmissionType: asOption(transmissionTypes, vehicle.transmission_type),
      currentMileage: vehicle.current_mileage,
      imagePath: null,
      imageUrl: vehicle.image_path ? vehicleImages.get(vehicle.image_path) ?? null : null,
      notes: vehicle.notes,
      isDemo: false,
      createdAt: vehicle.created_at,
    })),
    records: parsed.data.records.map((record): ServiceRecordView => ({
      id: record.id,
      vehicleId: record.vehicle_id,
      customerId: "",
      serviceDate: record.service_date,
      mileage: record.mileage,
      workOrderNumber: record.work_order_number,
      performedBy: record.performed_by,
      generalComment: record.general_comment,
      status: "published",
      laborTotal: record.labor_total,
      partsTotal: record.parts_total,
      grandTotal: record.grand_total,
      nextServiceMileage: record.next_service_mileage,
      nextServiceDate: record.next_service_date,
      masterRecommendations: record.master_recommendations,
      cancellationReason: null,
      publishedAt: record.service_date,
      isDemo: false,
      vehicleLabel: record.vehicle_label,
      licensePlate: record.license_plate,
      items: record.items.map((item) => ({
        id: item.id,
        categoryId: null,
        categoryName: item.category_name,
        templateKey: item.template_key,
        serviceName: item.service_name,
        description: item.description,
        technicalDetails: Object.fromEntries(
          Object.entries(item.technical_details).map(([key, value]) => [key, String(value)]),
        ),
        isCompleted: item.is_completed,
        totalPrice: item.total_price,
      })),
      parts: record.parts.map((part) => ({
        id: part.id,
        itemId: null,
        name: part.name,
        manufacturer: part.manufacturer,
        articleNumber: part.article_number,
        quantity: part.quantity,
        unit: part.unit,
        unitPrice: part.unit_price,
        totalPrice: part.total_price,
      })),
      attachments: record.attachments.map((file) => ({
        id: file.id,
        fileName: file.file_name,
        contentType: file.content_type,
        url: attachmentUrls.get(file.file_path) ?? null,
      })),
    })),
    notes: parsed.data.notes.map((note): VehicleNote => ({
      id: note.id,
      vehicleId: note.vehicle_id,
      userId: note.user_id,
      title: note.title,
      content: note.content,
      status: note.status,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      vehicleLabel: note.vehicle_label,
    })),
  }
}
