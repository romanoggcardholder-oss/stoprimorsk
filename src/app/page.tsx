import { Suspense } from "react"
import { connection } from "next/server"
import { HomePage } from "@/components/public/home"
import { defaultWorkshopInfo } from "@/lib/config"
import { getWorkshopInfo } from "@/lib/data/read"

export default function Page() {
  return (
    <Suspense fallback={<HomePage info={defaultWorkshopInfo()} />}>
      <LiveHome />
    </Suspense>
  )
}

async function LiveHome() {
  await connection()
  const info = await getWorkshopInfo()
  return <HomePage info={info} />
}
