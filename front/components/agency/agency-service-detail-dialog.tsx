"use client";

import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  User,
  MapPin,
  ArrowRight,
  Ship,
  Users,
  Building,
  FileText,
  Paperclip,
  X,
} from "lucide-react";

function getStatusColor(status: string) {
  switch (status) {
    case "tentative":
      return "bg-purple-100 text-purple-800";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "completed":
    case "prefacturado":
    case "facturado":
    case "nota_de_credito":
      return "bg-green-100 text-green-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "tentative":
      return "Tentative";
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "prefacturado":
      return "Prefacturado";
    case "facturado":
      return "Facturado";
    case "nota_de_credito":
      return "Nota de Crédito";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function formatSafeDate(dateValue: unknown) {
  if (!dateValue) return "N/A";

  try {
    let year: number;

    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
      year = dateValue.getFullYear();
      if (year < 1900 || year > 2100) return "N/A";
      return format(dateValue, "MMM dd, yyyy");
    }

    if (typeof dateValue === "string") {
      const dateOnly = dateValue.split("T")[0];
      const [y, month, day] = dateOnly.split("-").map(Number);
      year = y;
      if (year < 1900 || year > 2100) return "N/A";
      const date = new Date(year, month - 1, day);
      return format(date, "MMM dd, yyyy");
    }

    const date = new Date(dateValue as string | number);
    if (isNaN(date.getTime())) {
      return "N/A";
    }

    year = date.getFullYear();
    if (year < 1900 || year > 2100) return "N/A";

    return format(date, "MMM dd, yyyy");
  } catch {
    return "N/A";
  }
}

export interface AgencyServiceDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Record<string, any> | null | undefined;
}

export function AgencyServiceDetailDialog({
  open,
  onOpenChange,
  service: selectedService,
}: AgencyServiceDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Service Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {selectedService && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Service Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Service ID:</strong> {selectedService._id}
                      </div>
                      <div>
                        <strong>Date:</strong> {formatSafeDate(selectedService.pickupDate)}
                      </div>
                      <div>
                        <strong>Time:</strong> {selectedService.pickupTime || "N/A"}
                      </div>
                      <div>
                        <strong>Status:</strong>
                        <Badge className={`ml-2 ${getStatusColor(selectedService.status)}`}>
                          {getStatusLabel(selectedService.status)}
                        </Badge>
                      </div>
                      <div>
                        <strong>Move Type:</strong>
                        {selectedService.moveType === "RT"
                          ? "Round Trip"
                          : selectedService.moveType === "SINGLE"
                            ? "Single"
                            : selectedService.moveType === "INTERNAL"
                              ? "Internal"
                              : selectedService.moveType === "BAGS_CLAIM"
                                ? "Bags Claim"
                                : selectedService.moveType === "DOCUMENTATION"
                                  ? "Documentation"
                                  : "Single"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Service Details
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Passengers:</strong> {selectedService.passengerCount || "N/A"}
                      </div>
                      <div>
                        <strong>Waiting Time:</strong>
                        {selectedService.waitingTime
                          ? `${(selectedService.waitingTime / 60).toFixed(2)} horas (${selectedService.waitingTime} minutos)`
                          : "Not set"}
                      </div>
                      {selectedService.price != null && (
                        <div>
                          <strong>Price:</strong>{" "}
                          <span className="text-green-600 font-medium">${selectedService.price}</span>
                        </div>
                      )}
                      <div>
                        <strong>Service Code:</strong>{" "}
                        {typeof selectedService.serviceCode === "string" &&
                        selectedService.serviceCode.trim()
                          ? selectedService.serviceCode.trim()
                          : "N/A"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

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
                      <span>{selectedService.pickupLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 ml-6">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                      <MapPin className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Drop-off:</span>
                      <span>{selectedService.dropoffLocation}</span>
                    </div>

                    {selectedService.moveType === "RT" && selectedService.returnDropoffLocation && (
                      <div className="flex items-center gap-2 ml-6">
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <MapPin className="h-4 w-4 text-orange-500" />
                        <span className="font-medium">Return Drop-off:</span>
                        <span>{selectedService.returnDropoffLocation}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      Vessel Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Vessel:</strong> {selectedService.vessel || "N/A"}
                      </div>
                      <div>
                        <strong>Voyage:</strong> {selectedService.voyage || "N/A"}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Transport Information
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div>
                        <strong>Company:</strong> {selectedService.transportCompany || "N/A"}
                      </div>
                      <div>
                        <strong>Driver:</strong> {selectedService.driver || "N/A"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {selectedService.crewMembers && selectedService.crewMembers.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Crew Members ({selectedService.crewMembers.length})
                    </h3>
                    <div className="space-y-3">
                      {selectedService.crewMembers.map((member: any, index: number) => (
                        <div key={member.id || index} className="border rounded-lg p-3 bg-gray-50">
                          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3 text-sm">
                            <div>
                              <strong>Name:</strong> {member.name || "N/A"}
                            </div>
                            <div>
                              <strong>Nationality:</strong> {member.nationality || "N/A"}
                            </div>
                            <div>
                              <strong>Rank:</strong> {member.crewRank || "N/A"}
                            </div>
                            <div>
                              <strong>Category:</strong> {member.crewCategory || "N/A"}
                            </div>
                            <div>
                              <strong>Status:</strong> {member.status || "N/A"}
                            </div>
                            <div>
                              <strong>Flight:</strong> {member.flight || "N/A"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(!selectedService.crewMembers || selectedService.crewMembers.length === 0) &&
                (selectedService.crewName || selectedService.crewRank || selectedService.nationality) && (
                  <Card>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-3 flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Crew Information (Legacy)
                      </h3>
                      <div className="space-y-2 text-sm">
                        <div>
                          <strong>Name:</strong> {selectedService.crewName || "N/A"}
                        </div>
                        <div>
                          <strong>Rank:</strong> {selectedService.crewRank || "N/A"}
                        </div>
                        <div>
                          <strong>Nationality:</strong> {selectedService.nationality || "N/A"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {selectedService.comments && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Comments
                    </h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedService.comments}
                    </p>
                  </CardContent>
                </Card>
              )}

              {selectedService.attachments && selectedService.attachments.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Attachments ({selectedService.attachments.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedService.attachments.map((attachment: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <Paperclip className="h-3 w-3" />
                          <span>{attachment.fileName}</span>
                          <span className="text-muted-foreground">
                            ({formatSafeDate(attachment.uploadDate)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
