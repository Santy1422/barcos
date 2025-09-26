"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Clock, Users, Luggage, Fuel, MapPin } from "lucide-react"

interface AdditionalChargesEditorProps {
  charges: {
    waitingHourRate: number
    extraPassengerRate: number
    luggageRate?: number
    tollsIncluded?: boolean
    fuelSurcharge?: number
  }
  onChange: (charges: any) => void
  disabled?: boolean
}

export function AdditionalChargesEditor({
  charges,
  onChange,
  disabled = false
}: AdditionalChargesEditorProps) {
  const updateCharge = (field: string, value: any) => {
    onChange({
      ...charges,
      [field]: field === 'tollsIncluded' ? value : Number(value)
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Cargos Adicionales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Tiempo de espera */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label>Tiempo de Espera</Label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={charges.waitingHourRate}
                  onChange={(e) => updateCharge('waitingHourRate', e.target.value)}
                  disabled={disabled}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">$ por hora</span>
              </div>
            </div>

            {/* Pasajeros extra */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label>Pasajero Adicional</Label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={charges.extraPassengerRate}
                  onChange={(e) => updateCharge('extraPassengerRate', e.target.value)}
                  disabled={disabled}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">$ por persona</span>
              </div>
            </div>

            {/* Equipaje */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Luggage className="h-4 w-4 text-muted-foreground" />
                <Label>Equipaje Extra</Label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={charges.luggageRate || ''}
                  onChange={(e) => updateCharge('luggageRate', e.target.value)}
                  disabled={disabled}
                  className="w-32"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">$ por maleta</span>
              </div>
            </div>

            {/* Recargo combustible */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2">
                <Fuel className="h-4 w-4 text-muted-foreground" />
                <Label>Recargo Combustible</Label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={charges.fuelSurcharge || ''}
                  onChange={(e) => updateCharge('fuelSurcharge', e.target.value)}
                  disabled={disabled}
                  className="w-32"
                  placeholder="0"
                />
                <span className="text-sm text-muted-foreground">$ adicional</span>
              </div>
            </div>

            {/* Peajes incluidos */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <Label>Peajes</Label>
              </div>
              <div className="col-span-2 flex items-center space-x-2">
                <Switch
                  id="tolls"
                  checked={charges.tollsIncluded || false}
                  onCheckedChange={(checked) => updateCharge('tollsIncluded', checked)}
                  disabled={disabled}
                />
                <Label htmlFor="tolls" className="text-sm text-muted-foreground">
                  {charges.tollsIncluded ? 'Incluidos en el precio' : 'Se cobran aparte'}
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de ejemplo */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="text-sm">Ejemplo de Cálculo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-2">
            <p>Para un servicio con:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>2 horas de espera: +${(charges.waitingHourRate * 2).toFixed(2)}</li>
              <li>3 pasajeros adicionales: +${(charges.extraPassengerRate * 3).toFixed(2)}</li>
              {charges.luggageRate && <li>2 maletas extra: +${((charges.luggageRate || 0) * 2).toFixed(2)}</li>}
              {charges.fuelSurcharge && <li>Recargo combustible: +${charges.fuelSurcharge.toFixed(2)}</li>}
            </ul>
            <p className="font-medium pt-2 border-t">
              Total cargos adicionales: $
              {(
                charges.waitingHourRate * 2 +
                charges.extraPassengerRate * 3 +
                (charges.luggageRate || 0) * 2 +
                (charges.fuelSurcharge || 0)
              ).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}