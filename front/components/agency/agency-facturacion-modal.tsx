"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Code, AlertTriangle, CheckCircle, Calendar, DollarSign, User, Eye, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices";
import { generateAgencyInvoiceXML, type AgencyInvoiceForXml, type AgencyServiceForXml } from "@/lib/xml-generator";
import { saveAs } from "file-saver";
import { createApiUrl } from "@/lib/api-config";

interface AgencyFacturacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: any;
  onFacturar: (invoiceNumber: string, xmlData?: { xml: string }, invoiceDate?: string) => Promise<void>;
}

export function AgencyFacturacionModal({ open, onOpenChange, invoice, onFacturar }: AgencyFacturacionModalProps) {
  const { toast } = useToast();
  const { services, fetchServices } = useAgencyServices();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [actions, setActions] = useState({ sendToSAP: false });
  const [generatedXml, setGeneratedXml] = useState<string>("");
  const [isSendingToSap, setIsSendingToSap] = useState(false);
  const [sapLogs, setSapLogs] = useState<any[]>([]);
  const [showSapLogs, setShowSapLogs] = useState(false);

  useEffect(() => {
    setGeneratedXml("");
    setNewInvoiceNumber("");
    setIsSendingToSap(false);
    setSapLogs([]);
    setShowSapLogs(false);
    
    if (open) {
      fetchServices({ page: 1, limit: 1000 });
      
      // Generar número de factura sugerido
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const time = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
      const suggestedNumber = `AGY-${year}${month}${day}-${time}`;
      setNewInvoiceNumber(suggestedNumber);
    }
    
    const today = new Date();
    setInvoiceDate(today.toLocaleDateString('en-CA'));
    setActions({ sendToSAP: false });
  }, [invoice?.id, open, fetchServices]);

  const getRelatedServices = () => {
    if (!invoice?.relatedServiceIds) return [];
    return services.filter((service: any) => 
      invoice.relatedServiceIds.includes(service._id || service.id)
    );
  };

  const generateXMLForInvoice = () => {
    try {
      console.log("=== DEBUG: generateXMLForInvoice Agency ===");
      console.log("Invoice:", invoice);
      
      if (!invoice) throw new Error("No hay datos de factura disponibles");
      if (!newInvoiceNumber.trim()) throw new Error("Debe ingresar el número de factura");
      if (!invoiceDate) throw new Error("Debe seleccionar la fecha de factura");
      
      const relatedServices = getRelatedServices();
      console.log("Related services found:", relatedServices.length);
      
      if (relatedServices.length === 0) {
        throw new Error("No se encontraron servicios asociados a la factura");
      }

      // Construir payload para generateAgencyInvoiceXML
      const servicesForXml: AgencyServiceForXml[] = relatedServices.map((service: any) => ({
        _id: service._id,
        pickupDate: service.pickupDate,
        vessel: service.vessel,
        crewMembers: service.crewMembers || [],
        pickupLocation: service.pickupLocation,
        dropoffLocation: service.dropoffLocation,
        moveType: service.moveType || 'SINGLE',
        price: service.price || 0,
        currency: service.currency || 'USD'
      }));

      const xmlPayload: AgencyInvoiceForXml = {
        invoiceNumber: newInvoiceNumber,
        invoiceDate: invoiceDate,
        clientSapNumber: invoice.clientSapNumber,
        services: servicesForXml,
        additionalService: invoice.details?.trk137Amount ? {
          amount: invoice.details.trk137Amount,
          description: invoice.details.trk137Description || 'Tiempo de Espera'
        } : undefined
      };

      console.log("Agency XML payload:", xmlPayload);
      const xml = generateAgencyInvoiceXML(xmlPayload);
      console.log("XML generado exitosamente");
      
      setGeneratedXml(xml);
      toast({ title: "XML generado", description: "El XML ha sido generado correctamente." });
      
      return { xml };
    } catch (error: any) {
      console.error("=== ERROR en generateXMLForInvoice ===");
      console.error("Error completo:", error);
      toast({ title: "Error al generar XML", description: error.message || "No se pudo generar el XML", variant: "destructive" });
      return null;
    }
  };

  const handleSendToSap = async (xmlContent: string) => {
    setIsSendingToSap(true);
    setSapLogs([]);
    setShowSapLogs(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const fileName = `AGENCY_INVOICE_${newInvoiceNumber}_${new Date().toISOString()}.xml`;
      
      const response = await fetch(createApiUrl('/api/agency/sap/send-to-sap'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceIds: invoice.relatedServiceIds,
          xmlContent: xmlContent,
          fileName: fileName
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to send XML to SAP');
      }

      setSapLogs(result.logs || []);
      toast({ title: "XML enviado a SAP", description: `Archivo ${fileName} enviado correctamente.` });
    } catch (error: any) {
      console.error("Error al enviar XML a SAP:", error);
      setSapLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Error: ${error.message}`,
        details: error
      }]);
      toast({ title: "Error al enviar XML a SAP", description: error.message || "Error al conectar con SAP", variant: "destructive" });
    } finally {
      setIsSendingToSap(false);
    }
  };

  const handleFacturar = async () => {
    if (!newInvoiceNumber.trim()) {
      toast({ title: "Error", description: "Debe ingresar un número de factura", variant: "destructive" });
      return;
    }
    if (!invoiceDate) {
      toast({ title: "Error", description: "Debe seleccionar la fecha de factura", variant: "destructive" });
      return;
    }
    
    setIsProcessing(true);
    try {
      console.log("=== DEBUG: handleFacturar Agency ===");
      
      // Generar XML
      let xmlData = generateXMLForInvoice();
      if (!xmlData) {
        toast({ title: "Error", description: "No se pudo generar el XML", variant: "destructive" });
        return;
      }
      
      console.log("=== DEBUG: XML generado ===");
      
      // Enviar a SAP si está marcado
      if (actions.sendToSAP && xmlData.xml && invoice?.id) {
        try {
          await handleSendToSap(xmlData.xml);
        } catch (error) {
          console.error("Error enviando a SAP:", error);
          // Continuar con la facturación aunque falle el envío a SAP
        }
      }
      
      console.log("=== DEBUG: Llamando a onFacturar ===");
      
      // Llamar al callback
      await onFacturar(newInvoiceNumber, xmlData, invoiceDate);
      
      toast({ title: "Facturación completada", description: `La prefactura ha sido facturada como ${newInvoiceNumber}.` });
    } catch (error: any) {
      console.error("=== ERROR en handleFacturar ===");
      console.error("Error completo:", error);
      toast({ title: "Error en la facturación", description: error.message || "No se pudo completar la facturación", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadXml = () => {
    if (generatedXml) {
      const blob = new Blob([generatedXml], { type: "application/xml;charset=utf-8" });
      const filename = `AGENCY_INVOICE_${newInvoiceNumber}_${new Date().toISOString()}.xml`;
      saveAs(blob, filename);
      toast({ title: "XML Descargado", description: `Descargado como ${filename}` });
    }
  };

  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Facturar Prefactura - {invoice.invoiceNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Cliente:</span>
                <span>{invoice.clientName}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Total:</span>
                <span className="font-bold">${(invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Fecha Emisión:</span>
                <span>{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invoice-number" className="text-sm font-semibold">
              Número de Factura *
            </Label>
            <Input 
              id="invoice-number" 
              value={newInvoiceNumber} 
              onChange={(e) => setNewInvoiceNumber(e.target.value.toUpperCase())} 
              placeholder="AGY-20241210-1430" 
              className="font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="invoice-date" className="text-sm font-semibold">
              Fecha de Factura *
            </Label>
            <Input 
              id="invoice-date" 
              type="date" 
              value={invoiceDate} 
              onChange={(e) => setInvoiceDate(e.target.value)} 
              className="font-mono" 
            />
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" /> Acciones Adicionales
            </h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                <Checkbox 
                  id="send-to-sap" 
                  checked={actions.sendToSAP} 
                  onCheckedChange={(checked) => setActions(prev => ({ ...prev, sendToSAP: checked as boolean }))} 
                />
                <div className="flex items-center gap-2 flex-1">
                  <Code className="h-4 w-4 text-green-600" />
                  <Label htmlFor="send-to-sap" className="font-medium">
                    Enviar XML a SAP (XML se genera automáticamente)
                  </Label>
                </div>
                {generatedXml && (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs bg-green-600">
                      ✓ Generado
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleDownloadXml} 
                      className="h-8 w-8 p-0"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!generatedXml && (
            <div className="flex flex-col items-center space-y-2">
              <Button 
                variant="outline" 
                onClick={generateXMLForInvoice} 
                disabled={!newInvoiceNumber.trim() || !invoiceDate} 
                className="flex items-center gap-2 text-blue-600 border-blue-600 hover:bg-blue-50 disabled:text-gray-400 disabled:border-gray-300"
              >
                <Code className="h-4 w-4" /> Vista previa del XML
              </Button>
            </div>
          )}

          {generatedXml && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>XML generado correctamente</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleDownloadXml}
                    className="text-blue-600"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {showSapLogs && sapLogs.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <Eye className="h-4 w-4" /> Logs de envío a SAP
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {sapLogs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`text-xs p-2 rounded ${
                      log.level === 'error' ? 'bg-red-100 text-red-800' : 
                      log.level === 'success' ? 'bg-green-100 text-green-800' : 
                      'bg-blue-100 text-blue-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-xs opacity-75">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <span className={`text-xs px-1 rounded ${
                        log.level === 'error' ? 'bg-red-200' : 
                        log.level === 'success' ? 'bg-green-200' : 
                        'bg-blue-200'
                      }`}>
                        {log.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="mt-1">{log.message}</div>
                    {log.details && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs opacity-75">Ver detalles</summary>
                        <pre className="mt-1 text-xs overflow-x-auto bg-white p-2 rounded">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
              Cancelar
            </Button>
            <Button 
              onClick={handleFacturar} 
              disabled={isProcessing || !newInvoiceNumber.trim() || !invoiceDate} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Facturando...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Facturar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
