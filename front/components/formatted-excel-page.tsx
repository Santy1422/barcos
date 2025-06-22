"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { FileSpreadsheet, Plus, Eye } from "lucide-react"
import { mockExcelFiles, excelTypes } from "@/lib/mock-data"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function FormattedExcelPage() {
  const formattedFiles = mockExcelFiles.filter((file) => file.status === "formateado")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("todos")

  const handleSelectAll = () => {
    if (selectedFiles.length === formattedFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(formattedFiles.map((file) => file.id))
    }
  }

  const handleSelectFile = (id: string) => {
    if (selectedFiles.includes(id)) {
      setSelectedFiles(selectedFiles.filter((fileId) => fileId !== id))
    } else {
      setSelectedFiles([...selectedFiles, id])
    }
  }

  const filteredFiles = formattedFiles.filter((file) => {
    const matchesSearch = searchTerm === "" || file.filename.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === "todos" || file.type === typeFilter
    return matchesSearch && matchesType
  })

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
        <h1 className="text-3xl font-bold">Excel Formateados</h1>
        <Button disabled={selectedFiles.length === 0} asChild>
          <Link href="/crear-factura">
            <Plus className="mr-2 h-4 w-4" />
            Crear Factura con Seleccionados ({selectedFiles.length})
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar archivo</label>
              <Input
                placeholder="Nombre del archivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Excel</label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los tipos</SelectItem>
                  {excelTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button className="w-full">Aplicar Filtros</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Excel Formateados ({filteredFiles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>Archivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Fecha de Carga</TableHead>
                <TableHead>Registros</TableHead>
                <TableHead>Cliente Principal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">
                    No hay archivos Excel formateados disponibles.
                  </TableCell>
                </TableRow>
              ) : (
                filteredFiles.map((file) => {
                  const typeInfo = getTypeInfo(file.type || "")
                  return (
                    <TableRow key={file.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedFiles.includes(file.id)}
                          onCheckedChange={() => handleSelectFile(file.id)}
                          aria-label={`Seleccionar ${file.filename}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          {file.filename}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant={getTypeBadgeVariant(file.type || "")}>
                            {typeInfo?.name || "Desconocido"}
                          </Badge>
                          {typeInfo && <span className="text-xs text-muted-foreground">{typeInfo.description}</span>}
                        </div>
                      </TableCell>
                      <TableCell>{file.uploadDate}</TableCell>
                      <TableCell>{file.records || 0}</TableCell>
                      <TableCell>{file.mainClient || "-"}</TableCell>
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
                          {file.status === "formateado" && "Formateado"}
                          {file.status === "procesado" && "Procesado"}
                          {file.status === "pendiente" && "Pendiente"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Archivos seleccionados: {selectedFiles.length}</h3>
                <div className="flex gap-2 mt-2">
                  {selectedFiles.map((fileId) => {
                    const file = filteredFiles.find((f) => f.id === fileId)
                    const typeInfo = getTypeInfo(file?.type || "")
                    return (
                      <Badge key={fileId} variant={getTypeBadgeVariant(file?.type || "")}>
                        {typeInfo?.name}
                      </Badge>
                    )
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Estos archivos se utilizarán para crear una nueva factura
                </p>
              </div>
              <Button asChild>
                <Link href="/crear-factura">
                  <Plus className="mr-2 h-4 w-4" />
                  Continuar a Crear Factura
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
