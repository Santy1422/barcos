import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { excelFiles } from "../../database";

// Configurar directorio de subida
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'excel');

// Asegurar que el directorio existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('Created Excel upload directory:', UPLOAD_DIR);
}

// Configuración de multer para subida de archivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
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
      
      // Validar que el módulo sea válido
      const validModules = ['trucking', 'shipchandler', 'agency', 'ptyss'];
      if (!module || !validModules.includes(module)) {
        return res.status(400).json({
          success: false,
          message: `Módulo inválido. Debe ser uno de: ${validModules.join(', ')}`
        });
      }
      
      // @ts-ignore
      const excelFile = new excelFiles({
        // @ts-ignore
        filename: req.file.filename,
        // @ts-ignore
        fileSize: req.file.size,
        type: `${module}-data`, // Tipo según el módulo
        module,
        // @ts-ignore
        uploadedBy: req.user?._id || req.user?.id,
        status: 'processing' // Estado inicial: processing, completed, error
      });

      const savedFile = await excelFile.save();

      res.status(201).json({
        success: true,
        message: "Archivo Excel subido exitosamente",
        data: savedFile
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