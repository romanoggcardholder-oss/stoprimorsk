import { createClient } from "@supabase/supabase-js"
import "./load-env.ts"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.ADMIN_EMAIL?.trim()
const password = process.env.ADMIN_PASSWORD
const firstName = process.env.ADMIN_FIRST_NAME?.trim() || "Администратор"
const lastName = process.env.ADMIN_LAST_NAME?.trim() || "Сервиса"
const phone = process.env.ADMIN_PHONE?.trim() || null

if (!url || !key || !email || !password) {
  console.error("Нужны NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL и ADMIN_PASSWORD.")
  process.exit(1)
}
if (password.length < 12) {
  console.error("ADMIN_PASSWORD должен быть не короче 12 символов.")
  process.exit(1)
}
if (key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error("Service role key не должен совпадать с публичным ключом.")
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

async function main() {
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle()

  let userId = existing?.id as string | undefined
  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, phone },
    })
    if (created.error || !created.data.user) {
      console.error(created.error?.message ?? "Не удалось создать пользователя")
      process.exit(1)
    }
    userId = created.data.user.id
  }

  const { error } = await admin
    .from("profiles")
    .update({ role: "admin", first_name: firstName, last_name: lastName, phone })
    .eq("id", userId)

  if (error) {
    console.error(error.message)
    process.exit(1)
  }

  console.log(`Администратор назначен: ${email}`)
  console.log("Пароль в вывод не попадает. Роль записана через service role, не из браузера.")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Не удалось создать администратора")
  process.exit(1)
})
