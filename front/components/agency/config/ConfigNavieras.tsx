"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Edit2, Trash2, Save, X, Ship } from "lucide-react"
import { NavieraFormData } from "./types"

interface ConfigNavierasProps {
  navieras: any[]
  onAdd: (data: NavieraFormData) => void
  onUpdate: (id: string, data: Partial<NavieraFormData>) => void
  onDelete: (id: string) => void
}

export function ConfigNavieras({ navieras, onAdd, onUpdate, onDelete }: ConfigNavierasProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<NavieraFormData>({
    name: "",
    code: "",
    description: "",
    contact: "",
    email: "",
    phone: ""
  })

  const handleSubmit = async () => {
    if (editingId) {
      await onUpdate(editingId, formData)
      setEditingId(null)
    } else {
      await onAdd(formData)
      setIsAdding(false)
    }
    resetForm()
  }

  const handleEdit = (naviera: any) => {
    setEditingId(naviera._id)
    setFormData({
      name: naviera.name,
      code: naviera.code || "",
      description: naviera.description || "",
      contact: naviera.contact || "",
      email: naviera.email || "",
      phone: naviera.phone || ""
    })
  }

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
      contact: "",
      email: "",
      phone: ""
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    resetForm()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Navieras</h3>
          <p className="text-sm text-muted-foreground">
            Administra las navieras disponibles para los servicios
          </p>
        </div>
        {!isAdding && !editingId && (
          <Button onClick={() => setIsAdding(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Naviera
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              {editingId ? "Editar Naviera" : "Nueva Naviera"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre de la naviera"
                />
              </div>
              <div>
                <Label>Código</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Código único"
                />
              </div>
              <div className="col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción de la naviera"
                  rows={3}
                />
              </div>
              <div>
                <Label>Contacto</Label>
                <Input
                  value={formData.contact}
                  onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  placeholder="Nombre del contacto"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+507 0000-0000"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={cancelEdit}>
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name}
                className="bg-green-600 hover:bg-green-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {editingId ? "Actualizar" : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navieras Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {navieras.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay navieras registradas
                  </TableCell>
                </TableRow>
              ) : (
                navieras.map((naviera) => (
                  <TableRow key={naviera._id}>
                    <TableCell className="font-medium">{naviera.name}</TableCell>
                    <TableCell>{naviera.code || "-"}</TableCell>
                    <TableCell>{naviera.contact || "-"}</TableCell>
                    <TableCell>{naviera.email || "-"}</TableCell>
                    <TableCell>{naviera.phone || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        naviera.active !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {naviera.active !== false ? "Activa" : "Inactiva"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(naviera)}
                          disabled={editingId !== null}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(naviera._id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}