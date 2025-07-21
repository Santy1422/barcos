"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { 
  FileText, 
  Plus, 
  AlertCircle, 
  CheckCircle2,
  Ship,
  Database,
  Trash2,
  Edit,
  Save,
  Loader2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { createTruckingRecords, selectCreatingRecords, selectRecordsError } from "@/lib/features/records/recordsSlice"
import { 
  selectAllClients,
  createClientAsync,
  fetchClients,
  type Client,
  type NaturalClient,
  type JuridicalClient,
  type ClientType
} from "@/lib/features/clients/clientsSlice"
import { 
  selectActiveNavieras,
  fetchNavieras
} from "@/lib/features/naviera/navieraSlice"
import { 
  selectPTYSSRoutes,
  fetchPTYSSRoutes,
  selectPTYSSRoutesLoading,
  selectPTYSSRoutesError
} from "@/lib/features/ptyssRoutes/ptyssRoutesSlice"
import { parseTruckingExcel, matchTruckingDataWithRoutes, type TruckingExcelData } from "@/lib/excel-parser"
import { ClientModal } from "@/components/clients-management"

interface PTYSSRecordData {
  clientId: string
  order: string
  container: string
  naviera: string
  from: string
  to: string
  operationType: string
  containerSize: string
  containerType: string
  estadia: string
  genset: string
  retencion: string
  pesaje: string
  ti: string
  matriculaCamion: string
  conductor: string
  numeroChasisPlaca: string
  moveDate: string
  notes: string
  totalValue: number
}

const initialRecordData: PTYSSRecordData = {
  clientId: "",
  order: "",
  container: "",
  naviera: "",
  from: "",
  to: "",
  operationType: "",
  containerSize: "40",
  containerType: "DV",
  estadia: "",
  genset: "",
  retencion: "",
  pesaje: "",
  ti: "",
  matriculaCamion: "",
  conductor: "",
  numeroChasisPlaca: "",
  moveDate: "",
  notes: "",
  totalValue: 0
}

export function PTYSSUpload() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  const [records, setRecords] = useState<PTYSSRecordData[]>([])
  const [currentRecord, setCurrentRecord] = useState<PTYSSRecordData>(initialRecordData)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  
  // Excel upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<TruckingExcelData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  // Obtener clientes y navieras del store de Redux
  const clients = useAppSelector(selectAllClients)
  const navieras = useAppSelector(selectActiveNavieras)
  const clientsLoading = useAppSelector((state) => state.clients.loading)
  
  // PTYSS Routes state
  const routes = useAppSelector(selectPTYSSRoutes)
  const routesLoading = useAppSelector(selectPTYSSRoutesLoading)
  const routesError = useAppSelector(selectPTYSSRoutesError)
  const isCreatingRecords = useAppSelector(selectCreatingRecords)
  const recordsError = useAppSelector(selectRecordsError)

  // Debug: Log clientes cargados
  console.log('🔍 PTYSSUpload - clients:', clients)
  console.log('🔍 PTYSSUpload - clients.length:', clients.length)
  console.log('🔍 PTYSSUpload - clientsLoading:', clientsLoading)

  // Cargar navieras al montar el componente
  useEffect(() => {
    dispatch(fetchNavieras('active'))
  }, [dispatch])

  // Cargar clientes al montar el componente
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

  // Cargar rutas al montar el componente
  useEffect(() => {
    dispatch(fetchPTYSSRoutes())
  }, [dispatch])

  // Mostrar error si existe
  useEffect(() => {
    if (routesError) {
      toast({
        title: "Error al cargar rutas",
        description: routesError,
        variant: "destructive",
      })
    }
  }, [routesError, toast])

  // Estado para el formulario de nuevo cliente
  const [newClient, setNewClient] = useState({
    companyName: "",
    ruc: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    sapCode: ""
  })
  
  const [showAddClientDialog, setShowAddClientDialog] = useState(false)

  // Funciones para manejar clientes
  const handleAddClient = async () => {
    if (!newClient.sapCode || !newClient.companyName || !newClient.ruc || !newClient.email) {
      toast({
        title: "Error",
        description: "Completa los campos obligatorios (Código SAP, Nombre de Empresa, RUC y Email)",
        variant: "destructive"
      })
      return
    }

    try {
      const clientData = {
        type: "juridico" as const,
        companyName: newClient.companyName,
        ruc: newClient.ruc,
        email: newClient.email,
        phone: newClient.phone || undefined,
        contactName: newClient.contactName || undefined,
        address: newClient.address || undefined,
        sapCode: newClient.sapCode,
        isActive: true
      }

      await dispatch(createClientAsync(clientData)).unwrap()
      
      setNewClient({
        companyName: "",
        ruc: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        sapCode: ""
      })
      setShowAddClientDialog(false)

      toast({
        title: "Cliente agregado",
        description: "El nuevo cliente ha sido agregado correctamente",
      })
    } catch (error: any) {
      console.error("Error al crear cliente:", error)
      toast({
        title: "Error",
        description: error.message || "Error al crear el cliente. Inténtalo de nuevo.",
        variant: "destructive"
      })
    }
  }

  const getSelectedClient = () => {
    return clients.find((client: any) => client && (client._id || client.id) === currentRecord.clientId)
  }

  const handleAddRecord = () => {
    if (!currentRecord.clientId || !currentRecord.order || !currentRecord.container || !currentRecord.naviera || 
        !currentRecord.from || !currentRecord.to || !currentRecord.operationType || !currentRecord.containerSize || 
        !currentRecord.containerType || !currentRecord.estadia || !currentRecord.ti || !currentRecord.conductor) {
      toast({
        title: "Error",
        description: "Completa todos los campos obligatorios marcados con *",
        variant: "destructive"
      })
      return
    }

    if (editingIndex !== null) {
      // Editar registro existente
      const updatedRecords = [...records]
      updatedRecords[editingIndex] = currentRecord
      setRecords(updatedRecords)
      setEditingIndex(null)
      toast({ title: "Registro actualizado", description: "El registro ha sido actualizado exitosamente." })
    } else {
      // Agregar nuevo registro
      const newRecord = {
        ...currentRecord,
        totalValue: calculateTotalValue(currentRecord)
      }
      setRecords([...records, newRecord])
      toast({ title: "Registro agregado", description: "El registro ha sido agregado exitosamente." })
    }

    setCurrentRecord(initialRecordData)
    setIsDialogOpen(false)
  }

  const calculateTotalValue = (record: PTYSSRecordData): number => {
    let total = 0
    
    // Agregar valores numéricos si existen
    if (record.genset) total += parseFloat(record.genset) || 0
    if (record.retencion) total += parseFloat(record.retencion) || 0
    if (record.pesaje) total += parseFloat(record.pesaje) || 0
    
    return total
  }

  const handleEditRecord = (index: number) => {
    setCurrentRecord(records[index])
    setEditingIndex(index)
    setIsDialogOpen(true)
  }

  const handleDeleteRecord = (index: number) => {
    const updatedRecords = records.filter((_, i) => i !== index)
    setRecords(updatedRecords)
    toast({ title: "Registro eliminado", description: "El registro ha sido eliminado." })
  }

  const handleSaveRecords = async () => {
    if (records.length === 0) {
      toast({
        title: "Error",
        description: "No hay registros para guardar",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)

    try {
      console.log("=== INICIANDO GUARDADO PTYSS ===")
      console.log("Registros a guardar:", records)
      
      // Temporary workaround: Use a proper ObjectId format
      const tempObjectId = new Date().getTime().toString(16).padStart(24, '0').substring(0, 24)
      
      console.log("ExcelId:", tempObjectId)
      
      // Preparar los datos para el backend
      const recordsData = records.map((record, index) => ({
        data: record, // Datos completos del registro
        totalValue: record.totalValue || 0
      }))
      
      console.log("Records data preparado:", recordsData)
      console.log("Payload a enviar:", {
        excelId: tempObjectId,
        recordsData
      })
      
      const result = await dispatch(createTruckingRecords({
        excelId: tempObjectId,
        recordsData
      })).unwrap()
      
      console.log("Resultado del guardado:", result)
      
      toast({
        title: "Éxito",
        description: `${result.length} registros guardados correctamente en el sistema`
      })
      
      // Limpiar el estado
      setRecords([])
      
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error",
        description: "Error al guardar los registros en el sistema",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Función para hacer matching de datos de trucking con rutas de PTYSS
  const matchTruckingDataWithPTYSSRoutes = (truckingData: TruckingExcelData[], ptyssRoutes: Array<{_id: string, name: string, from: string, to: string, containerType: string, routeType: "single" | "RT", price: number}>): TruckingExcelData[] => {
    console.log("=== INICIANDO MATCHING PTYSS CON DATOS TRUCKING ===")
    console.log("Rutas PTYSS disponibles:", ptyssRoutes)
    console.log("")
    
    return truckingData.map((record, index) => {
      console.log(`Procesando registro PTYSS ${index + 1}:`)
      console.log(`  Leg: "${record.leg}"`)
      console.log(`  MoveType: "${record.moveType}"`)
      console.log(`  Type: "${record.type}"`)
      
      // Extraer from y to del campo leg (separado por "/")
      const legParts = record.leg?.split('/').map(part => part.trim()) || [];
      const from = legParts[0] || '';
      const to = legParts[1] || '';
      
      console.log(`  From extraído: "${from}"`)
      console.log(`  To extraído: "${to}"`)
      
      // Buscar coincidencia basada en los criterios de PTYSS:
      // 1. from y to extraídos del leg
      // 2. moveType (routeType de la ruta) - case insensitive
      // 3. type (containerType de la ruta) - mapear tipos
      
      const matchedRoute = ptyssRoutes.find(route => {
        // Matching por from y to extraídos del leg
        const fromMatch = route.from?.toUpperCase() === from.toUpperCase();
        const toMatch = route.to?.toUpperCase() === to.toUpperCase();
        
        // Matching por moveType (routeType de la ruta) - case insensitive
        const normalizedMoveType = record.moveType?.trim().toLowerCase() || '';
        const moveTypeMatch = 
          (normalizedMoveType === 's' && route.routeType === 'single') ||
          (normalizedMoveType === 'single' && route.routeType === 'single') ||
          (normalizedMoveType === 'rt' && route.routeType === 'RT') ||
          (normalizedMoveType === 'rt' && route.routeType === 'RT');
        
        // Matching por type (containerType de la ruta) - mapear tipos de PTYSS
        const normalizedType = record.type?.trim().toUpperCase() || '';
        const containerTypeMatch = route.containerType?.toUpperCase() === normalizedType;
        
        console.log(`  Comparando con ruta PTYSS "${route.name}":`)
        console.log(`    From: "${from}" vs "${route.from}" = ${fromMatch}`)
        console.log(`    To: "${to}" vs "${route.to}" = ${toMatch}`)
        console.log(`    MoveType normalizado: "${normalizedMoveType}" vs "${route.routeType}" = ${moveTypeMatch}`)
        console.log(`    Type normalizado: "${normalizedType}" vs "${route.containerType}" = ${containerTypeMatch}`)
        console.log(`    Match total: ${fromMatch && toMatch && moveTypeMatch && containerTypeMatch}`)
        
        return fromMatch && toMatch && moveTypeMatch && containerTypeMatch;
      });
      
      if (matchedRoute) {
        console.log(`  ✅ MATCH ENCONTRADO: ${matchedRoute.name} - $${matchedRoute.price}`)
        return {
          ...record,
          from: from, // Agregar from extraído del leg
          to: to, // Agregar to extraído del leg
          operationType: 'import', // Siempre import para registros de trasiego
          matchedPrice: matchedRoute.price,
          matchedRouteId: matchedRoute._id || '',
          matchedRouteName: matchedRoute.name || '',
          isMatched: true,
          sapCode: 'PTYSS001'
        };
      } else {
        console.log(`  ❌ NO SE ENCONTRÓ MATCH`)
        return {
          ...record,
          from: from, // Agregar from extraído del leg
          to: to, // Agregar to extraído del leg
          operationType: 'import', // Siempre import para registros de trasiego
          matchedPrice: 0,
          isMatched: false,
          sapCode: 'PTYSS001'
        };
      }
    });
  }

  // Función para convertir datos de trucking a PTYSS
  const convertTruckingToPTYSS = (truckingData: TruckingExcelData[]): PTYSSRecordData[] => {
    return truckingData.map(record => ({
      clientId: record.associate || '',
      order: record.containerConsecutive || '',
      container: record.container || '',
      naviera: record.route || '',
      from: record.pol || '',
      to: record.pod || '',
      operationType: 'import', // Siempre import para registros de trasiego
      containerSize: record.size || '',
      containerType: record.type || '',
      estadia: '',
      genset: '',
      retencion: '',
      pesaje: '',
      ti: '',
      matriculaCamion: record.plate || '',
      conductor: record.driverName || '',
      numeroChasisPlaca: '',
      moveDate: record.moveDate || '',
      notes: '',
      totalValue: record.matchedPrice || 0
    }))
  }

  // Excel upload handlers
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      setIsLoading(true)
      
      try {
        // Verificar que las rutas estén cargadas
        if (routesLoading) {
          toast({
            title: "Cargando rutas",
            description: "Espera un momento mientras se cargan las rutas configuradas...",
          })
          return
        }

        if (routes.length === 0) {
          toast({
            title: "No hay rutas configuradas",
            description: "Debes configurar rutas en la sección de configuración antes de subir archivos.",
            variant: "destructive",
          })
          return
        }

        // Parsear el archivo Excel real
        const realData = await parseTruckingExcel(file)
        
        console.log("=== DEBUGGING MATCHING PTYSS ===")
        console.log("Datos del Excel:", realData)
        console.log("Primer registro containerConsecutive:", realData[0]?.containerConsecutive)
        console.log("Primer registro keys:", Object.keys(realData[0] || {}))
        console.log("Todos los registros containerConsecutive:", realData.map(r => r.containerConsecutive))
        console.log("Rutas disponibles:", routes)
        console.log("")
        
        // Aplicar matching con las rutas configuradas de PTYSS
        const matchedData = matchTruckingDataWithPTYSSRoutes(realData, routes)
        
        console.log("Datos después del matching:", matchedData)
        console.log("")
        
        setPreviewData(matchedData)
        
        // Contar registros con match
        const matchedCount = matchedData.filter(record => record.isMatched).length
        const unmatchedCount = matchedData.length - matchedCount
        
        console.log(`Registros con match: ${matchedCount}/${matchedData.length}`)
        
        toast({
          title: "✅ Archivo Excel procesado",
          description: `Se han leído ${realData.length} registros. ${matchedCount} con precio asignado, ${unmatchedCount} sin coincidencia.`,
        })
      } catch (error) {
        console.error('Error al procesar archivo:', error)
        toast({
          title: "Error al procesar archivo",
          description: "No se pudo leer el archivo Excel. Verifica que tenga el formato correcto.",
          variant: "destructive",
        })
        setPreviewData([])
      } finally {
        setIsLoading(false)
      }
    } else {
      setSelectedFile(null)
      setPreviewData([])
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || previewData.length === 0) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo y verifica que tenga datos válidos",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)

    try {
      console.log("=== INICIANDO GUARDADO PTYSS EXCEL ===")
      console.log("Datos a guardar:", previewData)
      
      // Temporary workaround: Use a proper ObjectId format
      const tempObjectId = new Date().getTime().toString(16).padStart(24, '0').substring(0, 24)
      
      console.log("ExcelId:", tempObjectId)
      
      // Filtrar solo los registros que tienen match
      const matchedRecords = previewData.filter(record => record.isMatched);
      
      if (matchedRecords.length === 0) {
        toast({
          title: "No hay registros válidos",
          description: "No se encontraron registros que coincidan con las rutas configuradas",
          variant: "destructive"
        })
        return
      }
      
      const recordsData = matchedRecords.map((record, index) => ({
        data: record, // Datos completos del Excel incluyendo matchedPrice, matchedRouteId, etc.
        totalValue: record.matchedPrice || 0 // Usar el precio de la ruta si está disponible
      }))
      
      console.log("=== DATOS A GUARDAR ===")
      console.log("Primer registro completo:", recordsData[0])
      console.log("ContainerConsecutive del primer registro:", recordsData[0]?.data?.containerConsecutive)
      console.log("Todos los containerConsecutive:", recordsData.map(r => r.data.containerConsecutive))
      console.log("Records data preparado:", recordsData)
      console.log("Payload a enviar:", {
        excelId: tempObjectId,
        recordsData
      })
      
      const result = await dispatch(createTruckingRecords({
        excelId: tempObjectId, // Use the generated ObjectId
        recordsData
      })).unwrap()
      
      console.log("Resultado del guardado:", result)
      console.log("Result length:", result.length)
      console.log("Result type:", typeof result)
      console.log("Result is array:", Array.isArray(result))
      
      toast({
        title: "Éxito",
        description: `${result.length} registros con match guardados correctamente en el sistema (${previewData.length - matchedRecords.length} registros sin match fueron omitidos)`
      })
      
      // Limpiar el estado
      setPreviewData([])
      setSelectedFile(null)
      
    } catch (error) {
      console.error("Error al guardar:", error)
      toast({
        title: "Error",
        description: recordsError || "Error al guardar los registros",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }



  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Crear Registros Local
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-medium">Crear Registro Individual</h3>
              <p className="text-sm text-muted-foreground">
                Agrega registros marítimos uno por uno para luego generar facturas
              </p>
            </div>
            <Button onClick={() => {
              setCurrentRecord(initialRecordData)
              setEditingIndex(null)
              setIsDialogOpen(true)
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Registro
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Crear Registro Trasiego
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="excel-file">Seleccionar archivo Excel</Label>
            <Input
              id="excel-file"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={isLoading || isProcessing || routesLoading}
            />
          </div>
          
          {/* Estado de carga de rutas */}
          {routesLoading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Cargando rutas configuradas...
            </div>
          )}
          
          {!routesLoading && routes.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertCircle className="h-4 w-4" />
              No hay rutas configuradas. Ve a Configuración para crear rutas.
            </div>
          )}
          
          {!routesLoading && routes.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {routes.length} ruta{routes.length !== 1 ? 's' : ''} configurada{routes.length !== 1 ? 's' : ''} lista{routes.length !== 1 ? 's' : ''}
            </div>
          )}
          
          {selectedFile && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              {selectedFile.name}
              <Badge variant="secondary">{previewData.length} registros</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lista de registros */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Registros Creados ({records.length})
              </span>
              <Button 
                onClick={handleSaveRecords} 
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Registros
                  </>
                )}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>Naviera</TableHead>
                    <TableHead>From/To</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record, index) => {
                    const client = clients.find((c: any) => (c._id || c.id) === record.clientId)
                    const naviera = navieras.find(n => n._id === record.naviera)
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {client ? (client.type === "natural" ? client.fullName : client.companyName) : "N/A"}
                        </TableCell>
                        <TableCell>{record.order}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{record.container}</span>
                            <span className="text-xs text-muted-foreground">
                              {record.containerSize}' {record.containerType}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{naviera?.name || "N/A"}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs">{record.from}</span>
                            <span className="text-xs">→ {record.to}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={record.operationType === "import" ? "default" : "secondary"}>
                            {record.operationType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.conductor}</TableCell>
                        <TableCell>${record.totalValue.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRecord(index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteRecord(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para crear/editar registro */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingIndex !== null ? "Editar Registro Local" : "Crear Nuevo Registro Local"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Información del Cliente */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información del Cliente</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Cliente *</Label>
                  <div className="flex gap-2">
                    <Select value={currentRecord.clientId} onValueChange={(value) => setCurrentRecord({...currentRecord, clientId: value})}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar cliente" />
                      </SelectTrigger>
                      <SelectContent>
                        {(() => {
                          if (clientsLoading) {
                            return (
                              <div className="p-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                                  Cargando clientes...
                                </div>
                              </div>
                            )
                          }
                          
                          const activeClients = clients.filter((client: any) => client && client.isActive)
                          console.log('🔍 PTYSSUpload - activeClients:', activeClients)
                          console.log('🔍 PTYSSUpload - activeClients.length:', activeClients.length)
                          
                          if (activeClients.length === 0) {
                            return (
                              <div className="p-2 text-sm text-muted-foreground">
                                No hay clientes activos disponibles
                              </div>
                            )
                          }
                          
                          return activeClients.map((client: any) => (
                            <SelectItem key={client._id || client.id} value={client._id || client.id}>
                              {client.type === "natural" ? client.fullName : client.companyName} - {client.sapCode || "Sin SAP"}
                            </SelectItem>
                          ))
                        })()}
                      </SelectContent>
                    </Select>
                    <Dialog open={showAddClientDialog} onOpenChange={setShowAddClientDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Agregar Nuevo Cliente</DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-4">
                          {/* Información de la Empresa */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Información de la Empresa</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="companyName">Nombre de la Empresa *</Label>
                                <Input
                                  id="companyName"
                                  value={newClient.companyName}
                                  onChange={(e) => setNewClient({...newClient, companyName: e.target.value})}
                                  placeholder="Razón social"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="sapCode">Código SAP *</Label>
                                <Input
                                  id="sapCode"
                                  value={newClient.sapCode}
                                  onChange={(e) => setNewClient({...newClient, sapCode: e.target.value})}
                                  placeholder="Código SAP del cliente"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="ruc">RUC *</Label>
                                <Input
                                  id="ruc"
                                  value={newClient.ruc}
                                  onChange={(e) => setNewClient({...newClient, ruc: e.target.value})}
                                  placeholder="155678901-2-2020"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="contactName">Nombre de Contacto</Label>
                                <Input
                                  id="contactName"
                                  value={newClient.contactName}
                                  onChange={(e) => setNewClient({...newClient, contactName: e.target.value})}
                                  placeholder="Persona de contacto"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          {/* Información de Contacto */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Información de Contacto</h3>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="email">Correo Electrónico *</Label>
                                <Input
                                  id="email"
                                  type="email"
                                  value={newClient.email}
                                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                                  placeholder="correo@ejemplo.com"
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="phone">Teléfono</Label>
                                <Input
                                  id="phone"
                                  value={newClient.phone}
                                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                                  placeholder="6001-2345"
                                />
                              </div>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          {/* Dirección */}
                          <div className="space-y-4">
                            <h3 className="text-lg font-medium">Dirección</h3>
                            
                            <div className="space-y-2">
                              <Label htmlFor="address">Dirección</Label>
                              <Textarea
                                id="address"
                                value={newClient.address}
                                onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                                placeholder="Dirección completa de la empresa"
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2 pt-4">
                          <Button variant="outline" onClick={() => setShowAddClientDialog(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleAddClient}>
                            <Plus className="h-4 w-4 mr-2" />
                            Agregar Cliente
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  {getSelectedClient() && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {getSelectedClient()?.type === "juridico" ? (
                        <>
                          RUC: {getSelectedClient()?.ruc} | 
                          Tel: {getSelectedClient()?.phone || "No especificado"}
                        </>
                      ) : (
                        <>
                          {getSelectedClient()?.documentType?.toUpperCase()}: {getSelectedClient()?.documentNumber} | 
                          Tel: {getSelectedClient()?.phone || "No especificado"}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="order">Orden *</Label>
                  <Input
                    id="order"
                    value={currentRecord.order}
                    onChange={(e) => setCurrentRecord({...currentRecord, order: e.target.value})}
                    placeholder="Número de orden"
                    required
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Información del Contenedor */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información del Contenedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="container">Contenedor *</Label>
                  <Input
                    id="container"
                    value={currentRecord.container}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase()
                      if (value.length <= 11) {
                        setCurrentRecord({...currentRecord, container: value})
                      }
                    }}
                    placeholder="MSCU1234567"
                    maxLength={11}
                    pattern="[A-Z0-9]+"
                    title="Solo letras y números, máximo 11 caracteres"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="naviera">Naviera *</Label>
                  <Select value={currentRecord.naviera} onValueChange={(value) => setCurrentRecord({...currentRecord, naviera: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar naviera" />
                    </SelectTrigger>
                    <SelectContent>
                      {navieras.map((naviera) => (
                        <SelectItem key={naviera._id} value={naviera._id}>
                          {naviera.name} ({naviera.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="from">From *</Label>
                  <Select value={currentRecord.from} onValueChange={(value) => setCurrentRecord({...currentRecord, from: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar From" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MIT">MIT</SelectItem>
                      <SelectItem value="BLB">BLB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="to">To *</Label>
                  <Select value={currentRecord.to} onValueChange={(value) => setCurrentRecord({...currentRecord, to: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar To" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Colon free zone">Colon free zone</SelectItem>
                      <SelectItem value="Parque sur">Parque sur</SelectItem>
                      <SelectItem value="Montemar">Montemar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="operationType">Tipo Operación *</Label>
                  <Select value={currentRecord.operationType} onValueChange={(value) => setCurrentRecord({...currentRecord, operationType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo de operación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="import">Import</SelectItem>
                      <SelectItem value="export">Export</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="containerSize">Tamaño de Contenedor *</Label>
                  <Select value={currentRecord.containerSize} onValueChange={(value) => setCurrentRecord({...currentRecord, containerSize: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10' - 10 pies</SelectItem>
                      <SelectItem value="20">20' - 20 pies</SelectItem>
                      <SelectItem value="40">40' - 40 pies</SelectItem>
                      <SelectItem value="45">45' - 45 pies</SelectItem>
                      <SelectItem value="48">48' - 48 pies</SelectItem>
                      <SelectItem value="53">53' - 53 pies</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="containerType">Tipo de Contenedor *</Label>
                  <Select value={currentRecord.containerType} onValueChange={(value) => setCurrentRecord({...currentRecord, containerType: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DV">DV - Dry Van</SelectItem>
                      <SelectItem value="HC">HC - High Cube</SelectItem>
                      <SelectItem value="RE">RE - Reefer</SelectItem>
                      <SelectItem value="TK">TK - Tank</SelectItem>
                      <SelectItem value="FL">FL - Flat Rack</SelectItem>
                      <SelectItem value="OS">OS - Open Side</SelectItem>
                      <SelectItem value="OT">OT - Open Top</SelectItem>
                      <SelectItem value="HR">HR - Hard Top</SelectItem>
                      <SelectItem value="PL">PL - Platform</SelectItem>
                      <SelectItem value="BV">BV - Bulk</SelectItem>
                      <SelectItem value="VE">VE - Ventilated</SelectItem>
                      <SelectItem value="PW">PW - Pallet Wide</SelectItem>
                      <SelectItem value="HT">HT - Hard Top</SelectItem>
                      <SelectItem value="IS">IS - Insulated</SelectItem>
                      <SelectItem value="XX">XX - Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Servicios Adicionales */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Servicios Adicionales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estadia">Estadia *</Label>
                  <Select value={currentRecord.estadia} onValueChange={(value) => setCurrentRecord({...currentRecord, estadia: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="genset">Genset</Label>
                  <Input
                    id="genset"
                    type="number"
                    value={currentRecord.genset}
                    onChange={(e) => setCurrentRecord({...currentRecord, genset: e.target.value})}
                    placeholder="Ingrese número"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retencion">Retención</Label>
                  <Input
                    id="retencion"
                    type="number"
                    value={currentRecord.retencion}
                    onChange={(e) => setCurrentRecord({...currentRecord, retencion: e.target.value})}
                    placeholder="Ingrese número"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="pesaje">Pesaje</Label>
                  <Input
                    id="pesaje"
                    type="number"
                    value={currentRecord.pesaje}
                    onChange={(e) => setCurrentRecord({...currentRecord, pesaje: e.target.value})}
                    placeholder="Ingrese monto en moneda"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="ti">TI *</Label>
                  <Select value={currentRecord.ti} onValueChange={(value) => setCurrentRecord({...currentRecord, ti: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="si">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Información de Transporte */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Información de Transporte</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="matriculaCamion">Matrícula del Camión</Label>
                  <Input
                    id="matriculaCamion"
                    value={currentRecord.matriculaCamion}
                    onChange={(e) => setCurrentRecord({...currentRecord, matriculaCamion: e.target.value})}
                    placeholder="Ingrese matrícula alfanumérica"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="conductor">Conductor *</Label>
                  <Input
                    id="conductor"
                    value={currentRecord.conductor}
                    onChange={(e) => setCurrentRecord({...currentRecord, conductor: e.target.value})}
                    placeholder="Ingrese nombre del conductor"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="numeroChasisPlaca">Número de Chasis o Placa</Label>
                  <Input
                    id="numeroChasisPlaca"
                    value={currentRecord.numeroChasisPlaca}
                    onChange={(e) => setCurrentRecord({...currentRecord, numeroChasisPlaca: e.target.value})}
                    placeholder="Ingrese número de chasis o placa"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="moveDate">Fecha de Movimiento</Label>
                  <Input
                    id="moveDate"
                    type="date"
                    value={currentRecord.moveDate}
                    onChange={(e) => setCurrentRecord({...currentRecord, moveDate: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            <Separator />
            
            {/* Notas */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Notas Adicionales</h3>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={currentRecord.notes}
                  onChange={(e) => setCurrentRecord({...currentRecord, notes: e.target.value})}
                  placeholder="Notas adicionales sobre el registro..."
                  rows={3}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleAddRecord}>
              {editingIndex !== null ? "Actualizar" : "Agregar"} Registro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Vista previa de datos del Excel */}
      {previewData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vista Previa de Datos</CardTitle>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{previewData.length} registros encontrados</span>
              <Badge variant="outline" className="text-green-600 border-green-600">
                {previewData.filter(record => record.isMatched).length} con precio
              </Badge>
              {previewData.filter(record => !record.isMatched).length > 0 && (
                <Badge variant="outline" className="text-orange-600 border-orange-600">
                  {previewData.filter(record => !record.isMatched).length} sin coincidencia
                </Badge>
              )}
              <span className="ml-auto font-medium">
                Total: ${previewData.reduce((sum, record) => sum + (record.matchedPrice || 0), 0).toFixed(2)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-96 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Consecutivo</TableHead>
                    <TableHead>Contenedor</TableHead>
                    <TableHead>From/To</TableHead>
                    <TableHead>Operación</TableHead>
                    <TableHead>Conductor</TableHead>
                    <TableHead>Precio</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewData.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell>{record.associate}</TableCell>
                      <TableCell className="font-mono text-sm">{record.containerConsecutive || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{record.container}</span>
                          <span className="text-xs text-muted-foreground">
                            {record.size}' {record.type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs">{record.from}</span>
                          <span className="text-xs">→ {record.to}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={record.moveType === "import" ? "default" : "secondary"}>
                          {record.moveType?.toUpperCase() || ''}
                        </Badge>
                      </TableCell>
                      <TableCell>{record.driverName}</TableCell>
                      <TableCell>
                        {record.isMatched ? (
                          <span className="font-medium text-green-600">
                            ${record.matchedPrice?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.isMatched ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Match
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Sin match
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={handleUpload}
                disabled={isLoading || isCreatingRecords}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading || isCreatingRecords ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar en Sistema"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Clientes */}
      <ClientModal
        isOpen={showAddClientDialog}
        onClose={() => setShowAddClientDialog(false)}
        onClientCreated={(client) => {
          // Cuando se crea un cliente, seleccionarlo automáticamente
          setCurrentRecord(prev => ({
            ...prev,
            clientId: client._id || client.id || ""
          }))
          setShowAddClientDialog(false)
        }}
      />
    </div>
  )
} 