import "server-only"

import { createClient } from "@supabase/supabase-js"

/**
 * Клиент с service role обходит RLS.
 * Его можно вызывать только на сервере после проверки роли администратора
 * либо из защищённых скриптов. Не импортируйте этот файл в клиентские компоненты.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error("Для этой операции нужны NEXT_PUBLIC_SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY")
  }
  if (key === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Service role key совпадает с публичным ключом. Проверьте переменные окружения.")
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
