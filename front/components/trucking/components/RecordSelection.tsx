import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ListChecks, Search, AlertCircle } from "lucide-react"
import type { ExcelRecord as IndividualExcelRecord } from "@/lib/features/records/recordsSlice"

interface RecordSelectionProps {
  filteredPendingRecords: IndividualExcelRecord[]
  selectedRecordIds: string[]
  searchTerm: string
  onSearchChange: (value: string) => void
  onRecordSelectionChange: (recordId: string, checked: boolean) => void
}

export function RecordSelection({
  filteredPendingRecords,
  selectedRecordIds,
  searchTerm,
  onSearchChange,
  onRecordSelectionChange,
}: RecordSelectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <ListChecks className="mr-2 h-6 w-6" />
          Seleccionar Registros Individuales Pendientes
        </CardTitle>
        <CardDescription>Elige los servicios de Excel para incluir en la factura.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Label htmlFor="searchRecords" className="sr-only">
            Buscar Registros
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="searchRecords"
              type="search"
              placeholder="Buscar por cliente, RUC, contenedor, BL, ID de registro..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
        </div>
        {filteredPendingRecords.length > 0 ? (
          <div className="max-h-[400px] overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Sel.</TableHead>
                  <TableHead>ID Registro</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>RUC/Cédula</TableHead>
                  <TableHead>Contenedor</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPendingRecords.map((record) => {
                  const data = record.data as Record<string, any>
                  return (
                    <TableRow
                      key={record.id}
                      className={selectedRecordIds.includes(record.id) ? "bg-muted/50" : ""}
                      onClick={() => onRecordSelectionChange(record.id, !selectedRecordIds.includes(record.id))}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Checkbox checked={selectedRecordIds.includes(record.id)} readOnly />
                      </TableCell>
                      <TableCell className="font-medium">{record.id.split("-").pop()}</TableCell>
                      <TableCell>{data.fecha}</TableCell>
                      <TableCell>{String(data.cliente || "N/A")}</TableCell>
                      <TableCell>{String(data.ruc || "N/A")}</TableCell>
                      <TableCell>{String(data.contenedor || "N/A")}</TableCell>
                      <TableCell className="text-right">$ {record.totalValue.toFixed(2)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No hay registros individuales pendientes</AlertTitle>
            <AlertDescription>
              No se encontraron registros individuales pendientes para Trucking.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}