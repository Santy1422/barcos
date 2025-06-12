import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FileSignature, Download } from "lucide-react"
import type { TruckingFormData } from "../hooks/useTruckingInvoice"

interface InvoiceReviewProps {
  formData: TruckingFormData
  generatedXml: string | null
  generatedPdf: Blob | null
  onDownloadXml: () => void
  onDownloadPdf: () => void
}

export function InvoiceReview({
  formData,
  generatedXml,
  generatedPdf,
  onDownloadXml,
  onDownloadPdf,
}: InvoiceReviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileSignature className="mr-2 h-6 w-6" />
          Revisar Factura Generada
        </CardTitle>
        <CardDescription>Revisa los detalles antes de finalizar.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Factura:</strong> {formData.invoiceNumber}
            </div>
            <div>
              <strong>Cliente:</strong> {formData.clientName}
            </div>
            <div>
              <strong>RUC:</strong> {formData.clientRuc}
            </div>
            <div>
              <strong>Fecha:</strong> {formData.issueDate}
            </div>
          </div>
          <div className="text-right space-y-1">
            <p>
              <strong>Subtotal:</strong> {formData.currency} {formData.subtotal.toFixed(2)}
            </p>
            <p>
              <strong>Impuestos:</strong> {formData.currency} {formData.taxAmount.toFixed(2)}
            </p>
            <p className="text-xl font-bold">
              <strong>Total:</strong> {formData.currency} {formData.total.toFixed(2)}
            </p>
          </div>
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-semibold">Archivos Generados:</h3>
              <div className="flex gap-2">
                <Button onClick={onDownloadXml} variant="outline" size="sm" disabled={!generatedXml}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar XML
                </Button>
                <Button onClick={onDownloadPdf} variant="outline" size="sm" disabled={!generatedPdf}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar PDF
                </Button>
              </div>
            </div>
            <Textarea
              value={generatedXml || "Error al generar XML o XML no disponible."}
              readOnly
              rows={15}
              className="font-mono text-xs bg-muted/30"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}