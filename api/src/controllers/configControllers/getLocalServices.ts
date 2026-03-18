import { Request, Response } from 'express'
import { LocalService } from '../../database/schemas/localServiceSchema'

interface GetLocalServicesRequest extends Request {
  query: {
    module?: string
    category?: string
  }
  user?: {
    _id: string
  }
}

const getLocalServices = async (req: GetLocalServicesRequest, res: Response) => {
  try {
    const { module, category } = req.query
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      })
    }

    // Construir filtro (category se guarda en el campo type)
    const filter: any = {}
    if (module) {
      filter.module = module
    }
    if (category) {
      filter.type = category
    }

    // Obtener servicios locales
    const services = await LocalService.find(filter).sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      data: {
        services
      }
    })
  } catch (error) {
    console.error('Error getting local services:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener servicios locales',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default getLocalServices 