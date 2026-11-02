import { logout } from "@/lib/actions/auth"
import { ProfileForm } from "@/components/client/profile-form"
import { Button } from "@/components/ui/button"
import { workshopConfig } from "@/lib/config"
import { getClientCabinet } from "@/lib/data/read"
import { hasSupabaseEnv } from "@/lib/supabase/server"

export const metadata = { title: "Профиль" }

export default async function ProfilePage() {
  if (!hasSupabaseEnv()) return null
  const data = await getClientCabinet()
  return (
    <div className="grid gap-5">
      <h1 className="font-display text-3xl">Профиль</h1>
      <ProfileForm user={data.user} />
      <section className="rounded-3xl bg-white p-5">
        <h2 className="font-medium">Автомобили</h2>
        <ul className="mt-2 text-sm">
          {data.vehicles.length === 0 ? <li>Пока не привязаны</li> : null}
          {data.vehicles.map((vehicle) => (
            <li key={vehicle.id}>
              {vehicle.make} {vehicle.model} {vehicle.licensePlate ? `· ${vehicle.licensePlate}` : ""}
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-3xl bg-graphite p-5 text-white">
        <h2 className="font-display text-xl text-yellow">{workshopConfig.name}</h2>
        <a className="mt-2 block text-lg" href={workshopConfig.phoneHref}>
          {workshopConfig.phoneDisplay}
        </a>
        <p className="mt-1 text-sm text-white/70">{workshopConfig.address}</p>
        <Button className="mt-4" asChild>
          <a href={workshopConfig.mapUrl} target="_blank" rel="noreferrer">
            Маршрут
          </a>
        </Button>
      </section>
      <form action={logout}>
        <Button type="submit" variant="outline">
          Выйти
        </Button>
      </form>
    </div>
  )
}
