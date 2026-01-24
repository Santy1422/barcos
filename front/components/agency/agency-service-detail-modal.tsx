"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  User,
  Calendar,
  Ship,
  MapPin,
  Users,
  Plane,
  ArrowRight,
  Truck,
  Clock,
  FileText,
  X
} from "lucide-react";

interface AgencyServiceDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
}

export function AgencyServiceDetailModal({ open, onOpenChange, service }: AgencyServiceDetailModalProps) {
  if (!service) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';

    // Validate year is within reasonable range (1900-2100)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return 'N/A';

    return date.toLocaleDateString('es-ES');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'facturado':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'facturado':
        return 'Facturado';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Detalles del Servicio
            <Badge className={getStatusColor(service.status)}>
              {getStatusLabel(service.status)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Información del Servicio
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {service._id || service.id}</div>
                  <div><strong>Fecha:</strong> {formatDate(service.pickupDate)}</div>
                  <div><strong>Hora:</strong> {service.pickupTime || 'N/A'}</div>
                  <div><strong>Move Type:</strong> {
                    service.moveType === 'RT' ? 'Round Trip' :
                    service.moveType === 'SINGLE' ? 'Single' :
                    service.moveType === 'INTERNAL' ? 'Internal' :
                    service.moveType === 'BAGS_CLAIM' ? 'Bags Claim' :
                    service.moveType === 'DOCUMENTATION' ? 'Documentation' : 'Single'
                  }</div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <strong>Waiting Time:</strong> 
                    <span>{service.waitingTime 
                      ? `${(service.waitingTime / 60).toFixed(2)} horas (${service.waitingTime} minutos)` 
                      : 'N/A'}</span>
                  </div>
                  {service.waitingTimePrice > 0 && (
                    <div><strong>Precio Waiting Time:</strong> ${service.waitingTimePrice.toFixed(2)}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Ship className="h-4 w-4" />
                  Vessel Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Vessel:</strong> {service.vessel || 'N/A'}</div>
                  <div><strong>Voyage:</strong> {service.voyage || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Route Information */}
          <Card>
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Route Information
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Pickup:</span>
                  <span>{service.pickupLocation}</span>
                </div>
                <div className="flex items-center gap-2 ml-6">
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                  <MapPin className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Drop-off:</span>
                  <span>{service.dropoffLocation}</span>
                </div>
                
                {service.moveType === 'RT' && service.returnDropoffLocation && (
                  <div className="flex items-center gap-2 ml-6">
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <MapPin className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Return Drop-off:</span>
                    <span>{service.returnDropoffLocation}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transport Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Transport Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Company:</strong> {service.transportCompany || 'N/A'}</div>
                  <div><strong>Driver:</strong> {service.driver || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Client Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div><strong>Client:</strong> {service.clientName || 'N/A'}</div>
                  <div><strong>Passengers:</strong> {service.passengerCount || service.crewMembers?.length || 'N/A'}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Crew Members */}
          {service.crewMembers && service.crewMembers.length > 0 && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Crew Members ({service.crewMembers.length})
                </h3>
                <div className="space-y-3">
                  {service.crewMembers.map((member: any, index: number) => (
                    <div key={member.id || index} className="border rounded-lg p-3 bg-gray-50">
                      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                        <div><strong>Name:</strong> {member.name || 'N/A'}</div>
                        <div><strong>Nationality:</strong> {member.nationality || 'N/A'}</div>
                        <div><strong>Category:</strong> {member.crewRank || 'N/A'}</div>
                        <div><strong>Status:</strong> {member.status || 'N/A'}</div>
                        <div><strong>Flight:</strong> {member.flight || 'N/A'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comments */}
          {service.comments && (
            <Card>
              <CardContent className="pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Comments
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {service.comments}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

