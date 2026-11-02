import { createClient } from "@supabase/supabase-js"
import "./load-env.ts"

if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_SEED !== "true") {
  console.error("Демонстрационные данные не загружены. Для локальной базы задайте ALLOW_DEMO_SEED=true и не запускайте скрипт в production.")
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const password = process.env.DEMO_PASSWORD
if (!url || !key || !password || password.length < 8) {
  console.error("Нужны NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY и DEMO_PASSWORD длиной от 8 символов.")
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
const people = [
  { email: "demo.ivanov@example.com", first: "Иван", last: "Иванов", phone: "+79890000001", make: "Toyota", model: "Camry", plate: "А000АА123", vin: "TESTVIN000000001" },
  { email: "demo.petrova@example.com", first: "Мария", last: "Петрова", phone: "+79890000002", make: "Kia", model: "Rio", plate: "В000ВВ123", vin: "TESTVIN000000002" },
  { email: "demo.sidorov@example.com", first: "Павел", last: "Сидоров", phone: "+79890000003", make: "Hyundai", model: "Solaris", plate: "С000СС123", vin: "TESTVIN000000003" },
]

console.log("Загружаются ТЕСТОВЫЕ данные. Это не настоящие клиенты.")

for (const person of people) {
  const { data: profile } = await admin.from("profiles").select("id").eq("email", person.email).maybeSingle()
  let userId = profile?.id as string | undefined
  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email: person.email,
      password,
      email_confirm: true,
      user_metadata: { first_name: person.first, last_name: person.last, phone: person.phone },
    })
    if (created.error || !created.data.user) {
      console.error(person.email, created.error?.message)
      continue
    }
    userId = created.data.user.id
  }
  await admin.from("profiles").update({
    first_name: person.first,
    last_name: person.last,
    phone: person.phone,
    is_demo: true,
    role: "client",
  }).eq("id", userId)

  const { data: vehicle } = await admin.from("vehicles").select("id").eq("vin", person.vin).maybeSingle()
  let vehicleId = vehicle?.id as string | undefined
  if (!vehicleId) {
    const inserted = await admin.from("vehicles").insert({
      owner_id: userId,
      make: person.make,
      model: person.model,
      year: 2018,
      vin: person.vin,
      license_plate: person.plate,
      fuel_type: "petrol",
      transmission_type: "automatic",
      current_mileage: 84200,
      notes: "ТЕСТОВАЯ запись",
      is_demo: true,
    }).select("id").single()
    vehicleId = inserted.data?.id
  }
  if (!vehicleId) continue

  const { data: existingRecord } = await admin.from("service_records").select("id").eq("vehicle_id", vehicleId).eq("is_demo", true).maybeSingle()
  if (existingRecord?.id) continue
  const { data: category } = await admin.from("service_categories").select("id").eq("slug", "engine-oil").maybeSingle()
  const record = await admin.from("service_records").insert({
    vehicle_id: vehicleId,
    customer_id: userId,
    service_date: new Date().toISOString(),
    mileage: 84200,
    work_order_number: "ТЕСТ-1",
    performed_by: "Тестовый мастер",
    general_comment: "ТЕСТОВАЯ запись обслуживания",
    status: "published",
    labor_total: 1500,
    parts_total: 3200,
    grand_total: 4700,
    next_service_mileage: 94200,
    master_recommendations: "ТЕСТ: проверить уровень масла через неделю",
    published_at: new Date().toISOString(),
    is_demo: true,
  }).select("id").single()
  if (!record.data?.id) continue
  const item = await admin.from("service_record_items").insert({
    service_record_id: record.data.id,
    category_id: category?.id ?? null,
    service_name: "Замена моторного масла",
    description: "ТЕСТОВАЯ работа",
    technical_details: { viscosity: "5W-30", manufacturer: "Test Oil" },
    unit_price: 1500,
    total_price: 1500,
    is_completed: true,
  }).select("id").single()
  await admin.from("parts_used").insert({
    service_record_id: record.data.id,
    service_record_item_id: item.data?.id ?? null,
    name: "Масло 5W-30 ТЕСТ",
    manufacturer: "Test Oil",
    article_number: "TEST-5W30",
    quantity: 4.5,
    unit: "л",
    unit_price: 711.11,
    total_price: 3200,
  })
  await admin.from("vehicle_notes").insert({
    vehicle_id: vehicleId,
    user_id: userId,
    title: "ТЕСТ: проверить тормоза",
    content: "Тестовая заметка клиента, не является записью сервиса.",
    status: "active",
    is_demo: true,
  })
}

console.log("Тестовые клиенты, автомобили, обслуживания и заметки отмечены как демонстрационные.")
