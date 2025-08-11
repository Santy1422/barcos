import { Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import AgencyService from "../../database/schemas/agencyServiceSchema";

// Import response utility
const { response } = require('../../utils');

// Configure upload directory
const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'agency');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer configuration for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const serviceId = req.body.serviceId || 'temp';
    const timestamp = Date.now();
    const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${serviceId}_${timestamp}_${sanitizedOriginalName}`;
    cb(null, fileName);
  }
});

// File filter to accept only PDFs
const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// Multer upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 1 // Single file upload
  }
});

// Upload service PDF
export const uploadServicePDF = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.body;
    const file = (req as any).file;

    // Validate file was uploaded
    if (!file) {
      return response(res, 400, { message: 'No file uploaded' });
    }

    // Validate service ID
    if (!serviceId) {
      // Delete uploaded file if no service ID provided
      fs.unlinkSync(file.path);
      return response(res, 400, { message: 'Service ID is required' });
    }

    // Find service
    const service = await AgencyService.findById(serviceId);
    if (!service) {
      // Delete uploaded file if service not found
      fs.unlinkSync(file.path);
      return response(res, 404, { message: 'Service not found' });
    }

    // Check if service can be edited
    if (!service.canBeEdited || !service.canBeEdited()) {
      // Delete uploaded file if service cannot be edited
      fs.unlinkSync(file.path);
      return response(res, 400, { message: 'Service cannot be edited in current status' });
    }

    // Check maximum files per service (5 files max)
    if (service.attachments && service.attachments.length >= 5) {
      // Delete uploaded file if limit exceeded
      fs.unlinkSync(file.path);
      return response(res, 400, { message: 'Maximum 5 files allowed per service' });
    }

    // Create attachment object
    const attachment = {
      fileName: file.originalname,
      fileUrl: `/uploads/agency/${file.filename}`,
      uploadDate: new Date()
    };

    // Add attachment to service
    service.attachments.push(attachment);
    service.updatedBy = (req as any).user?._id;
    await service.save();

    return response(res, 201, {
      success: true,
      fileName: file.filename,
      originalName: file.originalname,
      filePath: attachment.fileUrl,
      fileSize: file.size,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up file if error occurred
    if ((req as any).file && fs.existsSync((req as any).file.path)) {
      fs.unlinkSync((req as any).file.path);
    }

    return response(res, 500, {
      message: 'Error uploading file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get service files
export const getServiceFiles = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    // Find service
    const service = await AgencyService.findById(serviceId);
    if (!service) {
      return response(res, 404, { message: 'Service not found' });
    }

    // Get file metadata for each attachment
    const filesWithMetadata = service.attachments.map(attachment => {
      const filePath = path.join(process.cwd(), attachment.fileUrl);
      let fileSize = 0;
      let exists = false;

      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          fileSize = stats.size;
          exists = true;
        }
      } catch (err) {
        console.error(`Error getting file stats for ${filePath}:`, err);
      }

      return {
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        uploadDate: attachment.uploadDate,
        fileSize,
        exists,
        sizeFormatted: formatFileSize(fileSize)
      };
    });

    return response(res, 200, {
      success: true,
      serviceId,
      files: filesWithMetadata,
      totalFiles: filesWithMetadata.length
    });
  } catch (error) {
    console.error('Error getting service files:', error);
    return response(res, 500, {
      message: 'Error getting service files',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete service file
export const deleteServiceFile = async (req: Request, res: Response) => {
  try {
    const { serviceId, fileName } = req.params;

    // Find service
    const service = await AgencyService.findById(serviceId);
    if (!service) {
      return response(res, 404, { message: 'Service not found' });
    }

    // Check if service can be edited
    if (!service.canBeEdited || !service.canBeEdited()) {
      return response(res, 400, { message: 'Service cannot be edited in current status' });
    }

    // Find attachment
    const attachmentIndex = service.attachments.findIndex(
      att => att.fileUrl.includes(fileName)
    );

    if (attachmentIndex === -1) {
      return response(res, 404, { message: 'File not found in service' });
    }

    const attachment = service.attachments[attachmentIndex];
    const filePath = path.join(process.cwd(), attachment.fileUrl);

    // Delete file from filesystem
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.error(`Error deleting file ${filePath}:`, err);
    }

    // Remove attachment from service
    service.attachments.splice(attachmentIndex, 1);
    service.updatedBy = (req as any).user?._id;
    await service.save();

    return response(res, 200, {
      success: true,
      message: 'File deleted successfully',
      remainingFiles: service.attachments.length
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return response(res, 500, {
      message: 'Error deleting file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Download service file
export const downloadServiceFile = async (req: Request, res: Response) => {
  try {
    const { fileName } = req.params;

    // Validate file name
    if (!fileName) {
      return response(res, 400, { message: 'File name is required' });
    }

    // Construct file path
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return response(res, 404, { message: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size.toString());

    // Stream file to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        return response(res, 500, {
          message: 'Error downloading file',
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error('Error downloading file:', error);
    return response(res, 500, {
      message: 'Error downloading file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// View service file (inline in browser)
export const viewServiceFile = async (req: Request, res: Response) => {
  try {
    const { fileName } = req.params;

    // Validate file name
    if (!fileName) {
      return response(res, 400, { message: 'File name is required' });
    }

    // Construct file path
    const filePath = path.join(UPLOAD_DIR, fileName);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return response(res, 404, { message: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Set appropriate headers for PDF viewing
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.setHeader('Content-Length', stats.size.toString());

    // Stream file to client
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('error', (error) => {
      console.error('Error streaming file:', error);
      if (!res.headersSent) {
        return response(res, 500, {
          message: 'Error viewing file',
          error: error.message
        });
      }
    });
  } catch (error) {
    console.error('Error viewing file:', error);
    return response(res, 500, {
      message: 'Error viewing file',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Bulk upload multiple PDFs
export const bulkUploadServicePDFs = async (req: Request, res: Response) => {
  const uploadedFiles: string[] = [];
  
  try {
    const { serviceId } = req.body;
    const files = (req as any).files as any[];

    // Validate files were uploaded
    if (!files || files.length === 0) {
      return response(res, 400, { message: 'No files uploaded' });
    }

    // Validate service ID
    if (!serviceId) {
      // Delete all uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return response(res, 400, { message: 'Service ID is required' });
    }

    // Find service
    const service = await AgencyService.findById(serviceId);
    if (!service) {
      // Delete all uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return response(res, 404, { message: 'Service not found' });
    }

    // Check if service can be edited
    if (!service.canBeEdited || !service.canBeEdited()) {
      // Delete all uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return response(res, 400, { message: 'Service cannot be edited in current status' });
    }

    // Check maximum files per service
    const currentFileCount = service.attachments?.length || 0;
    const newFileCount = files.length;
    const totalFileCount = currentFileCount + newFileCount;

    if (totalFileCount > 5) {
      // Delete all uploaded files
      files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return response(res, 400, {
        message: `Cannot upload ${newFileCount} files. Service already has ${currentFileCount} files (max 5 allowed)`
      });
    }

    // Process each file
    const attachments = files.map(file => {
      uploadedFiles.push(file.path);
      return {
        fileName: file.originalname,
        fileUrl: `/uploads/agency/${file.filename}`,
        uploadDate: new Date()
      };
    });

    // Add attachments to service
    service.attachments.push(...attachments);
    service.updatedBy = (req as any).user?._id;
    await service.save();

    return response(res, 201, {
      success: true,
      uploadedFiles: attachments.map(att => ({
        fileName: att.fileName,
        fileUrl: att.fileUrl
      })),
      totalFiles: service.attachments.length,
      message: `${files.length} files uploaded successfully`
    });
  } catch (error) {
    console.error('Error bulk uploading files:', error);
    
    // Clean up uploaded files on error
    uploadedFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });

    return response(res, 500, {
      message: 'Error bulk uploading files',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Clean up orphaned files (maintenance task)
export const cleanupOrphanedFiles = async (req: Request, res: Response) => {
  try {
    const { dryRun = 'true' } = req.query;
    const isDryRun = dryRun === 'true';

    // Get all files in upload directory
    const filesInDirectory = fs.readdirSync(UPLOAD_DIR);
    
    // Get all file references from database
    const services = await AgencyService.find({}, 'attachments');
    const dbFileUrls = new Set<string>();
    
    services.forEach(service => {
      service.attachments.forEach(attachment => {
        const fileName = path.basename(attachment.fileUrl);
        dbFileUrls.add(fileName);
      });
    });

    // Find orphaned files
    const orphanedFiles: string[] = [];
    const orphanedFileSizes: number[] = [];
    
    filesInDirectory.forEach(fileName => {
      if (!dbFileUrls.has(fileName)) {
        orphanedFiles.push(fileName);
        const filePath = path.join(UPLOAD_DIR, fileName);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          orphanedFileSizes.push(stats.size);
        }
      }
    });

    // Delete orphaned files if not dry run
    let deletedCount = 0;
    let totalSizeFreed = 0;

    if (!isDryRun && orphanedFiles.length > 0) {
      orphanedFiles.forEach((fileName, index) => {
        const filePath = path.join(UPLOAD_DIR, fileName);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            deletedCount++;
            totalSizeFreed += orphanedFileSizes[index] || 0;
          }
        } catch (err) {
          console.error(`Error deleting orphaned file ${fileName}:`, err);
        }
      });
    }

    return response(res, 200, {
      success: true,
      dryRun: isDryRun,
      orphanedFiles,
      orphanedCount: orphanedFiles.length,
      deletedCount: isDryRun ? 0 : deletedCount,
      totalSizeFreed: formatFileSize(totalSizeFreed),
      message: isDryRun 
        ? `Found ${orphanedFiles.length} orphaned files (dry run - no files deleted)`
        : `Deleted ${deletedCount} orphaned files, freed ${formatFileSize(totalSizeFreed)}`
    });
  } catch (error) {
    console.error('Error cleaning up orphaned files:', error);
    return response(res, 500, {
      message: 'Error cleaning up orphaned files',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}