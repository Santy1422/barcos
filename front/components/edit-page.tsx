"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, FileText, Save, Send, Upload } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { mockXmlFiles } from "@/lib/mock-data"
import { Separator } from "@/components/ui/separator"

export function EditPage({ id }: { id: string }) {
  const file = mockXmlFiles.find((f) => f.id === id) || mockXmlFiles[0]
  const [editedFile, setEditedFile] = useState({ ...file })

  const handleInputChange = (field: string, value: string) => {
    setEditedFile((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Editar XML</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Descargar Excel
          </Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Detalles de la Factura</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="header" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="header">Encabezado</TabsTrigger>
                <TabsTrigger value="customer">Cliente</TabsTrigger>
                <TabsTrigger value="items">Ítems</TabsTrigger>
              </TabsList>
              <TabsContent value="header" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-code">Código de Compañía</Label>
                    <Input
                      id="company-code"
                      value={editedFile.id || ""}
                      onChange={(e) => handleInputChange("id", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="document-type">Tipo de Documento</Label>
                    <Input
                      id="document-type"
                      value={editedFile.type || ""}
                      onChange={(e) => handleInputChange("type", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reference">Referencia</Label>
                    <Input
                      id="reference"
                      value={editedFile.filename || ""}
                      onChange={(e) => handleInputChange("filename", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha del Documento</Label>
                    <Input
                      id="date"
                      value={editedFile.uploadDate || ""}
                      onChange={(e) => handleInputChange("uploadDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="posting-date">Fecha de Contabilización</Label>
                    <Input
                      id="posting-date"
                      value={editedFile.uploadDate || ""}
                      onChange={(e) => handleInputChange("uploadDate", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda</Label>
                    <Input
                      id="currency"
                      value={editedFile.status || ""}
                      onChange={(e) => handleInputChange("status", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="customer" className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer-number">Número de Cliente</Label>
                    <Input
                      id="customer-number"
                      value={editedFile.size?.toString() || "6423"}
                      onChange={(e) => handleInputChange("size", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer-name">Nombre del Cliente</Label>
                    <Input
                      id="customer-name"
                      value={editedFile.mainClient || ""}
                      onChange={(e) => handleInputChange("mainClient", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Monto</Label>
                    <Input
                      id="amount"
                      value={editedFile.records?.toString() || ""}
                      onChange={(e) => handleInputChange("records", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profit-center">Centro de Beneficio</Label>
                    <Input
                      id="profit-center"
                      value={"ZADURB220"}
                      onChange={(e) => handleInputChange("profitCenter", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-block">Bloqueo de Pago</Label>
                    <Input
                      id="payment-block"
                      value={"A"}
                      onChange={(e) => handleInputChange("paymentBlock", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="due-date">Fecha de Vencimiento</Label>
                    <Input
                      id="due-date"
                      value={editedFile.uploadDate || ""}
                      onChange={(e) => handleInputChange("dueDate", e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="items" className="pt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Impuesto</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>
                        <Input defaultValue="FCL047" className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input defaultValue="R108,00 MSC0160 - 50117" className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input defaultValue="3" className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input defaultValue="108.00" className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input defaultValue="48.60" className="h-8" />
                      </TableCell>
                      <TableCell>
                        <Input defaultValue="372.60" className="h-8" />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
                <Button variant="outline" size="sm" className="mt-4">
                  Agregar Ítem
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Información del Archivo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <div className="text-sm font-medium">Referencia</div>
                <div>{editedFile.reference}</div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium">Estado</div>
                <div className="capitalize">{editedFile.status}</div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium">Fecha de Carga</div>
                <div>{editedFile.uploadDate || editedFile.date}</div>
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="text-sm font-medium">Usuario</div>
                <div>{editedFile.user || "Juan Pérez"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documentos Adjuntos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>factura_original.pdf</span>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>soporte_pago.pdf</span>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="pt-2">
                <Button variant="outline" className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Subir Documento
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Acciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </Button>
              <Button variant="outline" className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Transmitir a SAP
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
