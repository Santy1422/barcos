import { Request, Response } from 'express'
import { containerTypes } from '../../database'

interface AuthenticatedRequest extends Request {
  user?: any
}

export const getAllContainerTypes = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { category, isActive } = req.query

    // Construir filtros
    const filters: any = {}
    
    if (category && category !== 'all') {
      filters.category = category
    }
    
    if (isActive !== undefined) {
      filters.isActive = isActive === 'true'
    }

    // Obtener todos los tipos de contenedores con filtros
    const containerTypesList = await containerTypes.find(filters).sort({ code: 1 })

    res.status(200).json({
      success: true,
      data: containerTypesList,
      count: containerTypesList.length
    })
  } catch (error: any) {
    console.error('Error al obtener tipos de contenedores:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    })
  }
}
