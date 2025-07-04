"use client"

import type React from "react"
import { usePathname } from "next/navigation"
import { ThemeProvider } from "@/components/theme-provider"
import ReduxProvider from "@/components/providers/redux-provider"
import { Toaster } from "@/components/ui/toaster"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AuthProvider } from "@/components/providers/auth-provider"

interface ClientLayoutProps {
  children: React.ReactNode
  isLoginPage: boolean
  defaultOpen: boolean
}

export default function ClientLayout({ children, isLoginPage, defaultOpen }: ClientLayoutProps) {
  const pathname = usePathname()
  const isLoginOrRegisterPage = pathname === '/login' || pathname === '/register'
  return (
    <ReduxProvider>
      <AuthProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster />
          {isLoginOrRegisterPage ? (
            // Layout simple para login sin sidebar
            <main className="min-h-screen">
              {children}
            </main>
          ) : (
            // Layout principal con sidebar
            <SidebarProvider defaultOpen={defaultOpen}>
              <AppSidebar />
              <SidebarInset>
                <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                  {children}
                </main>
              </SidebarInset>
            </SidebarProvider>
          )}
        </ThemeProvider>
      </AuthProvider>
    </ReduxProvider>
  )
}