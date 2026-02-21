"use client"

import { useEffect, useState, useCallback } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  fetchAllAnalytics,
  fetchMetrics,
  fetchRevenue,
  fetchOperational,
  fetchModuleAnalytics,
  fetchClientsAnalytics,
  fetchInvoicesAnalytics,
  selectAnalyticsLoading,
  selectAnalyticsError,
  selectMetrics,
  selectRevenue,
  selectOperational,
  selectTruckingAnalytics,
  selectAgencyAnalytics,
  selectPtyssAnalytics,
  selectShipchandlerAnalytics,
  selectClientsAnalytics,
  selectInvoicesAnalytics,
  selectLastFetched,
} from "@/lib/features/analytics/analyticsSlice"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  RefreshCw,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Truck,
  Ship,
  Anchor,
  Car,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart,
  Database,
  Download,
  Loader2,
} from "lucide-react"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPie,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

const COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#22c55e"]
const MODULE_COLORS: any = {
  trucking: "#3b82f6",
  ptyss: "#8b5cf6",
  shipchandler: "#14b8a6",
  agency: "#f59e0b",
}

export function AnalyticsDashboard() {
  const dispatch = useAppDispatch()
  const loading = useAppSelector(selectAnalyticsLoading)
  const error = useAppSelector(selectAnalyticsError)
  const metrics = useAppSelector(selectMetrics)
  const revenue = useAppSelector(selectRevenue)
  const operational = useAppSelector(selectOperational)
  const trucking = useAppSelector(selectTruckingAnalytics)
  const agency = useAppSelector(selectAgencyAnalytics)
  const ptyss = useAppSelector(selectPtyssAnalytics)
  const shipchandler = useAppSelector(selectShipchandlerAnalytics)
  const clientsData = useAppSelector(selectClientsAnalytics)
  const invoicesData = useAppSelector(selectInvoicesAnalytics)
  const lastFetched = useAppSelector(selectLastFetched)

  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    dispatch(fetchAllAnalytics())
  }, [dispatch])

  const handleRefresh = async () => {
    setRefreshing(true)
    await dispatch(fetchAllAnalytics())
    setRefreshing(false)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const token = localStorage.getItem("token")
      const baseUrl = API_URL.endsWith('/api') ? API_URL : `${API_URL}/api`
      const url = `${baseUrl}/analytics/export`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const downloadUrl = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = downloadUrl
        a.download = `analytics_${new Date().toISOString().split("T")[0]}.xlsx`
        document.body.appendChild(a)
        a.click()
        a.remove()
        window.URL.revokeObjectURL(downloadUrl)
      } else {
        console.error("Export failed:", response.status)
      }
    } catch (err) {
      console.error("Export error:", err)
    }
    setExporting(false)
  }

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(value)
  }

  const formatNumber = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "0"
    return new Intl.NumberFormat("en-US").format(value)
  }

  const formatPercent = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "0%"
    return `${(value * 100).toFixed(1)}%`
  }

  // Preparar datos para gráficos
  const revenueByModuleData = revenue?.byModule
    ? Object.entries(revenue.byModule).map(([name, value]) => ({
        name: name.toUpperCase(),
        value: value as number,
        color: MODULE_COLORS[name] || "#666",
      }))
    : []

  const timelineData = revenue?.timeline || []
  const monthlyData = revenue?.monthlyBreakdown || []

  const invoicesByDayData = invoicesData?.invoicesByDay || []

  // KPI Cards
  const kpiCards = [
    {
      title: "Ingresos Totales",
      value: formatCurrency(metrics?.totalRevenue || revenue?.total),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      subtitle: "Total facturado",
    },
    {
      title: "Transacciones",
      value: formatNumber(metrics?.totalTransactions),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      subtitle: "Facturas totales",
    },
    {
      title: "Clientes Activos",
      value: formatNumber(metrics?.activeClients || clientsData?.totalActive),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      subtitle: `de ${formatNumber(metrics?.totalClients || clientsData?.total)} totales`,
    },
    {
      title: "Registros",
      value: formatNumber(metrics?.totalRecords),
      icon: Database,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      subtitle: "En todos los módulos",
    },
  ]

  const months = [
    { value: "1", label: "Enero" },
    { value: "2", label: "Febrero" },
    { value: "3", label: "Marzo" },
    { value: "4", label: "Abril" },
    { value: "5", label: "Mayo" },
    { value: "6", label: "Junio" },
    { value: "7", label: "Julio" },
    { value: "8", label: "Agosto" },
    { value: "9", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Business Intelligence - Datos en tiempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={handleExport}
            disabled={exporting}
            variant="outline"
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Exportar Excel
          </Button>

          <Button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-200">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-28" />
                  ) : (
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Timeline */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Tendencia de Ingresos (Últimos 30 días)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={timelineData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(val) => val.slice(5)} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), "Ingresos"]}
                    labelFormatter={(label) => `Fecha: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Module - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-purple-600" />
              Distribución por Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={revenueByModuleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {revenueByModuleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </RechartsPie>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by Module - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Comparativa por Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByModuleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {revenueByModuleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Métricas Operacionales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-orange-600" />
            Métricas Operacionales
          </CardTitle>
          <CardDescription>Tasas de eficiencia y completación por módulo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "General", value: operational?.overallCompletionRate, color: "bg-blue-500" },
              { name: "PTG/Trucking", value: operational?.truckingEfficiency, color: "bg-indigo-500" },
              { name: "PTYSS", value: operational?.ptyssEfficiency, color: "bg-purple-500" },
              { name: "Agency", value: operational?.agencyEfficiency, color: "bg-amber-500" },
            ].map((metric, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{metric.name}</span>
                  <span className="text-lg font-bold">{formatPercent(metric.value)}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${metric.color} rounded-full transition-all duration-500`}
                    style={{ width: `${(metric.value || 0) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs de detalle */}
      <Tabs defaultValue="modules" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="modules">Módulos</TabsTrigger>
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="monthly">Mensual</TabsTrigger>
        </TabsList>

        {/* Tab Módulos */}
        <TabsContent value="modules">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "PTG/Trucking", data: trucking, icon: Truck, color: "blue" },
              { title: "PTYSS", data: ptyss, icon: Ship, color: "indigo" },
              { title: "ShipChandler", data: shipchandler, icon: Anchor, color: "teal" },
              { title: "Agency", data: agency, icon: Car, color: "amber" },
            ].map((module, index) => (
              <Card key={index} className={`border-t-4 border-t-${module.color}-500`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <module.icon className={`h-5 w-5 text-${module.color}-600`} />
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-full" />
                      <Skeleton className="h-6 w-3/4" />
                    </div>
                  ) : module.data ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-muted-foreground">Registros</p>
                          <p className="text-lg font-bold">{formatNumber(module.data.totalRecords)}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-muted-foreground">Revenue</p>
                          <p className="text-lg font-bold">{formatCurrency(module.data.totalRevenue)}</p>
                        </div>
                      </div>
                      {module.data.byStatus && Object.keys(module.data.byStatus).length > 0 && (
                        <div className="text-xs space-y-1">
                          {Object.entries(module.data.byStatus).map(([status, count]) => (
                            <div key={status} className="flex justify-between">
                              <span className="capitalize">{status}</span>
                              <Badge variant="outline">{formatNumber(count as number)}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sin datos</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Tab Clientes */}
        <TabsContent value="clients">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Resumen de Clientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-blue-600">{formatNumber(clientsData?.total)}</p>
                    <p className="text-sm text-muted-foreground">Total</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">{formatNumber(clientsData?.totalActive)}</p>
                    <p className="text-sm text-muted-foreground">Activos</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-purple-600">{formatNumber(clientsData?.newThisMonth)}</p>
                    <p className="text-sm text-muted-foreground">Nuevos (mes)</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-gray-600">{formatNumber(clientsData?.inactive)}</p>
                    <p className="text-sm text-muted-foreground">Inactivos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Top Clientes por Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Facturas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(clientsData?.topByRevenue || []).slice(0, 10).map((client: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{client._id || "N/A"}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(client.totalRevenue)}</TableCell>
                          <TableCell className="text-right">{client.invoiceCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Facturas */}
        <TabsContent value="invoices">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Facturas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Prefacturas</p>
                        <p className="text-2xl font-bold">{formatNumber(invoicesData?.pending)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Facturadas</p>
                        <p className="text-2xl font-bold">{formatNumber(invoicesData?.completed)}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <DollarSign className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Monto Total</p>
                        <p className="text-2xl font-bold">{formatCurrency(invoicesData?.totalAmount)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Facturas por Día (Últimos 30 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={invoicesByDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "amount" ? formatCurrency(value) : value,
                        name === "amount" ? "Monto" : "Cantidad",
                      ]}
                    />
                    <Bar dataKey="count" fill="#3b82f6" name="Cantidad" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Mensual */}
        <TabsContent value="monthly">
          <Card>
            <CardHeader>
              <CardTitle>Desglose Mensual</CardTitle>
              <CardDescription>Ingresos y transacciones por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mes</TableHead>
                      <TableHead className="text-right">Ingresos</TableHead>
                      <TableHead className="text-right">Transacciones</TableHead>
                      <TableHead className="text-right">Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(monthlyData || []).map((item: any, index: number) => {
                      const monthName = months.find((m) => m.value === item.month.toString())?.label || item.month
                      const average = item.count > 0 ? item.amount / item.count : 0
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {monthName} {item.year}
                          </TableCell>
                          <TableCell className="text-right font-bold text-green-600">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(item.count)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(average)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Footer con última actualización */}
      <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Última actualización: {lastFetched ? new Date(lastFetched).toLocaleString() : "Nunca"}
        </div>
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4" />
          Datos en tiempo real desde la API
        </div>
      </div>
    </div>
  )
}
