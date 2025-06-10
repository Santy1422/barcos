"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { FileText, Search } from "lucide-react"
import { mockXmlFiles } from "@/lib/mock-data"

export function HistoryPage() {
  const [files, setFiles] = useState(mockXmlFiles)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [dateFilter, setDateFilter] = useState("todos")

  const filteredFiles = files.filter((file) => {
    // Filtro por término de búsqueda
    const matchesSearch =
      searchTerm === "" ||
      file.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.customer.toLowerCase().includes(searchTerm.toLowerCase())

    // Filtro por estado
    const matchesStatus = statusFilter === "todos" || file.status === statusFilter

    // Filtro por fecha (simplificado para el ejemplo)
    const matchesDate = dateFilter === "todos" // En un caso real, se implementaría la lógica de filtrado por fecha

    return matchesSearch && matchesStatus && matchesDate
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Historial</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Referencia o cliente..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="validado">Validado</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="transmitido">Transmitido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Select value={dateFilter} onValueChange={(value) => setDateFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="hoy">Hoy</SelectItem>
                  <SelectItem value="semana">Esta semana</SelectItem>
                  <SelectItem value="mes">Este mes</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados ({filteredFiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Referencia</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="font-medium">{file.reference}</TableCell>
                  <TableCell>{file.date}</TableCell>
                  <TableCell>{file.customer}</TableCell>
                  <TableCell>
                    {file.amount} {file.currency}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        file.status === "validado"
                          ? "success"
                          : file.status === "error"
                            ? "destructive"
                            : file.status === "transmitido"
                              ? "outline"
                              : "default"
                      }
                    >
                      {file.status === "pendiente" && "Pendiente"}
                      {file.status === "validado" && "Validado"}
                      {file.status === "error" && "Error"}
                      {file.status === "transmitido" && "Transmitido"}
                    </Badge>
                  </TableCell>
                  <TableCell>{file.user || "Juan Pérez"}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/editar/${file.id}`}>
                        <FileText className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
