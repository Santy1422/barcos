/**
 * Servicios locales fijos PTYSS: mapeo entre códigos legacy (BD) y códigos SAP actuales.
 * La BD de producción mantiene los códigos legacy; sapCode se usa para facturación/XML.
 */

export const FIXED_LOCAL_SERVICE_MAP = {
  /** Customs/TI */
  CUSTOMS_TI: { legacy: 'CLG097', sap: 'CHB123' },
  /** Demurrage/Retención */
  DEMURRAGE: { legacy: 'TRK163', sap: 'RAI160' },
  /** Storage/Estadía */
  STORAGE: { legacy: 'TRK179', sap: 'ICD029' },
  /** Genset Rental */
  GENSET: { legacy: 'SLR168', sap: 'TRK005' },
  /** Pesaje */
  PESAJE: { legacy: 'TRK196', sap: 'WRH146' },
} as const

/** Códigos legacy (en BD). Usar para buscar servicios por code en la API. */
export const FIXED_LOCAL_LEGACY_CODES = Object.values(FIXED_LOCAL_SERVICE_MAP).map((m) => m.legacy)

/** Códigos SAP nuevos. Usar para filtrar servicios por sapCode cuando ya estén actualizados en BD. */
export const FIXED_LOCAL_SAP_CODES = Object.values(FIXED_LOCAL_SERVICE_MAP).map((m) => m.sap)

/** Todos los códigos que identifican un servicio fijo (legacy + sap) para filtrar en listas. */
export const FIXED_LOCAL_ALL_CODES = [...new Set([...FIXED_LOCAL_LEGACY_CODES, ...FIXED_LOCAL_SAP_CODES])]

/**
 * Indica si un servicio (con code y/o sapCode) es uno de los servicios locales fijos.
 */
export function isFixedLocalService(service: { code?: string; sapCode?: string }): boolean {
  const c = service.code ?? ''
  const s = service.sapCode ?? ''
  return FIXED_LOCAL_LEGACY_CODES.includes(c) || FIXED_LOCAL_SAP_CODES.includes(s)
}

/**
 * Indica si un serviceId (string) corresponde a un servicio local fijo (legacy o sap).
 */
export function isFixedLocalServiceId(serviceId: string): boolean {
  return FIXED_LOCAL_ALL_CODES.includes(serviceId) || serviceId === 'PESAJE'
}

/** Legacy codes de los 4 servicios con precio configurable (excluye Pesaje). */
const FIXED_WITH_PRICE_LEGACY = ['CLG097', 'TRK163', 'TRK179', 'SLR168']

/**
 * Indica si el serviceId es uno de los 4 servicios locales fijos con precio en config (Customs, Demurrage, Storage, Genset).
 */
export function isFixedLocalServiceWithConfigurablePrice(serviceId: string): boolean {
  const legacy = getLegacyCodeFromServiceId(serviceId)
  return FIXED_WITH_PRICE_LEGACY.includes(legacy)
}

/**
 * Dado un código (legacy o sap), devuelve el código SAP a usar en XML/facturación.
 * Si el código no está en el mapa, devuelve el mismo (ej. CLG096, PESAJE).
 */
export function getSapCodeForService(serviceId: string): string {
  for (const entry of Object.values(FIXED_LOCAL_SERVICE_MAP)) {
    if (entry.legacy === serviceId) return entry.sap
    if (entry.sap === serviceId) return entry.sap
  }
  // PESAJE legacy alias
  if (serviceId === 'PESAJE') return FIXED_LOCAL_SERVICE_MAP.PESAJE.sap
  return serviceId
}

/**
 * Dado un serviceId (legacy o sap), devuelve el código legacy para lógica interna (ej. pillarValue).
 */
export function getLegacyCodeFromServiceId(serviceId: string): string {
  if (serviceId === 'PESAJE') return FIXED_LOCAL_SERVICE_MAP.PESAJE.legacy
  for (const entry of Object.values(FIXED_LOCAL_SERVICE_MAP)) {
    if (entry.legacy === serviceId || entry.sap === serviceId) return entry.legacy
  }
  return serviceId
}

/**
 * Dado un servicio (con code y/o sapCode), devuelve el código a usar para SAP/XML.
 */
export function getSapCodeFromService(service: { code?: string; sapCode?: string }): string {
  if (service.sapCode) return service.sapCode
  if (service.code) return getSapCodeForService(service.code)
  return ''
}

/** Tipo: clave legacy usada en estado de precios (CLG097, TRK163, etc.). */
export type FixedLocalServiceLegacyKey = keyof typeof FIXED_LOCAL_SERVICE_MAP extends infer K
  ? K extends string
    ? (typeof FIXED_LOCAL_SERVICE_MAP)[K]['legacy']
    : never
  : never

/**
 * Devuelve la clave legacy para un servicio (para indexar precios en estado).
 * Si el servicio tiene code legacy, la devuelve; si solo tiene sapCode, devuelve el legacy correspondiente.
 */
export function getLegacyKeyForService(service: { code?: string; sapCode?: string }): string | undefined {
  if (service.code && FIXED_LOCAL_LEGACY_CODES.includes(service.code)) return service.code
  if (service.sapCode) {
    for (const entry of Object.values(FIXED_LOCAL_SERVICE_MAP)) {
      if (entry.sap === service.sapCode) return entry.legacy
    }
  }
  return undefined
}

/**
 * Busca en la lista el servicio fijo que corresponde a la clave legacy (ej. CLG097).
 */
export function findFixedServiceByLegacyKey<T extends { code?: string; sapCode?: string }>(
  services: T[],
  legacyKey: string
): T | undefined {
  const entry = Object.values(FIXED_LOCAL_SERVICE_MAP).find((e) => e.legacy === legacyKey)
  if (!entry) return undefined
  return services.find(
    (s) => s.code === entry.legacy || s.sapCode === entry.sap
  )
}
