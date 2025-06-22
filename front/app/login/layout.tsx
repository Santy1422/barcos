import type { Metadata } from "next"
import { ThemeProvider } from "@/components/theme-provider"
import ReduxProvider from "@/components/providers/redux-provider"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: "Login - Sistema de Facturación",
  description: "Iniciar sesión en el sistema",
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  )
}