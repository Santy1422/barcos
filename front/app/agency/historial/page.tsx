'use client';

import { useState, useEffect } from 'react';
import { useAgencyServices } from '@/lib/features/agencyServices/useAgencyServices';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, History, Search, Filter, Download, Eye, FileText } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

export default function AgencyHistorialPage() {
  const {
    services,
    loading,
    totalServices,
    currentPage,
    totalPages,
    fetchServices,
    setFilters,
    clearFilters,
    openViewModal
  } = useAgencyServices();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    // Load initial data
    fetchServices({ page: 1, limit: 20 });
  }, [fetchServices]);

  useEffect(() => {
    // Apply filters
    const filterObj: any = {};
    
    if (searchTerm) {
      filterObj.search = searchTerm;
    }
    if (statusFilter !== 'all') {
      filterObj.status = statusFilter;
    }
    
    // Handle date range filters
    const now = new Date();
    let start = '';
    let end = '';
    
    switch (dateRange) {
      case 'today':
        start = format(now, 'yyyy-MM-dd');
        end = format(now, 'yyyy-MM-dd');
        break;
      case 'thisMonth':
        start = format(startOfMonth(now), 'yyyy-MM-dd');
        end = format(endOfMonth(now), 'yyyy-MM-dd');
        break;
      case 'thisYear':
        start = format(startOfYear(now), 'yyyy-MM-dd');
        end = format(endOfYear(now), 'yyyy-MM-dd');
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
    }
    
    if (start && end) {
      filterObj.startDate = start;
      filterObj.endDate = end;
    }

    setFilters(filterObj);
    fetchServices({ page: 1, limit: 20, filters: filterObj });
  }, [searchTerm, statusFilter, dateRange, startDate, endDate, setFilters, fetchServices]);

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
    clearFilters();
    fetchServices({ page: 1, limit: 20 });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'prefacturado':
        return <Badge className="bg-purple-100 text-purple-800">Pre-invoiced</Badge>;
      case 'facturado':
        return <Badge className="bg-gray-100 text-gray-800">Invoiced</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handlePageChange = (page: number) => {
    fetchServices({ page, limit: 20 });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <History className="h-6 w-6 text-white" />
            </div>
            Agency History
          </h1>
          <p className="text-muted-foreground mt-1">View complete service history and records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export History
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{totalServices}</div>
              <p className="text-xs text-muted-foreground">Total Services</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {services.filter(s => s.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {services.filter(s => s.status === 'in_progress').length}
              </div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {services.filter(s => s.status === 'completed').length}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {services.filter(s => s.status === 'facturado').length}
              </div>
              <p className="text-xs text-muted-foreground">Invoiced</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search services..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="prefacturado">Pre-invoiced</SelectItem>
                <SelectItem value="facturado">Invoiced</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {/* Custom Date Range */}
            {dateRange === 'custom' && (
              <>
                <Input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <Input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </>
            )}

            {/* Clear Filters */}
            <Button variant="outline" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Service History ({services.length} of {totalServices})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service Date</TableHead>
                    <TableHead>Crew Member</TableHead>
                    <TableHead>Vessel</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {services.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="text-muted-foreground">
                          <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No service history found</p>
                          <p className="text-sm">Try adjusting your filters</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    services.map((service) => (
                      <TableRow key={service._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {format(new Date(service.pickupDate), 'MMM dd, yyyy')}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {service.pickupTime}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">{service.crewName}</div>
                            {service.crewRank && (
                              <div className="text-sm text-muted-foreground">
                                {service.crewRank}
                              </div>
                            )}
                            {service.nationality && (
                              <div className="text-xs text-muted-foreground">
                                {service.nationality}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">{service.vessel}</div>
                          {service.voyage && (
                            <div className="text-sm text-muted-foreground">
                              V. {service.voyage}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            {service.pickupLocation}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            → {service.dropoffLocation}
                          </div>
                          {service.transportCompany && (
                            <div className="text-xs text-muted-foreground">
                              via {service.transportCompany}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>
                          {getStatusBadge(service.status)}
                        </TableCell>

                        <TableCell>
                          {service.price ? (
                            <div className="font-medium text-green-600">
                              ${service.price}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(service.createdAt), 'MMM dd')}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openViewModal(service._id)}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            {service.attachments && service.attachments.length > 0 && (
                              <Button size="sm" variant="ghost">
                                <FileText className="h-3 w-3" />
                                <span className="ml-1 text-xs">
                                  {service.attachments.length}
                                </span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}