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
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs";

interface AgencyServiceFacturarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  onFacturar: (serviceId: string, invoiceNumber: string, invoiceDate: string, xmlData: any, waitingTimePrice?: number) => Promise<void>;
  isMultipleServices?: boolean;
  selectedServices?: string[];
  selectedClientName?: string;
  allServices?: any[]; // Servicios completos para generar XML
}

export function AgencyServiceFacturarModal({ 
  open, 
  onOpenChange, 
  service, 
  onFacturar, 
  isMultipleServices = false, 
  selectedServices = [], 
  selectedClientName = '',
  allServices = []
}: AgencyServiceFacturarModalProps) {
  const { toast } = useToast();
  const clients = useAppSelector(selectAllClients);
  const { groupedCatalogs, fetchGroupedCatalogs } = useAgencyCatalogs();
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [generateXml, setGenerateXml] = useState(false);
  const [waitingTimePrice, setWaitingTimePrice] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);

  // Load catalogs to get waiting time rate
  useEffect(() => {
    fetchGroupedCatalogs();
  }, [fetchGroupedCatalogs]);

  // Get waiting time hourly rate from catalog
  useEffect(() => {
    if (groupedCatalogs && groupedCatalogs.taulia_code) {
      // Get the waiting time rate with specific code
      const waitingTimeConfig = groupedCatalogs.taulia_code.find(
        (catalog: any) => catalog.code === 'WAITING_TIME_RATE' && catalog.isActive && catalog.metadata?.price
      );
      if (waitingTimeConfig) {
        setHourlyRate(waitingTimeConfig.metadata.price || 0);
      }
    }
  }, [groupedCatalogs]);

  // Calculate waiting time price automatically based on hours and hourly rate
  useEffect(() => {
    if (service && service.waitingTime > 0 && hourlyRate > 0) {
      const hours = service.waitingTime / 60; // Convert minutes to hours
      const calculatedPrice = hours * hourlyRate;
      setWaitingTimePrice(calculatedPrice);
    } else {
      setWaitingTimePrice(0);
    }
  }, [service, hourlyRate]);

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
        
        let clientSapNumber;
        
        if (isMultipleServices) {
          // Para múltiples servicios, obtener el cliente del primer servicio (todos deben ser del mismo cliente)
          console.log('🔍 Generando XML para múltiples servicios:', allServices.length);
          
          // El cliente debe ser el mismo para todos, así que podemos usar selectedClientName
          // Buscar el cliente por nombre
          const client = clients.find(c => {
            const clientName = c.type === 'natural' ? c.fullName : c.companyName;
            return clientName === selectedClientName;
          });
          
          clientSapNumber = client?.sapCode || 'N/A';
          
          if (!clientSapNumber || clientSapNumber === 'N/A') {
            toast({ title: "Error", description: "El cliente no tiene código SAP asignado", variant: "destructive" });
            return;
          }
          
          console.log('🔍 Cliente para múltiples servicios:', client);
          console.log('🔍 SAP Code del cliente:', clientSapNumber);
          
          // Generar XML con todos los servicios
          const xmlPayload = {
            invoiceNumber: invoiceNumber,
            invoiceDate: invoiceDate,
            clientSapNumber: clientSapNumber,
            services: allServices.map(svc => ({
              _id: svc._id || svc.id,
              pickupDate: svc.pickupDate,
              vessel: svc.vessel,
              crewMembers: svc.crewMembers || [],
              pickupLocation: svc.pickupLocation,
              dropoffLocation: svc.dropoffLocation,
              moveType: svc.moveType || 'SINGLE',
              price: svc.price || 0,
              currency: svc.currency || 'USD',
              waitingTime: svc.waitingTime || 0,
              waitingTimePrice: svc.waitingTimePrice || 0
            }))
          };
          
          console.log('📦 XML Payload para múltiples servicios:', JSON.stringify(xmlPayload, null, 2));
          
          const xml = generateAgencyInvoiceXML(xmlPayload);
          console.log('📄 XML generado para múltiples servicios (primeras 500 caracteres):', xml.substring(0, 500));
          
          xmlData = {
            xml: xml,
            fileName: generateXmlFileName('9326'),
            generatedAt: new Date().toISOString()
          };
        } else {
          // Obtener el SAP code del cliente para servicio individual
          console.log('🔍 Buscando cliente para servicio:', {
            serviceClientId: service.clientId,
            isObject: typeof service.clientId === 'object',
            totalClients: clients.length,
            clientsWithSapCode: clients.filter(c => c.sapCode).length
          });
          
          // Verificar si clientId es un objeto (ya poblado) o un string (ID)
          let client;
          
          if (typeof service.clientId === 'object' && service.clientId !== null) {
            // Cliente ya está poblado desde el backend
            client = service.clientId;
            clientSapNumber = client.sapCode || 'N/A';
            console.log('🔍 Cliente ya poblado desde backend:', client);
          } else {
            // Cliente es solo el ID, buscar en el array
            client = clients.find(c => (c._id || c.id) === service.clientId);
            clientSapNumber = client?.sapCode || 'N/A';
            console.log('🔍 Cliente encontrado en array:', client);
          }
          
          console.log('🔍 SAP Code del cliente:', clientSapNumber);
          
          if (!clientSapNumber || clientSapNumber === 'N/A') {
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
          
          console.log('📦 XML Payload completo:', JSON.stringify(xmlPayload, null, 2));
          
          const xml = generateAgencyInvoiceXML(xmlPayload);
          console.log('📄 XML generado (primeras 500 caracteres):', xml.substring(0, 500));
          
          xmlData = {
            xml: xml,
            fileName: generateXmlFileName('9326'), // Usar el mismo formato que PTYSS con código 9326 para Agency
            generatedAt: new Date().toISOString()
          };
        }
      }
      
      if (isMultipleServices) {
        // Para facturación múltiple, pasar los IDs de los servicios seleccionados
        await onFacturar(selectedServices.join(','), invoiceNumber, invoiceDate, xmlData, waitingTimePrice);
        toast({ title: "Servicios facturados", description: `${selectedServices.length} servicios han sido marcados como facturados.` });
      } else {
        // Para facturación individual
        await onFacturar(service._id || service.id, invoiceNumber, invoiceDate, xmlData, waitingTimePrice);
        toast({ title: "Servicio facturado", description: `El servicio ha sido marcado como facturado.` });
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error al facturar servicio:", error);
      toast({ title: "Error", description: error.message || "No se pudo facturar el servicio", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!service && !isMultipleServices) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isMultipleServices ? `Facturar ${selectedServices.length} Servicios` : 'Facturar Servicio'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Service Summary */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 text-sm">
              {isMultipleServices ? 'Resumen de Servicios Seleccionados' : 'Resumen del Servicio'}
            </h3>
            {isMultipleServices ? (
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Servicios:</span>
                  <span>{selectedServices.length} servicios seleccionados</span>
                </div>
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Cliente:</span>
                  <span className="truncate">{selectedClientName}</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Cliente:</span>
                  <span className="truncate">{service.clientName || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Ship className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Vessel:</span>
                  <span className="truncate">{service.vessel}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Fecha:</span>
                  <span>{new Date(service.pickupDate).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Pasajeros:</span>
                  <span>{service.crewMembers?.length || 1}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Waiting Time:</span>
                  <span>{service.waitingTime ? `${(service.waitingTime / 60).toFixed(2)} hrs` : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3 text-blue-600" />
                  <span className="font-medium">Precio Base:</span>
                  <span className="font-bold">${(service.price || 0).toFixed(2)}</span>
                </div>
              </div>
            )}
            {!isMultipleServices && service && service.waitingTime > 0 && waitingTimePrice > 0 && (
              <div className="flex items-center justify-between pt-2 mt-2 border-t border-blue-200">
                <span className="font-medium text-blue-900 text-sm">Total con Waiting Time:</span>
                <span className="text-lg font-bold text-blue-700">${((service.price || 0) + waitingTimePrice).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Invoice Data and Waiting Time in 2 columns */}
          <div className="grid grid-cols-2 gap-4">
            {/* Left Column - Invoice Data */}
            <div className="space-y-4">
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
                  Número de referencia en SAP
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
            </div>

            {/* Right Column - Waiting Time Calculation */}
            {!isMultipleServices && service && service.waitingTime > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Precio de Waiting Time (TRK137)
                </Label>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 rounded-lg">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-700">Tiempo de espera:</span>
                      <span className="font-medium">{(service.waitingTime / 60).toFixed(2)} horas</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-700">Tarifa por hora:</span>
                      <span className="font-medium">${hourlyRate.toFixed(2)}/hora</span>
                    </div>
                    <div className="border-t border-green-300 pt-2 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-green-900">Precio calculado:</span>
                        <span className="text-base font-bold text-green-700">${waitingTimePrice.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {hourlyRate === 0 ? (
                    <span className="text-yellow-600">⚠️ Configure la tarifa en Agency Catalogs.</span>
                  ) : (
                    <span>Se agregará como TRK137 en XML.</span>
                  )}
                </p>
              </div>
            )}
          </div>

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

