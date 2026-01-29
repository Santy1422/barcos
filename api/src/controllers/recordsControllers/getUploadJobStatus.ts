import { uploadJobs } from "../../database";
import { response } from "../../utils";
import mongoose from "mongoose";

/**
 * Obtiene el estado de un job de procesamiento
 */
export const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return response(res, 400, { error: "jobId inválido" });
    }

    const job = await uploadJobs.findById(jobId);

    if (!job) {
      return response(res, 404, { error: "Job no encontrado" });
    }

    // Verificar que el usuario sea el dueño del job
    if (job.userId.toString() !== req.user?._id?.toString()) {
      return response(res, 403, { error: "No tienes permiso para ver este job" });
    }

    return response(res, 200, {
      job: {
        id: job._id,
        module: job.module,
        status: job.status,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        createdRecords: job.createdRecords,
        duplicateRecords: job.duplicateRecords,
        errorRecords: job.errorRecords,
        progress: job.totalRecords > 0
          ? Math.round((job.processedRecords / job.totalRecords) * 100)
          : 0,
        uploadErrors: job.uploadErrors,
        duplicates: job.duplicates,
        result: job.result,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        createdAt: job.createdAt
      }
    });

  } catch (error: any) {
    console.error("Error obteniendo estado del job:", error);
    return response(res, 500, {
      error: "Error interno",
      details: error.message
    });
  }
};

/**
 * Obtiene los jobs pendientes/en proceso del usuario actual
 */
export const getUserPendingJobs = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return response(res, 401, { error: "Usuario no autenticado" });
    }

    const jobs = await uploadJobs.find({
      userId,
      status: { $in: ['pending', 'processing'] }
    }).sort({ createdAt: -1 }).limit(10);

    return response(res, 200, {
      jobs: jobs.map(job => ({
        id: job._id,
        module: job.module,
        status: job.status,
        totalRecords: job.totalRecords,
        processedRecords: job.processedRecords,
        progress: job.totalRecords > 0
          ? Math.round((job.processedRecords / job.totalRecords) * 100)
          : 0,
        createdAt: job.createdAt
      }))
    });

  } catch (error: any) {
    console.error("Error obteniendo jobs del usuario:", error);
    return response(res, 500, {
      error: "Error interno",
      details: error.message
    });
  }
};

/**
 * Obtiene el historial de jobs del usuario (últimos 20)
 */
export const getUserJobHistory = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return response(res, 401, { error: "Usuario no autenticado" });
    }

    const jobs = await uploadJobs.find({ userId })
      .sort({ createdAt: -1 })
      .limit(20);

    return response(res, 200, {
      jobs: jobs.map(job => ({
        id: job._id,
        module: job.module,
        status: job.status,
        totalRecords: job.totalRecords,
        createdRecords: job.createdRecords,
        duplicateRecords: job.duplicateRecords,
        errorRecords: job.errorRecords,
        result: job.result,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }))
    });

  } catch (error: any) {
    console.error("Error obteniendo historial de jobs:", error);
    return response(res, 500, {
      error: "Error interno",
      details: error.message
    });
  }
};
