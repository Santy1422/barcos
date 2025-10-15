'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchClients, selectAllClients } from '@/lib/features/clients/clientsSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Ship, 
  Search, 
  Eye, 
  Calendar,
  DollarSign,
  User, 
  Loader2,
  Trash2, 
  X,
  Users,
  Code,
  FileText,
  Receipt
} from 'lucide-react';
import { toast } from 'sonner';
import { AgencyServiceDetailModal } from './agency-service-detail-modal';
import { AgencyServiceFacturarModal } from './agency-service-facturar-modal';
import { AgencyServiceXmlModal } from './agency-service-xml-modal';
import { AgencyPdfViewer } from './agency-pdf-viewer';

export const AgencySapInvoice: React.FC = () => {
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectAllClients);
  
  const { 
    services,
    loading,
    fetchServices,
    updateService,
    deleteService,
    updateStatus
  } = useAgencyServices();

  // Filtros y búsqueda
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'facturado' | 'nota_de_credito'>('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('');
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none' | 'today' | 'week' | 'month' | 'advanced'>('none');
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Estado de modales (simplificado para servicios)
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [facturarModalOpen, setFacturarModalOpen] = useState(false);
  const [serviceToFacturar, setServiceToFacturar] = useState<any | null>(null);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [serviceForXml, setServiceForXml] = useState<any | null>(null);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [serviceForPdf, setServiceForPdf] = useState<any | null>(null);

  useEffect(() => {
    dispatch(fetchClients());
    fetchServices({ page: 1, limit: 100 });
  }, [dispatch]); // Solo dispatch como dependencia, igual que trucking-records

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-ES');
    }
    
    if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      const datePart = dateString.split('T')[0];
      const [year, month, day] = datePart.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('es-ES');
    }
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('es-ES');
  };

  const getClientForService = (service: any) => {
    if (service.clientName) return service.clientName;
    
    // Si solo tiene clientId, buscar en la lista de clientes
    if (service.clientId) {
      const client = clients.find(c => (c._id || c.id) === service.clientId);
      if (client) {
        return client.type === 'natural' ? client.fullName : client.companyName;
      }
    }
    
    return 'N/A';
  };

  const getCrewMembersForService = (service: any) => {
    if (service.crewMembers && service.crewMembers.length > 0) {
      return service.crewMembers.length === 1 
        ? service.crewMembers[0].name 
        : `${service.crewMembers[0].name} +${service.crewMembers.length - 1}`;
    }
    return service.crewName || 'N/A';
  };

  const getTodayDates = () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { start: startOfDay.toISOString().split('T')[0], end: endOfDay.toISOString().split('T')[0] };
  };

  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: startOfWeek.toISOString().split('T')[0], end: endOfWeek.toISOString().split('T')[0] };
  };

  const getCurrentMonthDates = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: startOfMonth.toISOString().split('T')[0], end: endOfMonth.toISOString().split('T')[0] };
  };

  const handleFilterByPeriod = (period: 'today' | 'week' | 'month' | 'advanced') => {
    if (activePeriodFilter === period) {
      setIsUsingPeriodFilter(false);
      setActivePeriodFilter('none');
      setStartDate('');
      setEndDate('');
      return;
    }
    setIsUsingPeriodFilter(true);
    setActivePeriodFilter(period);
    switch (period) {
      case 'today': { const d = getTodayDates(); setStartDate(d.start); setEndDate(d.end); break; }
      case 'week': { const d = getCurrentWeekDates(); setStartDate(d.start); setEndDate(d.end); break; }
      case 'month': { const d = getCurrentMonthDates(); setStartDate(d.start); setEndDate(d.end); break; }
      case 'advanced':
        // TODO: Abrir modal de fechas avanzadas
        break;
    }
  };

  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter === 'advanced') return null;
    const week = getCurrentWeekDates();
    const month = getCurrentMonthDates();
    if (startDate === endDate) return 'Hoy';
    if (startDate === week.start && endDate === week.end) return 'Semana en curso';
    if (startDate === month.start && endDate === month.end) return 'Mes en curso';
    return 'Período personalizado';
  };

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase();
    
    return (services || []).filter((service: any) => {
      // Filtrar solo servicios completados, facturados o nota de credito
      if (!['completed', 'facturado', 'nota_de_credito'].includes(service.status)) {
        return false;
      }
      
      // Búsqueda
      const clientName = getClientForService(service).toLowerCase();
      const crewName = getCrewMembersForService(service).toLowerCase();
      const vessel = (service.vessel || '').toLowerCase();
      
      const matchesSearch = clientName.includes(q) || 
                           crewName.includes(q) || 
                           vessel.includes(q) ||
                           (service.pickupLocation || '').toLowerCase().includes(q) ||
                           (service.dropoffLocation || '').toLowerCase().includes(q);
      
      // Filtro de estado
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
      
      // Filtro de cliente
      const matchesClient = clientFilter === 'all' || service.clientId === clientFilter;
      
      // Filtro de vessel
      const matchesVessel = !vesselFilter || (service.vessel || '').toLowerCase().includes(vesselFilter.toLowerCase());
      
      // Filtro de fecha
      let matchesDate = true;
      if (isUsingPeriodFilter && startDate && endDate) {
        const d = new Date(service.pickupDate || service.createdAt);
        const s = new Date(startDate);
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        matchesDate = d >= s && d <= e;
      }
      
      return matchesSearch && matchesStatus && matchesClient && matchesVessel && matchesDate;
    });
  }, [services, search, statusFilter, clientFilter, vesselFilter, isUsingPeriodFilter, startDate, endDate, clients]);

  const handleDeleteService = async (service: any) => {
    if (!confirm(`¿Está seguro de eliminar el servicio?`)) return;
    
    try {
      console.log('Deleting service:', service._id || service.id);
      await deleteService(service._id || service.id);
      toast.success('Servicio eliminado');
      
      // Pequeño delay antes de refrescar para asegurar que la BD se actualizó
      setTimeout(() => {
        fetchServices({ page: 1, limit: 100 });
      }, 300);
    } catch (e: any) {
      console.error('Error deleting service:', e);
      toast.error(e.message || 'No se pudo eliminar');
    }
  };

  const handleViewServiceDetails = (service: any) => {
    setSelectedService(service);
    setViewModalOpen(true);
  };

  const handleOpenFacturarModal = (service: any) => {
    setServiceToFacturar(service);
    setFacturarModalOpen(true);
  };

  const handleOpenXmlModal = (service: any) => {
    setServiceForXml(service);
    setXmlModalOpen(true);
  };

  const handleOpenPdfModal = (service: any) => {
    setServiceForPdf(service);
    setPdfModalOpen(true);
  };

  const handleFacturarService = async (serviceId: string, invoiceNumber: string, invoiceDate: string, xmlData: any, waitingTimePrice?: number) => {
    try {
      console.log('handleFacturarService called with:', { serviceId, invoiceNumber, invoiceDate, xmlData, waitingTimePrice });
      
      // Actualizar servicio a facturado con datos de factura
      console.log('Updating service with data:', {
        id: serviceId,
        status: 'facturado',
        invoiceNumber,
        invoiceDate,
        hasXmlData: !!xmlData,
        waitingTimePrice
      });
      
      const result = await updateService({
        id: serviceId,
        updateData: {
          status: 'facturado' as any,
          invoiceNumber: invoiceNumber,
          invoiceDate: invoiceDate,
          xmlData: xmlData, // Guardar XML si se generó
          waitingTimePrice: waitingTimePrice || 0 // Guardar precio de waiting time
        }
      });
      
      console.log('Update service result:', result);
      
      toast.success(`Servicio facturado: ${invoiceNumber}`);
      
      // Refresh services list (sin await para no bloquear el cierre del modal)
      fetchServices({ page: 1, limit: 100 }).catch(err => {
        console.error('Error refreshing services:', err);
        // No mostrar error al usuario, el servicio ya fue facturado exitosamente
      });
    } catch (e: any) {
      console.error('Error in handleFacturarService:', e);
      toast.error(e.message || 'Error al facturar servicio');
      throw e;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Servicios Listos para Facturar - Agency</h1>
          <p className="text-muted-foreground">Servicios completados, facturados y notas de crédito de Crew Transportation</p>
        </div>
      </div>

          <Card>
        <CardContent className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Buscar por cliente, crew, vessel, ubicación..." 
                className="pl-9" 
                  />
                </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="facturado">Facturado</SelectItem>
                <SelectItem value="nota_de_credito">Nota de Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
              placeholder="Filtrar por vessel..."
              value={vesselFilter}
              onChange={(e) => setVesselFilter(e.target.value)}
              className="w-[200px]"
            />
            <div className="flex gap-1 flex-wrap">
              <Button 
                variant={activePeriodFilter === 'today' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleFilterByPeriod('today')} 
                className="h-8"
              >
                Hoy
              </Button>
              <Button 
                variant={activePeriodFilter === 'week' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleFilterByPeriod('week')} 
                className="h-8"
              >
                Semana
              </Button>
              <Button 
                variant={activePeriodFilter === 'month' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleFilterByPeriod('month')} 
                className="h-8"
              >
                Mes
                  </Button>
              <Button 
                variant={activePeriodFilter === 'advanced' ? 'default' : 'outline'} 
                size="sm" 
                onClick={() => handleFilterByPeriod('advanced')} 
                className="h-8"
              >
                Avanzado
                  </Button>
                </div>
          </div>

          {isUsingPeriodFilter && activePeriodFilter !== 'advanced' && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <Badge variant="default" className="bg-blue-600 text-white text-xs">
                {getActivePeriodText()}
                  </Badge>
              <span className="text-sm text-blue-700">{startDate} - {endDate}</span>
                  <Button
                variant="ghost" 
                    size="sm"
                onClick={() => { 
                  setIsUsingPeriodFilter(false); 
                  setActivePeriodFilter('none'); 
                  setStartDate(''); 
                  setEndDate(''); 
                }} 
                className="h-6 w-6 p-0 ml-auto"
              >
                <X className="h-3 w-3" />
                  </Button>
                </div>
          )}

          {isUsingPeriodFilter && activePeriodFilter === 'advanced' && startDate && endDate && (
            <div className="flex items-center gap-2 p-2 bg-purple-50 border border-purple-200 rounded-md">
              <Badge variant="default" className="bg-purple-600 text-white text-xs">Filtro Avanzado</Badge>
              <span className="text-sm text-purple-700">{startDate} - {endDate}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { 
                  setIsUsingPeriodFilter(false); 
                  setActivePeriodFilter('none'); 
                  setStartDate(''); 
                  setEndDate(''); 
                }} 
                className="h-6 w-6 p-0 ml-auto"
              >
                <X className="h-3 w-3" />
              </Button>
              </div>
          )}

          <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Crew</TableHead>
                      <TableHead>Vessel</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No hay servicios que coincidan con los filtros
                        </TableCell>
                  </TableRow>
                ) : (
                  filteredServices.map((service: any) => (
                    <TableRow key={service._id || service.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                            {formatDate(service.pickupDate)}
                            </div>
                            <div className="text-sm text-muted-foreground">
                            {service.pickupTime || 'N/A'}
                          </div>
                            </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {getClientForService(service)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            {service.crewMembers && service.crewMembers.length > 0 ? (
                              <>
                                <div className="font-medium">
                                  {service.crewMembers[0].name}
                                  {service.crewMembers.length > 1 && (
                                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                      +{service.crewMembers.length - 1} más
                                    </span>
                                  )}
                                </div>
                              <div className="text-xs text-muted-foreground">
                                {service.crewMembers[0].crewRank}
                              </div>
                              </>
                            ) : (
                            <div className="font-medium">{service.crewName || 'N/A'}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                        <div className="font-medium">{service.vessel || 'N/A'}</div>
                          {service.voyage && (
                            <div className="text-sm text-muted-foreground">V. {service.voyage}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{service.pickupLocation}</div>
                            <div className="text-muted-foreground">→ {service.dropoffLocation}</div>
                          </div>
                        {service.moveType === 'RT' && service.returnDropoffLocation && (
                          <div className="text-xs text-blue-600 mt-1">
                            Return: {service.dropoffLocation} → {service.returnDropoffLocation}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                        {service.status === 'completed' ? (
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            Completado
                          </Badge>
                        ) : service.status === 'facturado' ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Facturado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            Nota de Crédito
                          </Badge>
                        )}
                        </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Ver detalles" 
                            onClick={() => handleViewServiceDetails(service)} 
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                          >
                            <Eye className="h-4 w-4" />
                </Button>
                          {/* Botón Ver PDF - Para facturado y nota de crédito */}
                          {['facturado', 'nota_de_credito'].includes(service.status) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              title="Ver PDF" 
                              onClick={() => handleOpenPdfModal(service)} 
                              className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          )}
                          {/* Botón Facturar - Solo para completed */}
                          {service.status === 'completed' && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              title="Facturar servicio" 
                              onClick={() => handleOpenFacturarModal(service)} 
                              className="h-8 px-2 text-green-700 border-green-600 hover:bg-green-50"
                            >
                              Facturar
                            </Button>
                          )}
                          {/* Botones para Facturado: XML y Nota de Crédito */}
                          {service.status === 'facturado' && (
                            <>
                              <Button 
                                variant="ghost"
                                size="sm"
                                title={service.sentToSap ? 'XML enviado a SAP' : 'Ver/Enviar XML a SAP'}
                                onClick={() => handleOpenXmlModal(service)}
                                className={`h-8 w-8 ${service.sentToSap ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'}`}
                              >
                                <Code className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm"
                                title="Cambiar a Nota de Crédito"
                                onClick={async () => {
                                  if (confirm('¿Está seguro de cambiar este servicio a Nota de Crédito? Esta acción no se puede deshacer.')) {
                                    try {
                                      await updateStatus({ id: service._id || service.id, status: 'nota_de_credito' as any });
                                      toast.success('Servicio cambiado a Nota de Crédito');
                                      fetchServices({ page: 1, limit: 100 });
                                    } catch (e: any) {
                                      toast.error(e.message || 'Error al cambiar estado');
                                    }
                                  }
                                }}
                                className="h-8 px-2 text-orange-700 border-orange-600 hover:bg-orange-50"
                              >
                                <Receipt className="h-3 w-3 mr-1" />
                                N/C
                              </Button>
                            </>
                          )}
                          {/* Botón Eliminar - Siempre visible */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            title="Eliminar" 
                            onClick={() => handleDeleteService(service)} 
                            className="h-8 w-8 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                  </TableBody>
                </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Mostrando {filteredServices.length} servicio{filteredServices.length !== 1 ? 's' : ''}</span>
            <span>Total: ${filteredServices.reduce((s: number, service: any) => s + (service.price || 0), 0).toFixed(2)}</span>
                </div>
            </CardContent>
          </Card>

      {/* Modal de detalles */}
      <AgencyServiceDetailModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        service={selectedService}
      />

      {/* Modal de facturación */}
      <AgencyServiceFacturarModal
        open={facturarModalOpen}
        onOpenChange={setFacturarModalOpen}
        service={serviceToFacturar}
        onFacturar={handleFacturarService}
      />

      {/* Modal de XML */}
      <AgencyServiceXmlModal
        open={xmlModalOpen}
        onOpenChange={setXmlModalOpen}
        service={serviceForXml}
        onXmlSentToSap={() => {
          fetchServices({ page: 1, limit: 100 });
        }}
      />

      {/* Modal de PDF */}
      <AgencyPdfViewer
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        service={serviceForPdf}
      />
    </div>
  );
};

export default AgencySapInvoice;
