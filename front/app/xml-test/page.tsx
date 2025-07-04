"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle, Download, FileText, AlertCircle } from "lucide-react"
import { generateTestXML, validateXMLForSAP, generateInvoiceXML } from "@/lib/xml-generator"
import type { InvoiceForXmlPayload } from "@/lib/features/invoice/invoiceSlice"
import saveAs from "file-saver"

export default function XMLTestPage() {
  const [testXml, setTestXml] = useState<string>("")
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] } | null>(null)
  const [customXml, setCustomXml] = useState<string>("")

  const generateTest = () => {
    try {
      const xml = generateTestXML()
      setTestXml(xml)
      setValidationResult(null)
    } catch (error) {
      console.error("Error generando XML de prueba:", error)
    }
  }

  const validateXML = (xmlString: string) => {
    const result = validateXMLForSAP(xmlString)
    setValidationResult(result)
  }

  const downloadXML = (xmlString: string, filename: string) => {
    const blob = new Blob([xmlString], { type: "application/xml;charset=utf-8" })
    saveAs(blob, filename)
  }

  const generateCustomXML = () => {
    try {
      // Crear un payload de ejemplo más completo
      const customPayload: InvoiceForXmlPayload = {
        id: "CUSTOM-001",
        module: "trucking",
        invoiceNumber: "F-TRK-CUSTOM-001",
        client: "12345678-1",
        clientName: "Cliente Personalizado",
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        currency: "USD",
        total: 1250.00,
        records: [
          {
            id: "REC-001",
            description: "Servicio de transporte - Container: ABCD1234567",
            quantity: 1,
            unitPrice: 800.00,
            totalPrice: 800.00,
            serviceCode: "SRV100",
            unit: "VIAJE",
            blNumber: "BL123456789",
            containerNumber: "ABCD1234567",
            containerSize: "40",
            containerType: "DV",
            driverName: "Juan Pérez",
            plate: "ABC-123",
            moveDate: new Date().toISOString().split('T')[0],
            associate: "Empresa Asociada",
            commodity: "ELECTRONICS",
            fullEmptyStatus: "FULL",
            containerIsoCode: "42G1"
          },
          {
            id: "REC-002",
            description: "Servicio de transporte - Container: EFGH9876543",
            quantity: 1,
            unitPrice: 450.00,
            totalPrice: 450.00,
            serviceCode: "SRV101",
            unit: "VIAJE",
            blNumber: "BL987654321",
            containerNumber: "EFGH9876543",
            containerSize: "20",
            containerType: "DV",
            driverName: "María García",
            plate: "XYZ-789",
            moveDate: new Date().toISOString().split('T')[0],
            associate: "Empresa Asociada",
            commodity: "TEXTILES",
            fullEmptyStatus: "EMPTY",
            containerIsoCode: "22G1"
          }
        ],
        status: "generated",
        driverId: "DRIVER-001",
        vehicleId: "VEHICLE-001",
        routeId: "ROUTE-001"
      }

      const xml = generateInvoiceXML(customPayload)
      setCustomXml(xml)
      setValidationResult(null)
    } catch (error) {
      console.error("Error generando XML personalizado:", error)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <FileText className="mr-2 h-8 w-8" />
            Validador de XML para SAP
          </h1>
          <p className="text-muted-foreground">
            Genera y valida archivos XML para integración con SAP
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generación de XML de Prueba */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              XML de Prueba
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Genera un XML de prueba con datos de ejemplo para validar la estructura.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={generateTest}>
                Generar XML de Prueba
              </Button>
              {testXml && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => validateXML(testXml)}
                  >
                    Validar XML
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => downloadXML(testXml, "test-invoice.xml")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                </>
              )}
            </div>

            {testXml && (
              <div className="space-y-2">
                <Textarea
                  value={testXml}
                  readOnly
                  rows={15}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generación de XML Personalizado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              XML Personalizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Genera un XML con múltiples items de servicio para probar casos más complejos.
            </p>
            
            <div className="flex gap-2">
              <Button onClick={generateCustomXML}>
                Generar XML Personalizado
              </Button>
              {customXml && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => validateXML(customXml)}
                  >
                    Validar XML
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => downloadXML(customXml, "custom-invoice.xml")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar
                  </Button>
                </>
              )}
            </div>

            {customXml && (
              <div className="space-y-2">
                <Textarea
                  value={customXml}
                  readOnly
                  rows={15}
                  className="font-mono text-xs"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resultados de Validación */}
      {validationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              {validationResult.isValid ? (
                <CheckCircle2 className="mr-2 h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="mr-2 h-5 w-5 text-red-600" />
              )}
              Resultados de Validación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={validationResult.isValid ? "default" : "destructive"}>
                {validationResult.isValid ? "XML Válido" : "XML Inválido"}
              </Badge>
              {validationResult.isValid && (
                <Badge variant="outline" className="text-green-600">
                  Listo para SAP
                </Badge>
              )}
            </div>

            {validationResult.isValid ? (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>XML Válido</AlertTitle>
                <AlertDescription>
                  El XML cumple con todos los requisitos para integración con SAP.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Errores Encontrados</AlertTitle>
                  <AlertDescription>
                    Se encontraron los siguientes problemas en el XML:
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-1">
                  {validationResult.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 bg-red-50 border border-red-200 rounded">
                      <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-800">{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información sobre la Estructura */}
      <Card>
        <CardHeader>
          <CardTitle>Estructura del XML para SAP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Campos Requeridos:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• CompanyCode (932 para Trucking)</li>
                <li>• DocumentType (XL)</li>
                <li>• DocumentDate (YYYYMMDD)</li>
                <li>• CustomerNbr (RUC del cliente)</li>
                <li>• AmntTransactCur (Monto total)</li>
                <li>• Al menos un OtherItem</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Formato de Fechas:</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• DocumentDate: YYYYMMDD</li>
                <li>• PostingDate: YYYYMMDD</li>
                <li>• DueDate: YYYYMMDD</li>
                <li>• MoveDate: YYYYMMDD</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 