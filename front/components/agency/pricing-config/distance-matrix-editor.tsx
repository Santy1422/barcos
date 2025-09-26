"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Edit, Save, X, Navigation } from "lucide-react"
import type { DistanceMatrixEntry } from "@/lib/features/agencyServices/agencyPricingConfigSlice"

interface DistanceMatrixEditorProps {
  matrix: DistanceMatrixEntry[]
  onChange: (matrix: DistanceMatrixEntry[]) => void
  disabled?: boolean
}

export function DistanceMatrixEditor({
  matrix,
  onChange,
  disabled = false
}: DistanceMatrixEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<DistanceMatrixEntry>({
    from: '',
    to: '',
    distance: 0,
    estimatedTime: 0,
    tollCost: 0
  })
  const [showAddForm, setShowAddForm] = useState(false)

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditForm({ ...matrix[index] })
    setShowAddForm(false)
  }

  const handleSave = () => {
    if (editingIndex !== null) {
      const newMatrix = [...matrix]
      newMatrix[editingIndex] = editForm
      onChange(newMatrix)
      setEditingIndex(null)
      setEditForm({ from: '', to: '', distance: 0 })
    }
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setEditForm({ from: '', to: '', distance: 0 })
  }

  const handleDelete = (index: number) => {
    const newMatrix = matrix.filter((_, i) => i !== index)
    onChange(newMatrix)
  }

  const handleAdd = () => {
    if (editForm.from && editForm.to && editForm.distance > 0) {
      onChange([...matrix, {
        ...editForm,
        from: editForm.from.toUpperCase(),
        to: editForm.to.toUpperCase()
      }])
      setEditForm({ from: '', to: '', distance: 0 })
      setShowAddForm(false)
    }
  }

  const COMMON_LOCATIONS = [
    'HOTEL PTY', 'PTY PORT', 'TOCUMEN AIRPORT', 'CRISTOBAL PORT',
    'HOTEL RADISSON COLON', 'COLON PORT', 'HOSPITAL PTY', 'HOSPITAL COLON',
    'BOAT LANDING PTY', 'PTY'
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Navigation className="h-5 w-5" />
              Matriz de Distancias
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Configure las distancias entre ubicaciones para el cálculo automático
            </p>
          </div>
          {!disabled && (
            <Button
              size="sm"
              onClick={() => {
                setShowAddForm(true)
                setEditingIndex(null)
                setEditForm({ from: '', to: '', distance: 0 })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Distancia
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {matrix.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay distancias configuradas.
            <br />
            El sistema estimará distancias basándose en los nombres de las ubicaciones.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Distancia (km)</TableHead>
                <TableHead>Tiempo Est. (min)</TableHead>
                <TableHead>Peaje</TableHead>
                {!disabled && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((entry, index) => (
                <TableRow key={index}>
                  {editingIndex === index ? (
                    <>
                      <TableCell>
                        <Input
                          value={editForm.from}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            from: e.target.value.toUpperCase()
                          })}
                          placeholder="HOTEL PTY"
                          list="matrix-from"
                        />
                        <datalist id="matrix-from">
                          {COMMON_LOCATIONS.map(loc => (
                            <option key={loc} value={loc} />
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.to}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            to: e.target.value.toUpperCase()
                          })}
                          placeholder="PTY PORT"
                          list="matrix-to"
                        />
                        <datalist id="matrix-to">
                          {COMMON_LOCATIONS.map(loc => (
                            <option key={loc} value={loc} />
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.distance}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            distance: Number(e.target.value)
                          })}
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.estimatedTime || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            estimatedTime: e.target.value ? Number(e.target.value) : undefined
                          })}
                          className="w-20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.tollCost || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            tollCost: e.target.value ? Number(e.target.value) : undefined
                          })}
                          className="w-20"
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleSave}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={handleCancel}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">{entry.from}</TableCell>
                      <TableCell className="font-medium">{entry.to}</TableCell>
                      <TableCell>{entry.distance} km</TableCell>
                      <TableCell>{entry.estimatedTime ? `${entry.estimatedTime} min` : '-'}</TableCell>
                      <TableCell>{entry.tollCost ? `$${entry.tollCost}` : '-'}</TableCell>
                      {!disabled && (
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleEdit(index)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDelete(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </>
                  )}
                </TableRow>
              ))}
              {showAddForm && (
                <TableRow>
                  <TableCell>
                    <Input
                      value={editForm.from}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        from: e.target.value.toUpperCase()
                      })}
                      placeholder="HOTEL PTY"
                      list="matrix-from-add"
                    />
                    <datalist id="matrix-from-add">
                      {COMMON_LOCATIONS.map(loc => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.to}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        to: e.target.value.toUpperCase()
                      })}
                      placeholder="PTY PORT"
                      list="matrix-to-add"
                    />
                    <datalist id="matrix-to-add">
                      {COMMON_LOCATIONS.map(loc => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editForm.distance}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        distance: Number(e.target.value)
                      })}
                      className="w-20"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editForm.estimatedTime || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        estimatedTime: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="w-20"
                      placeholder="Min"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={editForm.tollCost || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        tollCost: e.target.value ? Number(e.target.value) : undefined
                      })}
                      className="w-20"
                      placeholder="$"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleAdd}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setShowAddForm(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}