"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Ship, ArrowRight, Database, AlertCircle } from "lucide-react"
import { PrefacturaFilters } from "../components/PrefacturaFilters"
import { PrefacturaTable } from "../components/PrefacturaTable"
import { usePrefacturaFilters } from "../hooks/usePrefacturaFilters"
import { usePrefacturaSelection } from "../hooks/usePrefacturaSelection"

interface StepSelectorProps {
  records: any[]
  clients: any[]
  onNext: () => void
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onRecordView: (record: any) => void
  onRecordEdit: (record: any) => void
  onRecordDelete: (id: string) => void
}

export function StepSelector({
  records,
  clients,
  onNext,
  selectedIds,
  onSelectionChange,
  onRecordView,
  onRecordEdit,
  onRecordDelete
}: StepSelectorProps) {
  const { filters, updateFilters, filteredRecords, recordCounts, getRecordType } = usePrefacturaFilters(records)
  const { 
    handleRecordSelection, 
    handleSelectAll, 
    canSelectRecord, 
    getRecordId,
    getRecordClient 
  } = usePrefacturaSelection(records, getRecordType)

  const handleSelection = (recordId: string, checked: boolean) => {
    const record = records.find(r => getRecordId(r) === recordId)
    if (record) {
      const success = handleRecordSelection(recordId, checked, record, clients)
      if (success) {
        if (checked) {
          onSelectionChange([...selectedIds, recordId])
        } else {
          onSelectionChange(selectedIds.filter(id => id !== recordId))
        }
      }
    }
  }

  const handleSelectAllRecords = (checked: boolean) => {
    handleSelectAll(checked, filteredRecords, clients)
    if (checked) {
      const selectableIds = filteredRecords
        .filter(record => canSelectRecord(record, clients))
        .map(record => getRecordId(record))
      onSelectionChange(selectableIds)
    } else {
      onSelectionChange([])
    }
  }

  const canProceed = selectedIds.length > 0

  return (
    <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-800 text-white rounded-t-lg">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Ship className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold">Paso 1: Selección de Registros</div>
              {records.length > 0 && (
                <Badge variant="secondary" className="mt-1 bg-white/20 text-white border-white/30">
                  {records.length} disponibles
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-slate-200">
              {selectedIds.length} de {filteredRecords.length} seleccionados
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectionChange([])}
              disabled={selectedIds.length === 0}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Limpiar Selección
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {/* Filters */}
        <PrefacturaFilters
          filters={filters}
          onFiltersChange={updateFilters}
          recordCounts={recordCounts}
        />

        {/* Selection rules notice */}
        {selectedIds.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold">Reglas de selección activas:</p>
                <ul className="mt-1 list-disc list-inside space-y-0.5">
                  <li>Solo se pueden seleccionar registros del mismo cliente</li>
                  <li>Solo se pueden seleccionar registros del mismo tipo (Local o Trasiego)</li>
                  <li>Solo se pueden seleccionar registros con estado "Completado"</li>
                  <li>No se pueden seleccionar registros ya prefacturados</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-6">
          <PrefacturaTable
            records={filteredRecords}
            selectedIds={selectedIds}
            onSelectionChange={handleSelection}
            onSelectAll={handleSelectAllRecords}
            onRecordView={onRecordView}
            onRecordEdit={onRecordEdit}
            onRecordDelete={onRecordDelete}
            canSelectRecord={(record) => canSelectRecord(record, clients)}
            getRecordId={getRecordId}
            getRecordType={getRecordType}
            getRecordClient={(record) => getRecordClient(record, clients)}
          />
        </div>

        {/* Summary and next button */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {selectedIds.length > 0 && (
              <div className="text-sm text-muted-foreground">
                <p>Registros seleccionados: {selectedIds.length}</p>
                {selectedIds.length > 0 && filteredRecords.length > 0 && (
                  <p className="mt-1">
                    Cliente: {getRecordClient(
                      filteredRecords.find(r => getRecordId(r) === selectedIds[0]),
                      clients
                    )?.companyName || getRecordClient(
                      filteredRecords.find(r => getRecordId(r) === selectedIds[0]),
                      clients
                    )?.fullName || "N/A"}
                  </p>
                )}
              </div>
            )}
          </div>
          <Button
            onClick={onNext}
            disabled={!canProceed}
            size="lg"
            className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900"
          >
            Continuar al Paso 2
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}