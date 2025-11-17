"use client"

import { Input } from "@/components/ui/input"
import { Clock } from "lucide-react"
import { useState, useEffect, useRef } from "react"

interface TimeInputProps {
  id?: string
  value: string // Formato HH:MM (24 horas)
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
  placeholder?: string
}

/**
 * Componente de input de tiempo que siempre muestra formato 24 horas (HH:MM)
 * independientemente de la configuración regional del navegador
 */
export function TimeInput({
  id,
  value,
  onChange,
  className = "",
  disabled = false,
  placeholder = "HH:MM"
}: TimeInputProps) {
  const [displayValue, setDisplayValue] = useState(value || "")
  const [isFocused, setIsFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Actualizar displayValue cuando cambia el value prop
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value || "")
    }
  }, [value, isFocused])

  // Validar y formatear el valor de tiempo
  const formatTime = (input: string): string => {
    // Remover todo excepto números
    const numbers = input.replace(/\D/g, "")
    
    if (numbers.length === 0) return ""
    
    // Limitar a 4 dígitos máximo
    const limited = numbers.slice(0, 4)
    
    // Formatear como HH:MM
    if (limited.length <= 2) {
      return limited
    } else {
      return `${limited.slice(0, 2)}:${limited.slice(2, 4)}`
    }
  }

  // Validar que las horas estén entre 00-23 y minutos entre 00-59
  const validateTime = (time: string): boolean => {
    if (!time || time.length < 5) return false
    const [hours, minutes] = time.split(":")
    const h = parseInt(hours, 10)
    const m = parseInt(minutes, 10)
    return h >= 0 && h <= 23 && m >= 0 && m <= 59
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    const formatted = formatTime(input)
    setDisplayValue(formatted)

    // Si el formato es válido (HH:MM completo), actualizar el valor
    if (formatted.length === 5 && validateTime(formatted)) {
      onChange(formatted)
    } else if (formatted.length === 0) {
      onChange("")
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    
    // Si el valor no está completo o es inválido, intentar completarlo o resetearlo
    if (displayValue && displayValue.length < 5) {
      // Si solo tiene horas, agregar :00
      if (displayValue.length === 2 && !displayValue.includes(":")) {
        const hours = parseInt(displayValue, 10)
        if (hours >= 0 && hours <= 23) {
          const formatted = `${displayValue.padStart(2, "0")}:00`
          setDisplayValue(formatted)
          onChange(formatted)
          return
        }
      }
      // Si tiene formato parcial, completar con ceros
      if (displayValue.includes(":")) {
        const [hours, minutes = ""] = displayValue.split(":")
        const h = hours.padStart(2, "0")
        const m = minutes.padStart(2, "0")
        if (parseInt(h, 10) >= 0 && parseInt(h, 10) <= 23 && parseInt(m, 10) >= 0 && parseInt(m, 10) <= 59) {
          const formatted = `${h}:${m}`
          setDisplayValue(formatted)
          onChange(formatted)
          return
        }
      }
    }
    
    // Si el valor es inválido, resetear al valor anterior
    if (displayValue && !validateTime(displayValue)) {
      setDisplayValue(value || "")
    } else if (!displayValue) {
      setDisplayValue(value || "")
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Permitir navegación con flechas, borrar, etc.
    if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Backspace" || e.key === "Delete" || e.key === "Tab") {
      return
    }
    
    // Permitir solo números
    if (!/[0-9]/.test(e.key) && e.key !== ":") {
      e.preventDefault()
    }
  }

  return (
    <div className="relative">
      <Clock className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        className={`pl-8 ${className}`}
        maxLength={5}
        inputMode="numeric"
      />
    </div>
  )
}

