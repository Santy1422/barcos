"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Search, Calendar, X } from "lucide-react"
import { RecordFilters } from "../types"

interface PrefacturaFiltersProps {
  filters: RecordFilters
  onFiltersChange: (filters: Partial<RecordFilters>) => void
  recordCounts: {
    total: number
    filtered: number
    local: number
    trasiego: number
    pendiente: number
    completado: number
    prefacturado: number
  }
}

export function PrefacturaFilters({
  filters,
  onFiltersChange,
  recordCounts
}: PrefacturaFiltersProps) {
  const handleFilterByPeriod = (period: "today" | "week" | "month" | "advanced") => {
    const today = new Date()
    let startDate = ""
    let endDate = today.toISOString().split("T")[0]

    switch (period) {
      case "today":
        startDate = endDate
        break
      case "week":
        const weekAgo = new Date(today)
        weekAgo.setDate(today.getDate() - 7)
        startDate = weekAgo.toISOString().split("T")[0]
        break
      case "month":
        const monthAgo = new Date(today)
        monthAgo.setMonth(today.getMonth() - 1)
        startDate = monthAgo.toISOString().split("T")[0]
        break
      case "advanced":
        // Open date modal for custom range
        onFiltersChange({
          activePeriodFilter: "advanced"
        })
        return
    }

    onFiltersChange({
      startDate,
      endDate,
      isUsingPeriodFilter: true,
      activePeriodFilter: period
    })
  }

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: "",
      recordTypeFilter: "all",
      statusFilter: "all",
      dateFilter: "createdAt",
      startDate: "",
      endDate: "",
      isUsingPeriodFilter: false,
      activePeriodFilter: "none"
    })
  }

  const getActivePeriodText = () => {
    switch (filters.activePeriodFilter) {
      case "today":
        return "Hoy"
      case "week":
        return "Última semana"
      case "month":
        return "Último mes"
      case "advanced":
        return "Rango personalizado"
      default:
        return ""
    }
  }

  const hasActiveFilters = filters.recordTypeFilter !== "all" || 
    filters.statusFilter !== "all" || 
    filters.searchTerm || 
    filters.startDate || 
    filters.endDate

  return (
    <div className="space-y-4">
      {/* Record counts summary */}
      <div className="mb-4 mt-4 bg-gradient-to-r from-slate-100 to-blue-100 border border-slate-300 p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="text-sm font-semibold text-slate-900">
              Total de registros: {recordCounts.total}
            </span>
            {hasActiveFilters && (
              <div className="mt-1 text-sm text-slate-700">
                Mostrando {recordCounts.filtered} registros filtrados
              </div>
            )}
          </div>
          <div className="flex gap-4 text-xs">
            <div className="bg-white/60 px-3 py-1 rounded-md">
              <span className="font-medium text-slate-600">Locales:</span>
              <span className="ml-1 font-bold text-slate-900">{recordCounts.local}</span>
            </div>
            <div className="bg-white/60 px-3 py-1 rounded-md">
              <span className="font-medium text-slate-600">Trasiego:</span>
              <span className="ml-1 font-bold text-slate-900">{recordCounts.trasiego}</span>
            </div>
            <div className="bg-white/60 px-3 py-1 rounded-md">
              <span className="font-medium text-slate-600">Pendientes:</span>
              <span className="ml-1 font-bold text-slate-900">{recordCounts.pendiente}</span>
            </div>
            <div className="bg-white/60 px-3 py-1 rounded-md">
              <span className="font-medium text-slate-600">Completados:</span>
              <span className="ml-1 font-bold text-slate-900">{recordCounts.completado}</span>
            </div>
            <div className="bg-white/60 px-3 py-1 rounded-md">
              <span className="font-medium text-slate-600">Prefacturados:</span>
              <span className="ml-1 font-bold text-slate-900">{recordCounts.prefacturado}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar por contenedor, cliente o orden..."
          value={filters.searchTerm}
          onChange={(e) => onFiltersChange({ searchTerm: e.target.value })}
          className="pl-8"
        />
      </div>

      {/* Filter buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Type filter */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Filtrar por tipo:</Label>
          <div className="flex gap-2">
            <Button
              variant={filters.recordTypeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ recordTypeFilter: "all" })}
              className="text-xs"
            >
              Todos
            </Button>
            <Button
              variant={filters.recordTypeFilter === "local" ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ recordTypeFilter: "local" })}
              className="text-xs"
            >
              Locales
            </Button>
            <Button
              variant={filters.recordTypeFilter === "trasiego" ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ recordTypeFilter: "trasiego" })}
              className="text-xs"
            >
              Trasiego
            </Button>
          </div>
          
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs text-slate-600 hover:text-slate-700 mt-2"
            >
              <X className="w-3 h-3 mr-1" />
              Limpiar todos los filtros
            </Button>
          )}
        </div>

        {/* Status filter */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Filtrar por estado:</Label>
          <div className="flex gap-2">
            <Button
              variant={filters.statusFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ statusFilter: "all" })}
              className="text-xs"
            >
              Todos
            </Button>
            <Button
              variant={filters.statusFilter === "pendiente" ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ statusFilter: "pendiente" })}
              className="text-xs"
            >
              Pendiente
            </Button>
            <Button
              variant={filters.statusFilter === "completado" ? "default" : "outline"}
              size="sm"
              onClick={() => onFiltersChange({ statusFilter: "completado" })}
              className="text-xs"
            >
              Completado
            </Button>
          </div>
        </div>

        {/* Date filter */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold text-slate-700">Filtrar por fecha:</Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-1">
              <Button
                variant={filters.dateFilter === "createdAt" ? "default" : "outline"}
                size="sm"
                onClick={() => onFiltersChange({ 
                  dateFilter: "createdAt",
                  isUsingPeriodFilter: false,
                  activePeriodFilter: "none"
                })}
                className="text-xs h-8 px-3"
              >
                Creación
              </Button>
              <Button
                variant={filters.dateFilter === "moveDate" ? "default" : "outline"}
                size="sm"
                onClick={() => onFiltersChange({ 
                  dateFilter: "moveDate",
                  isUsingPeriodFilter: false,
                  activePeriodFilter: "none"
                })}
                className="text-xs h-8 px-3"
              >
                Movimiento
              </Button>
            </div>
            
            <div className="hidden sm:block w-px h-6 bg-gray-300 mx-2 self-center"></div>
            
            <div className="flex gap-1 flex-wrap">
              <Button
                variant={filters.activePeriodFilter === "today" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterByPeriod("today")}
                className="text-xs h-8 px-2"
              >
                Hoy
              </Button>
              <Button
                variant={filters.activePeriodFilter === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterByPeriod("week")}
                className="text-xs h-8 px-2"
              >
                Semana
              </Button>
              <Button
                variant={filters.activePeriodFilter === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterByPeriod("month")}
                className="text-xs h-8 px-2"
              >
                Mes
              </Button>
              <Button
                variant={filters.activePeriodFilter === "advanced" ? "default" : "outline"}
                size="sm"
                onClick={() => handleFilterByPeriod("advanced")}
                className="text-xs h-8 px-2"
              >
                <Calendar className="w-3 h-3 mr-1" />
                Avanzado
              </Button>
            </div>
          </div>
          
          {/* Period indicator */}
          {filters.isUsingPeriodFilter && filters.activePeriodFilter !== "advanced" && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md mt-2">
              <Badge variant="default" className="bg-blue-600 text-white text-xs">
                {getActivePeriodText()}
              </Badge>
              <span className="text-sm text-blue-700">
                {filters.startDate} - {filters.endDate}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({
                  isUsingPeriodFilter: false,
                  activePeriodFilter: "none",
                  startDate: "",
                  endDate: "",
                  dateFilter: "createdAt"
                })}
                className="h-6 px-2 ml-auto"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}