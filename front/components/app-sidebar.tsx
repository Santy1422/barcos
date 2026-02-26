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
  useSidebar,
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
  Zap,
  History,
  Car,
  BookOpen,
  FileText,
  Package,
  ChevronLeft,
  ChevronRight,
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
        ...(hasSectionAccess(currentUser, "trucking", "prefactura") ? [
          { title: "Prefactura (Rápido)", href: "/trucking/prefactura-optimizado", icon: Zap }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "gastos-autoridades") ? [
          { title: "Gastos Autoridades", href: "/trucking/gastos-autoridades", icon: Briefcase }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "gastos-autoridades") ? [
          { title: "Gastos Auth (Rápido)", href: "/trucking/gastos-autoridades-optimizado", icon: Zap }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "records") ? [
          { title: "Facturas", href: "/trucking/records", icon: ListOrdered }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "records") ? [
          { title: "Facturas (Rápido)", href: "/trucking/records-optimizado", icon: Zap }
        ] : []),
        ...(hasSectionAccess(currentUser, "trucking", "config") ? [
          { title: "Catálogos", href: "/trucking/config", icon: BookOpen }
        ] : []),
      ].filter(Boolean),
    }] : []),
    // PTYSS module - filtered by role
    ...(hasModuleAccess(currentUser, "ptyss") ? [{
      title: "TRUCKING",
      href: "/ptyss",
      icon: Ship,
      children: [
        ...(hasSectionAccess(currentUser, "ptyss", "upload") ? [
          { title: "Crear Registros", href: "/ptyss/upload", icon: Plus }
        ] : []),
        ...(hasSectionAccess(currentUser, "ptyss", "invoice") ? [
          { title: "Crear Prefactura", href: "/ptyss/invoice", icon: FilePlus2 }
        ] : []),
        ...(hasSectionAccess(currentUser, "ptyss", "records") ? [
          { title: "Facturas", href: "/ptyss/records", icon: ListOrdered }
        ] : []),
        ...(hasSectionAccess(currentUser, "ptyss", "historial") ? [
          { title: "Historial", href: "/ptyss/historial", icon: History }
        ] : []),
        ...(hasSectionAccess(currentUser, "ptyss", "config") ? [
          { title: "Catálogos", href: "/ptyss/config", icon: BookOpen }
        ] : []),
      ].filter(Boolean),
    }] : []),
    // ShipChandler module - filtered by role
    ...(hasModuleAccess(currentUser, "shipchandler") ? [{
      title: "ShipChandler",
      href: "/shipchandler",
      icon: Anchor,
      children: [
        ...(hasSectionAccess(currentUser, "shipchandler", "upload") ? [
          { title: "Subir Excel", href: "/shipchandler/upload", icon: UploadCloud }
        ] : []),
        ...(hasSectionAccess(currentUser, "shipchandler", "prefactura") ? [
          { title: "Crear Prefactura", href: "/shipchandler/prefactura", icon: FilePlus2 }
        ] : []),
        ...(hasSectionAccess(currentUser, "shipchandler", "records") ? [
          { title: "Facturas", href: "/shipchandler/invoice", icon: ListOrdered }
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
        ...(hasSectionAccess(currentUser, "agency", "invoice") ? [
          { title: "Crear Prefactura", href: "/agency/invoice", icon: FilePlus2 }
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
    // Analytics - Solo administradores y facturación
    ...(hasAnyRole(["administrador", "analytics", "facturacion"]) ? [{
      title: "Analytics",
      href: "/analytics",
      icon: BarChart3,
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

  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="hidden h-full border-r bg-gradient-to-b from-slate-50 to-white md:flex md:flex-col">
      {/* Header con logo */}
      <SidebarHeader className="flex h-16 items-center justify-center border-b bg-white px-2 group-data-[collapsible=icon]:px-0">
        <Link href="/" className="flex items-center gap-3 font-semibold group-data-[collapsible=icon]:justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
            <Briefcase className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-slate-800 group-data-[collapsible=icon]:hidden">
            Facturación
          </span>
        </Link>
      </SidebarHeader>

      {/* Contenido del menú */}
      <SidebarContent className="flex-1 overflow-y-auto px-2 py-4 group-data-[collapsible=icon]:px-1">
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
            Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">{renderNavItems(mainNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4 group-data-[collapsible=icon]:mx-0" />

        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 group-data-[collapsible=icon]:hidden">
            Ayuda
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">{renderNavItems(helpNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer con usuario y botón de colapsar */}
      <SidebarFooter className="border-t bg-white p-2 group-data-[collapsible=icon]:p-1">
        {/* Botón de colapsar/expandir */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSidebar}
          className="mb-2 w-full justify-center text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="text-xs group-data-[collapsible=icon]:hidden">Contraer</span>
            </>
          )}
        </Button>

        {/* Usuario */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-center rounded-lg p-2 hover:bg-slate-100 group-data-[collapsible=icon]:p-1"
            >
              <Avatar className="h-8 w-8 border-2 border-primary/20">
                <AvatarImage src="/placeholder-user.jpg" alt={userEmail} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                  {userEmail.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 flex flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium text-slate-700 truncate max-w-[120px]">
                  {userEmail.split('@')[0]}
                </span>
                <span className="text-xs text-slate-400">Usuario</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userEmail.split('@')[0]}</p>
                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
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
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
