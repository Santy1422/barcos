"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Ship, BarChart3, TrendingUp, Package, DollarSign, Download } from "lucide-react"

export function ShipchandlerReports() {
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState("2024-01-31")
  const [reportType, setReportType] = useState("monthly")

  const monthlyStats = {
    totalRevenue: 1250000,
    totalOrders: 45,
    totalVessels: 28,
    avgOrderValue: 27777,
    topProducts: [
      { name: "Marine Gas Oil", quantity: 2500, revenue: 850000 },
      { name: "Fresh Water", quantity: 1200, revenue: 180000 },
      { name: "Fresh Provisions", quantity: 850, revenue: 127500 },
      { name: "Spare Parts", quantity: 45, revenue: 92500 },
    ],
    topClients: [
      { name: "MSC Agency Panama", orders: 12, revenue: 425000 },
      { name: "Maersk Line Agency", orders: 8, revenue: 320000 },
      { name: "Evergreen Agency", orders: 10, revenue: 285000 },
      { name: "CMA CGM Agency", orders: 6, revenue: 220000 },
    ],
    inventoryStatus: [
      { category: "Combustibles", value: 2125000, percentage: 68 },
      { category: "Alimentos", value: 450000, percentage: 14 },
      { category: "Agua", value: 320000, percentage: 10 },
      { category: "Repuestos", value: 255000, percentage: 8 },
    ],
  }

  const vesselTypeStats = [
    { type: "Container Ship", count: 15, revenue: 675000, avgStay: "18h" },
    { type: "Bulk Carrier", count: 8, revenue: 320000, avgStay: "24h" },
    { type: "Tanker", count: 5, revenue: 255000, avgStay: "12h" },
  ]

  const supplierPerformance = [
    { name: "Marine Fuel Supply Co.", orders: 18, onTime: 95, rating: 4.8, totalValue: 850000 },
    { name: "Fresh Food Distributors", orders: 25, onTime: 88, rating: 4.6, totalValue: 127500 },
    { name: "Panama Water Supply", orders: 30, onTime: 92, rating: 4.7, totalValue: 180000 },
    { name: "Technical Parts Ltd.", orders: 12, onTime: 100, rating: 4.9, totalValue: 92500 },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Reportes - Shipchandler</h1>
          <p className="text-muted-foreground">Análisis y estadísticas de abastecimiento a barcos</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Reporte</CardTitle>
          <CardDescription>Configura el período y tipo de reporte a generar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date-from">Fecha Desde</Label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-to">Fecha Hasta</Label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-type">Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="quarterly">Trimestral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <BarChart3 className="mr-2 h-4 w-4" />
                Generar Reporte
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="vessels">
            <Ship className="h-4 w-4 mr-2" />
            Buques
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            <TrendingUp className="h-4 w-4 mr-2" />
            Proveedores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${monthlyStats.totalRevenue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+12.5% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Órdenes Procesadas</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.totalOrders}</div>
                <p className="text-xs text-muted-foreground">+8.2% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Buques Atendidos</CardTitle>
                <Ship className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.totalVessels}</div>
                <p className="text-xs text-muted-foreground">+5.7% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${monthlyStats.avgOrderValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+3.1% vs mes anterior</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top Productos por Ingresos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.topProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-muted-foreground">{product.quantity} unidades</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${product.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.topClients.map((client, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{client.name}</div>
                        <div className="text-sm text-muted-foreground">{client.orders} órdenes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${client.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Distribución de Inventario por Categoría</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyStats.inventoryStatus.map((category, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{category.category}</span>
                      <span>
                        ${category.value.toLocaleString()} ({category.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${category.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Productos</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyStats.topProducts.map((product, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground">Cantidad vendida: {product.quantity}</p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg">${product.revenue.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Ingresos generados</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vessels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estadísticas por Tipo de Buque</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vesselTypeStats.map((vessel, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="font-semibold">{vessel.type}</div>
                          <div className="text-sm text-muted-foreground">Tipo de buque</div>
                        </div>
                        <div>
                          <div className="font-bold">{vessel.count}</div>
                          <div className="text-sm text-muted-foreground">Buques atendidos</div>
                        </div>
                        <div>
                          <div className="font-bold">${vessel.revenue.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Ingresos</div>
                        </div>
                        <div>
                          <div className="font-bold">{vessel.avgStay}</div>
                          <div className="text-sm text-muted-foreground">Estadía promedio</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance de Proveedores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierPerformance.map((supplier, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-5 gap-4">
                        <div>
                          <div className="font-semibold">{supplier.name}</div>
                          <div className="text-sm text-muted-foreground">Proveedor</div>
                        </div>
                        <div>
                          <div className="font-bold">{supplier.orders}</div>
                          <div className="text-sm text-muted-foreground">Órdenes</div>
                        </div>
                        <div>
                          <div className="font-bold">{supplier.onTime}%</div>
                          <div className="text-sm text-muted-foreground">Puntualidad</div>
                        </div>
                        <div>
                          <div className="font-bold">⭐ {supplier.rating}</div>
                          <div className="text-sm text-muted-foreground">Rating</div>
                        </div>
                        <div>
                          <div className="font-bold">${supplier.totalValue.toLocaleString()}</div>
                          <div className="text-sm text-muted-foreground">Valor total</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
