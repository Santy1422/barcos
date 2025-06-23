// Importación estática para evitar problemas de SSR y ChunkLoadError
import * as XLSX from 'xlsx';

export interface TruckingExcelData {
  containerConsecutive: string;
  container: string;
  size: string;
  type: string;
  fromVslVoy: string;
  temp: string;
  imo: string;
  unno: string;
  sealNumber: string;
  driverName: string;
  plate: string;
  associate: string;
  moveDate: string;
  rtContainer: string;
  size2: string;
  type2: string;
  rtFromVslVoy: string;
  rtFrom: string;
  rtTo: string;
  onCarrier: string;
  pol: string;
  pod: string;
  bl: string;
  moveType: string;
  leg: string;
  route: string;
  routeRtSummary: string;
  type1Type2: string;
}

export const parseTruckingExcel = async (file: File): Promise<TruckingExcelData[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validaciones más flexibles
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'));
        return;
      }

      if (file.size === 0) {
        reject(new Error('El archivo seleccionado está vacío'));
        return;
      }

      // Validación más flexible de extensiones
      const fileName = file.name.toLowerCase();
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
      
      if (!hasValidExtension) {
        console.warn('Extensión no reconocida, intentando procesar como Excel:', fileName);
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          console.log('Archivo cargado exitosamente, procesando...');
          
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            throw new Error('No se pudo obtener el contenido del archivo');
          }

          console.log('Tamaño del buffer:', arrayBuffer.byteLength);

          // Usar XLSX
          let workbook;
          try {
            workbook = XLSX.read(arrayBuffer, { 
              type: 'array',
              cellText: false,
              cellHTML: false,
              sheetStubs: false,
              bookVBA: false
            });
          } catch (xlsxError) {
            console.error('Error al leer con XLSX:', xlsxError);
            throw new Error('El archivo no es un Excel válido o está corrupto');
          }
          
          if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('El archivo Excel no contiene hojas de trabajo');
          }
          
          console.log('Hojas encontradas:', workbook.SheetNames);
          
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          if (!worksheet) {
            throw new Error(`No se pudo acceder a la hoja: ${sheetName}`);
          }
          
          // Verificar si la hoja tiene datos
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
          console.log('Rango de datos:', worksheet['!ref']);
          
          if (range.e.r < 1) {
            throw new Error('El archivo Excel no contiene suficientes filas de datos');
          }
          
          // Convertir a array de arrays
          const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '', 
            raw: false 
          });
          
          console.log('Datos en bruto extraídos:', rawData.length, 'filas');
          console.log('Primera fila (headers):', rawData[0]);
          
          if (rawData.length < 2) {
            throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos');
          }
          
          // Primera fila como headers
          const headers = rawData[0].map((header: any) => 
            String(header || '').trim().toLowerCase()
          );
          
          console.log('Headers procesados:', headers);
          
          // Mapeo de headers a campos del objeto
          const fieldMapping: { [key: string]: keyof TruckingExcelData } = {
            'containerConsecutive': 'containerConsecutive',
            'container': 'container',
            'size': 'size',
            'type': 'type',
            'from vsl/voy': 'fromVslVoy',
            'temp': 'temp',
            'imo': 'imo',
            'unno': 'unno',
            'seal #': 'sealNumber',
            'driver name': 'driverName',
            'plate': 'plate',
            'associate': 'associate',
            'move date': 'moveDate',
            'rt container': 'rtContainer',
            'size2': 'size2',
            'type2': 'type2',
            'rt from vsl/voy': 'rtFromVslVoy',
            'rt from': 'rtFrom',
            'rt to': 'rtTo',
            'on carrier': 'onCarrier',
            'pol': 'pol',
            'pod': 'pod',
            'bl': 'bl',
            'move type': 'moveType',
            'leg': 'leg',
            'route': 'route',
            'route rt summary': 'routeRtSummary',
            'type 1 / type 2': 'type1Type2'
          };
          
          // Crear mapeo de índices
          const columnIndexes: { [key in keyof TruckingExcelData]?: number } = {};
          
          headers.forEach((header, index) => {
            const field = fieldMapping[header];
            if (field) {
              columnIndexes[field] = index;
              console.log(`Mapeado: "${header}" -> ${field} (columna ${index})`);
            } else {
              console.warn(`Header no reconocido: "${header}"`);
            }
          });
          
          console.log('Mapeo de columnas:', columnIndexes);
          
          // Procesar filas de datos
          const parsedData: TruckingExcelData[] = [];
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Verificar si la fila tiene datos
            const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
            if (!hasData) {
              console.log(`Fila ${i + 1} vacía, saltando...`);
              continue;
            }
            
            const record: Partial<TruckingExcelData> = {};
            
            // Mapear cada campo
            Object.entries(columnIndexes).forEach(([field, columnIndex]) => {
              if (columnIndex !== undefined && columnIndex < row.length) {
                const cellValue = row[columnIndex];
                record[field as keyof TruckingExcelData] = cellValue ? String(cellValue).trim() : '';
              }
            });
            
            // Validar que al menos algunos campos importantes estén presentes
            if (record.container || record.bl || record.driverName) {
              parsedData.push(record as TruckingExcelData);
              console.log(`Fila ${i + 1} procesada:`, record);
            } else {
              console.warn(`Fila ${i + 1} no tiene datos suficientes, saltando:`, record);
            }
          }
          
          console.log('=== RESUMEN DEL PROCESAMIENTO ===');
          console.log('Total de filas procesadas:', rawData.length - 1);
          console.log('Registros válidos extraídos:', parsedData.length);
          
          if (parsedData.length === 0) {
            throw new Error('No se encontraron registros válidos en el archivo Excel');
          }
          
          resolve(parsedData);
          
        } catch (error) {
          console.error('Error completo en parseTruckingExcel:', error);
          reject(new Error(`Error al parsear Excel de trucking: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      
      reader.onerror = (error) => {
        console.error('Error del FileReader:', error);
        reject(new Error('Error al leer el archivo. El archivo podría estar corrupto o en un formato no compatible.'));
      };
      
      console.log('=== INICIANDO PROCESAMIENTO ===');
      console.log('Archivo:', {
        nombre: file.name,
        tamaño: `${(file.size / 1024).toFixed(2)} KB`,
        tipo: file.type || 'no especificado'
      });
      
      reader.readAsArrayBuffer(file);
      
    } catch (error) {
      reject(new Error(`Error al procesar archivo: ${error}`));
    }
  });
};