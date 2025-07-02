"use client"

import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { fetchRecordsBySapCode, selectSapCodeRecords, selectSapCodePagination, selectSapCodeSummary, selectRecordsLoading } from "@/lib/features/records/recordsSlice"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Loader2, FileText, DollarSign } from "lucide-react"

export function SapCodeSearch() {
  const [sapCode, setSapCode] = useState("TRK002")
  const [currentPage, setCurrentPage] = useState(1)
  
  const dispatch = useAppDispatch()
  const records = useAppSelector(selectSapCodeRecords)
  const pagination = useAppSelector(selectSapCodePagination)
  const summary = useAppSelector(selectSapCodeSummary)
  const loading = useAppSelector(selectRecordsLoading)

  const handleSearch = () => {
    if (sapCode.trim()) {
      setCurrentPage(1)
      dispatch(fetchRecordsBySapCode({ 
        sapCode: sapCode.trim(), 
        module: "trucking",
        page: 1,
        limit: 20
      }))
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    dispatch(fetchRecordsBySapCode({ 
      sapCode: sapCode.trim(), 
      module: "trucking",
      page,
      limit: 20
    }))
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscar Registros por SAP Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="sap-code">SAP Code</Label>
              <Input
                id="sap-code"
                value={sapCode}
                onChange={(e) => setSapCode(e.target.value)}
                placeholder="Ej: TRK002"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {pagination?.totalCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Registros</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ${summary.totalValue?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Valor Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  ${summary.averageValue?.toFixed(2) || '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Valor Promedio</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Registros Encontrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Container</TableHead>
                    <TableHead>Driver Name</TableHead>
                    <TableHead>Plate</TableHead>
                    <TableHead>Move Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>SAP Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-sm">
                        {record.data?.container || '-'}
                      </TableCell>
                      <TableCell>{record.data?.driverName || '-'}</TableCell>
                      <TableCell>{record.data?.plate || '-'}</TableCell>
                      <TableCell>{record.data?.moveDate || '-'}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={record.status === 'pendiente' ? 'outline' : 
                                  record.status === 'facturado' ? 'default' : 'secondary'}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${record.totalValue?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.data?.sapCode || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Página {pagination.currentPage} de {pagination.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPrevPage}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 