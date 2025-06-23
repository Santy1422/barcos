import { Request, Response } from "express";
import { records } from "../../database";

const getRecordsByModule = async (req: Request, res: Response) => {
  try {
    const { module } = req.params;
    const { page = 1, limit = 10, status, source } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;
    
    // Construir filtros
    const filters: any = { module };
    if (status) filters.status = status;
    if (source) filters.source = source;
    
    const recordsList = await records.find(filters)
      .populate('client', 'name email')
      .populate('excelFile', 'filename originalName')
      .populate('createdBy', 'name lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await records.countDocuments(filters);
    
    res.status(200).json({
      success: true,
      data: recordsList,
      pagination: {
        current: pageNum,
        pages: Math.ceil(total / limitNum),
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