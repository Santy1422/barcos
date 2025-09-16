import { Request, Response } from 'express'
import { containerTypes } from '../../database'

interface AuthenticatedRequest extends Request {
  user?: any
}

export const createContainerType = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, name, category, sapCode, description } = req.body

    // Validar campos requeridos
    if (!code || !name || !category || !sapCode) {
      return res.status(400).json({
        success: false,
        message: 'Los campos code, name, category y sapCode son obligatorios'
      })
    }

    // Verificar si ya existe un tipo de contenedor con ese código
    const existingContainerType = await containerTypes.findOne({ code: code.toUpperCase() })
    if (existingContainerType) {
      return res.status(400).json({
        success: false,
        message: `Ya existe un tipo de contenedor con el código ${code}`
      })
    }

    // Crear el nuevo tipo de contenedor
    const newContainerType = new containerTypes({
      code: code.toUpperCase(),
      name,
      category,
      sapCode: sapCode.toUpperCase(),
      description: description || '',
      isActive: true
    })

    await newContainerType.save()

    res.status(201).json({
      success: true,
      message: 'Tipo de contenedor creado exitosamente',
      data: newContainerType
    })
  } catch (error: any) {
    console.error('Error al crear tipo de contenedor:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    })
  }
}
