"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Car, Users, DollarSign, Clock, Plus, UserPlus, Anchor } from "lucide-react"
import Link from "next/link"
import { useAgencyServices } from "@/lib/features/agencyServices/useAgencyServices"
import { useAgencyCatalogs } from "@/lib/features/agencyServices/useAgencyCatalogs"
import { useEffect } from "react"

export function AgencyDashboard() {
  const { services, quickStats, fetchServices, loading } = useAgencyServices();
  const { fetchGroupedCatalogs } = useAgencyCatalogs();

  useEffect(() => {
    fetchServices({ page: 1, limit: 10 });
    fetchGroupedCatalogs();
  }, []);

  const stats = [
    { title: "Total Services", value: quickStats.total.toString(), icon: Car, color: "text-blue-600" },
    { title: "In Progress", value: quickStats.inProgress.toString(), icon: Clock, color: "text-orange-600" },
    { title: "Completed", value: quickStats.completed.toString(), icon: Users, color: "text-green-600" },
    { title: "Total Value", value: `$${quickStats.totalValue.toLocaleString()}`, icon: DollarSign, color: "text-purple-600" },
  ]

  const recentServices = services.slice(0, 5).map(service => ({
    id: service._id.slice(-6),
    crew: service.crewName,
    route: `${service.pickupLocation} → ${service.dropoffLocation}`,
    vessel: service.vessel,
    status: service.status,
    amount: service.price ? `$${service.price}` : '-',
    date: new Date(service.pickupDate).toLocaleDateString()
  }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            Agency Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Transportation Services Management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/agency/services">
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              New Service
            </Button>
          </Link>
          <Link href="/agency/invoice">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Create Invoice
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Services */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Services</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Crew</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Vessel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.id}</TableCell>
                  <TableCell>{service.crew}</TableCell>
                  <TableCell>{service.route}</TableCell>
                  <TableCell>{service.vessel}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        service.status === "completed"
                          ? "success"
                          : service.status === "in_progress"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {service.status === "completed" ? "Completed" :
                       service.status === "in_progress" ? "In Progress" :
                       service.status === "pending" ? "Pending" :
                       service.status === "prefacturado" ? "Pre-invoiced" :
                       service.status === "facturado" ? "Invoiced" : service.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{service.amount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/agency/services">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <UserPlus className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <h3 className="font-semibold mb-2">New Service</h3>
              <p className="text-sm text-muted-foreground">Create a new transportation service</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/agency/catalogs">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <Anchor className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="font-semibold mb-2">Manage Catalogs</h3>
              <p className="text-sm text-muted-foreground">Configure locations, drivers, vessels</p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/agency/invoice">
          <Card className="cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-6 text-center">
              <DollarSign className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h3 className="font-semibold mb-2">Create Invoice</h3>
              <p className="text-sm text-muted-foreground">Generate invoices for completed services</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
} 