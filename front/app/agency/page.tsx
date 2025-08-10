'use client';

import { useState, useEffect } from 'react';
import { useAgencyServices, useAgencyServicesStatistics } from '@/lib/features/agencyServices/useAgencyServices';
import { useAgencyCatalogs } from '@/lib/features/agencyServices/useAgencyCatalogs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Clock, CheckCircle, Users, MapPin, Ship, Plus, DollarSign, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';

export default function AgencyDashboard() {
  const router = useRouter();
  const { 
    services, 
    loading: servicesLoading, 
    quickStats,
    fetchServices
  } = useAgencyServices();
  
  const { statistics, loading: statsLoading, fetchStatistics } = useAgencyServicesStatistics();
  const { quickStats: catalogStats, fetchGroupedCatalogs } = useAgencyCatalogs();

  useEffect(() => {
    fetchServices({ page: 1, limit: 5 });
    fetchStatistics();
    fetchGroupedCatalogs();
  }, [fetchServices, fetchStatistics, fetchGroupedCatalogs]);

  const dashboardStats = [
    { 
      title: 'Pending Services', 
      value: quickStats.pending, 
      icon: Clock, 
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50'
    },
    { 
      title: 'In Progress', 
      value: quickStats.inProgress, 
      icon: Car, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Completed', 
      value: quickStats.completed, 
      icon: CheckCircle, 
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      title: 'Total Value', 
      value: `$${quickStats.totalValue.toLocaleString()}`, 
      icon: DollarSign, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  const quickActions = [
    { 
      title: 'Create New Service', 
      description: 'Add crew transportation service',
      href: '/agency/services', 
      icon: Plus,
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    { 
      title: 'Manage Catalogs', 
      description: 'Locations, drivers, vessels',
      href: '/agency/catalogs', 
      icon: MapPin,
      color: 'bg-green-500 hover:bg-green-600'
    },
    { 
      title: 'View All Services', 
      description: 'Service history and records',
      href: '/agency/records', 
      icon: Ship,
      color: 'bg-purple-500 hover:bg-purple-600'
    },
    { 
      title: 'Ready for Invoice', 
      description: 'Generate pre-invoices',
      href: '/agency/invoice', 
      icon: CheckCircle,
      color: 'bg-orange-500 hover:bg-orange-600'
    }
  ];

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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            Agency Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Crew transportation services management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/agency/services">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Service
            </Button>
          </Link>
          <Link href="/agency/records">
            <Button variant="outline">
              <Ship className="mr-2 h-4 w-4" />
              View All
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <Card className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center">
                    <div className={`h-12 w-12 rounded-lg ${action.color} flex items-center justify-center mx-auto mb-4`}>
                      <action.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold mb-2">{action.title}</h3>
                    <p className="text-sm text-muted-foreground">{action.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Services */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Services</CardTitle>
            <Link href="/agency/records">
              <Button variant="outline">View All Services</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {servicesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Ship className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No services found</p>
              <Link href="/agency/services">
                <Button className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Service
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {services.slice(0, 5).map((service) => (
                <div key={service._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{service.crewName}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Ship className="h-3 w-3 mr-1" />
                        {service.vessel}
                        {service.voyage && ` - ${service.voyage}`}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3 mr-1" />
                        {service.pickupLocation}
                        <ArrowRight className="h-3 w-3 mx-1" />
                        {service.dropoffLocation}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(service.pickupDate), 'MMM dd, yyyy')} at {service.pickupTime}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(service.status)}
                      {service.price && (
                        <p className="text-sm font-medium text-green-600">
                          ${service.price}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Catalog Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <MapPin className="h-6 w-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold">{catalogStats.location?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Locations</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Car className="h-6 w-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold">{catalogStats.driver?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Drivers</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Ship className="h-6 w-6 mx-auto mb-2 text-purple-500" />
            <p className="text-2xl font-bold">{catalogStats.vessel?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Vessels</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Users className="h-6 w-6 mx-auto mb-2 text-orange-500" />
            <p className="text-2xl font-bold">{catalogStats.rank?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Ranks</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Building className="h-6 w-6 mx-auto mb-2 text-red-500" />
            <p className="text-2xl font-bold">{catalogStats.transport_company?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Companies</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Flag className="h-6 w-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold">{catalogStats.nationality?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Nationalities</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="p-4">
            <Code className="h-6 w-6 mx-auto mb-2 text-indigo-500" />
            <p className="text-2xl font-bold">{catalogStats.taulia_code?.active || 0}</p>
            <p className="text-xs text-muted-foreground">Service Codes</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}