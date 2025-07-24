import { Request, Response } from 'express'
import { LocalService } from '../../database/schemas/localServiceSchema'

interface CreateLocalServiceRequest extends Request {
  body: {
    name: string
    description: string
    module: string
  }
  user?: {
    _id: string
  }
}

const createLocalService = async (req: CreateLocalServiceRequest, res: Response) => {
  try {
    const { name, description, module } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      })
    }

    // Validar campos requeridos
    if (!name || !description || !module) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, descripción y módulo son campos obligatorios'
      })
    }

    // Verificar si ya existe un servicio con el mismo nombre en el mismo módulo
    const existingService = await LocalService.findOne({ name, module })
    if (existingService) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un servicio con este nombre en este módulo'
      })
    }

    // Crear el nuevo servicio
    const newService = await LocalService.create({
      name: name.trim(),
      description: description.trim(),
      module,
      createdBy: userId,
      isActive: true
    })

    res.status(201).json({
      success: true,
      message: 'Servicio local creado exitosamente',
      data: {
        service: newService
      }
    })
  } catch (error) {
    console.error('Error creating local service:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear servicio local',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default createLocalService 