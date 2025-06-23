import { faker } from "@faker-js/faker"

// --- Tipos de Datos Generados ---
export interface SupplyOrderRecord {
  id: number
  fecha: string // FECHA
  clientes: string // CLIENTES
  desde: string // DESDE
  subClientes: string // SUB-CLIENTES
  hacia: string // HACIA
  bl: string // B/L
  buque: string // BUQUE
  tamano: string // TAMAÑO
  numeroContenedor: string // N° CONTENEDOR
  ptgOrder: string // PTG ORDER
  status: string // STATUS
  voyage: string // VOYAGE
  tarifa: number // TARIFA
  gastosPuerto: string // GASTOS PUERTO
  otrosGastos: number // OTROS GASTOS
  jira: string // JIRA
  fechaFacturacion: string // FECHA FACTURACION
  driver: string // DRIVER
  plate: string // PLATE
  bono: number // BONO
  rtContainer: string // RT CONTAINER
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
    const tarifa = faker.number.float({ min: 15, max: 200, precision: 0.01 })
    const otrosGastos = faker.number.float({ min: 0, max: 50, precision: 0.01 })
    const bono = faker.number.float({ min: 0, max: 100, precision: 0.01 })
    
    return {
      id: i + 1,
      fecha: faker.date.past().toLocaleDateString('en-US'), // MM/DD/YYYY format
      clientes: faker.helpers.arrayElement([
        "ALMEIDA KANT", 
        "SUPERMERCADO XXXXXX", 
        "MSC PANAMA", 
        "EVERGREEN MARINE"
      ]),
      desde: faker.helpers.arrayElement(["MIT", "PSA", "JCAIN", "CCT", "BLB"]),
      subClientes: faker.helpers.arrayElement(["SEB", "MSC", "MULTI SERVICES LOGISTICS"]),
      hacia: faker.helpers.arrayElement(["BLB", "CTB", "CCT", "BIQUE", "MIT"]),
      bl: faker.string.alphanumeric(10).toUpperCase(),
      buque: faker.helpers.arrayElement([
        "X-PRESS SHANNON", 
        "MAERSK SHIVLING", 
        "MSC BIANCA", 
        "MSC TAYLOR", 
        "MSC RAPALLO",
        "ASPAULI",
        "ARSOS"
      ]),
      tamano: faker.helpers.arrayElement(["20", "40", "45"]),
      numeroContenedor: faker.string.alphanumeric(11).toUpperCase(),
      ptgOrder: faker.helpers.arrayElement([
        faker.number.int({ min: 100000, max: 999999 }).toString(),
        "0"
      ]),
      status: faker.helpers.arrayElement(["RT", "IMPORT", "EXPORT"]),
      voyage: faker.string.alphanumeric(6).toUpperCase(),
      tarifa: tarifa,
      gastosPuerto: faker.helpers.arrayElement([
        "SEA #505", 
        "MSC #505", 
        "MSC 513", 
        "SEA #521", 
        "39.00"
      ]),
      otrosGastos: otrosGastos,
      jira: faker.helpers.arrayElement([
        faker.string.alphanumeric(8).toUpperCase(),
        "TRUCK-" + faker.number.int({ min: 1000, max: 9999 })
      ]),
      fechaFacturacion: faker.date.recent().toLocaleDateString('en-US'),
      driver: faker.helpers.arrayElement([
        "Matos Luis", 
        "García Eric", 
        "Ramirez Felipe", 
        "Hidalgo Uribiades"
      ]),
      plate: faker.string.alphanumeric(7).toUpperCase(),
      bono: bono,
      rtContainer: faker.string.alphanumeric(11).toUpperCase()
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
