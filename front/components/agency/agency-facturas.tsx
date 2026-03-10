'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Ship,
  Calendar,
  Loader2,
  Eye,
  FileText,
  Code,
  Trash2,
  X,
  Info,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { AgencyPdfViewer } from './agency-pdf-viewer';
import { AgencyFacturacionModal } from './agency-facturacion-modal';
import { AgencyServiceXmlModal } from './agency-service-xml-modal';

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const s = (typeof dateString === 'string' ? dateString : String(dateString)).trim();
  const part = s.split('T')[0];
  if (part.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [y, m, d] = part.split('-').map(Number);
    if (y >= 1900 && y <= 2100) return new Date(y, m - 1, d).toLocaleDateString('es-ES');
  }
  return 'N/A';
};

export function AgencyFacturas() {
  const {
    invoices,
    invoicesLoading,
    fetchInvoices,
    fetchInvoiceById,
    facturarInvoice,
    deleteInvoice,
  } = useAgencyServices();

  const [statusFilter, setStatusFilter] = useState<'all' | 'prefactura' | 'facturada' | 'nota_de_credito'>('all');
  const [dateFilter, setDateFilter] = useState<'createdAt' | 'issueDate'>('issueDate');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activePeriodFilter, setActivePeriodFilter] = useState<'none' | 'today' | 'week' | 'month' | 'advanced'>('none');
  const [isUsingPeriodFilter, setIsUsingPeriodFilter] = useState(false);
  const [isDateModalOpen, setIsDateModalOpen] = useState(false);

  const [openFilterColumn, setOpenFilterColumn] = useState<string | null>(null);
  const [filterAnchorRect, setFilterAnchorRect] = useState<{ top: number; left: number; bottom: number; height: number } | null>(null);
  const [numberFilter, setNumberFilter] = useState('');
  const [clientNameFilter, setClientNameFilter] = useState('');

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [invoiceForPdf, setInvoiceForPdf] = useState<any>(null);
  const [facturarModalOpen, setFacturarModalOpen] = useState(false);
  const [invoiceToFacturar, setInvoiceToFacturar] = useState<any>(null);
  const [xmlModalOpen, setXmlModalOpen] = useState(false);
  const [invoiceForXml, setInvoiceForXml] = useState<any>(null);
  const [servicesForXml, setServicesForXml] = useState<any[]>([]);

  useEffect(() => {
    fetchInvoices({ page: 1, limit: 100, filters: {} });
  }, []);

  useEffect(() => {
    const filters: any = {};
    if (statusFilter !== 'all' && statusFilter !== 'nota_de_credito') filters.status = statusFilter;
    if (statusFilter === 'nota_de_credito') {
      filters.status = 'anulada';
    }
    if (isUsingPeriodFilter && startDate && endDate && dateFilter === 'issueDate') {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }
    fetchInvoices({ page: 1, limit: 100, filters });
  }, [statusFilter, isUsingPeriodFilter, startDate, endDate, dateFilter]);

  const getTodayDates = () => {
    const t = new Date();
    const s = new Date(t.getFullYear(), t.getMonth(), t.getDate());
    const e = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999);
    return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
  };
  const getWeekDates = () => {
    const t = new Date();
    const d = t.getDay();
    const diff = t.getDate() - d + (d === 0 ? -6 : 1);
    const s = new Date(t.getFullYear(), t.getMonth(), diff);
    const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999);
    return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
  };
  const getMonthDates = () => {
    const t = new Date();
    const s = new Date(t.getFullYear(), t.getMonth(), 1);
    const e = new Date(t.getFullYear(), t.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: s.toISOString().split('T')[0], end: e.toISOString().split('T')[0] };
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
      case 'week': { const d = getWeekDates(); setStartDate(d.start); setEndDate(d.end); break; }
      case 'month': { const d = getMonthDates(); setStartDate(d.start); setEndDate(d.end); break; }
      case 'advanced': setIsDateModalOpen(true); break;
    }
  };

  const getActivePeriodText = () => {
    if (!isUsingPeriodFilter || activePeriodFilter === 'advanced') return null;
    if (startDate === endDate) return 'Hoy';
    const w = getWeekDates(), m = getMonthDates();
    if (startDate === w.start && endDate === w.end) return 'Semana';
    if (startDate === m.start && endDate === m.end) return 'Mes';
    return 'Personalizado';
  };

  const openFilterMenu = (col: string) => (e: React.MouseEvent) => {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    setFilterAnchorRect({ top: rect.top, left: rect.left, bottom: rect.bottom, height: rect.height });
    setOpenFilterColumn(openFilterColumn === col ? null : col);
  };
  const closeFilterMenu = () => {
    setOpenFilterColumn(null);
    setFilterAnchorRect(null);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openFilterColumn) {
        const target = event.target as Element;
        if (!target.closest('[data-column-filter]') && !target.closest('[data-filter-portal]')) {
          closeFilterMenu();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openFilterColumn]);

  const filteredInvoices = useMemo(() => {
    let list = invoices || [];
    if (statusFilter !== 'all') {
      list = list.filter((inv: any) =>
        statusFilter === 'nota_de_credito' ? (inv.status === 'nota_de_credito' || inv.status === 'anulada') : inv.status === statusFilter
      );
    }
    if (isUsingPeriodFilter && startDate && endDate) {
      list = list.filter((inv: any) => {
        const dateVal = dateFilter === 'issueDate' ? (inv.issueDate || inv.createdAt) : (inv.createdAt || inv.issueDate);
        const d = (dateVal || '').toString().split('T')[0];
        if (d < startDate) return false;
        if (d > endDate) return false;
        return true;
      });
    }
    if (numberFilter.trim()) {
      const q = numberFilter.toLowerCase().trim();
      list = list.filter((inv: any) => (inv.invoiceNumber || '').toLowerCase().includes(q));
    }
    if (clientNameFilter.trim()) {
      const q = clientNameFilter.toLowerCase().trim();
      list = list.filter((inv: any) => (inv.clientName || '').toLowerCase().includes(q));
    }
    return list;
  }, [invoices, statusFilter, isUsingPeriodFilter, startDate, endDate, dateFilter, numberFilter, clientNameFilter]);

  const getRelatedServicesForInvoice = (invoice: any): any[] => {
    const ids = invoice?.relatedServiceIds || [];
    if (ids.length === 0) return [];
    const first = ids[0];
    if (typeof first === 'object' && first !== null && (first.pickupDate ?? first.pickupLocation ?? first.vessel) != null) {
      return ids;
    }
    return [];
  };

  const handleOpenPdf = async (invoice: any) => {
    let invoiceToUse = invoice;
    let related = getRelatedServicesForInvoice(invoice);
    if (related.length === 0 && (invoice?.relatedServiceIds?.length ?? 0) > 0) {
      try {
        invoiceToUse = await fetchInvoiceById(invoice._id || invoice.id);
        related = getRelatedServicesForInvoice(invoiceToUse);
      } catch (e: any) {
        toast.error(e?.message || 'Error al cargar la factura para el PDF');
        return;
      }
    }
    if (related.length === 0) {
      toast.error('No hay servicios asociados para mostrar el PDF');
      return;
    }
    setInvoiceForPdf(invoiceToUse);
    setPdfModalOpen(true);
  };

  const handleFacturar = (invoice: any) => {
    setInvoiceToFacturar(invoice);
    setFacturarModalOpen(true);
  };

  const handleOpenXml = (invoice: any) => {
    const related = getRelatedServicesForInvoice(invoice);
    setInvoiceForXml(invoice);
    setServicesForXml(related);
    setXmlModalOpen(true);
  };

  const handleDelete = async (invoice: any) => {
    if (!confirm(`¿Eliminar la prefactura/factura ${invoice.invoiceNumber}?`)) return;
    try {
      await deleteInvoice(invoice._id || invoice.id);
      toast.success('Eliminada');
      fetchInvoices({ page: 1, limit: 100, filters: {} });
    } catch (e: any) {
      toast.error(e?.message || 'Error al eliminar');
    }
  };

  const handleFacturarSubmit = async (invoiceNumber: string, xmlData?: { xml: string }, invoiceDate?: string) => {
    if (!invoiceToFacturar) return;
    try {
      await facturarInvoice({
        id: invoiceToFacturar._id || invoiceToFacturar.id,
        newInvoiceNumber: invoiceNumber,
        invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
        xmlData,
      });
      toast.success(`Facturación completada: ${invoiceNumber}`);
      setFacturarModalOpen(false);
      setInvoiceToFacturar(null);
      fetchInvoices({ page: 1, limit: 100, filters: {} });
    } catch (e: any) {
      toast.error(e?.message || 'Error al facturar');
      throw e;
    }
  };

  const pdfService = useMemo(() => {
    if (!invoiceForPdf) return null;
    const related = getRelatedServicesForInvoice(invoiceForPdf);
    if (related.length === 0) return null;
    const first = related[0];
    return {
      ...first,
      clientName: first.clientName ?? invoiceForPdf.clientName,
      invoiceNumber: invoiceForPdf.invoiceNumber,
      invoiceDate: (invoiceForPdf.issueDate || invoiceForPdf.createdAt || '').toString().split('T')[0],
    };
  }, [invoiceForPdf]);

  const pdfServicesList = useMemo(() => {
    if (!invoiceForPdf) return [];
    const related = getRelatedServicesForInvoice(invoiceForPdf);
    const clientName = invoiceForPdf.clientName;
    return related.map((s: any) => ({ ...s, clientName: s.clientName ?? clientName }));
  }, [invoiceForPdf]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <Ship className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Facturas - Agency</h1>
          <p className="text-muted-foreground">Prefacturas y facturas de Crew Transportation</p>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info className="h-5 w-5 text-blue-600" />
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800">Mostrando {filteredInvoices.length} prefacturas/facturas</p>
          <p className="text-xs text-blue-600">Para crear nuevas prefacturas, ve a Crear Prefactura y selecciona servicios completados.</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-4 mt-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="prefactura">Prefactura</SelectItem>
                  <SelectItem value="facturada">Facturada</SelectItem>
                  <SelectItem value="nota_de_credito">Nota de crédito</SelectItem>
                </SelectContent>
              </Select>
              <Label className="text-sm font-semibold text-slate-700 whitespace-nowrap">Filtrar por fecha:</Label>
              <div className="flex gap-1">
                <Button variant={dateFilter === 'createdAt' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('createdAt'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); }} className="text-xs h-8 px-3">Creación</Button>
                <Button variant={dateFilter === 'issueDate' ? 'default' : 'outline'} size="sm" onClick={() => { setDateFilter('issueDate'); setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); }} className="text-xs h-8 px-3">Movimiento</Button>
              </div>
              <div className="hidden sm:block w-px h-6 bg-gray-300 self-center" />
              <div className="flex gap-1 flex-wrap">
                <Button variant={activePeriodFilter === 'today' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('today')} className="text-xs h-8 px-2">Hoy</Button>
                <Button variant={activePeriodFilter === 'week' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('week')} className="text-xs h-8 px-2">Semana</Button>
                <Button variant={activePeriodFilter === 'month' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('month')} className="text-xs h-8 px-2">Mes</Button>
                <Button variant={activePeriodFilter === 'advanced' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterByPeriod('advanced')} className="text-xs h-8 px-2">Avanzado</Button>
              </div>
            </div>
          </div>

          {isUsingPeriodFilter && activePeriodFilter !== 'advanced' && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <Badge className="bg-blue-600 text-white text-xs">{getActivePeriodText()}</Badge>
              <span className="text-sm text-blue-700">{startDate} – {endDate}</span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto" onClick={() => { setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); }}><X className="h-3 w-3" /></Button>
            </div>
          )}
          {activePeriodFilter === 'advanced' && startDate && endDate && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <Badge className="bg-blue-600 text-white text-xs">Filtro Avanzado</Badge>
              <span className="text-sm text-blue-700">{startDate} – {endDate}</span>
              <div className="flex gap-1 ml-auto">
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsDateModalOpen(true)}><Calendar className="h-3 w-3" /></Button>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => { setIsUsingPeriodFilter(false); setActivePeriodFilter('none'); setStartDate(''); setEndDate(''); }}><X className="h-3 w-3" /></Button>
              </div>
            </div>
          )}

          <div className="rounded-md border overflow-x-auto min-h-[380px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative" data-column-filter>
                    <div className="flex items-center gap-1">
                      <span>Número</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {numberFilter && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setNumberFilter(''); closeFilterMenu(); }}><X className="h-3 w-3" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={openFilterMenu('number')} className={`h-6 w-6 p-0 ${numberFilter ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative" data-column-filter>
                    <div className="flex items-center gap-1">
                      <span>Cliente</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {clientNameFilter && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setClientNameFilter(''); closeFilterMenu(); }}><X className="h-3 w-3" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={openFilterMenu('client')} className={`h-6 w-6 p-0 ${clientNameFilter ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Fecha</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider">Total</TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider px-2 relative" data-column-filter>
                    <div className="flex items-center gap-1">
                      <span>Estado</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {statusFilter !== 'all' && (
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" title="Borrar filtro" onClick={(e) => { e.stopPropagation(); setStatusFilter('all'); closeFilterMenu(); }}><X className="h-3 w-3" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={openFilterMenu('status')} className={`h-6 w-6 p-0 ${statusFilter !== 'all' ? 'text-blue-600' : 'text-muted-foreground'}`} title="Filtrar"><Filter className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </TableHead>
                  <TableHead className="py-3 font-semibold text-xs uppercase tracking-wider text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoicesLoading ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                ) : filteredInvoices.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="py-8 text-center text-muted-foreground">No hay facturas que coincidan con los filtros</TableCell></TableRow>
                ) : (
                  filteredInvoices.map((inv: any) => (
                    <TableRow key={inv._id || inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                      <TableCell>{inv.clientName || 'N/A'}</TableCell>
                      <TableCell>{formatDate(inv.issueDate || inv.createdAt)}</TableCell>
                      <TableCell>${(inv.totalAmount || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        {inv.status === 'prefactura' && <Badge variant="outline" className="text-blue-600 border-blue-600">Prefactura</Badge>}
                        {inv.status === 'facturada' && <Badge variant="outline" className="text-green-600 border-green-600">Facturada</Badge>}
                        {(inv.status === 'nota_de_credito' || inv.status === 'anulada') && <Badge variant="outline" className="text-amber-600 border-amber-600">{inv.status === 'nota_de_credito' ? 'Nota de crédito' : 'Anulada'}</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" title="Ver PDF" onClick={() => handleOpenPdf(inv)} className="h-8 w-8 text-blue-600"><Eye className="h-4 w-4" /></Button>
                          {inv.status === 'facturada' && (
                            <Button variant="ghost" size="sm" title="Ver/Enviar XML" onClick={() => handleOpenXml(inv)} className="h-8 w-8 text-orange-600"><Code className="h-4 w-4" /></Button>
                          )}
                          {inv.status === 'prefactura' && (
                            <Button variant="outline" size="sm" onClick={() => handleFacturar(inv)} className="h-8 text-green-700 border-green-600">Facturar</Button>
                          )}
                          <Button variant="ghost" size="sm" title="Eliminar" onClick={() => handleDelete(inv)} className="h-8 w-8 text-red-600"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {pdfService && pdfServicesList.length > 0 && (
        <AgencyPdfViewer
          open={pdfModalOpen}
          onOpenChange={setPdfModalOpen}
          service={pdfService}
          services={pdfServicesList}
          isMultipleServices={pdfServicesList.length > 1}
        />
      )}

      <AgencyFacturacionModal
        open={facturarModalOpen}
        onOpenChange={(open) => { if (!open) setInvoiceToFacturar(null); setFacturarModalOpen(open); }}
        invoice={invoiceToFacturar ? { ...invoiceToFacturar, id: invoiceToFacturar._id || invoiceToFacturar.id } : null}
        onFacturar={handleFacturarSubmit}
      />

      {invoiceForXml && (
        <AgencyServiceXmlModal
          open={xmlModalOpen}
          onOpenChange={setXmlModalOpen}
          service={servicesForXml[0] ? { ...servicesForXml[0], xmlData: invoiceForXml?.xmlData } : undefined}
          services={servicesForXml}
          onXmlSentToSap={() => fetchInvoices({ page: 1, limit: 100, filters: {} })}
        />
      )}

      <Dialog open={isDateModalOpen} onOpenChange={setIsDateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Rango de fechas</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Desde</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>Hasta</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDateModalOpen(false)}>Cerrar</Button>
              <Button onClick={() => { setIsUsingPeriodFilter(true); setActivePeriodFilter('advanced'); setIsDateModalOpen(false); }} disabled={!startDate || !endDate}>Aplicar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {typeof document !== 'undefined' && openFilterColumn && filterAnchorRect && createPortal(
        <div
          data-filter-portal
          className="fixed z-[9999] bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-md shadow-lg p-3 min-w-52"
          style={{ top: filterAnchorRect.bottom + 4, left: filterAnchorRect.left }}
        >
          {openFilterColumn === 'number' && (
            <>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por número:</div>
              <Input placeholder="Número de factura..." value={numberFilter} onChange={(e) => setNumberFilter(e.target.value)} className="h-8 text-xs" />
            </>
          )}
          {openFilterColumn === 'client' && (
            <>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Filtrar por cliente:</div>
              <Input placeholder="Nombre del cliente..." value={clientNameFilter} onChange={(e) => setClientNameFilter(e.target.value)} className="h-8 text-xs" />
            </>
          )}
          {openFilterColumn === 'status' && (
            <>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Estado</div>
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'prefactura', label: 'Prefactura' },
                  { value: 'facturada', label: 'Facturada' },
                  { value: 'nota_de_credito', label: 'Nota de crédito' },
                ].map((opt) => (
                  <div
                    key={opt.value}
                    className={`px-2 py-1.5 text-xs cursor-pointer rounded hover:bg-gray-100 dark:hover:bg-slate-800 ${statusFilter === opt.value ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 font-medium' : ''}`}
                    onClick={() => { setStatusFilter(opt.value as any); closeFilterMenu(); }}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
