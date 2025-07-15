"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Ship, Search, Filter, Download } from "lucide-react"

export function PTYSSRecords() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Mock data for demonstration
  const records = [
    {
      id: "PTY-001",
      vessel: "MSC Fantasia",
      voyage: "MSC001",
      container: "MSCU1234567",
      containerType: "Dry",
      size: "40'",
      origin: "Balboa",
      destination: "Cristóbal",
      moveDate: "2024-01-15",
      client: "MSC Shipping",
      serviceType: "Transit",
      amount: 1250,
      status: "Completado"
    },
    {
      id: "PTY-002",
      vessel: "Maersk Seville",
      voyage: "MAE002",
      container: "MAEU7654321",
      containerType: "Reefer",
      size: "20'",
      origin: "Cristóbal",
      destination: "Balboa",
      moveDate: "2024-01-16",
      client: "Maersk Line",
      serviceType: "Transit",
      amount: 980,
      status: "En tránsito"
    },
    {
      id: "PTY-003",
      vessel: "CMA CGM Marco Polo",
      voyage: "CMA003",
      container: "CMAU9876543",
      containerType: "Dry",
      size: "45'",
      origin: "Balboa",
      destination: "Manzanillo",
      moveDate: "2024-01-17",
      client: "CMA CGM",
      serviceType: "Transit",
      amount: 1450,
      status: "Pendiente"
    }
  ]

  const filteredRecords = records.filter(record => {
    const matchesSearch = 
      record.vessel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.container.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.voyage.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completado":
        return <Badge variant="outline" className="text-green-600 border-green-600">Completado</Badge>
      case "En tránsito":
        return <Badge variant="outline" className="text-blue-600 border-blue-600">En tránsito</Badge>
      case "Pendiente":
        return <Badge variant="outline" className="text-orange-600 border-orange-600">Pendiente</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Registros PTYSS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por buque, contenedor, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Completado">Completado</SelectItem>
                  <SelectItem value="En tránsito">En tránsito</SelectItem>
                  <SelectItem value="Pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Buque</TableHead>
                  <TableHead>Viaje</TableHead>
                  <TableHead>Contenedor</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Tamaño</TableHead>
                  <TableHead>Origen</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell className="font-medium">{record.id}</TableCell>
                    <TableCell className="font-medium">{record.vessel}</TableCell>
                    <TableCell>{record.voyage}</TableCell>
                    <TableCell className="font-mono text-sm">{record.container}</TableCell>
                    <TableCell>{record.containerType}</TableCell>
                    <TableCell>{record.size}</TableCell>
                    <TableCell>{record.origin}</TableCell>
                    <TableCell>{record.destination}</TableCell>
                    <TableCell>{record.moveDate}</TableCell>
                    <TableCell>{record.client}</TableCell>
                    <TableCell>{record.serviceType}</TableCell>
                    <TableCell className="font-medium">${record.amount}</TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredRecords.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron registros que coincidan con los filtros
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando {filteredRecords.length} de {records.length} registros</span>
            <span>Total: ${filteredRecords.reduce((sum, record) => sum + record.amount, 0).toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 