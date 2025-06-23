import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import { excelFiles } from "../../database";

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/excel/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

const uploadExcelFile = async (req: Request, res: Response) => {
  try {
    upload.single('excelFile')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
//@ts-ignore
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No se ha subido ningún archivo"
        });
      }

      const { module, description } = req.body;
    // @ts-ignore

      const excelFile = new ExcelFile({
            // @ts-ignore

        filename: req.file.filename,
    // @ts-ignore

        originalName: req.file.originalname,
    // @ts-ignore

        path: req.file.path,
    // @ts-ignore

        size: req.file.size,
        module,
        description,
    // @ts-ignore

        uploadedBy: req.user?.id,
        status: 'uploaded'
      });

      await excelFile.save();

      res.status(201).json({
        success: true,
        message: "Archivo Excel subido exitosamente",
        data: excelFile
      });
    });
  } catch (error) {
    console.error("Error al subir archivo Excel:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
};

export default uploadExcelFile;