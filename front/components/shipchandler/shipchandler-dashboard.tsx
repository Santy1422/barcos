"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Ship, Package, DollarSign, Clock, Plus, Upload } from "lucide-react"
import Link from "next/link"

export function ShipchandlerDashboard() {
  const stats = [
    { title: "Barcos Atendidos", value: "15", icon: Ship, color: "text-green-600" },
    { title: "Productos Suministrados", value: "342", icon: Package, color: "text-blue-600" },
    { title: "Ingresos del Mes", value: "$28,750", icon: DollarSign, color: "text-yellow-600" },
    { title: "Tiempo Promedio", value: "4.2h", icon: Clock, color: "text-purple-600" },
  ]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
              <Ship className="h-6 w-6 text-white" />
            </div>
            Shipchandler Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Gestión de abastecimiento a barcos</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/shipchandler/upload">
              <Upload className="mr-2 h-4 w-4" />
              Subir Excel
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/shipchandler/invoice">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Factura
            </Link>
          </Button>
        </div>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Servicios Recientes de Shipchandler</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Últimos servicios de abastecimiento...</p>
        </CardContent>
      </Card>
    </div>
  )
}
