import { Request, Response } from 'express'
import { LocalService } from '../../database/schemas/localServiceSchema'

interface DeleteLocalServiceRequest extends Request {
  params: {
    id: string
  }
  user?: {
    _id: string
  }
}

const deleteLocalService = async (req: DeleteLocalServiceRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      })
    }

    // Buscar el servicio a eliminar
    const service = await LocalService.findById(id)
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Servicio local no encontrado'
      })
    }

    // Eliminar el servicio
    await LocalService.findByIdAndDelete(id)

    res.status(200).json({
      success: true,
      message: 'Servicio local eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error deleting local service:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar servicio local',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default deleteLocalService 