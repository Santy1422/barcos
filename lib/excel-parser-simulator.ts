import { faker } from "@faker-js/faker"

// --- Tipos de Datos Generados ---
// (Estos tipos ayudan a la claridad, pero no son estrictamente necesarios si prefieres no exportarlos)
export interface SupplyOrderRecord {
  id: number
  vesselName: string
  vesselIMO: string
  eta: string
  etd: string
  agent: string
  productCode: string
  productName: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  supplier: string
  deliveryDate: string
  status: string
}

export interface CrewTransportRecord {
  id: number
  vesselName: string
  voyage: string
  crewMember: string
  rank: string
  nationality: string
  pickupLocation: string
  dropoffLocation: string
  pickupTime: string
  vehicleType: string
  driver: string
  baseRate: number
  rankSurcharge: number
  totalRate: number
  status: string
}

// --- Generadores de Datos para Shipchandler ---

const generateSupplyOrderData = (count: number): SupplyOrderRecord[] => {
  return Array.from({ length: count }, (_, i) => {
    const quantity = faker.number.int({ min: 10, max: 500 })
    const unitPrice = faker.number.float({ min: 50, max: 1200, precision: 0.01 })
    return {
      id: i + 1,
      vesselName: `MSC ${faker.commerce.productName().split(" ")[0].toUpperCase()}`,
      vesselIMO: faker.string.alphanumeric(7).toUpperCase(),
      eta: faker.date.soon().toISOString(),
      etd: faker.date.soon({ days: 2 }).toISOString(),
      agent: `${faker.company.name()} Agency`,
      productCode: faker.string.alphanumeric(6).toUpperCase(),
      productName: faker.commerce.productName(),
      quantity,
      unit: faker.helpers.arrayElement(["MT", "Kg", "Litros", "Unidad"]),
      unitPrice,
      totalPrice: quantity * unitPrice,
      supplier: faker.company.name(),
      deliveryDate: faker.date.soon().toISOString().split("T")[0],
      status: faker.helpers.arrayElement(["Pendiente", "Confirmado"]),
    }
  })
}

// --- Generadores de Datos para Agency ---

const generateCrewTransportData = (count: number): CrewTransportRecord[] => {
  return Array.from({ length: count }, (_, i) => {
    const baseRate = faker.number.int({ min: 20, max: 50 })
    const rankSurcharge = faker.number.int({ min: 5, max: 20 })
    return {
      id: i + 1,
      vesselName: `MV ${faker.commerce.productName().split(" ")[0]}`,
      voyage: faker.string.alphanumeric(6).toUpperCase(),
      crewMember: faker.person.fullName(),
      rank: faker.helpers.arrayElement(["Captain", "Chief Officer", "Chief Engineer", "Third Engineer", "Crew"]),
      nationality: faker.location.country(),
      pickupLocation: faker.helpers.arrayElement(["Aeropuerto Tocumen", "Hotel Marriott", "Puerto de Balboa"]),
      dropoffLocation: faker.helpers.arrayElement(["Puerto de Cristóbal", "Oficina Central", "Clínica San Fernando"]),
      pickupTime: `${faker.number.int({ min: 0, max: 23 }).toString().padStart(2, "0")}:${faker.number.int({ min: 0, max: 59 }).toString().padStart(2, "0")}`,
      vehicleType: faker.helpers.arrayElement(["Sedan", "Van", "Bus"]),
      driver: faker.person.fullName(),
      baseRate,
      rankSurcharge,
      totalRate: baseRate + (baseRate * rankSurcharge) / 100,
      status: faker.helpers.arrayElement(["Programado", "Completado", "Cancelado"]),
    }
  })
}

// --- Función Principal del Simulador ---

type Module = "trucking" | "shipchandler" | "agency"
type ExcelType = string // 'supply-order', 'crew-transport', etc.

export const simulateExcelParse = (module: Module, type: ExcelType): any[] => {
  const recordCount = faker.number.int({ min: 5, max: 30 }) // Generar un número aleatorio de registros

  if (module === "shipchandler") {
    switch (type) {
      case "supply-order":
        return generateSupplyOrderData(recordCount)
      // Añadir casos para 'inventory', 'vessel-manifest', 'delivery-note' si se desea
      default:
        return [] // Retorna vacío si el tipo no tiene un generador
    }
  }

  if (module === "agency") {
    switch (type) {
      case "crew-transport":
        return generateCrewTransportData(recordCount)
      // Añadir casos para 'crew-manifest', etc.
      default:
        return []
    }
  }

  // Añadir lógica para 'trucking' si también se quiere dinamizar
  if (module === "trucking") {
    // ...
  }

  return [] // Retorna un array vacío por defecto
}
