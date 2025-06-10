"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface ExcelPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  data: any[]
  type: string
  typeInfo: any
}

export function ExcelPreviewModal({ isOpen, onClose, data, type, typeInfo }: ExcelPreviewModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [sortField, setSortField] = useState("")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filtrar datos según el término de búsqueda
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true
    return Object.values(row).some((value) => String(value).toLowerCase().includes(searchTerm.toLowerCase()))
  })

  // Ordenar datos
  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortField) return 0
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (sortDirection === "asc") {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Paginación
  const totalPages = Math.ceil(sortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage)

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getTrackingColumns = () => [
    { key: "fecha", label: "Fecha", sortable: true },
    { key: "clientes", label: "Cliente", sortable: true },
    { key: "desde", label: "Desde", sortable: true },
    { key: "subClientes", label: "Sub-Cliente", sortable: false },
    { key: "hacia", label: "Hacia", sortable: true },
    { key: "bl", label: "B/L", sortable: true },
    { key: "buque", label: "Buque", sortable: true },
    { key: "tamaño", label: "Tamaño", sortable: true },
    { key: "contenedor", label: "N° Contenedor", sortable: true },
    { key: "ptgOrder", label: "PTG Order", sortable: true },
    { key: "status", label: "Status", sortable: true },
    { key: "voyage", label: "Voyage", sortable: true },
    { key: "tarifa", label: "Tarifa", sortable: true },
    { key: "gastosPuerto", label: "Gastos Puerto", sortable: false },
    { key: "otrosGastos", label: "Otros Gastos", sortable: false },
    { key: "fechaFacturacion", label: "Fecha Facturación", sortable: true },
    { key: "driver", label: "Driver", sortable: true },
  ]

  const getInvoicesColumns = () => [
    { key: "customerName", label: "Customer Name", sortable: true },
    { key: "invoiceNo", label: "Invoice No", sortable: true },
    { key: "invoiceType", label: "Invoice Type", sortable: true },
    { key: "vessel", label: "Vessel", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "projectCode", label: "Project Code", sortable: true },
    { key: "referenceNo", label: "Reference No", sortable: true },
    { key: "deliveryAddress", label: "Delivery Address", sortable: false },
    { key: "currency", label: "Currency", sortable: true },
    { key: "discount", label: "Discount", sortable: true },
    { key: "totalInvoice", label: "Total Invoice", sortable: true },
    { key: "total", label: "Total", sortable: true },
    { key: "paid", label: "Paid", sortable: true },
    { key: "unpaid", label: "UnPaid", sortable: true },
  ]

  const getTransportColumns = () => [
    { key: "po", label: "PO#", sortable: true },
    { key: "date", label: "Date", sortable: true },
    { key: "pickUpTime", label: "Pick Up Time", sortable: true },
    { key: "pickUp", label: "Pick Up", sortable: true },
    { key: "dropOff", label: "Drop Off", sortable: true },
    { key: "vessel", label: "Vessel", sortable: true },
    { key: "voy", label: "VOY", sortable: true },
    { key: "taulia", label: "Taulia", sortable: true },
    { key: "rank", label: "Rank", sortable: true },
    { key: "name", label: "Name", sortable: true },
    { key: "nationality", label: "Nationality", sortable: true },
    { key: "time", label: "Time", sortable: true },
    { key: "flight", label: "Flight", sortable: true },
    { key: "invoice", label: "Invoice", sortable: true },
  ]

  const getColumns = () => {
    switch (type) {
      case "tracking":
        return getTrackingColumns()
      case "invoices":
        return getInvoicesColumns()
      case "transport":
        return getTransportColumns()
      default:
        return []
    }
  }

  const getCellValue = (row: any, key: string) => {
    const value = row[key]
    if (value === null || value === undefined || value === "") return "-"
    if (typeof value === "number" && key === "tarifa") return `$${value.toFixed(2)}`
    return String(value)
  }

  const getStatistics = () => {
    const stats: any = {}

    if (type === "tracking") {
      const uniqueClients = new Set(data.map((row) => row.clientes)).size
      const totalTarifa = data.reduce((sum, row) => sum + (row.tarifa || 0), 0)
      const uniqueDrivers = new Set(data.map((row) => row.driver)).size

      stats.clients = uniqueClients
      stats.totalAmount = totalTarifa
      stats.drivers = uniqueDrivers
      stats.containers = data.length
    } else if (type === "invoices") {
      const uniqueCustomers = new Set(data.map((row) => row.customerName)).size
      const uniqueVessels = new Set(data.map((row) => row.vessel)).size

      stats.customers = uniqueCustomers
      stats.vessels = uniqueVessels
      stats.invoices = data.length
    } else if (type === "transport") {
      const uniqueVessels = new Set(data.map((row) => row.vessel)).size
      const uniqueNationalities = new Set(data.map((row) => row.nationality)).size

      stats.vessels = uniqueVessels
      stats.nationalities = uniqueNationalities
      stats.services = data.length
    }

    return stats
  }

  const statistics = getStatistics()
  const columns = getColumns()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Vista Detallada de Datos
                {typeInfo && <Badge variant="outline">{typeInfo.name}</Badge>}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredData.length} de {data.length} registros
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="data" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="data">Datos</TabsTrigger>
            <TabsTrigger value="stats">Estadísticas</TabsTrigger>
          </TabsList>

          <TabsContent value="data" className="flex-1 overflow-hidden">
            <div className="space-y-4 h-full">
              {/* Filtros */}
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar en todos los campos..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={sortField} onValueChange={setSortField}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns
                      .filter((col) => col.sortable)
                      .map((col) => (
                        <SelectItem key={col.key} value={col.key}>
                          {col.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  disabled={!sortField}
                >
                  {sortDirection === "asc" ? "↑" : "↓"}
                </Button>
              </div>

              {/* Indicador de scroll horizontal */}
              <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded border">
                💡 <strong>Tip:</strong> Usa el scroll horizontal en la tabla para ver todas las columnas disponibles
              </div>

              {/* Tabla */}
              <div className="border rounded-lg overflow-hidden flex-1">
                <div className="overflow-auto max-h-[400px]">
                  <Table className="min-w-full">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        {columns.map((col) => (
                          <TableHead
                            key={col.key}
                            className={cn(
                              "whitespace-nowrap min-w-[120px] px-4",
                              col.sortable ? "cursor-pointer hover:bg-muted" : "",
                            )}
                            onClick={col.sortable ? () => handleSort(col.key) : undefined}
                          >
                            <div className="flex items-center gap-1">
                              {col.label}
                              {col.sortable && sortField === col.key && (
                                <span className="text-xs">{sortDirection === "asc" ? "↑" : "↓"}</span>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((row, index) => (
                        <TableRow key={index}>
                          {columns.map((col) => (
                            <TableCell
                              key={col.key}
                              className="whitespace-nowrap min-w-[120px] px-4"
                              title={getCellValue(row, col.key)}
                            >
                              <div className="max-w-[200px] truncate">{getCellValue(row, col.key)}</div>
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredData.length)} de{" "}
                  {filteredData.length} registros
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {type === "tracking" && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Clientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.clients}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Contenedores</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.containers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Drivers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.drivers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Monto Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${statistics.totalAmount?.toFixed(2)}</div>
                    </CardContent>
                  </Card>
                </>
              )}

              {type === "invoices" && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.customers}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.invoices}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Vessels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.vessels}</div>
                    </CardContent>
                  </Card>
                </>
              )}

              {type === "transport" && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.services}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Vessels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.vessels}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Nationalities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{statistics.nationalities}</div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Detalles por tipo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {type === "tracking" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Top Clientes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(data.map((row) => row.clientes)))
                          .slice(0, 5)
                          .map((client, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{client}</span>
                              <span>{data.filter((row) => row.clientes === client).length}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Top Drivers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(data.map((row) => row.driver)))
                          .slice(0, 5)
                          .map((driver, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{driver}</span>
                              <span>{data.filter((row) => row.driver === driver).length}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {type === "invoices" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Top Customers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(data.map((row) => row.customerName)))
                          .slice(0, 5)
                          .map((customer, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span className="truncate">{customer}</span>
                              <span>{data.filter((row) => row.customerName === customer).length}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Top Vessels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(data.map((row) => row.vessel)))
                          .slice(0, 5)
                          .map((vessel, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{vessel}</span>
                              <span>{data.filter((row) => row.vessel === vessel).length}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {type === "transport" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Top Vessels</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(data.map((row) => row.vessel)))
                          .slice(0, 5)
                          .map((vessel, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{vessel}</span>
                              <span>{data.filter((row) => row.vessel === vessel).length}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Nationalities</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Array.from(new Set(data.map((row) => row.nationality)))
                          .slice(0, 5)
                          .map((nationality, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{nationality}</span>
                              <span>{data.filter((row) => row.nationality === nationality).length}</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
