import { Request, Response } from "express";
import mongoose from "mongoose";
import ptyssLocalRouteSchema from "../../database/schemas/ptyssLocalRouteSchema";
import { response } from "../../utils";

const PTYSSLocalRoute = mongoose.model('PTYSSLocalRoute', ptyssLocalRouteSchema);

const getSchemaSummary = async (req: Request, res: Response) => {
  try {
    // Obtener resumen de todos los esquemas
    const schemasSummary = await PTYSSLocalRoute.aggregate([
      {
        $group: {
          _id: "$clientName",
          routeCount: { 
            $sum: {
              $cond: [
                { $and: [
                  { $ne: ["$from", "__PLACEHOLDER__"] },
                  { $ne: ["$to", "__PLACEHOLDER__"] }
                ]},
                1,
                0
              ]
            }
          },
          associatedClient: { $first: "$realClientId" },
          createdAt: { $min: "$createdAt" },
          updatedAt: { $max: "$updatedAt" }
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "associatedClient",
          foreignField: "_id",
          as: "clientInfo"
        }
      },
      {
        $project: {
          schemaName: "$_id",
          routeCount: 1,
          isAssociated: { $ne: ["$associatedClient", null] },
          associatedClient: {
            $cond: {
              if: { $ne: ["$associatedClient", null] },
              then: {
                _id: { $arrayElemAt: ["$clientInfo._id", 0] },
                type: { $arrayElemAt: ["$clientInfo.type", 0] },
                name: {
                  $cond: {
                    if: { $eq: [{ $arrayElemAt: ["$clientInfo.type", 0] }, "natural"] },
                    then: { $arrayElemAt: ["$clientInfo.fullName", 0] },
                    else: { $arrayElemAt: ["$clientInfo.companyName", 0] }
                  }
                },
                sapCode: { $arrayElemAt: ["$clientInfo.sapCode", 0] },
                email: { $arrayElemAt: ["$clientInfo.email", 0] }
              },
              else: null
            }
          },
          createdAt: 1,
          updatedAt: 1,
          _id: 0
        }
      },
      {
        $sort: { schemaName: 1 }
      }
    ]);

    return response(res, 200, { 
      message: 'Resumen de esquemas obtenido exitosamente',
      data: {
        schemas: schemasSummary,
        totalSchemas: schemasSummary.length,
        totalRoutes: schemasSummary.reduce((sum, schema) => sum + schema.routeCount, 0),
        associatedSchemas: schemasSummary.filter(schema => schema.isAssociated).length
      }
    });
  } catch (error) {
    console.error('Error obteniendo resumen de esquemas:', error);
    return response(res, 500, { 
      message: 'Error interno del servidor al obtener resumen de esquemas',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
};

export default getSchemaSummary; 