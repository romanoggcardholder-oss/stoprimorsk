import { Suspense } from "react"
import { NoteManager } from "@/components/client/note-manager"
import { getClientCabinet, listOwnNotes } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"

export const metadata = { title: "Мои заметки" }

export default function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicle?: string }>
}) {
  return (
    <Suspense fallback={<p>Загрузка заметок…</p>}>
      <NotesContent searchParams={searchParams} />
    </Suspense>
  )
}

async function NotesContent({ searchParams }: { searchParams: Promise<{ vehicle?: string }> }) {
  if (!hasSupabaseEnv()) return null
  const params = await searchParams
  const [{ notes }, cabinet] = await Promise.all([listOwnNotes(), getClientCabinet()])
  return (
    <NoteManager
      notes={notes}
      vehicles={cabinet.vehicles.map((vehicle) => ({
        id: vehicle.id,
        label: `${vehicle.make} ${vehicle.model}`,
      }))}
      initialVehicleId={params.vehicle}
    />
  )
}
