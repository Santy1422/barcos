"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: string
  children?: NavItem[]
}

const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  {
    title: "Trucking",
    href: "/trucking", // Main dashboard for Trucking
    icon: Truck,
    children: [
      { title: "Subir Excel", href: "/trucking/upload", icon: UploadCloud },
      { title: "Crear Factura", href: "/trucking/invoice", icon: FilePlus2 },
      { title: "Registros", href: "/trucking/records", icon: ListOrdered },
      { title: "Reportes", href: "/trucking/reports", icon: BarChart3 },
      { title: "Configuración", href: "/trucking/config", icon: Settings2 },
    ],
  },
  {
    title: "Shipchandler",
    href: "/shipchandler", // Main dashboard for Shipchandler
    icon: Ship,
    children: [
      { title: "Subir Excel", href: "/shipchandler/upload", icon: UploadCloud },
      { title: "Crear Factura", href: "/shipchandler/invoice", icon: FilePlus2 },
      { title: "Registros", href: "/shipchandler/records", icon: ListOrdered },
      { title: "Reportes", href: "/shipchandler/reports", icon: BarChart3 },
      { title: "Configuración", href: "/shipchandler/config", icon: Settings2 },
    ],
  },
  {
    title: "Agency",
    href: "/agency", // Main dashboard for Agency
    icon: Anchor,
    children: [
      { title: "Subir Excel", href: "/agency/upload", icon: UploadCloud },
      { title: "Crear Factura", href: "/agency/invoice", icon: FilePlus2 },
      { title: "Registros", href: "/agency/records", icon: ListOrdered },
      { title: "Reportes", href: "/agency/reports", icon: BarChart3 },
      { title: "Configuración", href: "/agency/config", icon: Settings2 },
    ],
  },
  // Global Reportes and Configuración are removed as they are now per-module
]

const helpNavItems: NavItem[] = [{ title: "Soporte", href: "/support", icon: LifeBuoy }]

export function AppSidebar() {
  const pathname = usePathname()

  const renderNavItems = (items: NavItem[], isSubmenu = false) => {
    return items.map((item) => {
      // Determine if the current item or one of its children is active
      let isActive = pathname === item.href
      let showChildren = false

      if (item.children && item.children.length > 0) {
        // Parent is active if the current path starts with the parent's href
        // or if the current path is exactly the parent's href (for module dashboards)
        const isBasePathMatch = pathname.startsWith(item.href + "/") || pathname === item.href

        if (isBasePathMatch) {
          isActive = true // Parent is active if we are in its section
          showChildren = true // Show children if we are in the parent's section
        }
        // If any child's href is an exact match, ensure parent is also active and children are shown
        if (item.children.some((child) => pathname === child.href)) {
          isActive = true
          showChildren = true
        }
      }

      return (
        <React.Fragment key={item.title}>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className={cn(isSubmenu && "pl-8")} // Indent sub-items
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                {item.badge && (
                  <SidebarMenuBadge className="group-data-[collapsible=icon]:hidden">{item.badge}</SidebarMenuBadge>
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {item.children &&
            showChildren && ( // Conditionally render children
              <SidebarGroupContent className="pl-4 group-data-[collapsible=icon]:hidden">
                <SidebarMenu>{renderNavItems(item.children, true)}</SidebarMenu>
              </SidebarGroupContent>
            )}
        </React.Fragment>
      )
    })
  }

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-2">
        <div className="flex h-10 items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Briefcase className="h-6 w-6 text-primary flex-shrink-0" />
          <span className="font-semibold text-lg group-data-[collapsible=icon]:hidden">Facturación</span>
        </div>
      </SidebarHeader>
      <SidebarContent className="flex-grow overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupLabel className="select-none group-data-[collapsible=icon]:hidden">Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderNavItems(mainNavItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel className="select-none group-data-[collapsible=icon]:hidden">Ayuda</SidebarGroupLabel>
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
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src="/placeholder.svg?height=32&width=32" alt="Usuario" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="ml-2 truncate group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium">Usuario</p>
                <p className="text-xs text-muted-foreground">usuario@ejemplo.com</p>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" /> {/* General settings icon */}
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
