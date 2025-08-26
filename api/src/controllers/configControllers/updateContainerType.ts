import { Request, Response } from 'express'
import { containerTypes } from '../../database'

interface AuthenticatedRequest extends Request {
  user?: any
}

export const updateContainerType = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params
    const { code, name, category, description, isActive } = req.body

    // Validar campos requeridos
    if (!code || !name || !category) {
      return res.status(400).json({
        success: false,
        message: 'Los campos code, name y category son obligatorios'
      })
    }

    // Verificar si ya existe otro tipo de contenedor con ese código
    const existingContainerType = await containerTypes.findOne({ 
      code: code.toUpperCase(), 
      _id: { $ne: id } 
    })
    
    if (existingContainerType) {
      return res.status(400).json({
        success: false,
        message: `Ya existe otro tipo de contenedor con el código ${code}`
      })
    }

    // Actualizar el tipo de contenedor
    const updatedContainerType = await containerTypes.findByIdAndUpdate(
      id,
      {
        code: code.toUpperCase(),
        name,
        category,
        description: description || '',
        isActive: isActive !== undefined ? isActive : true
      },
      { new: true, runValidators: true }
    )

    if (!updatedContainerType) {
      return res.status(404).json({
        success: false,
        message: 'Tipo de contenedor no encontrado'
      })
    }

    res.status(200).json({
      success: true,
      message: 'Tipo de contenedor actualizado exitosamente',
      data: updatedContainerType
    })
  } catch (error: any) {
    console.error('Error al actualizar tipo de contenedor:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    })
  }
}
