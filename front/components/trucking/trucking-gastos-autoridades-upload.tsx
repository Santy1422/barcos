import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { createAutoridadesRecords, selectCreatingRecords } from "@/lib/features/records/recordsSlice";
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
  "NO. INVOICE"
];

export function TruckingGastosAutoridadesUpload() {
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [excelRows, setExcelRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const loading = useAppSelector(selectCreatingRecords);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

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
       "NO. INVOICE": ["NO. INVOICE", "NO. INVOICE", "No. Invoice", "no. invoice"]
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
    
    setExcelRows(json);
  };

    const handleUpload = async () => {
    try {
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
               const date = new Date(value);
               return isNaN(date.getTime()) ? new Date() : date;
             } catch {
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
         };
       });
       
       console.log("Datos mapeados para enviar:", recordsData);
       console.log("Primer registro de ejemplo:", recordsData[0]);
       
                       // Validar que los campos críticos no estén vacíos
        const criticalFields = ['order', 'container', 'blNumber'];
        const recordsWithEmptyCriticalFields = recordsData.filter(record => 
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
          const batch = recordsData.slice(i, i + BATCH_SIZE);
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
    <Card>
             <CardHeader>
         <CardTitle>Subir Excel Gastos Autoridades</CardTitle>
         <div className="text-sm text-muted-foreground space-y-1">
           <p>• Los campos <strong>Order</strong>, <strong>Container</strong> y <strong>BL Number</strong> son obligatorios</p>
           <p>• Cada número de <strong>Order</strong> debe ser único (no duplicado)</p>
           <p>• Los campos opcionales se llenarán automáticamente con valores por defecto</p>
         </div>
       </CardHeader>
      <CardContent className="space-y-4">
        <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
        {fileName && <div className="text-sm text-muted-foreground">Archivo: {fileName}</div>}
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
             
             {/* Tabla de datos */}
             <div className="overflow-auto border rounded-md max-h-96">
               <Table>
                 <TableHeader>
                   <TableRow>
                     {columns.map(col => <TableHead key={col}>{col}</TableHead>)}
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {excelRows.map((row, idx) => {
                     const orderValue = row[columns.find(col => col.toLowerCase().includes('order')) || 'Order'];
                     const orderNumbers = excelRows.map(r => r[columns.find(col => col.toLowerCase().includes('order')) || 'Order']);
                     const isDuplicate = orderNumbers.filter(order => order === orderValue).length > 1;
                     
                     return (
                       <TableRow key={idx} className={isDuplicate ? 'bg-red-50' : ''}>
                         {columns.map(col => (
                           <TableCell key={col} className={isDuplicate ? 'text-red-600 font-medium' : ''}>
                             {row[col]}
                           </TableCell>
                         ))}
                       </TableRow>
                     );
                   })}
                 </TableBody>
               </Table>
             </div>
           </div>
         )}
        {excelRows.length > 0 && (
          <div className="space-y-3">
            <Button onClick={handleUpload} disabled={loading} className="mt-2">
              {loading ? "Subiendo..." : "Subir registros"}
            </Button>
            
            {uploadProgress && (
              <div className="space-y-2">
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
        )}
      </CardContent>
    </Card>
  );
}


