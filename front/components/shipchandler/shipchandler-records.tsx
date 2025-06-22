"use client"

import { useState } from "react"
import { useAppSelector } from "@/lib/hooks" // Asegúrate que useAppSelector esté bien tipado
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Ship, Search, Download, Eye, Edit, Package, FileText, Truck } from "lucide-react" // Añadido Truck
import { FileSpreadsheet } from "lucide-react"

export function ShipchandlerRecords() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Acceder a los datos desde el store de Redux
  const supplyOrders = useAppSelector((state) =>
    state.supplyOrders.supplyOrders.filter((order) => order.module === "shipchandler"),
  )
  const inventoryRecords = useAppSelector((state) =>
    state.inventory.inventory.filter((item) => item.module === "shipchandler"),
  )
  const deliveryNotes = useAppSelector((state) =>
    state.deliveryNotes.deliveryNotes.filter((note) => note.module === "shipchandler"),
  )
  const invoices = useAppSelector((state) => state.invoice.invoices.filter((inv) => inv.module === "shipchandler"))
  const serviceRecords = useAppSelector((state) => state.records.records.filter((rec) => rec.module === "shipchandler"))

  const filteredSupplyOrders = supplyOrders.filter((order) => {
    const matchesSearch =
      order.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.agent && order.agent.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const filteredInventory = inventoryRecords.filter((item) => {
    const matchesSearch =
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.supplier && item.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const filteredDeliveryNotes = deliveryNotes.filter((note) => {
    const matchesSearch =
      note.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.deliveryNoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (note.supplier && note.supplier.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || note.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Registros - Shipchandler</h1>
          <p className="text-muted-foreground">Historial completo de abastecimientos y inventario</p>
        </div>
      </div>

      <Tabs defaultValue="supply-orders" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          {" "}
          {/* Ajustado a 5 columnas */}
          <TabsTrigger value="supply-orders">
            <Package className="h-4 w-4 mr-2" />
            Órdenes
          </TabsTrigger>
          <TabsTrigger value="inventory">
            <FileText className="h-4 w-4 mr-2" />
            Inventario
          </TabsTrigger>
          <TabsTrigger value="deliveries">
            <Truck className="h-4 w-4 mr-2" /> {/* Icono cambiado */}
            Entregas
          </TabsTrigger>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Facturas
          </TabsTrigger>
          <TabsTrigger value="services">
            <FileText className="h-4 w-4 mr-2" />
            Servicios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="supply-orders" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Órdenes de Suministro</CardTitle>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por buque, ID o agente..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Estados</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="En Proceso">En Proceso</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                    <SelectItem value="Facturado">Facturado</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredSupplyOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay órdenes de suministro.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Buque</TableHead>
                      <TableHead>IMO</TableHead>
                      <TableHead>ETA</TableHead>
                      <TableHead>Agente</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Factura ID</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSupplyOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium text-xs">{order.id.slice(-6)}</TableCell>
                        <TableCell>{order.vesselName}</TableCell>
                        <TableCell>{order.vesselIMO}</TableCell>
                        <TableCell>{new Date(order.eta).toLocaleDateString()}</TableCell>
                        <TableCell>{order.agent}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.itemsCount} items</Badge>
                        </TableCell>
                        <TableCell>${order.totalValue.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              order.status === "Completado" || order.status === "Facturado"
                                ? "success"
                                : order.status === "En Proceso"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{order.invoiceId?.slice(-6) || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Control de Inventario</CardTitle>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las Categorías</SelectItem>
                    <SelectItem value="Combustibles">Combustibles</SelectItem>
                    <SelectItem value="Alimentos">Alimentos</SelectItem>
                    <SelectItem value="Agua">Agua</SelectItem>
                    <SelectItem value="Repuestos">Repuestos</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInventory.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay items en el inventario.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Stock Actual</TableHead>
                      <TableHead>Stock Mín/Máx</TableHead>
                      <TableHead>Costo Unit.</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productCode}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "Bajo Stock"
                                ? "destructive"
                                : item.status === "Sobre Stock"
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {item.currentStock} {item.unit}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {item.minStock} / {item.maxStock} {item.unit}
                        </TableCell>
                        <TableCell>${item.unitCost.toFixed(2)}</TableCell>
                        <TableCell>${item.totalValue.toLocaleString()}</TableCell>
                        <TableCell>{item.location}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "Bajo Stock"
                                ? "destructive"
                                : item.status === "Sobre Stock"
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notas de Entrega</CardTitle>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar entregas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Pendiente">Pendiente</SelectItem>
                    <SelectItem value="Entregado">Entregado</SelectItem>
                    <SelectItem value="Parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredDeliveryNotes.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay notas de entrega.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Nota</TableHead>
                      <TableHead>Buque</TableHead>
                      <TableHead>Fecha Entrega</TableHead>
                      <TableHead>Productos</TableHead>
                      <TableHead>Valor Total</TableHead>
                      <TableHead>Entregado Por</TableHead>
                      <TableHead>Recibido Por</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveryNotes.map((note) => (
                      <TableRow key={note.id}>
                        <TableCell className="font-medium">{note.deliveryNoteNumber}</TableCell>
                        <TableCell>{note.vesselName}</TableCell>
                        <TableCell>{new Date(note.deliveryDate).toLocaleDateString()}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{note.products}</TableCell>
                        <TableCell>${note.totalValue.toLocaleString()}</TableCell>
                        <TableCell>{note.deliveredBy}</TableCell>
                        <TableCell>{note.receivedBy}</TableCell>
                        <TableCell>
                          <Badge variant={note.status === "Entregado" ? "success" : "default"}>{note.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Creadas (Shipchandler)</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay facturas de Shipchandler creadas.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Factura</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Buque</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>XML</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.client}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                        <TableCell>{invoice.vesselName || "N/A"}</TableCell>
                        <TableCell>
                          ${invoice.total.toFixed(2)} {invoice.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.status === "creada" ? "success" : "default"}>{invoice.status}</Badge>
                        </TableCell>
                        <TableCell>{invoice.xmlData ? <FileText className="h-5 w-5 text-green-600" /> : "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registros de Servicios (Shipchandler)</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No hay registros de servicios de Shipchandler.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Servicio</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Buque</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Factura ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {serviceRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="text-xs">{record.id.slice(-10)}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell>{record.vesselName || "N/A"}</TableCell>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>${record.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "facturado" ? "success" : "outline"}>{record.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{record.invoiceId?.slice(-6) || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 3. Actualizar shipchandler-records.tsx
const excelRecords = useAppSelector((state) => {
  // Obtener todos los registros de Excel de shipchandler
  return state.records.individualRecords.filter(
    (record) => record.module === "shipchandler" && record.type === "supply-order"
  )
})

<Tabs defaultValue="supply-orders" className="w-full">
  <TabsList className="grid w-full grid-cols-6">
    <TabsTrigger value="supply-orders">
      <Package className="h-4 w-4 mr-2" />
      Órdenes
    </TabsTrigger>
    <TabsTrigger value="excel-records">
      <FileSpreadsheet className="h-4 w-4 mr-2" />
      Registros Excel
    </TabsTrigger>
    <TabsTrigger value="inventory">
      <FileText className="h-4 w-4 mr-2" />
      Inventario
    </TabsTrigger>
    <TabsTrigger value="deliveries">
      <Truck className="h-4 w-4 mr-2" />
      Entregas
    </TabsTrigger>
    <TabsTrigger value="invoices">
      <FileText className="h-4 w-4 mr-2" />
      Facturas
    </TabsTrigger>
    <TabsTrigger value="services">
      <FileText className="h-4 w-4 mr-2" />
      Servicios
    </TabsTrigger>
  </TabsList>

  <TabsContent value="excel-records" className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle>Registros de Excel - Shipchandler</CardTitle>
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              placeholder="Buscar por cliente, B/L o buque..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="facturado">Facturado</SelectItem>
              <SelectItem value="anulado">Anulado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>B/L</TableHead>
                <TableHead>Buque</TableHead>
                <TableHead>Tamaño</TableHead>
                <TableHead>N° Contenedor</TableHead>
                <TableHead>Tarifa</TableHead>
                <TableHead>Fecha Facturación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {excelRecords
                .filter((record) => {
                  const data = record.data as ShipchandlerExcelRecord
                  const matchesSearch = 
                    data.clientes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    data.bl.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    data.buque.toLowerCase().includes(searchTerm.toLowerCase())
                  const matchesStatus = statusFilter === "all" || record.status === statusFilter
                  return matchesSearch && matchesStatus
                })
                .map((record) => {
                  const data = record.data as ShipchandlerExcelRecord
                  return (
                    <TableRow key={record.id}>
                      <TableCell>{data.fecha}</TableCell>
                      <TableCell>{data.clientes}</TableCell>
                      <TableCell className="font-mono text-xs">{data.bl}</TableCell>
                      <TableCell>{data.buque}</TableCell>
                      <TableCell>{data.tamano}"</TableCell>
                      <TableCell className="font-mono text-xs">{data.numeroContenedor}</TableCell>
                      <TableCell>${data.tarifa.toFixed(2)}</TableCell>
                      <TableCell>{data.fechaFacturacion}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            record.status === "facturado" ? "default" :
                            record.status === "pendiente" ? "secondary" : "destructive"
                          }
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              }
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </TabsContent>
</Tabs>
