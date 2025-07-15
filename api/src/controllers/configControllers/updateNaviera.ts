import { Request, Response } from 'express'
import { Naviera } from '../../database/schemas/navieraSchema'

interface UpdateNavieraRequest extends Request {
  params: {
    id: string
  }
  body: {
    name?: string
    code?: string
    isActive?: boolean
  }
}

const updateNaviera = async (req: UpdateNavieraRequest, res: Response) => {
  try {
    const { id } = req.params
    const { name, code, isActive } = req.body

    // Buscar la naviera existente
    const naviera = await Naviera.findById(id)
    if (!naviera) {
      return res.status(404).json({
        success: false,
        message: 'Naviera no encontrada'
      })
    }

    // Preparar los campos a actualizar
    const updateData: any = {}
    
    if (name !== undefined) {
      updateData.name = name.trim()
    }
    
    if (code !== undefined) {
      updateData.code = code.toUpperCase().trim()
    }
    
    if (isActive !== undefined) {
      updateData.isActive = isActive
    }

    // Si se está actualizando el código, verificar que no exista otro con el mismo código
    if (code && code !== naviera.code) {
      const existingNaviera = await Naviera.findOne({ 
        code: code.toUpperCase(), 
        _id: { $ne: id } 
      })
      if (existingNaviera) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una naviera con este código'
        })
      }
    }

    // Actualizar la naviera
    const updatedNaviera = await Naviera.findByIdAndUpdate(
      id,
      updateData,
      { 
        new: true, 
        runValidators: true 
      }
    )

    res.status(200).json({
      success: true,
      message: 'Naviera actualizada exitosamente',
      data: {
        naviera: updatedNaviera
      }
    })
  } catch (error) {
    console.error('Error updating naviera:', error)
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor al actualizar naviera',
      error: error instanceof Error ? error.message : 'Error desconocido'
    })
  }
}

export default updateNaviera 