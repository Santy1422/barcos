"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { 
  selectAllUsers, 
  selectCurrentUser, 
  addUser, 
  updateUser, 
  deleteUser,
  type User,
  type UserRole,
  hasPermission
} from "@/lib/features/auth/authSlice"
import { UserPlus, Edit, Trash2, Shield, Users, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"

const roleLabels: Record<UserRole, string> = {
  "administrador": "Administrador",
  "operaciones": "Operaciones",
  "facturacion": "Facturación"
}

const roleColors: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
  "administrador": "destructive",
  "operaciones": "default",
  "facturacion": "secondary"
}

export function UsersManagement() {
  const dispatch = useAppDispatch()
  const users = useAppSelector(selectAllUsers)
  const currentUser = useAppSelector(selectCurrentUser)
  const { toast } = useToast()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    role: "facturacion" as UserRole,
    isActive: true
  })

  // Verificar permisos
  const canManageUsers = currentUser && hasPermission(currentUser.role, "administrador")

  if (!canManageUsers) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No tienes permisos para gestionar usuarios. Solo los administradores pueden acceder a esta función.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  const resetForm = () => {
    setFormData({
      username: "",
      email: "",
      fullName: "",
      role: "facturacion",
      isActive: true
    })
    setEditingUser(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.username || !formData.email || !formData.fullName) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      })
      return
    }

    // Verificar username único
    const existingUser = users.find(u => 
      u.username === formData.username && 
      (!editingUser || u.id !== editingUser.id)
    )
    
    if (existingUser) {
      toast({
        title: "Error",
        description: "El nombre de usuario ya existe",
        variant: "destructive"
      })
      return
    }

    if (editingUser) {
      dispatch(updateUser({ id: editingUser.id, updates: formData }))
      toast({
        title: "Usuario actualizado",
        description: `El usuario ${formData.username} ha sido actualizado correctamente`
      })
    } else {
      dispatch(addUser(formData))
      toast({
        title: "Usuario creado",
        description: `El usuario ${formData.username} ha sido creado correctamente`
      })
    }

    setShowCreateDialog(false)
    resetForm()
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive
    })
    setShowCreateDialog(true)
  }

  const handleDelete = (userId: string) => {
    if (userId === currentUser?.id) {
      toast({
        title: "Error",
        description: "No puedes eliminar tu propio usuario",
        variant: "destructive"
      })
      return
    }

    dispatch(deleteUser(userId))
    toast({
      title: "Usuario eliminado",
      description: "El usuario ha sido eliminado correctamente"
    })
  }

  const handleToggleStatus = (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Error",
        description: "No puedes desactivar tu propio usuario",
        variant: "destructive"
      })
      return
    }

    dispatch(updateUser({ 
      id: user.id, 
      updates: { isActive: !user.isActive } 
    }))
    
    toast({
      title: user.isActive ? "Usuario desactivado" : "Usuario activado",
      description: `El usuario ${user.username} ha sido ${user.isActive ? 'desactivado' : 'activado'}`
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gestión de Usuarios
              </CardTitle>
              <CardDescription>
                Administra los usuarios del sistema y sus roles
              </CardDescription>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={resetForm}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingUser ? "Editar Usuario" : "Crear Nuevo Usuario"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingUser 
                      ? "Modifica la información del usuario" 
                      : "Completa la información para crear un nuevo usuario"
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Usuario</Label>
                      <Input
                        id="username"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="nombre_usuario"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="usuario@empresa.com"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Nombre y Apellido"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select value={formData.role} onValueChange={(value: UserRole) => setFormData(prev => ({ ...prev, role: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facturacion">Facturación</SelectItem>
                        <SelectItem value="operaciones">Operaciones</SelectItem>
                        <SelectItem value="administrador">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label htmlFor="isActive">Usuario activo</Label>
                  </div>
                  
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingUser ? "Actualizar" : "Crear"} Usuario
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último Acceso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.username}</TableCell>
                  <TableCell>{user.fullName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={roleColors[user.role]}>
                      {roleLabels[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.isActive ? (
                        <>
                          <Eye className="h-4 w-4 text-green-600" />
                          <span className="text-green-600">Activo</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-400">Inactivo</span>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin 
                      ? new Date(user.lastLogin).toLocaleDateString()
                      : "Nunca"
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(user)}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        disabled={user.id === currentUser?.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}