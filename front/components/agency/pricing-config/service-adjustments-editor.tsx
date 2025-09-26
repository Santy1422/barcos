"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plane, Heart, Shield, AlertTriangle, Calendar, Moon } from "lucide-react"

interface ServiceAdjustment {
  type: 'percentage' | 'fixed'
  value: number
}

interface ServiceAdjustmentsEditorProps {
  adjustments: {
    airport?: ServiceAdjustment
    medical?: ServiceAdjustment
    vip?: ServiceAdjustment
    security?: ServiceAdjustment
    emergency?: ServiceAdjustment
    weekend?: ServiceAdjustment
    holiday?: ServiceAdjustment
    nightTime?: ServiceAdjustment
  }
  onChange: (adjustments: any) => void
  disabled?: boolean
}

const SERVICE_TYPES = [
  { key: 'airport', label: 'Aeropuerto', icon: Plane, color: 'text-blue-500' },
  { key: 'medical', label: 'Médico', icon: Heart, color: 'text-red-500' },
  { key: 'vip', label: 'VIP', icon: Shield, color: 'text-purple-500' },
  { key: 'security', label: 'Seguridad', icon: Shield, color: 'text-green-500' },
  { key: 'emergency', label: 'Emergencia', icon: AlertTriangle, color: 'text-orange-500' },
  { key: 'weekend', label: 'Fin de Semana', icon: Calendar, color: 'text-indigo-500' },
  { key: 'holiday', label: 'Feriado', icon: Calendar, color: 'text-pink-500' },
  { key: 'nightTime', label: 'Nocturno', icon: Moon, color: 'text-gray-500' }
]

export function ServiceAdjustmentsEditor({
  adjustments,
  onChange,
  disabled = false
}: ServiceAdjustmentsEditorProps) {
  const updateAdjustment = (key: string, field: 'type' | 'value', value: any) => {
    const currentAdjustment = adjustments[key as keyof typeof adjustments] || { type: 'percentage', value: 0 }
    
    onChange({
      ...adjustments,
      [key]: {
        ...currentAdjustment,
        [field]: field === 'value' ? Number(value) : value
      }
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ajustes por Tipo de Servicio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERVICE_TYPES.map((service) => {
              const Icon = service.icon
              const adjustment = adjustments[service.key as keyof typeof adjustments]
              const hasAdjustment = adjustment && adjustment.value > 0

              return (
                <div key={service.key} className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${service.color}`} />
                    {service.label}
                  </Label>
                  
                  <div className="flex gap-2 items-center">
                    <RadioGroup
                      value={adjustment?.type || 'percentage'}
                      onValueChange={(value) => updateAdjustment(service.key, 'type', value)}
                      disabled={disabled}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="percentage" id={`${service.key}-percent`} />
                        <Label htmlFor={`${service.key}-percent`} className="text-sm">%</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="fixed" id={`${service.key}-fixed`} />
                        <Label htmlFor={`${service.key}-fixed`} className="text-sm">$</Label>
                      </div>
                    </RadioGroup>
                    
                    <Input
                      type="number"
                      step={adjustment?.type === 'percentage' ? "1" : "0.01"}
                      value={adjustment?.value || 0}
                      onChange={(e) => updateAdjustment(service.key, 'value', e.target.value)}
                      disabled={disabled}
                      className="w-24"
                      placeholder="0"
                    />
                    
                    <span className="text-sm text-muted-foreground">
                      {adjustment?.type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                  
                  {hasAdjustment && (
                    <p className="text-xs text-muted-foreground">
                      Ejemplo en $100: +${
                        adjustment.type === 'percentage' 
                          ? (100 * adjustment.value / 100).toFixed(2)
                          : adjustment.value.toFixed(2)
                      }
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}