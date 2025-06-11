"use client"

import type React from "react"
import { useState, useEffect, useMemo } from "react"
import { useDispatch } from "react-redux"
import { useAppSelector } from "@/lib/hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  FileText,
  ListChecks,
  UserCheck,
  FileSignature,
  Send,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Search,
  Truck,
  RouteIcon as RouteIconLucide,
  UserIcon as UserIconLucide,
  Download,
} from "lucide-react"
import {
  addInvoice,
  markRecordsAsInvoiced,
  selectInvoicesByModule,
  selectPendingRecordsByModule, // This selector should target state.records.individualRecords
  type InvoiceRecord as PersistedInvoiceRecord,
  type ExcelRecord as IndividualExcelRecord, // Use the type from recordsSlice
} from "@/lib/features/records/recordsSlice"
import {
  selectTruckingDrivers,
  selectTruckingRoutes,
  selectTruckingVehicles,
  selectModuleCustomFields,
  type CustomFieldConfig,
} from "@/lib/features/config/configSlice"
import { generateInvoiceXML } from "@/lib/xml-generator"
import type { InvoiceForXmlPayload, InvoiceLineItemForXml } from "@/lib/features/invoice/invoiceSlice"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import saveAs from "file-saver"

type InvoiceStep = "select" | "create" | "review" | "confirm"

interface TruckingFormData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  clientName: string
  clientRuc: string
  clientAddress: string
  driverId: string
  vehicleId: string
  routeId: string
  description: string
  subtotal: number
  taxAmount: number
  total: number
  currency: string
  [customFieldId: string]: any
}

const getNewInvoiceState = (): TruckingFormData => ({
  invoiceNumber: `F-TRK-${Date.now().toString().slice(-5)}`,
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  clientName: "",
  clientRuc: "",
  clientAddress: "",
  driverId: "",
  vehicleId: "",
  routeId: "",
  description: "",
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  currency: "USD",
})

export default function TruckingInvoice() {
  const dispatch = useDispatch()
  const router = useRouter()
  const { toast } = useToast()

  // Fetch individual pending records for "trucking"
  const pendingTruckingRecords: IndividualExcelRecord[] = useAppSelector((state) =>
    selectPendingRecordsByModule(state, "trucking"),
  )
  const truckingGeneratedInvoices = useAppSelector((state) => selectInvoicesByModule(state, "trucking"))

  const configuredDrivers = useAppSelector(selectTruckingDrivers)
  const configuredRoutes = useAppSelector(selectTruckingRoutes)
  const configuredVehicles = useAppSelector(selectTruckingVehicles)
  const truckingCustomFields = useAppSelector((state) => selectModuleCustomFields(state, "trucking"))

  const [currentStep, setCurrentStep] = useState<InvoiceStep>("select")
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [formData, setFormData] = useState<TruckingFormData>(() => getNewInvoiceState())
  const [searchTerm, setSearchTerm] = useState("")
  const [generatedXml, setGeneratedXml] = useState<string | null>(null)

  const filteredPendingRecords = useMemo(() => {
    if (!searchTerm) return pendingTruckingRecords
    const lowerSearch = searchTerm.toLowerCase()
    return pendingTruckingRecords.filter((record) => {
      const data = record.data as Record<string, any> // Cast record.data for easier access
      return (
        String(data.cliente || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.ruc || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.contenedor || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.bl || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(data.driverExcel || "")
          .toLowerCase()
          .includes(lowerSearch) ||
        String(record.id).toLowerCase().includes(lowerSearch)
      )
    })
  }, [pendingTruckingRecords, searchTerm])

  const selectedRecordDetails: IndividualExcelRecord[] = useMemo(() => {
    return pendingTruckingRecords.filter((record) => selectedRecordIds.includes(record.id))
  }, [selectedRecordIds, pendingTruckingRecords])

  const selectedRecordDetailsString = useMemo(() => JSON.stringify(selectedRecordDetails), [selectedRecordDetails])
  const truckingCustomFieldsString = useMemo(() => JSON.stringify(truckingCustomFields), [truckingCustomFields])

  useEffect(() => {
    // Parse the stringified dependencies back to objects for use inside the effect
    const currentSelectedDetails: IndividualExcelRecord[] = JSON.parse(selectedRecordDetailsString)
    const currentCustomFields: CustomFieldConfig[] = JSON.parse(truckingCustomFieldsString)

    if (currentSelectedDetails.length > 0) {
      const firstSelectedRecordData = currentSelectedDetails[0].data as Record<string, any>
      const subtotalCalc = currentSelectedDetails.reduce((sum, record) => sum + record.totalValue, 0)
      const taxCalc = subtotalCalc * 0.07
      const totalCalc = subtotalCalc + taxCalc

      setFormData((prev) => {
        const newFormData = { ...prev }

        newFormData.clientName = String(firstSelectedRecordData?.cliente || "")
        newFormData.clientRuc = String(firstSelectedRecordData?.ruc || "")
        newFormData.clientAddress = String(firstSelectedRecordData?.clientAddress || "")
        newFormData.description = `Servicios de transporte terrestre (${currentSelectedDetails.length} registros)`
        newFormData.subtotal = subtotalCalc
        newFormData.taxAmount = taxCalc
        newFormData.total = totalCalc

        currentCustomFields.forEach((cf) => {
          const excelKeyGuess = cf.label
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^\w_]/g, "")
          const derivedValue = firstSelectedRecordData?.[excelKeyGuess]
          newFormData[cf.id] = derivedValue !== undefined ? derivedValue : prev[cf.id] || ""
        })
        return newFormData
      })
    } else {
      setFormData((prev) => ({
        ...prev,
        clientName: "",
        clientRuc: "",
        clientAddress: "",
        description: "",
        subtotal: 0,
        taxAmount: 0,
        total: 0,
        ...Object.fromEntries(currentCustomFields.map((cf) => [cf.id, ""])),
      }))
    }
  }, [selectedRecordDetailsString, truckingCustomFieldsString]) // Effect depends on stable strings

  const handleRecordSelectionChange = (recordId: string, checked: boolean | string) =>
    setSelectedRecordIds((prev) => (checked ? [...prev, recordId] : prev.filter((id) => id !== recordId)))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newState = { ...prev, [name]: value }
      if (name === "subtotal") {
        const newSub = Number.parseFloat(value) || 0
        newState.subtotal = newSub
        newState.taxAmount = newSub * 0.07
        newState.total = newState.subtotal + newState.taxAmount
      }
      return newState
    })
  }

  const handleCustomFieldChange = (fieldId: string, value: string | number | Date) =>
    setFormData((prev) => ({ ...prev, [fieldId]: value }))

  const validateStep = (step: InvoiceStep): boolean => {
    if (step === "select" && selectedRecordIds.length === 0) {
      toast({
        title: "Error de Selección",
        description: "Debe seleccionar al menos un registro individual.",
        variant: "destructive",
      })
      return false
    }
    if (step === "create") {
      const requiredFields: (keyof TruckingFormData)[] = ["clientName", "clientRuc", "driverId", "vehicleId", "routeId"]
      for (const field of requiredFields) {
        if (!formData[field]) {
          toast({
            title: "Campos Incompletos",
            description: `El campo '${field.replace("Id", "")}' es obligatorio.`,
            variant: "destructive",
          })
          return false
        }
      }
      if (formData.total <= 0) {
        toast({
          title: "Monto Inválido",
          description: "El total de la factura debe ser mayor a cero.",
          variant: "destructive",
        })
        return false
      }
      if (
        !/^([NnJjVvEeGgPEpe](?:-\d{1,8})(?:-\d{1,6})?|\d{1,9}[PEepenNpiiav]{0,2}(?:-\d{1,4})?(?:-\d{1,6})?|\d{1,12})$/.test(
          formData.clientRuc,
        )
      ) {
        toast({
          title: "RUC/Cédula Inválido",
          description: "Formato de RUC/Cédula no válido para Panamá.",
          variant: "destructive",
        })
        return false
      }
    }
    return true
  }

  const nextStep = () => {
    if (!validateStep(currentStep)) return

    if (currentStep === "select") {
      if (selectedRecordDetails.length === 0) {
        toast({
          title: "Sin Selección",
          description: "Por favor, seleccione al menos un registro para facturar.",
          variant: "destructive",
        })
        return
      }
      setCurrentStep("create")
    } else if (currentStep === "create") {
      const lineItemsForXml: InvoiceLineItemForXml[] = selectedRecordDetails.map((rec) => {
        const recData = rec.data as Record<string, any>
        const lineItemCustomFields: Record<string, any> = {}
        truckingCustomFields.forEach((cf) => {
          const excelKeyGuess = cf.label
            .toLowerCase()
            .replace(/\s+/g, "_")
            .replace(/[^\w_]/g, "")
          if (recData && recData[excelKeyGuess] !== undefined) {
            lineItemCustomFields[cf.id] = recData[excelKeyGuess]
          }
        })

        return {
          id: rec.id, // Use the unique ID of the individual record
          description: recData.description || `Servicio de ${recData.tamaño || ""} Cont. ${recData.contenedor || ""}`,
          quantity: recData.quantity || 1,
          unitPrice: recData.tarifa || rec.totalValue, // Use tarifa from Excel data or totalValue of record
          totalPrice: rec.totalValue, // Use the calculated totalValue for the line item
          serviceCode: recData.serviceCode || "TRK-STD",
          unit: recData.unit || "VIAJE",
          blNumber: recData.bl || "",
          containerNumber: recData.contenedor || "",
          containerSize: recData.tamaño || "",
          containerType: recData.tipoContenedor || "",
          containerIsoCode: recData.containerIsoCode || "",
          fullEmptyStatus: recData.fullEmptyStatus || "",
          ...lineItemCustomFields,
        }
      })

      const invoiceLevelCustomFields: Record<string, any> = {}
      truckingCustomFields.forEach((cf) => {
        if (formData[cf.id] !== undefined && formData[cf.id] !== "") {
          invoiceLevelCustomFields[cf.id] = formData[cf.id]
        }
      })

      const xmlPayload: InvoiceForXmlPayload = {
        id: `XML-${formData.invoiceNumber}-${Date.now()}`,
        module: "trucking",
        invoiceNumber: formData.invoiceNumber,
        client: formData.clientRuc,
        clientName: formData.clientName,
        date: formData.issueDate,
        dueDate: formData.dueDate,
        currency: formData.currency,
        total: formData.total,
        records: lineItemsForXml,
        status: "generated",
        driverId: formData.driverId,
        vehicleId: formData.vehicleId,
        routeId: formData.routeId,
        ...invoiceLevelCustomFields,
      }
      try {
        const generated = generateInvoiceXML(xmlPayload)
        setGeneratedXml(generated)
        setCurrentStep("review")
      } catch (e: any) {
        console.error("XML Generation Error:", e)
        toast({ title: "Error al Generar XML", description: e.message || String(e), variant: "destructive" })
      }
    } else if (currentStep === "review") {
      setCurrentStep("confirm")
    }
  }

  const prevStep = () => {
    if (currentStep === "create") setCurrentStep("select")
    else if (currentStep === "review") setCurrentStep("create")
    else if (currentStep === "confirm") setCurrentStep("review")
  }

  const handleFinalizeInvoice = () => {
    if (!generatedXml) {
      toast({ title: "Error", description: "XML no generado. No se puede finalizar.", variant: "destructive" })
      return
    }
    const driver = configuredDrivers.find((d) => d.id === formData.driverId)
    const vehicle = configuredVehicles.find((v) => v.id === formData.vehicleId)
    const route = configuredRoutes.find((r) => r.id === formData.routeId)

    const invoiceDetails: PersistedInvoiceRecord["details"] = {
      driverId: formData.driverId,
      driverName: driver?.name,
      vehicleId: formData.vehicleId,
      vehicleInfo: vehicle ? `${vehicle.plate} (${vehicle.model})` : undefined,
      routeId: formData.routeId,
      routeName: route?.name,
    }
    truckingCustomFields.forEach((cf) => {
      if (formData[cf.id] !== undefined && formData[cf.id] !== "") invoiceDetails[cf.id] = formData[cf.id]
    })

    const newInvoice: PersistedInvoiceRecord = {
      id: `TRK-INV-${Date.now().toString().slice(-6)}`,
      module: "trucking",
      invoiceNumber: formData.invoiceNumber,
      clientName: formData.clientName,
      clientRuc: formData.clientRuc,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      currency: formData.currency,
      subtotal: formData.subtotal,
      taxAmount: formData.taxAmount,
      totalAmount: formData.total,
      status: "generada",
      xmlData: generatedXml,
      relatedRecordIds: selectedRecordIds, // These are IDs of IndividualExcelRecord
      notes: formData.description,
      details: invoiceDetails,
      createdAt: new Date().toISOString(),
    }
    dispatch(addInvoice(newInvoice))
    dispatch(markRecordsAsInvoiced({ recordIds: selectedRecordIds, invoiceId: newInvoice.id }))

    toast({
      title: "Factura Finalizada",
      description: `${newInvoice.invoiceNumber} guardada con éxito.`,
      className: "bg-green-600 text-white",
    })
    setSelectedRecordIds([])
    setFormData(getNewInvoiceState())
    setGeneratedXml(null)
    setCurrentStep("select")
    router.push("/trucking/records")
  }

  const handleDownloadXml = () => {
    if (generatedXml) {
      const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" })
      saveAs(blob, `${formData.invoiceNumber || "factura"}.xml`)
      toast({ title: "XML Descargado", description: "El archivo XML ha sido descargado." })
    } else {
      toast({ title: "Error", description: "No hay XML generado para descargar.", variant: "destructive" })
    }
  }

  const progressValue =
    currentStep === "select" ? 25 : currentStep === "create" ? 50 : currentStep === "review" ? 75 : 100

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <FileText className="mr-2 h-8 w-8" />
          Gestión de Facturas de Trucking
        </h1>
        <p className="text-muted-foreground">
          Crea, revisa y finaliza facturas para el módulo de transporte terrestre.
        </p>
      </header>
      <div className="mb-8">
        <Progress value={progressValue} className="w-full" />
        <div className="flex justify-between text-sm text-muted-foreground mt-1">
          <span className={currentStep === "select" ? "font-bold text-primary" : ""}>1. Seleccionar Registros</span>
          <span className={currentStep === "create" ? "font-bold text-primary" : ""}>2. Crear Factura</span>
          <span className={currentStep === "review" ? "font-bold text-primary" : ""}>3. Revisar XML</span>
          <span className={currentStep === "confirm" ? "font-bold text-primary" : ""}>4. Confirmar</span>
        </div>
      </div>
      {currentStep === "select" && (
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                      const data = record.data as Record<string, any> // Cast for easier access
                      return (
                        <TableRow
                          key={record.id}
                          className={selectedRecordIds.includes(record.id) ? "bg-muted/50" : ""}
                          onClick={() => handleRecordSelectionChange(record.id, !selectedRecordIds.includes(record.id))}
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
                  No se encontraron registros individuales pendientes para Trucking. Puedes{" "}
                  <Button variant="link" className="p-0 h-auto" onClick={() => router.push("/trucking/upload")}>
                    cargar nuevos desde un Excel
                  </Button>
                  .
                </AlertDescription>
              </Alert>
            )}
            {truckingGeneratedInvoices.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-2">Facturas de Trucking Ya Generadas</h3>
                <div className="max-h-[200px] overflow-y-auto border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nº Factura</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {truckingGeneratedInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell>{invoice.invoiceNumber}</TableCell>
                          <TableCell>{invoice.clientName}</TableCell>
                          <TableCell>{new Date(invoice.issueDate).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">$ {invoice.totalAmount.toFixed(2)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${invoice.status === "generada" ? "bg-blue-100 text-blue-700" : invoice.status === "transmitida" ? "bg-green-100 text-green-700" : invoice.status === "anulada" ? "bg-red-100 text-red-700" : invoice.status === "pagada" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}
                            >
                              {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1).replace("_", " ")}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {currentStep === "create" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileSignature className="mr-2 h-6 w-6" />
              Crear Factura de Trucking
            </CardTitle>
            <CardDescription>
              Completa los detalles. Algunos campos se prellenan desde los registros seleccionados.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold mb-2 border-b pb-1">Datos Generales</legend>
                <div>
                  <Label htmlFor="invoiceNumber">Número Factura</Label>
                  <Input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="issueDate">Fecha Emisión</Label>
                    <Input
                      id="issueDate"
                      name="issueDate"
                      type="date"
                      value={formData.issueDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dueDate">Fecha Vencimiento</Label>
                    <Input
                      id="dueDate"
                      name="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    name="currency"
                    value={formData.currency}
                    onValueChange={(value) => handleInputChange({ target: { name: "currency", value } } as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="PAB">PAB</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </fieldset>
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold mb-2 border-b pb-1">Datos del Cliente</legend>
                <div>
                  <Label htmlFor="clientName">Nombre Cliente</Label>
                  <Input
                    id="clientName"
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientRuc">RUC/Cédula</Label>
                  <Input
                    id="clientRuc"
                    name="clientRuc"
                    value={formData.clientRuc}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="clientAddress">Dirección</Label>
                  <Input
                    id="clientAddress"
                    name="clientAddress"
                    value={formData.clientAddress}
                    onChange={handleInputChange}
                  />
                </div>
              </fieldset>
            </div>
            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold mb-2 border-b pb-1">Detalles Servicio Transporte</legend>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="driverId" className="flex items-center">
                    <UserIconLucide className="mr-1 h-4 w-4" />
                    Conductor
                  </Label>
                  <Select
                    name="driverId"
                    value={formData.driverId}
                    onValueChange={(value) => handleInputChange({ target: { name: "driverId", value } } as any)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {configuredDrivers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="vehicleId" className="flex items-center">
                    <Truck className="mr-1 h-4 w-4" />
                    Vehículo
                  </Label>
                  <Select
                    name="vehicleId"
                    value={formData.vehicleId}
                    onValueChange={(value) => handleInputChange({ target: { name: "vehicleId", value } } as any)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {configuredVehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.plate} ({v.model})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="routeId" className="flex items-center">
                    <RouteIconLucide className="mr-1 h-4 w-4" />
                    Ruta
                  </Label>
                  <Select
                    name="routeId"
                    value={formData.routeId}
                    onValueChange={(value) => handleInputChange({ target: { name: "routeId", value } } as any)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {configuredRoutes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </fieldset>

            {truckingCustomFields.length > 0 && (
              <fieldset className="space-y-4">
                <legend className="text-lg font-semibold mb-2 border-b pb-1">Campos Personalizados (Trucking)</legend>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {truckingCustomFields.map((field: CustomFieldConfig) => (
                    <div key={field.id}>
                      <Label htmlFor={field.id}>{field.label}</Label>
                      <Input
                        id={field.id}
                        name={field.id}
                        type={field.type}
                        value={formData[field.id] || ""}
                        onChange={(e) =>
                          handleCustomFieldChange(
                            field.id,
                            field.type === "number" ? Number.parseFloat(e.target.value) || "" : e.target.value,
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </fieldset>
            )}

            <fieldset className="space-y-4">
              <legend className="text-lg font-semibold mb-2 border-b pb-1">Notas y Montos</legend>
              <div>
                <Label htmlFor="description">Descripción / Notas Adicionales</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="subtotal">Subtotal ({formData.currency})</Label>
                  <Input
                    id="subtotal"
                    name="subtotal"
                    type="number"
                    value={formData.subtotal.toFixed(2)}
                    onChange={handleInputChange}
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="taxAmount">ITBMS (7%) ({formData.currency})</Label>
                  <Input
                    id="taxAmount"
                    name="taxAmount"
                    type="number"
                    value={formData.taxAmount.toFixed(2)}
                    readOnly
                    disabled
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <Label htmlFor="total">Total ({formData.currency})</Label>
                  <Input
                    id="total"
                    name="total"
                    type="number"
                    value={formData.total.toFixed(2)}
                    readOnly
                    disabled
                    className="bg-muted/50 font-bold"
                  />
                </div>
              </div>
            </fieldset>
          </CardContent>
        </Card>
      )}
      {currentStep === "review" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="mr-2 h-6 w-6" />
              Revisar Factura y XML
            </CardTitle>
            <CardDescription>Verifica los datos y el XML generado. Puedes descargarlo para revisión.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-muted/20">
              <div>
                <h3 className="font-semibold mb-1">Factura Nº: {formData.invoiceNumber}</h3>
                <p>
                  <strong>Cliente:</strong> {formData.clientName}
                </p>
                <p>
                  <strong>RUC/Cédula:</strong> {formData.clientRuc}
                </p>
                <p>
                  <strong>Dirección:</strong> {formData.clientAddress || "N/A"}
                </p>
                <p>
                  <strong>Fecha Emisión:</strong> {new Date(formData.issueDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Fecha Venc.:</strong> {new Date(formData.dueDate).toLocaleDateString()}
                </p>
                <p>
                  <strong>Moneda:</strong> {formData.currency}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-1">Detalles Transporte:</h3>
                <p>
                  <strong>Conductor:</strong> {configuredDrivers.find((d) => d.id === formData.driverId)?.name || "N/A"}
                </p>
                <p>
                  <strong>Vehículo:</strong>{" "}
                  {configuredVehicles.find((v) => v.id === formData.vehicleId)?.plate || "N/A"}
                </p>
                <p>
                  <strong>Ruta:</strong> {configuredRoutes.find((r) => r.id === formData.routeId)?.name || "N/A"}
                </p>
              </div>
              {truckingCustomFields.filter((cf) => formData[cf.id] !== undefined && formData[cf.id] !== "").length >
                0 && (
                <div className="md:col-span-2">
                  <h3 className="font-semibold mb-1">Campos Personalizados:</h3>
                  {truckingCustomFields.map((cf) =>
                    formData[cf.id] !== undefined && formData[cf.id] !== "" ? (
                      <p key={cf.id}>
                        <strong>{cf.label}:</strong> {String(formData[cf.id])}
                      </p>
                    ) : null,
                  )}
                </div>
              )}
              <div className="md:col-span-2">
                <h3 className="font-semibold mb-1">Registros Individuales Incluidos:</h3>
                <ul className="list-disc list-inside text-sm max-h-24 overflow-y-auto">
                  {selectedRecordDetails.map((r) => {
                    const data = r.data as Record<string, any>
                    return (
                      <li key={r.id}>
                        ID: {r.id.split("-").pop()} - {data.cliente} - {data.contenedor} ({data.tamaño}) - $
                        {r.totalValue.toFixed(2)}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
            <div className="text-right space-y-1 mt-4">
              <p>
                <strong>Subtotal:</strong> {formData.currency} {formData.subtotal.toFixed(2)}
              </p>
              <p>
                <strong>ITBMS (7%):</strong> {formData.currency} {formData.taxAmount.toFixed(2)}
              </p>
              <p className="text-xl font-bold">
                <strong>Total:</strong> {formData.currency} {formData.total.toFixed(2)}
              </p>
            </div>
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">XML Generado:</h3>
                <Button onClick={handleDownloadXml} variant="outline" size="sm" disabled={!generatedXml}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar XML
                </Button>
              </div>
              <Textarea
                value={generatedXml || "Error al generar XML o XML no disponible."}
                readOnly
                rows={15}
                className="font-mono text-xs bg-muted/30"
              />
            </div>
          </CardContent>
        </Card>
      )}
      {currentStep === "confirm" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Send className="mr-2 h-6 w-6" />
              Confirmar y Finalizar Factura
            </CardTitle>
            <CardDescription>Estás a punto de finalizar y guardar la factura.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-700">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <AlertTitle>Confirmación Final</AlertTitle>
              <AlertDescription>
                Al hacer clic en "Finalizar Factura", se guardará la factura y los registros individuales seleccionados
                se marcarán como facturados.
              </AlertDescription>
            </Alert>
            <div className="mt-6 text-center">
              <p className="text-lg">
                Total a Facturar:{" "}
                <strong className="text-2xl">
                  {formData.currency} {formData.total.toFixed(2)}
                </strong>
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-center">
            <Button onClick={handleFinalizeInvoice} size="lg" className="bg-green-600 hover:bg-green-700">
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Finalizar Factura
            </Button>
          </CardFooter>
        </Card>
      )}

      <div className="mt-8 flex justify-between">
        <Button onClick={prevStep} disabled={currentStep === "select"} variant="outline">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Anterior
        </Button>
        {currentStep !== "confirm" ? (
          <Button onClick={nextStep} disabled={currentStep === "select" && selectedRecordIds.length === 0}>
            Siguiente
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
