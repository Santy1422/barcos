"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, FileSpreadsheet, DollarSign, Clock, Plus, Upload } from "lucide-react"
import Link from "next/link"

export function TruckingDashboard() {
  const stats = [
    { title: "Servicios Activos", value: "24", icon: Truck, color: "text-blue-600" },
    { title: "Archivos Procesados", value: "8", icon: FileSpreadsheet, color: "text-green-600" },
    { title: "Ingresos del Mes", value: "$12,450", icon: DollarSign, color: "text-yellow-600" },
    { title: "Tiempo Promedio", value: "2.5h", icon: Clock, color: "text-purple-600" },
  ]

  const recentServices = [
    {
      id: "TRK-001",
      client: "MSC Logistics",
      route: "MIT → PSA",
      container: "40'",
      status: "En tránsito",
      amount: "$450",
    },
    {
      id: "TRK-002",
      client: "Global Shipping",
      route: "PSA → BLB",
      container: "20'",
      status: "Completado",
      amount: "$320",
    },
    {
      id: "TRK-003",
      client: "SeaFreight Intl",
      route: "CCT → MIT",
      container: "45'",
      status: "Pendiente",
      amount: "$580",
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Truck className="h-6 w-6 text-white" />
            </div>
            Trucking Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de servicios de transporte terrestre</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/trucking/upload">
              <Upload className="mr-2 h-4 w-4" />
              Subir Excel
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/trucking/invoice">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

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

      {/* Recent Services */}
      <Card>
        <CardHeader>
          <CardTitle>Servicios Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Ruta</TableHead>
                <TableHead>Contenedor</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.id}</TableCell>
                  <TableCell>{service.client}</TableCell>
                  <TableCell>{service.route}</TableCell>
                  <TableCell>{service.container}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        service.status === "Completado"
                          ? "success"
                          : service.status === "En tránsito"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {service.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{service.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-blue-500 mb-4" />
            <h3 className="font-semibold mb-2">Importar Datos</h3>
            <p className="text-sm text-muted-foreground">Sube archivos Excel con servicios de trucking</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <Plus className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-semibold mb-2">Nuevo Servicio</h3>
            <p className="text-sm text-muted-foreground">Registra un servicio manualmente</p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-6 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="font-semibold mb-2">Crear Factura</h3>
            <p className="text-sm text-muted-foreground">Genera facturas de servicios completados</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
