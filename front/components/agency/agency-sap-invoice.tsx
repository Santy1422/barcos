'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchClients, selectAllClients } from '@/lib/features/clients/clientsSlice';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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
  Receipt,
  ChevronDown,
  ChevronRight,
  CheckCircle
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
  const [crewRankFilter, setCrewRankFilter] = useState<'all' | 'security_guard' | 'seal_check' | 'both'>('all');
  const [viewMode, setViewMode] = useState<'completed' | 'invoiced'>('completed'); // Vista por defecto: completados
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none' | 'today' | 'week' | 'month' | 'advanced'>('none');
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  // Estado para selección múltiple
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  
  // Estado para facturas expandidas
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());

  // Estado de modales (simplificado para servicios)
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [facturarModalOpen, setFacturarModalOpen] = useState(false);
  const [serviceToFacturar, setServiceToFacturar] = useState<any | null>(null);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [serviceForXml, setServiceForXml] = useState<any | null>(null);
  const [servicesForXml, setServicesForXml] = useState<any[]>([]); // Para múltiples servicios en XML
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [serviceForPdf, setServiceForPdf] = useState<any | null>(null);
  const [servicesForPdf, setServicesForPdf] = useState<any[]>([]);
  const [isPdfMultipleServices, setIsPdfMultipleServices] = useState(false);

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

  const getClientIdForService = (service: any) => {
    // Si tiene clientId directo, extraer solo el ID
    if (service.clientId) {
      // Si es un objeto, extraer el _id o id
      if (typeof service.clientId === 'object') {
        return service.clientId._id || service.clientId.id || null;
      }
      // Si es un string, usarlo directamente
      return service.clientId;
    }
    
    // Si solo tiene clientName, buscar el ID en la lista de clientes
    if (service.clientName) {
      const client = clients.find(c => 
        (c.type === 'natural' ? c.fullName : c.companyName) === service.clientName
      );
      return client ? (client._id || client.id) : null;
    }
    
    return null;
  };

  const getCrewMembersForService = (service: any) => {
    if (service.crewMembers && service.crewMembers.length > 0) {
      return service.crewMembers.length === 1 
        ? service.crewMembers[0].name 
        : `${service.crewMembers[0].name} +${service.crewMembers.length - 1}`;
    }
    return service.crewName || 'N/A';
  };

  // Función auxiliar para formatear fecha a YYYY-MM-DD usando hora local
  const formatDateToLocalString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodayDates = () => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { 
      start: formatDateToLocalString(startOfDay), 
      end: formatDateToLocalString(endOfDay) 
    };
  };

  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // Calcular el lunes de la semana actual (lunes = 1, domingo = 0)
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { 
      start: formatDateToLocalString(startOfWeek), 
      end: formatDateToLocalString(endOfWeek) 
    };
  };

  const getCurrentMonthDates = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    return { 
      start: formatDateToLocalString(startOfMonth), 
      end: formatDateToLocalString(endOfMonth) 
    };
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
        // Abrir modal de fechas avanzadas
        setIsDateModalOpen(true);
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

  const handleApplyDateFilter = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setIsUsingPeriodFilter(true);
    setActivePeriodFilter('advanced');
    setIsDateModalOpen(false);
  };

  const handleCancelDateFilter = () => {
    setIsDateModalOpen(false);
    // Si no hay fechas establecidas, desactivar el filtro avanzado
    if (!startDate || !endDate) {
      setIsUsingPeriodFilter(false);
      setActivePeriodFilter('none');
    } else {
      // Si hay fechas pero se cancela, mantener el filtro avanzado activo
      setActivePeriodFilter('advanced');
    }
  };

  // Funciones para manejar selección múltiple
  const handleServiceSelection = (serviceId: string, clientId: string | null) => {
    console.log('handleServiceSelection called:', { 
      serviceId, 
      clientId, 
      selectedClientId, 
      selectedServices,
      clientIdType: typeof clientId,
      selectedClientIdType: typeof selectedClientId,
      areEqual: selectedClientId === clientId
    });
    
    // Si no hay clientId, no permitir selección
    if (!clientId) {
      toast.error('No se puede determinar el cliente para este servicio');
      return;
    }
    
    // Si no hay cliente seleccionado o es el mismo cliente
    if (!selectedClientId || selectedClientId === clientId) {
      // Solo establecer el cliente si no hay ninguno seleccionado
      if (!selectedClientId) {
        setSelectedClientId(clientId);
      }
      
      if (selectedServices.includes(serviceId)) {
        // Deseleccionar servicio
        const newSelection = selectedServices.filter(id => id !== serviceId);
        setSelectedServices(newSelection);
        
        // Si no quedan servicios seleccionados, limpiar cliente
        if (newSelection.length === 0) {
          setSelectedClientId(null);
        }
      } else {
        // Seleccionar servicio
        setSelectedServices([...selectedServices, serviceId]);
      }
    } else {
      // Si es un cliente diferente, mostrar mensaje de error
      toast.error('Solo puedes seleccionar servicios del mismo cliente');
    }
  };

  const clearSelection = () => {
    setSelectedServices([]);
    setSelectedClientId(null);
  };

  const getSelectedClientName = () => {
    if (!selectedClientId) return '';
    const client = clients.find(c => (c._id || c.id) === selectedClientId);
    return client ? (client.type === 'natural' ? client.fullName : client.companyName) : '';
  };

  const toggleInvoiceExpansion = (invoiceNumber: string) => {
    setExpandedInvoices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(invoiceNumber)) {
        newSet.delete(invoiceNumber);
      } else {
        newSet.add(invoiceNumber);
      }
      return newSet;
    });
  };

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase();
    
    return (services || []).filter((service: any) => {
      // Filtrar por modo de vista primero
      if (viewMode === 'completed') {
        // Solo mostrar servicios completados
        if (service.status !== 'completed') {
          return false;
        }
      } else {
        // Solo mostrar servicios facturados o nota de crédito
        if (!['facturado', 'nota_de_credito'].includes(service.status)) {
          return false;
        }
      }
      
      // Búsqueda - Solo por cliente y ubicaciones
      const clientName = getClientForService(service).toLowerCase();
      
      const matchesSearch = clientName.includes(q) || 
                           (service.pickupLocation || '').toLowerCase().includes(q) ||
                           (service.dropoffLocation || '').toLowerCase().includes(q);
      
      // Filtro de estado
      const matchesStatus = statusFilter === 'all' || service.status === statusFilter;
      
      // Filtro de cliente
      const matchesClient = clientFilter === 'all' || service.clientId === clientFilter;
      
      // Filtro de vessel
      const matchesVessel = !vesselFilter || (service.vessel || '').toLowerCase().includes(vesselFilter.toLowerCase());
      
      // Filtro de crew rank
      let matchesCrewRank = true;
      if (crewRankFilter !== 'all' && service.crewMembers && service.crewMembers.length > 0) {
        const crewRanks = service.crewMembers.map((member: any) => 
          (member.crewRank || '').toLowerCase()
        );
        
        switch (crewRankFilter) {
          case 'security_guard':
            matchesCrewRank = crewRanks.some(rank => 
              rank.includes('security guard') || rank.includes('security')
            );
            break;
          case 'seal_check':
            matchesCrewRank = crewRanks.some(rank => 
              rank.includes('seal check') || rank.includes('seal')
            );
            break;
          case 'both':
            matchesCrewRank = crewRanks.some(rank => 
              rank.includes('security guard') || rank.includes('security') ||
              rank.includes('seal check') || rank.includes('seal')
            );
            break;
        }
      }
      
      // Filtro de fecha
      // En vista "completados" usar pickupDate, en vista "facturados" usar invoiceDate
      let matchesDate = true;
      if (isUsingPeriodFilter && startDate && endDate) {
        // Seleccionar la fecha según el modo de vista
        let serviceDate: string | Date | undefined;
        if (viewMode === 'completed') {
          // Para servicios completados, usar la fecha del servicio (pickupDate)
          serviceDate = service.pickupDate || service.createdAt;
        } else {
          // Para facturados y N/C, usar la fecha de factura (invoiceDate)
          serviceDate = service.invoiceDate || service.pickupDate || service.createdAt;
        }
        
        if (serviceDate) {
          // Convertir la fecha del servicio a formato YYYY-MM-DD para comparación
          let serviceDateStr: string;
          if (typeof serviceDate === 'string') {
            // Si es string, extraer solo la parte de fecha
            serviceDateStr = serviceDate.split('T')[0];
          } else {
            // Si es Date object, convertir a string
            const date = new Date(serviceDate);
            serviceDateStr = date.toISOString().split('T')[0];
          }
          
          // Comparar strings de fecha directamente (YYYY-MM-DD)
          matchesDate = serviceDateStr >= startDate && serviceDateStr <= endDate;
        } else {
          matchesDate = false;
        }
      }
      
      return matchesSearch && matchesStatus && matchesClient && matchesVessel && matchesCrewRank && matchesDate;
    });
  }, [services, search, statusFilter, clientFilter, vesselFilter, crewRankFilter, isUsingPeriodFilter, startDate, endDate, clients, viewMode]);

  // Agrupar servicios por número de factura
  const groupedServices = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    const ungrouped: any[] = [];
    
    filteredServices.forEach((service: any) => {
      // Solo agrupar servicios facturados o nota de crédito con número de factura
      if ((service.status === 'facturado' || service.status === 'nota_de_credito') && service.invoiceNumber) {
        if (!groups[service.invoiceNumber]) {
          groups[service.invoiceNumber] = [];
        }
        groups[service.invoiceNumber].push(service);
      } else {
        // Servicios completados o sin número de factura van sin agrupar
        ungrouped.push(service);
      }
    });
    
    return { groups, ungrouped };
  }, [filteredServices]);

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

  const handleOpenFacturarMultipleModal = () => {
    // Para facturación múltiple, no establecer un servicio específico
    setServiceToFacturar(null);
    setFacturarModalOpen(true);
  };

  const handleOpenXmlModal = (service: any, allServicesForInvoice?: any[]) => {
    setServiceForXml(service);
    setServicesForXml(allServicesForInvoice || []);
    setXmlModalOpen(true);
  };

  const handleOpenPdfModal = (service: any) => {
    setServiceForPdf(service);
    setServicesForPdf([]);
    setIsPdfMultipleServices(false);
    setPdfModalOpen(true);
  };

  const handleOpenPdfMultipleModal = () => {
    // Obtener los servicios seleccionados completos
    const selectedServicesData = services.filter((s: any) => 
      selectedServices.includes(s._id || s.id)
    );
    setServicesForPdf(selectedServicesData);
    setServiceForPdf(null);
    setIsPdfMultipleServices(true);
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

  const handleFacturarMultipleServices = async (serviceIds: string, invoiceNumber: string, invoiceDate: string, xmlData: any, hourlyRate?: number) => {
    try {
      // Convertir el string de IDs separados por comas en array
      const serviceIdArray = serviceIds.split(',');
      
      console.log('Facturando múltiples servicios:', { 
        serviceIds: serviceIdArray, 
        invoiceNumber, 
        invoiceDate, 
        xmlData, 
        hourlyRate 
      });
      
      // Obtener los servicios completos para calcular waiting time price individual
      const servicesToInvoice = services.filter((s: any) => 
        serviceIdArray.includes(s._id || s.id)
      );
      
      console.log('Servicios a facturar con waiting time:', servicesToInvoice.map((s: any) => ({
        id: s._id || s.id,
        waitingTime: s.waitingTime,
        waitingTimeMinutes: s.waitingTime || 0
      })));
      
      // Facturar cada servicio seleccionado con su waiting time price individual
      const promises = servicesToInvoice.map(service => {
        // Calcular waiting time price individual para este servicio
        let individualWaitingTimePrice = 0;
        if (service.waitingTime && service.waitingTime > 0 && hourlyRate && hourlyRate > 0) {
          const hours = service.waitingTime / 60; // Convertir minutos a horas
          individualWaitingTimePrice = hours * hourlyRate;
          console.log(`Servicio ${service._id}: ${service.waitingTime} min = ${hours.toFixed(2)} hrs × $${hourlyRate}/hr = $${individualWaitingTimePrice.toFixed(2)}`);
        }
        
        return updateService({
          id: service._id || service.id,
          updateData: {
            status: 'facturado' as any,
            invoiceNumber: invoiceNumber,
            invoiceDate: invoiceDate,
            xmlData: xmlData,
            waitingTimePrice: individualWaitingTimePrice
          }
        });
      });
      
      await Promise.all(promises);
      
      toast.success(`${serviceIdArray.length} servicios facturados: ${invoiceNumber}`);
      
      // Limpiar selección
      clearSelection();
      
      // Refresh services list
      fetchServices({ page: 1, limit: 100 }).catch(err => {
        console.error('Error refreshing services:', err);
      });
    } catch (e: any) {
      console.error('Error in handleFacturarMultipleServices:', e);
      toast.error(e.message || 'Error al facturar servicios múltiples');
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

      {/* Botones de Toggle de Vista */}
      <div className="flex items-center gap-3">
        <Button
          variant={viewMode === 'completed' ? 'default' : 'outline'}
          onClick={() => setViewMode('completed')}
          className="flex items-center gap-2"
        >
          <CheckCircle className="h-4 w-4" />
          Servicios Completados
          <Badge variant="secondary" className={`ml-2 ${viewMode === 'completed' ? 'bg-white text-blue-600' : 'bg-gray-200'}`}>
            {services.filter((s: any) => s.status === 'completed').length}
          </Badge>
        </Button>
        <Button
          variant={viewMode === 'invoiced' ? 'default' : 'outline'}
          onClick={() => setViewMode('invoiced')}
          className="flex items-center gap-2"
        >
          <Receipt className="h-4 w-4" />
          Facturados y N/C
          <Badge variant="secondary" className={`ml-2 ${viewMode === 'invoiced' ? 'bg-white text-blue-600' : 'bg-gray-200'}`}>
            {services.filter((s: any) => ['facturado', 'nota_de_credito'].includes(s.status)).length}
          </Badge>
        </Button>
      </div>

          <Card>
        <CardContent className="space-y-4 mt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                value={search} 
                onChange={(e) => setSearch(e.target.value)} 
                placeholder="Buscar por cliente o ubicación..." 
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
            <Select value={crewRankFilter} onValueChange={(v) => setCrewRankFilter(v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Crew Rank" />
                    </SelectTrigger>
                    <SelectContent>
                <SelectItem value="all">Todos los Ranks</SelectItem>
                <SelectItem value="security_guard">Security Guard</SelectItem>
                <SelectItem value="seal_check">Seal Check</SelectItem>
                <SelectItem value="both">Security Guard + Seal Check</SelectItem>
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

          {/* Información de selección múltiple */}
          {selectedServices.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
              <Badge variant="default" className="bg-green-600 text-white text-xs">
                {selectedServices.length} servicio{selectedServices.length !== 1 ? 's' : ''} seleccionado{selectedServices.length !== 1 ? 's' : ''}
              </Badge>
              <span className="text-sm text-green-700">
                Cliente: {getSelectedClientName()}
              </span>
              {/* Mostrar botón Facturar solo si hay servicios completados */}
              {services.filter((s: any) => selectedServices.includes(s._id || s.id) && s.status === 'completed').length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOpenFacturarMultipleModal} 
                  className="h-8 px-3 text-green-700 border-green-600 hover:bg-green-50"
                >
                  Facturar Todos
                </Button>
              )}
              {/* Mostrar botón Ver PDF solo si todos los servicios están facturados */}
              {services.filter((s: any) => selectedServices.includes(s._id || s.id)).every((s: any) => s.status === 'facturado') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleOpenPdfMultipleModal} 
                  className="h-8 px-3 text-purple-700 border-purple-600 hover:bg-purple-50"
                >
                  Ver PDF
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearSelection} 
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
                  <TableHead className="w-12">Sel.</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Crew</TableHead>
                      <TableHead>Vessel</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>N° Factura</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Cargando…
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredServices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No hay servicios que coincidan con los filtros
                        </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {/* Renderizar facturas agrupadas primero */}
                    {Object.entries(groupedServices.groups).map(([invoiceNumber, invoiceServices]) => {
                      const isExpanded = expandedInvoices.has(invoiceNumber);
                      const firstService = invoiceServices[0];
                      const totalServices = invoiceServices.length;
                      const totalAmount = invoiceServices.reduce((sum: number, s: any) => sum + (s.price || 0) + (s.waitingTimePrice || 0), 0);
                      
                      return (
                        <React.Fragment key={`invoice-${invoiceNumber}`}>
                          {/* Fila principal de la factura agrupada */}
                          <TableRow className="bg-blue-50 hover:bg-blue-100 cursor-pointer" onClick={() => toggleInvoiceExpansion(invoiceNumber)}>
                            <TableCell>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {formatDate(firstService.invoiceDate || firstService.pickupDate)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {totalServices} servicio{totalServices !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {getClientForService(firstService)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                {totalServices} crew member{totalServices !== 1 ? 's' : ''}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                Múltiples
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-muted-foreground">
                                Múltiples rutas
                              </div>
                            </TableCell>
                            <TableCell>
                              {firstService.status === 'facturado' ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  Facturado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-600">
                                  Nota de Crédito
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-blue-700">
                                {invoiceNumber}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                ${totalAmount.toFixed(2)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {/* Botón Ver PDF */}
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  title="Ver PDF" 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setServicesForPdf(invoiceServices);
                                    setServiceForPdf(null);
                                    setIsPdfMultipleServices(true);
                                    setPdfModalOpen(true);
                                  }} 
                                  className="h-8 w-8 text-purple-600 hover:bg-purple-50"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                                {/* Botón XML - Solo para facturado */}
                                {firstService.status === 'facturado' && (
                                  <Button 
                                    variant="ghost"
                                    size="sm"
                                    title={firstService.sentToSap ? 'XML enviado a SAP' : 'Ver/Enviar XML a SAP'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenXmlModal(firstService, invoiceServices);
                                    }}
                                    className={`h-8 w-8 ${firstService.sentToSap ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-orange-600 hover:text-orange-700 hover:bg-orange-50'}`}
                                  >
                                    <Code className="h-4 w-4" />
                                  </Button>
                                )}
                                {/* Botón Nota de Crédito - Solo para facturado */}
                                {firstService.status === 'facturado' && (
                                  <Button 
                                    variant="outline"
                                    size="sm"
                                    title="Cambiar todos a Nota de Crédito"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (confirm(`¿Está seguro de cambiar los ${totalServices} servicios de esta factura a Nota de Crédito? Esta acción no se puede deshacer.`)) {
                                        try {
                                          for (const svc of invoiceServices) {
                                            await updateStatus({ id: svc._id || svc.id, status: 'nota_de_credito' as any });
                                          }
                                          toast.success(`${totalServices} servicios cambiados a Nota de Crédito`);
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
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Filas expandidas con los servicios individuales */}
                          {isExpanded && invoiceServices.map((service: any, index: number) => (
                            <TableRow key={service._id || service.id} className="bg-blue-25">
                              <TableCell className="pl-12">
                                <div className="text-xs text-muted-foreground">#{index + 1}</div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-sm">
                                    {formatDate(service.pickupDate)}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {service.pickupTime || 'N/A'}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {getClientForService(service)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  {service.crewMembers && service.crewMembers.length > 0 ? (
                                    <>
                                      <div className="font-medium text-sm">
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
                                    <div className="font-medium text-sm">{service.crewName || 'N/A'}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium text-sm">{service.vessel || 'N/A'}</div>
                                {service.voyage && (
                                  <div className="text-xs text-muted-foreground">V. {service.voyage}</div>
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
                                <div className="text-xs text-muted-foreground">
                                  ${((service.price || 0) + (service.waitingTimePrice || 0)).toFixed(2)}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs text-muted-foreground">
                                  {invoiceNumber}
                                </div>
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
                          ))}
                        </React.Fragment>
                      );
                    })}
                    
                    {/* Renderizar servicios no agrupados (completados o sin factura) */}
                    {groupedServices.ungrouped.map((service: any) => (
                    <TableRow key={service._id || service.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedServices.includes(service._id || service.id)}
                            onCheckedChange={() => handleServiceSelection(service._id || service.id, getClientIdForService(service))}
                            disabled={service.status !== 'completed'}
                          />
                        </TableCell>
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
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {service.invoiceNumber || '-'}
                          </div>
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
                  ))}
                  </>
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
        onFacturar={serviceToFacturar ? handleFacturarService : handleFacturarMultipleServices}
        isMultipleServices={!serviceToFacturar && selectedServices.length > 0}
        selectedServices={selectedServices}
        selectedClientName={getSelectedClientName()}
        allServices={services.filter((s: any) => selectedServices.includes(s._id || s.id))}
      />

      {/* Modal de XML */}
      <AgencyServiceXmlModal
        open={xmlModalOpen}
        onOpenChange={setXmlModalOpen}
        service={serviceForXml}
        services={servicesForXml}
        onXmlSentToSap={() => {
          fetchServices({ page: 1, limit: 100 });
        }}
      />

      {/* Modal de PDF */}
      <AgencyPdfViewer
        open={pdfModalOpen}
        onOpenChange={setPdfModalOpen}
        service={serviceForPdf}
        services={servicesForPdf}
        isMultipleServices={isPdfMultipleServices}
      />

      {/* Modal de Selección de Fechas Avanzadas */}
      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Seleccionar Rango de Fechas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha desde:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Fecha hasta:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
            
            {/* Botones de período rápido dentro del modal */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-600">Períodos rápidos:</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const todayDates = getTodayDates();
                    setStartDate(todayDates.start);
                    setEndDate(todayDates.end);
                  }}
                  className="text-xs"
                >
                  Hoy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const weekDates = getCurrentWeekDates();
                    setStartDate(weekDates.start);
                    setEndDate(weekDates.end);
                  }}
                  className="text-xs"
                >
                  Semana
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const monthDates = getCurrentMonthDates();
                    setStartDate(monthDates.start);
                    setEndDate(monthDates.end);
                  }}
                  className="text-xs"
                >
                  Mes
                </Button>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleCancelDateFilter}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleApplyDateFilter(startDate, endDate)}
              disabled={!startDate || !endDate}
            >
              Aplicar Filtro
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgencySapInvoice;
