"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileSpreadsheet, Save, FileText, Eye } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { mockExcelData } from "@/lib/mock-data"
import { InvoicePreview } from "@/components/invoice-preview"

export function CreateInvoicePage() {
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: "AG-1608",
    client: "MSC LOGISTICS",
    customerRuc: "155600922-2-2015",
    customerDv: "69",
    customerAddress:
      "PANAMA PACIFICO, INTERNATIONAL BUSINESS PARK\nBUILDING 3855, FLOOR 2\nPANAMA, REPUBLICA DE PANAMA",
    customerPhone: "(507) 838-9806",
    date: new Date().toISOString().split("T")[0],
    currency: "USD",
    notes: "",
    bankAccount: "03-XXXXXXXXXXXXXXXXXXXX",
  })

  const [showPreview, setShowPreview] = useState(false)
  const [selectedExcelData] = useState(mockExcelData)

  // Agrupar servicios por descripción
  const groupedServices = selectedExcelData.reduce((acc: any, item) => {
    const key = item.descripcion
    if (!acc[key]) {
      acc[key] = {
        description: item.descripcion,
        people: [],
        code: item.codigo,
        price: 0,
        time: item.hora,
        date: item.fecha,
      }
    }
    if (item.persona) {
      acc[key].people.push(item.persona)
    }
    acc[key].price += item.precio
    return acc
  }, {})

  const services = Object.values(groupedServices)
  const subtotal = services.reduce((sum: number, service: any) => sum + service.price, 0)
  const tax = 0 // Sin impuestos según la factura
  const total = subtotal + tax

  const handleInputChange = (field: string, value: string) => {
    setInvoiceData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleCreateInvoice = () => {
    console.log("Creando factura con datos:", invoiceData)
    console.log("Servicios:", services)
    // Aquí se crearía la factura y se generaría el XML
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Crear Factura</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="mr-2 h-4 w-4" />
            {showPreview ? "Ocultar" : "Vista Previa"}
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Guardar Borrador
          </Button>
          <Button onClick={handleCreateInvoice}>
            <FileText className="mr-2 h-4 w-4" />
            Crear Factura
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Detalles de la Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="cliente">Cliente</TabsTrigger>
                <TabsTrigger value="servicios">Servicios</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="invoice-number">Número de Factura</Label>
                    <Input
                      id="invoice-number"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha de Factura</Label>
                    <Input
                      id="date"
                      type="date"
                      value={invoiceData.date}
                      onChange={(e) => handleInputChange("date", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Select
                      value={invoiceData.currency}
                      onValueChange={(value) => handleInputChange("currency", value)}
                    >
                      <SelectTrigger id="currency">
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                        <SelectItem value="PAB">PAB - Balboa Panameño</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank-account">Cuenta Bancaria</Label>
                    <Input
                      id="bank-account"
                      value={invoiceData.bankAccount}
                      onChange={(e) => handleInputChange("bankAccount", e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionales para la factura..."
                    value={invoiceData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="cliente" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Cliente</Label>
                    <Select value={invoiceData.client} onValueChange={(value) => handleInputChange("client", value)}>
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MSC LOGISTICS">MSC LOGISTICS</SelectItem>
                        <SelectItem value="GLOBAL SHIPPING CO.">GLOBAL SHIPPING CO.</SelectItem>
                        <SelectItem value="TRANSOCEAN LOGISTICS">TRANSOCEAN LOGISTICS</SelectItem>
                        <SelectItem value="SEAFREIGHT INTERNATIONAL">SEAFREIGHT INTERNATIONAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-ruc">RUC del Cliente</Label>
                    <Input
                      id="customer-ruc"
                      value={invoiceData.customerRuc}
                      onChange={(e) => handleInputChange("customerRuc", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-dv">D.V.</Label>
                    <Input
                      id="customer-dv"
                      value={invoiceData.customerDv}
                      onChange={(e) => handleInputChange("customerDv", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-phone">Teléfono</Label>
                    <Input
                      id="customer-phone"
                      value={invoiceData.customerPhone}
                      onChange={(e) => handleInputChange("customerPhone", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="customer-address">Dirección</Label>
                    <Textarea
                      id="customer-address"
                      value={invoiceData.customerAddress}
                      onChange={(e) => handleInputChange("customerAddress", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="servicios" className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Personas</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Hora</TableHead>
                      <TableHead className="text-right">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {services.map((service: any, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{service.description}</TableCell>
                        <TableCell>
                          {service.people.length > 0 ? (
                            <div className="space-y-1">
                              {service.people.map((person: string, i: number) => (
                                <div key={i} className="text-sm">
                                  {person}
                                </div>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>{service.code}</TableCell>
                        <TableCell>{service.time || "-"}</TableCell>
                        <TableCell className="text-right">
                          ${service.price.toFixed(2)} {invoiceData.currency}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Archivos Excel Procesados</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">servicios_transporte_agosto.xlsx</span>
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium">Total de servicios: {services.length}</div>
                <div className="text-sm text-muted-foreground">
                  Personas atendidas: {services.reduce((acc: number, s: any) => acc + s.people.length, 0)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen de Factura</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    ${subtotal.toFixed(2)} {invoiceData.currency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>
                    ${tax.toFixed(2)} {invoiceData.currency}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>TOTAL:</span>
                  <span>
                    ${total.toFixed(2)} {invoiceData.currency}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full" onClick={handleCreateInvoice}>
                <FileText className="mr-2 h-4 w-4" />
                Crear Factura
              </Button>
              <Button variant="outline" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar Borrador
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de la Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoicePreview invoiceData={invoiceData} services={services} subtotal={subtotal} tax={tax} total={total} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
