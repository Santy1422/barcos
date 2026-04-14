"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Car, Plus, Edit, Trash2, Search } from "lucide-react"
import { useAgencyVehicleTypes } from "@/lib/features/agencyServices/useAgencyVehicleTypes"
import { useToast } from "@/hooks/use-toast"
import type { AgencyVehicleType } from "@/lib/features/agencyServices/agencyVehicleTypesSlice"

export function AgencyVehicleTypesManagement() {
  const { toast } = useToast()
  const {
    vehicleTypes,
    loading,
    error,
    isCreating,
    isUpdating,
    isDeleting,
    fetchVehicleTypes,
    createVehicleType,
    updateVehicleType,
    deleteVehicleType,
    clearError,
  } = useAgencyVehicleTypes()

  const [searchTerm, setSearchTerm] = useState("")
  const [showFormModal, setShowFormModal] = useState(false)
  const [editing, setEditing] = useState<AgencyVehicleType | null>(null)
  const [formName, setFormName] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formActive, setFormActive] = useState(true)

  useEffect(() => {
    fetchVehicleTypes()
  }, [fetchVehicleTypes])

  useEffect(() => {
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" })
      clearError()
    }
  }, [error, toast, clearError])

  const openCreate = () => {
    setEditing(null)
    setFormName("")
    setFormDescription("")
    setFormActive(true)
    setShowFormModal(true)
  }

  const openEdit = (vt: AgencyVehicleType) => {
    setEditing(vt)
    setFormName(vt.name)
    setFormDescription(vt.description || "")
    setFormActive(vt.isActive)
    setShowFormModal(true)
  }

  const closeModal = () => {
    setShowFormModal(false)
    setEditing(null)
  }

  const handleSave = async () => {
    const name = formName.trim()
    if (!name) {
      toast({ title: "Validation", description: "Name is required.", variant: "destructive" })
      return
    }
    try {
      if (editing) {
        await updateVehicleType(editing._id, {
          name,
          // Always send description on update so clearing the field persists (JSON omits `undefined`)
          description: formDescription.trim(),
          isActive: formActive,
        }).unwrap()
        toast({ title: "Saved", description: "Vehicle type updated." })
      } else {
        await createVehicleType({
          name,
          description: formDescription.trim() || undefined,
          isActive: formActive,
        }).unwrap()
        toast({ title: "Created", description: "Vehicle type created." })
      }
      closeModal()
    } catch {
      /* error surfaced via slice + toast */
    }
  }

  const handleDelete = async (vt: AgencyVehicleType) => {
    if (!confirm(`Delete vehicle type "${vt.name}"? This cannot be undone.`)) return
    try {
      await deleteVehicleType(vt._id).unwrap()
      toast({ title: "Deleted", description: "Vehicle type removed." })
    } catch {
      /* toast via slice */
    }
  }

  const filtered = vehicleTypes.filter(
    (v) =>
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5" />
              Vehicle Types
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage vehicle categories used across agency services.
            </p>
          </div>
          <Button onClick={openCreate} disabled={isCreating}>
            <Plus className="h-4 w-4 mr-2" />
            Add vehicle type
          </Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading && vehicleTypes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((vt) => (
                  <TableRow key={vt._id}>
                    <TableCell className="font-medium">{vt.name}</TableCell>
                    <TableCell className="text-muted-foreground max-w-xs truncate">
                      {vt.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={vt.isActive ? "default" : "secondary"}>
                        {vt.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(vt)}
                          title="Edit"
                          disabled={isUpdating}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(vt)}
                          title="Delete"
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      No vehicle types found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={showFormModal} onOpenChange={(open) => !open && closeModal()}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit vehicle type" : "New vehicle type"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="vt-name">Name *</Label>
                <Input
                  id="vt-name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Van, SUV"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vt-desc">Description</Label>
                <Input
                  id="vt-desc"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="vt-active"
                  checked={formActive}
                  onCheckedChange={(c) => setFormActive(c === true)}
                />
                <Label htmlFor="vt-active" className="text-sm font-normal cursor-pointer">
                  Active
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSave} disabled={isCreating || isUpdating}>
                {editing ? "Save changes" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
