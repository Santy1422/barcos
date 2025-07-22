"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileSpreadsheet } from "lucide-react"

export function UploadExcelPage() {
  return (
    <div className="p-6 space-y-6"> 
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Subir Excel</h1>
      </div>

      <Card>
        <CardHeader> 
          <CardTitle>Instrucciones para Subir Archivos Excel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              Por favor, selecciona el módulo correspondiente para subir tu archivo Excel.
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Cada tipo de Excel (tracking, invoices, transport services, etc.) debe ser subido en su módulo específico.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/tracking" className="no-underline">
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader> 
                  <CardTitle>Tracking</CardTitle>
                </CardHeader>
                <CardContent>Sube aquí tus archivos Excel de tracking.</CardContent>
              </Card>
            </Link>

            <Link href="/invoices" className="no-underline">
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <CardTitle>Invoices</CardTitle>
                </CardHeader>
                <CardContent>Sube aquí tus archivos Excel de invoices.</CardContent>
              </Card>
            </Link>

            <Link href="/transport" className="no-underline">
              <Card className="hover:shadow-md transition-shadow duration-200">
                <CardHeader>
                  <CardTitle>Transport</CardTitle>
                </CardHeader>
                <CardContent>Sube aquí tus archivos Excel de transport services.</CardContent>
              </Card>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
