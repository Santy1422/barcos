"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { FileText, Send } from "lucide-react"
import { mockXmlFiles } from "@/lib/mock-data"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle2 } from "lucide-react"

export function TransmitPage() {
  const validatedFiles = mockXmlFiles.filter((file) => file.status === "validado")
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [transmitting, setTransmitting] = useState(false)
  const [transmitProgress, setTransmitProgress] = useState(0)
  const [transmitComplete, setTransmitComplete] = useState(false)

  const handleSelectAll = () => {
    if (selectedFiles.length === validatedFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(validatedFiles.map((file) => file.id))
    }
  }

  const handleSelectFile = (id: string) => {
    if (selectedFiles.includes(id)) {
      setSelectedFiles(selectedFiles.filter((fileId) => fileId !== id))
    } else {
      setSelectedFiles([...selectedFiles, id])
    }
  }

  const handleTransmit = () => {
    if (selectedFiles.length === 0) return

    setTransmitting(true)
    setTransmitProgress(0)

    // Simular transmisión
    const interval = setInterval(() => {
      setTransmitProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTransmitting(false)
          setTransmitComplete(true)
          return 100
        }
        return prev + 5
      })
    }, 200)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transmitir a SAP</h1>
        <Button disabled={selectedFiles.length === 0 || transmitting} onClick={handleTransmit}>
          <Send className="mr-2 h-4 w-4" />
          Transmitir Seleccionados
        </Button>
      </div>

      {transmitting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Transmitiendo archivos a SAP...</span>
                <span>{transmitProgress}%</span>
              </div>
              <Progress value={transmitProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {transmitComplete && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Transmisión completada</AlertTitle>
          <AlertDescription className="text-green-700">
            Los archivos seleccionados han sido transmitidos correctamente a SAP.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Archivos Disponibles para Transmitir</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedFiles.length === validatedFiles.length && validatedFiles.length > 0}
                    onCheckedChange={handleSelectAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {validatedFiles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6">
                    No hay archivos validados disponibles para transmitir.
                  </TableCell>
                </TableRow>
              ) : (
                validatedFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedFiles.includes(file.id)}
                        onCheckedChange={() => handleSelectFile(file.id)}
                        aria-label={`Seleccionar ${file.reference}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{file.reference}</TableCell>
                    <TableCell>{file.date}</TableCell>
                    <TableCell>{file.customer}</TableCell>
                    <TableCell>
                      {file.amount} {file.currency}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">Validado</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/editar/${file.id}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Transmisiones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID de Transmisión</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Archivos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">TRX-20250518-001</TableCell>
                <TableCell>18/05/2025 12:45</TableCell>
                <TableCell>3 archivos</TableCell>
                <TableCell>
                  <Badge variant="outline">Completado</Badge>
                </TableCell>
                <TableCell>Juan Pérez</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">TRX-20250517-002</TableCell>
                <TableCell>17/05/2025 15:30</TableCell>
                <TableCell>5 archivos</TableCell>
                <TableCell>
                  <Badge variant="outline">Completado</Badge>
                </TableCell>
                <TableCell>María López</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">TRX-20250516-001</TableCell>
                <TableCell>16/05/2025 09:15</TableCell>
                <TableCell>2 archivos</TableCell>
                <TableCell>
                  <Badge variant="destructive">Error</Badge>
                </TableCell>
                <TableCell>Juan Pérez</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
