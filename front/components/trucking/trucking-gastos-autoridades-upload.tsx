import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { createAutoridadesRecords, selectCreatingRecords } from "@/lib/features/records/recordsSlice";
import { selectAllClients, fetchClients, createClientAsync, updateClientAsync, type Client } from "@/lib/features/clients/clientsSlice";
import { ClientModal } from "@/components/clients-management";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { selectCurrentUser } from "@/lib/features/auth/authSlice";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

const REQUIRED_COLUMNS = [
  "Auth",
  "NOMBRE DEL LISTADO",
  "No.",
  "Order",
  "Container",
  "Size",
  "Type",
  "Total Weight",
  "Transport",
  "F/E",
  "POL",
  "POD",
  "BL Number",
  "Notf.",
  "Seal",
  "From Vsl/Voy",
  "Commodity",
  "# TRAMITE",
  "RUTA",
  "Date of Invoice",
  "NO. INVOICE",
  "Customer"
];

export function TruckingGastosAutoridadesUpload() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const loading = useAppSelector(selectCreatingRecords);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  
  // Estados para manejo de clientes (similar a trucking-upload)
  const [missingClients, setMissingClients] = useState<Array<{ name: string; records: any[] }>>([]);
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientToEdit, setClientToEdit] = useState<{ name: string; records: any[] } | null>(null);
  const [currentMissingIndex, setCurrentMissingIndex] = useState<number>(0);
  const [clientCompleteness, setClientCompleteness] = useState<Map<string, { isComplete: boolean; missingFields: string[] }>>(new Map());
  const [hasPendingClients, setHasPendingClients] = useState(false);
  
  // Redux state para clientes
  const clients = useAppSelector(selectAllClients);
  const clientsLoading = useAppSelector((state) => state.clients.loading);
  const currentUser = useAppSelector(selectCurrentUser);
  
  // Verificar permisos para gestionar clientes
  const userRoles = currentUser?.roles || (currentUser?.role ? [currentUser.role] : []);
  const canManageClients = userRoles.includes('administrador') || userRoles.includes('clientes');

  // Cargar clientes al montar el componente
  useEffect(() => {
    dispatch(fetchClients());
  }, [dispatch]);

  // Funciones para manejo de clientes (copiadas de trucking-upload)
  const findClientByName = useCallback((name: string): Client | null => {
    console.log("=== DEBUG: findClientByName ===");
    console.log("buscando cliente con nombre:", name);
    console.log("total clientes disponibles:", clients.length);
    try {
      const found = clients.find((client: any) => {
        if (!name) return false
        if (client.type === "juridico") {
          // Para clientes jurídicos, buscar por nombre corto (name) en lugar de companyName
          const match = client.name?.toLowerCase() === name.toLowerCase()
          console.log(`Comparando "${client.name}" con "${name}": ${match}`);
          return match
        }
        if (client.type === "natural") {
          const match = client.fullName?.toLowerCase() === name.toLowerCase()
          console.log(`Comparando "${client.fullName}" con "${name}": ${match}`);
          return match
        }
        return false
      }) || null
      console.log("Cliente encontrado:", found);
      return found
    } catch (error) {
      console.error("Error en findClientByName:", error);
      return null
    }
  }, [clients])

  // Función para buscar cliente por nombre en un módulo específico (verifica asignación al módulo)
  const findClientByNameInModule = useCallback((name: string, module: string): Client | null => {
    console.log("=== DEBUG: findClientByNameInModule ===");
    console.log("buscando cliente con nombre:", name, "en módulo:", module);
    console.log("total clientes disponibles:", clients.length);
    try {
      const found = clients.find((client: any) => {
        if (!name) return false
        
        // Verificar que el cliente esté asignado al módulo especificado
        const clientModules = client.module || []
        if (!clientModules.includes(module)) {
          console.log(`Cliente "${client.name || client.fullName}" no está asignado al módulo "${module}"`);
          return false
        }
        
        if (client.type === "juridico") {
          // Para clientes jurídicos, buscar por nombre corto (name) en lugar de companyName
          const match = client.name?.toLowerCase() === name.toLowerCase()
          console.log(`Comparando "${client.name}" con "${name}": ${match}`);
          return match
        }
        if (client.type === "natural") {
          const match = client.fullName?.toLowerCase() === name.toLowerCase()
          console.log(`Comparando "${client.fullName}" con "${name}": ${match}`);
          return match
        }
        return false
      }) || null
      console.log("Cliente encontrado en módulo:", found);
      return found
    } catch (error) {
      console.error("Error en findClientByNameInModule:", error);
      return null
    }
  }, [clients])

  const checkClientCompleteness = useCallback((client: any): { isComplete: boolean; missingFields: string[] } => {
    console.log("=== DEBUG: checkClientCompleteness ===");
    console.log("cliente a verificar:", client);
    try {
      const missing: string[] = []
      if (client.type === "juridico") {
        if (!client.companyName?.trim()) missing.push("Nombre de empresa")
        if (!client.name?.trim()) missing.push("Nombre corto")
        if (!client.ruc?.trim()) missing.push("RUC")
        if (!client.email?.trim()) missing.push("Email")
        if (!client.sapCode?.trim()) missing.push("Código SAP")
      } else {
        if (!client.fullName?.trim()) missing.push("Nombre completo")
        if (!client.documentNumber?.trim()) missing.push("Número de documento")
        if (!client.sapCode?.trim()) missing.push("Código SAP")
      }
      const result = { isComplete: missing.length === 0, missingFields: missing }
      console.log("Resultado checkClientCompleteness:", result);
      return result
    } catch (error) {
      console.error("Error en checkClientCompleteness:", error);
      return { isComplete: false, missingFields: ["Error de validación"] }
    }
  }, [])

  const updateClientCompleteness = useCallback((clientName: string) => {
    console.log("=== DEBUG: updateClientCompleteness ===");
    console.log("clientName:", clientName);
    try {
      const updated = findClientByNameInModule(clientName, 'trucking')
      console.log("Cliente encontrado:", updated);
      if (updated) {
        const completeness = checkClientCompleteness(updated)
        console.log("Completeness calculado:", completeness);
        setClientCompleteness(prev => new Map(prev).set(clientName, completeness))
        console.log(`Cliente ${clientName} actualizado:`, completeness)
      } else {
        // Si el cliente no se encuentra en el módulo trucking, marcarlo como incompleto
        setClientCompleteness(prev => new Map(prev).set(clientName, { isComplete: false, missingFields: ["No asignado al módulo trucking"] }))
        console.log(`Cliente ${clientName} no encontrado en módulo trucking, marcado como incompleto`)
      }
    } catch (error) {
      console.error("Error en updateClientCompleteness:", error);
    }
  }, [findClientByNameInModule, checkClientCompleteness])

  const areAllClientsComplete = useCallback((): boolean => {
    if (clientCompleteness.size === 0) return true
    for (const [, completeness] of clientCompleteness) if (!completeness.isComplete) return false
    return true
  }, [clientCompleteness])

  const handleClientClick = (clientName: string) => {
    if (!clientName) return
    
    if (!canManageClients) {
      toast({
        title: "Sin permiso",
        description: "No tienes permiso para gestionar clientes.",
        variant: "destructive"
      })
      return
    }
    
    const existing = findClientByName(clientName)
    if (existing) {
      // Cliente existe, abrir modal de edición
      setEditingClient(existing)
    } else {
      // Cliente no existe, crear uno nuevo
      setEditingClient({
        type: "juridico",
        companyName: clientName, // Usar el nombre del Excel como companyName por defecto
        name: clientName, // Usar el nombre del Excel como name (nombre corto)
        ruc: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        sapCode: "",
        isActive: true,
      } as any)
    }
  }

  // Only fetch clients once on mount (avoid excessive refetching)
  useEffect(() => {
    dispatch(fetchClients())
  }, [dispatch])

  // Recompute completeness when clients list updates (debounced to avoid excessive updates)
  useEffect(() => {
    if (clients.length > 0 && clientCompleteness.size > 0) {
      const timeoutId = setTimeout(() => {
        const newMap = new Map<string, { isComplete: boolean; missingFields: string[] }>()
        for (const [clientName] of clientCompleteness) {
          const c = findClientByNameInModule(clientName, 'trucking')
          if (c) {
            newMap.set(clientName, checkClientCompleteness(c))
          } else {
            newMap.set(clientName, { isComplete: false, missingFields: ["No asignado al módulo trucking"] })
          }
        }
        setClientCompleteness(newMap)
      }, 300) // Debounce 300ms
      
      return () => clearTimeout(timeoutId)
    }
  }, [clients, clientCompleteness.size, findClientByNameInModule, checkClientCompleteness])

  const processMissingClients = async (excelData: any[]): Promise<{ data: any[], hasMissingClients: boolean }> => {
    const grouped = new Map<string, any[]>()
    const newCompleteness = new Map<string, { isComplete: boolean; missingFields: string[] }>()
    
    // Función helper para obtener el valor de customer de manera case-insensitive
    const getCustomerValue = (record: any): string | null => {
      // Buscar la columna customer de manera case-insensitive
      const customerKey = Object.keys(record).find(
        key => key.toLowerCase() === 'customer' || key.toLowerCase() === 'cliente'
      )
      if (!customerKey) return null
      const value = record[customerKey]
      return value && typeof value === 'string' ? value.trim() : null
    }
    
    // Agrupar registros por cliente (columna 'customer') solo si tienen customer válido
    excelData.forEach((record) => {
      const clientName = getCustomerValue(record)
      if (clientName && clientName !== 'N/A' && clientName !== '') {
        if (!grouped.has(clientName)) grouped.set(clientName, [])
        grouped.get(clientName)!.push(record)
      }
    })
    
    const missingList: Array<{ name: string; records: any[] }> = []
    
    console.log(`=== PROCESANDO ${grouped.size} CLIENTES ÚNICOS DEL EXCEL ===`)
    
    // Verificar cada cliente encontrado en el Excel
    for (const [name, recs] of grouped) {
      console.log(`\n=== Verificando cliente: "${name}" (${recs.length} registros) ===`)
      
      // Primero verificar si el cliente existe en general
      const existingClient = findClientByName(name)
      console.log(`Cliente encontrado en BD (sin módulo):`, existingClient ? 'Sí' : 'No')
      
      if (existingClient) {
        const clientModules = (existingClient as any).module || []
        console.log(`Módulos asignados al cliente:`, clientModules)
        console.log(`¿Está asignado a trucking?:`, clientModules.includes('trucking'))
      }
      
      // Buscar cliente en el módulo trucking específicamente
      const existingInModule = findClientByNameInModule(name, 'trucking')
      console.log(`Cliente encontrado en módulo trucking:`, existingInModule ? 'Sí' : 'No')
      
      if (!existingInModule) {
        // Cliente no existe o no está asignado al módulo trucking
        console.log(`⚠️ Cliente "${name}" NO está asignado al módulo trucking - agregando a lista de faltantes`)
        missingList.push({ name, records: recs })
        newCompleteness.set(name, { isComplete: false, missingFields: ["No asignado al módulo trucking"] })
      } else {
        // Cliente existe en el módulo trucking, verificar si está completo
        console.log(`✅ Cliente "${name}" está asignado al módulo trucking`)
        newCompleteness.set(name, checkClientCompleteness(existingInModule))
      }
    }
    
    console.log(`\n=== RESUMEN: ${missingList.length} clientes faltantes de ${grouped.size} totales ===`)
    
    setClientCompleteness(newCompleteness)
    
    // Si hay clientes faltantes, mostrar modal y retornar indicador
    if (missingList.length > 0) {
      setMissingClients(missingList)
      setShowClientModal(true)
      setCurrentMissingIndex(0)
      setHasPendingClients(true) // Marcar que hay clientes pendientes
      // Configurar el primer cliente faltante para edición
      const firstMissingClient = missingList[0]
      setClientToEdit(firstMissingClient)
      const total = missingList.reduce((sum, c) => sum + c.records.length, 0)
      toast({ 
        title: "Clientes faltantes detectados", 
        description: `Se encontraron ${missingList.length} clientes que no están asignados al módulo trucking para ${total} registros. Debes asignar los clientes al módulo antes de continuar.` 
      })
      
      return { data: excelData, hasMissingClients: true }
    }
    
    setHasPendingClients(false) // No hay clientes pendientes
    return { data: excelData, hasMissingClients: false }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    if (!json.length) {
      toast({ title: "Archivo vacío", description: "El Excel no tiene filas.", variant: "destructive" });
      setExcelRows([]);
      setColumns([]);
      return;
    }
    const firstRow = json[0] as Record<string, any>;
    const fileColumns = Object.keys(firstRow);
    setColumns(fileColumns);
    
    // Debug: mostrar qué columnas están llegando
    console.log("Columnas del Excel:", fileColumns);
    console.log("Columnas requeridas:", REQUIRED_COLUMNS);
    
         // Validar columnas con mapeo flexible
     const columnMapping: { [key: string]: string[] } = {
       "Auth": ["Auth", "AUTH", "auth"],
       "NOMBRE DEL LISTADO": ["NOMBRE DEL LISTADO", "NOMBRE DEL LISTADO", "Nombre del Listado"],
       "No.": ["No.", "No", "NO.", "NO", "no.", "no"],
       "Order": ["Order", "ORDER", "order"],
       "Container": ["Container", "CONTAINER", "container"],
       "Size": ["Size", "SIZE", "size"],
       "Type": ["Type", "TYPE", "type"],
       "Total Weight": ["Total Weight", "TOTAL WEIGHT", "Total weight", "total weight"],
       "Transport": ["Transport", "TRANSPORT", "transport"],
       "F/E": ["F/E", "F/E", "F/E", "F/E"],
       "POL": ["POL", "pol", "Pol", " POL ", " POL", "POL "],
       "POD": ["POD", "pod", "Pod", " POD ", " POD", "POD "],
       "BL Number": ["BL Number", "BL NUMBER", "Bl Number", "bl number"],
       "Notf.": ["Notf.", "NOTF.", "Notf", "NOTF", "notf.", "notf", " Notf. ", " Notf.", "Notf. "],
       "Seal": ["Seal", "SEAL", "seal", " Seal ", " Seal", "Seal "],
       "From Vsl/Voy": ["From Vsl/Voy", "FROM VSL/VOY", "From Vsl/Voy", "from vsl/voy"],
       "Commodity": ["Commodity", "COMMODITY", "commodity"],
       "# TRAMITE": ["# TRAMITE", "# TRAMITE", "# TRAMITE", "# TRAMITE"],
       "RUTA": ["RUTA", "Ruta", "ruta"],
       "Date of Invoice": ["Date of Invoice", "DATE OF INVOICE", "Date of invoice", "date of invoice"],
       "NO. INVOICE": ["NO. INVOICE", "NO. INVOICE", "No. Invoice", "no. invoice"],
       "Customer": ["Customer", "CUSTOMER", "customer", "Cliente", "CLIENTE", "cliente"]
     };
    
    const missing: string[] = [];
    REQUIRED_COLUMNS.forEach(requiredCol => {
      const possibleNames = columnMapping[requiredCol] || [requiredCol];
      const found = possibleNames.some(name => fileColumns.includes(name));
      if (!found) {
        missing.push(requiredCol);
      }
    });
    
    if (missing.length) {
      toast({ 
        title: "Columnas faltantes", 
        description: `Faltan: ${missing.join(", ")}. Columnas disponibles: ${fileColumns.join(", ")}`, 
        variant: "destructive" 
      });
      setExcelRows([]);
      return;
    }
    
    // Procesar clientes faltantes usando la columna 'customer' del Excel
    const { data: processedData, hasMissingClients } = await processMissingClients(json);
    setExcelRows(processedData);
    
    // Si hay clientes faltantes, no permitir continuar con la subida
    if (hasMissingClients) {
      return; // Pausar el proceso hasta que se completen los clientes
    }
  };

  const handleClientSaved = useCallback((client: Client) => {
    // Recalcular completitud después de guardar
    const clientName = client.type === 'juridico' ? (client as any).name : (client as any).fullName
    updateClientCompleteness(clientName)
    setEditingClient(null)
    
    // Refrescar la lista de clientes
    dispatch(fetchClients())
    
    // Si veníamos del flujo de faltantes, avanzar al siguiente automáticamente
    if (missingClients.length > 0) {
      const currentIndex = missingClients.findIndex(mc => mc.name.toLowerCase() === clientName.toLowerCase())
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % missingClients.length : 0
      if (missingClients.length > 1) {
        setClientToEdit(missingClients[nextIndex])
        setShowClientModal(true)
      } else {
        // Si era el último, cerrar el modal
        setShowClientModal(false)
        setMissingClients([])
        setHasPendingClients(false)
      }
    }
    
    toast({ 
      title: "Cliente actualizado", 
      description: `Los datos del cliente "${clientName}" han sido actualizados correctamente.` 
    })
  }, [missingClients, updateClientCompleteness, dispatch]);

  const handleUpload = async () => {
    try {
      // Verificar que no haya clientes pendientes antes de continuar
      if (hasPendingClients) {
        toast({
          title: "Clientes pendientes",
          description: "Debes completar todos los datos de clientes antes de guardar los registros",
          variant: "destructive"
        })
        return
      }
      
      // Verificar que todos los clientes estén completos antes de continuar
      if (!areAllClientsComplete()) {
        toast({
          title: "Clientes incompletos",
          description: "Debes completar todos los datos de clientes antes de guardar los registros",
          variant: "destructive"
        })
        return
      }

      // Función para encontrar el nombre exacto de la columna
      const findColumnName = (possibleNames: string[]) => {
        return possibleNames.find(name => columns.includes(name)) || possibleNames[0];
      };
      
             // Mapear los datos a los nombres de campo del backend con manejo de campos vacíos
       const recordsData = excelRows.map(row => {
         const getFieldValue = (possibleNames: string[], defaultValue: string = '') => {
           const value = row[findColumnName(possibleNames)];
           return value !== undefined && value !== null && value.toString().trim() !== '' ? value.toString().trim() : defaultValue;
         };
         
         const getNumericValue = (possibleNames: string[], defaultValue: number = 0) => {
           const value = row[findColumnName(possibleNames)];
           if (value !== undefined && value !== null && value.toString().trim() !== '') {
             const num = Number(value);
             return isNaN(num) ? defaultValue : num;
           }
           return defaultValue;
         };
         
         const getDateValue = (possibleNames: string[]) => {
           const value = row[findColumnName(possibleNames)];
           if (value !== undefined && value !== null && value.toString().trim() !== '') {
             try {
               const valueStr = value.toString().trim();
               
               // Si es una fecha en formato DD/MM/YYYY o DD/M/YYYY
               if (typeof value === 'string' && /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(valueStr)) {
                 const [day, month, year] = valueStr.split('/').map(num => parseInt(num, 10));
                 const parsedDate = new Date(year, month - 1, day); // month es 0-based en JS
                 return isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
               }
               
               // Si Excel ya convirtió la fecha a objeto Date
               if (value instanceof Date) {
                 return isNaN(value.getTime()) ? new Date() : value;
               }
               
               // Si es un número (fecha serial de Excel)
               if (typeof value === 'number' && value > 1000) {
                 // Excel date serial: días desde 1900-01-01 (con corrección de leap year bug)
                 const excelDate = new Date((value - 25569) * 86400 * 1000);
                 return isNaN(excelDate.getTime()) ? new Date() : excelDate;
               }
               
               // Intentar parsear como fecha normal
               const date = new Date(value);
               return isNaN(date.getTime()) ? new Date() : date;
             } catch (error) {
               return new Date();
             }
           }
           return new Date();
         };
         
         return {
           auth: getFieldValue(["Auth", "AUTH", "auth"], "N/A"),
           nombreListado: getFieldValue(["NOMBRE DEL LISTADO", "Nombre del Listado"], "N/A"),
           no: getFieldValue(["No.", "No", "NO.", "NO", "no.", "no"], "N/A"),
           order: getFieldValue(["Order", "ORDER", "order"], "N/A"),
           container: getFieldValue(["Container", "CONTAINER", "container"], "N/A"),
           size: getFieldValue(["Size", "SIZE", "size"], "N/A"),
           type: getFieldValue(["Type", "TYPE", "type"], "N/A"),
           totalWeight: getNumericValue(["Total Weight", "TOTAL WEIGHT", "Total weight", "total weight"], 0),
           transport: getFieldValue(["Transport", "TRANSPORT", "transport"], "N/A"),
           fe: getFieldValue(["F/E", "F/E", "F/E", "F/E"], "N/A"),
           pol: getFieldValue(["POL", "pol", "Pol", " POL ", " POL", "POL "], "N/A"),
           pod: getFieldValue(["POD", "pod", "Pod", " POD ", " POD", "POD "], "N/A"),
           blNumber: getFieldValue(["BL Number", "BL NUMBER", "Bl Number", "bl number"], "N/A"),
           notf: getFieldValue(["Notf.", "NOTF.", "Notf", "NOTF", "notf.", "notf", " Notf. ", " Notf.", "Notf. "], "N/A"),
           seal: getFieldValue(["Seal", "SEAL", "seal", " Seal ", " Seal", "Seal "], "N/A"),
           fromVslVoy: getFieldValue(["From Vsl/Voy", "FROM VSL/VOY", "From Vsl/Voy", "from vsl/voy"], "N/A"),
           commodity: getFieldValue(["Commodity", "COMMODITY", "commodity"], "N/A"),
           tramite: getFieldValue(["# TRAMITE", "# TRAMITE", "# TRAMITE", "# TRAMITE"], "N/A"),
           ruta: getFieldValue(["RUTA", "Ruta", "ruta"], "N/A"),
           dateOfInvoice: getDateValue(["Date of Invoice", "DATE OF INVOICE", "Date of invoice", "date of invoice"]),
           noInvoice: getFieldValue(["NO. INVOICE", "No. Invoice", "no. invoice"], "N/A"),
           customer: getFieldValue(["Customer", "CUSTOMER", "customer", "Cliente", "CLIENTE", "cliente"], "N/A"),
         };
       });
       
       console.log("Datos mapeados para enviar:", recordsData);
       console.log("Primer registro de ejemplo:", recordsData[0]);
       
       // Procesar clientes faltantes antes de enviar
       const { data: processedData, hasMissingClients } = await processMissingClients(recordsData);
       
       // Si hay clientes faltantes, no permitir continuar
       if (hasMissingClients) {
         toast({
           title: "Clientes faltantes",
           description: "Debes completar todos los datos de clientes antes de continuar",
           variant: "destructive"
         });
         return;
       }
       
       // Enriquecer datos con clientId antes de enviar
       const enrichedData = processedData.map(record => {
         const clientName = record.customer?.trim()
         
         // Solo buscar cliente si hay un nombre válido
         if (clientName && clientName !== 'N/A') {
           // Buscar cliente en el módulo trucking específicamente
           const client = findClientByNameInModule(clientName, 'trucking')
           
           if (!client) {
             throw new Error(`Cliente "${clientName}" no encontrado o no está asignado al módulo trucking. Debes asignar el cliente al módulo antes de guardar los registros.`)
           }
           
           return {
             ...record,
             clientId: client._id || client.id, // Agregar clientId para referencias
           }
         }
         
         // Si no hay cliente, permitir continuar pero sin clientId
         return {
           ...record,
           clientId: null,
         }
       })
       
       console.log("Datos enriquecidos con clientId:", enrichedData.slice(0, 2))
       
       // Validar que los campos críticos no estén vacíos
        const criticalFields = ['order', 'container', 'blNumber'];
        const recordsWithEmptyCriticalFields = enrichedData.filter(record => 
          criticalFields.some(field => !record[field] || record[field] === 'N/A')
        );
        
        if (recordsWithEmptyCriticalFields.length > 0) {
          toast({ 
            title: "⚠️ Campos críticos vacíos", 
            description: `${recordsWithEmptyCriticalFields.length} registros tienen campos críticos vacíos. Los campos ORDER, CONTAINER y BL NUMBER son obligatorios.`, 
            variant: "destructive" 
          });
          return; // No permitir subir si hay campos críticos vacíos
        }
        
                 // Validar que no haya números de order duplicados en el archivo
         const orderNumbers = recordsData.map(record => record.order);
         const duplicateOrders = orderNumbers.filter((order, index) => orderNumbers.indexOf(order) !== index);
         
         if (duplicateOrders.length > 0) {
           // Usar filter para obtener valores únicos en lugar de Set
           const uniqueDuplicates = duplicateOrders.filter((order, index) => duplicateOrders.indexOf(order) === index);
           toast({ 
             title: "⚠️ Duplicados detectados en el archivo", 
             description: `Se encontraron ${uniqueDuplicates.length} números de order duplicados: ${uniqueDuplicates.join(', ')}. Solo se guardará la primera aparición de cada uno.`, 
             variant: "default" // Cambiar a "default" en lugar de "destructive"
           });
           // ✅ NO hacer return, permitir que continúe la carga
           // El backend se encargará de manejar los duplicados
         }
        
                 // Mostrar resumen de validación
         const hasDuplicates = duplicateOrders.length > 0;
         toast({ 
           title: hasDuplicates ? "⚠️ Archivo con duplicados" : "✅ Validación exitosa", 
           description: hasDuplicates 
             ? `Archivo validado: ${recordsData.length} registros. ${duplicateOrders.length} duplicados serán manejados automáticamente.`
             : `Archivo validado: ${recordsData.length} registros con campos críticos completos.`, 
           variant: hasDuplicates ? "default" : "default" 
         });
       
       // Log detallado del primer registro para debugging
       if (recordsData.length > 0) {
         console.log("🔍 Primer registro completo:", recordsData[0]);
         console.log("🔍 Tipos de datos del primer registro:", Object.keys(recordsData[0]).reduce((acc, key) => {
           acc[key] = { value: recordsData[0][key], type: typeof recordsData[0][key] };
           return acc;
         }, {}));
       }
      
             // Dividir en lotes más grandes ya que usamos inserción masiva en el backend
       const BATCH_SIZE = 200;
             const totalRecords = recordsData.length;
       let processedRecords = 0; // Contador para progreso (registros enviados)
       let totalCreatedRecords = 0; // Contador para registros realmente creados
       
       // Inicializar progreso
       setUploadProgress({ current: 0, total: totalRecords });
       
       toast({ 
         title: "Iniciando carga", 
         description: `Procesando ${totalRecords} registros en lotes de ${BATCH_SIZE}...` 
       });
       
              for (let i = 0; i < totalRecords; i += BATCH_SIZE) {
          const batch = enrichedData.slice(i, i + BATCH_SIZE);
          try {
            console.log(`Enviando lote ${Math.floor(i / BATCH_SIZE) + 1}:`, batch);
            console.log(`Tamaño del lote:`, JSON.stringify(batch).length, 'caracteres');
            
            // Verificar token antes de enviar
            const token = localStorage.getItem('token');
            console.log('Token disponible:', !!token);
            
                        const result = await dispatch(createAutoridadesRecords(batch)).unwrap();
             console.log(`Lote ${Math.floor(i / BATCH_SIZE) + 1} procesado:`, result);
             
                          // ✅ Contar registros enviados para progreso
              processedRecords += batch.length;
             
             // ✅ Contar registros realmente creados para el mensaje final
             const recordsCreated = result.count || 0;
             totalCreatedRecords += recordsCreated;
             
             // Mostrar información sobre duplicados si los hubo
             if (result.duplicates && result.duplicates.count > 0) {
               toast({ 
                 title: "⚠️ Registros duplicados detectados", 
                 description: `Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${result.duplicates.count} registros duplicados omitidos. Orders: ${result.duplicates.orders.join(', ')}`, 
                 variant: "default" 
               });
             }
            
            // Actualizar progreso (registros enviados)
            setUploadProgress({ current: processedRecords, total: totalRecords });
            
            // Mostrar progreso
            toast({ 
              title: "Progreso", 
              description: `Procesados ${processedRecords} de ${totalRecords} registros...` 
            });
            
                        // Pausa mínima entre lotes ya que la inserción masiva es muy rápida
             if (i + BATCH_SIZE < totalRecords) {
               await new Promise(resolve => setTimeout(resolve, 50));
             }
          } catch (batchError: any) {
            console.error(`Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:`, batchError);
            toast({ 
              title: "Error en lote", 
              description: `Error procesando lote ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`, 
              variant: "destructive" 
            });
            throw batchError;
          }
        }
       
              toast({ 
          title: "Carga completada", 
          description: `Se procesaron ${totalRecords} registros. ${totalCreatedRecords} registros nuevos fueron guardados exitosamente.` 
        });
      
      // Limpiar progreso
      setUploadProgress(null);
      setExcelRows([]);
      setColumns([]);
      setFileName("");
    } catch (e: any) {
      toast({ title: "Error al subir", description: e.message, variant: "destructive" });
      // Limpiar progreso en caso de error
      setUploadProgress(null);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <Card className="w-full">
             <CardHeader>
         <CardTitle>Subir Excel Gastos Autoridades</CardTitle>
         <div className="text-sm text-muted-foreground space-y-1">
           <p>• Los campos <strong>Order</strong>, <strong>Container</strong> y <strong>BL Number</strong> son obligatorios</p>
           <p>• Cada número de <strong>Order</strong> debe ser único (no duplicado)</p>
           <p>• Los campos opcionales se llenarán automáticamente con valores por defecto</p>
         </div>
       </CardHeader>
      <CardContent className="space-y-4 w-full min-w-0">
        <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        {fileName && <div className="text-sm text-muted-foreground">Archivo: {fileName}</div>}
        
        {hasPendingClients && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-yellow-800 font-medium">
                Clientes faltantes detectados
              </span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Se encontraron clientes que no existen en la base de datos. Debes completar su información antes de poder subir los registros.
            </p>
          </div>
        )}
                 {columns.length > 0 && (
           <div className="space-y-3">
             {/* Resumen de validación */}
             <div className="flex items-center gap-2 text-sm">
               <span className="font-medium">Resumen:</span>
               <span className="text-green-600">{excelRows.length} registros cargados</span>
                                {(() => {
                   const orderNumbers = excelRows.map(row => row[columns.find(col => col.toLowerCase().includes('order')) || 'Order']);
                   const duplicateOrders = orderNumbers.filter((order, index) => orderNumbers.indexOf(order) !== index);
                   if (duplicateOrders.length > 0) {
                     // Usar filter para obtener valores únicos en lugar de Set
                     const uniqueDuplicates = duplicateOrders.filter((order, index) => duplicateOrders.indexOf(order) === index);
                     return (
                       <span className="text-red-600">
                         ⚠️ {uniqueDuplicates.length} orders duplicados: {uniqueDuplicates.join(', ')}
                       </span>
                     );
                   }
                   return <span className="text-green-600">✅ Orders únicos</span>;
                 })()}
             </div>
             
             {/* Resumen de clientes */}
             {clientCompleteness.size > 0 && (
               <div className="flex items-center gap-2 text-sm">
                 <span className="font-medium">Clientes:</span>
                 <Badge variant="outline" className="text-green-600 border-green-600 px-3 py-1">
                   {Array.from(clientCompleteness.values()).filter(c => c.isComplete).length} completos
                 </Badge>
                 <Badge variant="outline" className="text-red-600 border-red-600 px-3 py-1">
                   {Array.from(clientCompleteness.values()).filter(c => !c.isComplete).length} incompletos
                 </Badge>
                 <Badge variant="outline" className="text-blue-600 border-blue-600 px-3 py-1">
                   {Array.from(clientCompleteness.keys()).length} únicos
                 </Badge>
                 {hasPendingClients && (
                   <Badge variant="outline" className="text-yellow-600 border-yellow-600 px-3 py-1 bg-yellow-50">
                     ⚠️ Pendientes de completar
                   </Badge>
                 )}
               </div>
             )}
             
             {/* Contenedor de tabla con scroll horizontal optimizado */}
             <div className="w-full min-w-0">
               <div className="border rounded-md bg-white overflow-hidden">
                 <div className="overflow-x-auto overflow-y-auto max-h-96">
                   <div className="min-w-max">
                     <Table className="w-full">
                       <TableHeader className="sticky top-0 bg-white z-10">
                         <TableRow>
                           {columns.map((col, index) => (
                             <TableHead 
                               key={col} 
                               className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-900 bg-gray-50"
                               style={{ 
                                 minWidth: index === 0 ? '180px' : '140px',
                                 width: 'auto'
                               }}
                             >
                               {col}
                             </TableHead>
                           ))}
                           <TableHead 
                             className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-900 sticky right-0 bg-gray-50 border-l z-20"
                             style={{ 
                               minWidth: '160px',
                               width: '160px'
                             }}
                           >
                             Estado Cliente
                           </TableHead>
                         </TableRow>
                       </TableHeader>
                       <TableBody>
                         {excelRows.map((row, idx) => {
                           const orderValue = row[columns.find(col => col.toLowerCase().includes('order')) || 'Order'];
                           const orderNumbers = excelRows.map(r => r[columns.find(col => col.toLowerCase().includes('order')) || 'Order']);
                           const isDuplicate = orderNumbers.filter(order => order === orderValue).length > 1;
                           
                           return (
                             <TableRow key={idx} className={isDuplicate ? 'bg-red-50' : 'hover:bg-gray-50'}>
                               {columns.map((col, colIndex) => (
                                 <TableCell 
                                   key={col} 
                                   className={`px-3 py-2 text-sm ${isDuplicate ? 'text-red-600 font-medium' : 'text-gray-900'} whitespace-nowrap`}
                                   style={{ 
                                     minWidth: colIndex === 0 ? '180px' : '140px',
                                     width: 'auto'
                                   }}
                                 >
                                   <div 
                                     className="truncate" 
                                     title={String(row[col])}
                                     style={{ 
                                       maxWidth: colIndex === 0 ? '160px' : '120px'
                                     }}
                                   >
                                     {row[col]}
                                   </div>
                                 </TableCell>
                               ))}
                               <TableCell 
                                 className="px-3 py-2 text-sm sticky right-0 bg-white border-l z-10"
                                 style={{ 
                                   minWidth: '160px',
                                   width: '160px'
                                 }}
                               >
                                 {(() => {
                                   const customerName = row[columns.find(col => col.toLowerCase().includes('customer')) || 'Customer'];
                                   if (!customerName || customerName === 'N/A') {
                                     return <span className="text-muted-foreground text-xs">Sin cliente</span>;
                                   }
                                   
                                   const clientStatus = clientCompleteness.get(customerName);
                                   if (!clientStatus) {
                                     return <span className="text-muted-foreground text-xs">No verificado</span>;
                                   }
                                   
                                   if (clientStatus.isComplete) {
                                     return (
                                       <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                                         <CheckCircle2 className="h-3 w-3 mr-1" />
                                         Completo
                                       </Badge>
                                     );
                                   } else {
                                     return (
                                       <Badge variant="outline" className="text-red-600 border-red-600 text-xs cursor-pointer" 
                                              onClick={() => handleClientClick(customerName)}>
                                         <AlertCircle className="h-3 w-3 mr-1" />
                                         Incompleto
                                       </Badge>
                                     );
                                   }
                                 })()}
                               </TableCell>
                             </TableRow>
                           );
                         })}
                       </TableBody>
                     </Table>
                   </div>
                 </div>
               </div>
             </div>
           </div>
         )}
        {excelRows.length > 0 && (
          <div className="space-y-3 mt-4">
            {hasPendingClients && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm text-yellow-800 font-medium">
                    Clientes pendientes de completar
                  </span>
                </div>
                <p className="text-sm text-yellow-700 mt-1">
                  Debes completar la información de todos los clientes antes de poder subir los registros.
                </p>
              </div>
            )}
            
            {/* Botón centrado que no se mueve con el scroll */}
            <div className="sticky bottom-0 bg-white pt-4 border-t">
              <div className="flex justify-center">
                <Button 
                  onClick={handleUpload} 
                  disabled={loading || hasPendingClients} 
                  className="w-auto px-8"
                  size="lg"
                >
                  {loading ? "Subiendo..." : hasPendingClients ? "Completar clientes primero" : "Subir registros"}
                </Button>
              </div>
              
              {uploadProgress && (
                <div className="space-y-2 mt-3">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Progreso de carga</span>
                    <span>{uploadProgress.current} de {uploadProgress.total}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% completado
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Modal de Clientes (crear/editar) - usar módulo trucking */}
    <ClientModal
      isOpen={!!editingClient}
      onClose={() => setEditingClient(null)}
      editingClient={editingClient}
      module="trucking"
      onClientCreated={handleClientSaved}
    />

    {/* Modal para clientes faltantes del Excel */}
    {showClientModal && clientToEdit && (
      <Dialog open={showClientModal} onOpenChange={setShowClientModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cliente Faltante ({missingClients.indexOf(clientToEdit) + 1}/{missingClients.length}): {clientToEdit.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">Cliente no asignado al módulo trucking</h4>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                El cliente "{clientToEdit.name}" no está asignado al módulo trucking. Se encontraron {clientToEdit.records.length} registros para este cliente en el Excel.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Registros asociados:</h4>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                {clientToEdit.records.slice(0, 5).map((record: any, index: number) => (
                  <div key={index} className="text-sm text-muted-foreground py-1">
                    • {record.order || 'N/A'} - {record.container || 'N/A'} ({record.size || 'N/A'}' {record.type || 'N/A'})
                  </div>
                ))}
                {clientToEdit.records.length > 5 && (
                  <div className="text-sm text-muted-foreground py-1">
                    ... y {clientToEdit.records.length - 5} registros más
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center space-x-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = missingClients.indexOf(clientToEdit)
                    const prevIndex = (currentIndex - 1 + missingClients.length) % missingClients.length
                    setClientToEdit(missingClients[prevIndex])
                  }}
                  disabled={missingClients.length <= 1}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentIndex = missingClients.indexOf(clientToEdit)
                    const nextIndex = (currentIndex + 1) % missingClients.length
                    setClientToEdit(missingClients[nextIndex])
                  }}
                  disabled={missingClients.length <= 1}
                >
                  Siguiente →
                </Button>
              </div>
              <Button
                onClick={() => {
                  if (!canManageClients) {
                    toast({
                      title: "Sin permiso",
                      description: "No tienes permiso para gestionar clientes.",
                      variant: "destructive"
                    })
                    return
                  }
                  
                  // Buscar si el cliente existe
                  const existing = findClientByName(clientToEdit.name)
                  if (existing) {
                    // Cliente existe, abrir modal de edición para asignarlo al módulo
                    setEditingClient(existing)
                  } else {
                    // Cliente no existe, crear uno nuevo
                    setEditingClient({
                      type: "juridico",
                      companyName: clientToEdit.name, // Usar el nombre del Excel como companyName por defecto
                      name: clientToEdit.name, // Usar el nombre del Excel como name (nombre corto)
                      ruc: "",
                      contactName: "",
                      email: "",
                      phone: "",
                      address: "",
                      sapCode: "", // Vacío para que el usuario lo ingrese y busque
                      isActive: true,
                    } as any)
                  }
                  // cerrar modal para abrir editor
                  setShowClientModal(false)
                }}
              >
                Editar Datos del Cliente
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}
    </div>
  );
}


