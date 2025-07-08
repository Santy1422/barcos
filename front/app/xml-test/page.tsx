"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { generateTestXML, validateXMLForSAP } from "@/lib/xml-generator"
import { Download } from "lucide-react"
import saveAs from "file-saver"

export default function XmlTestPage() {
  const [xmlContent, setXmlContent] = useState<string>("")
  const [validationResult, setValidationResult] = useState<{ isValid: boolean; errors: string[] } | null>(null)

  const generateTestXml = () => {
    try {
      const xml = generateTestXML()
      setXmlContent(xml)
      
      // Validar el XML
      const validation = validateXMLForSAP(xml)
      setValidationResult(validation)
      
      console.log("XML generado:", xml)
      console.log("Validación:", validation)
    } catch (error) {
      console.error("Error generando XML:", error)
      setXmlContent("Error al generar XML: " + error)
    }
  }

  const downloadXml = () => {
    if (xmlContent) {
      const blob = new Blob([xmlContent], { type: "application/xml;charset=utf-8" })
      saveAs(blob, "test-invoice.xml")
    }
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Prueba de Generación de XML</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={generateTestXml}>
              Generar XML de Prueba
            </Button>
            {xmlContent && (
              <Button onClick={downloadXml} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Descargar XML
              </Button>
            )}
          </div>
          
          {validationResult && (
            <div className={`p-4 rounded-md ${validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <h3 className={`font-semibold ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                {validationResult.isValid ? '✅ XML Válido' : '❌ XML Inválido'}
              </h3>
              {validationResult.errors.length > 0 && (
                <ul className="mt-2 text-sm">
                  {validationResult.errors.map((error, index) => (
                    <li key={index} className="text-red-700">• {error}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {xmlContent && (
            <div>
              <h3 className="font-semibold mb-2">XML Generado:</h3>
              <Textarea
                value={xmlContent}
                readOnly
                rows={30}
                className="font-mono text-xs"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 