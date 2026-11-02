import type { MetadataRoute } from "next"
import { workshopConfig } from "@/lib/config"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: workshopConfig.name,
    short_name: workshopConfig.shortName,
    description: workshopConfig.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F8FA",
    theme_color: "#FFC928",
    lang: "ru",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
