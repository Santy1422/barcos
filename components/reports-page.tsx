"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { BarChart, Download, FileText, PieChart, TrendingUp } from "lucide-react"
import { mockXmlFiles } from "@/lib/mock-data"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function ReportsPage() {
  const [reportType, setReportType] = useState("cliente")
  const [dateRange, setDateRange] = useState("mes")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [selectedClient, setSelectedClient] = useState("todos")

  // Datos simulados para los gráficos
  const clientData = [
    { name: "MSC Logistics", value: 5, amount: 2500.75 },
    { name: "Global Shipping Co.", value: 3, amount: 1845.3 },
    { name: "TransOcean Logistics", value: 2, amount: 876.3 },
    { name: "SeaFreight International", value: 4, amount: 1523.45 },
    { name: "Pacific Carriers", value: 3, amount: 1890.2 },
  ]

  const statusData = [
    { name: "Pendiente", value: 2, color: "#3498db" },
    { name: "Validado", value: 3, color: "#2ecc71" },
    { name: "Error", value: 1, color: "#e74c3c" },
    { name: "Transmitido", value: 4, color: "#95a5a6" },
  ]

  const monthlyData = [
    { month: "Ene", value: 12 },
    { month: "Feb", value: 15 },
    { month: "Mar", value: 18 },
    { month: "Abr", value: 14 },
    { month: "May", value: 22 },
    { month: "Jun", value: 19 },
    { month: "Jul", value: 23 },
    { month: "Ago", value: 25 },
    { month: "Sep", value: 21 },
    { month: "Oct", value: 18 },
    { month: "Nov", value: 15 },
    { month: "Dic", value: 20 },
  ]

  // Función para renderizar el gráfico de barras
  const renderBarChart = (data: any[], valueKey = "value", maxValue = 25) => {
    return (
      <div className="w-full h-64 flex items-end justify-between gap-2 mt-6 px-2">
        {data.map((item, index) => (
          <div key={index} className="flex flex-col items-center gap-2">
            <div
              className="w-12 bg-primary rounded-t-sm transition-all duration-500"
              style={{
                height: `${(item[valueKey] / maxValue) * 100}%`,
                backgroundColor: item.color || undefined,
              }}
            ></div>
            <span className="text-xs font-medium text-center">{item.month || item.name}</span>
          </div>
        ))}
      </div>
    )
  }

  // Función para renderizar el gráfico circular
  const renderPieChart = (data: any[]) => {
    const total = data.reduce((acc, item) => acc + item.value, 0)
    let cumulativePercentage = 0

    return (
      <div className="relative w-64 h-64 mx-auto mt-6">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {data.map((item, index) => {
            const percentage = (item.value / total) * 100
            const startAngle = cumulativePercentage * 3.6 // 3.6 = 360 / 100
            const endAngle = (cumulativePercentage + percentage) * 3.6

            // Convertir ángulos a coordenadas
            const startX = 50 + 50 * Math.cos((startAngle - 90) * (Math.PI / 180))
            const startY = 50 + 50 * Math.sin((startAngle - 90) * (Math.PI / 180))
            const endX = 50 + 50 * Math.cos((endAngle - 90) * (Math.PI / 180))
            const endY = 50 + 50 * Math.sin((endAngle - 90) * (Math.PI / 180))

            // Determinar si el arco es mayor que 180 grados
            const largeArcFlag = percentage > 50 ? 1 : 0

            // Crear el path para el sector
            const path = [`M 50 50`, `L ${startX} ${startY}`, `A 50 50 0 ${largeArcFlag} 1 ${endX} ${endY}`, `Z`].join(
              " ",
            )

            cumulativePercentage += percentage

            return <path key={index} d={path} fill={item.color || `hsl(${index * 60}, 70%, 60%)`} />
          })}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 bg-white rounded-full"></div>
        </div>
      </div>
    )
  }

  // Función para renderizar la leyenda del gráfico circular
  const renderPieChartLegend = (data: any[]) => {
    return (
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded-sm"
              style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 60%)` }}
            ></div>
            <span className="text-sm">
              {item.name} ({item.value})
            </span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Reportes</h1>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Excel
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Reporte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cliente">Por Cliente</SelectItem>
                  <SelectItem value="estado">Por Estado</SelectItem>
                  <SelectItem value="fecha">Por Fecha</SelectItem>
                  <SelectItem value="monto">Por Monto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date-range">Rango de Fechas</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger id="date-range">
                  <SelectValue placeholder="Seleccionar rango" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semana">Última Semana</SelectItem>
                  <SelectItem value="mes">Último Mes</SelectItem>
                  <SelectItem value="trimestre">Último Trimestre</SelectItem>
                  <SelectItem value="anio">Último Año</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "personalizado" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Fecha Inicio</Label>
                  <Input id="start-date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-date">Fecha Fin</Label>
                  <Input id="end-date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}

            {reportType === "cliente" && (
              <div className="space-y-2">
                <Label htmlFor="client">Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="client">
                    <SelectValue placeholder="Seleccionar cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos los Clientes</SelectItem>
                    <SelectItem value="msc">MSC Logistics</SelectItem>
                    <SelectItem value="global">Global Shipping Co.</SelectItem>
                    <SelectItem value="transocean">TransOcean Logistics</SelectItem>
                    <SelectItem value="seafreight">SeaFreight International</SelectItem>
                    <SelectItem value="pacific">Pacific Carriers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="md:col-span-4">
              <Button className="w-full md:w-auto">Generar Reporte</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="grafico" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-grid">
          <TabsTrigger value="grafico">
            <BarChart className="h-4 w-4 mr-2" />
            Gráfico
          </TabsTrigger>
          <TabsTrigger value="tabla">
            <TrendingUp className="h-4 w-4 mr-2" />
            Tabla
          </TabsTrigger>
          <TabsTrigger value="resumen">
            <PieChart className="h-4 w-4 mr-2" />
            Resumen
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grafico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                {reportType === "cliente" && "Facturas por Cliente"}
                {reportType === "estado" && "Facturas por Estado"}
                {reportType === "fecha" && "Facturas por Mes"}
                {reportType === "monto" && "Montos por Cliente"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportType === "cliente" && renderBarChart(clientData)}
              {reportType === "estado" && (
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                  {renderPieChart(statusData)}
                  {renderPieChartLegend(statusData)}
                </div>
              )}
              {reportType === "fecha" && renderBarChart(monthlyData)}
              {reportType === "monto" && renderBarChart(clientData, "amount", 3000)}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tabla" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Datos Detallados</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockXmlFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">{file.reference}</TableCell>
                      <TableCell>{file.date}</TableCell>
                      <TableCell>{file.customer}</TableCell>
                      <TableCell>
                        {file.amount} {file.currency}
                      </TableCell>
                      <TableCell className="capitalize">{file.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resumen" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumen por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Estado</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Porcentaje</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statusData.map((status) => (
                      <TableRow key={status.name}>
                        <TableCell className="font-medium">{status.name}</TableCell>
                        <TableCell>{status.value}</TableCell>
                        <TableCell>
                          {Math.round((status.value / statusData.reduce((acc, curr) => acc + curr.value, 0)) * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumen por Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Facturas</TableHead>
                      <TableHead>Monto Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientData.map((client) => (
                      <TableRow key={client.name}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.value}</TableCell>
                        <TableCell>{client.amount.toFixed(2)} ZAR</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
