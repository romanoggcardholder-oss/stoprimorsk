import { AuthShell } from "@/components/auth/auth-shell"
import { ResetForm } from "@/components/auth/auth-forms"

export const metadata = { title: "Новый пароль" }

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Новый пароль" text="Откройте эту страницу по ссылке из письма, затем задайте новый пароль.">
      <ResetForm />
    </AuthShell>
  )
}
