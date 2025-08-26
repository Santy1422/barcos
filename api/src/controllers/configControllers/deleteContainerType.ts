import { Request, Response } from 'express'
import { containerTypes } from '../../database'

interface AuthenticatedRequest extends Request {
  user?: any
}

export const deleteContainerType = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params

    // Verificar si el tipo de contenedor existe
    const containerType = await containerTypes.findById(id)
    if (!containerType) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de contenedor no encontrado'
      })
    }

    // Eliminar el tipo de contenedor
    await containerTypes.findByIdAndDelete(id)

    res.status(200).json({
      success: true,
      message: 'Tipo de contenedor eliminado exitosamente'
    })
  } catch (error: any) {
    console.error('Error al eliminar tipo de contenedor:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    })
  }
}
