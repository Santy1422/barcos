"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Edit, Trash2, AlertCircle } from "lucide-react"
import { format } from "date-fns"

interface PrefacturaTableProps {
  records: any[]
  selectedIds: string[]
  onSelectionChange: (id: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onRecordView: (record: any) => void
  onRecordEdit: (record: any) => void
  onRecordDelete: (id: string) => void
  canSelectRecord: (record: any) => boolean
  getRecordId: (record: any) => string
  getRecordType: (record: any) => "local" | "trasiego"
  getRecordClient: (record: any) => any
}

export function PrefacturaTable({
  records,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  onRecordView,
  onRecordEdit,
  onRecordDelete,
  canSelectRecord,
  getRecordId,
  getRecordType,
  getRecordClient
}: PrefacturaTableProps) {
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return format(new Date(dateString), "dd/MM/yyyy")
    } catch {
      return dateString
    }
  }

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount
    if (isNaN(num)) return "$0.00"
    return new Intl.NumberFormat("es-PA", {
      style: "currency",
      currency: "USD"
    }).format(num)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completado":
        return <Badge className="bg-green-500 text-white">Completado</Badge>
      case "pendiente":
        return <Badge className="bg-yellow-500 text-white">Pendiente</Badge>
      case "prefacturado":
        return <Badge className="bg-blue-500 text-white">Prefacturado</Badge>
      case "facturado":
        return <Badge className="bg-purple-500 text-white">Facturado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: "local" | "trasiego") => {
    return type === "local" 
      ? <Badge className="bg-blue-100 text-blue-800">Local</Badge>
      : <Badge className="bg-green-100 text-green-800">Trasiego</Badge>
  }

  const allSelectableChecked = records
    .filter(canSelectRecord)
    .every(record => selectedIds.includes(getRecordId(record)))

  const someSelectableChecked = records
    .filter(canSelectRecord)
    .some(record => selectedIds.includes(getRecordId(record)))

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50">
            <TableHead className="w-[50px]">
              <Checkbox
                checked={allSelectableChecked}
                indeterminate={!allSelectableChecked && someSelectableChecked}
                onCheckedChange={onSelectAll}
                disabled={records.filter(canSelectRecord).length === 0}
              />
            </TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Contenedor/Orden</TableHead>
            <TableHead>Fecha Mov.</TableHead>
            <TableHead>Monto</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                No se encontraron registros
              </TableCell>
            </TableRow>
          ) : (
            records.map((record) => {
              const recordId = getRecordId(record)
              const recordType = getRecordType(record)
              const recordClient = getRecordClient(record)
              const canSelect = canSelectRecord(record)
              const isSelected = selectedIds.includes(recordId)
              const data = record.data as Record<string, any>

              return (
                <TableRow 
                  key={recordId}
                  className={`
                    ${isSelected ? "bg-blue-50" : ""}
                    ${!canSelect && selectedIds.length > 0 ? "opacity-50" : ""}
                    ${record.invoiceId ? "bg-gray-50" : ""}
                  `}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => onSelectionChange(recordId, !!checked)}
                        disabled={!canSelect}
                      />
                      {record.invoiceId && (
                        <div className="group relative">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                          <div className="absolute hidden group-hover:block z-50 bg-gray-900 text-white text-xs rounded py-1 px-2 bottom-full left-1/2 transform -translate-x-1/2 mb-1 whitespace-nowrap">
                            Ya prefacturado
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {recordId.slice(-6)}
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(recordType)}
                  </TableCell>
                  <TableCell>
                    {recordClient ? (
                      <div>
                        <div className="font-medium text-sm">
                          {recordClient.type === "natural" 
                            ? recordClient.fullName 
                            : recordClient.companyName}
                        </div>
                        {recordClient.ruc && (
                          <div className="text-xs text-muted-foreground">
                            RUC: {recordClient.ruc}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {recordType === "local" ? (
                      <div>
                        <div className="font-medium">{data.container || "-"}</div>
                        {data.order && (
                          <div className="text-xs text-muted-foreground">
                            Orden: {data.order}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium">{data.containerConsecutive || "-"}</div>
                        {data.leg && (
                          <div className="text-xs text-muted-foreground">
                            Leg: {data.leg}
                          </div>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {formatDate(data.moveDate || record.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {formatCurrency(data.totalAmount || data.amount || 0)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(record.status)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRecordView(record)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRecordEdit(record)}
                        className="h-8 w-8 p-0"
                        disabled={record.invoiceId}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRecordDelete(recordId)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        disabled={record.invoiceId}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
    </div>
  )
}