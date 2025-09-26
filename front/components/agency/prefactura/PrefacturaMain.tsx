"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { StepSelector } from "./steps/StepSelector"
import { PrefacturaData } from "./types"
import { 
  selectRecordsByModule,
  selectRecordsLoading,
  fetchRecordsByModule,
  deleteRecordAsync,
  updateRecordAsync,
  type ExcelRecord as IndividualExcelRecord
} from "@/lib/features/records/recordsSlice"
import { selectAllClients, fetchClients } from "@/lib/features/clients/clientsSlice"
import { selectActiveNavieras, fetchNavieras } from "@/lib/features/naviera/navieraSlice"
import { selectServicesByModule, fetchServices, selectServicesLoading } from "@/lib/features/services/servicesSlice"
import { selectAllLocalServices, selectLocalServicesLoading, fetchLocalServices } from "@/lib/features/localServices/localServicesSlice"

export function PrefacturaMain() {
  const dispatch = useAppDispatch()
  const { toast } = useToast()
  
  // Redux selectors
  const ptyssRecords = useAppSelector((state) =>
    selectRecordsByModule(state, "ptyss")
  )
  const isLoadingRecords = useAppSelector(selectRecordsLoading)
  const clients = useAppSelector(selectAllClients)
  const navieras = useAppSelector(selectActiveNavieras)
  const additionalServices = useAppSelector((state) => selectServicesByModule(state, "ptyss"))
  const servicesLoading = useAppSelector(selectServicesLoading)
  const localServices = useAppSelector(selectAllLocalServices)
  const localServicesLoading = useAppSelector(selectLocalServicesLoading)
  
  // Local state
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedRecordIds, setSelectedRecordIds] = useState<string[]>([])
  const [selectedRecordForView, setSelectedRecordForView] = useState<IndividualExcelRecord | null>(null)
  const [selectedRecordForEdit, setSelectedRecordForEdit] = useState<IndividualExcelRecord | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null)
  const [prefacturaData, setPrefacturaData] = useState<PrefacturaData>({
    prefacturaNumber: `PTY-PRE-${Date.now().toString().slice(-5)}`,
    notes: ""
  })

  // Load initial data
  useEffect(() => {
    if (ptyssRecords.length === 0 && !isLoadingRecords) {
      dispatch(fetchRecordsByModule("ptyss"))
    }
    if (clients.length === 0) {
      dispatch(fetchClients())
    }
    if (navieras.length === 0) {
      dispatch(fetchNavieras())
    }
    if (additionalServices.length === 0 && !servicesLoading) {
      dispatch(fetchServices("ptyss"))
    }
    if (localServices.length === 0 && !localServicesLoading) {
      dispatch(fetchLocalServices())
    }
  }, [dispatch, ptyssRecords.length, clients.length, navieras.length, 
      additionalServices.length, localServices.length, isLoadingRecords, 
      servicesLoading, localServicesLoading])

  const handleRecordView = (record: IndividualExcelRecord) => {
    setSelectedRecordForView(record)
  }

  const handleRecordEdit = (record: IndividualExcelRecord) => {
    setSelectedRecordForEdit(record)
  }

  const handleRecordDelete = async (recordId: string) => {
    setRecordToDelete(recordId)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!recordToDelete) return

    try {
      await dispatch(deleteRecordAsync(recordToDelete)).unwrap()
      toast({
        title: "Registro eliminado",
        description: "El registro ha sido eliminado exitosamente",
      })
      setSelectedRecordIds(prev => prev.filter(id => id !== recordToDelete))
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el registro",
        variant: "destructive",
      })
    } finally {
      setIsDeleteModalOpen(false)
      setRecordToDelete(null)
    }
  }

  const handleUpdateRecord = async (recordId: string, updates: any) => {
    try {
      await dispatch(updateRecordAsync({ id: recordId, ...updates })).unwrap()
      toast({
        title: "Registro actualizado",
        description: "Los cambios han sido guardados exitosamente",
      })
      setSelectedRecordForEdit(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar el registro",
        variant: "destructive",
      })
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Show loading state
  if (isLoadingRecords) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando registros...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen p-4">
      {/* Step indicator */}
      <div className="flex justify-center mb-6">
        <div className="flex items-center gap-4">
          {[1, 2, 3].map((step) => (
            <div
              key={step}
              className={`flex items-center ${step !== 3 ? "mr-8" : ""}`}
            >
              <div
                className={`
                  flex items-center justify-center w-10 h-10 rounded-full font-bold
                  ${currentStep >= step 
                    ? "bg-slate-700 text-white" 
                    : "bg-gray-300 text-gray-600"
                  }
                `}
              >
                {step}
              </div>
              {step !== 3 && (
                <div
                  className={`
                    h-1 w-24 ml-2
                    ${currentStep > step 
                      ? "bg-slate-700" 
                      : "bg-gray-300"
                    }
                  `}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      {currentStep === 1 && (
        <StepSelector
          records={ptyssRecords}
          clients={clients}
          onNext={handleNext}
          selectedIds={selectedRecordIds}
          onSelectionChange={setSelectedRecordIds}
          onRecordView={handleRecordView}
          onRecordEdit={handleRecordEdit}
          onRecordDelete={handleRecordDelete}
        />
      )}

      {currentStep === 2 && (
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Paso 2: Revisión y Servicios Adicionales</h2>
          <p className="text-muted-foreground mb-8">
            Este componente será implementado en StepReview.tsx
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={handleBack}
              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Volver
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Continuar
            </button>
          </div>
        </div>
      )}

      {currentStep === 3 && (
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Paso 3: Generación de Prefactura</h2>
          <p className="text-muted-foreground mb-8">
            Este componente será implementado en StepGenerate.tsx
          </p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Volver
          </button>
        </div>
      )}

      {/* View Modal */}
      {selectedRecordForView && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
            <h3 className="text-lg font-bold mb-4">Detalles del Registro</h3>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {JSON.stringify(selectedRecordForView, null, 2)}
            </pre>
            <button
              onClick={() => setSelectedRecordForView(null)}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedRecordForEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-2xl w-full">
            <h3 className="text-lg font-bold mb-4">Editar Registro</h3>
            <p className="text-muted-foreground mb-4">
              Funcionalidad de edición será implementada próximamente
            </p>
            <button
              onClick={() => setSelectedRecordForEdit(null)}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Confirmar Eliminación</h3>
            <p className="text-muted-foreground mb-6">
              ¿Está seguro que desea eliminar este registro? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false)
                  setRecordToDelete(null)
                }}
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}