"use client"

import { useState, useEffect } from "react"
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
  selectUsersLoading,
  fetchAllUsersAsync,
  updateUserAsync,
  deleteUserAsync,
  createUserAsync,
  type User,
  type UserRole,
  type UserModule,
  hasPermission
} from "@/lib/features/auth/authSlice"
import { UserPlus, Edit, Trash2, Shield, Users, Eye, EyeOff, CheckSquare, Square } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"

const roleLabels: Record<UserRole, string> = {
  "administrador": "Administrador",
  "operaciones": "Operaciones",
  "facturacion": "Facturación",
  "pendiente": "Pendiente"
}

const roleColors: Record<UserRole, "default" | "secondary" | "destructive" | "outline"> = {
  "administrador": "destructive",
  "operaciones": "default",
  "facturacion": "secondary",
  "pendiente": "outline"
}

const moduleLabels: Record<UserModule, string> = {
  "trucking": "PTG",
  "shipchandler": "PTYSS",
  "agency": "Agency"
}

export function UsersManagement() {
  const dispatch = useAppDispatch()
  const users = useAppSelector(selectAllUsers)
  const currentUser = useAppSelector(selectCurrentUser)
  const isLoadingUsers = useAppSelector(selectUsersLoading)
  const { toast } = useToast()
  
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [hasLoadedUsers, setHasLoadedUsers] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    fullName: "",
    password: "",
    roles: [] as UserRole[],
    modules: [] as UserModule[],
    isActive: true
  })

  // Cargar usuarios al montar el componente - SOLO UNA VEZ
  useEffect(() => {
    if (currentUser?.role === "administrador" && !hasLoadedUsers) {
      console.log('👥 UsersManagement - Fetching users...')
      setHasLoadedUsers(true)
      dispatch(fetchAllUsersAsync())
    }
  }, [currentUser, hasLoadedUsers, dispatch])

  // Verificar permisos
  const canManageUsers = currentUser && hasPermission(currentUser, "administrador")

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
      password: "",
      roles: [],
      modules: [],
      isActive: true
    })
    setEditingUser(null)
  }
  
  const toggleRole = (role: UserRole) => {
    setFormData(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role]
    }))
  }

  const toggleModule = (module: UserModule) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(module)
        ? prev.modules.filter(m => m !== module)
        : [...prev.modules, module]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.username || !formData.email || !formData.fullName) {
      toast({
        title: "Error",
        description: "Todos los campos son requeridos",
        variant: "destructive"
      })
      return
    }

    if (editingUser) {
      // Actualizar usuario existente
      try {
        await dispatch(updateUserAsync({ 
          id: editingUser.id, 
          updates: formData 
        })).unwrap()
        
        toast({
          title: "Usuario actualizado",
          description: `El usuario ${formData.username} ha sido actualizado correctamente`
        })
        
        setShowCreateDialog(false)
        resetForm()
        
        // Recargar lista de usuarios
        dispatch(fetchAllUsersAsync())
      } catch (error: any) {
        toast({
          title: "Error",
          description: error || "Error al actualizar el usuario",
          variant: "destructive"
        })
      }
    } else {
      // Crear nuevo usuario
      if (!formData.password) {
        toast({
          title: "Error",
          description: "La contraseña es requerida para crear un nuevo usuario",
          variant: "destructive"
        })
        return
      }
      
      if (formData.password.length < 6) {
        toast({
          title: "Error",
          description: "La contraseña debe tener al menos 6 caracteres",
          variant: "destructive"
        })
        return
      }
      
      try {
        await dispatch(createUserAsync({
          username: formData.username,
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          roles: formData.roles,
          modules: formData.modules,
          isActive: formData.isActive
        })).unwrap()
        
        toast({
          title: "Usuario creado",
          description: `El usuario ${formData.username} ha sido creado correctamente`
        })
        
        setShowCreateDialog(false)
        resetForm()
      } catch (error: any) {
        toast({
          title: "Error al crear usuario",
          description: error || "Error al crear el usuario",
          variant: "destructive"
        })
      }
    }
  }

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username || "",
      email: user.email,
      fullName: user.fullName || user.name,
      password: "", // No mostrar la contraseña al editar
      roles: user.roles || (user.role ? [user.role] : []), // Convertir role único a array para compatibilidad
      modules: user.modules || [],
      isActive: user.isActive ?? true
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
    setUserToDelete(userId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!userToDelete) return

    try {
      await dispatch(deleteUserAsync(userToDelete)).unwrap()
      toast({
        title: "Usuario eliminado",
        description: "El usuario ha sido eliminado correctamente"
      })
      setShowDeleteDialog(false)
      setUserToDelete(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Error al eliminar el usuario",
        variant: "destructive"
      })
    }
  }

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast({
        title: "Error",
        description: "No puedes desactivar tu propio usuario",
        variant: "destructive"
      })
      return
    }

    try {
      await dispatch(updateUserAsync({ 
        id: user.id, 
        updates: { isActive: !user.isActive } 
      })).unwrap()
      
      toast({
        title: user.isActive ? "Usuario desactivado" : "Usuario activado",
        description: `El usuario ${user.username || user.email} ha sido ${user.isActive ? 'desactivado' : 'activado'}`
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error || "Error al cambiar el estado del usuario",
        variant: "destructive"
      })
    }
  }

  const toggleUserSelection = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.filter(u => u.id !== currentUser?.id).length) {
      setSelectedUsers(new Set())
    } else {
      const allUserIds = new Set(users.filter(u => u.id !== currentUser?.id).map(u => u.id))
      setSelectedUsers(allUserIds)
    }
  }

  const handleDeleteSelected = () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "Error",
        description: "No hay usuarios seleccionados",
        variant: "destructive"
      })
      return
    }
    setShowBatchDeleteDialog(true)
  }

  const confirmBatchDelete = async () => {
    let successCount = 0
    let errorCount = 0

    for (const userId of selectedUsers) {
      try {
        await dispatch(deleteUserAsync(userId)).unwrap()
        successCount++
      } catch (error) {
        errorCount++
      }
    }

    setSelectedUsers(new Set())
    setShowBatchDeleteDialog(false)

    if (errorCount === 0) {
      toast({
        title: "Usuarios eliminados",
        description: `Se eliminaron ${successCount} usuario(s) correctamente`
      })
    } else {
      toast({
        title: "Eliminación completada con errores",
        description: `Eliminados: ${successCount} | Errores: ${errorCount}`,
        variant: errorCount > successCount ? "destructive" : "default"
      })
    }
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
                {selectedUsers.size > 0 && (
                  <span className="ml-2 text-primary font-medium">
                    ({selectedUsers.size} seleccionado{selectedUsers.size > 1 ? 's' : ''})
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedUsers.size > 0 && (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar ({selectedUsers.size})
                </Button>
              )}
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
                  
                  {!editingUser && (
                    <div className="space-y-2">
                      <Label htmlFor="password">Contraseña</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Contraseña del usuario"
                      />
                      <p className="text-xs text-muted-foreground">
                        La contraseña debe tener al menos 6 caracteres
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Roles de Usuario</Label>
                    <div className="flex flex-col gap-3 border rounded-lg p-3">
                      {(Object.entries(roleLabels) as [UserRole, string][]).map(([role, label]) => (
                        <div key={role} className="flex items-center space-x-2">
                          <Switch
                            id={`role-${role}`}
                            checked={formData.roles.includes(role)}
                            onCheckedChange={() => toggleRole(role)}
                          />
                          <Label htmlFor={`role-${role}`} className="cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Puedes asignar múltiples roles al mismo usuario
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Módulos de Acceso</Label>
                    <div className="flex flex-wrap gap-2 border rounded-lg p-3">
                      {(Object.entries(moduleLabels) as [UserModule, string][]).map(([module, label]) => (
                        <div key={module} className="flex items-center space-x-2">
                          <Switch
                            id={`module-${module}`}
                            checked={formData.modules.includes(module)}
                            onCheckedChange={() => toggleModule(module)}
                          />
                          <Label htmlFor={`module-${module}`} className="cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Los administradores tienen acceso a todos los módulos automáticamente
                    </p>
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <p className="mt-2 text-sm text-muted-foreground">Cargando usuarios...</p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={toggleSelectAll}
                      title={selectedUsers.size === users.filter(u => u.id !== currentUser?.id).length ? "Deseleccionar todos" : "Seleccionar todos"}
                    >
                      {selectedUsers.size > 0 && selectedUsers.size === users.filter(u => u.id !== currentUser?.id).length ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Nombre Completo</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Módulos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id
                  const isSelected = selectedUsers.has(user.id)
                  
                  return (
                    <TableRow 
                      key={user.id}
                      className={isSelected ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        {!isCurrentUser && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleUserSelection(user.id)}
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-primary" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{user.username || user.email.split('@')[0]}</TableCell>
                  <TableCell>{user.fullName || user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const userRoles = user.roles || (user.role ? [user.role] : [])
                        if (userRoles.length === 0) {
                          return <Badge variant="outline" className="text-xs">Sin rol</Badge>
                        }
                        return userRoles.map((role) => (
                          <Badge key={role} variant={roleColors[role]} className="text-xs">
                            {roleLabels[role]}
                          </Badge>
                        ))
                      })()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(() => {
                        const userRoles = user.roles || (user.role ? [user.role] : [])
                        const isAdmin = userRoles.includes('administrador')
                        
                        if (isAdmin) {
                          return <Badge variant="secondary" className="text-xs">Todos</Badge>
                        }
                        
                        if (user.modules && user.modules.length > 0) {
                          return user.modules.map(module => (
                            <Badge key={module} variant="outline" className="text-xs">
                              {moduleLabels[module]}
                            </Badge>
                          ))
                        }
                        
                        return <span className="text-xs text-muted-foreground">Ninguno</span>
                      })()}
                    </div>
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
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de confirmación para eliminar usuario individual */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar este usuario?
              <br />
              <span className="font-semibold text-destructive">Esta acción no se puede deshacer.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false)
                setUserToDelete(null)
              }}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmación para eliminación múltiple */}
      <Dialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación múltiple</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar <span className="font-bold text-destructive">{selectedUsers.size} usuario(s)</span>?
              <br />
              <br />
              <span className="font-semibold text-destructive">Esta acción no se puede deshacer.</span>
              <br />
              <br />
              Usuarios que serán eliminados:
              <ul className="mt-2 ml-4 list-disc text-sm">
                {Array.from(selectedUsers).slice(0, 5).map(userId => {
                  const user = users.find(u => u.id === userId)
                  return user ? (
                    <li key={userId} className="text-foreground">
                      {user.username || user.email} ({user.email})
                    </li>
                  ) : null
                })}
                {selectedUsers.size > 5 && (
                  <li className="text-muted-foreground">
                    ...y {selectedUsers.size - 5} más
                  </li>
                )}
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowBatchDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmBatchDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar {selectedUsers.size} Usuario(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}