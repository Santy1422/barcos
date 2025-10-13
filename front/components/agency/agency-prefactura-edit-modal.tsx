"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices";

export function AgencyPrefacturaEditModal({ open, onOpenChange, invoice, onClose, onEditSuccess }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onClose: () => void;
  onEditSuccess?: () => void;
}) {
  const { toast } = useToast();
  const { updateInvoice } = useAgencyServices();

  const [form, setForm] = useState({
    invoiceNumber: "",
    notes: "",
    trk137Amount: 0,
    trk137Description: "Tiempo de Espera"
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && invoice) {
      setForm({
        invoiceNumber: invoice.invoiceNumber || "",
        notes: invoice.details?.notes || "",
        trk137Amount: invoice.details?.trk137Amount || 0,
        trk137Description: invoice.details?.trk137Description || "Tiempo de Espera"
      });
    }
  }, [open, invoice]);

  const calculateTotal = () => {
    if (!invoice) return 0;
    
    // Total de servicios base (ya incluido en invoice.totalAmount sin TRK137)
    const servicesTotal = invoice.relatedServiceIds?.length > 0 
      ? (invoice.totalAmount || 0) - (invoice.details?.trk137Amount || 0) 
      : 0;
    
    // TRK137 nuevo monto
    const trk137Total = form.trk137Amount || 0;
    
    return servicesTotal + trk137Total;
  };

  const handleSave = async () => {
    if (!invoice) return;
    
    setIsSaving(true);
    try {
      const newTotalAmount = calculateTotal();
      
      const updates = {
        invoiceNumber: form.invoiceNumber,
        totalAmount: newTotalAmount,
        details: {
          ...invoice.details,
          notes: form.notes,
          trk137Amount: form.trk137Amount,
          trk137Description: form.trk137Description
        }
      };
      
      await updateInvoice({ id: invoice.id || invoice._id, updates });
      
      toast({ 
        title: "Prefactura actualizada", 
        description: "Los cambios han sido guardados exitosamente." 
      });
      
      onClose();
      onEditSuccess?.();
    } catch (error: any) {
      toast({ 
        title: "Error al actualizar", 
        description: error.message || "Error al guardar los cambios", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Prefactura - {invoice.invoiceNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Número de Prefactura</Label>
            <Input 
              id="invoiceNumber" 
              value={form.invoiceNumber} 
              onChange={e => setForm(f => ({ ...f, invoiceNumber: e.target.value.toUpperCase() }))} 
              className="font-mono"
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
            <Label>TRK137 - Tiempo de Espera</Label>
            <div className="flex gap-2 items-center">
              <Input
                type="text"
                value={form.trk137Description}
                onChange={e => setForm(f => ({ ...f, trk137Description: e.target.value }))}
                placeholder="Descripción"
                className="flex-1"
              />
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <Input 
                  type="number" 
                  value={form.trk137Amount} 
                  onChange={e => setForm(f => ({ ...f, trk137Amount: parseFloat(e.target.value) || 0 }))} 
                  placeholder="0.00" 
                  min="0" 
                  step="0.01" 
                  className="w-32" 
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Monto adicional para el servicio TRK137 (Tiempo de Espera)
            </p>
          </div>

          {/* Total Section */}
          <div className="border-t pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Servicios base:</span>
                  <span className="font-medium">
                    ${((invoice.totalAmount || 0) - (invoice.details?.trk137Amount || 0)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">TRK137 (Tiempo de Espera):</span>
                  <span className="font-medium">${(form.trk137Amount || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                  <span>Total:</span>
                  <span className="text-blue-600">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
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
  );
}
