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
  Info,
  Database,
  MapPin,
  Ship,
  Clock,
  Users,
  Plane,
  ArrowRight
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/lib/hooks";
import { fetchClients, selectAllClients } from "@/lib/features/clients/clientsSlice";
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices";

interface AgencyServicesViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
}

export function AgencyServicesViewModal({ open, onOpenChange, invoice }: AgencyServicesViewModalProps) {
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectAllClients);
  const { services, fetchServices } = useAgencyServices();

  useEffect(() => {
    if (open) {
      console.log("=== DEBUG: Agency Services Modal opened ===");
      console.log("Invoice:", invoice);
      dispatch(fetchClients());
      fetchServices({ page: 1, limit: 1000 }); // Fetch all services
    }
  }, [open, dispatch, fetchServices, invoice]);

  const getRelatedServices = () => {
    if (!invoice?.relatedServiceIds) return [];
    
    if (services.length === 0) return [];
    
    console.log("=== DEBUG: getRelatedServices ===");
    console.log("Invoice:", invoice);
    console.log("Services available:", services.length);
    console.log("Related service IDs:", invoice.relatedServiceIds);
    
    const filtered = services.filter((service: any) => 
      invoice.relatedServiceIds.includes(service._id || service.id)
    );
    
    console.log("Services filtered:", filtered.length);
    return filtered;
  };

  const relatedServices = getRelatedServices();

  const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: 'N/A', time: 'N/A' };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { date: 'N/A', time: 'N/A' };

    // Validate year is within reasonable range (1900-2100)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return { date: 'N/A', time: 'N/A' };

    return {
      date: date.toLocaleDateString('es-ES'),
      time: date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    // Validate year is within reasonable range (1900-2100)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return 'N/A';

    return date.toLocaleDateString('es-ES');
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" /> 
            Servicios Asociados - {invoice.invoiceNumber}
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
                <div className="text-blue-900 font-bold">${(invoice.totalAmount || 0).toFixed(2)}</div>
              </div>
              <div>
                <span className="font-medium text-blue-700">Servicios:</span>
                <div className="text-blue-900">{relatedServices.length}</div>
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
              <Users className="h-5 w-5" /> Servicios Asociados ({relatedServices.length})
            </h3>

            {relatedServices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No se encontraron servicios asociados</div>
            ) : (
              relatedServices.map((service: any, index: number) => {
                const { date, time } = formatDateTime(service.createdAt);
                
                return (
                  <div key={service._id || service.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-lg flex items-center gap-2">
                        <Ship className="h-4 w-4" />
                        Servicio #{index + 1}
                      </h4>
                      <Badge variant="outline" className="font-mono text-xs">{service._id || service.id}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Fecha de Servicio
                        </Label>
                        <p className="text-sm font-medium">{formatDate(service.pickupDate)}</p>
                        <p className="text-xs text-muted-foreground">Hora: {service.pickupTime || 'N/A'}</p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Ship className="h-3 w-3" /> Vessel
                        </Label>
                        <p className="text-sm font-medium">{service.vessel || 'N/A'}</p>
                        {service.voyage && (
                          <p className="text-xs text-muted-foreground">Voyage: {service.voyage}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Ruta
                        </Label>
                        <div className="text-sm">
                          <div className="flex items-center gap-1">
                            {service.pickupLocation}
                            <ArrowRight className="h-3 w-3" />
                            {service.dropoffLocation}
                          </div>
                          {service.moveType === 'RT' && service.returnDropoffLocation && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              {service.dropoffLocation}
                              <ArrowRight className="h-3 w-3" />
                              {service.returnDropoffLocation}
                              <span className="text-blue-600 font-medium ml-1">(Return)</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Tipo: {service.moveType === 'RT' ? 'Round Trip' : 
                                service.moveType === 'SINGLE' ? 'Single' :
                                service.moveType === 'INTERNAL' ? 'Internal' :
                                service.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                                service.moveType === 'DOCUMENTATION' ? 'Documentation' : 'Single'}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Users className="h-3 w-3" /> Crew Members
                        </Label>
                        {service.crewMembers && service.crewMembers.length > 0 ? (
                          <>
                            <p className="text-sm font-medium">
                              {service.crewMembers[0].name}
                              {service.crewMembers.length > 1 && (
                                <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                  +{service.crewMembers.length - 1} más
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {service.crewMembers[0].crewRank} - {service.crewMembers[0].nationality}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Total: {service.crewMembers.length} pasajero{service.crewMembers.length !== 1 ? 's' : ''}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm">{service.crewName || 'N/A'}</p>
                            {service.crewRank && (
                              <p className="text-xs text-muted-foreground">{service.crewRank}</p>
                            )}
                            {service.nationality && (
                              <p className="text-xs text-muted-foreground">{service.nationality}</p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <Plane className="h-3 w-3" /> Vuelo
                        </Label>
                        {service.crewMembers && service.crewMembers.length > 0 ? (
                          <p className="text-sm">{service.crewMembers[0].flight || 'N/A'}</p>
                        ) : (
                          <p className="text-sm">{service.flightInfo || 'N/A'}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                          <User className="h-3 w-3" /> Transporte
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Compañía: {service.transportCompany || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Conductor: {service.driver || service.driverName || 'N/A'}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-600 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Información del Sistema
                      </Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Creado:</span> 
                          <span className="text-sm">{date} {time}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Estado:</span> 
                          <Badge variant="outline" className="text-xs">
                            {service.status || "pending"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {service.comments && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">Comentarios</Label>
                        <p className="text-sm bg-gray-50 p-2 rounded-md">{service.comments}</p>
                      </div>
                    )}

                    {/* Mostrar todos los crew members si hay más de uno */}
                    {service.crewMembers && service.crewMembers.length > 1 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-600">
                          Todos los Crew Members ({service.crewMembers.length})
                        </Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {service.crewMembers.map((member: any, idx: number) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded-md text-xs">
                              <div className="font-medium">{member.name}</div>
                              <div className="text-muted-foreground">
                                {member.crewRank} - {member.nationality}
                              </div>
                              <div className="text-muted-foreground">
                                {member.crewCategory} / {member.status}
                              </div>
                              <div className="text-muted-foreground">
                                Vuelo: {member.flight}
                              </div>
                            </div>
                          ))}
                        </div>
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

