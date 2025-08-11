'use client';

import { useState, useEffect } from 'react';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { useAgencyCatalogs } from '@/lib/features/agencyServices/useAgencyCatalogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  Ship, 
  Calendar,
  DollarSign,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  History,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export const AgencySapInvoice: React.FC = () => {
  const { 
    readyForInvoice,
    sapIntegration,
    sapLoading,
    sapError,
    xmlGenerated,
    xmlContent,
    xmlFileName,
    lastInvoiceNumber,
    fetchServicesReadyForInvoice,
    generateSapXml,
    downloadSapXml,
    fetchSapXmlHistory,
    clearSapState,
  } = useAgencyServices();

  const { 
    locations,
    vessels,
    fetchGroupedCatalogs 
  } = useAgencyCatalogs();

  // Estados locales
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('generate');
  const [xmlHistory, setXmlHistory] = useState<any[]>([]);
  
  // Filtros para servicios
  const [filters, setFilters] = useState({
    clientId: 'all',
    startDate: '',
    endDate: '',
    vessel: '',
    pickupLocation: ''
  });

  // Datos de factura
  const [invoiceData, setInvoiceData] = useState({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    postingDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Estados de carga
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    // Cargar datos iniciales
    fetchGroupedCatalogs();
    handleFetchServices();
  }, []);

  useEffect(() => {
    // Limpiar selección cuando cambian los servicios
    setSelectedServices([]);
  }, [readyForInvoice]);

  const handleFetchServices = () => {
    fetchServicesReadyForInvoice(filters);
  };

  const handleApplyFilters = () => {
    handleFetchServices();
  };

  const handleClearFilters = () => {
    setFilters({
      clientId: 'all',
      startDate: '',
      endDate: '',
      vessel: '',
      pickupLocation: ''
    });
    fetchServicesReadyForInvoice({});
  };

  const handleSelectService = (serviceId: string, checked: boolean) => {
    if (checked) {
      setSelectedServices(prev => [...prev, serviceId]);
    } else {
      setSelectedServices(prev => prev.filter(id => id !== serviceId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedServices(readyForInvoice.map(service => service._id));
    } else {
      setSelectedServices([]);
    }
  };

  const calculateSelectedTotal = () => {
    return readyForInvoice
      .filter(service => selectedServices.includes(service._id))
      .reduce((sum, service) => sum + (service.price || 0), 0);
  };

  const getServicesByVessel = () => {
    const grouped = readyForInvoice.reduce((acc, service) => {
      const vessel = service.vessel || 'Unknown';
      if (!acc[vessel]) {
        acc[vessel] = [];
      }
      acc[vessel].push(service);
      return acc;
    }, {} as Record<string, typeof readyForInvoice>);
    
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  };

  const handleGenerateXml = async () => {
    if (selectedServices.length === 0) {
      toast.error('Please select at least one service');
      return;
    }

    if (!invoiceData.invoiceNumber.trim()) {
      toast.error('Please enter an invoice number');
      return;
    }

    // Validar formato de número de factura
    const invoiceNumberPattern = /^[A-Z0-9-_]+$/;
    if (!invoiceNumberPattern.test(invoiceData.invoiceNumber)) {
      toast.error('Invoice number can only contain uppercase letters, numbers, hyphens, and underscores');
      return;
    }

    try {
      await generateSapXml({
        serviceIds: selectedServices,
        invoiceNumber: invoiceData.invoiceNumber,
        invoiceDate: invoiceData.invoiceDate,
        postingDate: invoiceData.postingDate || invoiceData.invoiceDate,
      });
      
      toast.success(`SAP XML generated successfully! Invoice: ${invoiceData.invoiceNumber}`);
      setSelectedServices([]);
      
      // Refrescar servicios listos para facturar
      handleFetchServices();
      
      // Cambiar a la pestaña de resultado
      setActiveTab('result');
      
    } catch (error) {
      toast.error('Error generating SAP XML');
    }
  };

  const handleDownloadXml = () => {
    if (xmlFileName) {
      downloadSapXml(xmlFileName);
      toast.success('XML download initiated');
    }
  };

  const handleLoadHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await fetchSapXmlHistory({ page: 1, limit: 20 });
      setXmlHistory(history?.invoices || []);
      setActiveTab('history');
    } catch (error) {
      toast.error('Error loading XML history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleClearSapState = () => {
    clearSapState();
    setSelectedServices([]);
    setInvoiceData({
      invoiceNumber: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      postingDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    toast.success('SAP state cleared');
  };

  const generateInvoiceNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    
    const invoiceNumber = `AGY-${year}${month}${day}-${time}`;
    setInvoiceData(prev => ({ ...prev, invoiceNumber }));
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            Agency SAP Integration
          </h1>
          <p className="text-muted-foreground mt-1">Generate XML invoices for SAP with Agency transportation services</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleLoadHistory}
            disabled={loadingHistory}
            className="flex items-center gap-2"
          >
            {loadingHistory ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            History
          </Button>
          <Button
            variant="outline"
            onClick={handleClearSapState}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {sapError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{sapError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">Generate Invoice</TabsTrigger>
          <TabsTrigger value="result">XML Result</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        {/* Generate Invoice Tab */}
        <TabsContent value="generate" className="space-y-6">
          {/* Invoice Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Invoice Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="invoiceNumber"
                      value={invoiceData.invoiceNumber}
                      onChange={(e) => setInvoiceData({...invoiceData, invoiceNumber: e.target.value.toUpperCase()})}
                      placeholder="AGY-20241210-1430"
                      className="font-mono"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateInvoiceNumber}
                      title="Generate automatic invoice number"
                    >
                      Auto
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="invoiceDate">Invoice Date *</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={invoiceData.invoiceDate}
                    onChange={(e) => setInvoiceData({...invoiceData, invoiceDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="postingDate">Posting Date</Label>
                  <Input
                    id="postingDate"
                    type="date"
                    value={invoiceData.postingDate}
                    onChange={(e) => setInvoiceData({...invoiceData, postingDate: e.target.value})}
                  />
                </div>
                <div>
                  <Label>Selected Services</Label>
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedServices.length}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total: ${calculateSelectedTotal().toLocaleString()}
                  </div>
                </div>
              </div>
              
              {invoiceData.notes && (
                <div className="mt-4">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={invoiceData.notes}
                    onChange={(e) => setInvoiceData({...invoiceData, notes: e.target.value})}
                    placeholder="Additional notes for this invoice..."
                    rows={2}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filter Services Ready for Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-6">
                <Select value={filters.clientId} onValueChange={(value) => setFilters({...filters, clientId: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    <SelectItem value="msc">MSC</SelectItem>
                    <SelectItem value="other">Other Clients</SelectItem>
                  </SelectContent>
                </Select>

                <Input
                  type="date"
                  placeholder="Start Date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                />

                <Input
                  type="date"
                  placeholder="End Date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                />

                <Input
                  placeholder="Vessel name..."
                  value={filters.vessel}
                  onChange={(e) => setFilters({...filters, vessel: e.target.value})}
                />

                <Input
                  placeholder="Pickup location..."
                  value={filters.pickupLocation}
                  onChange={(e) => setFilters({...filters, pickupLocation: e.target.value})}
                />

                <div className="flex gap-2">
                  <Button onClick={handleApplyFilters} size="sm">
                    Apply
                  </Button>
                  <Button onClick={handleClearFilters} variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Services Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Available Services</p>
                    <p className="text-2xl font-bold">{readyForInvoice.length}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Selected Services</p>
                    <p className="text-2xl font-bold text-green-600">{selectedServices.length}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
                    <p className="text-2xl font-bold text-purple-600">
                      ${calculateSelectedTotal().toLocaleString()}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Vessels</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {getServicesByVessel().length}
                    </p>
                  </div>
                  <Ship className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Services Table */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Services Ready for SAP Invoice ({readyForInvoice.length})</CardTitle>
                <div className="flex gap-2 items-center">
                  <Badge variant="outline">
                    Selected: {selectedServices.length}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFetchServices}
                    disabled={sapLoading}
                  >
                    {sapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {readyForInvoice.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No services ready for invoicing</p>
                  <p className="text-sm text-muted-foreground">Complete some services first</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedServices.length === readyForInvoice.length && readyForInvoice.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Service Date</TableHead>
                      <TableHead>Crew Member</TableHead>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Price (USD)</TableHead>
                      <TableHead>Service Code</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyForInvoice.map((service) => (
                      <TableRow key={service._id} className={selectedServices.includes(service._id) ? 'bg-blue-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedServices.includes(service._id)}
                            onCheckedChange={(checked) => handleSelectService(service._id, checked as boolean)}
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
                              <div className="text-sm text-muted-foreground">{service.crewRank}</div>
                            )}
                            {service.nationality && (
                              <div className="text-xs text-muted-foreground">{service.nationality}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{service.vessel}</div>
                          {service.voyage && (
                            <div className="text-sm text-muted-foreground">V. {service.voyage}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{service.pickupLocation}</div>
                            <div className="text-muted-foreground">→ {service.dropoffLocation}</div>
                          </div>
                          {service.transportCompany && (
                            <div className="text-xs text-muted-foreground">
                              via {service.transportCompany}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-green-600">
                            ${(service.price || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-muted-foreground">{service.currency || 'USD'}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {service.serviceCode || 'SHP243'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Generate Actions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="font-medium">
                    Ready to generate SAP XML for {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Total amount: ${calculateSelectedTotal().toLocaleString()} USD
                  </p>
                </div>
                <Button 
                  onClick={handleGenerateXml}
                  disabled={sapLoading || selectedServices.length === 0 || !invoiceData.invoiceNumber.trim()}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  {sapLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Generate SAP XML
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* XML Result Tab */}
        <TabsContent value="result" className="space-y-6">
          {xmlGenerated ? (
            <>
              {/* Success Message */}
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>SAP XML Generated Successfully!</strong>
                  <br />
                  Invoice Number: {lastInvoiceNumber}
                  <br />
                  File: {xmlFileName}
                </AlertDescription>
              </Alert>

              {/* XML Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-green-500" />
                    Generated XML Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Invoice Number</Label>
                      <p className="font-mono text-lg">{lastInvoiceNumber}</p>
                    </div>
                    <div>
                      <Label>File Name</Label>
                      <p className="font-mono">{xmlFileName}</p>
                    </div>
                    <div>
                      <Label>Total Amount</Label>
                      <p className="text-lg font-semibold text-green-600">
                        ${sapIntegration.totalAmount?.toLocaleString()} USD
                      </p>
                    </div>
                    <div>
                      <Label>Generation Time</Label>
                      <p>{new Date().toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex gap-4">
                <Button onClick={handleDownloadXml} className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Download XML
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab('generate')}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Generate Another
                </Button>
              </div>

              {/* XML Preview */}
              {xmlContent && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Eye className="h-5 w-5" />
                      XML Preview (First 1000 characters)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-gray-50 p-4 rounded-lg text-xs overflow-x-auto border">
                      {xmlContent.substring(0, 1000)}
                      {xmlContent.length > 1000 && '\n\n... (truncated, download full file)'}
                    </pre>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No XML Generated Yet</h3>
              <p className="text-muted-foreground mb-4">
                Go to the Generate Invoice tab to create your first SAP XML
              </p>
              <Button onClick={() => setActiveTab('generate')}>
                Generate Invoice
              </Button>
            </div>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                SAP XML Generation History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : xmlHistory.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Invoice Date</TableHead>
                      <TableHead>Services</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Generated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {xmlHistory.map((invoice, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>{invoice.serviceCount}</TableCell>
                        <TableCell className="font-medium">
                          ${invoice.totalAmount?.toLocaleString() || 0}
                        </TableCell>
                        <TableCell>
                          {invoice.sapProcessedAt ? format(new Date(invoice.sapProcessedAt), 'MMM dd, HH:mm') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No XML generation history found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AgencySapInvoice;