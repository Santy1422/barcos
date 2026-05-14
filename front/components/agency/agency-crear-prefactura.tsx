'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { fetchClients, selectAllClients } from '@/lib/features/clients/clientsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Ship,
  Calendar,
  Loader2,
  X,
  FileText,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Eye,
  Database,
  Filter,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { AgencyPdfViewer } from './agency-pdf-viewer';
import { useAgencyCatalogs } from '@/lib/features/agencyServices/useAgencyCatalogs';

const formatDateToLocalString = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

function getRankValuesForService(service: any): string[] {
  const ranks: string[] = [];
  if (service.crewMembers?.length) {
    for (const m of service.crewMembers) {
      const r = String(m?.crewRank ?? '').trim();
      if (r) ranks.push(r);
    }
  }
  const legacy = String(service.crewRank ?? '').trim();
  if (legacy) ranks.push(legacy);
  return [...new Set(ranks)];
}

function getServiceRanksLabel(service: any): string {
  const ranks = getRankValuesForService(service);
  if (ranks.length === 0) return 'N/A';
  return ranks.join(', ');
}

export function AgencyCrearPrefactura() {
  const dispatch = useAppDispatch();
  const clients = useAppSelector(selectAllClients);
  const {
    services,
    loading,
    fetchServices,
    createInvoice,
  } = useAgencyServices();
  const { groupedCatalogs, fetchGroupedCatalogs } = useAgencyCatalogs();

  const [step, setStep] = useState<1 | 2>(1);
  const [clientFilter, setClientFilter] = useState('all');
  const [vesselFilter, setVesselFilter] = useState('');
  const [rankFilter, setRankFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('');
  const [serviceCodeFilter, setServiceCodeFilter] = useState('');
  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [clientFilterSearch, setClientFilterSearch] = useState('');
  const [rankFilterSearch, setRankFilterSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateFilter, setDateFilter] = useState<'createdAt' | 'pickupDate'>('createdAt');
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none' | 'today' | 'week' | 'month' | 'advanced'>('none');
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [prefacturaNumber, setPrefacturaNumber] = useState(`AGY-PRE-${Date.now().toString().slice(-6)}`);
  const [notes, setNotes] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  useEffect(() => {
    dispatch(fetchClients());
    fetchServices({ page: 1, limit: 5000, filters: { statusIn: ['completed'] } })
      .then(() => setInitialLoaded(true))
      .catch(() => setInitialLoaded(true));
    fetchGroupedCatalogs();
  }, [dispatch, fetchGroupedCatalogs]);

  const getTodayDates = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    return { start: formatDateToLocalString(start), end: formatDateToLocalString(end) };
  };
  const getCurrentWeekDates = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfWeek = new Date(today.getFullYear(), today.getMonth(), diff);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return { start: formatDateToLocalString(startOfWeek), end: formatDateToLocalString(endOfWeek) };
  };
  const getCurrentMonthDates = () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: formatDateToLocalString(start), end: formatDateToLocalString(end) };
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
      case 'advanced': setIsDateModalOpen(true); break;
    }
  };

  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter === 'advanced') return null;
    if (startDate === endDate) return 'Hoy';
    const week = getCurrentWeekDates();
    const month = getCurrentMonthDates();
    if (startDate === week.start && endDate === week.end) return 'Semana en curso';
    if (startDate === month.start && endDate === month.end) return 'Mes en curso';
    return 'Período personalizado';
  };

  const getClientForService = (service: any) => {
    if (service.clientName) return service.clientName;
    const c = clients.find((x: any) => (x._id || x.id) === (typeof service.clientId === 'object' ? service.clientId?._id : service.clientId));
    return c ? (c.type === 'natural' ? c.fullName : c.companyName) : 'N/A';
  };

  const getClientIdForService = (service: any) => {
    if (typeof service.clientId === 'object') return service.clientId?._id || service.clientId?.id || null;
    return service.clientId || null;
  };

  const completedServices = useMemo(() => {
    return (services || []).filter((s: any) => s.status === 'completed');
  }, [services]);

  const uniqueClientOptions = useMemo(() => {
    const list = completedServices;
    const seen = new Set<string>();
    const options: { id: string; name: string }[] = [];
    list.forEach((s: any) => {
      const id = getClientIdForService(s) || '';
      const name = getClientForService(s) || '';
      if (id && !seen.has(id)) {
        seen.add(id);
        options.push({ id, name: name || id });
      }
    });
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [completedServices, clients]);

  const uniqueRankOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];
    completedServices.forEach((s: any) => {
      getRankValuesForService(s).forEach((r) => {
        if (!seen.has(r)) {
          seen.add(r);
          options.push(r);
        }
      });
    });
    return options.sort((a, b) => a.localeCompare(b));
  }, [completedServices]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterColumn) {
        const target = event.target as Element;
        if (!target.closest('[data-column-filter]')) setOpenFilterColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterColumn]);

  const filteredServices = useMemo(() => {
    return completedServices.filter((service: any) => {
      const matchClient = clientFilter === 'all' || getClientIdForService(service) === clientFilter;
      const matchVessel = !vesselFilter || (service.vessel || '').toLowerCase().includes(vesselFilter.toLowerCase());
      const matchRank =
        rankFilter === 'all' || getRankValuesForService(service).includes(rankFilter);
      const matchRoute = !routeFilter || (() => {
        const q = routeFilter.toLowerCase();
        const pickup = (service.pickupLocation || '').toLowerCase();
        const dropoff = (service.dropoffLocation || '').toLowerCase();
        return pickup.includes(q) || dropoff.includes(q);
      })();
      const matchServiceCode =
        !serviceCodeFilter ||
        (String(service.serviceCode ?? '')
          .toLowerCase()
          .includes(serviceCodeFilter.toLowerCase().trim()));
      let matchDate = true;
      if (isUsingPeriodFilter && startDate && endDate) {
        const dateValue = dateFilter === 'pickupDate' ? (service.pickupDate || service.createdAt) : (service.createdAt || service.pickupDate);
        const sd = (dateValue || '').toString().split('T')[0];
        matchDate = sd >= startDate && sd <= endDate;
      }
      return matchClient && matchVessel && matchRank && matchRoute && matchServiceCode && matchDate;
    });
  }, [completedServices, clientFilter, vesselFilter, rankFilter, routeFilter, serviceCodeFilter, isUsingPeriodFilter, startDate, endDate, dateFilter, clients]);

  useEffect(() => {
    setCurrentPage(1);
  }, [clientFilter, vesselFilter, rankFilter, routeFilter, serviceCodeFilter, isUsingPeriodFilter, startDate, endDate, dateFilter]);

  const totalPages = Math.ceil(filteredServices.length / pageSize);
  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, currentPage, pageSize]);

  const filteredServiceIds = useMemo(
    () => filteredServices.map((s: any) => s._id || s.id).filter(Boolean) as string[],
    [filteredServices],
  );

  const canBulkSelectAll = clientFilter !== 'all' && filteredServiceIds.length > 0;

  const allFilteredSelected =
    canBulkSelectAll &&
    filteredServiceIds.length > 0 &&
    filteredServiceIds.every((id) => selectedServices.includes(id));

  const someFilteredSelected =
    canBulkSelectAll && filteredServiceIds.some((id) => selectedServices.includes(id));

  const headerSelectAllState: boolean | 'indeterminate' = !canBulkSelectAll
    ? false
    : allFilteredSelected
      ? true
      : someFilteredSelected
        ? 'indeterminate'
        : false;

  const handleToggleSelectAllFiltered = (value: boolean | 'indeterminate') => {
    if (clientFilter === 'all' || filteredServiceIds.length === 0) return;
    const checked = value === true;
    const ids = filteredServiceIds;
    if (checked) {
      if (selectedClientId && selectedClientId !== clientFilter) {
        toast.error('Solo puedes seleccionar servicios del mismo cliente');
        return;
      }
      setSelectedClientId(clientFilter);
      setSelectedServices((prev) => Array.from(new Set([...prev, ...ids])));
    } else {
      const idSet = new Set(ids);
      const next = selectedServices.filter((id) => !idSet.has(id));
      setSelectedServices(next);
      if (next.length === 0) setSelectedClientId(null);
    }
  };

  const handleServiceSelection = (serviceId: string, clientId: string | null) => {
    if (!clientId) {
      toast.error('No se puede determinar el cliente para este servicio');
      return;
    }
    if (!selectedClientId || selectedClientId === clientId) {
      if (!selectedClientId) setSelectedClientId(clientId);
      if (selectedServices.includes(serviceId)) {
        const next = selectedServices.filter(id => id !== serviceId);
        setSelectedServices(next);
        if (next.length === 0) setSelectedClientId(null);
      } else {
        setSelectedServices([...selectedServices, serviceId]);
      }
    } else {
      toast.error('Solo puedes seleccionar servicios del mismo cliente');
    }
  };

  const clearSelection = () => {
    setSelectedServices([]);
    setSelectedClientId(null);
  };

  const getSelectedClientName = () => {
    if (!selectedClientId) return '';
    const c = clients.find((x: any) => (x._id || x.id) === selectedClientId);
    return c ? (c.type === 'natural' ? c.fullName : c.companyName) : '';
  };

  const selectedServicesData = useMemo(() => {
    return (services || []).filter((s: any) => selectedServices.includes(s._id || s.id));
  }, [services, selectedServices]);

  const waitingTimeConfig = groupedCatalogs?.taulia_code?.find((c: any) => c.code === 'WAITING_TIME_RATE');
  const waitingTimeHourlyRate = waitingTimeConfig?.metadata?.price != null ? Number(waitingTimeConfig.metadata.price) : 10;

  const getServiceWaitingAmount = (s: any) => {
    if (!s?.waitingTime || s.waitingTime <= 0) return 0;
    if (s.waitingTimePrice != null && s.waitingTimePrice > 0) return s.waitingTimePrice;
    return Math.round((s.waitingTime / 60) * waitingTimeHourlyRate * 100) / 100;
  };

  const subtotalServicios = useMemo(() => {
    return selectedServicesData.reduce((sum: number, s: any) => sum + (s.price || 0), 0);
  }, [selectedServicesData]);

  const totalWaiting = useMemo(() => {
    return selectedServicesData.reduce((sum: number, s: any) => sum + getServiceWaitingAmount(s), 0);
  }, [selectedServicesData, waitingTimeHourlyRate]);

  const totalSelected = useMemo(() => subtotalServicios + totalWaiting, [subtotalServicios, totalWaiting]);

  const canGoToStep2 = selectedServices.length > 0;

  const handleCreatePrefactura = async () => {
    if (!selectedClientId || selectedServices.length === 0 || !prefacturaNumber.trim()) {
      toast.error('Selecciona al menos un servicio, un cliente y un número de prefactura');
      return;
    }
    setIsCreating(true);
    try {
      const issueDate = formatDateToLocalString(new Date());
      await createInvoice({
        invoiceNumber: prefacturaNumber.trim(),
        clientId: selectedClientId,
        relatedServiceIds: selectedServices,
        issueDate,
        details: notes.trim() ? { notes: notes.trim() } : undefined,
      });
      toast.success(`Prefactura ${prefacturaNumber} creada con ${selectedServices.length} servicio(s)`);
      clearSelection();
      setPrefacturaNumber(`AGY-PRE-${Date.now().toString().slice(-6)}`);
      setNotes('');
      setStep(1);
      fetchServices({ page: 1, limit: 500 });
    } catch (e: any) {
      toast.error(e?.message || 'Error al crear la prefactura');
    } finally {
      setIsCreating(false);
    }
  };

  const serviceForPdf = useMemo(() => {
    if (selectedServicesData.length === 0) return null;
    const first = selectedServicesData[0];
    return {
      ...first,
      invoiceNumber: prefacturaNumber,
      invoiceDate: formatDateToLocalString(new Date()),
    };
  }, [selectedServicesData, prefacturaNumber]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Crear Prefactura - Agency</h1>
          <p className="text-muted-foreground">Selecciona servicios completados y genera la prefactura (Paso 1 y Paso 2)</p>
        </div>
      </div>

      {/* Paso 1: Solo selección de servicios (como Trucking) */}
      {step === 1 && (
        <>
          <div className="bg-slate-800 text-white rounded-md p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-slate-700 flex items-center justify-center">🏷️</div>
              <div>
                <div className="text-lg font-semibold">Paso 1: Selección de Servicios</div>
                <Badge variant="secondary" className="text-slate-900 bg-white/90 mt-1">{filteredServices.length} disponibles</Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm opacity-90">{selectedServices.length} de {filteredServices.length} seleccionados</div>
              <Button
                variant="outline"
                disabled={selectedServices.length === 0}
                onClick={clearSelection}
                className="bg-white/10 hover:bg-white/20 border-white/30 text-white"
              >
                Limpiar selección
              </Button>
            </div>
          </div>

          <div className="mb-4 mt-4 flex flex-col lg:flex-row gap-4 items-start lg:items-center w-full">
            <div className="w-full lg:flex-1 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <Label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filtrar por fecha:</Label>
              <div className="flex gap-1">
                <Button
                  variant={dateFilter === 'createdAt' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setDateFilter('createdAt'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); clearSelection(); }}
                  className="text-xs h-8 px-3"
                >
                  Creación
                </Button>
                <Button
                  variant={dateFilter === 'pickupDate' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setDateFilter('pickupDate'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); clearSelection(); }}
                  className="text-xs h-8 px-3"
                >
                  Movimiento
                </Button>
              </div>
              <div className="hidden sm:block w-px h-6 bg-gray-300 self-center" />
              <div className="flex gap-1 flex-wrap">
                <Button variant={activePeriodFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('today')} className="text-xs h-8 px-2">Hoy</Button>
                <Button variant={activePeriodFilter === 'week' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('week')} className="text-xs h-8 px-2">Semana</Button>
                <Button variant={activePeriodFilter === 'month' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('month')} className="text-xs h-8 px-2">Mes</Button>
                <Button variant={activePeriodFilter === 'advanced' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('advanced')} className="text-xs h-8 px-2">Avanzado</Button>
              </div>
            </div>
            <div className="flex justify-end w-full lg:w-auto">
              <div className="flex items-center gap-3 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <Database className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-slate-900">Total de servicios mostrados: {filteredServices.length}</span>
                </div>
              </div>
            </div>
          </div>

          {isUsingPeriodFilter && activePeriodFilter !== 'advanced' && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-4">
              <Badge className="bg-blue-600 text-white text-xs">{getActivePeriodText()}</Badge>
              <span className="text-sm text-blue-700">{startDate} – {endDate}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => { setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); }}><X className="h-3 w-3" /></Button>
            </div>
          )}
          {activePeriodFilter === 'advanced' && startDate && endDate && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mb-4">
              <Badge className="bg-blue-600 text-white text-xs">Filtro Avanzado</Badge>
              <span className="text-sm text-blue-700">{startDate} – {endDate}</span>
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsDateModalOpen(true)}><Calendar className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); }}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="pt-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 py-3 align-middle">
                        <Checkbox
                          checked={headerSelectAllState}
                          disabled={!canBulkSelectAll}
                          onCheckedChange={handleToggleSelectAllFiltered}
                          title={
                            canBulkSelectAll
                              ? 'Seleccionar o quitar todos los servicios filtrados (todas las páginas)'
                              : 'Filtra por un único cliente en la columna Cliente para seleccionar todos de una vez'
                          }
                          aria-label="Seleccionar todos los servicios filtrados"
                          className="translate-y-[1px]"
                        />
                      </TableHead>
                      <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Fecha</TableHead>
                      <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative" data-column-filter>
                        <div className="flex items-center gap-1">
                          <span>Cliente</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {clientFilter !== 'all' && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setClientFilter('all'); setOpenFilterColumn(null); setClientFilterSearch(''); }}><X className="h-3 w-3" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => { setOpenFilterColumn(openFilterColumn === 'client' ? null : 'client'); setClientFilterSearch(''); }} className={`h-6 w-6 p-0 ${clientFilter !== 'all' ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        {openFilterColumn === 'client' && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg p-3 min-w-64">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por cliente:</div>
                            <Input placeholder="Buscar cliente..." value={clientFilterSearch} onChange={(e) => setClientFilterSearch(e.target.value)} className="h-8 text-xs mb-2" />
                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                              <div className={`px-2 py-1.5 text-xs cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-slate-800 ${clientFilter === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium' : ''}`} onClick={() => { setClientFilter('all'); setOpenFilterColumn(null); setClientFilterSearch(''); }}>Todos los clientes</div>
                              {uniqueClientOptions.filter(opt => !clientFilterSearch || opt.name.toLowerCase().includes(clientFilterSearch.toLowerCase())).map((opt) => (
                                <div key={opt.id} className={`px-2 py-1.5 text-xs cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-slate-800 ${clientFilter === opt.id ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium' : ''}`} onClick={() => { setClientFilter(opt.id); setOpenFilterColumn(null); setClientFilterSearch(''); }}>{opt.name}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TableHead>
                      <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative min-w-[7rem]" data-column-filter>
                        <div className="flex items-center gap-1">
                          <span>Service code</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {serviceCodeFilter && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setServiceCodeFilter(''); setOpenFilterColumn(null); }}><X className="h-3 w-3" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setOpenFilterColumn(openFilterColumn === 'serviceCode' ? null : 'serviceCode')} className={`h-6 w-6 p-0 ${serviceCodeFilter ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        {openFilterColumn === 'serviceCode' && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg p-3 min-w-52">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por service code:</div>
                            <Input placeholder="Buscar..." value={serviceCodeFilter} onChange={(e) => setServiceCodeFilter(e.target.value)} className="h-8 text-xs" />
                          </div>
                        )}
                      </TableHead>
                      <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative" data-column-filter>
                        <div className="flex items-center gap-1">
                          <span>Rank</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {rankFilter !== 'all' && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setRankFilter('all'); setOpenFilterColumn(null); setRankFilterSearch(''); }}><X className="h-3 w-3" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => { setOpenFilterColumn(openFilterColumn === 'rank' ? null : 'rank'); setRankFilterSearch(''); }} className={`h-6 w-6 p-0 ${rankFilter !== 'all' ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        {openFilterColumn === 'rank' && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg p-3 min-w-64">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por rank:</div>
                            <Input placeholder="Buscar rank..." value={rankFilterSearch} onChange={(e) => setRankFilterSearch(e.target.value)} className="h-8 text-xs mb-2" />
                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                              <div className={`px-2 py-1.5 text-xs cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-slate-800 ${rankFilter === 'all' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium' : ''}`} onClick={() => { setRankFilter('all'); setOpenFilterColumn(null); setRankFilterSearch(''); }}>Todos los ranks</div>
                              {uniqueRankOptions.filter((opt) => !rankFilterSearch || opt.toLowerCase().includes(rankFilterSearch.toLowerCase())).map((opt) => (
                                <div key={opt} className={`px-2 py-1.5 text-xs cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-slate-800 ${rankFilter === opt ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium' : ''}`} onClick={() => { setRankFilter(opt); setOpenFilterColumn(null); setRankFilterSearch(''); }}>{opt}</div>
                              ))}
                            </div>
                          </div>
                        )}
                      </TableHead>
                      <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative" data-column-filter>
                        <div className="flex items-center gap-1">
                          <span>Vessel</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {vesselFilter && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setVesselFilter(''); setOpenFilterColumn(null); }}><X className="h-3 w-3" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setOpenFilterColumn(openFilterColumn === 'vessel' ? null : 'vessel')} className={`h-6 w-6 p-0 ${vesselFilter ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        {openFilterColumn === 'vessel' && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg p-3 min-w-52">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por vessel:</div>
                            <Input placeholder="Buscar..." value={vesselFilter} onChange={(e) => setVesselFilter(e.target.value)} className="h-8 text-xs" />
                          </div>
                        )}
                      </TableHead>
                      <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative" data-column-filter>
                        <div className="flex items-center gap-1">
                          <span>Ruta</span>
                          <div className="flex items-center gap-0.5 shrink-0">
                            {routeFilter && (
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setRouteFilter(''); setOpenFilterColumn(null); }}><X className="h-3 w-3" /></Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setOpenFilterColumn(openFilterColumn === 'route' ? null : 'route')} className={`h-6 w-6 p-0 ${routeFilter ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                          </div>
                        </div>
                        {openFilterColumn === 'route' && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg p-3 min-w-52">
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por ruta:</div>
                            <Input placeholder="Pickup o dropoff..." value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="h-8 text-xs" />
                          </div>
                        )}
                      </TableHead>
                      <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Precio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading || !initialLoaded ? (
                      <TableRow><TableCell colSpan={8} className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                    ) : filteredServices.length === 0 ? (
                      <TableRow><TableCell colSpan={8} className="py-8 text-center text-muted-foreground">No hay servicios completados que coincidan con los filtros</TableCell></TableRow>
                    ) : (
                      paginatedServices.map((service: any) => {
                        const id = service._id || service.id;
                        const clientId = getClientIdForService(service);
                        const checked = selectedServices.includes(id);
                        return (
                          <TableRow key={id}>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                onCheckedChange={() => handleServiceSelection(id, clientId)}
                              />
                            </TableCell>
                            <TableCell className="text-xs">{(service.pickupDate || service.createdAt || '').toString().split('T')[0]}</TableCell>
                            <TableCell>{getClientForService(service)}</TableCell>
                            <TableCell className="text-xs max-w-[10rem]">
                              {service.serviceCode && String(service.serviceCode).trim() ? (
                                <span className="font-mono" title={String(service.serviceCode).trim()}>{String(service.serviceCode).trim()}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs max-w-[14rem]">{getServiceRanksLabel(service)}</TableCell>
                            <TableCell>{service.vessel || 'N/A'}</TableCell>
                            <TableCell className="text-xs">{(service.pickupLocation || '')} → {(service.dropoffLocation || '')}</TableCell>
                            <TableCell>${((service.price || 0) + getServiceWaitingAmount(service)).toFixed(2)}</TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {filteredServices.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Mostrando {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, filteredServices.length)} de {filteredServices.length}</span>
                    <span className="mx-1">|</span>
                    <span>Filas:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(1)}
                      className="h-8 px-2 text-xs"
                    >
                      ««
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => p - 1)}
                      className="h-8 px-2 text-xs"
                    >
                      ‹ Anterior
                    </Button>
                    <span className="px-3 text-sm font-medium">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => p + 1)}
                      className="h-8 px-2 text-xs"
                    >
                      Siguiente ›
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-8 px-2 text-xs"
                    >
                      »»
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-4">
                <Button onClick={() => setStep(2)} disabled={!canGoToStep2} className="gap-2">
                  Paso 2: Configuración y PDF <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Paso 2: Configuración de prefactura (número, notas) y vista previa PDF - como Trucking */}
      {step === 2 && (
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <FileText className="h-6 w-6" />
              </div>
              <div className="text-xl font-bold">Paso 2: Configuración de Prefactura</div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="gap-1 text-muted-foreground -mt-1">
              <ArrowLeft className="h-4 w-4" /> Volver al Paso 1
            </Button>

            {/* Resumen de servicios seleccionados */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-slate-600 rounded-md text-white">✓</div>
                <h3 className="font-semibold text-slate-900 text-base">Resumen de Servicios Seleccionados</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Cantidad:</span>
                  <div className="text-sm font-semibold text-slate-900">{selectedServices.length} servicio{selectedServices.length !== 1 ? 's' : ''}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Total:</span>
                  <div className="text-sm font-semibold text-slate-900">${totalSelected.toFixed(2)}</div>
                </div>
                <div className="bg-white/60 p-2 rounded-md">
                  <span className="text-slate-600 font-medium text-xs">Cliente:</span>
                  <div className="text-sm font-semibold text-slate-900">{getSelectedClientName() || 'N/A'}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Columna izquierda: Configuración de prefactura */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                  <h3 className="text-lg font-bold text-slate-900 border-b border-slate-300 pb-2 mb-2">Configuración de Prefactura</h3>
                  <div className="space-y-2">
                    <div className="space-y-2">
                      <Label htmlFor="prefactura-number" className="text-sm font-semibold text-slate-700">Número de Prefactura *</Label>
                      <Input
                        id="prefactura-number"
                        value={prefacturaNumber}
                        onChange={(e) => setPrefacturaNumber(e.target.value)}
                        placeholder="AGY-PRE-000001"
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes" className="text-sm font-semibold text-slate-700">Notas (Opcional)</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Notas adicionales para la prefactura..."
                        rows={4}
                        className="bg-white border-slate-300 focus:border-slate-500 focus:ring-slate-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Columna derecha: PDF inline al pasar al paso 2 + botón pantalla completa */}
              <div className="lg:col-span-2 bg-gradient-to-br from-slate-50 to-blue-50 p-3 rounded-lg border border-slate-300">
                {serviceForPdf && selectedServicesData.length > 0 ? (
                  <AgencyPdfViewer
                    inline
                    service={serviceForPdf}
                    services={selectedServicesData}
                    isMultipleServices={selectedServicesData.length > 1}
                    onOpenFullScreen={() => setPdfModalOpen(true)}
                  />
                ) : (
                  <div className="flex items-center justify-center h-[320px] border-2 border-dashed border-slate-300 rounded-lg bg-white/50">
                    <div className="text-center text-slate-500">
                      <FileText className="h-12 w-12 mx-auto mb-4" />
                      <p className="text-sm">Ingresa el número de prefactura para ver la vista previa</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={handleCreatePrefactura}
                    disabled={isCreating || !prefacturaNumber.trim()}
                    className="gap-2 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-700 hover:to-slate-800"
                  >
                    {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Crear prefactura
                  </Button>
                </div>
              </div>
            </div>

            {/* Detalles de la Prefactura (mismo patrón que PTYSS / invoice paso 2) */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-3 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-slate-600 rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg">Detalles de la Prefactura</h4>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                  <span className="font-semibold text-slate-800">Subtotal servicios:</span>
                  <span className="font-bold text-lg text-slate-900">${subtotalServicios.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center bg-white/60 p-3 rounded-lg">
                  <span className="font-semibold text-slate-800">Tiempo de espera:</span>
                  <span className="font-bold text-lg text-slate-900">${totalWaiting.toFixed(2)}</span>
                </div>
                <div className="border-t-2 border-slate-300 pt-3 flex justify-between items-center bg-gradient-to-r from-slate-200 to-blue-200 p-4 rounded-lg">
                  <span className="font-bold text-lg text-slate-900">Total:</span>
                  <span className="font-bold text-2xl text-slate-900">${totalSelected.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {serviceForPdf && (
        <AgencyPdfViewer
          open={pdfModalOpen}
          onOpenChange={setPdfModalOpen}
          service={serviceForPdf}
          services={selectedServicesData}
          isMultipleServices={selectedServicesData.length > 1}
        />
      )}

      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Rango de fechas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Desde</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDateModalOpen(false)}>Cerrar</Button>
              <Button onClick={() => { setIsUsingPeriodFilter(true); setActivePeriodFilter('advanced'); setIsDateModalOpen(false); }} disabled={!startDate || !endDate}>Aplicar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
