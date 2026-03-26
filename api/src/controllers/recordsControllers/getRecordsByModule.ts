import { Request, Response } from "express";
import { records } from "../../database";

const getRecordsByModule = async (req: Request, res: Response) => {
  try {
    console.log("🔍 getRecordsByModule - Iniciando búsqueda");
    const { module } = req.params;
    const { page, limit, status, source, search, startDate, endDate, dateField, clientId } = req.query;

    // Construir filtros - usar regex case-insensitive para el módulo; excluir soft-deleted
    const filters: any = {
      module: { $regex: new RegExp(`^${module}$`, 'i') },
      deletedAt: null
    };

    // Status filter: exclude prefacturado/facturado by default unless status=all
    if (status === 'all') {
      // No filter - show all statuses
    } else if (status) {
      filters.status = status;
    } else {
      // Default: exclude prefacturado and facturado
      filters.status = { $nin: ['prefacturado', 'facturado'] };
    }

    if (source) filters.source = source;
    if (clientId) filters.clientId = clientId;

    // Búsqueda por texto (contenedor, orden, línea, etc.)
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(String(search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filters.$or = [
        { 'data.container': searchRegex },
        { 'data.containerConsecutive': searchRegex },
        { 'data.order': searchRegex },
        { 'data.line': searchRegex },
        { containerConsecutive: searchRegex },
        { orderNumber: searchRegex },
      ];
    }

    // Filtro por rango de fechas (createdAt o data.moveDate)
    const start = startDate ? (() => {
      const d = new Date(startDate as string);
      d.setHours(0, 0, 0, 0);
      return d;
    })() : null;
    const end = endDate ? (() => {
      const d = new Date(endDate as string);
      d.setHours(23, 59, 59, 999);
      return d;
    })() : null;

    if (startDate || endDate) {
      if (dateField === 'moveDate') {
        // data.moveDate puede ser Date o string (ISO, DD/MM/YYYY, etc.) → usar agregación para normalizar
        const useMoveDateAggregation = true;
        if (useMoveDateAggregation && start && end) {
          const baseMatch = { ...filters };
          delete baseMatch.$and;
          const pipeline: any[] = [
            { $match: baseMatch },
            {
              $addFields: {
                _normMoveDate: {
                  $cond: {
                    if: { $eq: [{ $type: '$data.moveDate' }, 'date'] },
                    then: '$data.moveDate',
                    else: {
                      $ifNull: [
                        { $toDate: '$data.moveDate' },
                        {
                          $ifNull: [
                            { $dateFromString: { dateString: '$data.moveDate', format: '%d/%m/%Y', onError: null, onNull: null } },
                            { $dateFromString: { dateString: '$data.moveDate', format: '%Y-%m-%d', onError: null, onNull: null } }
                          ]
                        }
                      ]
                    }
                  }
                }
              }
            },
            { $match: { _normMoveDate: { $gte: start, $lte: end, $ne: null } } }
          ];
          const pageNum = parseInt(page as string) || 1;
          const limitNum = parseInt(limit as string) || 10;
          const skip = (pageNum - 1) * limitNum;
          const countResult = await records.aggregate([...pipeline, { $count: 'total' }]);
          const total = countResult[0]?.total ?? 0;
          // Orden estable: mismos createdAt (p. ej. carga masiva) sin _id hacían que skip/limit perdiera filas al paginar
          pipeline.push({ $sort: { createdAt: -1, _id: -1 } }, { $skip: skip }, { $limit: limitNum });
          const ids = await records.aggregate([...pipeline, { $project: { _id: 1 } }]);
          const idList = ids.map((r: any) => r._id);
          const found = idList.length
            ? await records.find({ _id: { $in: idList } })
                .populate('clientId', 'companyName fullName email')
                .populate('excelId', 'filename originalName')
                .populate('createdBy', 'name lastName email')
            : [];
          const orderMap = new Map(idList.map((id: any, i: number) => [id.toString(), i]));
          const moveDateRecordsList = found.sort((a: any, b: any) => (orderMap.get(a._id.toString()) ?? 0) - (orderMap.get(b._id.toString()) ?? 0));
          return res.status(200).json({
            success: true,
            data: moveDateRecordsList,
            pagination: {
              current: pageNum,
              pages: limitNum ? Math.ceil(total / limitNum) : 1,
              total
            }
          });
        }
        const startStr = startDate as string;
        const endStr = endDate as string;
        const moveDateConditions: any[] = [];
        if (start && end) {
          moveDateConditions.push({ 'data.moveDate': { $gte: start, $lte: end } });
          moveDateConditions.push({ 'data.moveDate': { $gte: startStr, $lte: endStr } });
        } else if (start) {
          moveDateConditions.push({ 'data.moveDate': { $gte: start } });
          moveDateConditions.push({ 'data.moveDate': { $gte: startStr } });
        } else if (end) {
          moveDateConditions.push({ 'data.moveDate': { $lte: end } });
          moveDateConditions.push({ 'data.moveDate': { $lte: endStr } });
        }
        if (moveDateConditions.length) {
          filters.$and = filters.$and || [];
          filters.$and.push({ $or: moveDateConditions });
        }
      } else {
        const dateKey = 'createdAt';
        filters[dateKey] = filters[dateKey] || {};
        if (start) filters[dateKey].$gte = start;
        if (end) filters[dateKey].$lte = end;
      }
    }

    let recordsList: any;
    let total: number;

    // Si no se especifica paginación, devolver todos los registros
    if (!page || !limit) {
      console.log("🔍 getRecordsByModule - Sin paginación, buscando todos los registros");
      recordsList = await records.find(filters)
        .populate('clientId', 'companyName fullName email')
        .populate('excelId', 'filename originalName')
        .populate('createdBy', 'name lastName email')
        .sort({ createdAt: -1, _id: -1 });
      total = Array.isArray(recordsList) ? recordsList.length : 0;
      console.log("🔍 getRecordsByModule - Registros encontrados:", total);
    } else {
      const pageNum = parseInt(page as string) || 1;
      const limitNum = parseInt(limit as string) || 10;
      const skip = (pageNum - 1) * limitNum;
      recordsList = await records.find(filters)
        .populate('clientId', 'companyName fullName email')
        .populate('excelId', 'filename originalName')
        .populate('createdBy', 'name lastName email')
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum);
      total = await records.countDocuments(filters);
    }
    
    console.log("🔍 getRecordsByModule - Enviando respuesta con", total, "registros");
    
    res.status(200).json({
      success: true,
      data: recordsList,
      pagination: {
        current: page ? parseInt(page as string) : 1,
        pages: limit ? Math.ceil(total / parseInt(limit as string)) : 1,
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving records",
      error: error instanceof Error ? error.message : error
    });
  }
};

export default getRecordsByModule;