import { Request, Response } from 'express'
import { LocalService } from '../../database/schemas/localServiceSchema'

interface UpdateLocalServiceRequest extends Request {
  body: {
    name?: string
    description?: string
    module?: string
    isActive?: boolean
  }
  params: {
    id: string
  }
  user?: {
    _id: string
  }
}

const updateLocalService = async (req: UpdateLocalServiceRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, description, module, isActive } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      })
    }

    // Buscar el servicio a actualizar
    const existingService = await LocalService.findById(id)
    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: 'Servicio local no encontrado'
      })
    }

    // Si se está actualizando el nombre, verificar que no exista otro con el mismo nombre en el mismo módulo
    if (name && name !== existingService.name) {
      const duplicateService = await LocalService.findOne({ 
        name, 
        module: module || existingService.module,
        _id: { $ne: id }
      })
      if (duplicateService) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un servicio con este nombre en este módulo'
        })
      }
    }

    // Actualizar el servicio
    const updatedService = await LocalService.findByIdAndUpdate(
      id,
      {
        ...(name && { name: name.trim() }),
        ...(description && { description: description.trim() }),
        ...(module && { module }),
        ...(typeof isActive === 'boolean' && { isActive }),
        updatedBy: userId,
        updatedAt: new Date()
      },
      { new: true }
    )

    res.status(200).json({
      success: true,
      message: 'Servicio local actualizado exitosamente',
      data: {
        service: updatedService
      }
    })
  } catch (error) {
    console.error('Error updating local service:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar servicio local',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default updateLocalService 