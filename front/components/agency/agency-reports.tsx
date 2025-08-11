"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { BarChart3, Download, TrendingUp, Ship, DollarSign, Calendar } from "lucide-react"

export function PTYSSReports() {
  const stats = [
    { title: "Servicios Totales", value: "156", icon: Ship, color: "text-blue-600" },
    { title: "Ingresos del Mes", value: "$45,230", icon: DollarSign, color: "text-green-600" },
    { title: "Crecimiento", value: "+12.5%", icon: TrendingUp, color: "text-yellow-600" },
    { title: "Promedio por Servicio", value: "$290", icon: BarChart3, color: "text-purple-600" },
  ]

  const topClients = [
    { name: "MSC Shipping", services: 45, revenue: 12500 },
    { name: "Maersk Line", services: 38, revenue: 9800 },
    { name: "CMA CGM", services: 32, revenue: 8700 },
    { name: "Evergreen", services: 28, revenue: 7200 },
    { name: "Hapag-Lloyd", services: 25, revenue: 6800 },
  ]

  const routePerformance = [
    { route: "Balboa → Cristóbal", services: 67, revenue: 18500, avgPrice: 276 },
    { route: "Cristóbal → Balboa", services: 54, revenue: 14200, avgPrice: 263 },
    { route: "Balboa → Manzanillo", services: 23, revenue: 8900, avgPrice: 387 },
    { route: "Manzanillo → Balboa", services: 12, revenue: 4100, avgPrice: 342 },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Reportes PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Select defaultValue="month">
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mes</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
                <SelectItem value="year">Este año</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar Reporte
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle>Principales Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topClients.map((client, index) => (
                <div key={client.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 h-8 flex items-center justify-center p-0">
                      {index + 1}
                    </Badge>
                    <div>
                      <div className="font-medium">{client.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.services} servicios
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${client.revenue.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      ${(client.revenue / client.services).toFixed(0)}/servicio
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Route Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Ruta</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {routePerformance.map((route) => (
                <div key={route.route} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{route.route}</div>
                    <div className="text-sm text-muted-foreground">
                      ${route.avgPrice}/servicio
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${(route.services / 67) * 100}%` }}
                      />
                    </div>
                    <div className="text-sm text-muted-foreground w-16 text-right">
                      {route.services}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${route.revenue.toLocaleString()} en ingresos
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-end justify-center gap-2">
            {[12000, 15000, 18000, 22000, 28000, 32000, 45230].map((value, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div 
                  className="bg-blue-500 rounded-t w-8"
                  style={{ height: `${(value / 50000) * 200}px` }}
                />
                <div className="text-xs text-muted-foreground">
                  ${(value / 1000).toFixed(0)}k
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-muted-foreground mt-4">
            Últimos 7 meses - Ingresos en USD
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 