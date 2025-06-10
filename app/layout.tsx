import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { ReduxProvider } from "@/components/providers/redux-provider"
import { Toaster } from "@/components/ui/toaster"
import { AppSidebar } from "@/components/app-sidebar" // Importamos AppSidebar
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar" // Primitivos de shadcn/ui
import { cookies } from "next/headers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Facturación",
  description: "Gestión de facturas y XML",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = cookies() // Asegúrate de importar cookies de next/headers
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ReduxProvider>
            <SidebarProvider defaultOpen={defaultOpen}>
              {" "}
              {/* Envolvemos con SidebarProvider */}
              <div className="flex min-h-screen">
                <AppSidebar /> {/* Usamos AppSidebar */}
                <SidebarInset className="flex-1 flex flex-col">
                  {" "}
                  {/* Contenido principal */}
                  <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
                    <SidebarTrigger className="sm:hidden" /> {/* Trigger para móvil */}
                    {/* Puedes añadir Breadcrumbs u otros elementos de header aquí */}
                  </header>
                  <main className="flex-1 p-4 sm:px-6 sm:py-0">{children}</main>
                </SidebarInset>
              </div>
            </SidebarProvider>
            <Toaster />
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
