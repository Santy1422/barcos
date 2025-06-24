"use client"

import React from "react"
import { useState, useEffect, useMemo } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
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
import { Badge } from "@/components/ui/badge"
import { TruckingExcelData } from "@/lib/excel-parser"
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
  Route as RouteIcon,
  Download,
  User as UserIcon,
  Loader2,
  Settings,
  Calendar,
  DollarSign,
  FileSearch,
  Package,
  Box,
  Scale,
  Hash
} from "lucide-react"
import {
  addInvoice,
  markRecordsAsInvoiced,
  selectInvoicesByModule,
  selectPendingRecordsByModule,
  selectRecordsLoading,
  fetchPendingRecords,
  type InvoiceRecord as PersistedInvoiceRecord,
  type ExcelRecord as IndividualExcelRecord,
} from "@/lib/features/records/recordsSlice"
import {
  selectModuleCustomFields,
  type CustomFieldConfig,
  selectTruckingDrivers,
  selectTruckingRoutes,
  selectTruckingVehicles,
} from "@/lib/features/config/configSlice"
import { generateInvoiceXML } from "@/lib/xml-generator"
import type { InvoiceForXmlPayload, InvoiceLineItemForXml } from "@/lib/features/invoice/invoiceSlice"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import saveAs from "file-saver"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type InvoiceStep = "select" | "create" | "review" | "confirm"

interface TruckingFormData {
  invoiceNumber: string
  issueDate: string
  dueDate: string
  clientName: string
  clientRuc: string
  clientAddress: string
  clientSapNumber: string
  driverId: string
  vehicleId: string
  routeId: string
  originPort: string
  destinationPort: string
  moveDate: string
  associatedCompany: string
  description: string
  subtotal: number
  taxAmount: number
  total: number
  currency: string
  serviceCode: string
  activityCode: string
  bundle: string
  cargoType: string
  sealNumber: string
  weight: string
  weightInTons: number
  serviceItems: Array<{
    id: string
    containerNumber: string
    blNumber: string
    serviceCode: string
    activityCode: string
    amount: number
    description: string
    containerSize: string
    moveDate: string
    origin: string
    destination: string
    weight: string
    commodity: string
    cargoType: string
    sealNumber: string
  }>
  [customFieldId: string]: any
}

const getNewInvoiceState = (): TruckingFormData => ({
  invoiceNumber: `F-TRK-${Date.now().toString().slice(-5)}`,
  issueDate: new Date().toISOString().split("T")[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  clientName: "",
  clientRuc: "",
  clientAddress: "",
  clientSapNumber: "",
  driverId: "",
  vehicleId: "",
  routeId: "",
  originPort: "",
  destinationPort: "",
  moveDate: "",
  associatedCompany: "",
  cargoType: "",
  sealNumber: "",
  weight: "",
  weightInTons: 0,
  description: "",
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  currency: "USD",
  serviceCode: "SRV100",
  activityCode: "ACT205",
  bundle: "TRUCKING",
  serviceItems: []
})

// Mapeo mejorado de campos desde Excel
const FIELD_MAPPING = {
  client: ['cliente', 'client_name', 'customer'],
  clientName: ['cliente', 'client_name', 'customer'],
  ruc: ['ruc', 'tax_id', 'identification'],
  clientRuc: ['ruc', 'tax_id', 'identification'],
  address: ['direccion', 'address', 'client_address'],
  clientAddress: ['direccion', 'address', 'client_address'],
  sapNumber: ['numero_sap', 'sap_number', 'customer_sap_code', 'codigo_cliente_sap'],
  clientSapNumber: ['numero_sap', 'sap_number', 'customer_sap_code', 'codigo_cliente_sap'],
  driver: ['conductor', 'driver', 'chofer', 'driver_name'],
  driverId: ['conductor', 'driver', 'chofer', 'driver_name'],
  vehicle: ['vehiculo', 'placa', 'vehicle', 'truck', 'vehicle_plate'],
  vehicleId: ['vehiculo', 'placa', 'vehicle', 'truck', 'vehicle_plate'],
  route: ['ruta', 'route', 'origen_destino', 'origin_destination', 'route_description'],
  routeId: ['ruta', 'route', 'origen_destino', 'origin_destination', 'route_description'],
  origin: ['puerto_origen', 'origin_port', 'origen'],
  originPort: ['puerto_origen', 'origin_port', 'origen'],
  destination: ['puerto_destino', 'destination_port', 'destino'],
  destinationPort: ['puerto_destino', 'destination_port', 'destino'],
  moveDate: ['fecha_movimiento', 'move_date', 'fecha'],
  company: ['empresa_asociada', 'associate', 'company'],
  container: ['contenedor', 'container', 'container_number', 'numero_contenedor'],
  bl: ['bl_number', 'bl', 'conocimiento', 'bill_of_lading'],
  blNumber: ['bl_number', 'bl', 'conocimiento', 'bill_of_lading'],
  size: ['tamaño', 'size', 'container_size'],
  type: ['tipo_contenedor', 'container_type'],
  containerType: ['tipo_contenedor', 'container_type'],
  weight: ['peso', 'weight'],
  commodity: ['mercancia', 'commodity', 'producto'],
  seal: ['sello', 'seal', 'seal_number', 'numero_sello'],
  cargoType: ['tipo_carga', 'cargo_type'],
  serviceType: ['tipo_servicio', 'service_type', 'servicio']
}

// Configuración de secciones del formulario
const FORM_SECTIONS = [
  {
    id: 'general',
    title: "Datos Generales",
    icon: <FileText className="mr-2 h-5 w-5" />,
    description: "Información básica de la factura",
    fields: [
      { id: 'invoiceNumber', label: "Número Factura", icon: <Hash className="h-4 w-4" />, required: true },
      { id: 'issueDate', label: "Fecha Emisión", icon: <Calendar className="h-4 w-4" />, type: 'date', required: true },
      { id: 'dueDate', label: "Fecha Vencimiento", icon: <Calendar className="h-4 w-4" />, type: 'date', required: true },
      { id: 'currency', label: "Moneda", icon: <DollarSign className="h-4 w-4" />, type: 'select', options: ['USD', 'PAB'], required: true }
    ]
  },
  {
    id: 'client',
    title: "Información del Cliente",
    icon: <UserIcon className="mr-2 h-5 w-5" />,
    description: "Datos del cliente extraídos del Excel",
    fields: [
      { id: 'clientName', label: "Nombre Cliente", icon: <UserIcon className="h-4 w-4" />, required: true, auto: true },
      { id: 'clientRuc', label: "RUC/Cédula", icon: <FileSearch className="h-4 w-4" />, required: true, auto: true },
      { id: 'clientAddress', label: "Dirección", icon: <FileSearch className="h-4 w-4" />, auto: true },
      { id: 'clientSapNumber', label: "Número SAP Cliente", icon: <FileSearch className="h-4 w-4" />, auto: true }
    ]
  },
  {
    id: 'transport',
    title: "Detalles de Transporte",
    icon: <Truck className="mr-2 h-5 w-5" />,
    description: "Información de la operación logística",
    fields: [
      { id: 'driverId', label: "Conductor", icon: <UserIcon className="h-4 w-4" />, required: true, auto: true },
      { id: 'vehicleId', label: "Vehículo/Placa", icon: <Truck className="h-4 w-4" />, required: true, auto: true },
      { id: 'routeId', label: "Ruta", icon: <RouteIcon className="h-4 w-4" />, required: true, auto: true },
      { id: 'originPort', label: "Puerto Origen", icon: <Package className="h-4 w-4" />, auto: true },
      { id: 'destinationPort', label: "Puerto Destino", icon: <Package className="h-4 w-4" />, auto: true },
      { id: 'moveDate', label: "Fecha Movimiento", icon: <Calendar className="h-4 w-4" />, type: 'date', auto: true },
      { id: 'associatedCompany', label: "Empresa Asociada", icon: <Box className="h-4 w-4" />, auto: true }
    ]
  },
  {
    id: 'cargo',
    title: "Detalles de Carga",
    icon: <Package className="mr-2 h-5 w-5" />,
    description: "Información específica de la carga",
    fields: [
      { id: 'cargoType', label: "Tipo de Carga", icon: <Box className="h-4 w-4" />, auto: true },
      { id: 'sealNumber', label: "Número de Sello", icon: <FileSearch className="h-4 w-4" />, auto: true },
      { id: 'weight', label: "Peso", icon: <Scale className="h-4 w-4" />, auto: true }
    ]
  },
  {
    id: 'sap',
    title: "Configuración SAP",
    icon: <Settings className="mr-2 h-5 w-5" />,
    description: "Códigos y parámetros para SAP",
    fields: [
      { id: 'serviceCode', label: "Código Servicio", icon: <FileText className="h-4 w-4" />, required: true },
      { id: 'activityCode', label: "Código Actividad", icon: <FileText className="h-4 w-4" />, required: true },
      { id: 'bundle', label: "Bundle", icon: <Package className="h-4 w-4" />, required: true }
    ]
  }
]

export default function TruckingInvoice() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { toast } = useToast()

  const pendingTruckingRecords = useAppSelector((state) =>
    selectPendingRecordsByModule(state, "trucking")
  )
  const truckingGeneratedInvoices = useAppSelector((state) => selectInvoicesByModule(state, "trucking"))
  const isLoadingRecords = useAppSelector(selectRecordsLoading)
  const configuredDrivers = useAppSelector(selectTruckingDrivers)
  const configuredRoutes = useAppSelector(selectTruckingRoutes)
  const configuredVehicles = useAppSelector(selectTruckingVehicles)
  const truckingCustomFields = useAppSelector((state) => selectModuleCustomFields(state, "trucking"))

  const [currentStep, setCurrentStep] = useState<InvoiceStep>("select")
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [formData, setFormData] = useState<TruckingFormData>(getNewInvoiceState)
  const [searchTerm, setSearchTerm] = useState("")
  const [generatedXml, setGeneratedXml] = useState<string | null>(null)
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [activeFilters, setActiveFilters] = useState({
    dateRange: 'all',
    amountRange: 'all',
    hasContainer: 'all',
  })
  const [activeSection, setActiveSection] = useState(FORM_SECTIONS[0].id)

  useEffect(() => {
    dispatch(fetchPendingRecords())
  }, [dispatch])

  // Extraer valor de un registro basado en mapeo de campos
  const extractFieldValue = (recordData: any, fieldKeys: string[]) => {
    for (const key of fieldKeys) {
      if (recordData[key] !== undefined && recordData[key] !== "") {
        return recordData[key]
      }
    }
    return ""
  }

  const filteredPendingRecords = useMemo(() => {
    return pendingTruckingRecords.filter((record) => {
      const data = record.data as Record<string, any>
      const searchableText = [
        extractFieldValue(data, FIELD_MAPPING.container),
        extractFieldValue(data, FIELD_MAPPING.company),
        extractFieldValue(data, FIELD_MAPPING.driver),
        extractFieldValue(data, FIELD_MAPPING.vehicle),
        extractFieldValue(data, FIELD_MAPPING.bl),
        record.id,
      ].filter(Boolean).join(" ").toLowerCase()
      
      const matchesSearch = searchTerm === "" || searchableText.includes(searchTerm.toLowerCase())
      
      // Filtros de fecha
      let matchesDate = true
      if (activeFilters.dateRange !== 'all') {
        const recordDate = new Date(extractFieldValue(data, FIELD_MAPPING.moveDate) || new Date())
        const now = new Date()
        
        switch (activeFilters.dateRange) {
          case 'today':
            matchesDate = recordDate.toDateString() === now.toDateString()
            break
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            matchesDate = recordDate >= weekAgo
            break
          case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            matchesDate = recordDate >= monthAgo
            break
        }
      }
      
      // Filtros de monto
      let matchesAmount = true
      if (activeFilters.amountRange !== 'all') {
        const amount = record.totalValue || 0
        switch (activeFilters.amountRange) {
          case 'low': matchesAmount = amount < 100; break
          case 'medium': matchesAmount = amount >= 100 && amount < 500; break
          case 'high': matchesAmount = amount >= 500; break
        }
      }
      
      // Filtros de contenedor
      let matchesContainer = true
      if (activeFilters.hasContainer !== 'all') {
        const hasContainer = Boolean(extractFieldValue(data, FIELD_MAPPING.container))
        matchesContainer = activeFilters.hasContainer === 'yes' ? hasContainer : !hasContainer
      }
      
      return matchesSearch && matchesDate && matchesAmount && matchesContainer
    })
  }, [pendingTruckingRecords, searchTerm, activeFilters])

  const selectedRecordDetails = useMemo(() => {
    return pendingTruckingRecords.filter((record) => selectedRecordIds.includes(record.id))
  }, [selectedRecordIds, pendingTruckingRecords])

  useEffect(() => {
    if (selectedRecordDetails.length > 0) {
      const firstRecordData = selectedRecordDetails[0].data as Record<string, any>
      const subtotal = selectedRecordDetails.reduce((sum, record) => sum + record.totalValue, 0)

      setFormData(prev => {
        const newFormData: TruckingFormData = {
          ...prev, // Keep existing form data
          clientName: extractFieldValue(firstRecordData, FIELD_MAPPING.clientName),
          clientRuc: extractFieldValue(firstRecordData, FIELD_MAPPING.clientRuc),
          clientAddress: extractFieldValue(firstRecordData, FIELD_MAPPING.clientAddress),
          clientSapNumber: extractFieldValue(firstRecordData, FIELD_MAPPING.clientSapNumber),
          driverId: extractFieldValue(firstRecordData, FIELD_MAPPING.driverId),
          vehicleId: extractFieldValue(firstRecordData, FIELD_MAPPING.vehicleId),
          routeId: extractFieldValue(firstRecordData, FIELD_MAPPING.routeId),
          originPort: extractFieldValue(firstRecordData, FIELD_MAPPING.originPort),
          destinationPort: extractFieldValue(firstRecordData, FIELD_MAPPING.destinationPort),
          moveDate: extractFieldValue(firstRecordData, FIELD_MAPPING.moveDate),
          associatedCompany: extractFieldValue(firstRecordData, FIELD_MAPPING.company),
          cargoType: extractFieldValue(firstRecordData, FIELD_MAPPING.cargoType),
          sealNumber: extractFieldValue(firstRecordData, FIELD_MAPPING.seal),
          weight: extractFieldValue(firstRecordData, FIELD_MAPPING.weight),
          weightInTons: parseFloat(extractFieldValue(firstRecordData, FIELD_MAPPING.weight)?.replace(/[^\d.]/g, '') || '0') / 1000,
          subtotal,
          taxAmount: subtotal * 0.07,
          total: subtotal + (subtotal * 0.07),
          serviceItems: selectedRecordDetails.map(record => {
            const data = record.data as Record<string, any>
            const tipoServicio = extractFieldValue(data, FIELD_MAPPING.serviceType)
            const tipoContenedor = extractFieldValue(data, FIELD_MAPPING.containerType)
            
            return {
              id: record.id,
              containerNumber: extractFieldValue(data, FIELD_MAPPING.container),
              blNumber: extractFieldValue(data, FIELD_MAPPING.blNumber),
              serviceCode: tipoServicio === 'transporte' ? 'SRV100' : prev.serviceCode,
              activityCode: tipoContenedor === '20' ? 'ACT205' : tipoContenedor === '40' ? 'ACT240' : prev.activityCode,
              amount: record.totalValue,
              description: `${tipoServicio} - ${extractFieldValue(data, FIELD_MAPPING.container)}`,
              containerSize: extractFieldValue(data, FIELD_MAPPING.size),
              moveDate: extractFieldValue(data, FIELD_MAPPING.moveDate),
              origin: extractFieldValue(data, FIELD_MAPPING.originPort),
              destination: extractFieldValue(data, FIELD_MAPPING.destinationPort),
              weight: extractFieldValue(data, FIELD_MAPPING.weight),
              commodity: extractFieldValue(data, FIELD_MAPPING.commodity),
              cargoType: extractFieldValue(data, FIELD_MAPPING.cargoType),
              sealNumber: extractFieldValue(data, FIELD_MAPPING.seal)
            }
          })
        }

        // Generar descripción automática
        const serviceLines = newFormData.serviceItems.map((item, index) => 
          `${index + 1}. ${item.serviceCode} - ${item.containerNumber} - $${item.amount.toFixed(2)}`
        ).join('\n')
        
        newFormData.description = `Servicios de transporte terrestre (${selectedRecordDetails.length} registros)\n${serviceLines}`

        return newFormData
      })
    } else {
      setFormData(getNewInvoiceState())
    }
  }, [selectedRecordDetails]) // Only depend on selectedRecordDetails

  const handleRecordSelectionChange = (recordId: string, checked: boolean) =>
    setSelectedRecordIds(prev => checked ? [...prev, recordId] : prev.filter(id => id !== recordId))

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => {
      const newData = { ...prev, [name]: value }
      if (name === "subtotal") {
        const subtotal = Number(value) || 0
        newData.subtotal = subtotal
        newData.taxAmount = subtotal * 0.07
        newData.total = subtotal + newData.taxAmount
      }
      return newData
    })
  }

  const handleFilterChange = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => ({ ...prev, [filterType]: value }))
  }

  const clearAllFilters = () => {
    setActiveFilters({
      dateRange: 'all',
      amountRange: 'all',
      hasContainer: 'all',
    })
    setSearchTerm('')
  }

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
      const requiredFields = FORM_SECTIONS
        .flatMap(section => section.fields.filter(f => f.required).map(f => f.id))
        .filter(field => !formData[field])
      
      if (requiredFields.length > 0) {
        toast({
          title: "Campos Requeridos",
          description: `Complete los siguientes campos: ${requiredFields.join(", ")}.`,
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
      setCurrentStep("create")
    } else if (currentStep === "create") {
      generateDocuments()
      setCurrentStep("review")
    } else if (currentStep === "review") {
      setCurrentStep("confirm")
    }
  }

  const prevStep = () => {
    if (currentStep === "create") setCurrentStep("select")
    else if (currentStep === "review") setCurrentStep("create")
    else if (currentStep === "confirm") setCurrentStep("review")
  }

  const generateDocuments = () => {
    try {
      // Generar XML
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
        records: selectedRecordDetails.map(record => ({
          id: record.id,
          description: `Servicio de transporte - Container: ${extractFieldValue(record.data, FIELD_MAPPING.container) || "N/A"}`,
          quantity: 1,
          unitPrice: record.totalValue,
          totalPrice: record.totalValue,
          serviceCode: formData.serviceCode,
          unit: "VIAJE",
          blNumber: extractFieldValue(record.data, FIELD_MAPPING.bl),
          containerNumber: extractFieldValue(record.data, FIELD_MAPPING.container),
          containerSize: extractFieldValue(record.data, FIELD_MAPPING.size),
          containerType: extractFieldValue(record.data, FIELD_MAPPING.type),
          driverName: extractFieldValue(record.data, FIELD_MAPPING.driver),
          plate: extractFieldValue(record.data, FIELD_MAPPING.vehicle),
          moveDate: extractFieldValue(record.data, FIELD_MAPPING.moveDate),
          associate: extractFieldValue(record.data, FIELD_MAPPING.company)
        })),
        status: "generated",
        driverId: formData.driverId,
        vehicleId: formData.vehicleId,
        routeId: formData.routeId
      }
      
      const xml = generateInvoiceXML(xmlPayload)
      setGeneratedXml(xml)
      
      // Generar PDF
      const pdf = generateInvoicePDF(formData, selectedRecordDetails)
      setGeneratedPdf(pdf)
      
    } catch (e: any) {
      console.error("Error al generar documentos:", e)
      toast({ 
        title: "Error al Generar Documentos", 
        description: e.message || String(e), 
        variant: "destructive" 
      })
    }
  }

  const generateInvoicePDF = (invoiceData: TruckingFormData, records: IndividualExcelRecord[]): Blob => {
    const doc = new jsPDF()
    
    // Encabezado
    doc.setFontSize(20)
    doc.setTextColor(15, 23, 42) // slate-900
    doc.text('FACTURA DE TRANSPORTE TERRESTRE', 105, 20, { align: 'center' })
    
    // Información de la factura
    doc.setFontSize(10)
    doc.setTextColor(71, 85, 105) // slate-600
    doc.text(`Número: ${invoiceData.invoiceNumber}`, 15, 35)
    doc.text(`Fecha: ${new Date(invoiceData.issueDate).toLocaleDateString()}`, 15, 40)
    doc.text(`Vencimiento: ${new Date(invoiceData.dueDate).toLocaleDateString()}`, 15, 45)
    
    // Información del cliente
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text('Cliente:', 15, 60)
    doc.setFontSize(10)
    doc.text(invoiceData.clientName, 15, 65)
    doc.text(`RUC: ${invoiceData.clientRuc}`, 15, 70)
    doc.text(`Dirección: ${invoiceData.clientAddress || 'N/A'}`, 15, 75)
    
    // Detalles de transporte
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text('Detalles de Transporte:', 15, 90)
    doc.setFontSize(10)
    
    const driver = configuredDrivers.find(d => d.id === invoiceData.driverId)
    const vehicle = configuredVehicles.find(v => v.id === invoiceData.vehicleId)
    const route = configuredRoutes.find(r => r.id === invoiceData.routeId)
    
    doc.text(`Conductor: ${driver?.name || invoiceData.driverId}`, 15, 95)
    doc.text(`Vehículo: ${vehicle ? `${vehicle.plate} (${vehicle.model})` : invoiceData.vehicleId}`, 15, 100)
    doc.text(`Ruta: ${route?.name || invoiceData.routeId}`, 15, 105)
    
    // Tabla de servicios
    doc.setFontSize(12)
    doc.setTextColor(15, 23, 42)
    doc.text('Servicios de Transporte:', 15, 120)
    
    const serviceData = records.map(record => [
      extractFieldValue(record.data, FIELD_MAPPING.container) || 'N/A',
      extractFieldValue(record.data, FIELD_MAPPING.bl) || 'N/A',
      extractFieldValue(record.data, FIELD_MAPPING.size) || 'N/A',
      `$${record.totalValue.toFixed(2)}`
    ])
    
    autoTable(doc, {
      startY: 125,
      head: [['Contenedor', 'BL', 'Tamaño', 'Monto']],
      body: serviceData,
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: 255
      },
      alternateRowStyles: {
        fillColor: [241, 245, 249] // slate-50
      },
      margin: { left: 15 }
    })
    
    // Totales
    const finalY = (doc as any).lastAutoTable.finalY + 10
    doc.setFontSize(12)
    doc.text(`Subtotal: $${invoiceData.subtotal.toFixed(2)}`, 150, finalY)
    doc.text(`ITBMS (7%): $${invoiceData.taxAmount.toFixed(2)}`, 150, finalY + 5)
    doc.setFontSize(14)
    doc.setFont(undefined, 'bold')
    doc.text(`Total: $${invoiceData.total.toFixed(2)}`, 150, finalY + 15)
    
    // Notas
    if (invoiceData.description) {
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      doc.text('Notas:', 15, finalY + 30)
      doc.text(invoiceData.description, 15, finalY + 35, { maxWidth: 180 })
    }
    
    return new Blob([doc.output('blob')], { type: 'application/pdf' })
  }

  const handleFinalizeInvoice = async () => {
    if (!generatedXml) {
      toast({ title: "Error", description: "XML no generado. No se puede finalizar.", variant: "destructive" })
      return
    }
    
    try {
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
        relatedRecordIds: selectedRecordIds,
        notes: formData.description,
        details: {
          driverId: formData.driverId,
          driverName: configuredDrivers.find(d => d.id === formData.driverId)?.name,
          vehicleId: formData.vehicleId,
          vehicleInfo: configuredVehicles.find(v => v.id === formData.vehicleId)?.plate,
          routeId: formData.routeId,
          routeName: configuredRoutes.find(r => r.id === formData.routeId)?.name,
          ...Object.fromEntries(
            truckingCustomFields
              .filter(cf => formData[cf.id] !== undefined && formData[cf.id] !== "")
              .map(cf => [cf.id, formData[cf.id]])
          )
        },
        createdAt: new Date().toISOString(),
      }
      
      dispatch(addInvoice(newInvoice))
      dispatch(markRecordsAsInvoiced({ recordIds: selectedRecordIds, invoiceId: newInvoice.id }))
      dispatch(fetchPendingRecords())

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
    } catch (error) {
      console.error("Error al finalizar factura:", error)
      toast({
        title: "Error",
        description: "Hubo un problema al finalizar la factura.",
        variant: "destructive",
      })
    }
  }

  const handleDownloadXml = () => {
    if (generatedXml) {
      const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" })
      saveAs(blob, `${formData.invoiceNumber}.xml`)
      toast({ title: "XML Descargado", description: "El archivo XML ha sido descargado." })
    } else {
      toast({ title: "Error", description: "No hay XML generado para descargar.", variant: "destructive" })
    }
  }

  const handleDownloadPdf = () => {
    if (generatedPdf) {
      saveAs(generatedPdf, `${formData.invoiceNumber}.pdf`)
      toast({ title: "PDF Descargado", description: "El archivo PDF ha sido descargado." })
    } else {
      toast({ title: "Error", description: "No hay PDF generado para descargar.", variant: "destructive" })
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
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por contenedor, asociado, conductor, placa, BL, ID de registro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full"
                />
              </div>
            </div>

            <div className="mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-muted-foreground">Filtros Rápidos:</h4>
                <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                  Limpiar Filtros
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium">Por Fecha:</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: 'Todas' },
                    { value: 'today', label: 'Hoy' },
                    { value: 'week', label: 'Última Semana' },
                    { value: 'month', label: 'Último Mes' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={activeFilters.dateRange === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('dateRange', option.value)}
                      className="text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Por Monto:</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'low', label: '< $100' },
                    { value: 'medium', label: '$100 - $500' },
                    { value: 'high', label: '> $500' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={activeFilters.amountRange === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('amountRange', option.value)}
                      className="text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">Por Contenedor:</Label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'all', label: 'Todos' },
                    { value: 'yes', label: 'Con Contenedor' },
                    { value: 'no', label: 'Sin Contenedor' }
                  ].map((option) => (
                    <Button
                      key={option.value}
                      variant={activeFilters.hasContainer === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFilterChange('hasContainer', option.value)}
                      className="text-xs"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {(activeFilters.dateRange !== 'all' || activeFilters.amountRange !== 'all' || 
                activeFilters.hasContainer !== 'all' || searchTerm) && (
                <div className="bg-muted/30 p-3 rounded-md">
                  <p className="text-xs text-muted-foreground mb-1">Filtros activos:</p>
                  <div className="flex gap-1 flex-wrap">
                    {searchTerm && (
                      <Badge variant="secondary">Búsqueda: "{searchTerm}"</Badge>
                    )}
                    {activeFilters.dateRange !== 'all' && (
                      <Badge variant="blue">Fecha: {activeFilters.dateRange}</Badge>
                    )}
                    {activeFilters.amountRange !== 'all' && (
                      <Badge variant="green">Monto: {activeFilters.amountRange}</Badge>
                    )}
                    {activeFilters.hasContainer !== 'all' && (
                      <Badge variant="orange">
                        Contenedor: {activeFilters.hasContainer === 'yes' ? 'Con' : 'Sin'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Mostrando {filteredPendingRecords.length} de {pendingTruckingRecords.length} registros
                  </p>
                </div>
              )}
            </div>

            {isLoadingRecords ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Cargando registros...</span>
              </div>
            ) : filteredPendingRecords.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedRecordIds.length === filteredPendingRecords.length}
                          onCheckedChange={(checked) => {
                            setSelectedRecordIds(checked ? filteredPendingRecords.map(r => r.id) : [])
                          }}
                        />
                      </TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Conetenedor</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unit.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Asociado</TableHead>
                      <TableHead>Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPendingRecords.map((record) => {
                      const container = extractFieldValue(record.data, FIELD_MAPPING.container)
                      const size = extractFieldValue(record.data, FIELD_MAPPING.size)
                      const associate = extractFieldValue(record.data, FIELD_MAPPING.company)
                      const moveDate = extractFieldValue(record.data, FIELD_MAPPING.moveDate)
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedRecordIds.includes(record.id)}
                              onCheckedChange={(checked) => handleRecordSelectionChange(record.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {record.id.split("-").pop()}
                          </TableCell>
                          <TableCell>
                            {container ? `${container} (${size})` : "N/A"}
                          </TableCell>
                          <TableCell className="text-right">1</TableCell>
                          <TableCell className="text-right">${record.totalValue?.toFixed(2)}</TableCell>
                          <TableCell className="text-right font-medium">${record.totalValue.toFixed(2)}</TableCell>
                          <TableCell>{associate || "N/A"}</TableCell>
                          <TableCell>{moveDate || "N/A"}</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>No hay registros que coincidan con los filtros</AlertTitle>
                <AlertDescription>
                  {pendingTruckingRecords.length === 0 
                    ? "No se encontraron registros individuales pendientes para Trucking."
                    : "Intenta ajustar los filtros o la búsqueda para encontrar registros."
                  }
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button 
              onClick={nextStep} 
              disabled={selectedRecordIds.length === 0 || isLoadingRecords}
            >
              Continuar
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
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
              Completa los detalles. Los campos marcados con <span className="text-green-600">✓</span> se han prellenado desde Excel.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-6">
              {/* Navegación lateral */}
              <div className="w-full md:w-64 space-y-2">
                {FORM_SECTIONS.map((section) => (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <span className="mr-2">{section.icon}</span>
                    {section.title}
                  </Button>
                ))}
              </div>
              
              {/* Contenido del formulario */}
              <div className="flex-1">
                {FORM_SECTIONS.map((section) => (
                  <div 
                    key={section.id} 
                    className={`space-y-4 ${activeSection === section.id ? 'block' : 'hidden'}`}
                  >
                    <h3 className="text-lg font-semibold flex items-center">
                      {section.icon}
                      <span className="ml-2">{section.title}</span>
                    </h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {section.fields.map((field) => {
                        const isAutoField = 'auto' in field && field.auto
                        const value = formData[field.id]
                        
                        return (
                          <div key={field.id}>
                            <Label htmlFor={field.id} className="flex items-center">
                              {isAutoField && (
                                <span className="text-green-600 mr-1">✓</span>
                              )}
                              {field.icon && React.cloneElement(field.icon, { className: "h-4 w-4 mr-1" })}
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>
                            
                            {field.type === 'select' ? (
                              <Select
                                value={value}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Seleccionar ${field.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options?.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.type === 'date' ? (
                              <Input
                                id={field.id}
                                type="date"
                                value={value}
                                onChange={handleInputChange}
                                className={isAutoField ? "bg-green-50 border-green-200" : ""}
                              />
                            ) : (
                              <Input
                                id={field.id}
                                name={field.id}
                                value={value}
                                onChange={handleInputChange}
                                className={isAutoField ? "bg-green-50 border-green-200" : ""}
                                placeholder={isAutoField ? "Extraído automáticamente" : undefined}
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
                
                {/* Sección de items de servicio */}
                {formData.serviceItems.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Package className="mr-2 h-5 w-5" />
                      Servicios ({formData.serviceItems.length})
                    </h3>
                    
                    <div className="space-y-4">
                      {formData.serviceItems.map((item, index) => (
                        <Card key={item.id}>
                          <CardHeader className="pb-2">
                            <CardTitle className="flex items-center">
                              <Truck className="mr-2 h-5 w-5" />
                              Servicio #{index + 1} - {item.containerNumber || 'N/A'}
                            </CardTitle>
                            <CardDescription className="flex flex-wrap gap-2">
                              <Badge variant="secondary">BL: {item.blNumber || 'N/A'}</Badge>
                              <Badge variant="outline">{item.containerSize || 'N/A'}</Badge>
                              <Badge variant="outline">{item.weight || 'N/A'}</Badge>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label>Código Servicio SAP</Label>
                              <Select
                                value={item.serviceCode}
                                onValueChange={(val) => {
                                  const newItems = [...formData.serviceItems]
                                  newItems[index].serviceCode = val
                                  setFormData(prev => ({ ...prev, serviceItems: newItems }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="SRV100">SRV100 - TRANSPORT</SelectItem>
                                  <SelectItem value="SRV101">SRV101 - LOADING</SelectItem>
                                  <SelectItem value="SRV102">SRV102 - UNLOADING</SelectItem>
                                  <SelectItem value="SRV103">SRV103 - STORAGE</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Código Actividad</Label>
                              <Select
                                value={item.activityCode}
                                onValueChange={(val) => {
                                  const newItems = [...formData.serviceItems]
                                  newItems[index].activityCode = val
                                  setFormData(prev => ({ ...prev, serviceItems: newItems }))
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ACT205">ACT205 - CONTAINER 20FT</SelectItem>
                                  <SelectItem value="ACT206">ACT206 - CONTAINER 40FT</SelectItem>
                                  <SelectItem value="ACT207">ACT207 - REEFER</SelectItem>
                                  <SelectItem value="ACT208">ACT208 - FREIGHT</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label>Monto</Label>
                              <Input
                                value={`$${item.amount.toFixed(2)}`}
                                readOnly
                                className="font-bold"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Campos personalizados */}
                {truckingCustomFields.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <h3 className="text-lg font-semibold">Campos Personalizados</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {truckingCustomFields.map((field) => (
                        <div key={field.id}>
                          <Label htmlFor={field.id}>{field.label}</Label>
                          {field.type === "text" && (
                            <Input
                              id={field.id}
                              name={field.id}
                              value={formData[field.id] || ""}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                              placeholder={field.placeholder}
                            />
                          )}
                          {field.type === "number" && (
                            <Input
                              id={field.id}
                              name={field.id}
                              type="number"
                              value={formData[field.id] || ""}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: Number(e.target.value) || 0 }))}
                              placeholder={field.placeholder}
                            />
                          )}
                          {field.type === "date" && (
                            <Input
                              id={field.id}
                              name={field.id}
                              type="date"
                              value={formData[field.id] || ""}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                            />
                          )}
                          {field.type === "select" && field.options && (
                            <Select
                              value={formData[field.id] || ""}
                              onValueChange={(val) => setFormData(prev => ({ ...prev, [field.id]: val }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={field.placeholder || `Seleccionar ${field.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Notas y montos */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold">Notas y Montos</h3>
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
                        className="bg-muted/50"
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
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={prevStep} variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button onClick={nextStep} className="ml-2">
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
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
                  <strong>Conductor:</strong> {formData.driverId || "N/A"}
                </p>
                <p>
                  <strong>Vehículo:</strong> {formData.vehicleId || "N/A"}
                </p>
                <p>
                  <strong>Ruta:</strong> {formData.routeId || "N/A"}
                </p>
              </div>
              
              <div className="md:col-span-2">
                <h3 className="font-semibold mb-1">Servicios de Transporte Terrestre ({selectedRecordDetails.length} registros):</h3>
                <div className="text-sm max-h-32 overflow-y-auto border rounded p-2 bg-muted/10">
                  {selectedRecordDetails.map((r, index) => {
                    const container = extractFieldValue(r.data, FIELD_MAPPING.container)
                    const size = extractFieldValue(r.data, FIELD_MAPPING.size)
                    const client = extractFieldValue(r.data, FIELD_MAPPING.client)
                    
                    return (
                      <div key={r.id} className="mb-1 pb-1 border-b border-muted last:border-b-0">
                        <strong>{index + 1}. {formData.serviceCode}</strong> - {client}<br/>
                        <span className="text-muted-foreground">
                          Contenedor: {container} ({size}) - ${r.totalValue.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                </div>
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
                <h3 className="font-semibold">Archivos Generados:</h3>
                <div className="flex gap-2">
                  <Button onClick={handleDownloadXml} variant="outline" size="sm" disabled={!generatedXml}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar XML
                  </Button>
                  <Button onClick={handleDownloadPdf} variant="outline" size="sm" disabled={!generatedPdf}>
                    <Download className="mr-2 h-4 w-4" />
                    Descargar PDF
                  </Button>
                </div>
              </div>
              <Textarea
                value={generatedXml || "Error al generar XML o XML no disponible."}
                readOnly
                rows={15}
                className="font-mono text-xs bg-muted/30"
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={prevStep} variant="outline">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>
            <Button onClick={nextStep} className="ml-2">
              Siguiente
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
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
    </div>
  )
}