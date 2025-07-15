import { Request, Response } from 'express'
import { Naviera } from '../../database/schemas/navieraSchema'

interface CreateNavieraRequest extends Request {
  body: {
    name: string
    code: string
  }
  user?: {
    _id: string
  }
}

const createNaviera = async (req: CreateNavieraRequest, res: Response) => {
  try {
    const { name, code } = req.body
    const userId = req.user?._id

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      })
    }

    // Validar campos requeridos
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y código son campos obligatorios'
      })
    }

    // Verificar si ya existe una naviera con el mismo código
    const existingNaviera = await Naviera.findOne({ code: code.toUpperCase() })
    if (existingNaviera) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una naviera con este código'
      })
    }

    // Crear la nueva naviera
    const naviera = await Naviera.create({
      name: name.trim(),
      code: code.toUpperCase().trim(),
      createdBy: userId,
      isActive: true
    })

    res.status(201).json({
      success: true,
      message: 'Naviera creada exitosamente',
      data: {
        naviera
      }
    })
  } catch (error) {
    console.error('Error creating naviera:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al crear naviera',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default createNaviera 