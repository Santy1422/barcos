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
import { TimeInput } from "@/components/ui/time-input"
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
  Hash,
  Database,
  Clock,
  Plus,
  Trash2
} from "lucide-react"
import {
  addInvoice,
  markRecordsAsInvoiced,
  selectInvoicesByModule,
  selectPendingRecordsByModuleFromDB,
  selectRecordsLoading,
  fetchPendingRecordsByModule,
  type InvoiceRecord as PersistedInvoiceRecord,
  type ExcelRecord as IndividualExcelRecord,
} from "@/lib/features/records/recordsSlice"
import {
  selectModuleCustomFields,
  type CustomFieldConfig,
  selectTruckingDrivers,
  selectTruckingRoutes,
  selectTruckingVehicles,
  selectServiceSapCodesByModule,
  fetchServiceSapCodes,
} from "@/lib/features/config/configSlice"
import { selectServicesByModule, fetchServices, selectServicesLoading } from "@/lib/features/services/servicesSlice"
import { generateInvoiceXML, validateXMLForSAP } from "@/lib/xml-generator"
import type { InvoiceForXmlPayload, InvoiceLineItemForXml } from "@/lib/features/invoice/invoiceSlice"
import { TRUCKING_OPTIONS } from "@/lib/constants/trucking-options"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import saveAs from "file-saver"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ClientModal } from "@/components/clients-management"

type InvoiceStep = "select" | "create" | "review" | "confirm"

interface TruckingFormData {
  invoiceNumber: string
  sapDocumentNumber: string
  issueDate: string
  sapDate: string
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
  moveTime: string
  associatedCompany: string
  description: string
  subtotal: number
  taxAmount: number
  total: number
  currency: string
  serviceCode: string
  activityCode: string
  bundle: string
  commodity: string
  businessType: "IMPORT" | "EXPORT"
  internalOrder: string
  salesOrder: string
  cargoType: string
  sealNumber: string
  weight: string
  weightInTons: number
  containerType: string
  containerSize: string
  containerIsoCode: string
  ctrCategory: string
  containerCategory: string
  fullEmptyStatus: "FULL" | "EMPTY"
  // Campos para XML
  taxCode: string
  taxAmntDocCur: number
  taxAmntCpyCur: number
  profitCenter: string
  // Servicios adicionales
  additionalServices: Array<{
    serviceId: string
    name: string
    description: string
    amount: number
  }>
  serviceItems: Array<{
    id: string
    containerNumber: string
    blNumber: string
    serviceCode: string
    activityCode: string
    routeAmount: number
    serviceAmount: number
    totalAmount: number
    description: string
    containerSize: string
    containerType: string
    containerIsoCode: string
    fullEmptyStatus: "FULL" | "EMPTY"
    businessType: "IMPORT" | "EXPORT"
    internalOrder: string
    salesOrder: string
    bundle: string
    route: string
    commodity: string
    subcontracting: "Y" | "N"
    moveDate: string
    origin: string
    destination: string
    weight: string
    cargoType: string
    sealNumber: string
  }>
  [customFieldId: string]: any
}

const getNewInvoiceState = (): TruckingFormData => ({
  invoiceNumber: `F-TRK-${Date.now().toString().slice(-5)}`,
  sapDocumentNumber: "",
  issueDate: new Date().toISOString().split("T")[0],
  sapDate: new Date().toISOString().split("T")[0],
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
  moveTime: "",
  associatedCompany: "",
  businessType: "EXPORT",
  internalOrder: "",
  salesOrder: "",
  cargoType: "",
  sealNumber: "",
  weight: "",
  weightInTons: 0,
  containerType: "DV",
  containerSize: "40",
  containerIsoCode: "42G0",
  ctrCategory: "D",
  containerCategory: "D",
  fullEmptyStatus: "FULL",
  subcontracting: "N",
  description: "",
  subtotal: 0,
  taxAmount: 0,
  total: 0,
  currency: "USD",
  serviceCode: "SRV100",
  activityCode: "TRK",
  bundle: "0000",
  commodity: "10",
  // Campos para XML
  taxCode: "O7",
  taxAmntDocCur: 0,
  taxAmntCpyCur: 0,
  profitCenter: "1000",
  additionalServices: [],
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
  driver: ['conductor', 'driver', 'chofer', 'driver_name', 'driverName'],
  driverId: ['conductor', 'driver', 'chofer', 'driver_name', 'driverName'],
  vehicle: ['vehiculo', 'placa', 'vehicle', 'truck', 'vehicle_plate', 'plate'],
  vehicleId: ['vehiculo', 'placa', 'vehicle', 'truck', 'vehicle_plate', 'plate'],
  route: ['ruta', 'route', 'origen_destino', 'origin_destination', 'route_description'],
  routeId: ['ruta', 'route', 'origen_destino', 'origin_destination', 'route_description'],
  origin: ['puerto_origen', 'origin_port', 'origen', 'rtFrom', 'rt_from', 'RT FROM'],
  originPort: ['puerto_origen', 'origin_port', 'origen', 'rtFrom', 'rt_from', 'RT FROM'],
  destination: ['puerto_destino', 'destination_port', 'destino', 'rtTo', 'rt_to', 'RT To'],
  destinationPort: ['puerto_destino', 'destination_port', 'destino', 'rtTo', 'rt_to', 'RT To'],
  moveDate: ['moveDate'],
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
      { id: 'invoiceNumber', label: "Número Factura Sistema", icon: <Hash className="h-4 w-4" />, required: true },
      { id: 'sapDocumentNumber', label: "SAP Document Number", icon: <FileText className="h-4 w-4" />, required: true },
      { id: 'issueDate', label: "Fecha Emisión", icon: <Calendar className="h-4 w-4" />, type: 'date', required: true },
      { id: 'sapDate', label: "Fecha SAP", icon: <Calendar className="h-4 w-4" />, type: 'date', required: true },
      { id: 'currency', label: "Moneda", icon: <DollarSign className="h-4 w-4" />, type: 'select', options: ['USD', 'PAB'], required: true },
      { id: 'businessType', label: "Tipo de Negocio", icon: <Box className="h-4 w-4" />, type: 'select', options: ['IMPORT', 'EXPORT'], required: true },
      { id: 'internalOrder', label: "Orden Interna", icon: <FileText className="h-4 w-4" />, required: false },
      { id: 'salesOrder', label: "Orden de Venta", icon: <FileText className="h-4 w-4" />, required: false },
      { id: 'bundle', label: "Bundle", icon: <Package className="h-4 w-4" />, type: 'select', options: TRUCKING_OPTIONS.bundle.map(b => b.value), required: true },
      { id: 'subcontracting', label: "Subcontratación", icon: <Settings className="h-4 w-4" />, type: 'select', options: ['Y', 'N'], required: true }
    ]
  },
  {
    id: 'client',
    title: "Información del Cliente",
    icon: <UserIcon className="mr-2 h-5 w-5" />,
    description: "Datos del cliente extraídos del Excel",
    fields: [
      { id: 'clientName', label: "Nombre Cliente", icon: <UserIcon className="h-4 w-4" />, required: true, auto: true },
      { id: 'clientRuc', label: "RUC/Cédula", icon: <FileSearch className="h-4 w-4" />, required: true },
      { id: 'clientAddress', label: "Dirección", icon: <FileSearch className="h-4 w-4" /> },
      { id: 'clientSapNumber', label: "Número SAP Cliente", icon: <FileSearch className="h-4 w-4" /> }
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
      { id: 'moveTime', label: "Hora Movimiento", icon: <Clock className="h-4 w-4" />, type: 'time', auto: true },
      { id: 'associatedCompany', label: "Empresa Asociada", icon: <Box className="h-4 w-4" />, auto: true }
    ]
  },
  {
    id: 'cargo',
    title: "Detalles de Carga",
    icon: <Package className="mr-2 h-5 w-5" />,
    description: "Información específica de la carga",
    fields: [
      { id: 'containerType', label: "Tipo de Contenedor", icon: <Box className="h-4 w-4" />, type: 'select', options: TRUCKING_OPTIONS.containerType.map(ct => ct.code), required: true },
      { id: 'containerSize', label: "Tamaño de Contenedor", icon: <Box className="h-4 w-4" />, type: 'select', options: TRUCKING_OPTIONS.containerSize.map(cs => cs.value), required: true },
      { id: 'containerIsoCode', label: "Código ISO Contenedor", icon: <FileSearch className="h-4 w-4" />, type: 'select', options: TRUCKING_OPTIONS.containerIsoCode.map(cic => cic.code), required: true },
      { id: 'containerCategory', label: "Categoría Contenedor", icon: <Box className="h-4 w-4" />, type: 'select', options: ['A', 'B', 'D', 'DRY', 'N', 'R', 'REEFE', 'T'], required: true },
      { id: 'fullEmptyStatus', label: "Estado Full/Empty", icon: <Box className="h-4 w-4" />, type: 'select', options: TRUCKING_OPTIONS.fullEmpty.map(fe => fe.value), required: true },
      { id: 'commodity', label: "Commodity", icon: <Package className="h-4 w-4" />, type: 'select', options: TRUCKING_OPTIONS.commodity.map(c => c.value), required: true }
    ]
  },
  {
    id: 'xml',
    title: "Definir",
    icon: <Settings className="mr-2 h-5 w-5" />,
    description: "Configuración específica para el XML de SAP",
    fields: [
      { id: 'taxCode', label: "Tax Code", icon: <FileText className="h-4 w-4" />, required: true },
      { id: 'taxAmntDocCur', label: "Tax Amount Document Currency", icon: <DollarSign className="h-4 w-4" />, type: 'number', required: true },
      { id: 'taxAmntCpyCur', label: "Tax Amount Company Currency", icon: <DollarSign className="h-4 w-4" />, type: 'number', required: true },
      { id: 'profitCenter', label: "Profit Center", icon: <Database className="h-4 w-4" />, required: true }
    ]
  },

]

export default function TruckingInvoice() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { toast } = useToast()

  const pendingTruckingRecords = useAppSelector((state) =>
    selectPendingRecordsByModuleFromDB(state, "trucking")
  )
  const truckingGeneratedInvoices = useAppSelector((state) => selectInvoicesByModule(state, "trucking"))
  const isLoadingRecords = useAppSelector(selectRecordsLoading)
  const configuredDrivers = useAppSelector(selectTruckingDrivers)
  const configuredRoutes = useAppSelector(selectTruckingRoutes)
  const configuredVehicles = useAppSelector(selectTruckingVehicles)
  const truckingCustomFields = useAppSelector((state) => selectModuleCustomFields(state, "trucking"))
  const serviceSapCodes = useAppSelector((state) => selectServiceSapCodesByModule(state, "trucking"))
  const additionalServices = useAppSelector((state) => selectServicesByModule(state, "trucking"))
  const servicesLoading = useAppSelector(selectServicesLoading)

  const [currentStep, setCurrentStep] = useState<InvoiceStep>("select")
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [formData, setFormData] = useState<TruckingFormData>(getNewInvoiceState)
  const [searchTerm, setSearchTerm] = useState("")
  const [generatedXml, setGeneratedXml] = useState<string | null>(null)
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)
  const [activeFilters, setActiveFilters] = useState({
    dateRange: 'all',
    amountRange: 'all',
  })
  const [activeSection, setActiveSection] = useState(FORM_SECTIONS[0].id)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  // Estado para servicios adicionales
  const [currentServiceToAdd, setCurrentServiceToAdd] = useState<any>(null)
  const [currentServiceAmount, setCurrentServiceAmount] = useState<number>(0)

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [recordsPerPage] = useState(10)

  useEffect(() => {
    dispatch(fetchPendingRecordsByModule("trucking"))
    dispatch(fetchServiceSapCodes("trucking"))
    dispatch(fetchServices("trucking"))
  }, [dispatch])

  // Extraer valor de un registro basado en mapeo de campos
  const extractFieldValue = (recordData: any, fieldKeys: string[]) => {
    if (!recordData) {
      return ""
    }
    
    for (const key of fieldKeys) {
      if (recordData[key] !== undefined && recordData[key] !== "") {
        return recordData[key]
      }
    }
    return ""
  }

  // Función helper para obtener el ID correcto del registro
  const getRecordId = (record: any): string => {
    if (!record) {
      return 'unknown'
    }
    
    return record.id || record._id || 'unknown'
  }

  // Mapeo directo de códigos ISO a información de contenedor
  const ISO_CODE_MAPPING: Record<string, { type: string; size: string; category: string }> = {
    "10G0": { type: "DV", size: "10", category: "D" },
    "10T0": { type: "TK", size: "10", category: "T" },
    "12R1": { type: "RE", size: "10", category: "R" },
    "20G0": { type: "DV", size: "20", category: "D" },
    "20G1": { type: "DV", size: "20", category: "D" },
    "20H0": { type: "HR", size: "20", category: "D" },
    "20P1": { type: "FL", size: "20", category: "D" },
    "20T0": { type: "TK", size: "20", category: "T" },
    "20T1": { type: "TK", size: "20", category: "T" },
    "20T2": { type: "TK", size: "20", category: "T" },
    "20T3": { type: "TK", size: "20", category: "T" },
    "20T4": { type: "TK", size: "20", category: "T" },
    "20T5": { type: "TK", size: "20", category: "T" },
    "20T6": { type: "TK", size: "20", category: "T" },
    "20T7": { type: "TK", size: "20", category: "T" },
    "20T8": { type: "TK", size: "20", category: "T" },
    "22B0": { type: "BV", size: "20", category: "B" },
    "22G0": { type: "DV", size: "20", category: "D" },
    "22G1": { type: "DV", size: "20", category: "D" },
    "22H0": { type: "IS", size: "20", category: "D" },
    "22K2": { type: "TK", size: "20", category: "T" },
    "22OS": { type: "OS", size: "20", category: "D" },
    "22P1": { type: "FL", size: "20", category: "D" },
    "22P3": { type: "FL", size: "20", category: "D" },
    "22P7": { type: "FL", size: "20", category: "D" },
    "22P8": { type: "FL", size: "20", category: "D" },
    "22P9": { type: "FL", size: "20", category: "D" },
    "22R1": { type: "RE", size: "20", category: "R" },
    "22R7": { type: "PP", size: "20", category: "R" },
    "22R9": { type: "RE", size: "20", category: "R" },
    "22S1": { type: "XX", size: "20", category: "D" },
    "22T0": { type: "TK", size: "20", category: "T" },
    "22T1": { type: "TK", size: "20", category: "T" },
    "22T2": { type: "TK", size: "20", category: "T" },
    "22T3": { type: "TK", size: "20", category: "T" },
    "22T4": { type: "TK", size: "20", category: "T" },
    "22T5": { type: "TK", size: "20", category: "T" },
    "22T6": { type: "TK", size: "20", category: "T" },
    "22T7": { type: "TK", size: "20", category: "T" },
    "22T8": { type: "TK", size: "20", category: "T" },
    "22U1": { type: "OT", size: "20", category: "D" },
    "22U6": { type: "HT", size: "20", category: "D" },
    "22V0": { type: "VE", size: "20", category: "D" },
    "22V2": { type: "VE", size: "20", category: "D" },
    "22V3": { type: "VE", size: "20", category: "D" },
    "22W0": { type: "PW", size: "20", category: "D" },
    "24T6": { type: "TK", size: "20", category: "T" },
    "24W1": { type: "PW", size: "20", category: "T" },
    "24ZZ": { type: "ZZ", size: "20", category: "D" },
    "25G0": { type: "DV", size: "20", category: "D" },
    "25P0": { type: "PL", size: "20", category: "D" },
    "26G0": { type: "DV", size: "20", category: "D" },
    "26H0": { type: "IS", size: "20", category: "D" },
    "26T9": { type: "TK", size: "20", category: "T" },
    "28G0": { type: "HH", size: "20", category: "D" },
    "28T0": { type: "HH", size: "20", category: "T" },
    "28T8": { type: "TK", size: "20", category: "T" },
    "28U1": { type: "HH", size: "20", category: "D" },
    "28V0": { type: "HH", size: "20", category: "D" },
    "29P0": { type: "PL", size: "20", category: "D" },
    "2EG0": { type: "HC", size: "20", category: "D" },
    "2LXX": { type: "XX", size: "20", category: "T" },
    "30B1": { type: "BV", size: "30", category: "B" },
    "30G0": { type: "DV", size: "30", category: "D" },
    "32R3": { type: "PP", size: "30", category: "R" },
    "32T1": { type: "TK", size: "30", category: "T" },
    "32T6": { type: "TK", size: "30", category: "T" },
    "3LXX": { type: "XX", size: "30", category: "T" },
    "3MB0": { type: "BB", size: "30", category: "B" },
    "40I0": { type: "IS", size: "40", category: "D" },
    "40V0": { type: "VE", size: "40", category: "D" },
    "42G0": { type: "DV", size: "40", category: "D" },
    "42G1": { type: "DV", size: "40", category: "D" },
    "42H0": { type: "RE", size: "40", category: "D" },
    "42OS": { type: "OS", size: "40", category: "D" },
    "42P1": { type: "FL", size: "40", category: "D" },
    "42P3": { type: "FL", size: "40", category: "D" },
    "42P4": { type: "FL", size: "40", category: "D" },
    "42P6": { type: "FL", size: "40", category: "D" },
    "42P8": { type: "FL", size: "40", category: "D" },
    "42P9": { type: "FL", size: "40", category: "D" },
    "42R1": { type: "RE", size: "40", category: "R" },
    "42R3": { type: "PP", size: "40", category: "R" },
    "42R9": { type: "RE", size: "40", category: "R" },
    "42S1": { type: "XX", size: "40", category: "D" },
    "42T2": { type: "TK", size: "40", category: "T" },
    "42T5": { type: "TK", size: "40", category: "T" },
    "42T6": { type: "TK", size: "40", category: "T" },
    "42T8": { type: "TK", size: "40", category: "T" },
    "42U1": { type: "OT", size: "40", category: "D" },
    "42U6": { type: "HT", size: "40", category: "D" },
    "43T5": { type: "TK", size: "40", category: "T" },
    "44ZZ": { type: "ZZ", size: "40", category: "D" },
    "45B3": { type: "BV", size: "40", category: "B" },
    "45G0": { type: "HC", size: "40", category: "D" },
    "45G1": { type: "HC", size: "40", category: "D" },
    "45P0": { type: "PL", size: "40", category: "D" },
    "45P1": { type: "FT", size: "40", category: "D" },
    "45P3": { type: "FT", size: "40", category: "D" },
    "45P8": { type: "FT", size: "40", category: "D" },
    "45R1": { type: "HR", size: "40", category: "R" },
    "45R9": { type: "RE", size: "40", category: "R" },
    "45U1": { type: "OT", size: "40", category: "D" },
    "45U6": { type: "HT", size: "40", category: "D" },
    "46H0": { type: "HR", size: "40", category: "D" },
    "47T9": { type: "TK", size: "40", category: "T" },
    "48G0": { type: "HH", size: "20", category: "D" },
    "48T8": { type: "TK", size: "40", category: "D" },
    "49P0": { type: "PL", size: "40", category: "D" },
    "49P3": { type: "FL", size: "40", category: "D" },
    "4CG0": { type: "DV", size: "40", category: "D" },
    "4EG1": { type: "HC", size: "40", category: "D" },
    "4MNL": { type: "TK", size: "40", category: "T" },
    "72T0": { type: "TK", size: "23", category: "T" },
    "72T8": { type: "TK", size: "23", category: "T" },
    "74T0": { type: "TK", size: "23", category: "T" },
    "74T1": { type: "TK", size: "23", category: "T" },
    "74T6": { type: "TK", size: "23", category: "T" },
    "74T7": { type: "TK", size: "23", category: "T" },
    "74T8": { type: "TK", size: "23", category: "T" },
    "74ZZ": { type: "ZZ", size: "23", category: "D" },
    "75T8": { type: "TK", size: "23", category: "T" },
    "A2T1": { type: "TK", size: "23", category: "T" },
    "A2T3": { type: "TK", size: "23", category: "T" },
    "CMT1": { type: "TK", size: "20", category: "T" },
    "L0G0": { type: "DV", size: "45", category: "D" },
    "L0G1": { type: "HC", size: "45", category: "D" },
    "L2G1": { type: "HC", size: "45", category: "D" },
    "L2W0": { type: "PW", size: "45", category: "D" },
    "L4ZZ": { type: "ZZ", size: "45", category: "D" },
    "L5G1": { type: "HC", size: "45", category: "D" },
    "L5R0": { type: "HR", size: "45", category: "R" },
    "L5R1": { type: "RE", size: "45", category: "R" },
    "LEG1": { type: "HC", size: "45", category: "D" },
    "M0G0": { type: "DV", size: "48", category: "D" },
    "P0G0": { type: "DV", size: "53", category: "D" },
    "P5G0": { type: "HC", size: "53", category: "D" },
    "P5OS": { type: "OS", size: "53", category: "D" },
    "P5R1": { type: "RE", size: "53", category: "R" },
    "ZZNC": { type: "ZZ", size: "0", category: "N" }
  }

  // Función para extraer información del código ISO de contenedor
  const extractContainerInfoFromIsoCode = (isoCode: string) => {
    if (!isoCode) {
      return { type: "DV", size: "40", category: "D" }
    }

    // Buscar en el mapeo directo
    const mapping = ISO_CODE_MAPPING[isoCode]
    if (mapping) {
      return mapping
    }

    // Fallback si no se encuentra en el mapeo
    return { type: "DV", size: "40", category: "D" }
  }

  // Función para convertir fecha y hora a formato de fecha
  const formatDateForInput = (dateTimeString: string): string => {
    if (!dateTimeString) return ""
    
    try {
      // Intentar parsear diferentes formatos de fecha
      let date: Date
      
      // Formato MM/DD/YYYY HH:MM:SS
      if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(dateTimeString)) {
        const [datePart, timePart] = dateTimeString.split(' ')
        const [month, day, year] = datePart.split('/')
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      // Formato DD/MM/YYYY HH:MM:SS
      else if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(dateTimeString)) {
        const [datePart, timePart] = dateTimeString.split(' ')
        const [day, month, year] = datePart.split('/')
        date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      }
      // Otros formatos - intentar parseo directo
      else {
        date = new Date(dateTimeString)
      }
      
      // Verificar que la fecha es válida
      if (date && !isNaN(date.getTime())) {
        return date.toISOString().split('T')[0] // Formato YYYY-MM-DD
      }
      
      return ""
    } catch (error) {
      console.error('Error al formatear fecha:', error)
      return ""
    }
  }

  // Función para extraer la hora del string de fecha y hora
  const extractTimeFromDateTime = (dateTimeString: string): string => {
    if (!dateTimeString) return ""
    
    try {
      // Formato MM/DD/YYYY HH:MM:SS o DD/MM/YYYY HH:MM:SS
      if (/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}$/.test(dateTimeString)) {
        const [datePart, timePart] = dateTimeString.split(' ')
        return timePart // Retorna HH:MM:SS
      }
      
      // Otros formatos - intentar parsear como Date y extraer hora
      const date = new Date(dateTimeString)
      if (date && !isNaN(date.getTime())) {
        return date.toTimeString().split(' ')[0] // Retorna HH:MM:SS
      }
      
      return ""
    } catch (error) {
      console.error('Error al extraer hora:', error)
      return ""
    }
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
        getRecordId(record),
      ].filter(Boolean).join(" ").toLowerCase()
      
      const matchesSearch = searchTerm === "" || searchableText.includes(searchTerm.toLowerCase())
      
      // Filtros de fecha
      let matchesDate = true
      if (activeFilters.dateRange !== 'all') {
        const moveDateValue = extractFieldValue(data, FIELD_MAPPING.moveDate)
        if (moveDateValue) {
          // Intentar parsear la fecha en diferentes formatos
          let recordDate: Date | null = null
          
          // Formato ISO (YYYY-MM-DD)
          if (/^\d{4}-\d{2}-\d{2}$/.test(moveDateValue)) {
            recordDate = new Date(moveDateValue)
          }
          // Formato DD/MM/YYYY
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(moveDateValue)) {
            const [day, month, year] = moveDateValue.split('/')
            recordDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          // Formato MM/DD/YYYY
          else if (/^\d{2}\/\d{2}\/\d{4}$/.test(moveDateValue)) {
            const [month, day, year] = moveDateValue.split('/')
            recordDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          // Otros formatos - intentar parseo directo
          else {
            recordDate = new Date(moveDateValue)
          }
          
          // Verificar que la fecha es válida
          if (recordDate && !isNaN(recordDate.getTime())) {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
            
            switch (activeFilters.dateRange) {
              case 'today':
                const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
                matchesDate = recordDateOnly.getTime() === today.getTime()
                break
              case 'week':
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                matchesDate = recordDate >= weekAgo
                break
              case 'month':
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                matchesDate = recordDate >= monthAgo
                break
            }
          } else {
            // Si no se puede parsear la fecha, no mostrar el registro
            matchesDate = false
          }
        } else {
          // Si no hay fecha de movimiento, usar la fecha de creación del registro como respaldo
          const recordDate = new Date(record.createdAt)
          const now = new Date()
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          
          switch (activeFilters.dateRange) {
            case 'today':
              const recordDateOnly = new Date(recordDate.getFullYear(), recordDate.getMonth(), recordDate.getDate())
              matchesDate = recordDateOnly.getTime() === today.getTime()
              break
            case 'week':
              const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
              matchesDate = recordDate >= weekAgo
              break
            case 'month':
              const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
              matchesDate = recordDate >= monthAgo
              break
          }
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
      
      return matchesSearch && matchesDate && matchesAmount
    })
  }, [pendingTruckingRecords, searchTerm, activeFilters])

  const selectedRecordDetails = useMemo(() => {
    return pendingTruckingRecords.filter((record) => selectedRecordIds.includes(getRecordId(record)))
  }, [selectedRecordIds, pendingTruckingRecords])

  useEffect(() => {
    if (selectedRecordDetails.length > 0) {
      const firstRecordData = selectedRecordDetails[0].data as Record<string, any>
      
      console.log('useEffect ejecutándose - selectedRecordDetails:', selectedRecordDetails.length)
      console.log('Primer registro completo:', selectedRecordDetails[0])
      console.log('Datos del primer registro:', selectedRecordDetails[0]?.data)
      
      setFormData(prev => {
        // Preservar los montos de servicio editados manualmente si ya existen serviceItems
        const existingServiceItems = prev.serviceItems || []
        const existingServiceAmounts = new Map(existingServiceItems.map(item => [item.id, item.serviceAmount]))
        
        console.log('Montos de servicio existentes:', Array.from(existingServiceAmounts.entries()))
        
        const newServiceItems = selectedRecordDetails.map(record => {
          const data = record.data as Record<string, any>
          const recordId = getRecordId(record)
          const tipoServicio = extractFieldValue(data, FIELD_MAPPING.serviceType)
          const tipoContenedor = extractFieldValue(data, FIELD_MAPPING.containerType)
          
          // Monto de ruta (fijo, viene de la configuración)
          const routeAmount = record.totalValue
          
          // Preservar el monto de servicio editado si existe, sino usar 0
          const existingServiceAmount = existingServiceAmounts.get(recordId) ?? 0
          
          console.log(`Servicio ${recordId}:`, { routeAmount, existingServiceAmount })
          
          // Calcular monto total
          const totalAmount = routeAmount + existingServiceAmount
          
          const itemMoveDate = extractFieldValue(data, FIELD_MAPPING.moveDate)
          
          const originPort = extractFieldValue(data, FIELD_MAPPING.originPort)
          const destinationPort = extractFieldValue(data, FIELD_MAPPING.destinationPort)
          
          // Construir el nombre de la ruta combinando origen y destino
          const routeName = originPort && destinationPort ? `${originPort} / ${destinationPort}` : 
                           extractFieldValue(data, FIELD_MAPPING.route) || "STANDARD"
          
          console.log(`Ruta construida para registro ${recordId}:`, {
            originPort,
            destinationPort,
            routeName,
            originalRoute: extractFieldValue(data, FIELD_MAPPING.route)
          })
          
          return {
            id: recordId,
            containerNumber: extractFieldValue(data, FIELD_MAPPING.container),
            blNumber: extractFieldValue(data, FIELD_MAPPING.blNumber),
            serviceCode: tipoServicio === 'transporte' ? 'SRV100' : prev.serviceCode,
            activityCode: tipoContenedor === '20' ? 'ACT205' : tipoContenedor === '40' ? 'ACT240' : prev.activityCode,
            routeAmount: routeAmount,
            serviceAmount: existingServiceAmount,
            totalAmount: totalAmount,
            description: `${tipoServicio} - ${extractFieldValue(data, FIELD_MAPPING.container)}`,
            containerSize: extractFieldValue(data, FIELD_MAPPING.size) || prev.containerSize,
            containerType: prev.containerType,
            containerIsoCode: prev.containerIsoCode,
            fullEmptyStatus: prev.fullEmptyStatus,
            businessType: prev.businessType,
            internalOrder: prev.internalOrder,
            salesOrder: prev.salesOrder,
            bundle: prev.bundle,
            route: routeName,
            commodity: prev.commodity,
            subcontracting: prev.subcontracting,
            moveDate: itemMoveDate,
            origin: originPort,
            destination: destinationPort,
            weight: extractFieldValue(data, FIELD_MAPPING.weight),
            cargoType: extractFieldValue(data, FIELD_MAPPING.cargoType),
            sealNumber: extractFieldValue(data, FIELD_MAPPING.seal)
          }
        })
        
        // Calcular subtotal basado en los montos totales
        const subtotal = newServiceItems.reduce((sum, item) => sum + item.totalAmount, 0)
        
        // Agregar servicios adicionales al subtotal
        const additionalServicesTotal = prev.additionalServices.reduce((sum, service) => sum + service.amount, 0)
        const totalSubtotal = subtotal + additionalServicesTotal
        
        // Extraer datos del cliente del primer registro (solo nombre se autocompleta)
        const associate = extractFieldValue(firstRecordData, FIELD_MAPPING.company)
        const clientName = associate // Solo el nombre se autocompleta desde associate
        const clientRuc = prev.clientRuc || "" // Mantener valor existente o vacío
        const clientAddress = prev.clientAddress || "" // Mantener valor existente o vacío
        const clientSapNumber = prev.clientSapNumber || "" // Mantener valor existente o vacío
        
        // Extraer datos de transporte
        const driverName = extractFieldValue(firstRecordData, FIELD_MAPPING.driverId)
        const vehiclePlate = extractFieldValue(firstRecordData, FIELD_MAPPING.vehicleId)
        const originPort = extractFieldValue(firstRecordData, FIELD_MAPPING.originPort)
        const destinationPort = extractFieldValue(firstRecordData, FIELD_MAPPING.destinationPort)
        const moveDateRaw = extractFieldValue(firstRecordData, FIELD_MAPPING.moveDate)
        const moveDate = formatDateForInput(moveDateRaw)
        const moveTime = extractTimeFromDateTime(moveDateRaw)
        
        console.log('Datos del cliente extraídos:', {
          associate,
          clientName,
          clientRuc,
          clientAddress,
          clientSapNumber,
          firstRecordData: firstRecordData
        })
        
        console.log('Datos de transporte extraídos:', {
          driverName,
          vehiclePlate,
          originPort,
          destinationPort,
          moveDate,
          driverMapping: FIELD_MAPPING.driverId,
          vehicleMapping: FIELD_MAPPING.vehicleId,
          originMapping: FIELD_MAPPING.originPort,
          destinationMapping: FIELD_MAPPING.destinationPort,
          moveDateMapping: FIELD_MAPPING.moveDate
        })
        
        // Debug específico para moveDate
        console.log('moveDate extraído:', moveDateRaw, '-> fecha:', moveDate, '-> hora:', moveTime)
        
        const newFormData: TruckingFormData = {
          ...prev, // Keep existing form data
          clientName,
          clientRuc,
          clientAddress,
          clientSapNumber,
          driverId: extractFieldValue(firstRecordData, FIELD_MAPPING.driverId),
          vehicleId: extractFieldValue(firstRecordData, FIELD_MAPPING.vehicleId),
          routeId: extractFieldValue(firstRecordData, FIELD_MAPPING.routeId),
          originPort: extractFieldValue(firstRecordData, FIELD_MAPPING.originPort),
          destinationPort: extractFieldValue(firstRecordData, FIELD_MAPPING.destinationPort),
          moveDate: moveDate,
          moveTime: moveTime,
          associatedCompany: extractFieldValue(firstRecordData, FIELD_MAPPING.company),
          cargoType: extractFieldValue(firstRecordData, FIELD_MAPPING.cargoType),
          sealNumber: extractFieldValue(firstRecordData, FIELD_MAPPING.seal),
          weight: extractFieldValue(firstRecordData, FIELD_MAPPING.weight),
          weightInTons: parseFloat(extractFieldValue(firstRecordData, FIELD_MAPPING.weight)?.replace(/[^\d.]/g, '') || '0') / 1000,
          subtotal: totalSubtotal,
          taxAmount: totalSubtotal * 0.07,
          total: totalSubtotal + (totalSubtotal * 0.07),
          serviceItems: newServiceItems
        }

        // Generar descripción automática
        const serviceLines = newFormData.serviceItems.map((item, index) => {
          const record = selectedRecordDetails.find(r => getRecordId(r) === item.id)
          const sapCode = record?.sapCode || item.serviceCode
          return `${index + 1}. ${sapCode} - ${item.containerNumber} - Ruta: $${item.routeAmount.toFixed(2)} + Servicio: $${item.serviceAmount} = $${item.totalAmount.toFixed(2)}`
        }).join('\n')
        
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

  const handleContainerIsoCodeChange = (isoCode: string) => {
    const containerInfo = extractContainerInfoFromIsoCode(isoCode)
    
    setFormData(prev => ({
      ...prev,
      containerIsoCode: isoCode,
      containerType: containerInfo.type,
      containerSize: containerInfo.size,
      ctrCategory: containerInfo.category,
      containerCategory: containerInfo.category
    }))
  }

  const handleFilterChange = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => ({ ...prev, [filterType]: value }))
  }

  const clearAllFilters = () => {
    setActiveFilters({
      dateRange: 'all',
      amountRange: 'all',
    })
  }

  // Funciones para manejar servicios adicionales
  const handleAddServiceWithAmount = () => {
    if (!currentServiceToAdd || currentServiceAmount <= 0) {
      toast({
        title: "Error",
        description: "Selecciona un servicio y especifica un importe válido",
        variant: "destructive"
      })
      return
    }

    const isAlreadySelected = formData.additionalServices.some(s => s.serviceId === currentServiceToAdd._id)
    if (isAlreadySelected) {
      toast({
        title: "Error",
        description: "Este servicio ya ha sido agregado",
        variant: "destructive"
      })
      return
    }

    const newAdditionalServices = [...formData.additionalServices, {
      serviceId: currentServiceToAdd._id,
      name: currentServiceToAdd.name,
      description: currentServiceToAdd.description,
      amount: currentServiceAmount
    }]

    const additionalServicesTotal = newAdditionalServices.reduce((sum, service) => sum + service.amount, 0)
    const newSubtotal = formData.subtotal + currentServiceAmount
    const newTaxAmount = newSubtotal * 0.07
    const newTotal = newSubtotal + newTaxAmount

    setFormData(prev => ({
      ...prev,
      additionalServices: newAdditionalServices,
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      total: newTotal
    }))

    // Limpiar el formulario
    setCurrentServiceToAdd(null)
    setCurrentServiceAmount(0)

    toast({
      title: "Servicio agregado",
      description: `${currentServiceToAdd.name} agregado con importe $${currentServiceAmount.toFixed(2)}`,
    })
  }

  const handleRemoveAdditionalService = (serviceId: string) => {
    const serviceToRemove = formData.additionalServices.find(s => s.serviceId === serviceId)
    if (!serviceToRemove) return

    const newAdditionalServices = formData.additionalServices.filter(s => s.serviceId !== serviceId)
    const additionalServicesTotal = newAdditionalServices.reduce((sum, service) => sum + service.amount, 0)
    const newSubtotal = formData.subtotal - serviceToRemove.amount
    const newTaxAmount = newSubtotal * 0.07
    const newTotal = newSubtotal + newTaxAmount

    setFormData(prev => ({
      ...prev,
      additionalServices: newAdditionalServices,
      subtotal: newSubtotal,
      taxAmount: newTaxAmount,
      total: newTotal
    }))

    toast({
      title: "Servicio removido",
      description: `${serviceToRemove.name} ha sido removido`,
    })
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
        sapDocumentNumber: formData.sapDocumentNumber,
        client: formData.clientSapNumber,
        clientName: formData.clientName,
        date: formData.issueDate,
        sapDate: formData.sapDate,
        currency: formData.currency,
        total: formData.total,
        records: formData.serviceItems.map(item => {
          console.log(`XML - Ruta para item ${item.id}:`, item.route)
          return {
            id: item.id,
            description: `Servicio de transporte - Container: ${item.containerNumber || "N/A"}`,
            quantity: 1,
            unitPrice: item.totalAmount,
            totalPrice: item.totalAmount,
            routeAmount: item.routeAmount, // Agregar el precio de la ruta
            // Campos para XML
            taxCode: formData.taxCode,
            taxAmntDocCur: formData.taxAmntDocCur,
            taxAmntCpyCur: formData.taxAmntCpyCur,
            profitCenter: formData.profitCenter,
            serviceCode: item.serviceCode,
            activityCode: item.activityCode || "TRK",
            unit: "VIAJE",
            blNumber: item.blNumber,
            containerNumber: item.containerNumber,
            containerSize: formData.containerSize,
            containerType: formData.containerType,
            containerIsoCode: formData.containerIsoCode,
            ctrCategory: formData.ctrCategory,
            fullEmptyStatus: formData.fullEmptyStatus,
            businessType: item.businessType || formData.businessType,
            internalOrder: formData.internalOrder || "",
            salesOrder: formData.salesOrder || "",
            bundle: formData.bundle || "0000",
            route: item.route || "STANDARD",
            commodity: formData.commodity || "10",
            subcontracting: item.subcontracting || "N",
            driverName: formData.driverId,
            plate: formData.vehicleId,
            moveDate: item.moveDate,
            associate: formData.associatedCompany
          }
        }),
        status: "generated",
        driverId: formData.driverId,
        vehicleId: formData.vehicleId,
        routeId: formData.routeId
      }
      
      const xml = generateInvoiceXML(xmlPayload)
      
      // Validar el XML generado
      const validation = validateXMLForSAP(xml)
      if (!validation.isValid) {
        console.error("Errores en el XML:", validation.errors)
        toast({
          title: "Advertencia - XML",
          description: `El XML generado tiene ${validation.errors.length} errores. Revisa la consola para más detalles.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "XML Válido",
          description: "El XML cumple con todos los requisitos para SAP.",
        })
      }
      
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
        dueDate: formData.sapDate, // Using sapDate as dueDate for backward compatibility
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
      dispatch(fetchPendingRecordsByModule("trucking"))

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

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      })
    }
  }

  // Calcular paginación basada en registros filtrados
  const totalFilteredRecords = filteredPendingRecords.length
  const totalPages = Math.ceil(totalFilteredRecords / recordsPerPage)
  const startIndex = (currentPage - 1) * recordsPerPage
  const endIndex = startIndex + recordsPerPage
  const paginatedRecords = filteredPendingRecords.slice(startIndex, endIndex)

  // Funciones de paginación
  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, totalPages))
    setCurrentPage(newPage)
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeFilters])



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
            <CardDescription>
              Elige los servicios de Excel para incluir en la factura. 
              {pendingTruckingRecords.length > 0 && (
                <span className="ml-2 font-medium text-blue-600">
                  Total de registros disponibles: {pendingTruckingRecords.length}
                </span>
              )}
            </CardDescription>
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
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium">Por Fecha:</Label>
                  <div className="flex gap-2">
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

                <div className="flex items-center gap-2">
                  <Label className="text-xs font-medium">Por Monto:</Label>
                  <div className="flex gap-2">
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
              </div>

              {(activeFilters.dateRange !== 'all' || activeFilters.amountRange !== 'all' || searchTerm) && (
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
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Mostrando {filteredPendingRecords.length} de {pendingTruckingRecords.length} registros
                  </p>
                </div>
              )}
              
              {/* Información del total de registros */}
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">
                      Total de registros en la base de datos: {pendingTruckingRecords.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-blue-600">
                    {totalFilteredRecords !== pendingTruckingRecords.length && (
                      <span>Filtrados: {totalFilteredRecords}</span>
                    )}
                    {totalPages > 1 && (
                      <span>Página {currentPage} de {totalPages}</span>
                    )}
                  </div>
                </div>
                

              </div>
            </div>

            {isLoadingRecords ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Cargando registros...</span>
              </div>
            ) : filteredPendingRecords.length > 0 ? (
              <div className="border rounded-md">
                {/* Header fijo */}
                <div className="bg-gray-400 border-b shadow-sm">
                  <div
                    className="grid grid-cols-9 gap-2 p-2 font-medium text-sm text-black items-center"
                    style={{ gridTemplateColumns: '40px 1.5fr 1fr 1fr 2fr 1fr 1fr 1.2fr 1fr' }}
                  >
                    <div className="w-12">
                      <Checkbox
                        checked={selectedRecordIds.length === paginatedRecords.length}
                        onCheckedChange={(checked) => {
                          setSelectedRecordIds(checked ? paginatedRecords.map(r => getRecordId(r)) : [])
                        }}
                      />
                    </div>
                    <div className="text-left">Contenedor</div>
                    <div className="text-left">SAP</div>
                    <div className="text-right">Precio Unit.</div>
                    <div className="text-right">Total</div>
                    <div className="text-left">Asociado</div>
                    <div className="text-left">Fecha Movimiento</div>
                    <div className="text-left">Fecha Creación</div>
                    <div className="text-left">Hora Creación</div>
                  </div>
                </div>
                
                {/* Body con scroll */}
                <div className="max-h-[400px] overflow-y-auto">
                  {paginatedRecords.filter(record => record && record.data).map((record) => {
                    const container = extractFieldValue(record.data, FIELD_MAPPING.container)
                    const size = extractFieldValue(record.data, FIELD_MAPPING.size)
                    const associate = extractFieldValue(record.data, FIELD_MAPPING.company)
                    const moveDate = extractFieldValue(record.data, FIELD_MAPPING.moveDate)
                    const sapCode = record.sapCode || record.data?.sapCode || ''
                    const { date, time } = formatDateTime(record.createdAt)
                    

                    return (
                      <div
                        key={getRecordId(record)}
                        className="grid grid-cols-9 gap-2 p-2 border-b bg-gray-100 hover:bg-gray-200 text-sm items-center"
                        style={{ gridTemplateColumns: '40px 1.5fr 1fr 1fr 2fr 1fr 1fr 1.2fr 1fr' }}
                      >
                        <div className="w-12">
                          <Checkbox
                            checked={selectedRecordIds.includes(getRecordId(record))}
                            onCheckedChange={(checked) => handleRecordSelectionChange(getRecordId(record), checked as boolean)}
                          />
                        </div>
                        <div className="text-left">
                          {container ? `${container} (${size})` : "N/A"}
                        </div>
                        <div className="text-left">{sapCode}</div>
                        <div className="text-right">${record.totalValue?.toFixed(2)}</div>
                        <div className="text-right font-medium">${record.totalValue.toFixed(2)}</div>
                        <div className="text-left">{associate || "N/A"}</div>
                        <div className="text-left text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {moveDate || "N/A"}
                          </div>
                        </div>
                        <div className="text-left text-xs">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {date}
                          </div>
                        </div>
                        <div className="text-left text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {time}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
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
            
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, totalFilteredRecords)} de {totalFilteredRecords} registros
                  {totalFilteredRecords !== pendingTruckingRecords.length && (
                    <span className="ml-2">(filtrados de {pendingTruckingRecords.length} total)</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPrevPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => goToPage(pageNum)}
                          className="w-8 h-8 p-0"
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center">
                          {section.icon}
                          <span className="ml-2">{section.title}</span>
                        </h3>
                        <p className="text-sm text-muted-foreground">{section.description}</p>
                      </div>
                      {section.id === 'client' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsClientModalOpen(true)}
                          className="flex items-center gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Agregar Cliente
                        </Button>
                      )}
                    </div>
                    
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
                                onValueChange={(val) => {
                                  if (field.id === 'containerIsoCode') {
                                    handleContainerIsoCodeChange(val)
                                  } else {
                                    setFormData(prev => ({ ...prev, [field.id]: val }))
                                  }
                                }}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Seleccionar ${field.label}`} />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {field.id === 'serviceCode' ? (
                                    serviceSapCodes.map((sapCode) => (
                                      <SelectItem key={sapCode._id} value={sapCode.code}>
                                        {sapCode.code} - {sapCode.description}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'businessType' ? (
                                    TRUCKING_OPTIONS.businessType.map(bt => (
                                      <SelectItem key={bt.value} value={bt.value}>
                                        {bt.label}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'subcontracting' ? (
                                    TRUCKING_OPTIONS.subcontracting.map(sub => (
                                      <SelectItem key={sub.value} value={sub.value}>
                                        {sub.label}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'containerType' ? (
                                    TRUCKING_OPTIONS.containerType.map(ct => (
                                      <SelectItem key={ct.code} value={ct.code}>
                                        {ct.code} - {ct.description}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'containerSize' ? (
                                    TRUCKING_OPTIONS.containerSize.map(cs => (
                                      <SelectItem key={cs.value} value={cs.value}>
                                        {cs.label}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'containerIsoCode' ? (
                                    TRUCKING_OPTIONS.containerIsoCode.map(cic => (
                                      <SelectItem key={cic.code} value={cic.code}>
                                        {cic.code} - {cic.description}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'fullEmptyStatus' ? (
                                    TRUCKING_OPTIONS.fullEmpty.map(fe => (
                                      <SelectItem key={fe.value} value={fe.value}>
                                        {fe.label}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'bundle' ? (
                                    TRUCKING_OPTIONS.bundle.map(b => (
                                      <SelectItem key={b.value} value={b.value}>
                                        {b.label}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'containerCategory' ? (
                                    [
                                      { value: 'A', label: 'A - All' },
                                      { value: 'B', label: 'B - BulkC' },
                                      { value: 'D', label: 'D - Dry' },
                                      { value: 'DRY', label: 'DRY - Dry' },
                                      { value: 'N', label: 'N - Non Containerized' },
                                      { value: 'R', label: 'R - Reefer' },
                                      { value: 'REEFE', label: 'REEFE - Reefer' },
                                      { value: 'T', label: 'T - TankD' }
                                    ].map(cat => (
                                      <SelectItem key={cat.value} value={cat.value}>
                                        {cat.label}
                                      </SelectItem>
                                    ))
                                  ) : field.id === 'commodity' ? (
                                    TRUCKING_OPTIONS.commodity.map(c => (
                                      <SelectItem key={c.value} value={c.value}>
                                        {c.label}
                                      </SelectItem>
                                    ))
                                  ) : field.options?.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.type === 'date' ? (
                              <Input
                                id={field.id}
                                name={field.id}
                                type="date"
                                value={value}
                                onChange={handleInputChange}
                                className={isAutoField ? "bg-green-50 border-green-200" : ""}
                              />
                            ) : field.type === 'time' ? (
                              <div>
                                <TimeInput
                                  id={field.id}
                                  value={value || ''}
                                  onChange={(timeValue) => {
                                    setFormData(prev => ({ ...prev, [field.id]: timeValue }))
                                  }}
                                  className={isAutoField ? "bg-green-50 border-green-200" : ""}
                                  placeholder="HH:MM (24 horas)"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Formato 24 horas (ej: 14:30 para 2:30 PM)
                                </p>
                              </div>
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
                
                {/* Sección de items de servicio - OCULTA - Reemplazada por servicios adicionales */}
                {/* {formData.serviceItems.length > 0 && (
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
                                  <SelectValue placeholder="Seleccionar código SAP" />
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {serviceSapCodes.map((sapCode) => (
                                    <SelectItem key={sapCode._id} value={sapCode.code}>
                                      {sapCode.code} - {sapCode.description}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <Label className="flex items-center gap-2">
                                Monto de Ruta
                                <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded">Fijo</span>
                              </Label>
                              <Input
                                type="number"
                                value={item.routeAmount.toFixed(2)}
                                readOnly
                                disabled
                                className="bg-gray-50 border-gray-200"
                              />
                            </div>
                            
                            <div>
                              <Label className="flex items-center gap-2">
                                Monto de Servicio SAP
                                <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Editable</span>
                              </Label>
                              <Input
                                type="number"
                                value={item.serviceAmount}
                                onChange={(e) => {
                                  const newServiceAmount = Number(e.target.value) || 0
                                  
                                  setFormData(prev => {
                                    const newItems = [...prev.serviceItems]
                                    newItems[index].serviceAmount = newServiceAmount
                                    newItems[index].totalAmount = newItems[index].routeAmount + newServiceAmount
                                    
                                    // Recalcular subtotal, tax y total
                                    const newSubtotal = newItems.reduce((sum, item) => sum + item.totalAmount, 0)
                                    // Agregar servicios adicionales al subtotal
                                    const additionalServicesTotal = prev.additionalServices.reduce((sum, service) => sum + service.amount, 0)
                                    const totalSubtotal = newSubtotal + additionalServicesTotal
                                    const newTaxAmount = totalSubtotal * 0.07
                                    const newTotal = totalSubtotal + newTaxAmount
                                    
                                    // Actualizar descripción automáticamente
                                    const serviceLines = newItems.map((item, idx) => {
                                      const record = selectedRecordDetails.find(r => getRecordId(r) === item.id)
                                      const sapCode = record?.sapCode || item.serviceCode
                                      return `${idx + 1}. ${sapCode} - ${item.containerNumber} - Ruta: $${item.routeAmount.toFixed(2)} + Servicio: $${item.serviceAmount} = $${item.totalAmount.toFixed(2)}`
                                    }).join('\n')
                                    
                                    const newDescription = `Servicios de transporte terrestre (${newItems.length} registros)\n${serviceLines}`
                                    
                                    return {
                                      ...prev,
                                      serviceItems: newItems,
                                      subtotal: newSubtotal,
                                      taxAmount: newTaxAmount,
                                      total: newTotal,
                                      description: newDescription
                                    }
                                  })
                                }}
                                step="1"
                                className="font-bold bg-white border-blue-200 focus:border-blue-500"
                                placeholder="0"
                              />
                            </div>
                            
                            <div>
                              <Label className="flex items-center gap-2">
                                Total del Servicio
                                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">Calculado</span>
                              </Label>
                              <Input
                                type="number"
                                value={item.totalAmount.toFixed(2)}
                                readOnly
                                disabled
                                className="bg-green-50 border-green-200 font-bold"
                              />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )} */}
                
                {/* Campos personalizados */}
                {truckingCustomFields.length > 0 && (
                  <div className="mt-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {truckingCustomFields
                        .filter(field => 
                          !field.label.toLowerCase().includes('tipo de carga') &&
                          !field.label.toLowerCase().includes('número de sellos') &&
                          !field.label.toLowerCase().includes('numero de sellos') &&
                          !field.label.toLowerCase().includes('número de sellos') &&
                          !field.label.toLowerCase().includes('numero de sellos') &&
                          !field.label.toLowerCase().includes('sellos') &&
                          !field.label.toLowerCase().includes('sello') &&
                          !field.label.toLowerCase().includes('peso')
                        )
                        .map((field) => (
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
                              <SelectContent position="popper">
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
                
                {/* Servicios Adicionales */}
                <div className="mt-8 space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Package className="mr-2 h-5 w-5" />
                    Servicios Adicionales
                  </h3>
                  
                  {/* Selección de servicios */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Servicio</Label>
                        {servicesLoading ? (
                          <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/60 p-3 rounded-lg">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Cargando servicios...
                          </div>
                        ) : (
                          <Select onValueChange={(value) => {
                            const service = additionalServices.find(s => s._id === value)
                            if (service) {
                              setCurrentServiceToAdd(service)
                            }
                          }}>
                            <SelectTrigger className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500">
                              <SelectValue placeholder="Seleccionar servicio..." />
                            </SelectTrigger>
                            <SelectContent>
                              {additionalServices.length === 0 ? (
                                <div className="p-2 text-sm text-muted-foreground">
                                  No hay servicios disponibles
                                </div>
                              ) : (
                                additionalServices
                                  .filter(service => !formData.additionalServices.some(s => s.serviceId === service._id))
                                  .map((service) => (
                                    <SelectItem key={service._id} value={service._id}>
                                      {service.name} - {service.description}
                                    </SelectItem>
                                  ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">Importe</Label>
                        <Input
                          type="number"
                          value={currentServiceAmount}
                          onChange={(e) => setCurrentServiceAmount(parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className="w-full bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-slate-700">&nbsp;</Label>
                        <Button 
                          onClick={handleAddServiceWithAmount}
                          disabled={!currentServiceToAdd || currentServiceAmount <= 0}
                          className="w-full bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800 text-white font-semibold shadow-md"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Servicio
                        </Button>
                      </div>
                    </div>
                    
                    {!servicesLoading && additionalServices.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No hay servicios adicionales configurados para Trucking. Ve a Configuración → Servicios Adicionales para agregar servicios.
                      </div>
                    )}
                  </div>

                  {/* Lista de servicios seleccionados */}
                  {formData.additionalServices.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-slate-700">Servicios Seleccionados</Label>
                      {formData.additionalServices.map((service) => (
                        <div key={service.serviceId} className="flex items-center gap-3 p-4 bg-white/70 border border-slate-200 rounded-lg shadow-sm">
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-slate-900">{service.name}</div>
                            <div className="text-xs text-slate-600">{service.description}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-full">${service.amount.toFixed(2)}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAdditionalService(service.serviceId)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
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
                        readOnly
                        disabled
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
                  
                  {formData.additionalServices.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h4 className="font-semibold text-blue-900 mb-2">Desglose de Servicios Adicionales</h4>
                      <div className="space-y-2">
                        {formData.additionalServices.map((service) => (
                          <div key={service.serviceId} className="flex justify-between items-center text-sm">
                            <span className="text-blue-800">{service.name}</span>
                            <span className="font-semibold text-blue-900">${service.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="border-t border-blue-300 pt-2 mt-2">
                          <div className="flex justify-between items-center font-semibold text-blue-900">
                            <span>Total Servicios Adicionales:</span>
                            <span>${formData.additionalServices.reduce((sum, service) => sum + service.amount, 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <strong>SAP Document Number:</strong> {formData.sapDocumentNumber || "No especificado"}
                </p>
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
                  <strong>Fecha SAP:</strong> {new Date(formData.sapDate).toLocaleDateString()}
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
                    
                    // Buscar el item de servicio correspondiente
                    const serviceItem = formData.serviceItems.find(item => item.id === getRecordId(r))
                    const routeAmount = serviceItem?.routeAmount || 0
                    
                    return (
                      <div key={r.id} className="mb-1 pb-1 border-b border-muted last:border-b-0">
                        <strong>{index + 1}. ${routeAmount.toFixed(2)}</strong> - {client}<br/>
                        <span className="text-muted-foreground">
                          Contenedor: {container} ({size}) - ${r.totalValue.toFixed(2)}
                        </span>
                      </div>
                    )
                  })}
                  
                  {/* Mostrar servicios adicionales */}
                  {formData.additionalServices.length > 0 && (
                    <>
                      <div className="mt-2 pt-2 border-t border-muted">
                        <strong className="text-blue-600">Servicios Adicionales:</strong>
                      </div>
                      {formData.additionalServices.map((service, index) => (
                        <div key={service.serviceId} className="mb-1 pb-1 border-b border-muted last:border-b-0">
                          <strong className="text-blue-600">{selectedRecordDetails.length + index + 1}. {service.name}</strong><br/>
                          <span className="text-muted-foreground">
                            {service.description} - ${service.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-right space-y-1 mt-4">
              <p className="text-xl font-bold">
                <strong>Total:</strong> {formData.currency} {formData.subtotal.toFixed(2)}
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
                  {formData.currency} {formData.subtotal.toFixed(2)}
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

      {/* Modal de Clientes */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setIsClientModalOpen(false)}
        onClientCreated={(client) => {
          // Cuando se crea un cliente, actualizar los campos del formulario
          if (client.type === "natural") {
            setFormData(prev => ({
              ...prev,
              clientName: client.fullName,
              clientRuc: client.documentNumber,
              clientAddress: client.address.fullAddress || `${client.address.district}, ${client.address.province}`,
              clientSapNumber: client.sapCode || ""
            }))
          } else {
            setFormData(prev => ({
              ...prev,
              clientName: client.companyName,
              clientRuc: `${client.ruc}-${client.dv}`,
              clientAddress: client.fiscalAddress.fullAddress || `${client.fiscalAddress.district}, ${client.fiscalAddress.province}`,
              clientSapNumber: client.sapCode || ""
            }))
          }
          setIsClientModalOpen(false)
        }}
      />
    </div>
  )
}