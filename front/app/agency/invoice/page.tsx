'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { createInvoiceAsync, fetchInvoicesAsync, type InvoiceRecord } from '@/lib/features/records/recordsSlice';
import { selectAllClients, fetchClients } from '@/lib/features/clients/clientsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText, Download, DollarSign, Calendar, CheckCircle, AlertTriangle,
  Car, Users, Loader2, Eye, ArrowLeft, Plus
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

export default function AgencyInvoicePage() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectAllClients);
  const invoices = useAppSelector(state => state.records.invoices);

  const {
    services,
    loading,
    fetchServices,
    updateStatus
  } = useAgencyServices();

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [prefacturaNumber, setPrefacturaNumber] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  // Filter services by status
  const completedServices = services.filter(service => service.status === 'completed');
  const agencyPrefacturas = invoices.filter(inv => inv.module === 'agency' && inv.status !== 'finalized');
  const agencyFacturas = invoices.filter(inv => inv.module === 'agency' && inv.status === 'finalized');

  useEffect(() => {
    fetchServices({
      page: 1,
      limit: 100,
      filters: { status: 'completed' }
    });
    dispatch(fetchClients());
    dispatch(fetchInvoicesAsync('agency'));
  }, [fetchServices, dispatch]);

  // Generate next prefactura number
  useEffect(() => {
    const agencyInvoices = invoices.filter(inv => inv.module === 'agency');
    const nextNumber = agencyInvoices.length + 1;
    setPrefacturaNumber(`AGY-PRE-${String(nextNumber).padStart(6, '0')}`);
  }, [invoices]);

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

  const selectedServicesData = useMemo(() => {
    return completedServices.filter(service => selectedServices.includes(service._id));
  }, [completedServices, selectedServices]);

  const calculateTotalValue = () => {
    return selectedServicesData.reduce((total, service) => total + (service.price || 0), 0);
  };

  // Group selected services by client
  const servicesByClient = useMemo(() => {
    const grouped: Record<string, typeof selectedServicesData> = {};
    selectedServicesData.forEach(service => {
      const clientName = service.clientName || 'Sin Cliente';
      if (!grouped[clientName]) {
        grouped[clientName] = [];
      }
      grouped[clientName].push(service);
    });
    return grouped;
  }, [selectedServicesData]);

  const handleCreatePrefactura = async () => {
    if (selectedServices.length === 0) {
      toast({
        title: "Error",
        description: "Selecciona al menos un servicio para crear la prefactura",
        variant: "destructive",
      });
      return;
    }

    if (!prefacturaNumber.trim()) {
      toast({
        title: "Error",
        description: "Ingresa un número de prefactura",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Get first service to determine client info
      const firstService = selectedServicesData[0];
      const clientName = firstService?.clientName || 'Cliente Agency';

      // Find client by name to get RUC and SAP number
      const client = clients.find((c: any) =>
        c.companyName === clientName || c.fullName === clientName || c.name === clientName
      );

      // Create invoice record
      const totalValue = calculateTotalValue();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // Vencimiento en 30 días

      const newPrefactura: InvoiceRecord = {
        module: 'agency',
        invoiceNumber: prefacturaNumber,
        clientRuc: client?.taxId || client?.ruc || 'N/A',
        clientName: clientName,
        clientSapNumber: client?.sapCode || client?.sapNumber || 'N/A',
        issueDate: new Date().toISOString(),
        dueDate: dueDate.toISOString(),
        currency: 'USD',
        subtotal: totalValue,
        taxAmount: 0,
        totalAmount: totalValue,
        status: 'prefactura',
        relatedRecordIds: selectedServices,
        details: {
          services: selectedServicesData.map(s => ({
            id: s._id,
            crewName: s.crewName,
            vessel: s.vessel,
            pickupDate: s.pickupDate,
            pickupLocation: s.pickupLocation,
            dropoffLocation: s.dropoffLocation,
            price: s.price,
            moveType: s.moveType,
            passengerCount: s.passengerCount
          })),
          totalServices: selectedServices.length,
        },
      };

      console.log("Creating agency prefactura:", newPrefactura);

      const response = await dispatch(createInvoiceAsync(newPrefactura));

      if (createInvoiceAsync.fulfilled.match(response)) {
        // Update services status to prefacturado
        for (const serviceId of selectedServices) {
          await updateStatus({ id: serviceId, status: 'prefacturado' as any });
        }

        toast({
          title: "Prefactura creada",
          description: `Prefactura ${prefacturaNumber} creada con ${selectedServices.length} servicios`,
        });

        // Reset state
        setSelectedServices([]);

        // Refresh data
        fetchServices({
          page: 1,
          limit: 100,
          filters: { status: 'completed' }
        });
        dispatch(fetchInvoicesAsync('agency'));

        // Switch to prefacturas tab
        setActiveTab('prefacturas');
      } else {
        throw new Error('Error al crear la prefactura');
      }
    } catch (error: any) {
      console.error("Error creating prefactura:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la prefactura",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completado</Badge>;
      case 'prefacturado':
        return <Badge className="bg-purple-100 text-purple-800">Prefacturado</Badge>;
      case 'draft':
        return <Badge className="bg-yellow-100 text-yellow-800">Prefactura</Badge>;
      case 'finalized':
        return <Badge className="bg-blue-100 text-blue-800">Facturado</Badge>;
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
            Prefacturas Agency
          </h1>
          <p className="text-muted-foreground mt-1">Crear y gestionar prefacturas de servicios</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Servicios Completados</p>
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
                <p className="text-sm font-medium text-muted-foreground">Prefacturas Pendientes</p>
                <p className="text-2xl font-bold">{agencyPrefacturas.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Seleccionados</p>
                <p className="text-2xl font-bold">{selectedServices.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Seleccionado</p>
                <p className="text-2xl font-bold">${calculateTotalValue().toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create">Crear Prefactura</TabsTrigger>
          <TabsTrigger value="prefacturas">Prefacturas ({agencyPrefacturas.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          {/* Prefactura Number Input */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-xs">
                  <Label htmlFor="prefactura-number">Número de Prefactura</Label>
                  <Input
                    id="prefactura-number"
                    value={prefacturaNumber}
                    onChange={(e) => setPrefacturaNumber(e.target.value.toUpperCase())}
                    placeholder="AGY-PRE-000001"
                    className="font-mono"
                  />
                </div>
                <div className="flex gap-2 pt-6">
                  <Button
                    onClick={handleCreatePrefactura}
                    disabled={selectedServices.length === 0 || isCreating || !prefacturaNumber.trim()}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Crear Prefactura ({selectedServices.length})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Servicios Completados</CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedServices.length === completedServices.length && completedServices.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm">Seleccionar Todos</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              ) : completedServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay servicios completados</p>
                  <p className="text-sm">Completa servicios en Registros primero</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Tripulante</TableHead>
                        <TableHead>Buque</TableHead>
                        <TableHead>Ruta</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedServices.map((service) => (
                        <TableRow
                          key={service._id}
                          className={selectedServices.includes(service._id) ? 'bg-blue-50' : ''}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedServices.includes(service._id)}
                              onCheckedChange={(checked) => handleServiceSelection(service._id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">
                              {format(new Date(service.pickupDate), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {service.pickupTime}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{service.crewName}</div>
                            {service.crewRank && (
                              <div className="text-sm text-muted-foreground">{service.crewRank}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{service.vessel}</div>
                            {service.voyage && (
                              <div className="text-sm text-muted-foreground">V: {service.voyage}</div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {service.pickupLocation} → {service.dropoffLocation}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{service.clientName || '-'}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            {service.price ? (
                              <span className="font-medium text-green-600">${service.price}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
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
                      {selectedServices.length} servicio{selectedServices.length !== 1 ? 's' : ''} seleccionado{selectedServices.length !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-blue-700">
                      Total: ${calculateTotalValue().toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleCreatePrefactura}
                      disabled={isCreating || !prefacturaNumber.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {isCreating ? 'Creando...' : 'Crear Prefactura'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setSelectedServices([])}
                    >
                      Limpiar Selección
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="prefacturas" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Prefacturas Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              {agencyPrefacturas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay prefacturas pendientes</p>
                  <p className="text-sm">Crea una prefactura desde la pestaña anterior</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Servicios</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agencyPrefacturas.map((prefactura) => (
                        <TableRow key={prefactura.id || prefactura._id}>
                          <TableCell className="font-mono font-medium">
                            {prefactura.invoiceNumber}
                          </TableCell>
                          <TableCell>{prefactura.clientName}</TableCell>
                          <TableCell>
                            {format(new Date(prefactura.issueDate || prefactura.createdAt), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {prefactura.details?.totalServices || prefactura.relatedRecordIds?.length || 0} servicios
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(prefactura.status)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            ${prefactura.totalAmount?.toLocaleString() || '0'}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
