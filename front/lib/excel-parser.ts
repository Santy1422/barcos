import * as XLSX from 'xlsx';

export interface ShipchandlerExcelData {
  fecha: string;
  clientes: string;
  desde: string;
  subClientes: string;
  hacia: string;
  bl: string;
  buque: string;
  tamano: string;
  numeroContenedor: string;
  ptgOrder: string;
  status: string;
  voyage: string;
  tarifa: number;
  gastosPuerto: string;
  otrosGastos: number;
  jira: string;
  fechaFacturacion: string;
  driver: string;
  plate: string;
  bono: number;
  rtContainer: string;
}

export const parseShipchandlerExcel = async (file: File): Promise<ShipchandlerExcelData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          resolve([]);
          return;
        }
        
        // Obtener headers (primera fila)
        const headers = jsonData[0] as string[];
        
        // Mapear columnas a campos esperados
        const columnMapping: { [key: string]: keyof ShipchandlerExcelData } = {
          'FECHA': 'fecha',
          'CLIENTES': 'clientes',
          'DESDE': 'desde',
          'SUB-CLIENTES': 'subClientes',
          'HACIA': 'hacia',
          'B/L': 'bl',
          'BUQUE': 'buque',
          'TAMAÑO': 'tamano',
          'N° CONTENEDOR': 'numeroContenedor',
          'PTG ORDER': 'ptgOrder',
          'STATUS': 'status',
          'VOYAGE': 'voyage',
          'TARIFA': 'tarifa',
          'GASTOS PUERTO': 'gastosPuerto',
          'OTROS GASTOS': 'otrosGastos',
          'JIRA': 'jira',
          'FECHA FACTURACION': 'fechaFacturacion',
          'DRIVER': 'driver',
          'PLATE': 'plate',
          'BONO': 'bono',
          'RT CONTAINER': 'rtContainer'
        };
        
        // Encontrar índices de columnas
        const columnIndexes: { [key in keyof ShipchandlerExcelData]?: number } = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header?.toString().toUpperCase().trim();
          if (normalizedHeader && columnMapping[normalizedHeader]) {
            columnIndexes[columnMapping[normalizedHeader]] = index;
          }
        });
        
        // Procesar datos (saltar header)
        const parsedData: ShipchandlerExcelData[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          
          // Verificar que la fila no esté vacía
          if (!row || row.every(cell => !cell)) continue;
          
          const record: Partial<ShipchandlerExcelData> = {};
          
          // Mapear cada campo
          Object.entries(columnIndexes).forEach(([field, index]) => {
            if (index !== undefined && row[index] !== undefined) {
              const value = row[index];
              
              if (field === 'tarifa' || field === 'otrosGastos' || field === 'bono') {
                // Campos numéricos - limpiar formato de moneda
                const cleanValue = value?.toString().replace(/[$,]/g, '') || '0';
                record[field as keyof ShipchandlerExcelData] = parseFloat(cleanValue) || 0;
              } else {
                // Campos de texto
                record[field as keyof ShipchandlerExcelData] = value?.toString() || '';
              }
            }
          });
          
          // Validar campos requeridos
          if (record.fecha && record.clientes && record.buque) {
            parsedData.push(record as ShipchandlerExcelData);
          }
        }
        
        resolve(parsedData);
      } catch (error) {
        reject(new Error(`Error al parsear Excel: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};


export interface TruckingExcelData {
  fecha: string;
  clientes: string;
  desde: string;
  subClientes: string;
  hacia: string;
  bl: string;
  buque: string;
  tamano: string;
  numeroContenedor: string;
  ptgOrder: string;
  status: string;
  voyage: string;
  tarifa: number;
  gastosPuerto: string;
  otrosGastos: number;
  jira: string;
  fechaFacturacion: string;
  driver: string;
  plate: string;
  bono: number;
  rtContainer: string;
}

export const parseTruckingExcel = async (file: File): Promise<TruckingExcelData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Tomar la primera hoja
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convertir a JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          resolve([]);
          return;
        }
        
        // Obtener headers (primera fila)
        const headers = jsonData[0] as string[];
        
        // Mapear columnas exactamente como aparecen en tu Excel
        const columnMapping: { [key: string]: keyof TruckingExcelData } = {
          'FECHA': 'fecha',
          'CLIENTES': 'clientes',
          'DESDE': 'desde',
          'SUB-CLIENTES': 'subClientes',
          'HACIA': 'hacia',
          'B/L': 'bl',
          'BUQUE': 'buque',
          'TAMAÑO': 'tamano',
          'N° CONTENEDOR': 'numeroContenedor',
          'PTG ORDER': 'ptgOrder',
          'STATUS': 'status',
          'VOYAGE': 'voyage',
          'TARIFA': 'tarifa',
          'GASTOS PUERTO': 'gastosPuerto',
          'OTROS GASTOS': 'otrosGastos',
          'JIRA': 'jira',
          'FECHA FACTURACION': 'fechaFacturacion',
          'DRIVER': 'driver',
          'PLATE': 'plate',
          'BONO': 'bono',
          'RT CONTAINER': 'rtContainer'
        };
        
        // Encontrar índices de columnas
        const columnIndexes: { [key in keyof TruckingExcelData]?: number } = {};
        headers.forEach((header, index) => {
          const normalizedHeader = header?.toString().trim();
          if (normalizedHeader && columnMapping[normalizedHeader]) {
            columnIndexes[columnMapping[normalizedHeader]] = index;
          }
        });
        
        // Procesar datos (saltar header)
        const parsedData: TruckingExcelData[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          
          // Verificar que la fila no esté vacía
          if (!row || row.every(cell => !cell && cell !== 0)) continue;
          
          const record: Partial<TruckingExcelData> = {};
          
          // Mapear cada campo
          Object.entries(columnIndexes).forEach(([field, index]) => {
            if (index !== undefined && row[index] !== undefined && row[index] !== null) {
              const value = row[index];
              
              if (field === 'tarifa' || field === 'otrosGastos' || field === 'bono') {
                // Campos numéricos - limpiar formato de moneda
                const cleanValue = value?.toString().replace(/[$,]/g, '') || '0';
                record[field as keyof TruckingExcelData] = parseFloat(cleanValue) || 0;
              } else {
                // Campos de texto
                record[field as keyof TruckingExcelData] = value?.toString().trim() || '';
              }
            }
          });
          
          // Validar que al menos tenga fecha y cliente
          if (record.fecha && record.clientes) {
            parsedData.push(record as TruckingExcelData);
          }
        }
        
        resolve(parsedData);
      } catch (error) {
        reject(new Error(`Error al parsear Excel de trucking: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };
    
    reader.readAsArrayBuffer(file);
  });
};