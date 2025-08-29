import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch } from "@/lib/hooks";
import { createClientAsync, updateClientAsync, fetchClients, type Client } from "@/lib/features/clients/clientsSlice";

interface ClientEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  missingClients: Array<{ name: string; records: any[] }>;
  currentMissingIndex: number;
  setCurrentMissingIndex: (index: number) => void;
  editingClient: Client | null;
  setEditingClient: (client: Client | null) => void;
  clientToEdit: { name: string; email: string; phone: string; address: string; sapCode: string; ruc: string } | null;
  setClientToEdit: (client: { name: string; email: string; phone: string; address: string; sapCode: string; ruc: string } | null) => void;
  onClientSaved: () => void;
  setHasPendingClients: (pending: boolean) => void;
}

export function ClientEditModal({
  open,
  onOpenChange,
  missingClients,
  currentMissingIndex,
  setCurrentMissingIndex,
  editingClient,
  setEditingClient,
  clientToEdit,
  setClientToEdit,
  onClientSaved,
  setHasPendingClients
}: ClientEditModalProps) {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  
  // Local state for form inputs with debouncing
  const [localClientData, setLocalClientData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    sapCode: "",
    ruc: ""
  });
  
  // Sync local state with props when clientToEdit changes
  useEffect(() => {
    if (clientToEdit) {
      setLocalClientData({
        name: clientToEdit.name || "",
        email: clientToEdit.email || "",
        phone: clientToEdit.phone || "",
        address: clientToEdit.address || "",
        sapCode: clientToEdit.sapCode || "",
        ruc: (clientToEdit as any).ruc || ""
      });
    }
  }, [clientToEdit]);
  
  // Debounced update to parent state
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (clientToEdit) {
        setClientToEdit({
          ...clientToEdit,
          ...localClientData
        });
      }
    }, 300); // 300ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [localClientData, clientToEdit, setClientToEdit]);
  
  const handleInputChange = useCallback((field: string, value: string) => {
    setLocalClientData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);
  
  const handleSaveClient = useCallback(async () => {
    if (!clientToEdit) return;
    
    // Validación de campos requeridos
    if (!localClientData.name.trim()) {
      toast({ 
        title: "Error de validación", 
        description: "El nombre del cliente es requerido", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!localClientData.ruc.trim()) {
      toast({ 
        title: "Error de validación", 
        description: "El RUC es requerido para clientes jurídicos", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!localClientData.sapCode.trim()) {
      toast({ 
        title: "Error de validación", 
        description: "El código SAP es requerido", 
        variant: "destructive" 
      });
      return;
    }
    
    try {
      console.log("=== DEBUG: Iniciando guardado de cliente ===");
      console.log("editingClient:", editingClient);
      console.log("localClientData:", localClientData);
      
      if (editingClient) {
        // Actualizar cliente existente
        console.log("Actualizando cliente existente...");
        const updatedClient = {
          ...editingClient,
          companyName: localClientData.name,
          name: localClientData.name,
          ruc: localClientData.ruc || "",
          email: localClientData.email || "",
          phone: localClientData.phone || "",
          address: localClientData.address || "",
          sapCode: localClientData.sapCode || "",
        };
        console.log("updatedClient:", updatedClient);
        const result = await dispatch(updateClientAsync(updatedClient)).unwrap();
        console.log("Cliente actualizado exitosamente:", result);
        toast({ title: "Cliente actualizado", description: "El cliente se actualizó correctamente" });
      } else {
        // Crear nuevo cliente
        console.log("Creando nuevo cliente...");
        const newClient = {
          type: "juridico" as const,
          companyName: localClientData.name,
          name: localClientData.name,
          ruc: localClientData.ruc || "",
          contactName: "",
          email: localClientData.email || "",
          phone: localClientData.phone || "",
          address: localClientData.address || "",
          sapCode: localClientData.sapCode || "",
          isActive: true,
        };
        console.log("newClient:", newClient);
        const result = await dispatch(createClientAsync(newClient)).unwrap();
        console.log("Cliente creado exitosamente:", result);
        toast({ title: "Cliente creado", description: "El cliente se creó correctamente" });
      }
      
      // Actualizar la lista de clientes y esperar a que se complete
      console.log("Refrescando lista de clientes...");
      await dispatch(fetchClients()).unwrap();
      console.log("Lista de clientes refrescada");
      
      // Verificar si hay más clientes faltantes para procesar
      const nextIndex = currentMissingIndex + 1;
      
      if (nextIndex < missingClients.length) {
        // Hay más clientes faltantes, mover al siguiente
        setCurrentMissingIndex(nextIndex);
        const nextMissingClient = missingClients[nextIndex];
        setLocalClientData({
          name: nextMissingClient.name,
          email: "",
          phone: "",
          address: "",
          sapCode: "",
          ruc: ""
        });
        toast({ 
          title: "Cliente guardado", 
          description: `Cliente "${localClientData.name}" guardado. Continuando con el siguiente cliente faltante...` 
        });
      } else {
        // No hay más clientes faltantes, cerrar modal
        onOpenChange(false);
        setEditingClient(null);
        setClientToEdit(null);
        setCurrentMissingIndex(0);
        setHasPendingClients(false);
        toast({ 
          title: "Todos los clientes completados", 
          description: "Se han procesado todos los clientes faltantes. Ahora puedes proceder con la carga de registros." 
        });
      }
      
      console.log("Llamando onClientSaved callback...");
      onClientSaved();
    } catch (error: any) {
      console.error("=== ERROR: Error al guardar cliente ===");
      console.error("error:", error);
      console.error("error.message:", error.message);
      console.error("error.stack:", error.stack);
      toast({ 
        title: "Error", 
        description: error.message || "Error al guardar el cliente", 
        variant: "destructive" 
      });
    }
  }, [
    clientToEdit, 
    editingClient, 
    localClientData, 
    dispatch, 
    toast, 
    currentMissingIndex, 
    missingClients, 
    setCurrentMissingIndex, 
    onOpenChange, 
    setEditingClient, 
    setClientToEdit, 
    setHasPendingClients, 
    onClientSaved
  ]);
  
  const handlePrevious = useCallback(() => {
    const prevIndex = (currentMissingIndex - 1 + missingClients.length) % missingClients.length;
    setCurrentMissingIndex(prevIndex);
    const prevMissingClient = missingClients[prevIndex];
    setLocalClientData({
      name: prevMissingClient.name,
      email: "",
      phone: "",
      address: "",
      sapCode: "",
      ruc: ""
    });
  }, [currentMissingIndex, missingClients, setCurrentMissingIndex]);
  
  const handleNext = useCallback(() => {
    const nextIndex = (currentMissingIndex + 1) % missingClients.length;
    setCurrentMissingIndex(nextIndex);
    const nextMissingClient = missingClients[nextIndex];
    setLocalClientData({
      name: nextMissingClient.name,
      email: "",
      phone: "",
      address: "",
      sapCode: "",
      ruc: ""
    });
  }, [currentMissingIndex, missingClients, setCurrentMissingIndex]);
  
  if (!clientToEdit) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {missingClients.length > 0 ? (
              `Cliente Faltante (${currentMissingIndex + 1}/${missingClients.length}): ${localClientData.name}`
            ) : (
              editingClient ? 'Editar Cliente' : 'Crear Nuevo Cliente'
            )}
          </DialogTitle>
        </DialogHeader>
        
        {missingClients.length > 0 && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <h4 className="font-medium text-yellow-800">Cliente no encontrado</h4>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                El cliente "{localClientData.name}" no existe en la base de datos. Se encontraron {missingClients[currentMissingIndex]?.records?.length || 0} registros para este cliente en el Excel.
              </p>
            </div>
            
            {missingClients[currentMissingIndex]?.records && (
              <div className="space-y-2">
                <h4 className="font-medium">Registros asociados:</h4>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2">
                  {missingClients[currentMissingIndex].records.slice(0, 5).map((record: any, index: number) => (
                    <div key={index} className="text-sm text-muted-foreground py-1">
                      • {record.order || 'N/A'} - {record.container || 'N/A'} ({record.size || 'N/A'}' {record.type || 'N/A'})
                    </div>
                  ))}
                  {missingClients[currentMissingIndex].records.length > 5 && (
                    <div className="text-sm text-muted-foreground py-1">
                      ... y {missingClients[currentMissingIndex].records.length - 5} registros más
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre del Cliente *</label>
            <Input
              value={localClientData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Nombre del cliente (requerido)"
              className="mt-1"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">RUC *</label>
            <Input
              value={localClientData.ruc}
              onChange={(e) => handleInputChange('ruc', e.target.value)}
              placeholder="RUC del cliente (requerido)"
              className="mt-1"
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              value={localClientData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="email@ejemplo.com"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Teléfono</label>
            <Input
              value={localClientData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              placeholder="+507 1234-5678"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Dirección</label>
            <Input
              value={localClientData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Dirección del cliente"
              className="mt-1"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Código SAP *</label>
            <Input
              value={localClientData.sapCode}
              onChange={(e) => handleInputChange('sapCode', e.target.value)}
              placeholder="Código SAP del cliente (requerido)"
              className="mt-1"
              required
            />
          </div>
          
          <div className="flex justify-between items-center space-x-2 pt-4">
            {missingClients.length > 1 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={missingClients.length <= 1}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="outline"
                  onClick={handleNext}
                  disabled={missingClients.length <= 1}
                >
                  Siguiente →
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveClient}>
                {editingClient ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
