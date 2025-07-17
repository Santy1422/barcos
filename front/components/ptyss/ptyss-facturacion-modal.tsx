"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FileText, 
  Mail, 
  Code, 
  AlertTriangle, 
  CheckCircle, 
  Calendar,
  DollarSign,
  User,
  Ship,
  Eye
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { PTYSSRecordsViewModal } from "./ptyss-records-view-modal"

interface PTYSSFacturacionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: any
  onFacturar: (invoiceNumber: string) => Promise<void>
}

export function PTYSSFacturacionModal({ 
  open, 
  onOpenChange, 
  invoice, 
  onFacturar 
}: PTYSSFacturacionModalProps) {
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)
  const [newInvoiceNumber, setNewInvoiceNumber] = useState("")
  const [actions, setActions] = useState({
    sendEmail: false,
    generateXML: false
  })
  const [showRecordsModal, setShowRecordsModal] = useState(false)

  // Generar número de factura por defecto
  const defaultInvoiceNumber = invoice?.invoiceNumber?.replace(/^PTY-PRE-/, "PTY-FAC-") || "PTY-FAC-000001"
  const handleFacturar = async () => {
    if (!newInvoiceNumber.trim()) {
      toast({
        title: "Error",
        description: "Debe ingresar un número de factura",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    try {
      await onFacturar(newInvoiceNumber)
      
      toast({
        title: "Facturación completada",
        description: `La prefactura ha sido facturada como ${newInvoiceNumber}. Los datos han sido enviados a SAP y la factura ya no se puede editar.`,
        className: "bg-green-600 text-white"
      })
      
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Error en la facturación",
        description: error.message || "No se pudo completar la facturación,",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleActionChange = (action: keyof typeof actions, checked: boolean) => {
    setActions(prev => ({
      ...prev,
      [action]: checked
    }))
  }

  if (!invoice) return null

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Facturar Prefactura - {invoice.invoiceNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Información de la prefactura */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" /> Información de la Prefactura
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRecordsModal(true)}
                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Cliente:</span>
                  <span>{invoice.clientName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Total:</span>
                  <span className="font-bold">${invoice.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Fecha Emisión:</span>
                  <span>{new Date(invoice.issueDate).toLocaleDateString('es-ES')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Ship className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Contenedores:</span>
                  <span>{invoice.relatedRecordIds?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Número de factura */}
            <div className="space-y-2">
              <Label htmlFor="invoice-number" className="text-sm font-semibold">
                Número de Factura *
              </Label>
              <Input
                id="invoice-number"
                value={newInvoiceNumber}
                onChange={(e) => setNewInvoiceNumber(e.target.value.toUpperCase())}
                placeholder={defaultInvoiceNumber}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Ingresa el número de factura que se enviará a SAP
              </p>
            </div>

            {/* Acciones de facturación */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Acciones de Facturación
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3 p-3 border border-gray-200">
                  <Checkbox
                    id="send-email"
                    checked={actions.sendEmail}
                    onCheckedChange={(checked) => handleActionChange('sendEmail', checked as boolean)}
                  />
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    <Label htmlFor="send-email" className="font-medium">
                      Enviar factura por email al cliente
                    </Label>
                  </div>
                  <Badge variant="outline" className="ml-auto">Próximamente</Badge>
                </div>
                <div className="flex items-center space-x-3 p-3 border border-gray-200">
                  <Checkbox
                    id="generate-xml"
                    checked={actions.generateXML}
                    onCheckedChange={(checked) => handleActionChange('generateXML', checked as boolean)}
                  />
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-green-600" />
                    <Label htmlFor="generate-xml" className="font-medium">
                      Generar XML para enviar a SAP
                    </Label>
                  </div>
                  <Badge variant="outline" className="ml-auto">Próximamente</Badge>
                </div>
              </div>
            </div>

            {/* Advertencia */}
            <Alert className="border border-orange-200 bg-orange-50 text-orange-800">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Advertencia:</strong> Una vez facturada, la factura será enviada a SAP y ya no se podrá editar. Esta acción es irreversible.
              </AlertDescription>
            </Alert>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleFacturar}
                disabled={isProcessing || !newInvoiceNumber.trim()}
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

      {/* Modal de visualización de registros */}
      <PTYSSRecordsViewModal
        open={showRecordsModal}
        onOpenChange={setShowRecordsModal}
        invoice={invoice}
      />
    </>
  )
} 