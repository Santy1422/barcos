"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Edit, Save, X } from "lucide-react"
import type { DistanceRate } from "@/lib/features/agencyServices/agencyPricingConfigSlice"

interface DistanceRatesEditorProps {
  rates: DistanceRate[]
  onChange: (rates: DistanceRate[]) => void
  disabled?: boolean
}

export function DistanceRatesEditor({
  rates,
  onChange,
  disabled = false
}: DistanceRatesEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<DistanceRate>({
    minKm: 0,
    maxKm: 0,
    ratePerKm: 0,
    fixedPrice: undefined
  })
  const [showAddForm, setShowAddForm] = useState(false)

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditForm({ ...rates[index] })
    setShowAddForm(false)
  }

  const handleSave = () => {
    if (editingIndex !== null) {
      const newRates = [...rates]
      newRates[editingIndex] = editForm
      onChange(newRates)
      setEditingIndex(null)
      setEditForm({ minKm: 0, maxKm: 0, ratePerKm: 0 })
    }
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setEditForm({ minKm: 0, maxKm: 0, ratePerKm: 0 })
  }

  const handleDelete = (index: number) => {
    const newRates = rates.filter((_, i) => i !== index)
    onChange(newRates)
  }

  const handleAdd = () => {
    if (editForm.maxKm > editForm.minKm && (editForm.ratePerKm > 0 || editForm.fixedPrice)) {
      onChange([...rates, editForm])
      setEditForm({ minKm: 0, maxKm: 0, ratePerKm: 0 })
      setShowAddForm(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Tarifas por Distancia</CardTitle>
          {!disabled && (
            <Button
              size="sm"
              onClick={() => {
                setShowAddForm(true)
                setEditingIndex(null)
                const lastRate = rates[rates.length - 1]
                setEditForm({
                  minKm: lastRate ? lastRate.maxKm + 1 : 0,
                  maxKm: lastRate ? lastRate.maxKm + 50 : 50,
                  ratePerKm: 0,
                  fixedPrice: undefined
                })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Rango
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Desde (km)</TableHead>
              <TableHead>Hasta (km)</TableHead>
              <TableHead>Tarifa por km</TableHead>
              <TableHead>Precio Fijo</TableHead>
              <TableHead>Ejemplo (50km)</TableHead>
              {!disabled && <TableHead>Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rates.map((rate, index) => (
              <TableRow key={index}>
                {editingIndex === index ? (
                  <>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm.minKm}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          minKm: Number(e.target.value)
                        })}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm.maxKm}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          maxKm: Number(e.target.value)
                        })}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={editForm.ratePerKm}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          ratePerKm: Number(e.target.value)
                        })}
                        className="w-24"
                        placeholder="$/km"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={editForm.fixedPrice || ''}
                        onChange={(e) => setEditForm({
                          ...editForm,
                          fixedPrice: e.target.value ? Number(e.target.value) : undefined
                        })}
                        className="w-24"
                        placeholder="Opcional"
                      />
                    </TableCell>
                    <TableCell>
                      ${editForm.fixedPrice || (editForm.ratePerKm * 50)}
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
                    <TableCell>{rate.minKm} km</TableCell>
                    <TableCell>
                      {rate.maxKm === 999 ? '∞' : `${rate.maxKm} km`}
                    </TableCell>
                    <TableCell>${rate.ratePerKm}/km</TableCell>
                    <TableCell>
                      {rate.fixedPrice ? `$${rate.fixedPrice}` : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${rate.fixedPrice || (rate.ratePerKm * Math.min(50, rate.maxKm))}
                    </TableCell>
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
                    type="number"
                    value={editForm.minKm}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      minKm: Number(e.target.value)
                    })}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={editForm.maxKm}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      maxKm: Number(e.target.value)
                    })}
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={editForm.ratePerKm}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      ratePerKm: Number(e.target.value)
                    })}
                    className="w-24"
                    placeholder="$/km"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={editForm.fixedPrice || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      fixedPrice: e.target.value ? Number(e.target.value) : undefined
                    })}
                    className="w-24"
                    placeholder="Opcional"
                  />
                </TableCell>
                <TableCell>
                  ${editForm.fixedPrice || (editForm.ratePerKm * 50)}
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
      </CardContent>
    </Card>
  )
}