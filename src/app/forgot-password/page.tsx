import { AuthShell } from "@/components/auth/auth-shell"
import { ForgotForm } from "@/components/auth/auth-forms"

export const metadata = { title: "Восстановление пароля" }

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Восстановление пароля"
      text="Ссылку отправляет Supabase. Если письма нет, в проекте нужно настроить SMTP: приложение само письма не имитирует."
    >
      <ForgotForm />
    </AuthShell>
  )
}
