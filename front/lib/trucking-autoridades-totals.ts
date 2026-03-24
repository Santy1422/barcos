/**
 * Une registros del mismo BL desde la tabla actual (`groupedByBL`) y el caché de selección.
 * Evita subtotales bajos cuando el caché quedó incompleto (p. ej. selección antes de cargar datos
 * o respuesta distinta en "seleccionar todos" vía API).
 */
export function mergeBlGroupRecords(
  fromGrouped: any[] | undefined,
  fromCache: any[] | undefined
): any[] {
  const merged = new Map<string, any>()
  const add = (r: any) => {
    if (!r) return
    const id = r._id ?? r.id
    if (id != null && id !== "") {
      merged.set(String(id), r)
    } else {
      merged.set(`__noid_${merged.size}_${JSON.stringify(r).slice(0, 80)}`, r)
    }
  }
  ;(fromGrouped || []).forEach(add)
  ;(fromCache || []).forEach(add)
  return Array.from(merged.values())
}

/**
 * Misma aritmética que generateAuthXML (trucking-facturacion-modal.tsx):
 * - SEAL: suma por fila de parseFloat(seal) || 0 (todas las filas del BL).
 * - NOTF: filtro idéntico al XML, luego suma parseFloat(notf) || 0 por fila incluida.
 */
export function sumAutoridadesBLAmount(groupRecords: any[]): {
  notfTotal: number
  sealTotal: number
} {
  const sealTotal = groupRecords.reduce(
    (sum, r: any) => sum + (parseFloat(r.seal) || 0),
    0
  )
  const notfRecords = groupRecords.filter(
    (r: any) =>
      r.order &&
      !isNaN(parseFloat(r.order)) &&
      r.notf &&
      parseFloat(r.notf) > 0
  )
  const notfTotal = notfRecords.reduce(
    (sum, r: any) => sum + (parseFloat(r.notf) || 0),
    0
  )
  return { notfTotal, sealTotal }
}

export function totalAutoridadesBL(groupRecords: any[]): number {
  const { notfTotal, sealTotal } = sumAutoridadesBLAmount(groupRecords)
  return notfTotal + sealTotal
}
