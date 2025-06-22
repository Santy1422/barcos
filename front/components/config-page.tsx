"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { AlertCircle, Bell, Save, Server, Settings, User, Users } from "lucide-react"

export function ConfigPage() {
  const [sapEnabled, setSapEnabled] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [autoValidation, setAutoValidation] = useState(true)
  const [debugMode, setDebugMode] = useState(false)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Configuración</h1>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 md:w-auto md:inline-grid">
          <TabsTrigger value="general">
            <Settings className="h-4 w-4 mr-2" />
            General
          </TabsTrigger>
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4 mr-2" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="conexiones">
            <Server className="h-4 w-4 mr-2" />
            Conexiones
          </TabsTrigger>
          <TabsTrigger value="validacion">
            <AlertCircle className="h-4 w-4 mr-2" />
            Validación
          </TabsTrigger>
          <TabsTrigger value="notificaciones">
            <Bell className="h-4 w-4 mr-2" />
            Notificaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Ajustes generales de la aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-validation">Validación Automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Validar automáticamente los archivos XML al cargarlos
                    </p>
                  </div>
                  <Switch id="auto-validation" checked={autoValidation} onCheckedChange={setAutoValidation} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="debug-mode">Modo Debug</Label>
                    <p className="text-sm text-muted-foreground">Activar modo de depuración para desarrolladores</p>
                  </div>
                  <Switch id="debug-mode" checked={debugMode} onCheckedChange={setDebugMode} />
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Nombre de la Empresa</Label>
                    <Input id="company-name" defaultValue="MSC Logistics" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default-currency">Moneda Predeterminada</Label>
                    <Select defaultValue="ZAR">
                      <SelectTrigger id="default-currency">
                        <SelectValue placeholder="Seleccionar moneda" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ZAR">ZAR - Rand Sudafricano</SelectItem>
                        <SelectItem value="USD">USD - Dólar Estadounidense</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - Libra Esterlina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-format">Formato de Fecha</Label>
                    <Select defaultValue="DD/MM/YYYY">
                      <SelectTrigger id="date-format">
                        <SelectValue placeholder="Seleccionar formato" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Zona Horaria</Label>
                    <Select defaultValue="UTC+2">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Seleccionar zona horaria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC+2">UTC+2 (Sudáfrica)</SelectItem>
                        <SelectItem value="UTC+1">UTC+1 (Europa Central)</SelectItem>
                        <SelectItem value="UTC+0">UTC+0 (GMT)</SelectItem>
                        <SelectItem value="UTC-5">UTC-5 (Este EEUU)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Gestión de Usuarios</CardTitle>
              <CardDescription>Administrar usuarios y permisos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-end">
                <Button>
                  <User className="mr-2 h-4 w-4" />
                  Nuevo Usuario
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">admin</TableCell>
                    <TableCell>Administrador</TableCell>
                    <TableCell>Administrador</TableCell>
                    <TableCell>
                      <Badge variant="success">Activo</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">jperez</TableCell>
                    <TableCell>Juan Pérez</TableCell>
                    <TableCell>Operador</TableCell>
                    <TableCell>
                      <Badge variant="success">Activo</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">mlopez</TableCell>
                    <TableCell>María López</TableCell>
                    <TableCell>Operador</TableCell>
                    <TableCell>
                      <Badge variant="success">Activo</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">rgarcia</TableCell>
                    <TableCell>Roberto García</TableCell>
                    <TableCell>Supervisor</TableCell>
                    <TableCell>
                      <Badge variant="outline">Inactivo</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles y Permisos</CardTitle>
              <CardDescription>Configurar roles y permisos del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rol</TableHead>
                    <TableHead>Cargar XML</TableHead>
                    <TableHead>Editar XML</TableHead>
                    <TableHead>Transmitir a SAP</TableHead>
                    <TableHead>Reportes</TableHead>
                    <TableHead>Configuración</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Administrador</TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Supervisor</TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Operador</TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Visualizador</TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                    <TableCell>
                      <Check />
                    </TableCell>
                    <TableCell>
                      <X />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conexiones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conexión a SAP</CardTitle>
              <CardDescription>Configurar la conexión con el sistema SAP</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sap-enabled">Conexión a SAP</Label>
                  <p className="text-sm text-muted-foreground">Habilitar la conexión con el sistema SAP</p>
                </div>
                <Switch id="sap-enabled" checked={sapEnabled} onCheckedChange={setSapEnabled} />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sap-server">Servidor SAP</Label>
                  <Input id="sap-server" defaultValue="sap-prod.msc.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sap-port">Puerto</Label>
                  <Input id="sap-port" defaultValue="8000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sap-client">Cliente SAP</Label>
                  <Input id="sap-client" defaultValue="100" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sap-system">Sistema SAP</Label>
                  <Input id="sap-system" defaultValue="PRD" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sap-username">Usuario SAP</Label>
                  <Input id="sap-username" defaultValue="SAPUSER" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sap-password">Contraseña SAP</Label>
                  <Input id="sap-password" type="password" defaultValue="********" />
                </div>
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
              <Button variant="outline">Probar Conexión</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conexión a Base de Datos</CardTitle>
              <CardDescription>Configurar la conexión con la base de datos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="db-type">Tipo de Base de Datos</Label>
                  <Select defaultValue="mongodb">
                    <SelectTrigger id="db-type">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mongodb">MongoDB</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                      <SelectItem value="sqlserver">SQL Server</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-server">Servidor</Label>
                  <Input id="db-server" defaultValue="mongodb://localhost:27017" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-name">Nombre de la Base de Datos</Label>
                  <Input id="db-name" defaultValue="msc_invoicing" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-username">Usuario</Label>
                  <Input id="db-username" defaultValue="dbuser" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="db-password">Contraseña</Label>
                  <Input id="db-password" type="password" defaultValue="********" />
                </div>
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
              <Button variant="outline">Probar Conexión</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validacion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Validación XML</CardTitle>
              <CardDescription>Configurar las reglas de validación para archivos XML</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Validación de Esquema XML</Label>
                    <p className="text-sm text-muted-foreground">Validar que el XML cumpla con el esquema definido</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Validación de Montos</Label>
                    <p className="text-sm text-muted-foreground">
                      Verificar que los montos sean consistentes y válidos
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Validación de Fechas</Label>
                    <p className="text-sm text-muted-foreground">Verificar que las fechas tengan formato correcto</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Validación de Clientes</Label>
                    <p className="text-sm text-muted-foreground">
                      Verificar que los códigos de cliente existan en el sistema
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="schema-file">Archivo de Esquema XML</Label>
                  <div className="flex gap-2">
                    <Input id="schema-file" defaultValue="/schemas/invoice.xsd" readOnly />
                    <Button variant="outline">Examinar</Button>
                  </div>
                </div>
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reglas de Negocio</CardTitle>
              <CardDescription>Configurar reglas de negocio adicionales</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Regla</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">RN-001</TableCell>
                    <TableCell>Validar que el monto total coincida con la suma de los ítems</TableCell>
                    <TableCell>
                      <Badge variant="success">Activa</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">RN-002</TableCell>
                    <TableCell>Validar que el código de cliente exista en SAP</TableCell>
                    <TableCell>
                      <Badge variant="success">Activa</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">RN-003</TableCell>
                    <TableCell>Validar que la fecha de documento no sea futura</TableCell>
                    <TableCell>
                      <Badge variant="success">Activa</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">RN-004</TableCell>
                    <TableCell>Validar que los códigos de impuestos sean válidos</TableCell>
                    <TableCell>
                      <Badge variant="outline">Inactiva</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <div className="mt-4">
                <Button>Agregar Regla</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notificaciones" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de Notificaciones</CardTitle>
              <CardDescription>Configurar las notificaciones del sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">Enviar notificaciones por correo electrónico</p>
                </div>
                <Switch id="email-notifications" checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-server">Servidor SMTP</Label>
                  <Input id="smtp-server" defaultValue="smtp.msc.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Puerto SMTP</Label>
                  <Input id="smtp-port" defaultValue="587" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-username">Usuario SMTP</Label>
                  <Input id="smtp-username" defaultValue="notifications@msc.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Contraseña SMTP</Label>
                  <Input id="smtp-password" type="password" defaultValue="********" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-email">Email Remitente</Label>
                  <Input id="from-email" defaultValue="noreply@msc.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="from-name">Nombre Remitente</Label>
                  <Input id="from-name" defaultValue="MSC Facturación" />
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Eventos de Notificación</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-upload">Carga de XML</Label>
                    <Switch id="notify-upload" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-validation">Validación de XML</Label>
                    <Switch id="notify-validation" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-error">Error de Validación</Label>
                    <Switch id="notify-error" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-transmit">Transmisión a SAP</Label>
                    <Switch id="notify-transmit" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-user">Creación de Usuario</Label>
                    <Switch id="notify-user" defaultChecked />
                  </div>
                </div>
              </div>
              <Button>
                <Save className="mr-2 h-4 w-4" />
                Guardar Configuración
              </Button>
              <Button variant="outline">Enviar Email de Prueba</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plantillas de Email</CardTitle>
              <CardDescription>Configurar las plantillas de correo electrónico</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plantilla</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-medium">Carga Exitosa</TableCell>
                    <TableCell>Notificación de carga exitosa de XML</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Error de Validación</TableCell>
                    <TableCell>Notificación de error en la validación de XML</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Transmisión Exitosa</TableCell>
                    <TableCell>Notificación de transmisión exitosa a SAP</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Error de Transmisión</TableCell>
                    <TableCell>Notificación de error en la transmisión a SAP</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Componentes adicionales para esta página
import { Check, X } from "lucide-react"
