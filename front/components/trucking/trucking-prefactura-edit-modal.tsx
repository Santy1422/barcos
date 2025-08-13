"use client"

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
import { updateInvoiceAsync } from "@/lib/features/records/recordsSlice"

export function TruckingPrefacturaEditModal({ open, onOpenChange, invoice, onClose, onEditSuccess }: {
  open: boolean,
  onOpenChange: (open: boolean) => void,
  invoice: any,
  onClose: () => void,
  onEditSuccess?: () => void
}) {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  const services = useAppSelector(state => selectServicesByModule(state, "trucking"))
  const servicesLoading = useAppSelector(selectServicesLoading)

  const [form, setForm] = useState({
    invoiceNumber: "",
    notes: "",
    additionalServices: [] as Array<{ serviceId: string, name: string, description: string, amount: number }>
  })
  const [currentServiceToAdd, setCurrentServiceToAdd] = useState<any>(null)
  const [currentServiceAmount, setCurrentServiceAmount] = useState<number>(0)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && invoice) {
      setForm({
        invoiceNumber: invoice.invoiceNumber || "",
        notes: invoice.notes || "",
        additionalServices: invoice.details?.additionalServices || []
      })
    }
  }, [open, invoice])

  useEffect(() => {
    if (open) dispatch(fetchServices("trucking"))
  }, [open, dispatch])

  const handleAddService = () => {
    if (!currentServiceToAdd || currentServiceAmount <= 0) return
    if (form.additionalServices.some(s => s.serviceId === currentServiceToAdd._id)) return
    setForm(f => ({
      ...f,
      additionalServices: [...f.additionalServices, { serviceId: currentServiceToAdd._id, name: currentServiceToAdd.name, description: currentServiceToAdd.description, amount: currentServiceAmount }]
    }))
    setCurrentServiceToAdd(null)
    setCurrentServiceAmount(0)
  }

  const handleRemoveService = (serviceId: string) => {
    setForm(f => ({ ...f, additionalServices: f.additionalServices.filter(s => s.serviceId !== serviceId) }))
  }

  const handleUpdateServiceAmount = (serviceId: string, amount: number) => {
    setForm(f => ({ ...f, additionalServices: f.additionalServices.map(s => s.serviceId === serviceId ? { ...s, amount } : s) }))
  }

  const handleSave = async () => {
    if (!invoice) return
    setIsSaving(true)
    try {
      const additionalServicesTotal = form.additionalServices.reduce((sum, service) => sum + service.amount, 0)
      const originalSubtotal = invoice.subtotal || 0
      const newTotalAmount = originalSubtotal + additionalServicesTotal
      const updates = {
        invoiceNumber: form.invoiceNumber,
        notes: form.notes,
        totalAmount: newTotalAmount,
        details: { ...invoice.details, additionalServices: form.additionalServices }
      }
      await dispatch(updateInvoiceAsync({ id: invoice.id, updates })).unwrap()
      toast({ title: "Prefactura actualizada", description: "Los cambios han sido guardados exitosamente." })
      onClose()
      onEditSuccess?.()
    } catch (error: any) {
      toast({ title: "Error al actualizar", description: error.message || "Error al guardar los cambios", variant: "destructive" })
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
            <Input id="invoiceNumber" value={form.invoiceNumber} onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea id="notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} />
          </div>
          <div className="space-y-2">
            <Label>Servicios Adicionales</Label>
            <div className="flex gap-2 items-center">
              {servicesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-600 bg-white/60 p-3 rounded-lg"><Loader2 className="h-4 w-4 animate-spin" />Cargando servicios...</div>
              ) : (
                <>
                  <select className="border rounded px-2 py-1" value={currentServiceToAdd?._id || ""} onChange={e => { const s = services.find(x => x._id === e.target.value); setCurrentServiceToAdd(s || null) }}>
                    <option value="">Seleccionar servicio...</option>
                    {services.filter((s:any) => !form.additionalServices.some(a => a.serviceId === s._id)).map((s:any) => (<option key={s._id} value={s._id}>{s.name} - {s.description}</option>))}
                  </select>
                  <Input type="number" value={currentServiceAmount} onChange={e => setCurrentServiceAmount(parseFloat(e.target.value) || 0)} placeholder="0.00" min="0" step="0.01" className="w-24" />
                  <Button onClick={handleAddService} disabled={!currentServiceToAdd || currentServiceAmount <= 0}><Plus className="h-4 w-4 mr-1" /> Agregar</Button>
                </>
              )}
            </div>
            {form.additionalServices.length > 0 && (
              <div className="space-y-2 mt-2">
                {form.additionalServices.map(service => (
                  <div key={service.serviceId} className="flex items-center gap-2 bg-slate-50 border rounded p-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{service.name}</div>
                      <div className="text-xs text-slate-600">{service.description}</div>
                    </div>
                    <Input type="number" value={service.amount} onChange={e => handleUpdateServiceAmount(service.serviceId, parseFloat(e.target.value) || 0)} className="w-20" />
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveService(service.serviceId)}><Trash2 className="h-4 w-4 text-red-600" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>) : ("Guardar Cambios")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


