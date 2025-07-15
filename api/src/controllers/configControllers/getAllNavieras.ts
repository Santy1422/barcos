import { Request, Response } from 'express'
import { Naviera } from '../../database/schemas/navieraSchema'

interface GetNavierasRequest extends Request {
  query: {
    status?: 'all' | 'active' | 'inactive'
  }
}

const getAllNavieras = async (req: GetNavierasRequest, res: Response) => {
  try {
    const { status = 'all' } = req.query

    // Construir filtro basado en el status
    let filter: any = {}
    
    if (status === 'active') {
      filter.isActive = true
    } else if (status === 'inactive') {
      filter.isActive = false
    }

    // Obtener todas las navieras con el filtro aplicado
    const navieras = await Naviera.find(filter)
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      results: navieras.length,
      data: {
        navieras
      }
    })
  } catch (error) {
    console.error('Error getting navieras:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener navieras',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default getAllNavieras 