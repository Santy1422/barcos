"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Tag, Users, TrendingDown } from "lucide-react"

interface DiscountsEditorProps {
  discounts: {
    volumeDiscounts?: Array<{
      minServices: number
      discountPercentage: number
    }>
    promotionalDiscounts?: Array<{
      code: string
      validFrom: Date
      validTo: Date
      discountPercentage: number
      maxUses?: number
      currentUses?: number
    }>
  }
  onChange: (discounts: any) => void
  disabled?: boolean
}

export function DiscountsEditor({
  discounts,
  onChange,
  disabled = false
}: DiscountsEditorProps) {
  const [newVolumeDiscount, setNewVolumeDiscount] = useState({
    minServices: 0,
    discountPercentage: 0
  })
  const [newPromoCode, setNewPromoCode] = useState({
    code: '',
    validFrom: new Date().toISOString().split('T')[0],
    validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discountPercentage: 0,
    maxUses: 0
  })

  const addVolumeDiscount = () => {
    if (newVolumeDiscount.minServices > 0 && newVolumeDiscount.discountPercentage > 0) {
      onChange({
        ...discounts,
        volumeDiscounts: [
          ...(discounts.volumeDiscounts || []),
          newVolumeDiscount
        ].sort((a, b) => a.minServices - b.minServices)
      })
      setNewVolumeDiscount({ minServices: 0, discountPercentage: 0 })
    }
  }

  const removeVolumeDiscount = (index: number) => {
    onChange({
      ...discounts,
      volumeDiscounts: discounts.volumeDiscounts?.filter((_, i) => i !== index)
    })
  }

  const addPromoCode = () => {
    if (newPromoCode.code && newPromoCode.discountPercentage > 0) {
      onChange({
        ...discounts,
        promotionalDiscounts: [
          ...(discounts.promotionalDiscounts || []),
          {
            ...newPromoCode,
            code: newPromoCode.code.toUpperCase(),
            validFrom: new Date(newPromoCode.validFrom),
            validTo: new Date(newPromoCode.validTo),
            currentUses: 0
          }
        ]
      })
      setNewPromoCode({
        code: '',
        validFrom: new Date().toISOString().split('T')[0],
        validTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        discountPercentage: 0,
        maxUses: 0
      })
    }
  }

  const removePromoCode = (index: number) => {
    onChange({
      ...discounts,
      promotionalDiscounts: discounts.promotionalDiscounts?.filter((_, i) => i !== index)
    })
  }

  return (
    <div className="space-y-6">
      {/* Descuentos por volumen */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Descuentos por Volumen
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {discounts.volumeDiscounts && discounts.volumeDiscounts.length > 0 ? (
            <div className="space-y-2 mb-4">
              {discounts.volumeDiscounts.map((discount, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">
                    Desde <strong>{discount.minServices}</strong> servicios/mes: 
                    <span className="ml-2 text-green-600 font-medium">
                      -{discount.discountPercentage}%
                    </span>
                  </span>
                  {!disabled && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeVolumeDiscount(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              No hay descuentos por volumen configurados.
            </p>
          )}

          {!disabled && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Min. Servicios</Label>
                  <Input
                    type="number"
                    value={newVolumeDiscount.minServices}
                    onChange={(e) => setNewVolumeDiscount({
                      ...newVolumeDiscount,
                      minServices: Number(e.target.value)
                    })}
                    placeholder="10"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descuento (%)</Label>
                  <Input
                    type="number"
                    value={newVolumeDiscount.discountPercentage}
                    onChange={(e) => setNewVolumeDiscount({
                      ...newVolumeDiscount,
                      discountPercentage: Number(e.target.value)
                    })}
                    placeholder="5"
                    className="h-9"
                    max="100"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={addVolumeDiscount}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Códigos promocionales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Códigos Promocionales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {discounts.promotionalDiscounts && discounts.promotionalDiscounts.length > 0 ? (
            <div className="space-y-2 mb-4">
              {discounts.promotionalDiscounts.map((promo, index) => {
                const validFrom = new Date(promo.validFrom).toLocaleDateString()
                const validTo = new Date(promo.validTo).toLocaleDateString()
                const isActive = new Date() >= new Date(promo.validFrom) && 
                                new Date() <= new Date(promo.validTo)
                
                return (
                  <div key={index} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{promo.code}</span>
                          <span className="text-green-600 font-medium">
                            -{promo.discountPercentage}%
                          </span>
                          {isActive ? (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                              Activo
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Válido: {validFrom} - {validTo}
                        </p>
                        {promo.maxUses && (
                          <p className="text-xs text-muted-foreground">
                            Usos: {promo.currentUses || 0} / {promo.maxUses}
                          </p>
                        )}
                      </div>
                      {!disabled && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removePromoCode(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground mb-4">
              No hay códigos promocionales configurados.
            </p>
          )}

          {!disabled && (
            <div className="space-y-4 border-t pt-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Código</Label>
                  <Input
                    value={newPromoCode.code}
                    onChange={(e) => setNewPromoCode({
                      ...newPromoCode,
                      code: e.target.value.toUpperCase()
                    })}
                    placeholder="PROMO2024"
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Descuento (%)</Label>
                  <Input
                    type="number"
                    value={newPromoCode.discountPercentage}
                    onChange={(e) => setNewPromoCode({
                      ...newPromoCode,
                      discountPercentage: Number(e.target.value)
                    })}
                    placeholder="10"
                    className="h-9"
                    max="100"
                  />
                </div>
                <div>
                  <Label className="text-xs">Válido desde</Label>
                  <Input
                    type="date"
                    value={newPromoCode.validFrom}
                    onChange={(e) => setNewPromoCode({
                      ...newPromoCode,
                      validFrom: e.target.value
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Válido hasta</Label>
                  <Input
                    type="date"
                    value={newPromoCode.validTo}
                    onChange={(e) => setNewPromoCode({
                      ...newPromoCode,
                      validTo: e.target.value
                    })}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Máx. usos (opcional)</Label>
                  <Input
                    type="number"
                    value={newPromoCode.maxUses || ''}
                    onChange={(e) => setNewPromoCode({
                      ...newPromoCode,
                      maxUses: e.target.value ? Number(e.target.value) : 0
                    })}
                    placeholder="∞"
                    className="h-9"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    size="sm"
                    onClick={addPromoCode}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}