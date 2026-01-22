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
  line: string; // Campo Line para subcliente en PTYSS
  fe: string; // Campo F/E del Excel
  // Campos agregados para el matching
  matchedPrice?: number;
  matchedRouteId?: string;
  matchedRouteName?: string;
  isMatched?: boolean;
  sapCode?:string;
  detectedContainerType?: "dry" | "reefer"; // Tipo de contenedor detectado por el matching
  matchFailReason?: string; // Razón por la que falló el matching (para diagnóstico)
  // Campos extraídos del leg para PTYSS
  from?: string;
  to?: string;
}

// Función para determinar si un tipo de contenedor es Reefer o Dry basándose en la categoría real del backend
export const determineContainerTypeMatch = (
  containerType: string, 
  routeContainerType: "dry" | "reefer",
  containerTypesFromBackend: Array<{ code: string; category: string }>
): boolean => {
  const normalizedType = containerType.toUpperCase();
  
  // Buscar el tipo de contenedor en la base de datos
  const foundContainerType = containerTypesFromBackend.find(ct => 
    ct.code.toUpperCase() === normalizedType
  );
  
  if (!foundContainerType) {
    console.warn(`Tipo de contenedor no encontrado en la base de datos: ${normalizedType}`);
    return false;
  }
  
  console.log(`  Tipo encontrado en BD: ${foundContainerType.code} - Categoría: ${foundContainerType.category}`);
  
  // Mapear la categoría del backend a dry/reefer
  const isReefer = foundContainerType.category === 'REEFE';
  const isDry = foundContainerType.category === 'DRY';
  
  // Si la ruta es REEFER, el contenedor debe ser reefer
  if (routeContainerType === 'reefer') {
    return isReefer;
  }
  
  // Si la ruta es DRY, el contenedor debe ser dry
  if (routeContainerType === 'dry') {
    return isDry;
  }
  
  return false;
};

// Función para hacer matching con las rutas configuradas
export const matchTruckingDataWithRoutes = async (
  excelData: TruckingExcelData[], 
  routes: Array<{
    _id: string, 
    name: string, 
    origin: string,
    destination: string,
    containerType: string, 
    routeType: "SINGLE" | "RT", 
    price: number,
    status: "FULL" | "EMPTY",
    cliente: string,
    routeArea: string,
    sizeContenedor: string
  }>,
  containerTypesFromBackend: Array<{ code: string; category: string }>,
  onProgress?: (current: number, total: number, currentRecord: string, matchesFound: number) => void
): Promise<TruckingExcelData[]> => {
  console.log("=== INICIANDO MATCHING ===")
  console.log("Rutas disponibles:", routes.length)
  console.log("Tipos de contenedores del backend:", containerTypesFromBackend.length)
  console.log("Datos del Excel:", excelData.length)
  console.log("")
  
  // Mostrar algunos ejemplos de rutas para debug
  if (routes.length > 0) {
    console.log("Ejemplos de rutas disponibles:")
    routes.slice(0, 3).forEach((route, index) => {
      console.log(`  Ruta ${index + 1}: ${route.name} | ${route.containerType} | ${route.routeType} | ${route.cliente} | ${route.sizeContenedor}`)
    })
  }
  
  // Mostrar algunos ejemplos de datos del Excel
  if (excelData.length > 0) {
    console.log("Ejemplos de datos del Excel:")
    excelData.slice(0, 3).forEach((record, index) => {
      console.log(`  Registro ${index + 1}: ${record.leg} | ${record.type} | ${record.moveType} | ${record.line} | ${record.size}`)
    })
  }
  console.log("")
  
  let matchesFound = 0;
  const results: TruckingExcelData[] = [];
  
  // Crear índices para optimizar las búsquedas
  console.log("=== CREANDO ÍNDICES PARA OPTIMIZACIÓN ===")
  
  // Índice por nombre de ruta (más específico)
  const routesByName = new Map<string, typeof routes>();
  routes.forEach(route => {
    const normalizedName = route.name?.trim().replace(/\s*\/\s*/g, '/').toUpperCase() || '';
    if (!routesByName.has(normalizedName)) {
      routesByName.set(normalizedName, []);
    }
    routesByName.get(normalizedName)!.push(route);
  });
  
  // Índice por tipo de contenedor
  const routesByContainerType = new Map<string, typeof routes>();
  routes.forEach(route => {
    const containerType = route.containerType?.trim().toUpperCase() || '';
    if (!routesByContainerType.has(containerType)) {
      routesByContainerType.set(containerType, []);
    }
    routesByContainerType.get(containerType)!.push(route);
  });
  
  // Índice por cliente
  const routesByCliente = new Map<string, typeof routes>();
  routes.forEach(route => {
    const cliente = route.cliente?.trim().toLowerCase() || '';
    if (!routesByCliente.has(cliente)) {
      routesByCliente.set(cliente, []);
    }
    routesByCliente.get(cliente)!.push(route);
  });
  
  console.log(`Índices creados: ${routesByName.size} nombres únicos, ${routesByContainerType.size} tipos de contenedor, ${routesByCliente.size} clientes`)
  
  for (let index = 0; index < excelData.length; index++) {
    const record = excelData[index];
    
    // Reportar progreso (incluyendo el primer registro en 0%)
    onProgress?.(index, excelData.length, `${record.container || 'N/A'} - ${record.leg || 'N/A'}`, matchesFound);
    
    // Permitir que la UI se actualice
    if (index % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    console.log(`Procesando registro ${index + 1}:`)
    console.log(`  Leg: "${record.leg}"`)
    console.log(`  MoveType: "${record.moveType}"`)
    console.log(`  Type: "${record.type}"`)
    console.log(`  Line (Cliente): "${record.line}"`)
    console.log(`  Size: "${record.size}"`)
    console.log(`  F/E: "${record.fe}"`)
    
    // OPTIMIZACIÓN: Filtrar por criterios más específicos primero
    
    // 1. Filtrar por nombre de ruta (más específico)
    const normalizedLeg = record.leg?.trim().replace(/\s*\/\s*/g, '/').toUpperCase() || '';
    let candidateRoutes = routesByName.get(normalizedLeg) || [];
    console.log(`  Rutas candidatas por nombre "${normalizedLeg}": ${candidateRoutes.length}`)
    
    if (candidateRoutes.length === 0) {
      console.log(`  ❌ No hay rutas con nombre "${normalizedLeg}"`)
      results.push({
        ...record,
        matchedPrice: 0,
        matchedRouteId: '',
        matchedRouteName: '',
        isMatched: false,
        sapCode: 'TRK002',
        matchFailReason: `No existe ruta "${normalizedLeg}". Créala en Catálogos.`
      });
      continue;
    }

    // 2. Filtrar por moveType (solo 2 valores posibles)
    const normalizedMoveType = record.moveType?.trim().toLowerCase() || '';
    const targetRouteType = 
      (normalizedMoveType === 's' || normalizedMoveType === 'single') ? 'SINGLE' :
      (normalizedMoveType === 'rt') ? 'RT' : null;
    
    if (!targetRouteType) {
      console.log(`  ❌ MoveType "${normalizedMoveType}" no válido`)
      results.push({
        ...record,
        matchedPrice: 0,
        matchedRouteId: '',
        matchedRouteName: '',
        isMatched: false,
        sapCode: 'TRK002',
        matchFailReason: `MoveType "${normalizedMoveType}" no válido. Debe ser S/Single o RT.`
      });
      continue;
    }

    candidateRoutes = candidateRoutes.filter(route => route.routeType === targetRouteType);
    console.log(`  Rutas candidatas después de filtrar por moveType "${targetRouteType}": ${candidateRoutes.length}`)

    if (candidateRoutes.length === 0) {
      console.log(`  ❌ No hay rutas con moveType "${targetRouteType}"`)
      results.push({
        ...record,
        matchedPrice: 0,
        matchedRouteId: '',
        matchedRouteName: '',
        isMatched: false,
        sapCode: 'TRK002',
        matchFailReason: `No existe ruta "${normalizedLeg}" con tipo ${targetRouteType}. Créala en Catálogos.`
      });
      continue;
    }

    // 3. Verificar que el tipo de contenedor existe en la BD
    const normalizedType = record.type?.trim().toUpperCase() || '';
    const containerTypeExists = containerTypesFromBackend.some(ct =>
      ct.code.toUpperCase() === normalizedType
    );

    if (!containerTypeExists && normalizedType) {
      console.warn(`    ⚠️  Tipo de contenedor "${normalizedType}" no existe en la base de datos de tipos de contenedores`);
    }

    if (!containerTypeExists) {
      console.log(`  ❌ Tipo de contenedor "${normalizedType}" no existe en BD`)
      results.push({
        ...record,
        matchedPrice: 0,
        matchedRouteId: '',
        matchedRouteName: '',
        isMatched: false,
        sapCode: 'TRK002',
        matchFailReason: `Tipo "${normalizedType}" no existe en Catálogos. Créalo primero.`
      });
      continue;
    }
    
    // 4. Filtrar por tipo de contenedor
    const routesBeforeContainerType = candidateRoutes.length;
    candidateRoutes = candidateRoutes.filter(route =>
      route.containerType?.trim().toUpperCase() === normalizedType
    );
    console.log(`  Rutas candidatas después de filtrar por tipo "${normalizedType}": ${candidateRoutes.length}`)

    if (candidateRoutes.length === 0) {
      console.log(`  ❌ No hay rutas con tipo de contenedor "${normalizedType}"`)
      results.push({
        ...record,
        matchedPrice: 0,
        matchedRouteId: '',
        matchedRouteName: '',
        isMatched: false,
        sapCode: 'TRK002',
        matchFailReason: `Ruta "${normalizedLeg}" existe pero no para contenedor "${normalizedType}". Crea ruta con ese tipo.`
      });
      continue;
    }

    // 5. Filtrar por cliente (si existe en el registro)
    const normalizedLine = record.line?.trim().toLowerCase() || '';
    const routesBeforeClient = candidateRoutes.length;
    if (normalizedLine) {
      candidateRoutes = candidateRoutes.filter(route => {
        const normalizedCliente = route.cliente?.trim().toLowerCase() || '';
        return normalizedCliente === normalizedLine;
      });
      console.log(`  Rutas candidatas después de filtrar por cliente "${normalizedLine}": ${candidateRoutes.length}`)

      if (candidateRoutes.length === 0) {
        console.log(`  ❌ No hay rutas para cliente "${normalizedLine}"`)
        results.push({
          ...record,
          matchedPrice: 0,
          matchedRouteId: '',
          matchedRouteName: '',
          isMatched: false,
          sapCode: 'TRK002',
          matchFailReason: `Ruta "${normalizedLeg}" con tipo "${normalizedType}" existe, pero no para cliente "${normalizedLine.toUpperCase()}". Crea ruta para ese cliente.`
        });
        continue;
      }
    }

    // 6. Filtrar por tamaño (si existe en el registro)
    const normalizedSize = record.size?.trim().toUpperCase() || '';
    const routesBeforeSize = candidateRoutes.length;
    if (normalizedSize) {
      candidateRoutes = candidateRoutes.filter(route => {
        const normalizedSizeContenedor = route.sizeContenedor?.trim().toUpperCase() || '';
        return normalizedSizeContenedor === normalizedSize;
      });
      console.log(`  Rutas candidatas después de filtrar por tamaño "${normalizedSize}": ${candidateRoutes.length}`)

      if (candidateRoutes.length === 0) {
        console.log(`  ❌ No hay rutas para tamaño "${normalizedSize}"`)
        results.push({
          ...record,
          matchedPrice: 0,
          matchedRouteId: '',
          matchedRouteName: '',
          isMatched: false,
          sapCode: 'TRK002',
          matchFailReason: `Ruta "${normalizedLeg}" tipo "${normalizedType}" cliente "${normalizedLine.toUpperCase()}" existe, pero no para tamaño ${normalizedSize}. Crea ruta con tamaño ${normalizedSize}.`
        });
        continue;
      }
    }

    // 7. Filtrar por status (FULL/EMPTY) basado en el campo F/E del Excel
    const feValue = record.fe?.toString().trim().toUpperCase() || '';
    // Mapear valores de F/E a status:
    // - "F", "FULL", "2" → FULL
    // - "E", "EMPTY", "1", "0", "" → EMPTY
    const targetStatus: "FULL" | "EMPTY" | null =
      (feValue === 'F' || feValue === 'FULL' || feValue === '2') ? 'FULL' :
      (feValue === 'E' || feValue === 'EMPTY' || feValue === '1' || feValue === '0') ? 'EMPTY' : null;

    const routesBeforeStatus = candidateRoutes.length;
    if (targetStatus) {
      candidateRoutes = candidateRoutes.filter(route => route.status === targetStatus);
      console.log(`  Rutas candidatas después de filtrar por status "${targetStatus}" (F/E="${feValue}"): ${candidateRoutes.length}`)

      // Si no hay rutas con ese status específico, intentar con el status opuesto como fallback
      if (candidateRoutes.length === 0 && routesBeforeStatus > 0) {
        console.log(`  ⚠️  No hay rutas con status "${targetStatus}", usando fallback...`)
        // Restaurar las rutas candidatas sin filtro de status
        candidateRoutes = routesByName.get(normalizedLeg) || [];
        candidateRoutes = candidateRoutes.filter(route => route.routeType === targetRouteType);
        candidateRoutes = candidateRoutes.filter(route => route.containerType?.trim().toUpperCase() === normalizedType);
        if (normalizedLine) {
          candidateRoutes = candidateRoutes.filter(route => route.cliente?.trim().toLowerCase() === normalizedLine);
        }
        if (normalizedSize) {
          candidateRoutes = candidateRoutes.filter(route => route.sizeContenedor?.trim().toUpperCase() === normalizedSize);
        }
      }
    } else {
      console.log(`  F/E no especificado o no reconocido ("${feValue}"), no se filtra por status`)
    }

    // Buscar la mejor coincidencia (ya filtradas las candidatas)
    const matchedRoute = candidateRoutes[0]; // Tomar la primera coincidencia ya que ya están filtradas
    
    console.log(`  Rutas candidatas finales: ${candidateRoutes.length}`)
    if (candidateRoutes.length > 1) {
      console.log(`  ⚠️  Múltiples coincidencias encontradas, tomando la primera`)
    }
    
    if (matchedRoute) {
      matchesFound++;
      console.log(`  ✅ MATCH ENCONTRADO: ${matchedRoute.name} - $${matchedRoute.price}`)
      
      // Determinar el tipo de contenedor detectado basado en la categoría del backend
      const containerTypeInfo = containerTypesFromBackend.find(ct => 
        ct.code.toUpperCase() === matchedRoute.containerType?.toUpperCase()
      );
      const detectedContainerType = containerTypeInfo?.category === 'REEFE' ? 'reefer' : 'dry';
      
      results.push({
        ...record,
        matchedPrice: matchedRoute.price,
        matchedRouteId: matchedRoute._id || '',
        matchedRouteName: matchedRoute.name || '',
        isMatched: true,
        sapCode: 'TRK002',
        detectedContainerType: detectedContainerType
      });
      continue;
    } else {
      console.log(`  ❌ NO SE ENCONTRÓ MATCH - Intentando matching flexible...`)
      
      // Intentar matching más flexible - leg, moveType y containerType (pero sin cliente ni size)
      const flexibleMatch = routes.find(route => {
        const normalizedLeg = record.leg?.trim().replace(/\s*\/\s*/g, '/').toUpperCase() || '';
        const normalizedRouteName = route.name?.trim().replace(/\s*\/\s*/g, '/').toUpperCase() || '';
        const legMatch = normalizedRouteName === normalizedLeg;
        
        const normalizedMoveType = record.moveType?.trim().toLowerCase() || '';
        const moveTypeMatch = 
          (normalizedMoveType === 's' && route.routeType === 'SINGLE') ||
          (normalizedMoveType === 'single' && route.routeType === 'SINGLE') ||
          (normalizedMoveType === 'rt' && route.routeType === 'RT') ||
          (normalizedMoveType === 'rt' && route.routeType === 'RT');
        
        // Verificar que el tipo de contenedor del Excel existe en las rutas guardadas
        const normalizedType = record.type?.trim().toUpperCase() || '';
        const containerTypeMatch = normalizedType === route.containerType?.trim().toUpperCase();
        
        // Verificar que el tipo de contenedor existe en la base de datos de tipos de contenedores
        const containerTypeExists = containerTypesFromBackend.some(ct => 
          ct.code.toUpperCase() === normalizedType
        );
        
        if (!containerTypeExists && normalizedType) {
          console.warn(`    ⚠️  [Flexible] Tipo de contenedor "${normalizedType}" no existe en la base de datos de tipos de contenedores`);
        }
        
        console.log(`    Matching flexible: "${normalizedLeg}" vs "${normalizedRouteName}" = ${legMatch}, "${normalizedMoveType}" vs "${route.routeType}" = ${moveTypeMatch}, "${normalizedType}" vs "${route.containerType}" = ${containerTypeMatch}, tipo existe en BD = ${containerTypeExists}`)
        return legMatch && moveTypeMatch && containerTypeMatch && containerTypeExists;
      });
      
      if (flexibleMatch) {
        matchesFound++;
        console.log(`  ✅ MATCH FLEXIBLE ENCONTRADO: ${flexibleMatch.name} - $${flexibleMatch.price}`)
        
        const containerTypeInfo = containerTypesFromBackend.find(ct => 
          ct.code.toUpperCase() === flexibleMatch.containerType?.toUpperCase()
        );
        const detectedContainerType = containerTypeInfo?.category === 'REEFE' ? 'reefer' : 'dry';
        
        results.push({
          ...record,
          matchedPrice: flexibleMatch.price,
          matchedRouteId: flexibleMatch._id || '',
          matchedRouteName: flexibleMatch.name || '',
          isMatched: true,
          sapCode: 'TRK002',
          detectedContainerType: detectedContainerType
        });
        continue;
      }
      
      console.log(`  ❌ NO SE ENCONTRÓ NINGÚN MATCH`)
      // Construir mensaje de fallo detallado
      const targetStatus = (feValue === 'F' || feValue === 'FULL' || feValue === '2') ? 'FULL' :
        (feValue === 'E' || feValue === 'EMPTY' || feValue === '1' || feValue === '0') ? 'EMPTY' : null;
      const failReason = `No existe ruta exacta para: ${normalizedLeg}, tipo ${normalizedType}, cliente ${normalizedLine.toUpperCase()}, tamaño ${normalizedSize}${targetStatus ? `, status ${targetStatus}` : ''}. Crea la ruta en Catálogos.`;

      results.push({
        ...record,
        matchedPrice: 0,
        matchedRouteId: '',
        matchedRouteName: '',
        isMatched: false,
        sapCode: 'TRK002',
        matchFailReason: failReason
      });
    }
  }

  return results;
};

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
          console.log('Headers originales (sin procesar):', rawData[0]);
          console.log('Buscando containerConsecutive en headers:', headers.includes('containerconsecutive'));
          console.log('Headers que contienen "consecutive":', headers.filter(h => h.includes('consecutive')));
          
          // Mapeo de headers a campos del objeto
          const fieldMapping: { [key: string]: keyof TruckingExcelData } = {
            'containerconsecutive': 'containerConsecutive',
            'container consecutive': 'containerConsecutive',
            'consecutive': 'containerConsecutive',
            'containerconsecutive': 'containerConsecutive',
            'container consecutive': 'containerConsecutive',
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
            'type 1 / type 2': 'type1Type2',
            'line': 'line',
            'f/e': 'fe',
            'fe': 'fe'
          };
          
          // Crear mapeo de índices
          const columnIndexes: { [key in keyof TruckingExcelData]?: number } = {};
          
          headers.forEach((header, index) => {
            // Buscar coincidencia exacta primero
            let field = fieldMapping[header];
            
            // Si no hay coincidencia exacta, buscar case-insensitive
            if (!field) {
              const normalizedHeader = header.toLowerCase().replace(/\s+/g, '');
              for (const [key, value] of Object.entries(fieldMapping)) {
                const normalizedKey = key.toLowerCase().replace(/\s+/g, '');
                if (normalizedKey === normalizedHeader) {
                  field = value;
                  break;
                }
              }
            }
            
            if (field) {
              columnIndexes[field] = index;
              console.log(`Mapeado: "${header}" -> ${field} (columna ${index})`);
            } else {
              console.warn(`Header no reconocido: "${header}"`);
            }
          });
          
          console.log('Mapeo de columnas:', columnIndexes);
          console.log('¿ContainerConsecutive mapeado?', columnIndexes.containerConsecutive !== undefined);
          
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
                // Mantener el valor original del Excel para 'associate' en Trucking
                (record as any)[field] = cellValue ? String(cellValue).trim() : '';
              }
            });
            
            // Validar que al menos algunos campos importantes estén presentes
            if (record.container || record.bl || record.driverName) {
              // Asignar sapCode por defecto
              const recordWithSapCode = {
                ...record,
                sapCode: 'TRK002'
              } as TruckingExcelData;
              
              parsedData.push(recordWithSapCode);
              console.log(`Fila ${i + 1} procesada:`, recordWithSapCode);
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

export interface PTYSSExcelData {
  clientId: string
  order: string
  container: string
  naviera: string
  from: string
  to: string
  operationType: string
  containerSize: string
  containerType: string
  estadia: string
  genset: string
  retencion: string
  pesaje: string
  ti: string
  matriculaCamion: string
  conductor: string
  numeroChasisPlaca: string
  moveDate: string
  notes: string
  // Campos agregados para el matching
  matchedPrice?: number
  matchedRouteId?: string
  matchedRouteName?: string
  isMatched?: boolean
}

// Interface para datos de ShipChandler Excel
export interface ShipChandlerExcelData {
  customerName: string;
  invoiceNo: string;
  invoiceType: string;
  vessel: string;
  date: string;
  referenceNo: string;
  deliveryAddress: string;
  discount: number;
  deliveryExpenses: number;
  portEntryFee: number;
  customsFee: number;
  authorities: number;
  otherExpenses: number;
  overTime: number;
  total: number;
  // Campos agregados para el guardado
  clientId?: string;
  isMatched?: boolean;
}

// Función para parsear Excel de ShipChandler
export const parseShipChandlerExcel = async (file: File): Promise<ShipChandlerExcelData[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'));
        return;
      }

      if (file.size === 0) {
        reject(new Error('El archivo seleccionado está vacío'));
        return;
      }

      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Obtener la primera hoja
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          
          // Convertir a JSON
          const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (rawData.length < 2) {
            reject(new Error('El archivo debe tener al menos una fila de encabezados y una fila de datos'));
            return;
          }
          
          // Obtener encabezados (primera fila)
          const headers = rawData[0] as string[];
          
          // Normalizar nombres de columnas (case-insensitive y flexible)
          const normalizeHeader = (header: string): string => {
            return header?.toString().toLowerCase().trim().replace(/\s+/g, ' ') || '';
          };
          
          // Mapear índices de columnas
          const columnIndexes: Record<string, number> = {};
          
          headers.forEach((header, index) => {
            const normalized = normalizeHeader(header);
            
            // Mapear diferentes variaciones de nombres de columnas
            if (normalized.includes('customer name') || normalized.includes('customer') || normalized.includes('cliente')) {
              columnIndexes.customerName = index;
            } else if (normalized.includes('invoice no') || normalized.includes('invoice number') || normalized.includes('factura')) {
              columnIndexes.invoiceNo = index;
            } else if (normalized.includes('invoice type') || normalized.includes('tipo factura')) {
              columnIndexes.invoiceType = index;
            } else if (normalized.includes('vessel') || normalized.includes('barco') || normalized.includes('embarcacion')) {
              columnIndexes.vessel = index;
            } else if (normalized.includes('date') || normalized.includes('fecha')) {
              columnIndexes.date = index;
            } else if (normalized.includes('reference no') || normalized.includes('reference number') || normalized.includes('referencia')) {
              columnIndexes.referenceNo = index;
            } else if (normalized.includes('delivery address') || normalized.includes('direccion entrega')) {
              columnIndexes.deliveryAddress = index;
            } else if (normalized.includes('discount') || normalized.includes('descuento')) {
              columnIndexes.discount = index;
            } else if (normalized.includes('delivery expenses') || normalized.includes('gastos entrega')) {
              columnIndexes.deliveryExpenses = index;
            } else if (normalized.includes('port entry fee') || normalized.includes('tarifa entrada puerto')) {
              columnIndexes.portEntryFee = index;
            } else if (normalized.includes('customs fee') || normalized.includes('tarifa aduana')) {
              columnIndexes.customsFee = index;
            } else if (normalized.includes('authorities') || normalized.includes('autoridades')) {
              columnIndexes.authorities = index;
            } else if (normalized.includes('other expenses') || normalized.includes('otros gastos')) {
              columnIndexes.otherExpenses = index;
            } else if (normalized.includes('over time') || normalized.includes('tiempo extra') || normalized.includes('overtime')) {
              columnIndexes.overTime = index;
            } else if (normalized === 'total' || (normalized.includes('total') && !normalized.includes('entry') && !normalized.includes('fee'))) {
              if (!columnIndexes.total) {
                columnIndexes.total = index;
              }
            }
          });
          
          // Verificar que se encontraron las columnas requeridas
          const requiredColumns = ['customerName', 'invoiceNo', 'total'];
          const missingColumns = requiredColumns.filter(col => columnIndexes[col] === undefined);
          
          if (missingColumns.length > 0) {
            reject(new Error(`No se encontraron las siguientes columnas requeridas: ${missingColumns.join(', ')}`));
            return;
          }
          
          // Procesar filas de datos
          const parsedData: ShipChandlerExcelData[] = [];
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i] as any[];
            
            // Verificar si la fila tiene datos
            const hasData = row.some((cell: any) => cell !== null && cell !== undefined && String(cell).trim() !== '');
            if (!hasData) {
              console.log(`Fila ${i + 1} vacía, saltando...`);
              continue;
            }
            
            // Función helper para obtener valor de celda
            const getValue = (colName: string): any => {
              const index = columnIndexes[colName];
              if (index === undefined || index >= row.length) return '';
              const value = row[index];
              return value !== null && value !== undefined ? value : '';
            };
            
            // Función helper para obtener valor numérico
            const getNumber = (colName: string): number => {
              const value = getValue(colName);
              if (typeof value === 'number') return value;
              if (typeof value === 'string') {
                const cleaned = value.replace(/[^0-9.-]/g, '');
                return cleaned ? parseFloat(cleaned) : 0;
              }
              return 0;
            };
            
            const invoiceType = String(getValue('invoiceType')).trim();
            
            // Solo procesar registros con Invoice Type = "Invoice"
            const normalizedInvoiceType = invoiceType.toLowerCase();
            if (normalizedInvoiceType !== 'invoice') {
              console.log(`Fila ${i + 1} ignorada: Invoice Type = "${invoiceType}" (solo se procesan registros con tipo "Invoice")`);
              continue;
            }
            
            const record: ShipChandlerExcelData = {
              customerName: String(getValue('customerName')).trim(),
              invoiceNo: String(getValue('invoiceNo')).trim(),
              invoiceType: invoiceType,
              vessel: String(getValue('vessel')).trim(),
              date: String(getValue('date')).trim(),
              referenceNo: String(getValue('referenceNo')).trim(),
              deliveryAddress: String(getValue('deliveryAddress')).trim(),
              discount: getNumber('discount'),
              deliveryExpenses: getNumber('deliveryExpenses'),
              portEntryFee: getNumber('portEntryFee'),
              customsFee: getNumber('customsFee'),
              authorities: getNumber('authorities'),
              otherExpenses: getNumber('otherExpenses'),
              overTime: getNumber('overTime'),
              total: getNumber('total'),
              isMatched: true, // Todos los registros de ShipChandler se consideran válidos
            };
            
            // Validar que al menos tenga customerName, invoiceNo y total
            if (record.customerName && record.invoiceNo && record.total !== undefined) {
              parsedData.push(record);
              console.log(`Fila ${i + 1} procesada:`, record);
            } else {
              console.warn(`Fila ${i + 1} no tiene datos suficientes, saltando:`, record);
            }
          }
          
          console.log('=== RESUMEN DEL PROCESAMIENTO SHIPCHANDLER ===');
          console.log('Total de filas procesadas:', rawData.length - 1);
          console.log('Registros con Invoice Type = "Invoice" extraídos:', parsedData.length);
          console.log(`(Notas de crédito y retornos fueron filtrados)`);
          
          if (parsedData.length === 0) {
            reject(new Error('No se encontraron registros válidos con Invoice Type = "Invoice" en el archivo Excel. Solo se procesan facturas, no notas de crédito ni retornos.'));
            return;
          }
          
          resolve(parsedData);
          
        } catch (error: any) {
          console.error('Error al procesar el archivo Excel:', error);
          reject(new Error(`Error al procesar el archivo: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Error al leer el archivo'));
      };
      
      reader.readAsArrayBuffer(file);
    } catch (error: any) {
      reject(new Error(`Error al procesar el archivo: ${error.message}`));
    }
  });
};

// Agency Excel Data Interface
export interface AgencyExcelData {
  serviceDate: string
  pickupDate: string
  pickupTime: string
  pickupLocation: string
  dropoffLocation: string
  vessel: string
  voyage?: string
  crewName: string
  crewMembers?: string
  crewRank?: string
  nationality?: string
  transportCompany?: string
  driverName?: string
  flightInfo?: string
  waitingTime?: number
  passengerCount?: number
  price?: number
  currency?: string
  serviceCode?: string
  clientName: string
  comments?: string
  notes?: string
  // Campos agregados para el matching
  matchedPrice?: number
  matchedRouteId?: string
  matchedRouteName?: string
  isMatched?: boolean
  sapCode?: string
}

// Función para hacer matching con las rutas configuradas de PTYSS
export const matchPTYSSDataWithRoutes = (
  excelData: PTYSSExcelData[], 
  routes: Array<{_id: string, name: string, from: string, to: string, containerType: string, routeType: "single" | "RT", price: number}>
): PTYSSExcelData[] => {
  console.log("=== INICIANDO MATCHING PTYSS ===")
  console.log("Rutas disponibles:", routes)
  console.log("")
  
  return excelData.map((record, index) => {
    console.log(`Procesando registro PTYSS ${index + 1}:`)
    console.log(`  From: "${record.from || 'undefined'}"`)
    console.log(`  To: "${record.to || 'undefined'}"`)
    console.log(`  ContainerType: "${record.containerType || 'undefined'}"`)
    
    // Buscar coincidencia basada en los criterios:
    // 1. from (origen de la ruta)
    // 2. to (destino de la ruta)
    // 3. containerType (tipo de contenedor de la ruta)
    
    const matchedRoute = routes.find(route => {
      const fromMatch = route.from.toLowerCase().trim() === (record.from || '').toLowerCase().trim()
      const toMatch = route.to.toLowerCase().trim() === (record.to || '').toLowerCase().trim()
      const containerTypeMatch = route.containerType.toLowerCase().trim() === (record.containerType || '').toLowerCase().trim()
      
      return fromMatch && toMatch && containerTypeMatch
    })
    
    if (matchedRoute) {
      console.log(`  ✅ Match encontrado: ${matchedRoute.name} - $${matchedRoute.price}`)
      return {
        ...record,
        matchedPrice: matchedRoute.price,
        matchedRouteId: matchedRoute._id,
        matchedRouteName: matchedRoute.name,
        isMatched: true,
        detectedContainerType: matchedRoute.containerType
      }
    } else {
      console.log(`  ❌ No se encontró match`)
      return {
        ...record,
        isMatched: false
      }
    }
  })
}

export const parsePTYSSExcel = async (file: File): Promise<PTYSSExcelData[]> => {
  return new Promise(async (resolve, reject) => {
    try {
      // Validaciones más flexibles
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'))
        return
      }

      if (file.size === 0) {
        reject(new Error('El archivo seleccionado está vacío'))
        return
      }

      // Validación más flexible de extensiones
      const fileName = file.name.toLowerCase()
      const validExtensions = ['.xlsx', '.xls', '.csv']
      const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext))
      
      if (!hasValidExtension) {
        console.warn('Extensión no reconocida, intentando procesar como Excel:', fileName)
      }

      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          console.log('Archivo PTYSS cargado exitosamente, procesando...')
          
          const arrayBuffer = e.target?.result as ArrayBuffer
          if (!arrayBuffer) {
            throw new Error('No se pudo obtener el contenido del archivo')
          }

          console.log('Tamaño del buffer:', arrayBuffer.byteLength)

          // Usar XLSX
          let workbook
          try {
            workbook = XLSX.read(arrayBuffer, { 
              type: 'array',
              cellText: false,
              cellHTML: false,
              sheetStubs: false,
              bookVBA: false
            })
          } catch (xlsxError) {
            console.error('Error al leer con XLSX:', xlsxError)
            throw new Error('El archivo no es un Excel válido o está corrupto')
          }
          
          if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('El archivo Excel no contiene hojas de trabajo')
          }
          
          console.log('Hojas encontradas:', workbook.SheetNames)
          
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          if (!worksheet) {
            throw new Error(`No se pudo acceder a la hoja: ${sheetName}`)
          }
          
          // Verificar si la hoja tiene datos
          const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
          console.log('Rango de datos:', worksheet['!ref'])
          
          if (range.e.r < 1) {
            throw new Error('El archivo Excel no contiene suficientes filas de datos')
          }
          
          // Convertir a array de arrays
          const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '', 
            raw: false 
          })
          
          console.log('Datos en bruto extraídos:', rawData.length, 'filas')
          console.log('Primera fila (headers):', rawData[0])
          
          if (rawData.length < 2) {
            throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos')
          }
          
          // Primera fila como headers
          const headers = rawData[0].map((header: any) => 
            String(header || '').trim().toLowerCase()
          )
          
          console.log('Headers procesados:', headers)
          
          // Mapeo de headers a campos del objeto PTYSS
          const fieldMapping: { [key: string]: keyof PTYSSExcelData } = {
            // Headers del archivo real de PTYSS
            'containerconsecutive': 'order',
            'container': 'container',
            'size': 'containerSize',
            'type': 'containerType',
            'from vsl/voy': 'from',
            'driver name': 'conductor',
            'plate': 'matriculaCamion',
            'associate': 'clientId',
            'move date': 'moveDate',
            'move type': 'operationType',
            'leg': 'to',
            'route': 'naviera',
            // Mapeos adicionales para diferentes formatos
            'rt from': 'from',
            'rt to': 'to',
            'pol': 'from',
            'pod': 'to',
            // Headers alternativos que podrían existir
            'clientid': 'clientId',
            'order': 'order',
            'naviera': 'naviera',
            'from': 'from',
            'to': 'to',
            'operationtype': 'operationType',
            'containersize': 'containerSize',
            'containertype': 'containerType',
            'estadia': 'estadia',
            'genset': 'genset',
            'retencion': 'retencion',
            'pesaje': 'pesaje',
            'ti': 'ti',
            'matriculacamion': 'matriculaCamion',
            'conductor': 'conductor',
            'numerochasisplaca': 'numeroChasisPlaca',
            'movedate': 'moveDate',
            'notes': 'notes'
          }
          
          // Crear mapeo de índices
          const columnIndexes: { [key in keyof PTYSSExcelData]?: number } = {}
          
          headers.forEach((header, index) => {
            const field = fieldMapping[header]
            if (field) {
              columnIndexes[field] = index
              console.log(`Mapeado: "${header}" -> ${field} (columna ${index})`)
            } else {
              console.warn(`Header no reconocido: "${header}"`)
            }
          })
          
          console.log('Mapeo de columnas:', columnIndexes)
          
          // Procesar filas de datos
          const parsedData: PTYSSExcelData[] = []
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i]
            
            // Verificar si la fila tiene datos
            const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
            if (!hasData) {
              console.log(`Fila ${i + 1} vacía, saltando...`)
              continue
            }
            
            const record: Partial<PTYSSExcelData> = {}
            
            // Mapear cada campo
            Object.entries(columnIndexes).forEach(([field, columnIndex]) => {
              if (columnIndex !== undefined && columnIndex < row.length) {
                const cellValue = row[columnIndex]
                ;(record as any)[field] = cellValue ? String(cellValue).trim() : ''
              }
            })
            
            // Validar que al menos algunos campos importantes estén presentes
            if (record.container || record.order || record.clientId) {
              // Agregar valores por defecto para campos faltantes
              const completeRecord: PTYSSExcelData = {
                clientId: record.clientId || '',
                order: record.order || '',
                container: record.container || '',
                naviera: record.naviera || '',
                from: record.from || '',
                to: record.to || '',
                operationType: record.operationType || '',
                containerSize: record.containerSize || '',
                containerType: record.containerType || '',
                estadia: record.estadia || '',
                genset: record.genset || '',
                retencion: record.retencion || '',
                pesaje: record.pesaje || '',
                ti: record.ti || '',
                matriculaCamion: record.matriculaCamion || '',
                conductor: record.conductor || '',
                numeroChasisPlaca: record.numeroChasisPlaca || '',
                moveDate: record.moveDate || '',
                notes: record.notes || ''
              }
              
              parsedData.push(completeRecord)
              console.log(`Fila ${i + 1} procesada:`, completeRecord)
            } else {
              console.warn(`Fila ${i + 1} no tiene datos suficientes, saltando:`, record)
            }
          }
          
          console.log('=== RESUMEN DEL PROCESAMIENTO PTYSS ===')
          console.log('Total de filas procesadas:', rawData.length - 1)
          console.log('Registros válidos extraídos:', parsedData.length)
          
          if (parsedData.length === 0) {
            throw new Error('No se encontraron registros válidos en el archivo Excel')
          }
          
          resolve(parsedData)
          
        } catch (error) {
          console.error('Error completo en parsePTYSSExcel:', error)
          reject(new Error(`Error al parsear Excel de PTYSS: ${error instanceof Error ? error.message : String(error)}`))
        }
      }
      
      reader.onerror = (error) => {
        console.error('Error del FileReader:', error)
        reject(new Error('Error al leer el archivo. El archivo podría estar corrupto o en un formato no compatible.'))
      }
      
      console.log('=== INICIANDO PROCESAMIENTO PTYSS ===')
      console.log('Archivo:', {
        nombre: file.name,
        tamaño: `${(file.size / 1024).toFixed(2)} KB`,
        tipo: file.type || 'no especificado'
      })
      
      reader.readAsArrayBuffer(file)
      
    } catch (error) {
      reject(new Error(`Error al procesar archivo: ${error}`))
    }
  })
}

// Función para parsear Excel de Agency
export const parseAgencyExcel = (file: File): Promise<AgencyExcelData[]> => {
  return new Promise((resolve, reject) => {
    try {
      if (!file) {
        reject(new Error('No se seleccionó ningún archivo'))
        return
      }

      if (file.size === 0) {
        reject(new Error('El archivo seleccionado está vacío'))
        return
      }

      const reader = new FileReader()
      
      reader.onload = (e) => {
        try {
          console.log('=== PARSEANDO EXCEL DE AGENCY ===')
          
          const arrayBuffer = e.target?.result as ArrayBuffer
          if (!arrayBuffer) {
            throw new Error('No se pudo obtener el contenido del archivo')
          }

          const workbook = XLSX.read(arrayBuffer, { 
            type: 'array',
            cellText: false,
            cellHTML: false
          })
          
          if (!workbook || !workbook.SheetNames || workbook.SheetNames.length === 0) {
            throw new Error('El archivo Excel no contiene hojas de trabajo')
          }
          
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          
          // Convertir a array de arrays
          const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1, 
            defval: '', 
            raw: false 
          })
          
          if (rawData.length < 2) {
            throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de datos')
          }
          
          // Primera fila como headers
          const headers = rawData[0].map((header: any) => 
            String(header || '').trim().toLowerCase()
          )
          
          console.log('Headers encontrados:', headers)
          
          // Mapeo de headers a campos del objeto Agency
          const fieldMapping: { [key: string]: keyof AgencyExcelData } = {
            'service date': 'serviceDate',
            'servicedate': 'serviceDate',
            'fecha servicio': 'serviceDate',
            'pickup date': 'pickupDate',
            'pickupdate': 'pickupDate',
            'fecha recogida': 'pickupDate',
            'pickup time': 'pickupTime',
            'pickuptime': 'pickupTime',
            'hora recogida': 'pickupTime',
            'pickup location': 'pickupLocation',
            'pickup': 'pickupLocation',
            'origen': 'pickupLocation',
            'from': 'pickupLocation',
            'dropoff location': 'dropoffLocation',
            'dropoff': 'dropoffLocation',
            'destino': 'dropoffLocation',
            'to': 'dropoffLocation',
            'vessel': 'vessel',
            'buque': 'vessel',
            'ship': 'vessel',
            'voyage': 'voyage',
            'viaje': 'voyage',
            'crew name': 'crewName',
            'crewname': 'crewName',
            'crew': 'crewName',
            'tripulante': 'crewName',
            'nombre': 'crewName',
            'crew members': 'crewMembers',
            'crewmembers': 'crewMembers',
            'passengers': 'passengerCount',
            'pasajeros': 'passengerCount',
            'pax': 'passengerCount',
            'rank': 'crewRank',
            'rango': 'crewRank',
            'position': 'crewRank',
            'nationality': 'nationality',
            'nacionalidad': 'nationality',
            'transport company': 'transportCompany',
            'transportcompany': 'transportCompany',
            'empresa': 'transportCompany',
            'driver': 'driverName',
            'conductor': 'driverName',
            'chofer': 'driverName',
            'flight': 'flightInfo',
            'vuelo': 'flightInfo',
            'waiting time': 'waitingTime',
            'waitingtime': 'waitingTime',
            'espera': 'waitingTime',
            'price': 'price',
            'precio': 'price',
            'amount': 'price',
            'currency': 'currency',
            'moneda': 'currency',
            'service code': 'serviceCode',
            'servicecode': 'serviceCode',
            'sap code': 'sapCode',
            'sapcode': 'sapCode',
            'taulia': 'serviceCode',
            'client': 'clientName',
            'cliente': 'clientName',
            'customer': 'clientName',
            'comments': 'comments',
            'comentarios': 'comments',
            'notes': 'notes',
            'notas': 'notes',
            'observaciones': 'notes'
          }
          
          // Mapear índices de columnas
          const columnIndexes: { [key: string]: number | undefined } = {}
          headers.forEach((header, index) => {
            const field = fieldMapping[header]
            if (field) {
              columnIndexes[field] = index
            }
          })
          
          console.log('Mapeo de columnas:', columnIndexes)
          
          // Procesar las filas de datos
          const parsedData: AgencyExcelData[] = []
          
          for (let i = 1; i < rawData.length; i++) {
            const row = rawData[i]
            
            // Saltar filas completamente vacías
            const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')
            if (!hasData) continue
            
            const record: Partial<AgencyExcelData> = {}
            
            // Mapear cada campo
            Object.entries(columnIndexes).forEach(([field, columnIndex]) => {
              if (columnIndex !== undefined && columnIndex < row.length) {
                const cellValue = row[columnIndex]
                ;(record as any)[field] = cellValue ? String(cellValue).trim() : ''
              }
            })
            
            // Validar que al menos algunos campos importantes estén presentes
            if (record.vessel || record.crewName || record.pickupLocation) {
              // Agregar valores por defecto para campos faltantes
              const completeRecord: AgencyExcelData = {
                serviceDate: record.serviceDate || new Date().toISOString().split('T')[0],
                pickupDate: record.pickupDate || record.serviceDate || new Date().toISOString().split('T')[0],
                pickupTime: record.pickupTime || '00:00',
                pickupLocation: record.pickupLocation || '',
                dropoffLocation: record.dropoffLocation || '',
                vessel: record.vessel || '',
                voyage: record.voyage || '',
                crewName: record.crewName || '',
                crewMembers: record.crewMembers || '',
                crewRank: record.crewRank || '',
                nationality: record.nationality || '',
                transportCompany: record.transportCompany || '',
                driverName: record.driverName || '',
                flightInfo: record.flightInfo || '',
                waitingTime: Number(record.waitingTime) || 0,
                passengerCount: Number(record.passengerCount) || 1,
                price: Number(record.price) || 0,
                currency: record.currency || 'USD',
                serviceCode: record.serviceCode || '',
                clientName: record.clientName || 'DEFAULT',
                comments: record.comments || '',
                notes: record.notes || '',
                sapCode: record.sapCode || record.serviceCode || ''
              }
              
              parsedData.push(completeRecord)
            }
          }
          
          console.log('=== RESUMEN DEL PROCESAMIENTO AGENCY ===')
          console.log('Total de filas procesadas:', rawData.length - 1)
          console.log('Registros válidos extraídos:', parsedData.length)
          
          if (parsedData.length === 0) {
            throw new Error('No se encontraron registros válidos en el archivo Excel')
          }
          
          resolve(parsedData)
          
        } catch (error) {
          console.error('Error en parseAgencyExcel:', error)
          reject(new Error(`Error al parsear Excel de Agency: ${error instanceof Error ? error.message : String(error)}`))
        }
      }
      
      reader.onerror = (error) => {
        console.error('Error del FileReader:', error)
        reject(new Error('Error al leer el archivo'))
      }
      
      reader.readAsArrayBuffer(file)
      
    } catch (error) {
      reject(new Error(`Error al procesar archivo: ${error}`))
    }
  })
}

// Función para hacer matching con las rutas de precios de Agency
export const matchAgencyDataWithPricing = async (
  excelData: AgencyExcelData[],
  routePricing: Array<{
    _id: string,
    metadata: {
      fromLocation: string,
      toLocation: string,
      basePrice: number,
      pricePerPerson: number,
      waitingTimePrice: number,
      currency: string
    }
  }>,
  onProgress?: (progress: number) => void
): Promise<AgencyExcelData[]> => {
  console.log("=== INICIANDO MATCHING AGENCY ===")
  console.log("Rutas de precios disponibles:", routePricing.length)
  
  const totalRecords = excelData.length
  let processedRecords = 0
  
  const matchedData = excelData.map((record, index) => {
    console.log(`Procesando registro Agency ${index + 1}:`)
    console.log(`  Pickup: "${record.pickupLocation}"`)
    console.log(`  Dropoff: "${record.dropoffLocation}"`)
    console.log(`  Passengers: ${record.passengerCount}`)
    console.log(`  Waiting Time: ${record.waitingTime}`)
    
    // Buscar coincidencia de ruta
    const matchedRoute = routePricing.find(route => {
      const fromMatch = route.metadata.fromLocation.toLowerCase().trim() === 
        (record.pickupLocation || '').toLowerCase().trim()
      const toMatch = route.metadata.toLocation.toLowerCase().trim() === 
        (record.dropoffLocation || '').toLowerCase().trim()
      
      return fromMatch && toMatch
    })
    
    processedRecords++
    if (onProgress) {
      onProgress(Math.round((processedRecords / totalRecords) * 100))
    }
    
    if (matchedRoute) {
      // Calcular precio basado en la ruta encontrada
      const basePrice = matchedRoute.metadata.basePrice || 100
      const waitingTimeCharge = (record.waitingTime || 0) * (matchedRoute.metadata.waitingTimePrice || 10)
      const passengerSurcharge = Math.max(0, ((record.passengerCount || 1) - 1) * (matchedRoute.metadata.pricePerPerson || 20))
      const totalPrice = basePrice + waitingTimeCharge + passengerSurcharge
      
      console.log(`  ✅ Match encontrado: ${matchedRoute.metadata.fromLocation} → ${matchedRoute.metadata.toLocation}`)
      console.log(`     Base: $${basePrice}, Waiting: $${waitingTimeCharge}, Extra Pax: $${passengerSurcharge}`)
      console.log(`     Total: $${totalPrice}`)
      
      return {
        ...record,
        matchedPrice: totalPrice,
        matchedRouteId: matchedRoute._id,
        matchedRouteName: `${matchedRoute.metadata.fromLocation} → ${matchedRoute.metadata.toLocation}`,
        isMatched: true,
        price: record.price || totalPrice,
        currency: matchedRoute.metadata.currency || record.currency || 'USD'
      }
    } else {
      console.log(`  ❌ No se encontró ruta configurada`)
      
      // Precio por defecto si no hay match
      const defaultPrice = 100
      const waitingTimeCharge = (record.waitingTime || 0) * 10
      const passengerSurcharge = Math.max(0, ((record.passengerCount || 1) - 1) * 20)
      const totalPrice = defaultPrice + waitingTimeCharge + passengerSurcharge
      
      return {
        ...record,
        matchedPrice: totalPrice,
        isMatched: false,
        price: record.price || totalPrice
      }
    }
  })
  
  console.log("=== MATCHING AGENCY COMPLETADO ===")
  console.log(`Total procesados: ${matchedData.length}`)
  console.log(`Con match: ${matchedData.filter(r => r.isMatched).length}`)
  console.log(`Sin match: ${matchedData.filter(r => !r.isMatched).length}`)
  
  return matchedData
}