"use client"

import * as React from "react"
import { AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

interface DiscountInputProps {
  maxAmount: number
  value: number
  onChange: (amount: number) => void
  disabled?: boolean
  currency?: string
  label?: string
  placeholder?: string
  className?: string
}

export function DiscountInput({
  maxAmount,
  value,
  onChange,
  disabled = false,
  currency = "USD",
  label = "Descuento a Aplicar",
  placeholder = "0.00",
  className
}: DiscountInputProps) {
  const [localValue, setLocalValue] = React.useState(value.toString())
  
  // Sincronizar con prop value cuando cambia
  React.useEffect(() => {
    setLocalValue(value.toString())
  }, [value])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value
    setLocalValue(inputValue)
    
    // Solo actualizar el valor padre si es un número válido
    const numericValue = parseFloat(inputValue) || 0
    onChange(numericValue)
  }

  const handleInputBlur = () => {
    // Al perder el foco, formatear el valor
    const numericValue = parseFloat(localValue) || 0
    const formattedValue = numericValue.toFixed(2)
    setLocalValue(formattedValue)
    onChange(numericValue)
  }

  const isInvalid = value > maxAmount
  const isNegative = value < 0

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor="discount-input">
        {label} ({currency})
      </Label>
      <div className="relative">
        <Input
          id="discount-input"
          type="number"
          placeholder={placeholder}
          value={localValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          disabled={disabled}
          min="0"
          step="0.01"
          className={cn(
            "pr-12",
            isInvalid && "border-red-500 focus-visible:ring-red-500",
            isNegative && "border-red-500 focus-visible:ring-red-500"
          )}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <span className="text-sm text-muted-foreground">{currency}</span>
        </div>
      </div>
      
      {isNegative && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            El descuento no puede ser negativo
          </AlertDescription>
        </Alert>
      )}
      
      {isInvalid && !isNegative && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            El descuento no puede ser mayor al subtotal ({currency} ${maxAmount.toFixed(2)})
          </AlertDescription>
        </Alert>
      )}
      
      {value > 0 && !isInvalid && !isNegative && (
        <div className="text-sm text-muted-foreground">
          Total después del descuento: {currency} ${(maxAmount - value).toFixed(2)}
        </div>
      )}
    </div>
  )
}

export default DiscountInput