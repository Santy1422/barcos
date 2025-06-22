"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, BarChart3, TrendingUp, Car, DollarSign, Download, Clock } from "lucide-react"

export function AgencyReports() {
  const [dateFrom, setDateFrom] = useState("2024-01-01")
  const [dateTo, setDateTo] = useState("2024-01-31")
  const [reportType, setReportType] = useState("monthly")

  const monthlyStats = {
    totalRevenue: 8920,
    totalTransports: 89,
    totalCrewMembers: 156,
    avgTransportValue: 32.5,
    topRanks: [
      { rank: "Captain", count: 12, revenue: 2400 },
      { rank: "Chief Officer", count: 18, revenue: 1980 },
      { rank: "Chief Engineer", count: 15, revenue: 1875 },
      { rank: "Officer", count: 25, revenue: 1750 },
      { rank: "Crew", count: 19, revenue: 950 },
    ],
    topRoutes: [
      { route: "Aeropuerto → Puerto Balboa", count: 35, revenue: 3150 },
      { route: "Puerto Cristóbal → Aeropuerto", count: 28, revenue: 2520 },
      { route: "Hotel → Puerto Balboa", count: 15, revenue: 1350 },
      { route: "Puerto Balboa → Hotel", count: 11, revenue: 990 },
    ],
    vehicleUtilization: [
      { type: "Sedan", trips: 45, hours: 67.5, efficiency: 85 },
      { type: "Van", trips: 28, hours: 42.0, efficiency: 78 },
      { type: "Bus", trips: 12, hours: 24.0, efficiency: 92 },
      { type: "Luxury", trips: 4, hours: 8.0, efficiency: 95 },
    ],
  }

  const driverPerformance = [
    { name: "Roberto Mendoza", trips: 32, hours: 48.0, revenue: 2880, rating: 4.9, onTime: 98 },
    { name: "Ana García", trips: 28, hours: 42.0, revenue: 2520, rating: 4.7, onTime: 95 },
    { name: "Luis Herrera", trips: 29, hours: 43.5, revenue: 2610, rating: 4.8, onTime: 97 },
  ]

  const nationalityStats = [
    { nationality: "PHILIPPINES", count: 45, percentage: 28.8 },
    { nationality: "INDIA", count: 38, percentage: 24.4 },
    { nationality: "UKRAINE", count: 32, percentage: 20.5 },
    { nationality: "ROMANIA", count: 25, percentage: 16.0 },
    { nationality: "RUSSIA", count: 16, percentage: 10.3 },
  ]

  const timeAnalysis = [
    { hour: "06:00-09:00", trips: 25, revenue: 1125 },
    { hour: "09:00-12:00", trips: 18, revenue: 810 },
    { hour: "12:00-15:00", trips: 15, revenue: 675 },
    { hour: "15:00-18:00", trips: 22, revenue: 990 },
    { hour: "18:00-21:00", trips: 9, revenue: 405 },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Reportes - Agency</h1>
          <p className="text-muted-foreground">Análisis y estadísticas de transporte de tripulaciones</p>
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
          <TabsTrigger value="drivers">
            <Car className="h-4 w-4 mr-2" />
            Drivers
          </TabsTrigger>
          <TabsTrigger value="crew">
            <Users className="h-4 w-4 mr-2" />
            Tripulaciones
          </TabsTrigger>
          <TabsTrigger value="time">
            <Clock className="h-4 w-4 mr-2" />
            Horarios
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
                <p className="text-xs text-muted-foreground">+15.2% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Transportes Realizados</CardTitle>
                <Car className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.totalTransports}</div>
                <p className="text-xs text-muted-foreground">+8.7% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tripulantes Transportados</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{monthlyStats.totalCrewMembers}</div>
                <p className="text-xs text-muted-foreground">+12.1% vs mes anterior</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${monthlyStats.avgTransportValue}</div>
                <p className="text-xs text-muted-foreground">+2.8% vs mes anterior</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Transportes por Rango</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.topRanks.map((rank, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{rank.rank}</div>
                        <div className="text-sm text-muted-foreground">{rank.count} transportes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${rank.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rutas Más Utilizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {monthlyStats.topRoutes.map((route, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{route.route}</div>
                        <div className="text-sm text-muted-foreground">{route.count} viajes</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">${route.revenue.toLocaleString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Utilización de Vehículos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyStats.vehicleUtilization.map((vehicle, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{vehicle.type}</span>
                      <span>
                        {vehicle.trips} viajes - {vehicle.hours}h - {vehicle.efficiency}% eficiencia
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${vehicle.efficiency}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance de Drivers</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {driverPerformance.map((driver, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-6 gap-4">
                        <div>
                          <div className="font-semibold">{driver.name}</div>
                          <div className="text-sm text-muted-foreground">Driver</div>
                        </div>
                        <div>
                          <div className="font-bold">{driver.trips}</div>
                          <div className="text-sm text-muted-foreground">Viajes</div>
                        </div>
                        <div>
                          <div className="font-bold">{driver.hours}h</div>
                          <div className="text-sm text-muted-foreground">Horas</div>
                        </div>
                        <div>
                          <div className="font-bold">${driver.revenue}</div>
                          <div className="text-sm text-muted-foreground">Ingresos</div>
                        </div>
                        <div>
                          <div className="font-bold">⭐ {driver.rating}</div>
                          <div className="text-sm text-muted-foreground">Rating</div>
                        </div>
                        <div>
                          <div className="font-bold">{driver.onTime}%</div>
                          <div className="text-sm text-muted-foreground">Puntualidad</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crew" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis de Tripulaciones por Nacionalidad</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nationalityStats.map((nationality, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{nationality.nationality}</span>
                      <span>
                        {nationality.count} tripulantes ({nationality.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${nationality.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribución por Rangos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {monthlyStats.topRanks.map((rank, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="font-semibold">{rank.rank}</div>
                          <div className="text-sm text-muted-foreground">Rango</div>
                        </div>
                        <div>
                          <div className="font-bold">{rank.count}</div>
                          <div className="text-sm text-muted-foreground">Transportes</div>
                        </div>
                        <div>
                          <div className="font-bold">${rank.revenue}</div>
                          <div className="text-sm text-muted-foreground">Ingresos</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análisis por Horarios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeAnalysis.map((time, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <div className="font-semibold">{time.hour}</div>
                          <div className="text-sm text-muted-foreground">Horario</div>
                        </div>
                        <div>
                          <div className="font-bold">{time.trips}</div>
                          <div className="text-sm text-muted-foreground">Viajes</div>
                        </div>
                        <div>
                          <div className="font-bold">${time.revenue}</div>
                          <div className="text-sm text-muted-foreground">Ingresos</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eficiencia por Horario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeAnalysis.map((time, index) => {
                  const efficiency = (time.revenue / time.trips).toFixed(1)
                  const maxEfficiency = Math.max(...timeAnalysis.map((t) => t.revenue / t.trips))
                  const percentage = (time.revenue / time.trips / maxEfficiency) * 100
                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-medium">{time.hour}</span>
                        <span>${efficiency} promedio por viaje</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: `${percentage}%` }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
