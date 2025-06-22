"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileUp, Upload, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { mockXmlContent } from "@/lib/mock-data"

export function UploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [xmlContent, setXmlContent] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [validating, setValidating] = useState(false)
  const [validationProgress, setValidationProgress] = useState(0)
  const [validationComplete, setValidationComplete] = useState(false)
  const [validationSuccess, setValidationSuccess] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setXmlContent(null)
      setValidationComplete(false)
      setValidationErrors([])
    }
  }

  const handleUpload = () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)

    // Simular carga
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)
          setXmlContent(mockXmlContent)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const handleValidate = () => {
    setValidating(true)
    setValidationProgress(0)

    // Simular validación
    const interval = setInterval(() => {
      setValidationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setValidating(false)
          setValidationComplete(true)

          // Simular resultado de validación (éxito o error)
          const success = Math.random() > 0.3
          setValidationSuccess(success)

          if (!success) {
            setValidationErrors([
              "Error en línea 15: Formato de fecha incorrecto",
              "Error en línea 23: Monto negativo no permitido",
              "Error en línea 42: Código de cliente inválido",
            ])
          }

          return 100
        }
        return prev + 5
      })
    }, 100)
  }

  const handleClearFile = () => {
    setFile(null)
    setXmlContent(null)
    setValidationComplete(false)
    setValidationErrors([])
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Cargar XML</h1>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList>
          <TabsTrigger value="upload">Cargar Archivo</TabsTrigger>
          <TabsTrigger value="paste">Pegar Contenido</TabsTrigger>
        </TabsList>
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cargar Archivo XML</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="xml-file">Archivo XML</Label>
                <div className="flex items-center gap-2">
                  <Input id="xml-file" type="file" accept=".xml" onChange={handleFileChange} />
                  {file && (
                    <Button variant="outline" size="icon" onClick={handleClearFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {file && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Archivo: {file.name}</span>
                    <span>{(file.size / 1024).toFixed(2)} KB</span>
                  </div>

                  {uploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>Cargando...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}

                  {!xmlContent && !uploading && (
                    <Button onClick={handleUpload} className="w-full">
                      <Upload className="mr-2 h-4 w-4" />
                      Cargar Archivo
                    </Button>
                  )}

                  {xmlContent && (
                    <div className="space-y-4">
                      <div className="rounded-md border p-4 font-mono text-sm overflow-auto max-h-60">
                        <pre>{xmlContent}</pre>
                      </div>

                      {!validationComplete && !validating && (
                        <Button onClick={handleValidate} className="w-full">
                          Validar XML
                        </Button>
                      )}

                      {validating && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Validando...</span>
                            <span>{validationProgress}%</span>
                          </div>
                          <Progress value={validationProgress} className="h-2" />
                        </div>
                      )}

                      {validationComplete && (
                        <>
                          {validationSuccess ? (
                            <Alert className="bg-green-50 border-green-200">
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                              <AlertTitle className="text-green-800">Validación exitosa</AlertTitle>
                              <AlertDescription className="text-green-700">
                                El archivo XML ha sido validado correctamente.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert variant="destructive">
                              <AlertCircle className="h-4 w-4" />
                              <AlertTitle>Error de validación</AlertTitle>
                              <AlertDescription>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                  {validationErrors.map((error, index) => (
                                    <li key={index}>{error}</li>
                                  ))}
                                </ul>
                              </AlertDescription>
                            </Alert>
                          )}

                          <div className="flex gap-2">
                            {validationSuccess ? (
                              <Button className="w-full">Continuar a Edición</Button>
                            ) : (
                              <Button variant="outline" onClick={handleValidate} className="w-full">
                                Reintentar Validación
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!file && (
                <div className="border-2 border-dashed rounded-lg p-12 text-center">
                  <FileUp className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-4 text-lg font-semibold">Arrastra y suelta tu archivo XML</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    O haz clic en el botón de arriba para seleccionar un archivo
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="paste">
          <Card>
            <CardHeader>
              <CardTitle>Pegar Contenido XML</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="xml-content">Contenido XML</Label>
                <textarea
                  id="xml-content"
                  className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Pega aquí el contenido XML..."
                />
              </div>
              <Button className="w-full">Validar Contenido</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componentes adicionales para esta página
import { CheckCircle2, AlertCircle } from "lucide-react"
