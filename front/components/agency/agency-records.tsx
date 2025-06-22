"use client"

import { useState } from "react"
import { useAppSelector } from "@/lib/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Search, Download, Eye, Edit, Car, FileText, Clock } from "lucide-react"

export function AgencyRecords() {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [rankFilter, setRankFilter] = useState("all")

  const crewTransports = useAppSelector((state) =>
    state.records.records.filter((rec) => rec.module === "agency" && rec.type === "transport"),
  )
  const crewManifests = useAppSelector((state) =>
    state.records.records.filter((rec) => rec.module === "agency" && rec.type === "manifest"),
  )
  const driverAssignments = useAppSelector((state) =>
    state.records.records.filter((rec) => rec.module === "agency" && rec.type === "driver"),
  )
  const invoices = useAppSelector((state) => state.invoice.invoices.filter((inv) => inv.module === "agency"))
  const serviceRecords = useAppSelector((state) =>
    state.records.records.filter((rec) => rec.module === "agency" && rec.type === "service"),
  )

  const filteredTransports = crewTransports.filter((transport) => {
    const matchesSearch =
      transport.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transport.crewMember.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transport.id.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || transport.status === statusFilter
    const matchesRank = rankFilter === "all" || transport.rank === rankFilter
    return matchesSearch && matchesStatus && matchesRank
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
          <Users className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Registros - Agency</h1>
          <p className="text-muted-foreground">Consulta las facturas y servicios de Agency</p>
        </div>
      </div>

      <Tabs defaultValue="transports" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="transports">
            <Car className="h-4 w-4 mr-2" />
            Transportes
          </TabsTrigger>
          <TabsTrigger value="manifests">
            <FileText className="h-4 w-4 mr-2" />
            Manifiestos
          </TabsTrigger>
          <TabsTrigger value="drivers">
            <Clock className="h-4 w-4 mr-2" />
            Asignaciones
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

        <TabsContent value="transports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transportes de Tripulación</CardTitle>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por buque, tripulante o ID..."
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
                    <SelectItem value="Programado">Programado</SelectItem>
                    <SelectItem value="En Tránsito">En Tránsito</SelectItem>
                    <SelectItem value="Completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={rankFilter} onValueChange={setRankFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Rango" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los Rangos</SelectItem>
                    <SelectItem value="CAPTAIN">Captain</SelectItem>
                    <SelectItem value="CHIEF OFFICER">Chief Officer</SelectItem>
                    <SelectItem value="CHIEF ENGINEER">Chief Engineer</SelectItem>
                    <SelectItem value="THIRD ENGINEER">Third Engineer</SelectItem>
                    <SelectItem value="OFFICER">Officer</SelectItem>
                    <SelectItem value="CREW">Crew</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Buque</TableHead>
                    <TableHead>Viaje</TableHead>
                    <TableHead>Tripulante</TableHead>
                    <TableHead>Rango</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Tarifa</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransports.map((transport) => (
                    <TableRow key={transport.id}>
                      <TableCell className="font-medium">{transport.id}</TableCell>
                      <TableCell>{transport.vesselName}</TableCell>
                      <TableCell>{transport.voyage}</TableCell>
                      <TableCell>{transport.crewMember}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transport.rank === "CAPTAIN"
                              ? "destructive"
                              : transport.rank.includes("CHIEF")
                                ? "default"
                                : "secondary"
                          }
                        >
                          {transport.rank}
                        </Badge>
                      </TableCell>
                      <TableCell>{transport.pickupLocation}</TableCell>
                      <TableCell>{transport.dropoffLocation}</TableCell>
                      <TableCell>{transport.pickupTime}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{transport.vehicleType}</Badge>
                      </TableCell>
                      <TableCell>{transport.driver}</TableCell>
                      <TableCell>${transport.totalRate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            transport.status === "Completado"
                              ? "success"
                              : transport.status === "En Tránsito"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {transport.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manifests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Manifiestos de Tripulación</CardTitle>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar manifiestos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Buque</TableHead>
                    <TableHead>Viaje</TableHead>
                    <TableHead>Total Tripulación</TableHead>
                    <TableHead>Embarcan</TableHead>
                    <TableHead>Desembarcan</TableHead>
                    <TableHead>Requieren Transporte</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>ETD</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {crewManifests.map((manifest) => (
                    <TableRow key={manifest.id}>
                      <TableCell className="font-medium">{manifest.id}</TableCell>
                      <TableCell>{manifest.vesselName}</TableCell>
                      <TableCell>{manifest.voyage}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{manifest.totalCrew} personas</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="success">{manifest.joinCrew}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">{manifest.signOffCrew}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="default">{manifest.transportRequired}</Badge>
                      </TableCell>
                      <TableCell>{new Date(manifest.eta).toLocaleString()}</TableCell>
                      <TableCell>{new Date(manifest.etd).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={manifest.status === "Procesado" ? "success" : "default"}>
                          {manifest.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignaciones de Drivers</CardTitle>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar drivers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Button variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Exportar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Vehículo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Total Viajes</TableHead>
                    <TableHead>Horas Trabajadas</TableHead>
                    <TableHead>Ganancias</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {driverAssignments.map((assignment) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">{assignment.id}</TableCell>
                      <TableCell>{assignment.driver}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{assignment.vehicle}</Badge>
                      </TableCell>
                      <TableCell>{new Date(assignment.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge variant="default">{assignment.totalTrips} viajes</Badge>
                      </TableCell>
                      <TableCell>{assignment.totalHours}h</TableCell>
                      <TableCell>${assignment.totalEarnings}</TableCell>
                      <TableCell>⭐ {assignment.rating}</TableCell>
                      <TableCell>
                        <Badge variant={assignment.status === "Completado" ? "success" : "default"}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Facturas Creadas (Agency)</CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <p className="text-muted-foreground">No hay facturas de Agency creadas.</p>
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
                        <TableCell>
                          {invoice.xmlData ? <FileText className="h-5 w-5 text-purple-600" /> : "-"}
                        </TableCell>
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
              <CardTitle>Registros de Servicios (Agency)</CardTitle>
            </CardHeader>
            <CardContent>
              {serviceRecords.length === 0 ? (
                <p className="text-muted-foreground">No hay registros de servicios de Agency.</p>
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
                        <TableCell className="text-xs">{record.id}</TableCell>
                        <TableCell>{record.description}</TableCell>
                        <TableCell>{record.vesselName || "N/A"}</TableCell>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>${record.totalPrice.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={record.status === "facturado" ? "success" : "outline"}>{record.status}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{record.invoiceId || "-"}</TableCell>
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
