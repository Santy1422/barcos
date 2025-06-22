import { useState, useEffect, useMemo } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import {
  addInvoice,
  markRecordsAsInvoiced,
  selectInvoicesByModule,
  selectPendingRecordsByModule,
  type InvoiceRecord as PersistedInvoiceRecord,
  type ExcelRecord as IndividualExcelRecord,
} from "@/lib/features/records/recordsSlice"
import {
  selectModuleCustomFields,
  selectTruckingDrivers,
  selectTruckingRoutes,
  selectTruckingVehicles,
  type CustomFieldConfig,
} from "@/lib/features/config/configSlice"
import { generateInvoiceXML } from "@/lib/xml-generator"
import saveAs from "file-saver"
import jsPDF from "jspdf"

export type InvoiceStep = "select" | "create" | "review" | "confirm"

export interface TruckingFormData {
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

export function useTruckingInvoice() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { toast } = useToast()

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
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null)

  return {
    // State
    currentStep,
    setCurrentStep,
    selectedRecordIds,
    setSelectedRecordIds,
    formData,
    setFormData,
    searchTerm,
    setSearchTerm,
    generatedXml,
    setGeneratedXml,
    generatedPdf,
    setGeneratedPdf,
    // Data
    pendingTruckingRecords,
    truckingGeneratedInvoices,
    configuredDrivers,
    configuredRoutes,
    configuredVehicles,
    truckingCustomFields,
    // Utils
    dispatch,
    router,
    toast,
    getNewInvoiceState,
  }
}