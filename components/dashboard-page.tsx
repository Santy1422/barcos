"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileSpreadsheet, FileText, Plus, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { mockExcelFiles, mockInvoices, excelTypes } from "@/lib/mock-data"

export function DashboardPage() {
  const [excelFiles] = useState(mockExcelFiles)
  const [invoices] = useState(mockInvoices)

  const pendingExcel = excelFiles.filter((file) => file.status === "pendiente")
  const formattedExcel = excelFiles.filter((file) => file.status === "formateado")
  const processedExcel = excelFiles.filter((file) => file.status === "procesado")
  const createdInvoices = invoices.filter((invoice) => invoice.status === "creada")

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "tracking":
        return "default"
      case "invoices":
        return "secondary"
      case "transport":
        return "outline"
      default:
        return "default"
    }
  }

  const getTypeInfo = (typeId: string) => {
    return excelTypes.find((type) => type.id === typeId)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button asChild>
            <Link href="/subir-excel">
              <Upload className="mr-2 h-4 w-4" />
              Subir Excel
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/crear-factura">
              <Plus className="mr-2 h-4 w-4" />
              Crear Factura
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excel Pendientes</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingExcel.length}</div>
            <p className="text-xs text-muted-foreground">Archivos pendientes de formateo</p>
            <Progress value={(pendingExcel.length / excelFiles.length) * 100} className="mt-3 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excel Formateados</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formattedExcel.length}</div>
            <p className="text-xs text-muted-foreground">Listos para crear facturas</p>
            <Progress value={(formattedExcel.length / excelFiles.length) * 100} className="mt-3 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Excel Procesados</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{processedExcel.length}</div>
            <p className="text-xs text-muted-foreground">Archivos ya utilizados</p>
            <Progress value={(processedExcel.length / excelFiles.length) * 100} className="mt-3 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facturas Creadas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{createdInvoices.length}</div>
            <p className="text-xs text-muted-foreground">Facturas generadas</p>
            <Progress value={(createdInvoices.length / 10) * 100} className="mt-3 h-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Archivos Excel Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Archivo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excelFiles.slice(0, 5).map((file) => {
                  const typeInfo = getTypeInfo(file.type || "")
                  return (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          {file.filename}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(file.type || "")}>{typeInfo?.name || "Desconocido"}</Badge>
                      </TableCell>
                      <TableCell>{file.uploadDate}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            file.status === "formateado"
                              ? "success"
                              : file.status === "procesado"
                                ? "outline"
                                : "default"
                          }
                        >
                          {file.status === "pendiente" && "Pendiente"}
                          {file.status === "formateado" && "Formateado"}
                          {file.status === "procesado" && "Procesado"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Facturas Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.slice(0, 5).map((invoice) => {
                  const typeInfo = getTypeInfo(invoice.type || "")
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.client}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(invoice.type || "")}>
                          {typeInfo?.name || "Desconocido"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.amount} {invoice.currency}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Excel Soportados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {excelTypes.map((type) => (
              <div key={type.id} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={getTypeBadgeVariant(type.id)}>{type.name}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{type.description}</p>
                <div className="text-xs text-muted-foreground">
                  <strong>Campos principales:</strong>
                  <div className="mt-1">
                    {type.fields.slice(0, 3).join(", ")}
                    {type.fields.length > 3 && ` ... (+${type.fields.length - 3} más)`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
