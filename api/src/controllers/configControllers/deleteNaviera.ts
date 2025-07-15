import { Request, Response } from 'express'
import { Naviera } from '../../database/schemas/navieraSchema'

interface DeleteNavieraRequest extends Request {
  params: {
    id: string
  }
}

const deleteNaviera = async (req: DeleteNavieraRequest, res: Response) => {
  try {
    const { id } = req.params

    // Buscar la naviera existente
    const naviera = await Naviera.findById(id)
    if (!naviera) {
      return res.status(404).json({
        success: false,
        message: 'Naviera no encontrada'
      })
    }

    // Eliminar la naviera
    await Naviera.findByIdAndDelete(id)

    res.status(200).json({
      success: true,
      message: 'Naviera eliminada exitosamente'
    })
  } catch (error) {
    console.error('Error deleting naviera:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al eliminar naviera',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default deleteNaviera 