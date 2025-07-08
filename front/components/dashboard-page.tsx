"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileSpreadsheet, FileText, Plus, Upload, CheckCircle, Clock, Info, Settings2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { mockExcelFiles, mockInvoices, excelTypes } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type ExcelTypeBadgeVariant = "blue" | "green" | "purple" | "default"
type StatusBadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning" | "info_processed"

const getTypeBadgeVariant = (typeId: string): ExcelTypeBadgeVariant => {
  const typeInfo = excelTypes.find((type) => type.id === typeId)
  if (typeInfo) {
    if (typeInfo.name.toLowerCase().includes("trucking") || typeInfo.name.toLowerCase().includes("transporte"))
      return "blue"
  }
  return "default"
}

const getStatusBadgeVariant = (status: string): StatusBadgeVariant => {
  switch (status.toLowerCase()) {
    case "pendiente":
      return "warning"
    case "formateado":
      return "success"
    case "procesado":
      return "info_processed"
    default:
      return "secondary"
  }
}

const getStatusIcon = (status: string) => {
  switch (status.toLowerCase()) {
    case "pendiente":
      return <Clock className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
    case "formateado":
      return <CheckCircle className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-green-600 dark:text-green-400" />
    case "procesado":
      return <Info className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
    default:
      return <Info className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
  }
}

export function DashboardPage() {
  const [excelFilesData] = useState(mockExcelFiles)
  const [invoicesData] = useState(mockInvoices)

  const pendingExcel = excelFilesData.filter((file) => file.status === "pendiente")
  const formattedExcel = excelFilesData.filter((file) => file.status === "formateado")
  const processedExcel = excelFilesData.filter((file) => file.status === "procesado")
  const createdInvoices = invoicesData.filter((invoice) => invoice.status === "creada")

  const getTypeInfo = (typeId: string) => {
    return excelTypes.find((type) => type.id === typeId)
  }

  const summaryStats = [
    {
      title: "Excel Pendientes",
      value: pendingExcel.length,
      total: excelFilesData.length,
      icon: FileSpreadsheet,
      color: "orange",
      description: "Archivos esperando formato.",
    },
    {
      title: "Excel Formateados",
      value: formattedExcel.length,
      total: excelFilesData.length,
      icon: FileSpreadsheet,
      color: "green",
      description: "Listos para crear facturas.",
    },
    {
      title: "Excel Procesados",
      value: processedExcel.length,
      total: excelFilesData.length,
      icon: FileSpreadsheet,
      color: "blue",
      description: "Archivos ya utilizados.",
    },
    {
      title: "Facturas Creadas",
      value: createdInvoices.length,
      total: Math.max(10, createdInvoices.length),
      icon: FileText,
      color: "purple",
      description: "Facturas generadas.",
    },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 bg-muted/30 dark:bg-background">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Dashboard de Facturación</h1>
            <p className="text-sm text-muted-foreground mt-1">Resumen general de actividad y accesos rápidos.</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button asChild size="default">
              <Link href="/subir-excel">
                <Upload className="mr-2 h-4 w-4" />
                Subir Excel
              </Link>
            </Button>
            <Button variant="outline" asChild size="default">
              <Link href="/crear-factura">
                <Plus className="mr-2 h-4 w-4" />
                Crear Factura
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Cards Section */}
        <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {summaryStats.map((stat) => (
            <Card
              key={stat.title}
              className="shadow-sm hover:shadow-md transition-shadow duration-300 border-l-4"
              style={{ borderLeftColor: `var(--color-${stat.color}-500)` }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                <stat.icon className={cn("h-5 w-5", `text-${stat.color}-500 dark:text-${stat.color}-400`)} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.description}</p>
                <Progress
                  value={stat.total > 0 ? (stat.value / stat.total) * 100 : 0}
                  className={cn(
                    "mt-3 h-1.5",
                    `[&>div]:bg-${stat.color}-500 dark:[&>div]:bg-${stat.color}-400`,
                    `bg-${stat.color}-100 dark:bg-${stat.color}-900`,
                  )}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Files and Invoices Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Archivos Excel Recientes</CardTitle>
              <CardDescription>Últimos 5 archivos subidos o modificados.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Archivo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="pr-6 text-right">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {excelFilesData.slice(0, 5).map((file) => {
                    const typeInfo = getTypeInfo(file.type || "")
                    return (
                      <TableRow key={file.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium pl-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <FileSpreadsheet className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-xs" title={file.filename}>
                              {file.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={getTypeBadgeVariant(file.type || "")}
                            className="capitalize text-xs px-2 py-0.5"
                          >
                            {typeInfo?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">{file.uploadDate}</TableCell>
                        <TableCell className="pr-6 py-3 text-right">
                          <Badge
                            variant={getStatusBadgeVariant(file.status)}
                            className="capitalize text-xs px-2 py-0.5 inline-flex items-center"
                          >
                            {getStatusIcon(file.status)}
                            {file.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {excelFilesData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        No hay archivos Excel recientes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {excelFilesData.length > 5 && (
              <CardFooter className="p-4 border-t justify-end">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/excel-formateados">Ver todos ({excelFilesData.length})</Link>
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-foreground">Facturas Recientes</CardTitle>
              <CardDescription>Últimas 5 facturas generadas.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Factura #</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="pr-6 text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoicesData.slice(0, 5).map((invoice) => {
                    const typeInfo = getTypeInfo(invoice.type || "")
                    return (
                      <TableRow key={invoice.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium pl-6 py-3">{invoice.invoiceNumber}</TableCell>
                        <TableCell
                          className="py-3 text-sm text-muted-foreground truncate max-w-[100px] sm:max-w-[150px]"
                          title={invoice.client}
                        >
                          {invoice.client}
                        </TableCell>
                        <TableCell className="py-3">
                          <Badge
                            variant={getTypeBadgeVariant(invoice.type || "")}
                            className="capitalize text-xs px-2 py-0.5"
                          >
                            {typeInfo?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6 py-3 text-sm text-foreground font-medium text-right">
                          {invoice.amount} {invoice.currency}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {invoicesData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        No hay facturas recientes.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {invoicesData.length > 5 && (
              <CardFooter className="p-4 border-t justify-end">
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/facturas-creadas">Ver todas ({invoicesData.length})</Link>
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Supported Excel Types Section */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground">Tipos de Excel Soportados</CardTitle>
            <CardDescription>Formatos de archivo que puedes utilizar para la facturación.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {excelTypes.map((type) => (
                <Card key={type.id} className="bg-card hover:shadow-md transition-shadow duration-200 flex flex-col">
                  <CardHeader className="pb-2">
                    <Badge variant={getTypeBadgeVariant(type.id)} className="capitalize w-fit text-xs px-2.5 py-1">
                      {type.name}
                    </Badge>
                  </CardHeader>
                  <CardContent className="pt-1 flex-grow">
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3 h-[3.75rem]">{type.description}</p>{" "}
                    {/* approx 3 lines */}
                    <div className="text-xs text-muted-foreground">
                      <strong className="text-foreground/80">Campos principales:</strong>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1">
                        {type.fields.slice(0, 2).map((field) => (
                          <li key={field} className="truncate" title={field}>
                            {field}
                          </li>
                        ))}
                      </ul>
                      {type.fields.length > 2 && (
                        <p className="mt-1 text-xs text-muted-foreground/80">... y {type.fields.length - 2} más</p>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="pt-3 mt-auto">
                    <Button variant="secondary" size="sm" className="w-full text-xs" asChild>
                      <Link href={`/configuracion?type=${type.id}`}>
                        <Settings2 className="mr-1.5 h-3.5 w-3.5" /> Configurar
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
              {excelTypes.length === 0 && (
                <p className="text-center text-muted-foreground py-10 sm:col-span-2 lg:col-span-3">
                  No hay tipos de Excel configurados.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
