"use client"

import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  fetchAllAnalytics,
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
  selectAdvancedAnalytics,
  selectForecastingAnalytics,
  selectModuleComparisonAnalytics,
  selectAlertsAnalytics,
  selectEfficiencyRankings,
  selectLastFetched,
} from "@/lib/features/analytics/analyticsSlice"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
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
  XCircle,
  BarChart3,
  PieChart,
  Database,
  Download,
  Loader2,
  Receipt,
  Percent,
  Target,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Globe,
  Package,
  CreditCard,
  Award,
  TrendingUp as TrendUp,
  AlertTriangle,
  Bell,
  Brain,
  Flame,
  Medal,
  Trophy,
  Crown,
  Star,
  Shield,
  Info,
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  RadialBarChart,
  RadialBar,
} from "recharts"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

const COLORS = ["#3b82f6", "#8b5cf6", "#14b8a6", "#f59e0b", "#ef4444", "#22c55e", "#ec4899", "#6366f1"]
const MODULE_COLORS: Record<string, string> = {
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
  const advanced = useAppSelector(selectAdvancedAnalytics)
  const forecasting = useAppSelector(selectForecastingAnalytics)
  const moduleComparison = useAppSelector(selectModuleComparisonAnalytics)
  const alertsData = useAppSelector(selectAlertsAnalytics)
  const efficiencyRankings = useAppSelector(selectEfficiencyRankings)
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

  const formatCompact = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0"
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
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

  // Datos para radar chart de módulos
  const radarData = [
    {
      subject: 'Revenue',
      PTG: trucking?.totalRevenue || 0,
      PTYSS: ptyss?.totalRevenue || 0,
      Agency: agency?.totalRevenue || 0,
      ShipChandler: shipchandler?.totalRevenue || 0,
    },
    {
      subject: 'Registros',
      PTG: trucking?.totalRecords || 0,
      PTYSS: ptyss?.totalRecords || 0,
      Agency: agency?.totalRecords || 0,
      ShipChandler: shipchandler?.totalRecords || 0,
    },
    {
      subject: 'Facturas',
      PTG: trucking?.totalInvoices || 0,
      PTYSS: ptyss?.totalInvoices || 0,
      Agency: agency?.totalInvoices || 0,
      ShipChandler: shipchandler?.totalInvoices || 0,
    },
  ]

  // Datos para gráfico de eficiencia
  const efficiencyData = [
    { name: 'General', value: (operational?.overallCompletionRate || 0) * 100, fill: '#3b82f6' },
    { name: 'PTG', value: (operational?.truckingEfficiency || 0) * 100, fill: '#8b5cf6' },
    { name: 'PTYSS', value: (operational?.ptyssEfficiency || 0) * 100, fill: '#14b8a6' },
    { name: 'Agency', value: (operational?.agencyEfficiency || 0) * 100, fill: '#f59e0b' },
  ]

  // Datos para status de facturas
  const invoiceStatusData = invoicesData?.byStatus
    ? Object.entries(invoicesData.byStatus).map(([status, count], index) => ({
        name: status === 'prefactura' ? 'Prefacturas' : status === 'facturada' ? 'Facturadas' : status,
        value: count as number,
        color: status === 'facturada' ? '#22c55e' : status === 'prefactura' ? '#f59e0b' : COLORS[index % COLORS.length],
      }))
    : []

  // Datos combinados para timeline
  const combinedTimelineData = timelineData.map((item: any) => ({
    ...item,
    count: invoicesByDayData.find((inv: any) => inv.date === item.date)?.count || 0,
  }))

  // Calcular totales por módulo
  const modulesTotals = [
    { name: 'PTG/Trucking', revenue: trucking?.totalRevenue || 0, records: trucking?.totalRecords || 0, invoices: trucking?.totalInvoices || 0, icon: Truck, color: '#3b82f6' },
    { name: 'PTYSS', revenue: ptyss?.totalRevenue || 0, records: ptyss?.totalRecords || 0, invoices: ptyss?.totalInvoices || 0, icon: Ship, color: '#8b5cf6' },
    { name: 'Agency', revenue: agency?.totalRevenue || 0, records: agency?.totalRecords || 0, invoices: agency?.totalInvoices || 0, icon: Car, color: '#f59e0b' },
    { name: 'ShipChandler', revenue: shipchandler?.totalRevenue || 0, records: shipchandler?.totalRecords || 0, invoices: shipchandler?.totalInvoices || 0, icon: Anchor, color: '#14b8a6' },
  ]

  const totalModuleRevenue = modulesTotals.reduce((acc, m) => acc + m.revenue, 0)

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

  // KPI Cards - 8 métricas principales
  const kpiCards = [
    {
      title: "Ingresos Totales",
      value: formatCurrency(metrics?.totalRevenue || revenue?.total),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-l-green-500",
    },
    {
      title: "Facturas Totales",
      value: formatNumber(metrics?.totalTransactions || invoicesData?.total),
      icon: FileText,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-l-blue-500",
    },
    {
      title: "Clientes Activos",
      value: formatNumber(metrics?.activeClients || clientsData?.totalActive),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-l-purple-500",
    },
    {
      title: "Registros Totales",
      value: formatNumber(metrics?.totalRecords),
      icon: Database,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-l-orange-500",
    },
    {
      title: "Prefacturas Pendientes",
      value: formatNumber(metrics?.pendingInvoices || invoicesData?.pending),
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-l-yellow-500",
    },
    {
      title: "Facturas Completadas",
      value: formatNumber(metrics?.completedInvoices || invoicesData?.completed),
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-l-emerald-500",
    },
    {
      title: "Tasa de Completación",
      value: formatPercent(operational?.overallCompletionRate),
      icon: Target,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-l-indigo-500",
    },
    {
      title: "Clientes Nuevos (Mes)",
      value: formatNumber(clientsData?.newThisMonth),
      icon: TrendingUp,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
      borderColor: "border-l-pink-500",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Business Intelligence - Métricas en tiempo real de todos los módulos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="gap-1">
            <Calendar className="h-3 w-3" />
            {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
          </Badge>

          <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar Excel
          </Button>

          <Button onClick={handleRefresh} disabled={loading || refreshing} className="gap-2">
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

      {/* Alertas y Anomalías - Prominente en la parte superior */}
      {alertsData && alertsData.alerts && alertsData.alerts.length > 0 && (
        <Card className="border-l-4 border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-600 animate-pulse" />
                Alertas del Sistema
                <Badge variant="outline" className="ml-2">
                  {alertsData.summary?.total || 0} alertas
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge className={alertsData.summary?.healthScore >= 80 ? "bg-green-500" : alertsData.summary?.healthScore >= 50 ? "bg-yellow-500" : "bg-red-500"}>
                  <Shield className="h-3 w-3 mr-1" />
                  Salud: {alertsData.summary?.healthScore || 0}%
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {alertsData.alerts.slice(0, 6).map((alert: any, index: number) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    alert.type === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                    alert.type === 'success' ? 'bg-green-50 border-green-200' :
                    'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {alert.type === 'warning' ? (
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    ) : alert.type === 'success' ? (
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {alert.category}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            alert.severity === 'high' ? 'border-red-300 text-red-600' :
                            alert.severity === 'medium' ? 'border-yellow-300 text-yellow-600' :
                            'border-gray-300 text-gray-600'
                          }`}
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {alertsData.alerts.length > 6 && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                +{alertsData.alerts.length - 6} alertas más
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* KPI Cards - 8 tarjetas */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {kpiCards.map((kpi, index) => (
          <Card key={index} className={`hover:shadow-lg transition-all duration-200 border-l-4 ${kpi.borderColor}`}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                <div className={`p-2 rounded-lg ${kpi.bgColor} w-fit`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground truncate">{kpi.title}</p>
                  {loading ? (
                    <Skeleton className="h-6 w-16 mt-1" />
                  ) : (
                    <p className="text-lg font-bold truncate">{kpi.value}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Overview - Grande */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Tendencia de Ingresos
              </CardTitle>
              <CardDescription>Últimos 30 días - Revenue y transacciones</CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">{formatCurrency(revenue?.total)}</p>
              <p className="text-xs text-muted-foreground">Total del período</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[350px] w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={combinedTimelineData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(val) => val?.slice(5) || ''} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(val) => formatCompact(val)} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === "amount" ? formatCurrency(value) : value,
                    name === "amount" ? "Ingresos" : "Transacciones"
                  ]}
                  labelFormatter={(label) => `Fecha: ${label}`}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="amount"
                  name="Ingresos"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  name="Transacciones"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Grid de 3 columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribución por Módulo - Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChart className="h-5 w-5 text-purple-600" />
              Distribución por Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPie>
                  <Pie
                    data={revenueByModuleData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {revenueByModuleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </RechartsPie>
              </ResponsiveContainer>
            )}
            <div className="grid grid-cols-2 gap-2 mt-4">
              {revenueByModuleData.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comparativa de Módulos - Barras */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-green-600" />
              Revenue por Módulo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueByModuleData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(val) => formatCompact(val)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
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

        {/* Eficiencia Radial */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-5 w-5 text-indigo-600" />
              Tasas de Completación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="30%" outerRadius="90%" data={efficiencyData} startAngle={90} endAngle={-270}>
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={5}
                    label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
                  />
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend iconSize={10} layout="horizontal" verticalAlign="bottom" />
                </RadialBarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Módulos Detallados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Resumen por Módulo
          </CardTitle>
          <CardDescription>Estadísticas detalladas de cada módulo operativo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modulesTotals.map((module, index) => {
              const ModuleIcon = module.icon
              const percentage = totalModuleRevenue > 0 ? (module.revenue / totalModuleRevenue) * 100 : 0
              return (
                <div key={index} className="p-4 rounded-lg border bg-gradient-to-br from-white to-gray-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: `${module.color}15` }}>
                      <ModuleIcon className="h-5 w-5" style={{ color: module.color }} />
                    </div>
                    <div>
                      <p className="font-semibold">{module.name}</p>
                      <p className="text-xs text-muted-foreground">{percentage.toFixed(1)}% del total</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Revenue</span>
                      <span className="font-bold text-green-600">{formatCurrency(module.revenue)}</span>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="font-bold">{formatNumber(module.records)}</p>
                        <p className="text-xs text-muted-foreground">Registros</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="font-bold">{formatNumber(module.invoices)}</p>
                        <p className="text-xs text-muted-foreground">Facturas</p>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%`, backgroundColor: module.color }}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs con más detalle */}
      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList className="grid grid-cols-5 w-full max-w-3xl">
          <TabsTrigger value="clients">Clientes</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="monthly">Mensual</TabsTrigger>
          <TabsTrigger value="status">Estados</TabsTrigger>
          <TabsTrigger value="performance">Rendimiento</TabsTrigger>
        </TabsList>

        {/* Tab Clientes */}
        <TabsContent value="clients">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Stats Cards */}
            <div className="lg:col-span-4 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-xl">
                      <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-blue-600">{formatNumber(clientsData?.total)}</p>
                      <p className="text-sm text-muted-foreground">Total Clientes</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-xl">
                      <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-green-600">{formatNumber(clientsData?.totalActive)}</p>
                      <p className="text-sm text-muted-foreground">Activos</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl">
                      <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-purple-600">{formatNumber(clientsData?.newThisMonth)}</p>
                      <p className="text-sm text-muted-foreground">Nuevos (Mes)</p>
                    </div>
                    <div className="text-center p-4 bg-gray-100 rounded-xl">
                      <XCircle className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                      <p className="text-3xl font-bold text-gray-600">{formatNumber(clientsData?.inactive)}</p>
                      <p className="text-sm text-muted-foreground">Inactivos</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Clientes por tipo */}
              {clientsData?.byType && Object.keys(clientsData.byType).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Por Tipo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(clientsData.byType).map(([type, count], index) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                            <span className="text-sm capitalize">{type || 'Sin tipo'}</span>
                          </div>
                          <Badge variant="secondary">{formatNumber(count as number)}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Top Clientes */}
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top 10 Clientes por Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Facturas</TableHead>
                        <TableHead className="text-right">Promedio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(clientsData?.topByRevenue || []).slice(0, 10).map((client: any, index: number) => {
                        const avg = client.invoiceCount > 0 ? client.totalRevenue / client.invoiceCount : 0
                        return (
                          <TableRow key={index}>
                            <TableCell>
                              <Badge variant={index < 3 ? "default" : "outline"}>
                                {index + 1}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{client._id || "N/A"}</TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(client.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right">{client.invoiceCount}</TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(avg)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Facturas */}
        <TabsContent value="invoices">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Estado de Facturas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Estado de Facturas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="flex items-center gap-3">
                    <Clock className="h-10 w-10 text-yellow-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Prefacturas</p>
                      <p className="text-2xl font-bold text-yellow-600">{formatNumber(invoicesData?.pending)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-300">Pendiente</Badge>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Facturadas</p>
                      <p className="text-2xl font-bold text-green-600">{formatNumber(invoicesData?.completed)}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-300">Completado</Badge>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-10 w-10 text-blue-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Total</p>
                      <p className="text-2xl font-bold text-blue-600">{formatCurrency(invoicesData?.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-10 w-10 text-purple-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">Total Facturas</p>
                      <p className="text-2xl font-bold text-purple-600">{formatNumber(invoicesData?.total)}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Gráfico de facturas por día */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Actividad Diaria (30 días)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={invoicesByDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(val) => val?.slice(5) || ''} angle={-45} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === "amount" ? formatCurrency(value) : value,
                        name === "amount" ? "Monto" : "Cantidad"
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
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
              <CardDescription>Histórico de ingresos y transacciones por mes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Tabla */}
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Período</TableHead>
                        <TableHead className="text-right">Ingresos</TableHead>
                        <TableHead className="text-right">Transacciones</TableHead>
                        <TableHead className="text-right">Promedio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(monthlyData || []).map((item: any, index: number) => {
                        const monthName = months.find((m) => m.value === item.month?.toString())?.label || item.month
                        const average = item.count > 0 ? item.amount / item.count : 0
                        return (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {monthName} {item.year}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-green-600">
                              {formatCurrency(item.amount)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge variant="outline">{formatNumber(item.count)}</Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {formatCurrency(average)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Gráfico */}
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart
                    data={monthlyData.map((item: any) => ({
                      name: `${months.find(m => m.value === item.month?.toString())?.label?.slice(0, 3) || item.month} ${item.year?.toString().slice(2)}`,
                      ingresos: item.amount,
                      transacciones: item.count,
                    })).reverse()}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="left" tickFormatter={(val) => formatCompact(val)} tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number, name: string) => [
                      name === "ingresos" ? formatCurrency(value) : value,
                      name === "ingresos" ? "Ingresos" : "Transacciones"
                    ]} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="transacciones" name="Transacciones" stroke="#f59e0b" strokeWidth={2} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Estados */}
        <TabsContent value="status">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución de Estados</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={invoiceStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {invoiceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Facturas por Módulo</CardTitle>
              </CardHeader>
              <CardContent>
                {invoicesData?.byModule && (
                  <div className="space-y-4">
                    {Object.entries(invoicesData.byModule).map(([module, data]: [string, any], index) => (
                      <div key={module} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium capitalize">{module}</span>
                          <Badge>{formatNumber(data.count)} facturas</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Monto total</span>
                          <span className="font-bold text-green-600">{formatCurrency(data.amount)}</span>
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(data.amount / (invoicesData.totalAmount || 1)) * 100}%`,
                              backgroundColor: MODULE_COLORS[module] || COLORS[index]
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab Rendimiento */}
        <TabsContent value="performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-orange-600" />
                  Métricas Operacionales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    { name: "Tasa General de Completación", value: operational?.overallCompletionRate, color: "bg-blue-500" },
                    { name: "Eficiencia PTG/Trucking", value: operational?.truckingEfficiency, color: "bg-indigo-500" },
                    { name: "Eficiencia PTYSS", value: operational?.ptyssEfficiency, color: "bg-purple-500" },
                    { name: "Eficiencia ShipChandler", value: operational?.shipchandlerEfficiency, color: "bg-teal-500" },
                    { name: "Eficiencia Agency", value: operational?.agencyEfficiency, color: "bg-amber-500" },
                  ].map((metric, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{metric.name}</span>
                        <span className="text-lg font-bold">{formatPercent(metric.value)}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${metric.color} rounded-full transition-all duration-700`}
                          style={{ width: `${(metric.value || 0) * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Totales del Sistema</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white">
                    <FileText className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{formatNumber(operational?.totals?.invoices)}</p>
                    <p className="text-sm opacity-80">Facturas Totales</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white">
                    <CheckCircle className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{formatNumber(operational?.totals?.completed)}</p>
                    <p className="text-sm opacity-80">Completadas</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white">
                    <Globe className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{formatNumber(operational?.totals?.agencyServices)}</p>
                    <p className="text-sm opacity-80">Servicios Agency</p>
                  </div>
                  <div className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white">
                    <Zap className="h-8 w-8 mb-2 opacity-80" />
                    <p className="text-3xl font-bold">{operational?.averageProcessingTime || 0}h</p>
                    <p className="text-sm opacity-80">Tiempo Promedio</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Sección Avanzada */}
      {advanced && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-yellow-500" />
            Análisis Avanzado
          </h2>

          {/* Comparaciones de crecimiento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Mes vs Mes anterior */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-blue-700">Este Mes vs Anterior</span>
                  <Badge variant={advanced.comparisons?.monthOverMonthGrowth >= 0 ? "default" : "destructive"} className="gap-1">
                    {advanced.comparisons?.monthOverMonthGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(advanced.comparisons?.monthOverMonthGrowth || 0).toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Este mes</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(advanced.comparisons?.thisMonth?.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{advanced.comparisons?.thisMonth?.count} transacciones</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mes anterior</p>
                    <p className="text-xl font-bold text-blue-500">{formatCurrency(advanced.comparisons?.lastMonth?.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{advanced.comparisons?.lastMonth?.count} transacciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Semana vs Semana anterior */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-green-700">Esta Semana vs Anterior</span>
                  <Badge variant={advanced.comparisons?.weekOverWeekGrowth >= 0 ? "default" : "destructive"} className="gap-1">
                    {advanced.comparisons?.weekOverWeekGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(advanced.comparisons?.weekOverWeekGrowth || 0).toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Esta semana</p>
                    <p className="text-xl font-bold text-green-700">{formatCurrency(advanced.comparisons?.thisWeek?.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{advanced.comparisons?.thisWeek?.count} transacciones</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Semana anterior</p>
                    <p className="text-xl font-bold text-green-500">{formatCurrency(advanced.comparisons?.lastWeek?.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{advanced.comparisons?.lastWeek?.count} transacciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Año vs Año anterior */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-purple-700">Este Año vs Anterior</span>
                  <Badge variant={advanced.comparisons?.yearOverYearGrowth >= 0 ? "default" : "destructive"} className="gap-1">
                    {advanced.comparisons?.yearOverYearGrowth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(advanced.comparisons?.yearOverYearGrowth || 0).toFixed(1)}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Este año</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(advanced.comparisons?.thisYear?.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{advanced.comparisons?.thisYear?.count} transacciones</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Año anterior</p>
                    <p className="text-xl font-bold text-purple-500">{formatCurrency(advanced.comparisons?.lastYear?.revenue)}</p>
                    <p className="text-xs text-muted-foreground">{advanced.comparisons?.lastYear?.count} transacciones</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Estadísticas de Ticket */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <DollarSign className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{formatCurrency(advanced.ticketStats?.average)}</p>
                <p className="text-xs text-muted-foreground">Ticket Promedio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <ArrowUpRight className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold">{formatCurrency(advanced.ticketStats?.max)}</p>
                <p className="text-xs text-muted-foreground">Ticket Máximo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <ArrowDownRight className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <p className="text-2xl font-bold">{formatCurrency(advanced.ticketStats?.min)}</p>
                <p className="text-xs text-muted-foreground">Ticket Mínimo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Receipt className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold">{formatNumber(advanced.ticketStats?.count)}</p>
                <p className="text-xs text-muted-foreground">Total Facturas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <CreditCard className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                <p className="text-2xl font-bold">{formatCurrency(advanced.ticketStats?.total)}</p>
                <p className="text-xs text-muted-foreground">Revenue Total</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Actividad por Hora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Actividad por Hora del Día
                </CardTitle>
                <CardDescription>Distribución de facturación en 24 horas</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={advanced.activityByHour || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={(h) => `${h}h`} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value: number, name: string) => [name === "amount" ? formatCurrency(value) : value, name === "amount" ? "Monto" : "Cantidad"]} labelFormatter={(h) => `Hora: ${h}:00`} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Actividad por Día de la Semana */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Actividad por Día de la Semana
                </CardTitle>
                <CardDescription>Distribución semanal de facturación</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={advanced.activityByDayOfWeek || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="dayName" tick={{ fontSize: 11 }} width={40} />
                    <Tooltip formatter={(value: number, name: string) => [name === "amount" ? formatCurrency(value) : value, name === "amount" ? "Monto" : "Cantidad"]} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clientes del Mes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top Clientes Este Mes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(advanced.topClientsThisMonth || []).map((client, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Badge variant={index === 0 ? "default" : "outline"} className="w-6 h-6 rounded-full p-0 justify-center">
                          {index + 1}
                        </Badge>
                        <span className="font-medium truncate max-w-[200px]">{client.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-600">{formatCurrency(client.revenue)}</p>
                        <p className="text-xs text-muted-foreground">{client.count} facturas</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Últimas Transacciones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-5 w-5 text-green-600" />
                  Últimas Transacciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {(advanced.recentTransactions || []).map((tx, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tx.invoiceNumber || 'Sin número'}</span>
                            <Badge variant="outline" className="text-xs">{tx.module}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.client}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(tx.amount)}</p>
                          <Badge variant={tx.status === 'facturada' ? 'default' : 'secondary'} className="text-xs">
                            {tx.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Crecimiento de Clientes */}
          {advanced.clientGrowth && advanced.clientGrowth.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-indigo-600" />
                  Crecimiento de Clientes (12 meses)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={advanced.clientGrowth.map((c: any) => ({
                    name: `${months.find(m => m.value === c.month?.toString())?.label?.slice(0, 3) || c.month}`,
                    clientes: c.count
                  }))}>
                    <defs>
                      <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="clientes" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorClients)" name="Nuevos Clientes" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Predicciones y Forecasting */}
      {forecasting && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-500" />
            Predicciones y Forecasting
          </h2>

          {/* Métricas de predicción */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6 text-center">
                <Target className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <p className="text-2xl font-bold text-purple-700">{formatCurrency(forecasting.nextMonthPrediction)}</p>
                <p className="text-xs text-muted-foreground">Predicción Próximo Mes</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200">
              <CardContent className="pt-6 text-center">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-indigo-600" />
                <p className="text-2xl font-bold text-indigo-700">{formatCurrency(forecasting.nextQuarterPrediction)}</p>
                <p className="text-xs text-muted-foreground">Predicción Próximo Trimestre</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold text-green-700">{forecasting.averageGrowth?.toFixed(1) || 0}%</p>
                <p className="text-xs text-muted-foreground">Crecimiento Promedio Mensual</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6 text-center">
                <Shield className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <p className="text-2xl font-bold text-blue-700">{((forecasting.confidence || 0) * 100).toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Confianza del Modelo</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de tendencia y predicción */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Tendencia Histórica y Proyección
              </CardTitle>
              <CardDescription>
                Datos históricos con línea de tendencia y predicción a 3 meses
                {forecasting.trend && (
                  <Badge className="ml-2" variant={forecasting.trend.direction === 'upward' ? 'default' : forecasting.trend.direction === 'downward' ? 'destructive' : 'secondary'}>
                    {forecasting.trend.direction === 'upward' ? '↑ Tendencia alcista' : forecasting.trend.direction === 'downward' ? '↓ Tendencia bajista' : '→ Estable'}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart
                  data={[
                    ...(forecasting.historical || []).map((h: any) => ({
                      name: `${months.find(m => m.value === h.month?.toString())?.label?.slice(0, 3) || h.month} ${h.year?.toString().slice(2)}`,
                      revenue: h.revenue,
                      trendLine: h.trendLine,
                      type: 'historical'
                    })),
                    ...(forecasting.forecast || []).map((f: any) => ({
                      name: `${months.find(m => m.value === f.month?.toString())?.label?.slice(0, 3) || f.month} ${f.year?.toString().slice(2)}`,
                      predicted: f.predictedRevenue,
                      type: 'forecast'
                    }))
                  ]}
                >
                  <defs>
                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => formatCompact(val)} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue Real" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="predicted" name="Predicción" fill="#8b5cf6" radius={[4, 4, 0, 0]} opacity={0.7} />
                  <Line type="monotone" dataKey="trendLine" name="Línea de Tendencia" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Estacionalidad */}
          {forecasting.seasonality && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-green-100 rounded-full">
                      <ArrowUpRight className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mejor Mes (Histórico)</p>
                      <p className="text-xl font-bold text-green-700">
                        {months.find(m => m.value === forecasting.seasonality.bestMonth?.month?.toString())?.label || 'N/A'}
                      </p>
                      <p className="text-sm text-green-600">{formatCurrency(forecasting.seasonality.bestMonth?.y)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-orange-100 rounded-full">
                      <ArrowDownRight className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Mes Más Bajo (Histórico)</p>
                      <p className="text-xl font-bold text-orange-700">
                        {months.find(m => m.value === forecasting.seasonality.worstMonth?.month?.toString())?.label || 'N/A'}
                      </p>
                      <p className="text-sm text-orange-600">{formatCurrency(forecasting.seasonality.worstMonth?.y)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Comparativa Detallada de Módulos */}
      {moduleComparison && moduleComparison.modules && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Comparativa Detallada de Módulos
          </h2>

          {/* Rankings rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
              <CardContent className="pt-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                <p className="text-xs text-muted-foreground">Mayor Revenue</p>
                <p className="font-bold text-yellow-700 uppercase">{moduleComparison.rankings?.byRevenue?.[0]?.module || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="pt-4 text-center">
                <Medal className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-xs text-muted-foreground">Mayor Volumen</p>
                <p className="font-bold text-blue-700 uppercase">{moduleComparison.rankings?.byVolume?.[0]?.module || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-4 text-center">
                <Flame className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-xs text-muted-foreground">Mayor Crecimiento</p>
                <p className="font-bold text-green-700 uppercase">{moduleComparison.rankings?.byGrowth?.[0]?.module || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="pt-4 text-center">
                <Crown className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-xs text-muted-foreground">Mayor Ticket Promedio</p>
                <p className="font-bold text-purple-700 uppercase">{moduleComparison.rankings?.byAvgTicket?.[0]?.module || 'N/A'}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla comparativa detallada */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Métricas Detalladas por Módulo (Este Mes)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Módulo</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Facturas</TableHead>
                      <TableHead className="text-right">Ticket Prom.</TableHead>
                      <TableHead className="text-right">Completación</TableHead>
                      <TableHead className="text-right">Clientes</TableHead>
                      <TableHead className="text-right">Crecimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moduleComparison.modules.map((mod: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: MODULE_COLORS[mod.module] || '#666' }} />
                            <span className="uppercase">{mod.module}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(mod.thisMonth?.revenue)}
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(mod.thisMonth?.count)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(mod.thisMonth?.avgTicket)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={mod.thisMonth?.completionRate >= 80 ? "default" : mod.thisMonth?.completionRate >= 50 ? "secondary" : "destructive"}>
                            {mod.thisMonth?.completionRate?.toFixed(0) || 0}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(mod.uniqueClients)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={mod.growth >= 0 ? "default" : "destructive"} className="gap-1">
                            {mod.growth >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(mod.growth || 0).toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico comparativo de módulos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue por Módulo (Este vs Anterior)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={moduleComparison.modules.map((mod: any) => ({
                      name: mod.module?.toUpperCase(),
                      'Este Mes': mod.thisMonth?.revenue || 0,
                      'Mes Anterior': mod.lastMonth?.revenue || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => formatCompact(val)} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Este Mes" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Mes Anterior" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Crecimiento por Módulo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={moduleComparison.modules.map((mod: any) => ({
                      name: mod.module?.toUpperCase(),
                      growth: mod.growth || 0,
                      fill: mod.growth >= 0 ? '#22c55e' : '#ef4444'
                    }))}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(val) => `${val}%`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="growth" radius={[0, 4, 4, 0]}>
                      {moduleComparison.modules.map((mod: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={mod.growth >= 0 ? '#22c55e' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Rankings de Eficiencia */}
      {efficiencyRankings && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="h-6 w-6 text-yellow-500" />
            Rankings de Eficiencia
          </h2>

          {/* Resumen de Rankings */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
              <CardContent className="pt-4 text-center">
                <Crown className="h-6 w-6 mx-auto mb-2 text-yellow-600" />
                <p className="text-xs text-muted-foreground">Top Cliente</p>
                <p className="font-bold text-yellow-700 truncate">{efficiencyRankings.summary?.topClient || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="pt-4 text-center">
                <Star className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <p className="text-xs text-muted-foreground">Top Módulo</p>
                <p className="font-bold text-blue-700 uppercase">{efficiencyRankings.summary?.topModule || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="pt-4 text-center">
                <Calendar className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <p className="text-xs text-muted-foreground">Mejor Día</p>
                <p className="font-bold text-green-700">{efficiencyRankings.summary?.bestDay || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
              <CardContent className="pt-4 text-center">
                <Clock className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <p className="text-xs text-muted-foreground">Mejor Hora</p>
                <p className="font-bold text-purple-700">{efficiencyRankings.summary?.bestHour || 'N/A'}</p>
              </CardContent>
            </Card>
            <Card className={`bg-gradient-to-br ${efficiencyRankings.summary?.clientsAtRisk > 0 ? 'from-red-50 to-orange-50 border-red-200' : 'from-green-50 to-emerald-50 border-green-200'}`}>
              <CardContent className="pt-4 text-center">
                <AlertTriangle className={`h-6 w-6 mx-auto mb-2 ${efficiencyRankings.summary?.clientsAtRisk > 0 ? 'text-red-600' : 'text-green-600'}`} />
                <p className="text-xs text-muted-foreground">Clientes en Riesgo</p>
                <p className={`font-bold ${efficiencyRankings.summary?.clientsAtRisk > 0 ? 'text-red-700' : 'text-green-700'}`}>{efficiencyRankings.summary?.clientsAtRisk || 0}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clientes Rentables */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-5 w-5 text-yellow-500" />
                  Top 10 Clientes Más Rentables
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[350px]">
                  <div className="space-y-2">
                    {(efficiencyRankings.clients || []).slice(0, 10).map((client: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Badge
                            className={`w-6 h-6 rounded-full p-0 justify-center ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-amber-600' : ''
                            }`}
                            variant={index < 3 ? 'default' : 'outline'}
                          >
                            {index + 1}
                          </Badge>
                          <div>
                            <p className="font-medium text-sm truncate max-w-[150px]">{client.name}</p>
                            <div className="flex gap-1 mt-1">
                              {client.modules?.slice(0, 2).map((mod: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs py-0">{mod}</Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{formatCurrency(client.revenue)}</p>
                          <p className="text-xs text-muted-foreground">{client.invoices} facturas</p>
                          <Badge variant={client.growth >= 0 ? "default" : "destructive"} className="text-xs mt-1">
                            {client.growth >= 0 ? '+' : ''}{client.growth?.toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Clientes en Riesgo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Clientes en Riesgo (Decrecimiento)
                </CardTitle>
                <CardDescription>Clientes con facturación decreciente significativa</CardDescription>
              </CardHeader>
              <CardContent>
                {efficiencyRankings.atRisk && efficiencyRankings.atRisk.length > 0 ? (
                  <ScrollArea className="h-[350px]">
                    <div className="space-y-2">
                      {efficiencyRankings.atRisk.map((client: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                          <div>
                            <p className="font-medium text-sm truncate max-w-[180px]">{client.name}</p>
                            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                              <span>Anterior: {formatCurrency(client.previous)}</span>
                              <span>→</span>
                              <span>Actual: {formatCurrency(client.current)}</span>
                            </div>
                          </div>
                          <Badge variant="destructive" className="gap-1">
                            <ArrowDownRight className="h-3 w-3" />
                            {Math.abs(client.growth).toFixed(0)}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px] text-green-600">
                    <CheckCircle className="h-12 w-12 mb-2" />
                    <p className="font-medium">Sin clientes en riesgo</p>
                    <p className="text-sm text-muted-foreground">Todos los clientes mantienen actividad estable</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gráficos de productividad */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Por día de la semana */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-5 w-5 text-green-600" />
                  Revenue por Día de la Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={efficiencyRankings.days || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(val) => formatCompact(val)} />
                    <Tooltip formatter={(value: number, name: string) => [name === "revenue" ? formatCurrency(value) : value, name === "revenue" ? "Revenue" : "Transacciones"]} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[4, 4, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Por hora */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-purple-600" />
                  Top 10 Horas Más Productivas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={efficiencyRankings.hours || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(val) => formatCompact(val)} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Clientes con mayor crecimiento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Flame className="h-5 w-5 text-orange-500" />
                Clientes con Mayor Crecimiento
              </CardTitle>
              <CardDescription>Comparación últimos 30 días vs 30 días anteriores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {(efficiencyRankings.growth || []).slice(0, 10).map((client: any, index: number) => (
                  <div key={index} className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-green-500">{index + 1}</Badge>
                      <p className="font-medium text-sm truncate">{client.name}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual:</span>
                        <span className="font-bold text-green-600">{formatCurrency(client.current)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Anterior:</span>
                        <span>{formatCurrency(client.previous)}</span>
                      </div>
                      <div className="flex justify-center mt-2">
                        <Badge variant="default" className="bg-green-500 gap-1">
                          <ArrowUpRight className="h-3 w-3" />
                          +{client.growth?.toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-sm text-muted-foreground border-t pt-4 gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Última actualización: {lastFetched ? new Date(lastFetched).toLocaleString('es-ES') : "Nunca"}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Sistema en línea</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Datos en tiempo real
          </div>
        </div>
      </div>
    </div>
  )
}
