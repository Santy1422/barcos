"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Search, ChevronLeft, ChevronRight, RefreshCw, Truck } from "lucide-react"
import { createApiUrl } from "@/lib/api-config"
import { SectionGuard } from "@/components/section-guard"

interface Record {
  _id: string
  data: any
  status: string
  totalValue: number
  createdAt: string
  clientId?: {
    companyName?: string
    fullName?: string
  }
}

interface PaginationInfo {
  current: number
  pages: number
  total: number
}

const ITEMS_PER_PAGE = 50

export default function TruckingRecordsOptimizadoPage() {
  const [records, setRecords] = useState<Record[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({ current: 1, pages: 1, total: 0 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filtros
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)

  const fetchRecords = useCallback(async (page: number, status?: string, search?: string) => {
    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error('No autenticado')

      let url = createApiUrl(`/api/records/module/trucking?page=${page}&limit=${ITEMS_PER_PAGE}`)
      if (status && status !== 'all') {
        url += `&status=${status}`
      }
      // El backend no soporta search aún, pero lo podemos agregar

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Error al cargar registros')

      const data = await response.json()

      if (data.success) {
        setRecords(data.data || [])
        setPagination(data.pagination || { current: page, pages: 1, total: 0 })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords(currentPage, statusFilter, searchTerm)
  }, [currentPage, statusFilter, fetchRecords])

  const handleSearch = () => {
    setCurrentPage(1)
    fetchRecords(1, statusFilter, searchTerm)
  }

  const handleStatusChange = (value: string) => {
    setStatusFilter(value)
    setCurrentPage(1)
  }

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.pages) {
      setCurrentPage(page)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors: { [key: string]: string } = {
      pendiente: "bg-yellow-100 text-yellow-800",
      completado: "bg-green-100 text-green-800",
      prefacturado: "bg-blue-100 text-blue-800",
      facturado: "bg-purple-100 text-purple-800",
      anulado: "bg-red-100 text-red-800"
    }
    return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>
  }

  const getClientName = (record: Record) => {
    if (record.clientId?.companyName) return record.clientId.companyName
    if (record.clientId?.fullName) return record.clientId.fullName
    return record.data?.line || record.data?.associate || '-'
  }

  // Filtrar localmente por búsqueda (temporal hasta implementar en backend)
  const filteredRecords = searchTerm
    ? records.filter(r => {
        const container = r.data?.container?.toLowerCase() || ''
        const client = getClientName(r).toLowerCase()
        const search = searchTerm.toLowerCase()
        return container.includes(search) || client.includes(search)
      })
    : records

  return (
    <SectionGuard module="trucking" section="records">
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>PTG Records - Optimizado</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Paginación desde el servidor - {pagination.total} registros totales
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchRecords(currentPage, statusFilter)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Filtros */}
            <div className="flex gap-4 items-center">
              <div className="flex-1 flex gap-2">
                <Input
                  placeholder="Buscar por contenedor o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="max-w-sm"
                />
                <Button variant="secondary" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              <Select value={statusFilter} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                  <SelectItem value="prefacturado">Prefacturado</SelectItem>
                  <SelectItem value="facturado">Facturado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tabla */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2">Cargando registros...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-red-600">{error}</div>
            ) : (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>Contenedor</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Ruta</TableHead>
                        <TableHead>Tamaño</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>F/E</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Fecha</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No se encontraron registros
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredRecords.map((record) => (
                          <TableRow key={record._id} className="hover:bg-gray-50">
                            <TableCell className="font-mono text-sm">
                              {record.data?.container || '-'}
                            </TableCell>
                            <TableCell>{getClientName(record)}</TableCell>
                            <TableCell className="text-sm">
                              {record.data?.from && record.data?.to
                                ? `${record.data.from} → ${record.data.to}`
                                : record.data?.leg || '-'
                              }
                            </TableCell>
                            <TableCell>{record.data?.containerSize || '-'}</TableCell>
                            <TableCell>{record.data?.containerType || '-'}</TableCell>
                            <TableCell>{record.data?.fe || '-'}</TableCell>
                            <TableCell className="text-right font-medium">
                              ${record.totalValue?.toFixed(2) || '0.00'}
                            </TableCell>
                            <TableCell>{getStatusBadge(record.status)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(record.createdAt).toLocaleDateString('es-ES')}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Paginación */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Mostrando página {pagination.current} de {pagination.pages} ({pagination.total} registros)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum
                        if (pagination.pages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(pageNum)}
                            className="w-10"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage >= pagination.pages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SectionGuard>
  )
}
