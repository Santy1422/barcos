'use client';

import { useState, useEffect } from 'react';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Download, DollarSign, Calendar, CheckCircle, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AgencyInvoicePage() {
  const { toast } = useToast();
  const {
    services,
    loading,
    fetchServices,
    updateStatus
  } = useAgencyServices();

  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Filter only completed services ready for invoicing
  const completedServices = services.filter(service => service.status === 'completed');
  const prefacturedServices = services.filter(service => service.status === 'prefacturado');

  useEffect(() => {
    fetchServices({ 
      page: 1, 
      limit: 100, 
      filters: { status: 'completed,prefacturado' } 
    });
  }, [fetchServices]);

  const handleServiceSelection = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedServices(completedServices.map(service => service._id));
    } else {
      setSelectedServices([]);
    }
  };

  const calculateTotalValue = () => {
    return completedServices
      .filter(service => selectedServices.includes(service._id))
      .reduce((total, service) => total + (service.price || 0), 0);
  };

  const handleCreatePreInvoice = async () => {
    if (selectedServices.length === 0) {
      toast({
        title: "No services selected",
        description: "Please select at least one service to create pre-invoice",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update status to prefacturado for selected services
      for (const serviceId of selectedServices) {
        await updateStatus({ id: serviceId, status: 'prefacturado' as any });
      }

      toast({
        title: "Pre-invoice created",
        description: `${selectedServices.length} services marked as pre-invoiced`,
      });

      setSelectedServices([]);
      fetchServices({ 
        page: 1, 
        limit: 100, 
        filters: { status: 'completed,prefacturado' } 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create pre-invoice",
        variant: "destructive",
      });
    }
  };

  const handleFinalizeInvoice = async () => {
    const prefacturedToFinalize = prefacturedServices
      .filter(service => selectedServices.includes(service._id));

    if (prefacturedToFinalize.length === 0) {
      toast({
        title: "No pre-invoiced services selected",
        description: "Please select pre-invoiced services to finalize",
        variant: "destructive",
      });
      return;
    }

    try {
      for (const service of prefacturedToFinalize) {
        await updateStatus({ id: service._id, status: 'facturado' as any });
      }

      toast({
        title: "Invoice finalized",
        description: `${prefacturedToFinalize.length} services marked as invoiced`,
      });

      setSelectedServices([]);
      fetchServices({ 
        page: 1, 
        limit: 100, 
        filters: { status: 'completed,prefacturado' } 
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to finalize invoice",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Ready for Invoice</Badge>;
      case 'prefacturado':
        return <Badge className="bg-purple-100 text-purple-800">Pre-invoiced</Badge>;
      case 'facturado':
        return <Badge className="bg-gray-100 text-gray-800">Invoiced</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            Agency Invoicing
          </h1>
          <p className="text-muted-foreground mt-1">Create pre-invoices and finalize billing</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Ready for Invoice</p>
                <p className="text-2xl font-bold">{completedServices.length}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pre-invoiced</p>
                <p className="text-2xl font-bold">{prefacturedServices.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Selected Services</p>
                <p className="text-2xl font-bold">{selectedServices.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">${calculateTotalValue().toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Button 
              onClick={handleCreatePreInvoice}
              disabled={selectedServices.length === 0 || loading}
            >
              <FileText className="mr-2 h-4 w-4" />
              Create Pre-Invoice ({selectedServices.length})
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleFinalizeInvoice}
              disabled={selectedServices.length === 0 || loading}
            >
              <Download className="mr-2 h-4 w-4" />
              Finalize Invoice
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Services for Invoice */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Services Ready for Invoicing</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={selectedServices.length === completedServices.length && completedServices.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Crew</TableHead>
                    <TableHead>Vessel</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedServices.concat(prefacturedServices).map((service) => (
                    <TableRow key={service._id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedServices.includes(service._id)}
                          onCheckedChange={(checked) => handleServiceSelection(service._id, checked as boolean)}
                        />
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {format(new Date(service.pickupDate), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {service.pickupTime}
                          </div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium">{service.crewName}</div>
                          {service.crewRank && (
                            <div className="text-sm text-muted-foreground">
                              {service.crewRank}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div className="font-medium">{service.vessel}</div>
                        {service.voyage && (
                          <div className="text-sm text-muted-foreground">
                            Voyage: {service.voyage}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {service.pickupLocation} → {service.dropoffLocation}
                        </div>
                        {service.transportCompany && (
                          <div className="text-xs text-muted-foreground">
                            {service.transportCompany}
                          </div>
                        )}
                      </TableCell>
                      
                      <TableCell>
                        {getStatusBadge(service.status)}
                      </TableCell>
                      
                      <TableCell>
                        {service.price ? (
                          <div className="font-medium text-green-600">
                            ${service.price}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {completedServices.length === 0 && prefacturedServices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        <div className="text-muted-foreground">
                          <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No services ready for invoicing</p>
                          <p className="text-sm">Complete some services first</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Services Summary */}
      {selectedServices.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">
                  {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
                </h3>
                <p className="text-blue-700">
                  Total value: ${calculateTotalValue().toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={handleCreatePreInvoice}
                  disabled={loading}
                >
                  Create Pre-Invoice
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setSelectedServices([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}