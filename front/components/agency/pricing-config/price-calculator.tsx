"use client"

import { useState } from "react"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import {
  calculatePrice,
  selectCalculatedPrice,
  selectPricingConfigError,
  clearCalculatedPrice
} from "@/lib/features/agencyServices/agencyPricingConfigSlice"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Calculator, MapPin, Users, Clock, Tag, DollarSign, Route } from "lucide-react"

interface PriceCalculatorProps {
  open: boolean
  onClose: () => void
  configId?: string
}

const COMMON_LOCATIONS = [
  'HOTEL PTY', 'PTY PORT', 'TOCUMEN AIRPORT', 'CRISTOBAL PORT',
  'HOTEL RADISSON COLON', 'COLON PORT', 'HOSPITAL PTY', 'HOSPITAL COLON',
  'BOAT LANDING PTY', 'PTY'
]

const SERVICE_TYPES = [
  { value: '', label: 'Ninguno' },
  { value: 'airport', label: 'Aeropuerto' },
  { value: 'medical', label: 'Médico' },
  { value: 'vip', label: 'VIP' },
  { value: 'security', label: 'Seguridad' },
  { value: 'emergency', label: 'Emergencia' }
]

const SAP_CODES = [
  { value: '', label: 'Ninguno' },
  { value: 'ECR000669', label: 'ECR000669 - Tarifa Estándar' },
  { value: 'ECR001253', label: 'ECR001253 - Reefer Technicians' },
  { value: 'GEN000089', label: 'GEN000089 - VIP/MSC Personal' },
  { value: 'CLA00001', label: 'CLA00001 - Security/Seal Check' }
]

export function PriceCalculator({ open, onClose, configId }: PriceCalculatorProps) {
  const dispatch = useAppDispatch()
  const calculatedPrice = useAppSelector(selectCalculatedPrice)
  const error = useAppSelector(selectPricingConfigError)

  const [form, setForm] = useState({
    from: '',
    to: '',
    serviceDate: new Date().toISOString().split('T')[0],
    serviceTime: '08:00',
    passengerCount: 1,
    waitingHours: 0,
    serviceType: '',
    sapCode: '',
    promoCode: ''
  })

  const handleCalculate = () => {
    if (!form.from || !form.to) {
      return
    }

    dispatch(calculatePrice({
      configId,
      from: form.from,
      to: form.to,
      serviceDate: new Date(form.serviceDate),
      serviceTime: form.serviceTime,
      passengerCount: form.passengerCount,
      waitingHours: form.waitingHours,
      serviceType: form.serviceType || undefined,
      sapCode: form.sapCode || undefined,
      promoCode: form.promoCode || undefined
    }))
  }

  const handleClose = () => {
    dispatch(clearCalculatedPrice())
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Precios Agency
          </DialogTitle>
          <DialogDescription>
            Simule el cálculo de precio para un servicio de transporte
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6">
          {/* Formulario */}
          <div className="space-y-4">
            {/* Ubicaciones */}
            <div className="space-y-3">
              <div>
                <Label htmlFor="from">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Origen
                </Label>
                <Select
                  value={form.from}
                  onValueChange={(value) => setForm({ ...form, from: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="to">
                  <MapPin className="h-3 w-3 inline mr-1" />
                  Destino
                </Label>
                <Select
                  value={form.to}
                  onValueChange={(value) => setForm({ ...form, to: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_LOCATIONS.map(loc => (
                      <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fecha y hora */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.serviceDate}
                  onChange={(e) => setForm({ ...form, serviceDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={form.serviceTime}
                  onChange={(e) => setForm({ ...form, serviceTime: e.target.value })}
                />
              </div>
            </div>

            {/* Pasajeros y espera */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>
                  <Users className="h-3 w-3 inline mr-1" />
                  Pasajeros
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={form.passengerCount}
                  onChange={(e) => setForm({
                    ...form,
                    passengerCount: Number(e.target.value)
                  })}
                />
              </div>
              <div>
                <Label>
                  <Clock className="h-3 w-3 inline mr-1" />
                  Horas Espera
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={form.waitingHours}
                  onChange={(e) => setForm({
                    ...form,
                    waitingHours: Number(e.target.value)
                  })}
                />
              </div>
            </div>

            {/* Tipo de servicio y SAP */}
            <div className="space-y-3">
              <div>
                <Label>Tipo de Servicio</Label>
                <Select
                  value={form.serviceType}
                  onValueChange={(value) => setForm({ ...form, serviceType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVICE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Código SAP</Label>
                <Select
                  value={form.sapCode}
                  onValueChange={(value) => setForm({ ...form, sapCode: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione código" />
                  </SelectTrigger>
                  <SelectContent>
                    {SAP_CODES.map(code => (
                      <SelectItem key={code.value} value={code.value}>
                        {code.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>
                  <Tag className="h-3 w-3 inline mr-1" />
                  Código Promocional
                </Label>
                <Input
                  value={form.promoCode}
                  onChange={(e) => setForm({
                    ...form,
                    promoCode: e.target.value.toUpperCase()
                  })}
                  placeholder="PROMO2024"
                />
              </div>
            </div>

            <Button
              onClick={handleCalculate}
              className="w-full"
              disabled={!form.from || !form.to}
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calcular Precio
            </Button>
          </div>

          {/* Resultado */}
          <div>
            {calculatedPrice ? (
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Precio Calculado</span>
                    <Badge variant={
                      calculatedPrice.source === 'fixed_route' ? 'default' :
                      calculatedPrice.source === 'database' ? 'secondary' : 'outline'
                    }>
                      {calculatedPrice.source === 'fixed_route' ? 'Ruta Fija' :
                       calculatedPrice.source === 'database' ? 'Base de Datos' : 'Calculado'}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center mb-6">
                    <div className="text-4xl font-bold text-primary">
                      ${calculatedPrice.price.toFixed(2)}
                    </div>
                    {calculatedPrice.distance && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <Route className="h-3 w-3 inline mr-1" />
                        Distancia: {calculatedPrice.distance} km
                      </p>
                    )}
                  </div>

                  {calculatedPrice.breakdown && (
                    <div className="space-y-3 pt-4 border-t">
                      <h4 className="font-medium text-sm">Desglose del Precio:</h4>
                      <div className="space-y-2 text-sm">
                        {calculatedPrice.breakdown.baseFee !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tarifa Base:</span>
                            <span>${calculatedPrice.breakdown.baseFee.toFixed(2)}</span>
                          </div>
                        )}
                        {calculatedPrice.breakdown.distanceCharge !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Cargo por Distancia:</span>
                            <span>${calculatedPrice.breakdown.distanceCharge.toFixed(2)}</span>
                          </div>
                        )}
                        {calculatedPrice.breakdown.serviceAdjustment && calculatedPrice.breakdown.serviceAdjustment > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Ajuste de Servicio:</span>
                            <span className="text-orange-600">
                              +${calculatedPrice.breakdown.serviceAdjustment.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {calculatedPrice.breakdown.waitingCharge && calculatedPrice.breakdown.waitingCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tiempo de Espera:</span>
                            <span className="text-orange-600">
                              +${calculatedPrice.breakdown.waitingCharge.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {calculatedPrice.breakdown.extraPassengerCharge && calculatedPrice.breakdown.extraPassengerCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pasajeros Extra:</span>
                            <span className="text-orange-600">
                              +${calculatedPrice.breakdown.extraPassengerCharge.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {calculatedPrice.breakdown.discount && calculatedPrice.breakdown.discount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Descuento:</span>
                            <span className="text-green-600">
                              -${calculatedPrice.breakdown.discount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {calculatedPrice.breakdown.minimumPrice && (
                          <div className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
                            <span>Precio Mínimo:</span>
                            <span>${calculatedPrice.breakdown.minimumPrice.toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : error ? (
              <Card className="h-full border-red-200">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <p className="text-red-600">{error}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-full border-dashed">
                <CardContent className="flex items-center justify-center h-full">
                  <div className="text-center text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Configure los parámetros y presione</p>
                    <p>"Calcular Precio" para ver el resultado</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}