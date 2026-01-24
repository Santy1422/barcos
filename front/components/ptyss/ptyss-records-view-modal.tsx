"use client";

import { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Ship,
  User,
  Calendar,
  DollarSign,
  Info,
  Database,
  Container,
  MapPin,
  FileText,
  Truck,
  Clock
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { selectAllIndividualRecords, fetchAllRecordsByModule } from "@/lib/features/records/recordsSlice";
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice";

interface PTYSSRecordsViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function PTYSSRecordsViewModal({
  open,
  onOpenChange,
  invoice
}: PTYSSRecordsViewModalProps) {
  const dispatch = useAppDispatch();
  const allRecords = useAppSelector(selectAllIndividualRecords);
  const clients = useAppSelector(selectAllClients);

  useEffect(() => {
    if (open) {
      dispatch(fetchAllRecordsByModule("ptyss"));
      dispatch(fetchClients());
    }
  }, [open, dispatch]);

  // Obtener registros asociados a la factura
  const getRelatedRecords = () => {
    if (!invoice?.relatedRecordIds || allRecords.length === 0) return [];
    return allRecords.filter((record: any) =>
      invoice.relatedRecordIds.includes(record._id || record.id)
    );
  };

  const relatedRecords = getRelatedRecords();

  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A' };
    const year = date.getFullYear();
    // Year validation to prevent year 40000 issue
    if (year < 1900 || year > 2100) return { date: 'N/A', time: 'N/A' };
    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> Registros Asociados - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Resumen */}
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

          {/* Lista de registros */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Container className="h-5 w-5" /> Registros Asociados ({relatedRecords.length})
            </h3>

            {relatedRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron registros asociados
              </div>
            ) : (
              relatedRecords.map((record: any, index: number) => {
                const data = record.data as Record<string, any>;
                const { date, time } = formatDateTime(record.createdAt);
                const client = clients.find((c: any) => (c._id || c.id) === data?.clientId);
                
                // Detectar si el registro es de trasiego con múltiples indicadores
                const isTrasiego =
                  data?.recordType === "trasiego" ||
                  data?.associate === "PTG" ||
                  typeof data?.matchedPrice !== "undefined" ||
                  typeof data?.matchedRouteName !== "undefined" ||
                  !!data?.leg
                
                // Valores con fallback para soportar estructuras diferentes (local vs trasiego)
                const displayClientName = client
                  ? (client.type === "natural" ? client.fullName : client.companyName)
                  : (isTrasiego ? (data?.associate || "PTG") : "N/A")
                const displayOrder = data?.order || data?.containerConsecutive || "N/A"
                const displayContainerSize = data?.containerSize || data?.size || "N/A"
                const displayContainerType = data?.containerType || data?.type || "N/A"
                const displayNavieraOrLine = data?.naviera || data?.line || data?.route || "N/A"
                const displayDriver = data?.conductor || data?.driverName || "N/A"
                const displayPlate = data?.matriculaCamion || data?.plate || "N/A"
                return (
                  <div key={record._id || record.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Container className="h-4 w-4" />
                        Registro #{index + 1}
                      </h4>
                      <Badge variant="outline" className="font-mono">
                        {record._id || record.id}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Información del Cliente */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <User className="h-3 w-3" /> Cliente
                        </Label>
                        <p className="text-sm">{displayClientName}</p>
                        <p className="text-xs text-muted-foreground">
                          Orden: {displayOrder}
                        </p>
                      </div>

                      {/* Información del Contenedor */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Ship className="h-3 w-3" /> Contenedor
                        </Label>
                        <p className="text-sm font-medium">{data.container || "N/A"}</p>
                        <p className="text-xs text-muted-foreground">
                          {displayContainerSize} {displayContainerType}
                        </p>
                      </div>

                      {/* Ruta */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Ruta
                        </Label>
                        <p className="text-sm">
                          {data.from || "N/A"} → {data.to || "N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Naviera: {displayNavieraOrLine}
                        </p>
                      </div>

                      {/* Operación */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Operación
                        </Label>
                        <Badge variant={data.operationType === "import" ? "default" : "secondary"} className="text-xs">
                          {data.operationType?.toUpperCase() || "N/A"}
                        </Badge>
                      </div>

                      {/* Fecha de Movimiento */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Fecha Movimiento
                        </Label>
                        <p className="text-sm">
                          {data.moveDate ? new Date(data.moveDate).toLocaleDateString('es-ES') : "N/A"}
                        </p>
                      </div>

                      {/* Valor */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <DollarSign className="h-3 w-3" /> Valor Total
                        </Label>
                        <p className="text-sm font-bold text-green-600">
                          ${record.totalValue?.toFixed(2) || "0.00"}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Servicios / Detalles según tipo de registro */}
                    {isTrasiego ? (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Detalles de Trasiego</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          <div className="flex items-center gap-1"><span className="font-medium">Asociado:</span> <span>{data.associate || "PTG"}</span></div>
                          <div className="flex items-center gap-1"><span className="font-medium">Leg:</span> <span>{data.leg || "N/A"}</span></div>
                          <div className="flex items-center gap-1"><span className="font-medium">Move Type:</span> <span>{data.moveType || "N/A"}</span></div>
                          <div className="flex items-center gap-1"><span className="font-medium">Línea:</span> <span>{data.line || "N/A"}</span></div>
                          <div className="flex items-center gap-1"><span className="font-medium">Ruta PTYSS:</span> <span>{data.matchedRouteName || data.route || "N/A"}</span></div>
                          <div className="flex items-center gap-1"><span className="font-medium">POL:</span> <span>{data.pol || data.from || "N/A"}</span></div>
                          <div className="flex items-center gap-1"><span className="font-medium">POD:</span> <span>{data.pod || data.to || "N/A"}</span></div>
                          <div className="flex items-center gap-1"><span className="font-medium">Vsl/Voy:</span> <span>{data.fromVslVoy || data.rtFromVslVoy || "N/A"}</span></div>
                          {typeof data.matchedPrice !== "undefined" && (
                            <div className="flex items-center gap-1"><span className="font-medium">Precio Ruta:</span> <span>${(data.matchedPrice || 0).toFixed(2)}</span></div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Servicios Adicionales</Label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Estadia:</span> <span>{data.estadia || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Genset:</span> <span>{data.genset || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Retención:</span> <span>{data.retencion || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">Pesaje:</span> <span>{data.pesaje || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">TI:</span> <span>{data.ti || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Información de Transporte */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Truck className="h-3 w-3" /> Información de Transporte
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Conductor:</span> <span>{displayDriver}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Matrícula:</span> <span>{displayPlate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Chasis/Placa:</span> <span>{data.numeroChasisPlaca || "N/A"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Información del Sistema */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Información del Sistema
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Creado:</span> <span>{date} {time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Estado:</span>
                          <Badge variant="outline" className="text-xs">
                            {record.status || "pendiente"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Notas */}
                    {data.notes && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Notas</Label>
                        <p className="text-sm bg-gray-50 p-2 rounded-md">
                          {data.notes}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 