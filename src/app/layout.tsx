import type { Metadata, Viewport } from "next"
import { Manrope, Unbounded } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { PwaRegister } from "@/components/pwa-register"
import { workshopConfig } from "@/lib/config"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
})

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  variable: "--font-unbounded",
})

export const metadata: Metadata = {
  title: {
    default: workshopConfig.name,
    template: `%s — ${workshopConfig.name}`,
  },
  description: workshopConfig.description,
  applicationName: workshopConfig.name,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: workshopConfig.shortName,
    statusBarStyle: "default",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#FFC928",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable} h-full`}>
      <body className="min-h-full bg-background text-foreground antialiased">
        {children}
        <Toaster position="top-center" />
        <PwaRegister />
      </body>
    </html>
  )
}
