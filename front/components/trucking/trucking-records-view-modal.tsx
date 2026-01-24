"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Calendar,
  DollarSign,
  Info,
  Database,
  MapPin,
  FileText,
  Truck,
  Clock,
  Container
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { 
  selectAllIndividualRecords, 
  fetchAllRecordsByModule, 
  selectAutoridadesRecords,
  fetchAutoridadesRecords 
} from "@/lib/features/records/recordsSlice";
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice";

interface TruckingRecordsViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function TruckingRecordsViewModal({ open, onOpenChange, invoice }: TruckingRecordsViewModalProps) {
  const dispatch = useAppDispatch();
  const allRecords = useAppSelector(selectAllIndividualRecords);
  const autoridadesRecords = useAppSelector(selectAutoridadesRecords);
  const clients = useAppSelector(selectAllClients);

  // Determinar si es una factura AUTH
  const isAuthInvoice = invoice?.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-');

              useEffect(() => {
              if (open) {
                console.log("=== DEBUG: Modal abierto ===");
                console.log("Invoice Number:", invoice?.invoiceNumber);
                console.log("Is AUTH Invoice:", isAuthInvoice);
                
                if (isAuthInvoice) {
                  console.log("Cargando registros de autoridades...");
                  dispatch(fetchAutoridadesRecords());
                } else {
                  console.log("Cargando registros de trasiego...");
                  dispatch(fetchAllRecordsByModule("trucking"));
                }
                dispatch(fetchClients());
              }
            }, [open, dispatch, isAuthInvoice, invoice?.invoiceNumber]);

  const getRelatedRecords = () => {
    if (!invoice?.relatedRecordIds) return [];
    
    const sourceRecords = isAuthInvoice ? autoridadesRecords : allRecords;
    if (sourceRecords.length === 0) return [];
    
    console.log("=== DEBUG: getRelatedRecords ===");
    console.log("Invoice:", invoice);
    console.log("Invoice Number:", invoice.invoiceNumber);
    console.log("Invoice Number Type:", typeof invoice.invoiceNumber);
    console.log("Invoice Number startsWith AUTH-:", invoice.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-'));
    console.log("Is AUTH Invoice:", isAuthInvoice);
    console.log("Source records disponibles:", sourceRecords.length);
    console.log("Related record IDs:", invoice.relatedRecordIds);
    
    // Debug: verificar si los IDs existen en los registros
    const availableIds = sourceRecords.map(r => r._id || r.id);
    console.log("IDs disponibles en registros:", availableIds.slice(0, 10)); // Solo mostrar los primeros 10
    
    const filtered = sourceRecords.filter((record: any) => invoice.relatedRecordIds.includes(record._id || record.id));
    console.log("Registros filtrados encontrados:", filtered.length);
    console.log("Registros filtrados:", filtered);
    
    // Debug: verificar qué IDs no se encontraron
    const notFoundIds = invoice.relatedRecordIds.filter(id => !availableIds.includes(id));
    if (notFoundIds.length > 0) {
      console.log("IDs NO encontrados en registros:", notFoundIds);
    }
    
    return filtered;
  };

  const relatedRecords = getRelatedRecords();

  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A' };
    // Validar año razonable (1900-2100) para prevenir fechas incorrectas
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return { date: 'N/A', time: 'N/A' };
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> 
            Registros Asociados - {invoice.invoiceNumber}
            <Badge variant={isAuthInvoice ? "default" : "secondary"} className={isAuthInvoice ? "bg-orange-600 text-white" : ""}>
              {isAuthInvoice ? "Gastos Auth" : "Trasiego"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Info className="h-4 w-4 text-blue-600" />
              <span className="font-semibold text-blue-900">Resumen</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <span className="font-medium text-blue-700">Cliente:</span>
                <div className="text-blue-900">{invoice.clientName}</div>
              </div>
              <div>
                <span className="font-medium text-blue-700">Total:</span>
                <div className="text-blue-900 font-bold">${invoice.totalAmount.toFixed(2)}</div>
              </div>
              <div>
                <span className="font-medium text-blue-700">Registros:</span>
                <div className="text-blue-900">{relatedRecords.length}</div>
              </div>
              <div>
                <span className="font-medium text-blue-700">Estado:</span>
                <div className="text-blue-900">
                  <Badge variant={invoice.status === "prefactura" ? "outline" : "default"}>
                    {invoice.status === "prefactura" ? "Prefactura" : "Facturada"}
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Container className="h-5 w-5" /> Registros Asociados ({relatedRecords.length})
            </h3>

            {relatedRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No se encontraron registros asociados</div>
            ) : (
              relatedRecords.map((record: any, index: number) => {
                // Para registros de autoridades, los datos están directamente en el record, no en record.data
                const data = isAuthInvoice ? record : (record.data as Record<string, any>);
                const { date, time } = formatDateTime(record.createdAt);
                const client = clients.find((c: any) => (c._id || c.id) === data?.clientId);
                const displayClientName = client ? (client.type === "natural" ? client.fullName : client.companyName) : (data?.associate || data?.line || invoice.clientName || "Cliente");
                const displayOrder = data?.order || data?.containerConsecutive || "N/A";
                const displayContainerSize = data?.containerSize || data?.size || "N/A";
                const displayContainerType = data?.containerType || data?.type || "N/A";
                const displayLine = data?.line || data?.route || data?.ruta || "N/A";

                return (
                  <div key={record._id || record.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Container className="h-4 w-4" />
                        Registro #{index + 1}
                      </h4>
                      <Badge variant="outline" className="font-mono">{record._id || record.id}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {isAuthInvoice ? (
                        // Vista para registros de autoridades
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><FileText className="h-3 w-3" /> BL Number</Label>
                            <p className="text-sm font-medium">{data.blNumber || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">Orden: {data.order || "N/A"}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><Container className="h-3 w-3" /> Contenedor</Label>
                            <p className="text-sm font-medium">{data.container || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{data.size || "N/A"} {data.type || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">F/E: {data.fe || "N/A"}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> Autoridad</Label>
                            <p className="text-sm">{data.auth || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">Ruta: {data.ruta || "N/A"}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><FileText className="h-3 w-3" /> Invoice</Label>
                            <p className="text-sm">{data.noInvoice || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">Fecha: {data.dateOfInvoice ? new Date(data.dateOfInvoice).toLocaleDateString('es-ES') : "N/A"}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Costos</Label>
                            <p className="text-xs text-muted-foreground">NOTF: ${(parseFloat(data.notf) || 0).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">Seal: ${(parseFloat(data.seal) || 0).toFixed(2)}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><Truck className="h-3 w-3" /> Transporte</Label>
                            <p className="text-xs text-muted-foreground">Transporte: {data.transport || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">Peso: {data.totalWeight ? `${data.totalWeight} kg` : "N/A"}</p>
                          </div>
                        </>
                      ) : (
                        // Vista para registros de trasiego (normal)
                        <>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><User className="h-3 w-3" /> Cliente</Label>
                            <p className="text-sm">{displayClientName}</p>
                            <p className="text-xs text-muted-foreground">Orden: {displayOrder}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><FileText className="h-3 w-3" /> Contenedor</Label>
                            <p className="text-sm font-medium">{data.container || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{displayContainerSize} {displayContainerType}</p>
                            <p className="text-xs text-muted-foreground">F/E: {data.fe || "N/A"}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><MapPin className="h-3 w-3" /> Ruta</Label>
                            <p className="text-sm">{data.from || "N/A"} → {data.to || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">Línea: {displayLine}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><Calendar className="h-3 w-3" /> Fecha Movimiento</Label>
                            <p className="text-sm">{data.moveDate ? new Date(data.moveDate).toLocaleDateString('es-ES') : "N/A"}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><DollarSign className="h-3 w-3" /> Valor Total</Label>
                            <p className="text-sm font-bold text-green-600">${(record.totalValue || 0).toFixed(2)}</p>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><Truck className="h-3 w-3" /> Transporte</Label>
                            <p className="text-xs text-muted-foreground">Conductor: {data.conductor || data.driverName || 'N/A'}</p>
                            <p className="text-xs text-muted-foreground">Matrícula: {data.matriculaCamion || data.plate || 'N/A'}</p>
                          </div>
                        </>
                      )}
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-1"><Clock className="h-3 w-3" /> Información del Sistema</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-1"><span className="font-medium">Creado:</span> <span>{date} {time}</span></div>
                        <div className="flex items-center gap-1"><span className="font-medium">Estado:</span> <Badge variant="outline" className="text-xs">{record.status || "pendiente"}</Badge></div>
                      </div>
                    </div>

                    {data.notes && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Notas</Label>
                        <p className="text-sm bg-gray-50 p-2 rounded-md">{data.notes}</p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


