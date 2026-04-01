import type { InvoiceForXmlPayload, InvoiceLineItemForXml } from "@/lib/features/invoice/invoiceSlice"
import { js2xml } from "xml-js"
import { TRUCKING_DEFAULTS } from "./constants/trucking-options"
import { getSapCodeForService, getLegacyCodeFromServiceId, FIXED_LOCAL_ALL_CODES } from "./constants/fixedLocalServices"

// Tipo para el mapa de container types (code -> sapCode)
export interface ContainerTypeMapping {
  code: string
  sapCode: string
  category: string
}

// Variable global para almacenar el mapa de container types
let containerTypesMap: ContainerTypeMapping[] = []

// Variable para trackear los containerTypes no encontrados durante la generación de XML
let missingContainerTypes: Set<string> = new Set()

// Función para establecer el mapa de container types (llamar al inicio de la app o cuando se carguen)
export const setContainerTypesMap = (containerTypes: ContainerTypeMapping[]) => {
  containerTypesMap = containerTypes
  console.log('🗺️ Container Types Map actualizado:', containerTypesMap.length, 'tipos')
}

// Función para limpiar los tipos faltantes antes de generar un nuevo XML
export const clearMissingContainerTypes = () => {
  missingContainerTypes = new Set()
}

// Función para obtener los tipos de contenedor que no se encontraron
export const getMissingContainerTypes = (): string[] => {
  return Array.from(missingContainerTypes)
}

// Función para verificar si hay tipos de contenedor faltantes
export const hasMissingContainerTypes = (): boolean => {
  return missingContainerTypes.size > 0
}

// Función para obtener el sapCode de un containerType code
export const getContainerTypeSapCode = (code: string): string => {
  if (!code) return 'DV' // Valor por defecto

  const normalizedCode = code.toUpperCase().trim()

  // Ignorar valores por defecto o vacíos
  if (normalizedCode === 'DV' || normalizedCode === '') {
    return normalizedCode || 'DV'
  }

  const containerType = containerTypesMap.find(ct =>
    ct.code.toUpperCase().trim() === normalizedCode
  )

  if (containerType && containerType.sapCode) {
    console.log(`✅ Container Type homologado: ${code} -> ${containerType.sapCode}`)
    return containerType.sapCode
  }

  // Registrar el tipo faltante
  missingContainerTypes.add(code)
  console.warn(`⚠️ Container Type no encontrado en el mapa: ${code}, usando valor original`)
  return code // Retornar el código original si no se encuentra en el mapa
}

// Tipos para PTYSS XML
export interface PTYSSInvoiceForXml {
  id: string
  invoiceNumber: string
  client: string
  clientName: string
  date: string
  sapDate?: string
  currency: string
  total: number
  records: PTYSSRecordForXml[]
  sapDocumentNumber?: string
  /** Si true, la factura es solo de registros locales: se genera un único OtherItem (servicio principal TRK001) sin líneas por servicio adicional. */
  localRecordsOnly?: boolean
  additionalServices?: Array<{
    serviceId: string
    name: string
    description: string
    amount: number
    isLocalService?: boolean
  }>
}

export interface PTYSSRecordForXml {
  id: string
  data: {
    container: string
    naviera: string
    from: string
    to: string
    operationType: string
    containerSize: string
    containerType: string
    moveDate: string
    order: string
    [key: string]: any
  }
  totalValue: number
}

function formatDateForXML(dateString: string): string {
  // Aplicar la misma lógica de corrección de zona horaria que en trucking-records.tsx
  let date: Date

  // Limpiar espacios si es string
  const cleanDate = dateString ? dateString.trim() : ''

  // Helper function para convertir Excel serial date a Date
  const convertExcelSerialToDate = (serial: number): Date | null => {
    // Excel serial date: 1 = 1900-01-01
    // Ajuste: Excel cuenta el 29/02/1900 como válido, pero JavaScript no
    const excelEpoch = new Date(1900, 0, 1) // 1 de enero de 1900
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const adjustedSerialNumber = serial > 59 ? serial - 1 : serial
    const result = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)

    if (isNaN(result.getTime())) {
      return null
    }

    const year = result.getFullYear()
    // Validar que el año sea razonable
    if (year < 1900 || year > 2100) {
      return null
    }

    return result
  }

  if (!cleanDate) {
    date = new Date()
  } else if (cleanDate.match(/^\d+$/)) {
    // Si es un string que contiene solo números, puede ser un serial de Excel
    const serial = parseInt(cleanDate, 10)
    // Verificar que el serial esté en un rango razonable para fechas de Excel
    // Valores típicos de Excel para años 2020-2030 están entre ~43000 y ~48000
    if (serial > 0 && serial < 100000) {
      const excelDate = convertExcelSerialToDate(serial)
      if (excelDate) {
        date = excelDate
        console.log('formatDateForXML: Fecha convertida desde serial de Excel:', serial, '->', date.toISOString().split('T')[0])
      } else {
        console.warn('formatDateForXML: Serial de Excel inválido:', serial, '- usando fecha actual')
        date = new Date()
      }
    } else {
      console.warn('formatDateForXML: Serial de Excel fuera de rango:', serial, '- usando fecha actual')
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
    const [year, month, day] = cleanDate.split('-').map(Number)
    // Validar año razonable
    if (year >= 1900 && year <= 2100) {
      date = new Date(year, month - 1, day)
    } else {
      console.warn('formatDateForXML: Año fuera de rango:', year, '- usando fecha actual')
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}T/)) {
    // Si la fecha está en formato ISO con zona horaria UTC, extraer solo la parte de la fecha
    const datePart = cleanDate.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    if (year >= 1900 && year <= 2100) {
      date = new Date(year, month - 1, day)
    } else {
      console.warn('formatDateForXML: Año fuera de rango:', year, '- usando fecha actual')
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
    // Si la fecha está en formato DD-MM-YYYY
    const parts = cleanDate.split('-')
    const [part1, part2, yearStr] = parts
    const year = Number(yearStr)
    if (year >= 1900 && year <= 2100) {
      // Si part1 > 12, es DD-MM-YYYY
      if (Number(part1) > 12) {
        date = new Date(year, Number(part2) - 1, Number(part1))
      } else {
        // Asumir DD-MM-YYYY
        date = new Date(year, Number(part2) - 1, Number(part1))
      }
    } else {
      console.warn('formatDateForXML: Año fuera de rango:', year, '- usando fecha actual')
      date = new Date()
    }
  } else {
    // NO usar new Date(dateString) genérico - puede producir años inválidos
    console.warn('formatDateForXML: Formato de fecha no reconocido:', cleanDate, '- usando fecha actual')
    date = new Date()
  }

  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const day = date.getDate().toString().padStart(2, "0")
  return `${year}${month}${day}`
}

function formatTimeForXML(dateString: string): string {
  const date = new Date(dateString)
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${hours}${minutes}${seconds}`
}

function calculateDueDate(dateString: string): string {
  // Aplicar la misma lógica de corrección de zona horaria que en formatDateForXML
  let date: Date

  // Limpiar espacios si es string
  const cleanDate = dateString ? dateString.trim() : ''

  // Helper function para convertir Excel serial date a Date
  const convertExcelSerialToDate = (serial: number): Date | null => {
    const excelEpoch = new Date(1900, 0, 1)
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const adjustedSerialNumber = serial > 59 ? serial - 1 : serial
    const result = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)

    if (isNaN(result.getTime())) return null
    const year = result.getFullYear()
    if (year < 1900 || year > 2100) return null
    return result
  }

  if (!cleanDate) {
    date = new Date()
  } else if (cleanDate.match(/^\d+$/)) {
    // Si es un string que contiene solo números, puede ser un serial de Excel
    const serial = parseInt(cleanDate, 10)
    if (serial > 0 && serial < 100000) {
      const excelDate = convertExcelSerialToDate(serial)
      date = excelDate || new Date()
    } else {
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = cleanDate.split('-').map(Number)
    if (year >= 1900 && year <= 2100) {
      date = new Date(year, month - 1, day)
    } else {
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}T/)) {
    const datePart = cleanDate.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    if (year >= 1900 && year <= 2100) {
      date = new Date(year, month - 1, day)
    } else {
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
    const parts = cleanDate.split('-')
    const [part1, part2, yearStr] = parts
    const year = Number(yearStr)
    if (year >= 1900 && year <= 2100) {
      if (Number(part1) > 12) {
        date = new Date(year, Number(part2) - 1, Number(part1))
      } else {
        date = new Date(year, Number(part2) - 1, Number(part1))
      }
    } else {
      date = new Date()
    }
  } else {
    date = new Date()
  }

  // Agregar 30 días
  const dueDate = new Date(date)
  dueDate.setDate(date.getDate() + 30)

  // Formatear como YYYYMMDD
  const year = dueDate.getFullYear()
  const month = (dueDate.getMonth() + 1).toString().padStart(2, "0")
  const day = dueDate.getDate().toString().padStart(2, "0")
  return `${year}${month}${day}`
}

function formatReferencePeriod(dateString: string): string {
  // Aplicar la misma lógica de corrección de zona horaria que en formatDateForXML
  let date: Date

  // Limpiar espacios si es string
  const cleanDate = dateString ? dateString.trim() : ''

  // Helper function para convertir Excel serial date a Date
  const convertExcelSerialToDate = (serial: number): Date | null => {
    const excelEpoch = new Date(1900, 0, 1)
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const adjustedSerialNumber = serial > 59 ? serial - 1 : serial
    const result = new Date(excelEpoch.getTime() + (adjustedSerialNumber - 1) * millisecondsPerDay)

    if (isNaN(result.getTime())) return null
    const year = result.getFullYear()
    if (year < 1900 || year > 2100) return null
    return result
  }

  if (!cleanDate) {
    date = new Date()
  } else if (cleanDate.match(/^\d+$/)) {
    // Si es un string que contiene solo números, puede ser un serial de Excel
    const serial = parseInt(cleanDate, 10)
    if (serial > 0 && serial < 100000) {
      const excelDate = convertExcelSerialToDate(serial)
      date = excelDate || new Date()
    } else {
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
    const [year, month, day] = cleanDate.split('-').map(Number)
    if (year >= 1900 && year <= 2100) {
      date = new Date(year, month - 1, day)
    } else {
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{4}-\d{1,2}-\d{1,2}T/)) {
    const datePart = cleanDate.split('T')[0]
    const [year, month, day] = datePart.split('-').map(Number)
    if (year >= 1900 && year <= 2100) {
      date = new Date(year, month - 1, day)
    } else {
      date = new Date()
    }
  } else if (cleanDate.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
    const parts = cleanDate.split('-')
    const [part1, part2, yearStr] = parts
    const year = Number(yearStr)
    if (year >= 1900 && year <= 2100) {
      if (Number(part1) > 12) {
        date = new Date(year, Number(part2) - 1, Number(part1))
      } else {
        date = new Date(year, Number(part2) - 1, Number(part1))
      }
    } else {
      date = new Date()
    }
  } else {
    date = new Date()
  }

  // Formatear como MM.YYYY
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  return `${month}.${year}`
}

// Función para obtener el CtrISOcode basándose en CtrType y CtrSize
const getCtrISOcode = (ctrType: string, ctrSize: string): string => {
  const type = ctrType?.toUpperCase() || ''
  const size = ctrSize?.toString() || ''
  
  // Tabla de mapeo CtrISOcode -> CtrSize -> CtrType (ordenada de arriba a abajo)
  const isoCodeMap = [
    { isoCode: '10G0', size: '10', type: 'DV' },
    { isoCode: '10T0', size: '10', type: 'TK' },
    { isoCode: '12R1', size: '10', type: 'RE' },
    { isoCode: '20G0', size: '20', type: 'DV' },
    { isoCode: '20G1', size: '20', type: 'DV' },
    { isoCode: '20H0', size: '20', type: 'HR' },
    { isoCode: '20P1', size: '20', type: 'FL' },
    { isoCode: '20T0', size: '20', type: 'TK' },
    { isoCode: '20T1', size: '20', type: 'TK' },
    { isoCode: '20T2', size: '20', type: 'TK' },
    { isoCode: '20T3', size: '20', type: 'TK' },
    { isoCode: '20T4', size: '20', type: 'TK' },
    { isoCode: '20T5', size: '20', type: 'TK' },
    { isoCode: '20T6', size: '20', type: 'TK' },
    { isoCode: '20T7', size: '20', type: 'TK' },
    { isoCode: '20T8', size: '20', type: 'TK' },
    { isoCode: '22B0', size: '20', type: 'BV' },
    { isoCode: '22G0', size: '20', type: 'DV' },
    { isoCode: '22G1', size: '20', type: 'DV' },
    { isoCode: '22H0', size: '20', type: 'IS' },
    { isoCode: '22K2', size: '20', type: 'TK' },
    { isoCode: '22OS', size: '20', type: 'OS' },
    { isoCode: '22P1', size: '20', type: 'FL' },
    { isoCode: '22P3', size: '20', type: 'FL' },
    { isoCode: '22P7', size: '20', type: 'FL' },
    { isoCode: '22P8', size: '20', type: 'FL' },
    { isoCode: '22P9', size: '20', type: 'FL' },
    { isoCode: '22R1', size: '20', type: 'RE' },
    { isoCode: '22R7', size: '20', type: 'PP' },
    { isoCode: '22R9', size: '20', type: 'RE' },
    { isoCode: '22S1', size: '20', type: 'XX' },
    { isoCode: '22T0', size: '20', type: 'TK' },
    { isoCode: '22T1', size: '20', type: 'TK' },
    { isoCode: '22T2', size: '20', type: 'TK' },
    { isoCode: '22T3', size: '20', type: 'TK' },
    { isoCode: '22T4', size: '20', type: 'TK' },
    { isoCode: '22T5', size: '20', type: 'TK' },
    { isoCode: '22T6', size: '20', type: 'TK' },
    { isoCode: '22T7', size: '20', type: 'TK' },
    { isoCode: '22T8', size: '20', type: 'TK' },
    { isoCode: '22U1', size: '20', type: 'OT' },
    { isoCode: '22U6', size: '20', type: 'HT' },
    { isoCode: '22V0', size: '20', type: 'VE' },
    { isoCode: '22V2', size: '20', type: 'VE' },
    { isoCode: '22V3', size: '20', type: 'VE' },
    { isoCode: '22W0', size: '20', type: 'PW' },
    { isoCode: '24T6', size: '20', type: 'TK' },
    { isoCode: '24W1', size: '20', type: 'PW' },
    { isoCode: '24ZZ', size: '20', type: 'ZZ' },
    { isoCode: '25G0', size: '20', type: 'DV' },
    { isoCode: '25P0', size: '20', type: 'PL' },
    { isoCode: '26G0', size: '20', type: 'DV' },
    { isoCode: '26H0', size: '20', type: 'IS' },
    { isoCode: '26T9', size: '20', type: 'TK' },
    { isoCode: '28G0', size: '20', type: 'HH' },
    { isoCode: '28T0', size: '20', type: 'HH' },
    { isoCode: '28T8', size: '20', type: 'TK' },
    { isoCode: '28U1', size: '20', type: 'HH' },
    { isoCode: '28V0', size: '20', type: 'HH' },
    { isoCode: '29P0', size: '20', type: 'PL' },
    { isoCode: '2EG0', size: '20', type: 'HC' },
    { isoCode: '2LXX', size: '20', type: 'XX' },
    { isoCode: '30B1', size: '30', type: 'BV' },
    { isoCode: '30G0', size: '30', type: 'DV' },
    { isoCode: '32R3', size: '30', type: 'PP' },
    { isoCode: '32T1', size: '30', type: 'TK' },
    { isoCode: '32T6', size: '30', type: 'TK' },
    { isoCode: '3LXX', size: '30', type: 'XX' },
    { isoCode: '3MB0', size: '30', type: 'BB' },
    { isoCode: '40I0', size: '40', type: 'IS' },
    { isoCode: '40V0', size: '40', type: 'VE' },
    { isoCode: '42G0', size: '40', type: 'DV' },
    { isoCode: '42G1', size: '40', type: 'DV' },
    { isoCode: '42H0', size: '40', type: 'RE' },
    { isoCode: '42OS', size: '40', type: 'OS' },
    { isoCode: '42P1', size: '40', type: 'FL' },
    { isoCode: '42P3', size: '40', type: 'FL' },
    { isoCode: '42P4', size: '40', type: 'FL' },
    { isoCode: '42P6', size: '40', type: 'FL' },
    { isoCode: '42P8', size: '40', type: 'FL' },
    { isoCode: '42P9', size: '40', type: 'FL' },
    { isoCode: '42R1', size: '40', type: 'RE' },
    { isoCode: '42R3', size: '40', type: 'PP' },
    { isoCode: '42R9', size: '40', type: 'RE' },
    { isoCode: '42S1', size: '40', type: 'XX' },
    { isoCode: '42T2', size: '40', type: 'TK' },
    { isoCode: '42T5', size: '40', type: 'TK' },
    { isoCode: '42T6', size: '40', type: 'TK' },
    { isoCode: '42T8', size: '40', type: 'TK' },
    { isoCode: '42U1', size: '40', type: 'OT' },
    { isoCode: '42U6', size: '40', type: 'HT' },
    { isoCode: '43T5', size: '40', type: 'TK' },
    { isoCode: '44ZZ', size: '40', type: 'ZZ' },
    { isoCode: '45B3', size: '40', type: 'BV' },
    { isoCode: '45G0', size: '40', type: 'HC' },
    { isoCode: '45G1', size: '40', type: 'HC' },
    { isoCode: '45P0', size: '40', type: 'PL' },
    { isoCode: '45P1', size: '40', type: 'FT' },
    { isoCode: '45P3', size: '40', type: 'FT' },
    { isoCode: '45P8', size: '40', type: 'FT' },
    { isoCode: '45R1', size: '40', type: 'HR' },
    { isoCode: '45R9', size: '40', type: 'RE' },
    { isoCode: '45U1', size: '40', type: 'OT' },
    { isoCode: '45U6', size: '40', type: 'HT' },
    { isoCode: '46H0', size: '40', type: 'HR' },
    { isoCode: '47T9', size: '40', type: 'TK' },
    { isoCode: '48G0', size: '20', type: 'HH' },
    { isoCode: '48T8', size: '40', type: 'TK' },
    { isoCode: '49P0', size: '40', type: 'PL' },
    { isoCode: '49P3', size: '40', type: 'FL' },
    { isoCode: '4CG0', size: '40', type: 'DV' },
    { isoCode: '4EG1', size: '40', type: 'HC' },
    { isoCode: '4MNL', size: '40', type: 'TK' },
    { isoCode: '72T0', size: '23', type: 'TK' },
    { isoCode: '72T8', size: '23', type: 'TK' },
    { isoCode: '74T0', size: '23', type: 'TK' },
    { isoCode: '74T1', size: '23', type: 'TK' },
    { isoCode: '74T6', size: '23', type: 'TK' },
    { isoCode: '74T7', size: '23', type: 'TK' },
    { isoCode: '74T8', size: '23', type: 'TK' },
    { isoCode: '74ZZ', size: '23', type: 'ZZ' },
    { isoCode: '75T8', size: '23', type: 'TK' },
    { isoCode: 'A2T1', size: '23', type: 'TK' },
    { isoCode: 'A2T3', size: '23', type: 'TK' },
    { isoCode: 'CMT1', size: '20', type: 'TK' },
    { isoCode: 'L0G0', size: '45', type: 'DV' },
    { isoCode: 'L0G1', size: '45', type: 'HC' },
    { isoCode: 'L2G1', size: '45', type: 'HC' },
    { isoCode: 'L2W0', size: '45', type: 'PW' },
    { isoCode: 'L4ZZ', size: '45', type: 'ZZ' },
    { isoCode: 'L5G1', size: '45', type: 'HC' },
    { isoCode: 'L5R0', size: '45', type: 'HR' },
    { isoCode: 'L5R1', size: '45', type: 'RE' },
    { isoCode: 'LEG1', size: '45', type: 'HC' },
    { isoCode: 'M0G0', size: '48', type: 'DV' },
    { isoCode: 'P0G0', size: '53', type: 'DV' },
    { isoCode: 'P5G0', size: '53', type: 'HC' },
    { isoCode: 'P5OS', size: '53', type: 'OS' },
    { isoCode: 'P5R1', size: '53', type: 'RE' },
    { isoCode: 'ZZNC', size: '0', type: 'ZZ' }
  ]
  
  // Buscar el primer match (de arriba a abajo en la lista)
  const match = isoCodeMap.find(item => 
    item.size === size && item.type === type
  )
  
  if (match) {
    console.log(`CtrISOcode encontrado: ${match.isoCode} para CtrType: ${type}, CtrSize: ${size}`)
    return match.isoCode
  }
  
  // Si no se encuentra match, usar valor por defecto
  console.warn(`No se encontró CtrISOcode para CtrType: ${type}, CtrSize: ${size}. Usando valor por defecto.`)
  return '42G1' // Valor por defecto para 40' DV
}

// Función para generar nombre de archivo XML según estructura SAP
export function generateXmlFileName(companyCode: string = '9325'): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // últimos 2 dígitos del año
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  // Estructura: <companyCode>_XL_yymmdd_hhmmss.XML
  return `${companyCode}_XL_${year}${month}${day}_${hours}${minutes}${seconds}.XML`
}

// Función para enviar XML a SAP vía FTP
export async function sendXmlToSap(invoiceId: string, xmlContent: string, fileName: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/send-xml-to-sap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        xmlContent,
        fileName
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al enviar XML a SAP via FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al enviar XML a SAP via FTP:', error)
    throw error
  }
}

// Función para probar la conexión FTP con diferentes configuraciones
export async function testFtpConnection() {
  try {
    const response = await fetch('/api/invoices/test-ftp-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al probar conexión FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al probar conexión FTP:', error)
    throw error
  }
}

// Función para debug de autenticación FTP con credenciales exactas
export async function debugFtpAuth() {
  try {
    const response = await fetch('/api/invoices/debug-ftp-auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    console.log('🔍 Debug FTP Auth Result:', result)
    
    if (!response.ok) {
      throw new Error(result.message || 'Error en debug de autenticación FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error en debug FTP auth:', error)
    throw error
  }
}

// Función para diagnóstico híbrido FTP/SFTP
export async function diagnoseFtpServer() {
  try {
    const response = await fetch('/api/invoices/diagnose-ftp-server', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    console.log('🔍 Diagnóstico FTP/SFTP Result:', result)
    
    if (!response.ok) {
      throw new Error(result.message || 'Error en diagnóstico FTP/SFTP')
    }

    return result
  } catch (error: any) {
    console.error('Error en diagnóstico FTP/SFTP:', error)
    throw error
  }
}

// Función para marcar XML como enviado a SAP
export async function markXmlAsSentToSap(invoiceId: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/mark-xml-sent-to-sap`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al marcar XML como enviado a SAP')
    }

    return result
  } catch (error: any) {
    console.error('Error al marcar XML como enviado a SAP:', error)
    throw error
  }
}

// Función para marcar XML como enviado a SAP (versión robusta con múltiples estrategias)
export async function markXmlAsSentToSapSimple(invoiceId: string) {
  try {
    console.log('🔍 Usando función simple para marcar XML como enviado a SAP:', invoiceId)
    
    const response = await fetch(`/api/invoices/${invoiceId}/mark-xml-sent-to-sap-simple`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    console.log('🔍 Respuesta del endpoint simple:', result)
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al marcar XML como enviado a SAP (simple)')
    }

    return result
  } catch (error: any) {
    console.error('Error al marcar XML como enviado a SAP (simple):', error)
    throw error
  }
}

export function generateInvoiceXML(invoice: InvoiceForXmlPayload): string {
  // Debug logs
  console.log("=== DEBUG: generateInvoiceXML ===")
  console.log("Invoice received:", invoice)
  console.log("OtherItems received:", invoice.otherItems)
  console.log("OtherItems length:", invoice.otherItems?.length || 0)
  
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML")
  }
  if (!invoice.clientSapNumber) {
    throw new Error("El número SAP del cliente (clientSapNumber) es obligatorio para generar el XML.")
  }

  // Calcular el monto total de las rutas (para fallback)
  const routeAmountTotal = invoice.records.reduce((sum, record) => {
    const routeAmount = (record as any).routeAmount || record.totalPrice || 0
    return sum + routeAmount
  }, 0)

  // Calcular el monto total de los impuestos PTG (para fallback)
  const taxesAmountTotal = (invoice.otherItems || []).reduce((sum: number, taxItem: any) => {
    return sum + (taxItem.totalPrice || 0)
  }, 0)

  // CustomerOpenItem / AmntTransactCur: debe ser el total a cobrar (neto), **el mismo** que `totalAmount` en factura/PDF.
  // Aquí NO se resta el descuento otra vez; si viniera mal el payload, el XML se vería "con doble descuento" solo en el encabezado.
  // Aceptamos `total` o `totalAmount` y números como string (p. ej. desde JSON), para no caer al fallback por error de tipo.
  const parseHeaderTotal = (inv: InvoiceForXmlPayload): number | null => {
    const raw = (inv as any).total ?? (inv as any).totalAmount
    if (raw === undefined || raw === null || raw === "") return null
    const n = typeof raw === "number" ? raw : Number(String(raw).replace(/,/g, "").trim())
    if (!Number.isFinite(n) || n < 0) return null
    return n
  }
  const parsedHeaderTotal = parseHeaderTotal(invoice)
  const totalAmount =
    parsedHeaderTotal !== null ? parsedHeaderTotal : routeAmountTotal + taxesAmountTotal

  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "SourceSystem": "PTGFACTUGO",
          "TechnicalContact": "almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9325",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.date),
          "PostingDate": invoice.sapDate ? formatDateForXML(invoice.sapDate) : formatDateForXML(invoice.date),
          "TransactionCurrency": invoice.currency || "USD",
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.sapDocumentNumber || invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section
        "CustomerOpenItem": {
          "CustomerNbr": invoice.clientSapNumber || invoice.clientSapCode || invoice.clientSap || invoice.client,
          "AmntTransactCur": totalAmount.toFixed(3),
          "BaselineDate": formatDateForXML(invoice.date),
          "DueDate": calculateDueDate(invoice.date)
        },
        // OtherItems Section - Trasiego: 3 OtherItem fijos; Gastos de autoridades: lógica agrupada anterior
        "OtherItems": {
          "OtherItem": (function(): any[] {
            const invNum = (invoice.invoiceNumber || '').toString().toUpperCase()
            const isAuthInvoice = invNum.startsWith('AUTH-') || invNum.endsWith(' AUT') || (invoice as any).details?.documentType === 'gastos-autoridades'

            if (isAuthInvoice) {
              // Gastos de autoridades: agrupar registros y otherItems como antes
              const recordItems = (function() {
                const authAggregateServices = new Set(["TRK182", "TRK175", "TRK009"])
                const groupedRecords = new Map<string, { record: InvoiceLineItemForXml; count: number; totalPrice: number }>()
                invoice.records.forEach((record: InvoiceLineItemForXml) => {
                  const key = `${record.serviceCode || "TRK002"}-${record.unitPrice}-${record.containerType || "DV"}-${record.containerSize || "40"}-${record.ctrCategory || "D"}-${record.fullEmptyStatus || "FULL"}-${record.businessType || "IMPORT"}`
                  const recordQuantity = record.quantity || 1
                  if (groupedRecords.has(key)) {
                    const existing = groupedRecords.get(key)!
                    existing.count += recordQuantity
                    existing.totalPrice += record.totalPrice || 0
                  } else {
                    groupedRecords.set(key, { record, count: recordQuantity, totalPrice: record.totalPrice || 0 })
                  }
                })
                const groupedValues = Array.from(groupedRecords.values())

                let authAggregateQty = 0
                let authAggregateAmount = 0

                const nonAggregateItems = groupedValues
                  .filter((group) => {
                    const serviceCode = (group.record.serviceCode || "TRK002").toUpperCase()
                    if (authAggregateServices.has(serviceCode)) {
                      authAggregateQty += group.count
                      authAggregateAmount += group.totalPrice || 0
                      return false
                    }
                    return true
                  })
                  .map((group) => {
                  const record = group.record
                  const businessTypeXmlValue = record.businessType === "IMPORT" ? "I" : "E"
                  const isAuthTaxService = ['TRK182', 'TRK175', 'TRK009'].includes(record.serviceCode || '')
                  const originalCtrType = record.containerType || "DV"
                  const ctrType = getContainerTypeSapCode(originalCtrType)
                  const ctrSize = record.containerSize || "40"
                  const ctrISOcode = getCtrISOcode(ctrType, ctrSize)
                  let finalCtrISOcode: string
                  let finalCtrType: string | undefined
                  let finalCtrSize: string | undefined
                  let finalCtrCategory: string
                  if (!record.containerType && !record.containerSize && !record.ctrCategory) {
                    finalCtrISOcode = "42G1"
                    finalCtrType = "DV"
                    finalCtrSize = "40"
                    finalCtrCategory = "A"
                  } else {
                    finalCtrISOcode = ctrISOcode
                    if (ctrType && ctrType.trim()) finalCtrType = ctrType
                    if (record.containerSize && record.containerSize.trim()) finalCtrSize = record.containerSize
                    finalCtrCategory = "A"
                  }
                  return {
                    "IncomeRebateCode": TRUCKING_DEFAULTS.incomeRebateCode,
                    "AmntTransacCur": (-group.totalPrice).toFixed(3),
                    "BaseUnitMeasure": isAuthTaxService ? "EA" : "CTR",
                    "Qty": group.count.toString(),
                    "ProfitCenter": "PAPANB110",
                    "ReferencePeriod": formatReferencePeriod(invoice.date),
                    "Service": record.serviceCode || "TRK002",
                    "Activity": "TRK",
                    "Pillar": TRUCKING_DEFAULTS.pillar,
                    "BUCountry": "PA",
                    "ServiceCountry": "PA",
                    "ClientType": TRUCKING_DEFAULTS.clientType,
                    "BusinessType": businessTypeXmlValue,
                    "FullEmpty": record.fullEmptyStatus || "FULL",
                    "CtrISOcode": finalCtrISOcode,
                    ...(finalCtrType ? { "CtrType": finalCtrType } : {}),
                    ...(finalCtrSize ? { "CtrSize": finalCtrSize } : {}),
                    "CtrCategory": finalCtrCategory
                  }
                })

                const aggregateItem = authAggregateQty > 0
                  ? [{
                      "IncomeRebateCode": "I",
                      "AmntTransacCur": (-authAggregateAmount).toFixed(3),
                      "BaseUnitMeasure": "EA",
                      "Qty": authAggregateQty.toString(),
                      "ProfitCenter": "PAPANB110",
                      "ReferencePeriod": formatReferencePeriod(invoice.date),
                      "Service": "TRK009",
                      "Activity": "TRK",
                      "Pillar": "TRSP",
                      "BUCountry": "PA",
                      "ServiceCountry": "PA",
                      "ClientType": "MSCGVA",
                      "BusinessType": "I",
                      "FullEmpty": "FULL",
                      "CtrISOcode": "42G1",
                      "CtrType": "DV",
                      "CtrSize": "40",
                      "CtrCategory": "A"
                    }]
                  : []

                return [...nonAggregateItems, ...aggregateItem]
              })()
              const taxItems = (function() {
                if (!invoice.otherItems || invoice.otherItems.length === 0) return []
                const groupedTaxes = new Map<string, { taxItem: any; count: number; totalPrice: number }>()
                invoice.otherItems.forEach((taxItem: any) => {
                  const key = `${taxItem.serviceCode || "TRK135"}-${taxItem.description || ""}`
                  if (groupedTaxes.has(key)) {
                    const existing = groupedTaxes.get(key)!
                    existing.count += taxItem.quantity || 1
                    existing.totalPrice += taxItem.totalPrice || 0
                  } else {
                    groupedTaxes.set(key, { taxItem, count: taxItem.quantity || 1, totalPrice: taxItem.totalPrice || 0 })
                  }
                })
                return Array.from(groupedTaxes.values()).map((group) => {
                  const taxItem = group.taxItem
                  let ctrISOcode: string | undefined
                  let finalCtrType: string | undefined
                  let finalCtrSize: string | undefined
                  if (taxItem.containerType && taxItem.containerSize) {
                    const ctrType = getContainerTypeSapCode(taxItem.containerType)
                    ctrISOcode = getCtrISOcode(ctrType, taxItem.containerSize)
                    if (ctrType?.trim()) finalCtrType = ctrType
                    if (taxItem.containerSize?.trim()) finalCtrSize = taxItem.containerSize
                  }
                  return {
                    "IncomeRebateCode": "I",
                    "AmntTransacCur": (-group.totalPrice).toFixed(3),
                    "BaseUnitMeasure": "EA",
                    "Qty": group.count.toString(),
                    "ProfitCenter": "PAPANB110",
                    "ReferencePeriod": formatReferencePeriod(invoice.date),
                    "Service": taxItem.serviceCode || "TRK135",
                    "Activity": "TRK",
                    "Pillar": "TRSP",
                    "BUCountry": "PA",
                    "ServiceCountry": "PA",
                    "ClientType": "MEDLOG",
                    "BusinessType": "E",
                    "FullEmpty": taxItem.FullEmpty || "FULL",
                    ...(ctrISOcode ? { "CtrISOcode": ctrISOcode } : {}),
                    ...(finalCtrType ? { "CtrType": finalCtrType } : {}),
                    ...(finalCtrSize ? { "CtrSize": finalCtrSize } : {}),
                    ...(ctrISOcode ? { "CtrCategory": "A" } : {})
                  }
                })
              })()
              return [...recordItems, ...taxItems]
            }

            // Trasiego: solo 3 OtherItem (TRK002, TRK130 como TRK002/BusinessType I, TRK135) - orden de etiquetas como antes
            const refPeriod = formatReferencePeriod(invoice.date)
            let trk002Amt = 0, trk002Qty = 0, trk130Amt = 0, trk130Qty = 0, trk135Amt = 0, trk135Qty = 0
            invoice.records.forEach((r: InvoiceLineItemForXml) => {
              if ((r.serviceCode || "TRK002").toUpperCase() === "TRK002") {
                trk002Qty += r.quantity || 1
                trk002Amt += r.totalPrice || 0
              }
            })
            ;(invoice.otherItems || []).forEach((item: any) => {
              const code = (item.serviceCode || "").toUpperCase()
              const qty = item.quantity || 1
              const amt = item.totalPrice || 0
              if (code === "TRK130") { trk130Qty += qty; trk130Amt += amt }
              else if (code === "TRK135") { trk135Qty += qty; trk135Amt += amt }
            })

            // Descuento de prefactura: se aplica al OtherItem TRK002 con BusinessType I (línea que proviene de TRK130 / admin fee).
            // Solo restamos hasta el "hueco" entre suma bruta de líneas y invoice.total, para no aplicar el descuento dos veces
            // si los importes de registros ya venían alineados con el total neto.
            const discountRaw = (invoice as any).discountAmount ?? (invoice as any).details?.discountAmount ?? 0
            const discountAmount = Math.max(0, Number(discountRaw) || 0)
            const grossSum = trk002Amt + trk130Amt + trk135Amt
            const shortfallVsTotal = Math.max(0, grossSum - totalAmount)
            const discountToApply =
              discountAmount > 0 ? Math.min(discountAmount, shortfallVsTotal) : 0
            let trk002ForXml = trk002Amt
            let trk130ForXml = Math.max(0, trk130Amt - discountToApply)
            let sumLines = trk002ForXml + trk130ForXml + trk135Amt
            let gap = sumLines - totalAmount
            if (Math.abs(gap) > 0.001) {
              trk130ForXml = Math.max(0, trk130ForXml - gap)
              sumLines = trk002ForXml + trk130ForXml + trk135Amt
              gap = sumLines - totalAmount
            }
            if (Math.abs(gap) > 0.001) {
              trk002ForXml = Math.max(0, trk002ForXml - gap)
            }

            return [
              {
                "IncomeRebateCode": "I",
                "AmntTransacCur": (-trk002ForXml).toFixed(3),
                "BaseUnitMeasure": "CTR",
                "Qty": trk002Qty.toString(),
                "ProfitCenter": "PAPANB110",
                "ReferencePeriod": refPeriod,
                "Service": "TRK002",
                "Activity": "TRK",
                "Pillar": "TRSP",
                "BUCountry": "PA",
                "ServiceCountry": "PA",
                "ClientType": "MEDLOG",
                "BusinessType": "E",
                "FullEmpty": "FULL",
                "CtrISOcode": "42H0",
                "CtrType": "RE",
                "CtrSize": "40",
                "CtrCategory": "A"
              },
              {
                "IncomeRebateCode": "I",
                "AmntTransacCur": (-trk130ForXml).toFixed(3),
                "BaseUnitMeasure": "CTR",
                "Qty": trk130Qty.toString(),
                "ProfitCenter": "PAPANB110",
                "ReferencePeriod": refPeriod,
                "Service": "TRK002",
                "Activity": "TRK",
                "Pillar": "TRSP",
                "BUCountry": "PA",
                "ServiceCountry": "PA",
                "ClientType": "MEDLOG",
                "BusinessType": "I",
                "FullEmpty": "FULL",
                "CtrISOcode": "42H0",
                "CtrType": "RE",
                "CtrSize": "40",
                "CtrCategory": "A"
              },
              {
                "IncomeRebateCode": "I",
                "AmntTransacCur": (-trk135Amt).toFixed(3),
                "BaseUnitMeasure": "EA",
                "Qty": trk135Qty.toString(),
                "ProfitCenter": "PAPANB110",
                "ReferencePeriod": refPeriod,
                "Service": "TRK135",
                "Activity": "TRK",
                "Pillar": "TRSP",
                "BUCountry": "PA",
                "ServiceCountry": "PA",
                "ClientType": "MEDLOG",
                "BusinessType": "A",
                "FullEmpty": "FULL"
              }
            ]
          })()
        }
      }
    }
  }
  
  console.log("=== DEBUG: Final XML object ===")
  console.log("OtherItems in XML:", xmlObject["ns1:LogisticARInvoices"].CustomerInvoice.OtherItems)
  console.log("Number of OtherItems:", xmlObject["ns1:LogisticARInvoices"].CustomerInvoice.OtherItems.OtherItem.length)
  
  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

export function generatePTYSSInvoiceXML(invoice: PTYSSInvoiceForXml): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML PTYSS")
  }

  // Función auxiliar para generar todos los OtherItems
  const generateOtherItems = () => {
    // Agrupar registros usando la misma lógica que el PDF de PTYSS
    const groupedRecords = new Map<string, { records: any[], price: number, count: number }>()
            
            console.log("🔍 PTYSS XML - Total records to process:", invoice.records.length)
            console.log("🔍 PTYSS XML - Records:", invoice.records)
            
            invoice.records.forEach((record: PTYSSRecordForXml, index: number) => {
              const data = record.data
              
              console.log(`🔍 PTYSS XML - Processing record ${index + 1}:`, {
                id: record.id,
                data: data,
                totalValue: record.totalValue
              })
              
              // Identificar registros de trasiego: recordType === 'trasiego' O (tienen line, matchedPrice y no tienen localRouteId)
              // Priorizar recordType para que registros locales se detecten bien aunque tengan otros campos
              const isTrasiego =
                data.recordType === 'trasiego' ||
                (Boolean(data.line) && Boolean(data.matchedPrice) && !data.localRouteId)
              const isLocal =
                data.recordType === 'local' || (Boolean(data.localRouteId) && data.recordType !== 'trasiego')
              const treatAsTrasiego = isTrasiego && !isLocal

              console.log(`🔍 PTYSS XML - Is trasiego:`, treatAsTrasiego, {
                recordType: data.recordType,
                line: data.line,
                matchedPrice: data.matchedPrice,
                localRouteId: data.localRouteId
              })
              
              if (treatAsTrasiego) {
                // Los registros de trasiego en PTYSS tienen estos campos:
                const line = data.line || ''
                const from = data.from || ''
                const to = data.to || ''
                const size = data.size || data.containerSize || ''
                const type = data.type || data.containerType || ''
                const route = data.route || ''
                const fe = data.fe ? (data.fe.toString().toUpperCase().trim() === 'F' ? 'FULL' : 'EMPTY') : 'FULL'
                const price = (data.matchedPrice || record.totalValue || 0)
                
                // Crear clave única para agrupar por características similares (igual que PDF)
                const groupKey = `TRASIEGO|${line}|${from}|${to}|${size}|${type}|${fe}|${route}|${price}`
                
                console.log(`🔍 PTYSS XML - Trasiego groupKey:`, groupKey)
                
                if (!groupedRecords.has(groupKey)) {
                  groupedRecords.set(groupKey, {
                    records: [],
                    price: price,
                    count: 0
                  })
                  console.log(`🔍 PTYSS XML - Created new trasiego group:`, groupKey)
                }
                
                const group = groupedRecords.get(groupKey)!
                group.records.push(record)
                group.count += 1
                console.log(`🔍 PTYSS XML - Added to trasiego group. Count:`, group.count)
              } else {
                // Para registros locales, agrupar por ruta local (igual que PDF)
                const localRouteId = data.localRouteId || ''
                const localRoutePrice = data.localRoutePrice || 0
                const containerSize = data.containerSize || ''
                const containerType = data.containerType || ''
                const from = data.from || ''
                const to = data.to || ''
                
                const groupKey = `LOCAL|${localRouteId}|${containerSize}|${containerType}|${from}|${to}|${localRoutePrice}`
                
                console.log(`🔍 PTYSS XML - Local groupKey:`, groupKey)
                
                if (!groupedRecords.has(groupKey)) {
                  groupedRecords.set(groupKey, {
                    records: [],
                    price: localRoutePrice,
                    count: 0
                  })
                  console.log(`🔍 PTYSS XML - Created new local group:`, groupKey)
                }
                
                const group = groupedRecords.get(groupKey)!
                group.records.push(record)
                group.count += 1
                console.log(`🔍 PTYSS XML - Added to local group. Count:`, group.count)
              }
            })
            
            console.log("🔍 PTYSS XML - Final groups created:", groupedRecords.size)
            Array.from(groupedRecords.entries()).forEach(([key, group], index) => {
              console.log(`🔍 PTYSS XML - Group ${index + 1}: ${key} - Count: ${group.count} - Price: $${group.price}`)
            })

            // ¿Solo registros locales (sin trasiegos)? Para locales solo enviamos un único OtherItem con el servicio principal.
            // Se usa flag explícito invoice.localRecordsOnly o la detección por grupos (ninguno TRASIEGO).
            const hasTrasiego = Array.from(groupedRecords.keys()).some((key) => key.startsWith('TRASIEGO|'))
            const isLocalOnlyByGroups = !hasTrasiego && groupedRecords.size > 0
            const isLocalOnly = Boolean(invoice.localRecordsOnly) || isLocalOnlyByGroups

            if (isLocalOnly) {
              // Registros locales: un solo OtherItem con servicio principal TRK001 y valores fijos según ejemplo SAP
              const totalLocalAmount = Array.from(groupedRecords.values()).reduce(
                (sum, group) => sum + group.price * group.count,
                0
              )
              const additionalAmount =
                invoice.additionalServices?.reduce((sum, s) => sum + (s.amount || 0), 0) ?? 0
              const invoiceTotal = totalLocalAmount + additionalAmount
              const totalLocalRecords = Array.from(groupedRecords.values()).reduce((sum, group) => sum + group.count, 0)

              console.log("🔍 PTYSS XML - Local only: single OtherItem. Total:", invoiceTotal, "Qty:", totalLocalRecords)

              const singleOtherItem = {
                "IncomeRebateCode": "I",
                "AmntTransacCur": (-invoiceTotal).toFixed(3),
                "BaseUnitMeasure": "CTR",
                "Qty": totalLocalRecords.toString(),
                "ProfitCenter": "PAPANC110",
                "ReferencePeriod": formatReferencePeriod(invoice.date),
                "Service": "TRK001",
                "Activity": "TRK",
                "Pillar": "TRSP",
                "BUCountry": "PA",
                "ServiceCountry": "PA",
                "ClientType": "MEDLOG",
                "BusinessType": "I",
                "FullEmpty": "FULL",
                "CtrISOcode": "42H0",
                "CtrType": "RE",
                "CtrSize": "40",
                "CtrCategory": "A"
              }
              return [singleOtherItem]
            }

            // Solo trasiegos (no hay facturas mixtas trasiego+local): un OtherItem TRK002 agregado.
            const trasiegoEntries = Array.from(groupedRecords.entries()).filter(([key]) =>
              key.startsWith('TRASIEGO|')
            )
            const recordItems: any[] = []

            if (trasiegoEntries.length > 0) {
              const totalTrasiegoAmount = trasiegoEntries.reduce(
                (sum, [, g]) => sum + g.price * g.count,
                0
              )
              const totalTrasiegoQty = trasiegoEntries.reduce((sum, [, g]) => sum + g.count, 0)
              console.log(
                '🔍 PTYSS XML - Trasiego agregado: un TRK002, monto:',
                totalTrasiegoAmount,
                'Qty:',
                totalTrasiegoQty
              )
              recordItems.push({
                "IncomeRebateCode": "I",
                "AmntTransacCur": (-totalTrasiegoAmount).toFixed(3),
                "BaseUnitMeasure": "CTR",
                "Qty": totalTrasiegoQty.toString(),
                "ProfitCenter": "PAPANC110",
                "ReferencePeriod": formatReferencePeriod(invoice.date),
                "Service": "TRK002",
                "Activity": "TRK",
                "Pillar": "TRSP",
                "BUCountry": "PA",
                "ServiceCountry": "PA",
                "ClientType": "MEDLOG",
                "BusinessType": "E",
                "FullEmpty": "FULL",
                "CtrISOcode": "42H0",
                "CtrType": "RE",
                "CtrSize": "40",
                "CtrCategory": "A"
              })
            }

            // Agregar servicios adicionales (trasiego)
            const localFixedServiceItems: any[] = []
            const localFixedServiceCodes = [...FIXED_LOCAL_ALL_CODES, 'CLG096', 'PESAJE']

            if (invoice.additionalServices && invoice.additionalServices.length > 0) {
              console.log("🔍 PTYSS XML - Processing additional services:", invoice.additionalServices)

              invoice.additionalServices.forEach((service) => {
                // Solo procesar servicios locales fijos (acepta code legacy o sapCode)
                if (localFixedServiceCodes.includes(service.serviceId)) {
                  const serviceCodeLegacy = getLegacyCodeFromServiceId(service.serviceId === 'PESAJE' ? 'TRK196' : service.serviceId)
                  const serviceCodeSap = getSapCodeForService(serviceCodeLegacy)

                  console.log(`🔍 PTYSS XML - Adding local fixed service: ${serviceCodeSap} - Amount: ${service.amount}`)

                  // Determinar valores según el código de servicio (por legacy para pillar/profitCenter)
                  let pillarValue = "TRSP" // Valor por defecto
                  let profitCenter = "PAPANC110" // Valor por defecto
                  let clientType = "MEDLOG" // Valor por defecto

                  // Customs/TI (CLG097 / CHB123)
                  if (serviceCodeLegacy === 'CLG097') {
                    pillarValue = "LOGS"
                    profitCenter = "PAPANC321"
                    clientType = "MSCGVA"
                  }
                  // CLG096 - Ship Chandler: PAPANC441, CLG, LOGS, PA, MSCGVA
                  else if (serviceCodeLegacy === 'CLG096') {
                    pillarValue = "LOGS"
                    profitCenter = "PAPANC441"
                    clientType = "MSCGVA"
                  }
                  else if (serviceCodeLegacy === 'SLR168') {
                    pillarValue = "NOPS"
                  }

                  // Enviar a SAP el código SAP actual (sapCode). ProfitCenter por defecto PAPANC110 (CLG097/CLG096 usan el suyo)
                  localFixedServiceItems.push({
                    "IncomeRebateCode": "I",
                    "AmntTransacCur": (-service.amount).toFixed(3),
                    "BaseUnitMeasure": "EA",
                    "Qty": "1.00",
                    "ProfitCenter": profitCenter,
                    "ReferencePeriod": formatReferencePeriod(invoice.date),
                    "Service": serviceCodeSap,
                    "Activity": "TRK",
                    "Pillar": "TRSP",
                    "BUCountry": "PA",
                    "ServiceCountry": "PA",
                    "ClientType": "MEDLOG",
                    "BusinessType": "I",
                    "FullEmpty": "FULL"
                  })
                }
              })
            }
            
            console.log(`🔍 PTYSS XML - Total record items: ${recordItems.length}`)
            console.log(`🔍 PTYSS XML - Total local fixed service items: ${localFixedServiceItems.length}`)
            
    // Línea TRK002 + servicios adicionales (solo facturas trasiego)
    return [...recordItems, ...localFixedServiceItems]
  }
  
  // Generar los OtherItems primero
  const otherItems = generateOtherItems()
  
  // Calcular el total sumando los valores absolutos de todos los AmntTransacCur
  const totalAmount = otherItems.reduce((sum, item) => {
    const amount = Math.abs(parseFloat(item.AmntTransacCur || '0'))
    return sum + amount
  }, 0)
  
  console.log("🔍 PTYSS XML - Calculated total from OtherItems:", totalAmount)
  
  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "SourceSystem": "Trucking",
          "TechnicalContact": "almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9326",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.date),
          "PostingDate": invoice.sapDate ? formatDateForXML(invoice.sapDate) : formatDateForXML(invoice.date),
          "TransactionCurrency": "USD",
          "TranslationDate": formatDateForXML(invoice.date),
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.sapDocumentNumber || invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section - usar el total calculado de los OtherItems
        "CustomerOpenItem": {
          "CustomerNbr": invoice.client,
          "AmntTransactCur": totalAmount.toFixed(2),
          "BaselineDate": formatDateForXML(invoice.date),
          "DueDate": calculateDueDate(invoice.date)
        },
        // OtherItems Section
        "OtherItems": {
          "OtherItem": otherItems
        }
      }
    }
  }
  
  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

// Tipos para ShipChandler XML
export interface ShipChandlerInvoiceForXml {
  id: string
  invoiceNumber: string
  client: string
  clientName: string
  date: string
  sapDate?: string
  currency: string
  total: number
  records: ShipChandlerRecordForXml[]
  sapDocumentNumber?: string
}

export interface ShipChandlerRecordForXml {
  id: string
  data: {
    customerName: string
    invoiceNo: string
    invoiceType: string
    vessel: string
    date: string
    referenceNo: string
    deliveryAddress: string
    discount: number
    deliveryExpenses: number
    portEntryFee: number
    customsFee: number
    authorities: number
    otherExpenses: number
    overTime: number
    total: number
    clientId?: string
    clientSapCode?: string
    [key: string]: any
  }
  totalValue: number
}

// Función para generar XML de ShipChandler
export function generateShipChandlerInvoiceXML(invoice: ShipChandlerInvoiceForXml): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.client || !invoice.date) {
    throw new Error("Datos requeridos faltantes para generar XML ShipChandler")
  }

  // Calcular el monto total sumando todos los servicios de todos los registros
  // Los servicios a sumar son: deliveryExpenses, portEntryFee, customsFee, authorities, otherExpenses, overTime, total
  const totalAmount = invoice.records.reduce((sum, record) => {
    const data = record.data
    const recordTotal = 
      Number(data.deliveryExpenses || 0) +
      Number(data.portEntryFee || 0) +
      Number(data.customsFee || 0) +
      Number(data.authorities || 0) +
      Number(data.otherExpenses || 0) +
      Number(data.overTime || 0) +
      Number(data.total || 0)
    return sum + recordTotal
  }, 0)

  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section
        "Protocol": {
          "SourceSystem": "ShipChandler",
          "TechnicalContact": "almeida.kant@ptyrmgmt.com;renee.taylor@ptyrmgmt.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9326",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.date),
          "PostingDate": invoice.sapDate ? formatDateForXML(invoice.sapDate) : formatDateForXML(invoice.date),
          "TransactionCurrency": "USD",
          "TranslationDate": formatDateForXML(invoice.date),
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.sapDocumentNumber || invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section
        "CustomerOpenItem": {
          "CustomerNbr": invoice.client,
          "AmntTransactCur": totalAmount.toFixed(2),
          "BaselineDate": formatDateForXML(invoice.date),
          "DueDate": calculateDueDate(invoice.date)
        },
        // OtherItems Section - crear una línea por cada servicio que tenga valor
        "OtherItems": {
          "OtherItem": (function() {
            const otherItems: any[] = []
            let lineNbr = 1
            
            // Mapeo de campos a service codes con sus configuraciones
            // ACTUALIZADO: Todos los servicios de ShipChandler usan CLG096, CLG, LOGS, MSCGVA
            const serviceCodeConfig: Record<string, { code: string; activity: string; pillar: string }> = {
              deliveryExpenses: { code: 'CLG096', activity: 'CLG', pillar: 'LOGS' },
              portEntryFee: { code: 'CLG096', activity: 'CLG', pillar: 'LOGS' },
              customsFee: { code: 'CLG096', activity: 'CLG', pillar: 'LOGS' },
              authorities: { code: 'CLG096', activity: 'CLG', pillar: 'LOGS' },
              otherExpenses: { code: 'CLG096', activity: 'CLG', pillar: 'LOGS' },
              overTime: { code: 'CLG096', activity: 'CLG', pillar: 'LOGS' },
              total: { code: 'CLG096', activity: 'CLG', pillar: 'LOGS' }
            }
            
            // Procesar cada registro
            invoice.records.forEach((record: ShipChandlerRecordForXml) => {
              const data = record.data
              const invoiceNo = data.invoiceNo || ''
              
              // Crear una línea por cada campo que tenga valor mayor a 0
              Object.entries(serviceCodeConfig).forEach(([fieldName, config]) => {
                const value = Number(data[fieldName] || 0)
                if (value > 0) {
                  // Determinar el nombre del servicio para la descripción
                  const serviceNames: Record<string, string> = {
                    deliveryExpenses: 'Delivery Expenses',
                    portEntryFee: 'Port Entry Fee',
                    customsFee: 'Customs Fee',
                    authorities: 'Authorities',
                    otherExpenses: 'Other Expenses',
                    overTime: 'Over Time',
                    total: 'Total'
                  }
                  
                  const serviceName = serviceNames[fieldName] || fieldName
                  
                  const item: any = {
                    "IncomeRebateCode": "I",
                    "AmntTransacCur": (-value).toFixed(3),
                    "BaseUnitMeasure": "EA", // Each - unidad por cada servicio
                    "Qty": "1",
                    "ProfitCenter": "PAPANC441", // Todos los servicios usan PAPANC441
                    "ReferencePeriod": formatReferencePeriod(invoice.date),
                    "Service": config.code,
                    "Activity": config.activity,
                    "Pillar": config.pillar,
                    "BUCountry": "PA",
                    "ServiceCountry": "PA",
                    "ClientType": "MSCGVA",
                    "BusinessType": "I" // Siempre IMPORT para ShipChandler
                    // SubContracting eliminado según requerimientos
                  }
                  
                  // Agregar Commodity solo para el código WRH156 (requerimiento obligatorio)
                  if (config.code === 'WRH156') {
                    item["Commodity"] = "82"
                  }
                  
                  otherItems.push(item)
                  
                  lineNbr++
                }
              })
            })
            
            return otherItems
          })()
        }
      }
    }
  }
  
  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

// Función para validar el XML generado
export function validateXMLForSAP(xmlString: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  try {
    // Verificar que el XML es válido
    if (!xmlString.includes('ns1:LogisticARInvoices')) {
      errors.push("Falta el elemento raíz ns1:LogisticARInvoices")
    }
    
    if (!xmlString.includes('CustomerInvoice')) {
      errors.push("Falta el elemento CustomerInvoice")
    }
    
    // Verificar campos requeridos
    const requiredFields = [
      'CompanyCode',
      'DocumentType',
      'DocumentDate',
      'CustomerNbr',
      'AmntTransactCur'
    ]
    
    requiredFields.forEach(field => {
      if (!xmlString.includes(field)) {
        errors.push(`Falta el campo requerido: ${field}`)
      }
    })
    
    // Verificar formato de fechas (YYYYMMDD)
    const dateMatches = xmlString.match(/DocumentDate>(\d{8})</)
    if (dateMatches) {
      const date = dateMatches[1]
      const year = parseInt(date.substring(0, 4))
      const month = parseInt(date.substring(4, 6))
      const day = parseInt(date.substring(6, 8))
      
      if (year < 2020 || year > 2030) {
        errors.push("Año de fecha inválido")
      }
      if (month < 1 || month > 12) {
        errors.push("Mes de fecha inválido")
      }
      if (day < 1 || day > 31) {
        errors.push("Día de fecha inválido")
      }
    }
    
    // Verificar que hay al menos un item
    if (!xmlString.includes('OtherItem')) {
      errors.push("Debe haber al menos un item de servicio")
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
    
  } catch (error) {
    errors.push(`Error al validar XML: ${error}`)
    return {
      isValid: false,
      errors
    }
  }
}

// Función para generar un XML de prueba
export function generateTestXML(): string {
  const testInvoice: InvoiceForXmlPayload = {
    id: "TEST-001",
    module: "trucking",
    invoiceNumber: "F-DHL-01250",
    client: "1234567890",
    clientName: "DHL Express",
    date: "2025-07-04",
    dueDate: "2025-08-03",
    currency: "USD",
    total: 2485.00,
    records: [
      {
        id: "REC-001",
        description: "Servicio de transporte - Container: DHLU8901234",
        quantity: 1,
        unitPrice: 850.00,
        totalPrice: 850.00,
        serviceCode: "SRV100",
        activityCode: "CONTAINER",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "STANDARD",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "DHL_EXPRESS"
      },
      {
        id: "REC-002",
        description: "Servicio de almacenamiento - 7 días - Container: DHLU8901234",
        quantity: 7,
        unitPrice: 50.00,
        totalPrice: 350.00,
        serviceCode: "SRV200",
        activityCode: "STORAGE",
        unit: "DAYS",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "WAREHOUSE",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "STORAGE"
      },
      {
        id: "REC-003",
        description: "Servicio de manipulación de carga - Container: DHLU8901234",
        quantity: 1,
        unitPrice: 280.00,
        totalPrice: 280.00,
        serviceCode: "SRV300",
        activityCode: "HANDLING",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "TERMINAL",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "HANDLING"
      },
      {
        id: "REC-004",
        description: "Servicio de documentación y trámites aduaneros",
        quantity: 1,
        unitPrice: 150.00,
        totalPrice: 150.00,
        serviceCode: "SRV400",
        activityCode: "DOCUMENTATION",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "N/A",
        containerType: "N/A",
        containerIsoCode: "N/A",
        fullEmptyStatus: "EMPTY",
        route: "OFFICE",
        commodity: "DOCUMENTS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "DOCUMENTATION"
      },
      {
        id: "REC-005",
        description: "Seguro de carga internacional - Container: DHLU8901234",
        quantity: 1,
        unitPrice: 180.00,
        totalPrice: 180.00,
        serviceCode: "SRV500",
        activityCode: "INSURANCE",
        unit: "VIAJE",
        blNumber: "DHLGC987654",
        containerNumber: "DHLU8901234",
        containerSize: "40",
        containerType: "DV",
        containerIsoCode: "42G1",
        fullEmptyStatus: "FULL",
        route: "COVERAGE",
        commodity: "EXPRESS",
        driverName: "Juan Pérez",
        plate: "ABC-123",
        moveDate: "2025-07-04",
        associate: "INSURANCE"
      }
    ],
    status: "generated",
    driverId: "DRIVER-001",
    vehicleId: "VEHICLE-001",
    routeId: "ROUTE-001"
  }
  
  return generateInvoiceXML(testInvoice)
}

// Interfaces para Agency XML
export interface AgencyServiceForXml {
  _id: string
  pickupDate: string
  vessel: string
  crewMembers: Array<{
    name: string
    nationality: string
    crewRank: string
  }>
  pickupLocation: string
  dropoffLocation: string
  moveType: 'RT' | 'SINGLE'
  price: number
  currency: string
  waitingTime?: number // Waiting time en minutos
  waitingTimePrice?: number // Precio del waiting time para TRK137
}

export interface AgencyInvoiceForXml {
  invoiceNumber: string
  invoiceDate: string
  clientSapNumber: string
  services: AgencyServiceForXml[]
  /** Tarifa horaria WAITING_TIME_RATE; si se omite se usa 10 (mismo fallback que PDF agency). Si se envía 0, no se calcula por minutos. */
  waitingTimeHourlyRate?: number
  additionalService?: {
    amount: number
    description: string
  }
}

/** Importe TRK137 por servicio: prioriza waitingTimePrice > 0; si no, (minutos/60)*tarifa (como prefactura/PDF). */
function agencyServiceTrk137Amount(service: AgencyServiceForXml, hourlyRate: number): number {
  const wtMinutes = Number(service.waitingTime) || 0
  const raw = service.waitingTimePrice
  const fromApi = raw != null && raw !== '' ? Number(raw) : NaN
  if (!Number.isNaN(fromApi) && fromApi > 0) return fromApi
  if (wtMinutes > 0 && hourlyRate > 0) {
    return Math.round((wtMinutes / 60) * hourlyRate * 100) / 100
  }
  return 0
}

// Función para generar XML de Agency (Crew)
export function generateAgencyInvoiceXML(invoice: AgencyInvoiceForXml): string {
  // Validar datos requeridos
  if (!invoice.invoiceNumber || !invoice.clientSapNumber || !invoice.invoiceDate) {
    throw new Error("Datos requeridos faltantes para generar XML de Agency")
  }

  const hourlyForWaiting =
    invoice.waitingTimeHourlyRate != null ? invoice.waitingTimeHourlyRate : 10

  // Total = suma de precios + suma de waiting time efectivo (CLG098 + TRK137)
  const clg098Total = invoice.services.reduce((sum, service) => sum + (service.price || 0), 0)
  const trk137Total = invoice.services.reduce(
    (sum, service) => sum + agencyServiceTrk137Amount(service, hourlyForWaiting),
    0,
  )
  const totalAmount = clg098Total + trk137Total

  console.log('=== DEBUG: generateAgencyInvoiceXML ===')
  console.log('Number of services:', invoice.services.length)
  console.log('CLG098 Total:', clg098Total)
  console.log('TRK137 Total (Waiting Time):', trk137Total)
  console.log('Total Amount:', totalAmount)
  const waitingTimeLineCount = invoice.services.filter((s) => {
    const wtMinutes = Number(s.waitingTime) || 0
    const wtPrice = Number(s.waitingTimePrice) || 0
    return wtMinutes > 0 || wtPrice > 0
  }).length

  console.log('Services with waiting time:', waitingTimeLineCount)

  // Un solo OtherItem CLG098 (trayecto) y uno TRK137 (waiting), con montos y cantidades acumuladas
  const otherItems: any[] = []
  const refPeriod = formatReferencePeriod(invoice.invoiceDate)

  if (invoice.services.length > 0) {
    otherItems.push({
      IncomeRebateCode: 'I',
      AmntTransacCur: (-clg098Total).toFixed(2),
      BaseUnitMeasure: 'EA',
      Qty: invoice.services.length.toFixed(2),
      ProfitCenter: 'PAPANC440',
      ReferencePeriod: refPeriod,
      Service: 'CLG098',
      Activity: 'CLG',
      Pillar: 'LOGS',
      BUCountry: 'PA',
      ServiceCountry: 'PA',
      ClientType: 'MSCGVA',
    })
  }

  if (waitingTimeLineCount > 0) {
    otherItems.push({
      IncomeRebateCode: 'I',
      AmntTransacCur: (-trk137Total).toFixed(2),
      BaseUnitMeasure: 'EA',
      Qty: waitingTimeLineCount.toFixed(2),
      ProfitCenter: 'PAPANC440',
      ReferencePeriod: refPeriod,
      Service: 'TRK137',
      Activity: 'TRK',
      Pillar: 'TRSP',
      BUCountry: 'PA',
      ServiceCountry: 'PA',
      ClientType: 'MSCGVA',
    })
  }

  console.log('Total OtherItems generated:', otherItems.length, '(CLG098 + TRK137 agregados)')

  const xmlObject = {
    "ns1:LogisticARInvoices": {
      _attributes: {
        "xmlns:ns1": "urn:medlog.com:MSC_GVA_FS:CustomerInvoice:01.00"
      },
      "CustomerInvoice": {
        // Protocol Section - específico para CREW
        "Protocol": {
          "SourceSystem": "CREW",
          "TechnicalContact": "E-almeida.kant@msc.com;E-renee.taylor@msc.com"
        },
        // Header Section
        "Header": {
          "CompanyCode": "9326",
          "DocumentType": "XL",
          "DocumentDate": formatDateForXML(invoice.invoiceDate),
          "PostingDate": formatDateForXML(invoice.invoiceDate),
          "TransactionCurrency": "USD",
          "Reference": invoice.invoiceNumber,
          "EntityDocNbr": invoice.invoiceNumber
        },
        // AdditionalTexts Section
        "AdditionalTexts": {
          "LongHeaderTextLangKey": "EN"
        },
        // CustomerOpenItem Section - monto en POSITIVO
        "CustomerOpenItem": {
          "CustomerNbr": invoice.clientSapNumber,
          "AmntTransactCur": totalAmount.toFixed(2),
          "BaselineDate": formatDateForXML(invoice.invoiceDate),
          "DueDate": calculateDueDate(invoice.invoiceDate)
        },
        // OtherItems Section - items dinámicos según servicios
        "OtherItems": {
          "OtherItem": otherItems
        }
      }
    }
  }

  const xmlContent = js2xml(xmlObject, { compact: true, spaces: 2 })
  
  // Agregar la declaración XML al principio
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlContent
}

// Función para probar conexión SFTP
export async function testSftpConnection() {
  try {
    const response = await fetch('/api/invoices/test-sftp-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al probar conexión SFTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al probar conexión SFTP:', error)
    throw error
  }
}

// Función para probar conexión FTP tradicional
export async function testFtpTraditional() {
  try {
    const response = await fetch('/api/invoices/test-ftp-traditional', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al probar conexión FTP tradicional')
    }

    return result
  } catch (error: any) {
    console.error('Error al probar conexión FTP tradicional:', error)
    throw error
  }
}

// Función para enviar XML a SAP vía SFTP
export async function sendXmlToSapSftp(invoiceId: string, xmlContent: string, fileName: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/send-xml-to-sap-sftp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        xmlContent,
        fileName
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al enviar XML a SAP via SFTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al enviar XML a SAP via SFTP:', error)
    throw error
  }
}

// Función para enviar XML a SAP vía FTP tradicional
export async function sendXmlToSapFtp(invoiceId: string, xmlContent: string, fileName: string) {
  try {
    const response = await fetch(`/api/invoices/${invoiceId}/send-xml-to-sap-ftp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        xmlContent,
        fileName
      })
    })

    const result = await response.json()
    
    if (!response.ok) {
      throw new Error(result.message || 'Error al enviar XML a SAP via FTP')
    }

    return result
  } catch (error: any) {
    console.error('Error al enviar XML a SAP via FTP:', error)
    throw error
  }
}
