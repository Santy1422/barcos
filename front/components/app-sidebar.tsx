"use client"

import React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { logoutAsync, selectCurrentUser, hasModuleAccess, hasSectionAccess, canSeeDashboard, type UserRole } from "@/lib/features/auth/authSlice"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  Users,
  Ship,
  Anchor,
  Settings,
  LifeBuoy,
  LogOut,
  Truck,
  Briefcase,
  UploadCloud,
  FilePlus2,
  ListOrdered,
  BarChart3,
  Settings2,
  User,
  Plus,
  History,
  Car,
  BookOpen,
  FileText,
  Package,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "@/hooks/use-toast"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  children?: NavItem[]
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const currentUser = useAppSelector(selectCurrentUser)
  const [userEmail, setUserEmail] = React.useState("")

  React.useEffect(() => {
    const email = currentUser?.email || localStorage.getItem("userEmail") || "usuario@ejemplo.com"
    setUserEmail(email)
  }, [currentUser])

  const handleLogout = async () => {
    await dispatch(logoutAsync())
    router.push("/login")
  }

  // Helper function to check if user has any of the specified roles
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false
    const userRoles: UserRole[] = currentUser.roles || (currentUser.role ? [currentUser.role] : [])
    return roles.some(role => userRoles.includes(role))
  }

  // Filter navigation items based on user module access
  const allNavItems: NavItem[] = [
    // Dashboard - Solo para usuario específico (leandrojavier@gmail.com)
    ...(canSeeDashboard(currentUser) ? [
      { title: "Dashboard", href: "/", icon: LayoutDashboard }
    ] : []),
    // PTG/Trucking module - filtered by role
    ...(hasModuleAccess(currentUser, "trucking") ? [{
      title: "PTG",
      href: "/trucking",
      icon: Truck,
      children: [
        ...(hasSectionAccess(currentUser, "trucking", "upload") ? [
          { title: "Subir Excel", href: "/trucking/upload", icon: UploadCloud }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "prefactura") ? [
          { title: "Crear Prefactura", href: "/trucking/prefactura", icon: FilePlus2 }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "gastos-autoridades") ? [
          { title: "Gastos Autoridades", href: "/trucking/gastos-autoridades", icon: Briefcase }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "records") ? [
          { title: "Facturas", href: "/trucking/records", icon: ListOrdered }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "config") ? [
          { title: "Configuración", href: "/trucking/config", icon: Settings2 }
        ] : []),
      ].filter(Boolean),
    }] : []),
    // PTYSS/Shipchandler module - filtered by role
    ...(hasModuleAccess(currentUser, "shipchandler") ? [{
      title: "PTYSS",
      href: "/ptyss",
      icon: Ship,
      children: [
        ...(hasSectionAccess(currentUser, "shipchandler", "upload") ? [
          { title: "Crear Registros", href: "/ptyss/upload", icon: Plus }
        ] : []),
        ...(hasSectionAccess(currentUser, "shipchandler", "invoice") ? [
          { title: "Crear Prefactura", href: "/ptyss/invoice", icon: FilePlus2 }
        ] : []),
        ...(hasSectionAccess(currentUser, "shipchandler", "records") ? [
          { title: "Facturas", href: "/ptyss/records", icon: ListOrdered }
        ] : []),
        ...(hasSectionAccess(currentUser, "shipchandler", "historial") ? [
          { title: "Historial", href: "/ptyss/historial", icon: History }
        ] : []),
        ...(hasSectionAccess(currentUser, "shipchandler", "config") ? [
          { title: "Configuración", href: "/ptyss/config", icon: Settings2 }
        ] : []),
      ].filter(Boolean),
    }] : []),
    // Agency module - filtered by role
    ...(hasModuleAccess(currentUser, "agency") ? [{
      title: "Agency",
      href: "/agency",
      icon: Car,
      children: [
        ...(hasSectionAccess(currentUser, "agency", "services") ? [
          { title: "Crear Servicios", href: "/agency/services", icon: Plus }
        ] : []),
        ...(hasSectionAccess(currentUser, "agency", "records") ? [
          { title: "Registros", href: "/agency/records", icon: ListOrdered }
        ] : []),
        ...(hasSectionAccess(currentUser, "agency", "sap-invoice") ? [
          { title: "SAP Invoice", href: "/agency/sap-invoice", icon: FileText }
        ] : []),
        ...(hasSectionAccess(currentUser, "agency", "historial") ? [
          { title: "Historial", href: "/agency/historial", icon: History }
        ] : []),
        ...(hasSectionAccess(currentUser, "agency", "catalogs") ? [
          { title: "Catálogos", href: "/agency/catalogs", icon: BookOpen }
        ] : []),
        // Configuración removida - no se usa por ahora
      ].filter(Boolean),
    }] : []),
    // Clientes - Solo clientes y administradores (no facturación sin rol clientes)
    ...(hasAnyRole(["clientes", "administrador"]) ? [{
      title: "Clientes",
      href: "/clientes",
      icon: Users,
    }] : []),
    // Historial General - Solo administradores
    ...(hasAnyRole(["administrador"]) ? [{
      title: "Historial General",
      href: "/historial",
      icon: History,
    }] : []),
    // Usuarios - Solo administradores
    ...(hasAnyRole(["administrador"]) ? [{
      title: "Usuarios",
      href: "/usuarios",
      icon: Users,
    }] : []),
  ]
  
  const mainNavItems = allNavItems

  const helpNavItems: NavItem[] = [{ title: "Soporte", href: "/support", icon: LifeBuoy }]

  const renderNavItems = (items: NavItem[], isSubmenu = false) => {
    return items.map((item) => {
      let isActive = pathname === item.href
      let showChildren = false

      if (item.children && item.children.length > 0) {
        const isParentHrefMatch = pathname === item.href
        const isChildPathMatch = pathname.startsWith(item.href + "/")
        const isAnyChildActive = item.children.some((child) => pathname === child.href)

        if (isParentHrefMatch || isChildPathMatch || isAnyChildActive) {
          isActive = true
          showChildren = true
        }
      }

      return (
        <React.Fragment key={item.title}>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive} className={cn(isSubmenu && "pl-8")}>
              <Link href={item.href}>
                <item.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                {item.badge && (
                  <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">{item.badge}</SidebarMenuBadge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {item.children && showChildren && (
            <SidebarGroupContent className="pl-4 group-data-[collapsible=icon]:hidden">
              <SidebarMenu>{renderNavItems(item.children, true)}</SidebarMenu>
            </SidebarGroupContent>
          )}
        </React.Fragment>
      )
    })
  }

  return (
    <Sidebar collapsible="icon" className="hidden h-full border-r bg-muted/20 md:flex md:flex-col">
      <SidebarHeader className="flex h-14 items-center justify-between border-b px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Briefcase className="h-6 w-6 text-primary" />
          <span className="group-data-[collapsible=icon]:hidden">Facturación</span>
        </Link>
        <SidebarTrigger className="hidden md:flex" />
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-y-auto p-2">
        <SidebarGroup>
          <SidebarGroupLabel className="select-none px-2 group-data-[collapsible=icon]:hidden">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(mainNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="my-2" />
        <SidebarGroup>
          <SidebarGroupLabel className="select-none px-2 group-data-[collapsible=icon]:hidden">Ayuda</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(helpNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start p-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="/placeholder-user.jpg" alt={userEmail} />
                <AvatarFallback>{userEmail.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="ml-2 flex flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">{userEmail}</span>
                <span className="text-xs text-muted-foreground">Usuario</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <LifeBuoy className="mr-2 h-4 w-4" />
              <span>Soporte</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
