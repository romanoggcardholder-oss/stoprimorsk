import { loadEnvFile } from "node:process"

for (const file of [".env", ".env.local"]) {
  try {
    loadEnvFile(file)
  } catch {
    // Файла может не быть: скрипт читает уже заданные переменные окружения.
  }
}
