"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Calendar, DollarSign, User, Ship, Users, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppSelector } from "@/lib/hooks";
import { selectAllClients } from "@/lib/features/clients/clientsSlice";
import { generateXmlFileName } from "@/lib/xml-generator";

interface AgencyServiceFacturarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  onFacturar: (serviceId: string, invoiceNumber: string, invoiceDate: string, xmlData: any, waitingTimePrice?: number) => Promise<void>;
}

export function AgencyServiceFacturarModal({ open, onOpenChange, service, onFacturar }: AgencyServiceFacturarModalProps) {
  const { toast } = useToast();
  const clients = useAppSelector(selectAllClients);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [generateXml, setGenerateXml] = useState(false);
  const [waitingTimePrice, setWaitingTimePrice] = useState(0);

  useEffect(() => {
    if (open && service) {
      // Generar número de factura sugerido
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
      const suggestedNumber = `AGY-${year}${month}${day}-${time}`;
      setInvoiceNumber(suggestedNumber);
      
      const today = new Date();
      setInvoiceDate(today.toISOString().split('T')[0]);
      setGenerateXml(false);
      setWaitingTimePrice(0);
    }
  }, [open, service]);

  const handleConfirm = async () => {
    if (!invoiceNumber.trim()) {
      toast({ title: "Error", description: "Debe ingresar un número de factura", variant: "destructive" });
      return;
    }
    
    if (!invoiceDate) {
      toast({ title: "Error", description: "Debe seleccionar la fecha de factura", variant: "destructive" });
      return;
    }

    setIsProcessing(true);
    try {
      let xmlData = null;
      
      // Generar XML si está marcado
      if (generateXml) {
        const { generateAgencyInvoiceXML } = await import('@/lib/xml-generator');
        
        // Obtener el SAP code del cliente
        const client = clients.find(c => (c._id || c.id) === service.clientId);
        const clientSapNumber = client?.sapCode || 'N/A';
        
        if (clientSapNumber === 'N/A') {
          toast({ title: "Error", description: "El cliente no tiene código SAP asignado", variant: "destructive" });
          return;
        }
        
        // Generar XML para este servicio individual
        const xmlPayload = {
          invoiceNumber: invoiceNumber,
          invoiceDate: invoiceDate,
          clientSapNumber: clientSapNumber,
          services: [{
            _id: service._id || service.id,
            pickupDate: service.pickupDate,
            vessel: service.vessel,
            crewMembers: service.crewMembers || [],
            pickupLocation: service.pickupLocation,
            dropoffLocation: service.dropoffLocation,
            moveType: service.moveType || 'SINGLE',
            price: service.price || 0,
            currency: service.currency || 'USD',
            waitingTime: service.waitingTime || 0,
            waitingTimePrice: waitingTimePrice || 0
          }]
        };
        
        const xml = generateAgencyInvoiceXML(xmlPayload);
        xmlData = {
          xml: xml,
          fileName: generateXmlFileName('9326'), // Usar el mismo formato que PTYSS con código 9326 para Agency
          generatedAt: new Date().toISOString()
        };
      }
      
      await onFacturar(service._id || service.id, invoiceNumber, invoiceDate, xmlData, waitingTimePrice);
      toast({ title: "Servicio facturado", description: `El servicio ha sido marcado como facturado.` });
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error al facturar servicio:", error);
      toast({ title: "Error", description: error.message || "No se pudo facturar el servicio", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!service) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Facturar Servicio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-3">Resumen del Servicio</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Cliente:</span>
                <span>{service.clientName || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Ship className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Vessel:</span>
                <span>{service.vessel}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Fecha:</span>
                <span>{new Date(service.pickupDate).toLocaleDateString('es-ES')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Pasajeros:</span>
                <span>{service.crewMembers?.length || 1}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Waiting Time:</span>
                <span>{service.waitingTime ? `${service.waitingTime} min` : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Total:</span>
                <span className="font-bold">${(service.price || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Invoice Number */}
          <div className="space-y-2">
            <Label htmlFor="invoice-number" className="text-sm font-semibold">
              Número de Factura *
            </Label>
            <Input 
              id="invoice-number" 
              value={invoiceNumber} 
              onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())} 
              placeholder="AGY-20241210-1430" 
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Se usará este número para referenciar la factura en SAP
            </p>
          </div>

          {/* Invoice Date */}
          <div className="space-y-2">
            <Label htmlFor="invoice-date" className="text-sm font-semibold">
              Fecha de Factura *
            </Label>
            <Input 
              id="invoice-date" 
              type="date" 
              value={invoiceDate} 
              onChange={(e) => setInvoiceDate(e.target.value)} 
              className="font-mono" 
            />
          </div>

          {/* Waiting Time Price - Solo si hay waiting time */}
          {service.waitingTime > 0 && (
            <div className="space-y-2">
              <Label htmlFor="waiting-time-price" className="text-sm font-semibold">
                Precio de Waiting Time (TRK137)
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="waiting-time-price" 
                  type="number"
                  min="0"
                  step="0.01"
                  value={waitingTimePrice} 
                  onChange={(e) => setWaitingTimePrice(parseFloat(e.target.value) || 0)} 
                  placeholder="0.00"
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Waiting Time: {service.waitingTime} minutos. Este monto se agregará como servicio TRK137 en el XML.
              </p>
            </div>
          )}

          {/* Generate XML Option - Ocultado temporalmente */}
          {/* 
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
              <Checkbox 
                id="generate-xml" 
                checked={generateXml} 
                onCheckedChange={(checked) => setGenerateXml(checked as boolean)} 
              />
              <div className="flex-1">
                <Label htmlFor="generate-xml" className="font-medium cursor-pointer">
                  Generar XML para SAP
                </Label>
                <p className="text-xs text-muted-foreground">
                  Se generará un archivo XML para enviar a SAP
                </p>
              </div>
            </div>
          </div>
          */}

          {/* Actions */}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={isProcessing || !invoiceNumber.trim() || !invoiceDate} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Facturando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Facturar Servicio
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

