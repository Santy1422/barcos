import { Request, Response } from "express";
import { response } from "../../utils";

const debugImport = async (req: Request, res: Response) => {
  try {
    const { routes } = req.body;

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return response(res, 400, { message: 'Se requiere un array de rutas válido' });
    }

    const analysis = {
      totalRoutes: routes.length,
      validRoutes: 0,
      invalidRoutes: 0,
      sampleValid: null as any,
      sampleInvalid: null as any,
      fieldAnalysis: {
        billing: { present: 0, missing: 0, empty: 0 },
        routeArea: { present: 0, missing: 0, empty: 0 },
        origin: { present: 0, missing: 0, empty: 0 },
        destination: { present: 0, missing: 0, empty: 0 },
        status: { present: 0, missing: 0, empty: 0 },
        sizeContenedor: { present: 0, missing: 0, empty: 0 },
        tipo: { present: 0, missing: 0, empty: 0 },
        cliente: { present: 0, missing: 0, empty: 0 },
        rate: { present: 0, missing: 0, empty: 0, invalid: 0 }
      },
      errors: [] as string[]
    };

    // Analizar las primeras 10 rutas en detalle
    const sampleSize = Math.min(10, routes.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const route = routes[i];
      const routeErrors = [];
      
      // Analizar cada campo
      const fields = ['billing', 'routeArea', 'origin', 'destination', 'status', 'sizeContenedor', 'tipo', 'cliente', 'rate'];
      
      fields.forEach(field => {
        if (route[field] === undefined) {
          analysis.fieldAnalysis[field as keyof typeof analysis.fieldAnalysis].missing++;
          routeErrors.push(`${field}: missing`);
        } else if (route[field] === null || route[field] === '') {
          analysis.fieldAnalysis[field as keyof typeof analysis.fieldAnalysis].empty++;
          routeErrors.push(`${field}: empty`);
        } else {
          analysis.fieldAnalysis[field as keyof typeof analysis.fieldAnalysis].present++;
        }
      });

      // Validación especial para rate
      if (route.rate !== undefined && route.rate !== null && route.rate !== '') {
        const rateNum = parseFloat(route.rate);
        if (isNaN(rateNum) || rateNum <= 0) {
          analysis.fieldAnalysis.rate.invalid++;
          routeErrors.push(`rate: invalid (${route.rate})`);
        }
      }

      if (routeErrors.length === 0) {
        analysis.validRoutes++;
        if (!analysis.sampleValid) {
          analysis.sampleValid = route;
        }
      } else {
        analysis.invalidRoutes++;
        if (!analysis.sampleInvalid) {
          analysis.sampleInvalid = { route, errors: routeErrors };
        }
        analysis.errors.push(`Ruta ${i}: ${routeErrors.join(', ')}`);
      }
    }

    // Análisis rápido del resto
    for (let i = sampleSize; i < routes.length; i++) {
      const route = routes[i];
      let isValid = true;

      if (!route.billing || !route.routeArea || !route.origin || 
          !route.destination || !route.status || !route.sizeContenedor || 
          !route.tipo || !route.cliente || !route.rate) {
        isValid = false;
      }

      if (isValid) {
        const rateNum = parseFloat(route.rate);
        if (isNaN(rateNum) || rateNum <= 0) {
          isValid = false;
        }
      }

      if (isValid) {
        analysis.validRoutes++;
      } else {
        analysis.invalidRoutes++;
      }
    }

    return response(res, 200, {
      message: 'Análisis de datos completado',
      data: analysis
    });

  } catch (error) {
    console.error('Error en análisis de debug:', error);
    return response(res, 500, {
      message: 'Error interno del servidor durante el análisis',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default debugImport;
