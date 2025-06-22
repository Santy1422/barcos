"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, X } from "lucide-react"

interface ManualEntryFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (entry: any) => void
  type: string
  typeInfo: any
}

export function ManualEntryForm({ isOpen, onClose, onSubmit, type, typeInfo }: ManualEntryFormProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<any>({})

  const getFormFields = () => {
    switch (type) {
      case "tracking":
        return [
          { key: "fecha", label: "Fecha", type: "date", required: true },
          { key: "clientes", label: "Cliente", type: "text", required: true },
          { key: "desde", label: "Desde", type: "text", required: true },
          { key: "subClientes", label: "Sub-Cliente", type: "text", required: false },
          { key: "hacia", label: "Hacia", type: "text", required: true },
          { key: "bl", label: "B/L", type: "text", required: true },
          { key: "buque", label: "Buque", type: "text", required: true },
          { key: "tamaño", label: "Tamaño", type: "select", options: ["20", "40", "45"], required: true },
          { key: "contenedor", label: "N° Contenedor", type: "text", required: true },
          { key: "ptgOrder", label: "PTG Order", type: "text", required: true },
          { key: "status", label: "Status", type: "select", options: ["RT", "PENDING", "COMPLETED"], required: true },
          { key: "voyage", label: "Voyage", type: "text", required: true },
          { key: "tarifa", label: "Tarifa", type: "number", required: true },
          { key: "gastosPuerto", label: "Gastos Puerto", type: "text", required: false },
          { key: "otrosGastos", label: "Otros Gastos", type: "text", required: false },
          { key: "jira", label: "JIRA", type: "text", required: false },
          { key: "fechaFacturacion", label: "Fecha Facturación", type: "date", required: false },
          { key: "driver", label: "Driver", type: "text", required: true },
          { key: "plate", label: "Placa", type: "text", required: false },
          { key: "bono", label: "Bono", type: "text", required: false },
          { key: "rtContainer", label: "RT Container", type: "text", required: false },
        ]
      case "invoices":
        return [
          { key: "customerName", label: "Customer Name", type: "text", required: true },
          { key: "invoiceNo", label: "Invoice No", type: "text", required: true },
          {
            key: "invoiceType",
            label: "Invoice Type",
            type: "select",
            options: ["Invoice", "Credit Note", "Debit Note"],
            required: true,
          },
          { key: "vessel", label: "Vessel", type: "text", required: true },
          { key: "date", label: "Date", type: "date", required: true },
          { key: "projectCode", label: "Project Code", type: "text", required: true },
          { key: "from", label: "From", type: "text", required: false },
          { key: "to", label: "To", type: "text", required: false },
          {
            key: "paymentTerm",
            label: "Payment Term",
            type: "select",
            options: ["NET 30", "NET 60", "COD"],
            required: false,
          },
          { key: "referenceNo", label: "Reference No", type: "text", required: true },
          { key: "shippingTerm", label: "Shipping Term", type: "text", required: false },
          { key: "deliveryAddress", label: "Delivery Address", type: "textarea", required: false },
          { key: "poNo", label: "PO No", type: "text", required: false },
          { key: "note", label: "Note", type: "textarea", required: false },
          { key: "currency", label: "Currency", type: "select", options: ["USD", "EUR", "ZAR", "PAB"], required: true },
          { key: "discount", label: "Discount", type: "number", required: false },
          { key: "totalInvoice", label: "Total Invoice", type: "number", required: true },
          { key: "total", label: "Total", type: "number", required: true },
          { key: "paid", label: "Paid", type: "number", required: false },
          { key: "unpaid", label: "UnPaid", type: "number", required: false },
        ]
      case "transport":
        return [
          { key: "po", label: "PO#", type: "text", required: true },
          { key: "date", label: "Date", type: "date", required: true },
          { key: "pickUpTime", label: "Pick Up Time", type: "time", required: true },
          { key: "pickUp", label: "Pick Up", type: "text", required: true },
          { key: "dropOff", label: "Drop Off", type: "text", required: true },
          { key: "vessel", label: "Vessel", type: "text", required: true },
          { key: "voy", label: "VOY", type: "text", required: true },
          { key: "taulia", label: "Taulia", type: "text", required: false },
          {
            key: "rank",
            label: "Rank",
            type: "select",
            options: [
              "CAPTAIN",
              "CHIEF OFFICER",
              "SECOND OFFICER",
              "THIRD OFFICER",
              "CHIEF ENGINEER",
              "SECOND ENGINEER",
              "THIRD ENGINEER",
            ],
            required: true,
          },
          { key: "name", label: "Name", type: "text", required: true },
          {
            key: "nationality",
            label: "Nationality",
            type: "select",
            options: ["PHILIPPINES", "INDIA", "UKRAINE", "ROMANIA", "RUSSIA", "POLAND"],
            required: true,
          },
          { key: "time", label: "Time", type: "text", required: false },
          { key: "flight", label: "Flight", type: "text", required: false },
          {
            key: "status",
            label: "Status",
            type: "select",
            options: ["CONFIRMED", "PENDING", "CANCELLED"],
            required: false,
          },
          { key: "status2", label: "Status 2", type: "text", required: false },
          { key: "invoice", label: "Invoice", type: "text", required: false },
          { key: "monto", label: "Monto", type: "number", required: false },
        ]
      default:
        return []
    }
  }

  const fields = getFormFields()

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }))

    // Limpiar error si existe
    if (errors[key]) {
      setErrors((prev: any) => ({
        ...prev,
        [key]: null,
      }))
    }
  }

  const validateForm = () => {
    const newErrors: any = {}

    fields.forEach((field) => {
      if (field.required && (!formData[field.key] || formData[field.key].toString().trim() === "")) {
        newErrors[field.key] = `${field.label} es requerido`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData)
      setFormData({})
      setErrors({})
      onClose()
    }
  }

  const handleReset = () => {
    setFormData({})
    setErrors({})
  }

  const renderField = (field: any) => {
    const value = formData[field.key] || ""
    const hasError = errors[field.key]

    switch (field.type) {
      case "select":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Select value={value} onValueChange={(val) => handleInputChange(field.key, val)}>
              <SelectTrigger id={field.key} className={hasError ? "border-red-500" : ""}>
                <SelectValue placeholder={`Seleccionar ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option: string) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError && <p className="text-sm text-red-500">{hasError}</p>}
          </div>
        )

      case "textarea":
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.key}
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={`Ingrese ${field.label.toLowerCase()}`}
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && <p className="text-sm text-red-500">{hasError}</p>}
          </div>
        )

      default:
        return (
          <div key={field.key} className="space-y-2">
            <Label htmlFor={field.key}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.key}
              type={field.type}
              value={value}
              onChange={(e) => handleInputChange(field.key, e.target.value)}
              placeholder={`Ingrese ${field.label.toLowerCase()}`}
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && <p className="text-sm text-red-500">{hasError}</p>}
          </div>
        )
    }
  }

  // Dividir campos en columnas para mejor organización
  const leftFields = fields.slice(0, Math.ceil(fields.length / 2))
  const rightFields = fields.slice(Math.ceil(fields.length / 2))

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                Agregar Registro Manual
                {typeInfo && <Badge variant="outline">{typeInfo.name}</Badge>}
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Complete los campos para agregar un nuevo registro de {typeInfo?.name.toLowerCase()}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh] pr-4">
            <div className="space-y-6">
              {/* Información del tipo */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Información del Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <p>
                      <strong>Tipo:</strong> {typeInfo?.name}
                    </p>
                    <p>
                      <strong>Descripción:</strong> {typeInfo?.description}
                    </p>
                    <p>
                      <strong>Campos requeridos:</strong> Los campos marcados con{" "}
                      <span className="text-red-500">*</span> son obligatorios
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Formulario en dos columnas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Información Principal</h3>
                  {leftFields.map(renderField)}
                </div>
                <div className="space-y-4">
                  <h3 className="font-medium text-sm text-muted-foreground">Información Adicional</h3>
                  {rightFields.map(renderField)}
                </div>
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Botones de acción */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset}>
            Limpiar Formulario
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              <Save className="mr-2 h-4 w-4" />
              Agregar Registro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
