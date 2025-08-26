import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { FileText, Download, ArrowLeft, Eye, Loader2, Trash2 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  fetchAutoridadesRecords, 
  deleteAutoridadesRecord, 
  selectAutoridadesRecords,
  selectRecordsLoading,
  selectRecordsError 
} from "@/lib/features/records/recordsSlice";

export function TruckingGastosAutoridadesPage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  
  // Estados para el manejo de pasos
  type Step = 'select' | 'pdf'
  const [step, setStep] = useState<Step>('select')
  
  // Estados para selección
  const [selectedBLNumbers, setSelectedBLNumbers] = useState<string[]>([])
  
  // Estados para expansión de contenedores
  const [expandedBLNumbers, setExpandedBLNumbers] = useState<string[]>([])
  
  // Estados para PDF
  const [documentData, setDocumentData] = useState({ number: `AUTO-${Date.now().toString().slice(-5)}`, notes: "" })
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)
  const [showPdfPreview, setShowPdfPreview] = useState(false)
  const [modalPdfUrl, setModalPdfUrl] = useState<string | null>(null)
  
  // Redux state
  const records = useAppSelector(selectAutoridadesRecords);
  const loading = useAppSelector(selectRecordsLoading);
  const error = useAppSelector(selectRecordsError);

  useEffect(() => {
    dispatch(fetchAutoridadesRecords());
  }, [dispatch]);

  // Agrupar registros por BL Number
  const groupedByBL = useMemo(() => {
    const groups = new Map<string, any[]>()
    records.forEach((record: any) => {
      const blNumber = record.blNumber || 'Sin BL'
      if (!groups.has(blNumber)) {
        groups.set(blNumber, [])
      }
      groups.get(blNumber)!.push(record)
    })
    return groups
  }, [records])

  // Registros seleccionados
  const selectedRecords = useMemo(() => {
    const selected: any[] = []
    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = groupedByBL.get(blNumber) || []
      selected.push(...groupRecords)
    })
    return selected
  }, [selectedBLNumbers, groupedByBL])

  // Funciones de selección
  const toggleBLSelection = (blNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedBLNumbers(prev => [...prev, blNumber])
    } else {
      setSelectedBLNumbers(prev => prev.filter(bl => bl !== blNumber))
    }
  }

  const isSelected = (blNumber: string) => selectedBLNumbers.includes(blNumber)

  const clearSelection = () => setSelectedBLNumbers([])

  // Funciones de expansión
  const toggleExpansion = (blNumber: string) => {
    setExpandedBLNumbers(prev => 
      prev.includes(blNumber) 
        ? prev.filter(bl => bl !== blNumber)
        : [...prev, blNumber]
    )
  }

  const isExpanded = (blNumber: string) => expandedBLNumbers.includes(blNumber)

  const handleNextStep = () => {
    if (selectedRecords.length === 0) {
      toast({ title: 'Selecciona registros', description: 'Debes seleccionar al menos un BL', variant: 'destructive' })
      return
    }
    setStep('pdf')
    // Generar PDF automáticamente al pasar al paso 2
    setTimeout(() => generateRealtimePDF(), 500)
  }

  const handlePrevStep = () => {
    setStep('select')
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await dispatch(deleteAutoridadesRecord(id)).unwrap();
      toast({ title: "Registro eliminado" });
    } catch (e: any) {
      toast({ title: "Error al eliminar", description: e.message, variant: "destructive" });
    }
  };

  // Generar PDF de gastos de autoridades
  const generateAutoridadesPdf = () => {
    if (selectedRecords.length === 0) return null

    const doc = new jsPDF()

    // Colores / encabezado
    const lightBlue = [59, 130, 246]
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(15, 15, 30, 15, 'F')
    
    // Texto 'PTG' grande, centrado
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text('PTG', 30, 23, { align: 'center', baseline: 'middle' })

    // Número de documento y fecha
    doc.setTextColor(0, 0, 0)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`GASTOS AUTORIDADES No. ${documentData.number}`, 195, 20, { align: 'right' })

    const currentDate = new Date()
    const day = currentDate.getDate().toString().padStart(2, '0')
    const month = (currentDate.getMonth() + 1).toString().padStart(2, '0')
    const year = currentDate.getFullYear()
    doc.setFontSize(10)
    doc.text('DATE:', 195, 30, { align: 'right' })
    doc.setFontSize(12)
    doc.text(`${day} ${month} ${year}`, 195, 35, { align: 'right' })

    // Encabezado de tabla
    const startY = 60
    const tableWidth = 180
    const tableX = 15
    doc.setFillColor(lightBlue[0], lightBlue[1], lightBlue[2])
    doc.rect(tableX, startY, tableWidth, 8, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont(undefined, 'bold')
    doc.text('BL NUMBER', 20, startY + 5)
    doc.text('CONTAINERS', 60, startY + 5)
    doc.text('AUTH', 100, startY + 5)
    doc.text('TRAMITE', 130, startY + 5)
    doc.text('RUTA', 170, startY + 5)

    // Crear filas agrupadas por BL Number
    const bodyRows: any[] = []
    selectedBLNumbers.forEach(blNumber => {
      const groupRecords = groupedByBL.get(blNumber) || []
      const containers = groupRecords.map(r => r.container).join(', ')
      const auth = groupRecords[0]?.auth || ''
      const tramite = groupRecords[0]?.tramite || ''
      const ruta = groupRecords[0]?.ruta || ''
      
      bodyRows.push([
        blNumber,
        containers,
        auth,
        tramite,
        ruta
      ])
    })

    autoTable(doc, {
      startY: startY + 10,
      head: [],
      body: bodyRows,
      theme: 'grid',
      styles: { fontSize: 9, lineWidth: 0.2, lineColor: [180, 180, 180] },
      columnStyles: { 
        0: { cellWidth: 40 }, 
        1: { cellWidth: 60 }, 
        2: { cellWidth: 30 }, 
        3: { cellWidth: 30 }, 
        4: { cellWidth: 20 } 
      },
      margin: { left: tableX },
    })

    let y = (doc as any).lastAutoTable.finalY + 20

    // Información adicional
    if (documentData.notes) {
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text('NOTAS:', 15, y)
      doc.setFont(undefined, 'normal')
      y += 5
      const notes = doc.splitTextToSize(documentData.notes, 180)
      doc.text(notes, 15, y)
    }

    return doc.output('blob')
  }

  // Generar PDF en tiempo real para vista previa
  const generateRealtimePDF = () => {
    if (selectedRecords.length === 0 || !documentData.number) return
    
    try {
      const blob = generateAutoridadesPdf()
      if (blob instanceof Blob) {
        if (pdfPreviewUrl) {
          try { URL.revokeObjectURL(pdfPreviewUrl) } catch {}
        }
        const url = URL.createObjectURL(blob)
        setPdfPreviewUrl(url)
      }
    } catch (error) {
      console.error('Error generando PDF:', error)
    }
  }

  // Vista previa del PDF
  const handlePreviewPDF = () => {
    try {
      const pdfBlob = generateAutoridadesPdf()
      if (pdfBlob instanceof Blob) {
        const url = URL.createObjectURL(pdfBlob)
        setShowPdfPreview(true)
        setModalPdfUrl(url)
      }
    } catch (error) {
      console.error('Error generando PDF:', error)
    }
  }

  // Descargar PDF
  const handleDownloadPDF = () => {
    try {
      const pdfBlob = generateAutoridadesPdf()
      if (pdfBlob instanceof Blob) {
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = `gastos_autoridades_${documentData.number}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        
        toast({ title: "PDF descargado", description: "Se descargó el documento en PDF" })
      }
    } catch (error) {
      console.error('Error descargando PDF:', error)
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" })
    }
  }

  // Limpiar URLs cuando se desmonte el componente
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl)
      if (modalPdfUrl) URL.revokeObjectURL(modalPdfUrl)
    }
  }, [pdfPreviewUrl, modalPdfUrl])

  // Regenerar PDF cuando cambien los datos
  useEffect(() => {
    if (step === 'pdf' && selectedRecords.length > 0 && documentData.number) {
      const timeoutId = setTimeout(() => generateRealtimePDF(), 150)
      return () => clearTimeout(timeoutId)
    }
  }, [documentData, step, selectedRecords.length])

  return (
    <div className="space-y-6">
      {/* Paso 1: Selección de registros agrupados por BL Number */}
      {step === 'select' && (
        <>
          {/* Encabezado estilo PTYSS */}
          <div className="bg-slate-800 text-white rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-slate-700 flex items-center justify-center">📋</div>
              <div>
                <div className="text-lg font-semibold">Paso 1: Selección por BL Number</div>
                <div>
                  <Badge variant="secondary" className="text-slate-900 bg-white/90">{Array.from(groupedByBL.keys()).length} BL Numbers</Badge>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm opacity-90">{selectedBLNumbers.length} BL seleccionados, {selectedRecords.length} registros</div>
              <Button variant="outline" disabled={selectedBLNumbers.length === 0} onClick={clearSelection} className="bg-white/10 hover:bg-white/20 border-white/30 text-white">
                Limpiar Selección
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registros de Gastos Autoridades - Agrupados por BL Number</CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto max-h-[70vh]">
              {loading ? (
                <div className="p-8 text-center">Cargando…</div>
              ) : Array.from(groupedByBL.keys()).length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No hay registros cargados.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Checkbox
                          checked={selectedBLNumbers.length > 0 && selectedBLNumbers.length === Array.from(groupedByBL.keys()).length}
                          onCheckedChange={(c: boolean) => {
                            if (c) setSelectedBLNumbers(Array.from(groupedByBL.keys()))
                            else setSelectedBLNumbers([])
                          }}
                        />
                      </TableHead>
                      <TableHead>BL Number</TableHead>
                      <TableHead>Contenedores</TableHead>
                      <TableHead>Auth</TableHead>
                      <TableHead># TRAMITE</TableHead>
                      <TableHead>RUTA</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.from(groupedByBL.entries()).map(([blNumber, groupRecords]) => (
                      <TableRow key={blNumber}>
                        <TableCell>
                          <Checkbox 
                            checked={isSelected(blNumber)} 
                            onCheckedChange={(c: boolean) => toggleBLSelection(blNumber, !!c)} 
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{blNumber}</TableCell>
                        <TableCell>
                          {isExpanded(blNumber) ? (
                            // Vista expandida: mostrar todos los contenedores
                            <div className="space-y-1">
                              {groupRecords.map((record: any, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {record.container} - {record.fe || '-'}
                                </Badge>
                              ))}
                              <div className="mt-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpansion(blNumber)}
                                  className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto"
                                >
                                  ▲ Ocultar contenedores
                                </Button>
                              </div>
                            </div>
                          ) : (
                            // Vista compacta: mostrar solo cantidad
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {groupRecords.length} contenedor{groupRecords.length !== 1 ? 'es' : ''}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpansion(blNumber)}
                                className="text-xs text-blue-600 hover:text-blue-800 p-1 h-auto"
                              >
                                ▼ Mostrar detalles
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>{groupRecords[0]?.auth || '-'}</TableCell>
                        <TableCell>{groupRecords[0]?.tramite || '-'}</TableCell>
                        <TableCell>{groupRecords[0]?.ruta || '-'}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              // Eliminar todos los registros del grupo
                              groupRecords.forEach((record: any) => handleDelete(record._id))
                            }} 
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
            
            <div className="flex justify-between items-center p-4">
              <div className="text-sm text-muted-foreground">
                {selectedBLNumbers.length} BL Numbers seleccionados - {selectedRecords.length} registros total
              </div>
              <Button 
                onClick={handleNextStep}
                disabled={selectedRecords.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Generar Documento PDF
              </Button>
            </div>
          </Card>
        </>
      )}

      {/* Paso 2: Configuración y vista previa del PDF */}
      {step === 'pdf' && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-xl font-bold">Paso 2: Generar Documento PDF</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumen de selección */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-3 rounded-lg shadow-sm mt-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-600 rounded-md text-white">✓</div>
                <h3 className="font-semibold text-slate-900 text-base">Resumen de Selección</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">BL Numbers:</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedBLNumbers.length}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Total Registros:</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedRecords.length}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Total Contenedores:</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedRecords.length}</div>
                </div>
              </div>
            </div>

            {/* Configuración y vista previa */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna izquierda: Configuración */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Configuración del Documento</h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="doc-number" className="text-sm font-semibold text-slate-700">Número de Documento *</Label>
                      <Input
                        id="doc-number"
                        value={documentData.number}
                        onChange={(e) => {
                          setDocumentData({...documentData, number: e.target.value})
                        }}
                        placeholder="AUTO-00001"
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="doc-notes" className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                      <Textarea
                        id="doc-notes"
                        value={documentData.notes}
                        onChange={(e) => {
                          setDocumentData({...documentData, notes: e.target.value})
                        }}
                        placeholder="Notas adicionales para el documento..."
                        rows={4}
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha: Vista previa del PDF */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-slate-900">Vista Previa del PDF</h3>
                  {pdfPreviewUrl && (
                    <Button 
                      onClick={handlePreviewPDF} 
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Ver en Pantalla Completa
                    </Button>
                  )}
                </div>
                
                {!pdfPreviewUrl ? (
                  <div className="flex items-center justify-center h-[750px] border-2 border-dashed border-slate-300 rounded-lg">
                    <div className="text-center text-slate-500">
                      <FileText className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-sm">Ingresa el número de documento para ver la vista previa</p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-[750px] border border-slate-300 rounded-lg overflow-hidden">
                    <iframe
                      src={pdfPreviewUrl}
                      className="w-full h-full"
                      title="Vista previa del documento"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Botones de navegación */}
            <div className="flex justify-between pt-4">
              <Button 
                variant="outline"
                onClick={handlePrevStep}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-3"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Volver al Paso 1
              </Button>
              
              <div className="flex gap-3">
                <Button 
                  onClick={handleDownloadPDF} 
                  variant="outline"
                  className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold px-6 py-3"
                  disabled={!pdfPreviewUrl}
                >
                  <Download className="mr-2 h-5 w-5" />
                  Descargar PDF
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de vista previa del PDF */}
      <Dialog open={showPdfPreview} onOpenChange={setShowPdfPreview}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              {`Vista Previa - ${documentData.number || 'AUTO'}`}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[70vh]">
            {modalPdfUrl && (
              <iframe
                src={modalPdfUrl}
                className="w-full h-full min-h-[70vh] border rounded-lg"
                title="Vista previa del documento"
              />
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowPdfPreview(false)}>
              Cerrar
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="h-4 w-4 mr-2" />
              Descargar PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


