"use client";

import { useEffect, useState } from "react";
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
  Container,
  Loader2
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import {
  selectAutoridadesRecords,
  fetchAutoridadesRecords
} from "@/lib/features/records/recordsSlice";
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice";
import { createApiUrl } from "@/lib/api-config";

interface TruckingRecordsViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function TruckingRecordsViewModal({ open, onOpenChange, invoice }: TruckingRecordsViewModalProps) {
  const dispatch = useAppDispatch();
  const autoridadesRecords = useAppSelector(selectAutoridadesRecords);
  const clients = useAppSelector(selectAllClients);

  // State para registros cargados directamente del backend
  const [fetchedRecords, setFetchedRecords] = useState<any[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Determinar si es una factura AUTH (por prefijo AUTH-, sufijo AUT, o documentType)
  const isAuthInvoice = invoice?.invoiceNumber?.toString().toUpperCase().startsWith('AUTH-')
    || invoice?.invoiceNumber?.toString().toUpperCase().endsWith(' AUT')
    || invoice?.details?.documentType === 'gastos-autoridades';

  useEffect(() => {
    if (open) {
      console.log("=== DEBUG: Modal abierto ===");
      console.log("Invoice Number:", invoice?.invoiceNumber);
      console.log("Is AUTH Invoice:", isAuthInvoice);

      dispatch(fetchClients());

      if (isAuthInvoice) {
        console.log("Cargando registros de autoridades...");
        dispatch(fetchAutoridadesRecords());
      } else if (invoice?.relatedRecordIds?.length > 0) {
        // Cargar registros directamente del backend por IDs
        console.log("Cargando registros por IDs del backend...");
        const loadRecords = async () => {
          setIsLoadingRecords(true);
          try {
            const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1]
              || localStorage.getItem('token');
            const response = await fetch(createApiUrl('/api/records/by-ids'), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
              },
              body: JSON.stringify({ ids: invoice.relatedRecordIds })
            });
            const result = await response.json();
            if (result.success) {
              console.log(`Cargados ${result.data.length} records de ${invoice.relatedRecordIds.length} IDs`);
              setFetchedRecords(result.data);
            } else {
              console.error("Error cargando records por IDs:", result.message);
              setFetchedRecords([]);
            }
          } catch (error) {
            console.error("Error fetching records by IDs:", error);
            setFetchedRecords([]);
          } finally {
            setIsLoadingRecords(false);
          }
        };
        loadRecords();
      }
    } else {
      // Reset al cerrar
      setFetchedRecords([]);
    }
  }, [open, dispatch, isAuthInvoice, invoice?.invoiceNumber, invoice?.relatedRecordIds]);

  const getRelatedRecords = () => {
    if (!invoice?.relatedRecordIds) return [];

    if (isAuthInvoice) {
      // Para AUTH, filtrar de autoridades records
      if (autoridadesRecords.length === 0) return [];
      return autoridadesRecords.filter((record: any) =>
        invoice.relatedRecordIds.includes(record._id || record.id)
      );
    } else {
      // Para trasiego, usar los records cargados directamente
      return fetchedRecords;
    }
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

            {isLoadingRecords ? (
              <div className="text-center py-8 text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Cargando registros...
              </div>
            ) : relatedRecords.length === 0 ? (
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


