import { Request, Response } from "express";
import { records } from "../../database";

const getRecordsByIds = async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Se requiere un array de IDs",
      });
    }

    const recordsList = await records
      .find({ _id: { $in: ids } })
      .populate("clientId", "companyName fullName email")
      .populate("excelId", "filename originalName")
      .populate("createdBy", "name lastName email");

    res.status(200).json({
      success: true,
      data: recordsList,
      total: recordsList.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving records by IDs",
      error: error instanceof Error ? error.message : error,
    });
  }
};

export default getRecordsByIds;
