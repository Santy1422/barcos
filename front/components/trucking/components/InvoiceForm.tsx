import React from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { UserCheck } from "lucide-react"
import type { TruckingFormData } from "../hooks/useTruckingInvoice"
import type { CustomFieldConfig } from "@/lib/features/config/configSlice"

interface InvoiceFormProps {
  formData: TruckingFormData
  configuredDrivers: any[]
  configuredVehicles: any[]
  configuredRoutes: any[]
  truckingCustomFields: CustomFieldConfig[]
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onSelectChange: (name: string, value: string) => void
}

export function InvoiceForm({
  formData,
  configuredDrivers,
  configuredVehicles,
  configuredRoutes,
  truckingCustomFields,
  onInputChange,
  onSelectChange,
}: InvoiceFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserCheck className="mr-2 h-6 w-6" />
          Crear Factura de Trucking
        </CardTitle>
        <CardDescription>Completa los detalles de la factura.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="invoiceNumber">Número de Factura</Label>
            <Input
              id="invoiceNumber"
              name="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={onInputChange}
              placeholder="F-TRK-12345"
            />
          </div>
          <div>
            <Label htmlFor="currency">Moneda</Label>
            <Select value={formData.currency} onValueChange={(value) => onSelectChange("currency", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="PAB">PAB</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="issueDate">Fecha de Emisión</Label>
            <Input
              id="issueDate"
              name="issueDate"
              type="date"
              value={formData.issueDate}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="dueDate">Fecha de Vencimiento</Label>
            <Input
              id="dueDate"
              name="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={onInputChange}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="clientName">Cliente</Label>
            <Input
              id="clientName"
              name="clientName"
              value={formData.clientName}
              onChange={onInputChange}
              placeholder="Nombre del cliente"
            />
          </div>
          <div>
            <Label htmlFor="clientRuc">RUC/Cédula</Label>
            <Input
              id="clientRuc"
              name="clientRuc"
              value={formData.clientRuc}
              onChange={onInputChange}
              placeholder="RUC o cédula del cliente"
            />
          </div>
          <div>
            <Label htmlFor="clientAddress">Dirección</Label>
            <Input
              id="clientAddress"
              name="clientAddress"
              value={formData.clientAddress}
              onChange={onInputChange}
              placeholder="Dirección del cliente"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="driverId">Conductor</Label>
            <Select value={formData.driverId} onValueChange={(value) => onSelectChange("driverId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar conductor" />
              </SelectTrigger>
              <SelectContent>
                {configuredDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    {driver.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="vehicleId">Vehículo</Label>
            <Select value={formData.vehicleId} onValueChange={(value) => onSelectChange("vehicleId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar vehículo" />
              </SelectTrigger>
              <SelectContent>
                {configuredVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.plate} ({vehicle.model})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="routeId">Ruta</Label>
            <Select value={formData.routeId} onValueChange={(value) => onSelectChange("routeId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar ruta" />
              </SelectTrigger>
              <SelectContent>
                {configuredRoutes.map((route) => (
                  <SelectItem key={route.id} value={route.id}>
                    {route.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={onInputChange}
            placeholder="Descripción de los servicios"
            rows={3}
          />
        </div>

        {truckingCustomFields.map((field) => (
          <div key={field.id}>
            <Label htmlFor={field.id}>{field.label}</Label>
            <Input
              id={field.id}
              name={field.id}
              value={formData[field.id] || ""}
              onChange={onInputChange}
              placeholder={field.label}
            />
          </div>
        ))}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div>
            <Label htmlFor="subtotal">Subtotal</Label>
            <Input
              id="subtotal"
              name="subtotal"
              type="number"
              step="0.01"
              value={formData.subtotal}
              onChange={onInputChange}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="taxAmount">Impuestos (7%)</Label>
            <Input
              id="taxAmount"
              name="taxAmount"
              type="number"
              step="0.01"
              value={formData.taxAmount}
              onChange={onInputChange}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="total">Total</Label>
            <Input
              id="total"
              name="total"
              type="number"
              step="0.01"
              value={formData.total}
              onChange={onInputChange}
              placeholder="0.00"
              className="font-bold"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}