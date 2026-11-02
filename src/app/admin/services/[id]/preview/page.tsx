import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ServiceTimeline } from "@/components/service/timeline"
import { Button } from "@/components/ui/button"
import { getServiceRecord } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p>Готовим предпросмотр…</p>}>
      <Preview params={params} />
    </Suspense>
  )
}

async function Preview({ params }: { params: Promise<{ id: string }> }) {
  if (!hasSupabaseEnv()) return null
  const { id } = await params
  const record = await getServiceRecord(id)
  if (!record) notFound()
  return (
    <div className="mx-auto grid max-w-xl gap-4">
      <p className="rounded-2xl bg-secondary p-4 text-sm">
        Так запись выглядит для клиента. Пока статус «черновик», в его книжке её нет.
      </p>
      <ServiceTimeline records={[record]} preview />
      <Button asChild>
        <Link href={`/admin/services/${record.id}`}>Вернуться к редактированию</Link>
      </Button>
    </div>
  )
}
