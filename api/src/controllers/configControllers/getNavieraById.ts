import { Request, Response } from 'express'
import { Naviera } from '../../database/schemas/navieraSchema'

interface GetNavieraByIdRequest extends Request {
  params: {
    id: string
  }
}

const getNavieraById = async (req: GetNavieraByIdRequest, res: Response) => {
  try {
    const { id } = req.params

    const naviera = await Naviera.findById(id)

    if (!naviera) {
      return res.status(404).json({
        success: false,
        message: 'Naviera no encontrada'
      })
    }

    res.status(200).json({
      success: true,
      data: {
        naviera
      }
    })
  } catch (error) {
    console.error('Error getting naviera by id:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al obtener naviera',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default getNavieraById 