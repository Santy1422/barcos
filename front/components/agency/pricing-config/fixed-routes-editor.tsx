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
import { Plus, Trash2, Edit, Save, X, MapPin } from "lucide-react"
import type { FixedRoute } from "@/lib/features/agencyServices/agencyPricingConfigSlice"

interface FixedRoutesEditorProps {
  routes: FixedRoute[]
  onChange: (routes: FixedRoute[]) => void
  disabled?: boolean
}

export function FixedRoutesEditor({
  routes,
  onChange,
  disabled = false
}: FixedRoutesEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<FixedRoute>({
    from: '',
    to: '',
    price: 0,
    sapCode: ''
  })
  const [showAddForm, setShowAddForm] = useState(false)

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditForm({ ...routes[index] })
    setShowAddForm(false)
  }

  const handleSave = () => {
    if (editingIndex !== null) {
      const newRoutes = [...routes]
      newRoutes[editingIndex] = editForm
      onChange(newRoutes)
      setEditingIndex(null)
      setEditForm({ from: '', to: '', price: 0 })
    }
  }

  const handleCancel = () => {
    setEditingIndex(null)
    setEditForm({ from: '', to: '', price: 0 })
  }

  const handleDelete = (index: number) => {
    const newRoutes = routes.filter((_, i) => i !== index)
    onChange(newRoutes)
  }

  const handleAdd = () => {
    if (editForm.from && editForm.to && editForm.price > 0) {
      onChange([...routes, {
        ...editForm,
        from: editForm.from.toUpperCase(),
        to: editForm.to.toUpperCase()
      }])
      setEditForm({ from: '', to: '', price: 0 })
      setShowAddForm(false)
    }
  }

  const COMMON_LOCATIONS = [
    'HOTEL PTY', 'PTY PORT', 'TOCUMEN AIRPORT', 'CRISTOBAL PORT',
    'HOTEL RADISSON COLON', 'COLON PORT', 'HOSPITAL PTY', 'HOSPITAL COLON'
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Rutas con Precio Fijo
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Defina precios específicos para rutas frecuentes
            </p>
          </div>
          {!disabled && (
            <Button
              size="sm"
              onClick={() => {
                setShowAddForm(true)
                setEditingIndex(null)
                setEditForm({ from: '', to: '', price: 0 })
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Ruta
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {routes.length === 0 && !showAddForm ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay rutas fijas configuradas.
            <br />
            Las rutas fijas tienen prioridad sobre el cálculo por distancia.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Código SAP</TableHead>
                {!disabled && <TableHead>Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {routes.map((route, index) => (
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
                          list="locations-from"
                        />
                        <datalist id="locations-from">
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
                          list="locations-to"
                        />
                        <datalist id="locations-to">
                          {COMMON_LOCATIONS.map(loc => (
                            <option key={loc} value={loc} />
                          ))}
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            price: Number(e.target.value)
                          })}
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editForm.sapCode || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            sapCode: e.target.value.toUpperCase()
                          })}
                          placeholder="ECR000669"
                          className="w-32"
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
                      <TableCell className="font-medium">{route.from}</TableCell>
                      <TableCell className="font-medium">{route.to}</TableCell>
                      <TableCell>${route.price}</TableCell>
                      <TableCell>{route.sapCode || '-'}</TableCell>
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
                      list="locations-from-add"
                    />
                    <datalist id="locations-from-add">
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
                      list="locations-to-add"
                    />
                    <datalist id="locations-to-add">
                      {COMMON_LOCATIONS.map(loc => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        price: Number(e.target.value)
                      })}
                      className="w-24"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      value={editForm.sapCode || ''}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        sapCode: e.target.value.toUpperCase()
                      })}
                      placeholder="ECR000669"
                      className="w-32"
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