import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../database/schemas/ptyssLocalRouteSchema";
import { response } from "../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

// Rutas predefinidas para todos los clientes basadas en las tablas "TARIFAS / cliente 1-5"
const PREDEFINED_ROUTES_CLIENT_1 = [
  // Rutas desde COLON
  { clientName: 'cliente 1', from: "COLON", to: "ANTON", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "PENONOME", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "AGUADULCE", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "SANTIAGO", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "VERAGUAS", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "CHITRE", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "HERRERA", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "LOS SANTOS", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "LAS TABLAS", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "DAVID", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "VOLCAN", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "GUGABA", price: 0 },
  { clientName: 'cliente 1', from: "COLON", to: "PASO CANOA", price: 0 },
  
  // Rutas desde PSA
  { clientName: 'cliente 1', from: "PSA", to: "SABANITA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "PORTOBELO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "BUENAS VISTA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "CHILIBRE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "LAS CUMBRES", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "LOS ANDES", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "SAN MIGUELITO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "CIUDAD PANAMA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "RIO ABAJO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "VILLA LUCRE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "TOCUMEN", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "24 DICIEMBRE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "PACORA", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "FELIPILLO", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "METETI", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "DARIEN", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "COSTA DEL ESTE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "ARRAIJAN", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "VACAMONTE", price: 0 },
  { clientName: 'cliente 1', from: "PSA", to: "CHORRERA", price: 0 },
  
  // Rutas desde BLB
  { clientName: 'cliente 1', from: "BLB", to: "SABANITAS", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "PORTOBELO", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "BUENAS VISTA", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "CHILIBRE", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "LAS CUMBRES", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "LOS ANDES", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "SAN MIGUELITO", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "CIUDAD PTY", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "RIO ABAJO", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "VILLA LUCRE", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "TOCUMEN", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "24 DICIEMBRE", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "PACORA", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "METETI", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "DARIEN", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "COSTA DEL ESTE", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "ARRAIJAN", price: 0 },
  { clientName: 'cliente 1', from: "BLB", to: "CHORRERA", price: 0 }
];

const PREDEFINED_ROUTES_CLIENT_2 = [
  // Rutas desde PSA
  { clientName: 'cliente 2', from: "PSA", to: "FRANCE FIELD", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "COCOSOLITO", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "COLON FREE ZONE", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "CIUDAD DE PANAMÁ", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "PANAMÁ PACÍFICO", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "TOCUMEN", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "DOMINGO DÍAZ", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "PARQUE SUR", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "DAVIS", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "FARMAZONA", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "BALBOA", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "FELIPILLO", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "CHILIBRE", price: 0 },
  { clientName: 'cliente 2', from: "PSA", to: "DAVID CHIRIQUÍ", price: 0 },
  
  // Rutas desde MIT
  { clientName: 'cliente 2', from: "MIT", to: "FRANCE FIELD", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "COCOSOLITO", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "COLON FREE ZONE", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "CIUDAD DE PANAMÁ", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "PANAMÁ PACÍFICO", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "TOCUMEN", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "DOMINGO DÍAZ", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "PARQUE SUR", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "DAVIS", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "FARMAZONA", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "BALBOA", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "FELIPILLO", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "CHILIBRE", price: 0 },
  { clientName: 'cliente 2', from: "MIT", to: "DAVID CHIRIQUÍ", price: 0 },
  
  // Rutas desde BLB
  { clientName: 'cliente 2', from: "BLB", to: "FRANCE FIELD", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "COCOSOLITO", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "COLON FREE ZONE", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "CIUDAD DE PANAMÁ", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "PANAMÁ PACÍFICO", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "TOCUMEN", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "DOMINGO DÍAZ", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "PARQUE SUR", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "DAVIS", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "FARMAZONA", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "BALBOA", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "FELIPILLO", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "CHILIBRE", price: 0 },
  { clientName: 'cliente 2', from: "BLB", to: "DAVID CHIRIQUÍ", price: 0 }
];

const PREDEFINED_ROUTES_CLIENT_3 = [
  // Rutas desde BLB
  { clientName: 'cliente 3', from: "BLB", to: "PANANMA PACIFICO", price: 0 },
  
  // Rutas desde PSA
  { clientName: 'cliente 3', from: "PSA", to: "PANANMA PACIFICO", price: 0 },
  
  // Rutas desde MIT
  { clientName: 'cliente 3', from: "MIT", to: "PANANMA PACIFICO", price: 0 }
];

const PREDEFINED_ROUTES_CLIENT_4 = [
  // Rutas desde BLB
  { clientName: 'cliente 4', from: "BLB", to: "ARRAIJAN", price: 0 },
  { clientName: 'cliente 4', from: "BLB", to: "PANAMA", price: 0 },
  
  // Rutas desde MIT
  { clientName: 'cliente 4', from: "MIT", to: "ARRAIJAN", price: 0 },
  { clientName: 'cliente 4', from: "MIT", to: "PANAMA", price: 0 },
  
  // Rutas desde PSA
  { clientName: 'cliente 4', from: "PSA", to: "ARRAIJAN", price: 0 }
];

const PREDEFINED_ROUTES_CLIENT_5 = [
  // Rutas desde BLB
  { clientName: 'cliente 5', from: "BLB", to: "PANAMA PACIFICO", price: 0 }
];

const seedPTYSSLocalRoutes = async (req: Request, res: Response) => {
  try {
    console.log('🌱 Iniciando seed de rutas locales de PTYSS para todos los clientes...');

    // Limpiar todas las rutas existentes
    await PTYSSLocalRoute.deleteMany({});
    console.log('🗑️ Todas las rutas existentes eliminadas');

    // Combinar todas las rutas de todos los clientes
    const allRoutes = [
      ...PREDEFINED_ROUTES_CLIENT_1,
      ...PREDEFINED_ROUTES_CLIENT_2,
      ...PREDEFINED_ROUTES_CLIENT_3,
      ...PREDEFINED_ROUTES_CLIENT_4,
      ...PREDEFINED_ROUTES_CLIENT_5
    ];

    // Insertar todas las rutas predefinidas
    const routes = await PTYSSLocalRoute.insertMany(allRoutes);
    console.log(`✅ ${routes.length} rutas predefinidas insertadas para todos los clientes`);

    // Agrupar por cliente para el resumen
    const routesByClient = routes.reduce((acc, route) => {
      if (!acc[route.clientName]) {
        acc[route.clientName] = [];
      }
      acc[route.clientName].push(route);
      return acc;
    }, {} as Record<string, any[]>);

    // Contar rutas por origen para cada cliente
    const summary = Object.keys(routesByClient).map(clientName => {
      const clientRoutes = routesByClient[clientName];
      const origins = clientRoutes.map(r => r.from).filter((origin, index, arr) => arr.indexOf(origin) === index);
      const originCounts = origins.map(origin => ({
        origin,
        count: clientRoutes.filter(r => r.from === origin).length
      }));
      
      return {
        client: clientName,
        totalRoutes: clientRoutes.length,
        origins: originCounts
      };
    });

    const result = {
      message: 'Seed completado exitosamente para todos los clientes',
      data: {
        totalRoutes: routes.length,
        clients: summary,
        routes: routes.map(r => ({ clientName: r.clientName, from: r.from, to: r.to, price: r.price }))
      }
    };
    
    console.log('📤 Enviando respuesta:', JSON.stringify(result, null, 2));
    
    return response(res, 200, result);

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    return response(res, 500, { 
      message: 'Error durante el seed de rutas locales de PTYSS',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default seedPTYSSLocalRoutes; 