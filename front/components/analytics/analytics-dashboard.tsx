"use client"

import { useEffect, useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  fetchAllAnalytics,
  fetchMetrics,
  fetchRevenue,
  fetchOperational,
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
} from "lucide-react"

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
  const clients = useAppSelector(selectClientsAnalytics)
  const invoices = useAppSelector(selectInvoicesAnalytics)
  const lastFetched = useAppSelector(selectLastFetched)

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    dispatch(fetchAllAnalytics())
  }, [dispatch])

  const handleRefresh = async () => {
    setRefreshing(true)
    await dispatch(fetchAllAnalytics())
    setRefreshing(false)
  }

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return "$0.00"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never"
    return new Date(dateString).toLocaleString()
  }

  // KPI Cards data
  const kpiCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(metrics?.totalRevenue || revenue?.total),
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Total Transactions",
      value: formatNumber(metrics?.totalTransactions),
      icon: TrendingUp,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Active Clients",
      value: formatNumber(metrics?.activeClients || clients?.totalActive),
      icon: Users,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Invoices Created",
      value: formatNumber(metrics?.invoicesCreated || invoices?.total),
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100",
    },
  ]

  // Module cards data
  const moduleCards = [
    {
      title: "PTG (Trucking)",
      data: trucking,
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      title: "PTYSS (Trucking)",
      data: ptyss,
      icon: Ship,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-200",
    },
    {
      title: "ShipChandler",
      data: shipchandler,
      icon: Anchor,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-200",
    },
    {
      title: "Agency",
      data: agency,
      icon: Car,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Data API - Real-time business intelligence
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastFetched && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last updated: {formatDate(lastFetched)}
            </div>
          )}
          <Button
            onClick={handleRefresh}
            disabled={loading || refreshing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
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
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  )}
                </div>
                <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                  <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue by Module */}
      {revenue?.byModule && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue by Module
            </CardTitle>
            <CardDescription>Total revenue breakdown by business module</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { name: "PTG", value: revenue.byModule.trucking, color: "bg-blue-500" },
                { name: "PTYSS", value: revenue.byModule.ptyss, color: "bg-indigo-500" },
                { name: "ShipChandler", value: revenue.byModule.shipchandler, color: "bg-teal-500" },
                { name: "Agency", value: revenue.byModule.agency, color: "bg-amber-500" },
              ].map((module, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{module.name}</span>
                    <span className="text-sm font-bold">{formatCurrency(module.value)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${module.color} rounded-full transition-all`}
                      style={{
                        width: `${revenue.total ? (module.value / revenue.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operational Metrics */}
      {operational && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Operational Metrics
            </CardTitle>
            <CardDescription>Key performance indicators for operations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Overall Completion</span>
                  <span className="text-sm font-bold">
                    {formatPercent(operational.overallCompletionRate)}
                  </span>
                </div>
                <Progress value={(operational.overallCompletionRate || 0) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trucking Efficiency</span>
                  <span className="text-sm font-bold">
                    {formatPercent(operational.truckingEfficiency)}
                  </span>
                </div>
                <Progress value={(operational.truckingEfficiency || 0) * 100} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Agency Efficiency</span>
                  <span className="text-sm font-bold">
                    {formatPercent(operational.agencyEfficiency)}
                  </span>
                </div>
                <Progress value={(operational.agencyEfficiency || 0) * 100} className="h-2" />
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg">
                <Clock className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-muted-foreground">Avg Processing Time</span>
                <span className="text-lg font-bold">
                  {operational.averageProcessingTime?.toFixed(1) || 0} hrs
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Details Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="modules">Modules</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {moduleCards.map((module, index) => (
              <Card
                key={index}
                className={`${module.bgColor} ${module.borderColor} border hover:shadow-md transition-shadow`}
              >
                <CardHeader className="pb-2">
                  <CardTitle className={`text-lg flex items-center gap-2 ${module.color}`}>
                    <module.icon className="h-5 w-5" />
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  ) : module.data ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Records:</span>
                        <span className="font-semibold">
                          {formatNumber(module.data.totalRecords)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Revenue:</span>
                        <span className="font-semibold">
                          {formatCurrency(module.data.totalRevenue)}
                        </span>
                      </div>
                      {module.data.byStatus && (
                        <div className="pt-2 border-t">
                          {Object.entries(module.data.byStatus).map(([status, count]) => (
                            <div key={status} className="flex justify-between text-xs">
                              <span className="capitalize">{status}:</span>
                              <Badge variant="outline" className="text-xs">
                                {formatNumber(count as number)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data available</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="modules">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {moduleCards.map((module, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <module.icon className={`h-5 w-5 ${module.color}`} />
                    {module.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : module.data ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                          <Database className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                          <p className="text-2xl font-bold">
                            {formatNumber(module.data.totalRecords)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Records</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                          <DollarSign className="h-6 w-6 mx-auto text-green-500 mb-1" />
                          <p className="text-2xl font-bold">
                            {formatCurrency(module.data.totalRevenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">Total Revenue</p>
                        </div>
                      </div>
                      {module.data.byStatus && (
                        <div>
                          <p className="text-sm font-medium mb-2">Status Breakdown</p>
                          <div className="space-y-2">
                            {Object.entries(module.data.byStatus).map(([status, count]) => (
                              <div key={status} className="flex items-center gap-2">
                                <div className="flex-1">
                                  <div className="flex justify-between text-sm mb-1">
                                    <span className="capitalize">{status}</span>
                                    <span>{formatNumber(count as number)}</span>
                                  </div>
                                  <Progress
                                    value={
                                      ((count as number) / (module.data?.totalRecords || 1)) * 100
                                    }
                                    className="h-1"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <PieChart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Client Analytics
              </CardTitle>
              <CardDescription>Overview of client data and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : clients ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-blue-50 rounded-lg text-center">
                    <Users className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-3xl font-bold">{formatNumber(clients.total)}</p>
                    <p className="text-sm text-muted-foreground">Total Clients</p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-lg text-center">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-3xl font-bold">{formatNumber(clients.totalActive)}</p>
                    <p className="text-sm text-muted-foreground">Active Clients</p>
                  </div>
                  <div className="p-6 bg-purple-50 rounded-lg text-center">
                    <TrendingUp className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                    <p className="text-3xl font-bold">{formatNumber(clients.newThisMonth)}</p>
                    <p className="text-sm text-muted-foreground">New This Month</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No client data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Analytics
              </CardTitle>
              <CardDescription>Overview of invoice data and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : invoices ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="p-6 bg-blue-50 rounded-lg text-center">
                    <FileText className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                    <p className="text-3xl font-bold">{formatNumber(invoices.total)}</p>
                    <p className="text-sm text-muted-foreground">Total Invoices</p>
                  </div>
                  <div className="p-6 bg-amber-50 rounded-lg text-center">
                    <Clock className="h-8 w-8 mx-auto text-amber-600 mb-2" />
                    <p className="text-3xl font-bold">{formatNumber(invoices.pending)}</p>
                    <p className="text-sm text-muted-foreground">Pending</p>
                  </div>
                  <div className="p-6 bg-green-50 rounded-lg text-center">
                    <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
                    <p className="text-3xl font-bold">{formatNumber(invoices.completed)}</p>
                    <p className="text-sm text-muted-foreground">Completed</p>
                  </div>
                  <div className="p-6 bg-purple-50 rounded-lg text-center">
                    <DollarSign className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                    <p className="text-3xl font-bold">{formatCurrency(invoices.totalAmount)}</p>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No invoice data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* API Endpoints Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            API Endpoints Reference
          </CardTitle>
          <CardDescription>Available analytics endpoints for external integrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { endpoint: "/api/analytics/metrics", description: "KPIs and summary metrics" },
              { endpoint: "/api/analytics/revenue", description: "Revenue data by module" },
              { endpoint: "/api/analytics/operational", description: "Operational efficiency metrics" },
              { endpoint: "/api/analytics/trucking", description: "PTG module analytics" },
              { endpoint: "/api/analytics/ptyss", description: "PTYSS module analytics" },
              { endpoint: "/api/analytics/shipchandler", description: "ShipChandler analytics" },
              { endpoint: "/api/analytics/agency", description: "Agency module analytics" },
              { endpoint: "/api/analytics/clients", description: "Client statistics" },
              { endpoint: "/api/analytics/invoices", description: "Invoice statistics" },
            ].map((item, index) => (
              <div
                key={index}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <code className="text-sm font-mono text-blue-600">{item.endpoint}</code>
                <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Authentication:</strong> Use Bearer token (JWT) or API Key (x-api-key header) for Power BI integration.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
