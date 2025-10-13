"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Download, Send, CheckCircle, AlertTriangle, FileText, Info, ScrollText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { saveAs } from "file-saver";
import { createApiUrl } from "@/lib/api-config";
import { generateAgencyInvoiceXML, generateXmlFileName } from "@/lib/xml-generator";
import { useAppSelector } from "@/lib/hooks";
import { selectAllClients } from "@/lib/features/clients/clientsSlice";

interface AgencyServiceXmlModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: any;
  onXmlSentToSap?: () => void;
}

export function AgencyServiceXmlModal({ open, onOpenChange, service, onXmlSentToSap }: AgencyServiceXmlModalProps) {
  const { toast } = useToast();
  const clients = useAppSelector(selectAllClients);
  
  const [isSendingToSap, setIsSendingToSap] = useState(false);
  const [isGeneratingXml, setIsGeneratingXml] = useState(false);
  const [sapLogs, setSapLogs] = useState<any[]>([]);
  const [showSapLogs, setShowSapLogs] = useState(false);
  const [localSentToSap, setLocalSentToSap] = useState<boolean | null>(null);
  const [localSentToSapAt, setLocalSentToSapAt] = useState<string | null>(null);
  const [localSapFileName, setLocalSapFileName] = useState<string | null>(null);
  const [generatedXml, setGeneratedXml] = useState<string | null>(null);

  useEffect(() => {
    if (service?.id || service?._id) {
      setLocalSentToSap(null);
      setLocalSentToSapAt(null);
      setLocalSapFileName(null);
      setSapLogs([]);
      setShowSapLogs(false);
      setGeneratedXml(null);
    }
  }, [service?.id, service?._id]);

  useEffect(() => {
    if (open && service) {
      // Si el servicio ya tiene XML guardado, usarlo
      if (service.xmlData) {
        const xml = typeof service.xmlData === 'string' ? service.xmlData : service.xmlData.xml;
        setGeneratedXml(xml);
      } else {
        // Si no tiene XML, generar uno nuevo
        generateXmlForService();
      }
    }
  }, [open, service]);

  const generateXmlForService = () => {
    if (!service) return;
    
    setIsGeneratingXml(true);
    try {
      // Obtener el SAP code del cliente
      const client = clients.find(c => (c._id || c.id) === service.clientId);
      const clientSapNumber = client?.sapCode || 'N/A';
      
      const xmlPayload = {
        invoiceNumber: service.invoiceNumber || `AGY-SERVICE-${service._id || service.id}`,
        invoiceDate: service.invoiceDate || new Date().toISOString().split('T')[0],
        clientSapNumber: clientSapNumber,
        services: [{
          _id: service._id || service.id,
          pickupDate: service.pickupDate,
          vessel: service.vessel,
          crewMembers: service.crewMembers || [],
          pickupLocation: service.pickupLocation,
          dropoffLocation: service.dropoffLocation,
          moveType: service.moveType || 'SINGLE',
          price: service.price || 0,
          currency: service.currency || 'USD',
          waitingTime: service.waitingTime || 0,
          waitingTimePrice: service.waitingTimePrice || 0
        }]
      };
      
      const xml = generateAgencyInvoiceXML(xmlPayload);
      setGeneratedXml(xml);
    } catch (error) {
      console.error('Error generating XML:', error);
      toast({ title: "Error", description: "No se pudo generar el XML", variant: "destructive" });
    } finally {
      setIsGeneratingXml(false);
    }
  };

  if (!service) return null;

  const xml = generatedXml || (typeof service.xmlData === 'string' ? service.xmlData : service.xmlData?.xml) || '';
  const effectiveSentToSap = localSentToSap !== null ? localSentToSap : service.sentToSap;
  const effectiveSentToSapAt = localSentToSapAt || service.sentToSapAt;
  const sapFileName = localSapFileName || service.sapFileName;

  const handleCopyXml = async () => {
    try {
      await navigator.clipboard.writeText(xml);
      toast({ title: "XML copiado", description: "El contenido del XML ha sido copiado al portapapeles." });
    } catch (error) {
      toast({ title: "Error al copiar", description: "No se pudo copiar el XML al portapapeles.", variant: "destructive" });
    }
  };

  const handleDownloadXml = () => {
    const blob = new Blob([xml], { type: "application/xml;charset=utf-8" });
    const fileName = sapFileName || `AGENCY_SERVICE_${service.invoiceNumber || service._id}_${new Date().toISOString()}.xml`;
    saveAs(blob, fileName);
    toast({ title: "XML descargado", description: `El archivo XML ha sido descargado como ${fileName}` });
  };

  const handleSendToSap = async () => {
    if (!service?._id && !service?.id) return;
    
    setIsSendingToSap(true);
    setSapLogs([]);
    setShowSapLogs(true);
    
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const fileName = sapFileName || generateXmlFileName('9326'); // Usar el mismo formato que PTYSS con código 9326 para Agency
      
      const response = await fetch(createApiUrl('/api/agency/sap/send-to-sap'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          serviceIds: [service._id || service.id],
          xmlContent: xml,
          fileName: fileName
        })
      });

      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        throw new Error(`Failed to parse server response: ${response.statusText}`);
      }
      
      // Siempre mostrar los logs si están disponibles (igual que trucking)
      if (result.logs && Array.isArray(result.logs)) {
        setSapLogs(result.logs);
      }
      
      if (!response.ok || !result.success) {
        // Extraer el mensaje de error (igual que trucking)
        throw new Error(result.message || 'Error al enviar XML a SAP');
      }
      
      // Success - actualizar estado local (igual que trucking)
      setLocalSentToSap(true);
      setLocalSentToSapAt(result.data?.sentAt || new Date().toISOString());
      setLocalSapFileName(result.data?.fileName || fileName);
      
      toast({ title: "XML enviado exitosamente", description: `Archivo ${result.data?.fileName || fileName} enviado a SAP vía FTP correctamente.` });
      
      // Refrescar la lista de servicios después de un pequeño delay
      setTimeout(() => {
        onXmlSentToSap?.();
      }, 500);
    } catch (error: any) {
      console.error("Error al enviar XML a SAP:", error);
      
      const errorMessage = error?.message || (typeof error === 'string' ? error : 'Error desconocido al conectar con SAP');
      
      setSapLogs(prev => [...prev, {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: errorMessage,
        details: error
      }]);
      
      toast({ 
        title: "Error al enviar XML", 
        description: errorMessage, 
        variant: "destructive" 
      });
    } finally {
      setIsSendingToSap(false);
    }
  };

  const formatDate = (dateString: string | Date, includeTime: boolean = false) => {
    if (!dateString) return 'N/A';
    try {
      // Si es string, verificar formato
      if (typeof dateString === 'string') {
        // Si la fecha está en formato YYYY-MM-DD, crear la fecha en zona horaria local
        if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = dateString.split('-').map(Number);
          const date = new Date(year, month - 1, day);
          return date.toLocaleDateString('es-ES');
        }
        
        // Si la fecha está en formato ISO con zona horaria UTC
        if (dateString.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
          const date = new Date(dateString);
          if (includeTime) {
            return date.toLocaleString('es-ES');
          }
          const datePart = dateString.split('T')[0];
          const [year, month, day] = datePart.split('-').map(Number);
          const localDate = new Date(year, month - 1, day);
          return localDate.toLocaleDateString('es-ES');
        }
      }
      
      // Para otros formatos
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return includeTime ? date.toLocaleString('es-ES') : date.toLocaleDateString('es-ES');
    } catch {
      return 'N/A';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="xml-modal-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> XML SAP - {service.invoiceNumber || 'Servicio'}
          </DialogTitle>
        </DialogHeader>

        <div id="xml-modal-description" className="space-y-6">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-green-900 flex items-center gap-2">
                <Info className="h-4 w-4" /> Información del XML
              </h3>
              <div className="flex gap-2">
                {effectiveSentToSap ? (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                    ✓ Enviado a SAP
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 border-orange-200">
                    ⏳ Pendiente de envío a SAP
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-green-800">Factura:</span>
                <span className="ml-2">{service.invoiceNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Cliente:</span>
                <span className="ml-2">{service.clientName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Vessel:</span>
                <span className="ml-2">{service.vessel || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-green-800">Fecha Factura:</span>
                <span className="ml-2">{formatDate(service.invoiceDate)}</span>
              </div>
              {effectiveSentToSapAt && (
                <div>
                  <span className="font-medium text-green-800">Enviado a SAP:</span>
                  <span className="ml-2">{formatDate(effectiveSentToSapAt, true)}</span>
                </div>
              )}
              <div>
                <span className="font-medium text-green-800">Total:</span>
                <span className="ml-2">${((service.price || 0) + (service.waitingTimePrice || 0)).toFixed(2)}</span>
              </div>
              {sapFileName && (
                <div className="col-span-2">
                  <span className="font-medium text-green-800">Archivo XML:</span>
                  <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded border">{sapFileName}</span>
                </div>
              )}
            </div>
          </div>

          {isGeneratingXml ? (
            <div className="flex justify-center items-center py-8">
              <div className="flex items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-lg font-medium text-gray-800">Generando XML...</span>
              </div>
            </div>
          ) : xml ? (
            <>
              <Alert className="border border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>XML válido:</strong> El XML cumple con todos los requisitos para SAP y está listo para envío.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Contenido XML</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopyXml} className="flex items-center gap-2">
                      <Copy className="h-4 w-4" />
                      Copiar
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleDownloadXml} className="flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      Descargar
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleSendToSap} 
                      disabled={isSendingToSap || effectiveSentToSap} 
                      className={`flex items-center gap-2 ${effectiveSentToSap ? 'text-green-600 border-green-600 bg-green-50' : 'text-blue-600 border-blue-600 hover:bg-blue-50'}`}
                    >
                      {isSendingToSap ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Enviando...
                        </>
                      ) : effectiveSentToSap ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          Enviado
                        </>
                      ) : (
                        <>
                          <Send className="h-3 w-3" />
                          Enviar a SAP
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="border rounded-md p-3 bg-gray-50 min-h-[300px] max-h-[400px] overflow-auto">
                  <pre className="font-mono text-xs whitespace-pre-wrap text-gray-800">{xml}</pre>
                </div>
              </div>
            </>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No hay XML disponible para este servicio. El servicio debe ser facturado con la opción "Generar XML" habilitada.
              </AlertDescription>
            </Alert>
          )}

          {showSapLogs && sapLogs.length > 0 && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                <ScrollText className="h-4 w-4" />
                Logs de envío a SAP
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
                        {(log.level || 'info').toUpperCase()}
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

          <div className="flex justify-center pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

