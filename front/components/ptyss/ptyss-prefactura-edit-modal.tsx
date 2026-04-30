import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { useToast } from "@/hooks/use-toast"
import { selectServicesByModule, fetchServices, selectServicesLoading } from "@/lib/features/services/servicesSlice"
import { updateInvoiceAsync, updateRecordAsync } from "@/lib/features/records/recordsSlice"
import { findFixedServiceByLegacyKey, getLegacyCodeFromServiceId, getSapCodeForService, isFixedLocalService, isFixedLocalServiceId } from "@/lib/constants/fixedLocalServices"
import { createApiUrl } from "@/lib/api-config"

export function PTYSSPrefacturaEditModal({ open, onOpenChange, invoice, allRecords, onClose, onEditSuccess }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  invoice: any,
  allRecords: any[],
  onClose: () => void,
  onEditSuccess?: () => void
}) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const services = useAppSelector(state => selectServicesByModule(state, "ptyss"))
  const servicesLoading = useAppSelector(selectServicesLoading)

  const [form, setForm] = useState({
    invoiceNumber: "",
    notes: "",
    fixedServices: {
      ti: "",
      estadia: "",
      genset: "",
      retencion: "",
      pesaje: ""
    },
    additionalServices: [] as Array<{ serviceId: string, name: string, description: string, amount: number }>
  })
  const [currentServiceToAdd, setCurrentServiceToAdd] = useState<any>(null)
  const [currentServiceAmount, setCurrentServiceAmount] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)
  const [fixedLocalServices, setFixedLocalServices] = useState<any[]>([])
  const nonFixedAdditionalServices = form.additionalServices.filter(service => !isFixedLocalServiceId(service.serviceId))

  const getFixedLocalServicePrice = (legacyCode: string, sourceServices: any[] = fixedLocalServices): number => {
    // Mismo lookup que usa PTYSS Upload para evitar desalineaciones.
    const service = findFixedServiceByLegacyKey(sourceServices, legacyCode)
    return Number.isFinite(Number(service?.price)) ? Number(service.price) : 0
  }

  const calculateTotalValueLikeUpload = (recordData: any, sourceServices: any[]): number => {
    let total = 0

    const localRoutePrice = Number(recordData?.localRoutePrice) || 0
    if (localRoutePrice) total += localRoutePrice

    const getServicePrice = (serviceCode: string): number => getFixedLocalServicePrice(serviceCode, sourceServices)

    if (recordData?.ti === "si") total += getServicePrice("CLG097")
    if (recordData?.estadia === "si") total += getServicePrice("TRK179")

    const gensetDays = parseFloat(recordData?.genset || "0")
    if (!isNaN(gensetDays) && gensetDays > 0) total += gensetDays * getServicePrice("SLR168")

    const retencionDaysTotal = parseFloat(recordData?.retencion || "0")
    if (!isNaN(retencionDaysTotal) && retencionDaysTotal > 3) {
      const diasACobrar = retencionDaysTotal - 3
      total += diasACobrar * getServicePrice("TRK163")
    }

    if (recordData?.pesaje) total += parseFloat(recordData.pesaje) || 0

    return total
  }

  const fetchFixedLocalServices = async (): Promise<any[]> => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(createApiUrl("/api/local-services"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      })
      if (!response.ok) return []
      const data = await response.json()
      const allServices = data.data?.services || []
      const fixed = allServices.filter((service: any) => isFixedLocalService(service))
      setFixedLocalServices(fixed)
      return fixed
    } catch {
      setFixedLocalServices([])
      return []
    }
  }

  useEffect(() => {
    if (open && invoice) {
      const storedAdditionalServices = Array.isArray(invoice.details?.additionalServices)
        ? invoice.details.additionalServices
        : []
      const relatedIds = Array.isArray(invoice.relatedRecordIds) ? invoice.relatedRecordIds : []
      const relatedLocalRecord = allRecords.find((record: any) => {
        const recordId = record?._id || record?.id
        if (!relatedIds.includes(recordId)) return false
        const data = record?.data || {}
        return data?.recordType === "local" || data?.clientId || data?.order || data?.naviera
      })
      const localData = relatedLocalRecord?.data || {}
      const getFixedAmount = (legacyCode: string) => {
        const sapCode = getSapCodeForService(legacyCode)
        const fixedService = storedAdditionalServices.find((service: any) => {
          const normalizedServiceId = getLegacyCodeFromServiceId(service.serviceId || "")
          return normalizedServiceId === legacyCode || service.serviceId === sapCode
        })
        return Number(fixedService?.amount) || 0
      }

      const gensetPrice = getFixedLocalServicePrice("SLR168")
      const retencionPrice = getFixedLocalServicePrice("TRK163")
      const gensetAmount = getFixedAmount("SLR168")
      const retencionAmount = getFixedAmount("TRK163")

      setForm({
        invoiceNumber: invoice.invoiceNumber || "",
        notes: invoice.notes || "",
        fixedServices: {
          ti: typeof localData?.ti === "string" ? localData.ti : (getFixedAmount("CLG097") > 0 ? "si" : "no"),
          estadia: typeof localData?.estadia === "string" ? localData.estadia : (getFixedAmount("TRK179") > 0 ? "si" : "no"),
          genset: localData?.genset != null && String(localData.genset).trim() !== ""
            ? String(localData.genset)
            : (gensetAmount > 0 && gensetPrice > 0 ? String(Math.round(gensetAmount / gensetPrice)) : ""),
          retencion: localData?.retencion != null && String(localData.retencion).trim() !== ""
            ? String(localData.retencion)
            : (retencionAmount > 0 && retencionPrice > 0 ? String(Math.round(retencionAmount / retencionPrice) + 3) : ""),
          pesaje: localData?.pesaje != null && String(localData.pesaje).trim() !== ""
            ? String(localData.pesaje)
            : (getFixedAmount("TRK196") > 0 ? String(getFixedAmount("TRK196")) : "")
        },
        additionalServices: storedAdditionalServices.filter((service: any) => !isFixedLocalServiceId(service.serviceId))
      })
    }
  }, [open, invoice, allRecords])

  useEffect(() => {
    if (open) dispatch(fetchServices("ptyss"))
  }, [open, dispatch])

  useEffect(() => {
    if (!open) return
    fetchFixedLocalServices()
  }, [open])

  const handleAddService = () => {
    if (!currentServiceToAdd || currentServiceAmount <= 0) return
    if (form.additionalServices.some(s => s.serviceId === currentServiceToAdd._id)) return
    setForm(f => ({
      ...f,
      additionalServices: [
        ...f.additionalServices,
        {
          serviceId: currentServiceToAdd._id,
          name: currentServiceToAdd.name,
          description: currentServiceToAdd.description,
          amount: currentServiceAmount
        }
      ]
    }))
    setCurrentServiceToAdd(null)
    setCurrentServiceAmount(0)
  }

  const handleRemoveService = (serviceId: string) => {
    setForm(f => ({
      ...f,
      additionalServices: f.additionalServices.filter(s => s.serviceId !== serviceId)
    }))
  }

  const handleUpdateServiceAmount = (serviceId: string, amount: number) => {
    setForm(f => ({
      ...f,
      additionalServices: f.additionalServices.map(s => s.serviceId === serviceId ? { ...s, amount } : s)
    }))
  }

  const handleSave = async () => {
    if (!invoice) return

    setIsSaving(true)
    try {
      const normalizeAmount = (value: unknown) => {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
      }
      // Reconstruir base sin adicionales para evitar doble suma al editar/quitar servicios.
      const previousAdditionalServices = Array.isArray(invoice.details?.additionalServices)
        ? invoice.details.additionalServices
        : []
      const previousAdditionalServicesTotal = previousAdditionalServices.reduce(
        (sum: number, service: { amount?: number }) => sum + normalizeAmount(service.amount),
        0
      )
      const persistedTotal = normalizeAmount(invoice.totalAmount ?? invoice.subtotal)
      const baseAmountWithoutAdditional = Math.max(0, persistedTotal - previousAdditionalServicesTotal)

      const fixedServicesSource = fixedLocalServices.length > 0 ? fixedLocalServices : await fetchFixedLocalServices()

      const fixedCalculatedServices: Array<{ serviceId: string, name: string, description: string, amount: number }> = []
      const tiPrice = getFixedLocalServicePrice("CLG097", fixedServicesSource)
      if (form.fixedServices.ti === "si" && tiPrice > 0) {
        fixedCalculatedServices.push({
          serviceId: "CLG097",
          name: "TI",
          description: "Customs/TI",
          amount: tiPrice
        })
      }

      const estadiaPrice = getFixedLocalServicePrice("TRK179", fixedServicesSource)
      if (form.fixedServices.estadia === "si" && estadiaPrice > 0) {
        fixedCalculatedServices.push({
          serviceId: "TRK179",
          name: "Estadia",
          description: "Storage/Estadia",
          amount: estadiaPrice
        })
      }

      const gensetDays = normalizeAmount(form.fixedServices.genset)
      const gensetPrice = getFixedLocalServicePrice("SLR168", fixedServicesSource)
      if (gensetDays > 0 && gensetPrice > 0) {
        fixedCalculatedServices.push({
          serviceId: "SLR168",
          name: "Genset",
          description: "Genset Rental",
          amount: gensetDays * gensetPrice
        })
      }

      const retencionDays = normalizeAmount(form.fixedServices.retencion)
      const retencionPrice = getFixedLocalServicePrice("TRK163", fixedServicesSource)
      if (retencionDays > 3 && retencionPrice > 0) {
        fixedCalculatedServices.push({
          serviceId: "TRK163",
          name: "Retención",
          description: "Demurrage/Retención",
          amount: (retencionDays - 3) * retencionPrice
        })
      }

      const pesajeAmount = normalizeAmount(form.fixedServices.pesaje)
      if (pesajeAmount > 0) {
        fixedCalculatedServices.push({
          serviceId: "TRK196",
          name: "Pesaje",
          description: "Pesaje",
          amount: pesajeAmount
        })
      }

      const normalizedAdditionalServices = form.additionalServices
        .map(service => ({
          ...service,
          amount: normalizeAmount(service.amount)
        }))
        .filter(service => service.amount > 0)

      const servicesToPersist = [...fixedCalculatedServices, ...normalizedAdditionalServices]

      const additionalServicesTotal = servicesToPersist.reduce(
        (sum, service) => sum + normalizeAmount(service.amount),
        0
      )
      const newTotalAmount = baseAmountWithoutAdditional + additionalServicesTotal

      const updates = {
        invoiceNumber: form.invoiceNumber,
        notes: form.notes,
        subtotal: newTotalAmount,
        totalAmount: newTotalAmount,
        details: {
          ...invoice.details,
          additionalServices: servicesToPersist
        }
      }

      const relatedIds = Array.isArray(invoice.relatedRecordIds) ? invoice.relatedRecordIds : []
      const relatedLocalRecords = allRecords.filter((record: any) => {
        const recordId = record?._id || record?.id
        if (!relatedIds.includes(recordId)) return false
        const data = record?.data || {}
        return data?.recordType === "local" || data?.clientId || data?.order || data?.naviera
      })

      if (relatedLocalRecords.length > 0) {
        for (const record of relatedLocalRecords) {
          const recordId = record?._id || record?.id
          const data = record?.data || {}
          const updatedRecordData = {
            ...data,
            ti: (form.fixedServices.ti || "no").toLowerCase(),
            estadia: (form.fixedServices.estadia || "no").toLowerCase(),
            genset: form.fixedServices.genset || "",
            retencion: form.fixedServices.retencion || "",
            pesaje: form.fixedServices.pesaje || ""
          }
          const totalValue = calculateTotalValueLikeUpload(updatedRecordData, fixedServicesSource)

          await dispatch(updateRecordAsync({
            id: recordId,
            updates: {
              data: { ...updatedRecordData, totalValue },
              totalValue
            }
          })).unwrap()
        }
      }

      await dispatch(updateInvoiceAsync({ id: invoice.id, updates })).unwrap()

      toast({
        title: "Prefactura actualizada",
        description: "Los cambios han sido guardados exitosamente.",
      })

      onClose()
      onEditSuccess?.()
    } catch (error: any) {
      toast({
        title: "Error al actualizar",
        description: error.message || "Error al guardar los cambios",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Prefactura</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Número de Prefactura</Label>
            <Input
              id="invoiceNumber"
              value={form.invoiceNumber}
              onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Servicios</Label>
            <p className="text-xs text-slate-600">
              Servicios locales fijos. Si dejas el valor en 0, vacío o N/A no se factura.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-estadia">Estadia</Label>
                <select
                  id="edit-estadia"
                  className="border rounded px-2 py-1 w-full"
                  value={form.fixedServices.estadia}
                  onChange={e => setForm(f => ({ ...f, fixedServices: { ...f.fixedServices, estadia: e.target.value } }))}
                >
                  <option value="">Seleccionar</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-ti">TI</Label>
                <select
                  id="edit-ti"
                  className="border rounded px-2 py-1 w-full"
                  value={form.fixedServices.ti}
                  onChange={e => setForm(f => ({ ...f, fixedServices: { ...f.fixedServices, ti: e.target.value } }))}
                >
                  <option value="">Seleccionar</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-genset">Genset</Label>
                <Input
                  id="edit-genset"
                  type="number"
                  value={form.fixedServices.genset}
                  onChange={e => setForm(f => ({ ...f, fixedServices: { ...f.fixedServices, genset: e.target.value } }))}
                  placeholder="Días"
                  min="0"
                  step="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-retencion">Retención</Label>
                <Input
                  id="edit-retencion"
                  type="number"
                  value={form.fixedServices.retencion}
                  onChange={e => setForm(f => ({ ...f, fixedServices: { ...f.fixedServices, retencion: e.target.value } }))}
                  placeholder="Días"
                  min="0"
                  step="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-pesaje">Pesaje ($)</Label>
                <Input
                  id="edit-pesaje"
                  type="text"
                  value={form.fixedServices.pesaje}
                  onChange={e => setForm(f => ({ ...f, fixedServices: { ...f.fixedServices, pesaje: e.target.value } }))}
                  placeholder="Ingrese monto o N/A"
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Servicios adicionales</Label>
            <div className="flex gap-2">
              {servicesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/60 p-3 rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando servicios...
                </div>
              ) : (
                <>
                  <select
                    className="border rounded px-2 py-1"
                    value={currentServiceToAdd?._id || ""}
                    onChange={e => {
                      const service = services.find(s => s._id === e.target.value)
                      setCurrentServiceToAdd(service || null)
                    }}
                  >
                    <option value="">Seleccionar servicio...</option>
                    {services
                      .filter(s => !form.additionalServices.some(a => a.serviceId === s._id))
                      .filter(s => !isFixedLocalServiceId(s._id))
                      .map(service => (
                      <option key={service._id} value={service._id}>{service.name} - {service.description}</option>
                    ))}
                  </select>
                  <Input
                    type="number"
                    value={currentServiceAmount}
                    onChange={e => setCurrentServiceAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-24"
                  />
                  <Button onClick={handleAddService} disabled={!currentServiceToAdd || currentServiceAmount <= 0}>
                    <Plus className="h-4 w-4 mr-1" /> Agregar
                  </Button>
                </>
              )}
            </div>
            {nonFixedAdditionalServices.length > 0 && (
              <div className="space-y-2 mt-2">
                {nonFixedAdditionalServices.map(service => (
                  <div key={service.serviceId} className="flex items-center gap-2 bg-slate-50 border rounded p-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{service.name}</div>
                      <div className="text-xs text-slate-600">{service.description}</div>
                    </div>
                    <Input
                      type="number"
                      value={service.amount}
                      onChange={e => handleUpdateServiceAmount(service.serviceId, parseFloat(e.target.value) || 0)}
                      className="w-20"
                    />
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveService(service.serviceId)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
} 