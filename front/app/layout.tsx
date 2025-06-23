import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { cookies, headers } from "next/headers"
import ClientLayout from "@/components/providers/client-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Facturación",
  description: "Gestión de facturas y XML",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"
  
  // Detectar si estamos en la página de login
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || ''
  const isLoginPage = pathname === '/login'

  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientLayout isLoginPage={isLoginPage} defaultOpen={defaultOpen}>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}
