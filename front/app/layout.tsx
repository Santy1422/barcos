import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import ReduxProvider from "@/components/providers/redux-provider"
import { Toaster } from "@/components/ui/toaster"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { cookies, headers } from "next/headers"
import { cn } from "@/lib/utils"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Sistema de Facturación",
  description: "Gestión de facturas y XML",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookieStore = cookies()
  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true"
  
  // Detectar si estamos en la página de login
  const headersList = headers()
  const pathname = headersList.get('x-pathname') || ''
  const isLoginPage = pathname === '/login'

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.className)}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ReduxProvider>
            {isLoginPage ? (
              // Layout simple para login sin sidebar
              <main className="min-h-screen">
                {children}
              </main>
            ) : (
              // Layout normal con sidebar
              <SidebarProvider defaultOpen={defaultOpen}>
                <div className="flex h-screen flex-col md:flex-row md:overflow-hidden">
                  <AppSidebar />
                  <SidebarInset className="flex-1 flex flex-col overflow-y-auto">
                    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 sm:px-6 md:justify-start">
                      <SidebarTrigger className="md:hidden" />
                    </header>
                    <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">{children}</main>
                  </SidebarInset>
                </div>
              </SidebarProvider>
            )}
            <Toaster />
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
