import { CategoryForm } from "@/components/admin/record-forms"
import { Badge } from "@/components/ui/badge"
import { listCategories } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"
import { templateFor } from "@/lib/service-templates"

export const metadata = { title: "Справочник работ" }

export default async function CategoriesPage() {
  if (!hasSupabaseEnv()) return null
  const categories = await listCategories(true)
  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl">Справочник работ</h1>
      <div className="grid gap-3">
        {categories.map((category) => (
          <article key={category.id} className="rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">{category.name}</h2>
              <Badge variant={category.isActive ? "secondary" : "outline"}>{category.isActive ? "Активна" : "В архиве"}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{templateFor(category.templateKey).label}</p>
            <div className="mt-3">
              <CategoryForm category={category} />
            </div>
          </article>
        ))}
      </div>
      <CategoryForm />
    </div>
  )
}
