'use client';

import { useState, useEffect } from 'react';
import { useAgencyServices, useAgencyServicesStatistics } from '@/lib/features/agencyServices/useAgencyServices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { BarChart, PieChart, TrendingUp, Download, Calendar, DollarSign, Users, Ship } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';

export default function AgencyReportsPage() {
  const { services, fetchServices } = useAgencyServices();
  const { statistics, fetchStatistics } = useAgencyServicesStatistics();

  const [dateRange, setDateRange] = useState('thisMonth');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('overview');

  useEffect(() => {
    // Set default date range
    const now = new Date();
    const start = format(startOfMonth(now), 'yyyy-MM-dd');
    const end = format(endOfMonth(now), 'yyyy-MM-dd');
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      fetchServices({ 
        page: 1, 
        limit: 1000, 
        filters: { startDate, endDate } 
      });
      fetchStatistics({ startDate, endDate });
    }
  }, [startDate, endDate, fetchServices, fetchStatistics]);

  const handleDateRangeChange = (range: string) => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (range) {
      case 'today':
        start = format(now, 'yyyy-MM-dd');
        end = format(now, 'yyyy-MM-dd');
        break;
      case 'thisWeek':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        start = format(startOfWeek, 'yyyy-MM-dd');
        end = format(now, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        start = format(startOfMonth(now), 'yyyy-MM-dd');
        end = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        start = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
        end = format(endOfMonth(lastMonth), 'yyyy-MM-dd');
        break;
      case 'thisYear':
        start = format(startOfYear(now), 'yyyy-MM-dd');
        end = format(endOfYear(now), 'yyyy-MM-dd');
        break;
      case 'custom':
        return;
    }

    setDateRange(range);
    setStartDate(start);
    setEndDate(end);
  };

  const calculateMetrics = () => {
    const totalServices = services.length;
    const totalRevenue = services.reduce((sum, service) => sum + (service.price || 0), 0);
    const avgServiceValue = totalServices > 0 ? totalRevenue / totalServices : 0;

    const statusCounts = {
      pending: services.filter(s => s.status === 'pending').length,
      in_progress: services.filter(s => s.status === 'in_progress').length,
      completed: services.filter(s => s.status === 'completed').length,
      prefacturado: services.filter(s => s.status === 'prefacturado').length,
      facturado: services.filter(s => s.status === 'facturado').length,
    };

    // Top routes
    const routeCounts: Record<string, number> = {};
    services.forEach(service => {
      const route = `${service.pickupLocation} → ${service.dropoffLocation}`;
      routeCounts[route] = (routeCounts[route] || 0) + 1;
    });
    const topRoutes = Object.entries(routeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Top vessels
    const vesselCounts: Record<string, number> = {};
    services.forEach(service => {
      vesselCounts[service.vessel] = (vesselCounts[service.vessel] || 0) + 1;
    });
    const topVessels = Object.entries(vesselCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    // Daily service count
    const dailyCounts: Record<string, number> = {};
    services.forEach(service => {
      const date = format(new Date(service.pickupDate), 'yyyy-MM-dd');
      dailyCounts[date] = (dailyCounts[date] || 0) + 1;
    });

    return {
      totalServices,
      totalRevenue,
      avgServiceValue,
      statusCounts,
      topRoutes,
      topVessels,
      dailyCounts,
    };
  };

  const metrics = calculateMetrics();

  const exportReport = () => {
    const csvData = services.map(service => ({
      Date: format(new Date(service.pickupDate), 'yyyy-MM-dd'),
      Time: service.pickupTime,
      Crew: service.crewName,
      Rank: service.crewRank || '',
      Vessel: service.vessel,
      Voyage: service.voyage || '',
      'Pickup Location': service.pickupLocation,
      'Dropoff Location': service.dropoffLocation,
      'Transport Company': service.transportCompany || '',
      Driver: service.driverName || '',
      Status: service.status,
      Price: service.price || 0,
      Currency: service.currency,
      'Created At': format(new Date(service.createdAt), 'yyyy-MM-dd HH:mm'),
    }));

    const csvContent = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agency-report-${startDate}-to-${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500 flex items-center justify-center">
              <BarChart className="h-6 w-6 text-white" />
            </div>
            Agency Reports
          </h1>
          <p className="text-muted-foreground mt-1">Analytics and insights for transportation services</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Type</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Overview</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="thisWeek">This Week</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Services</p>
                <p className="text-2xl font-bold">{metrics.totalServices}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(startDate), 'MMM dd')} - {format(new Date(endDate), 'MMM dd')}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  Avg: ${metrics.avgServiceValue.toFixed(0)} per service
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                <p className="text-2xl font-bold">
                  {metrics.totalServices > 0 
                    ? Math.round(((metrics.statusCounts.completed + metrics.statusCounts.facturado) / metrics.totalServices) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {metrics.statusCounts.completed + metrics.statusCounts.facturado} completed
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Vessels</p>
                <p className="text-2xl font-bold">{Object.keys(metrics.topVessels).length}</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.topVessels[0]?.[0] || 'N/A'} (top)
                </p>
              </div>
              <Ship className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Service Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(metrics.statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${
                      status === 'pending' ? 'bg-yellow-500' :
                      status === 'in_progress' ? 'bg-blue-500' :
                      status === 'completed' ? 'bg-green-500' :
                      status === 'prefacturado' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`} />
                    <span className="capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count}</span>
                    <span className="text-sm text-muted-foreground">
                      ({metrics.totalServices > 0 ? Math.round((count / metrics.totalServices) * 100) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Routes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topRoutes.map(([route, count], index) => (
                <div key={route} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="text-sm">{route}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count}</span>
                    <span className="text-sm text-muted-foreground">services</span>
                  </div>
                </div>
              ))}
              {metrics.topRoutes.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No route data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Vessels and Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Vessels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topVessels.map(([vessel, count], index) => (
                <div key={vessel} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <span className="text-sm font-medium">{vessel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{count}</span>
                    <span className="text-sm text-muted-foreground">services</span>
                  </div>
                </div>
              ))}
              {metrics.topVessels.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No vessel data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm">Completed Services</span>
                <span className="font-medium">
                  ${services
                    .filter(s => s.status === 'completed')
                    .reduce((sum, s) => sum + (s.price || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Invoiced Services</span>
                <span className="font-medium">
                  ${services
                    .filter(s => s.status === 'facturado')
                    .reduce((sum, s) => sum + (s.price || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Pending Revenue</span>
                <span className="font-medium text-orange-600">
                  ${services
                    .filter(s => ['pending', 'in_progress'].includes(s.status))
                    .reduce((sum, s) => sum + (s.price || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <hr />
              <div className="flex justify-between font-semibold">
                <span>Total Revenue</span>
                <span>${metrics.totalRevenue.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Service Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.slice(0, 10).map((service) => (
              <div key={service._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">{service.crewName}</p>
                    <p className="text-sm text-muted-foreground">{service.vessel}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={
                    service.status === 'completed' ? 'bg-green-100 text-green-800' :
                    service.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }>
                    {service.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(service.pickupDate), 'MMM dd')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}