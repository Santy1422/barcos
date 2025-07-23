import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cookies } from "next/headers"
import ClientLayout from "@/components/providers/client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Facturación",
  description: "Gestión de facturas y XML",
  generator: "v0.dev",
  icons: {
    icon: '/placeholder-logo.png', // Usar el logo existente como favicon
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"

  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout isLoginPage={false} defaultOpen={defaultOpen}>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
