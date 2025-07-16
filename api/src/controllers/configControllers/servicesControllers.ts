const catchAsync = require('../../utils/catchedAsync');
const ApiError = require('../../utils/errors');
const pick = require('../../utils/pick');
import { Request, Response } from 'express'
import { services } from '../../database'

// Obtener todos los servicios
export const getAllServices = catchAsync(async (req: Request, res: Response, next: any) => {
  console.log('🔍 Getting services with query:', req.query)
  
  const { module, isActive } = req.query
  const filter: any = {}
  
  if (module) {
    filter.module = module
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true'
  }
  
  console.log('🔍 Filter:', filter)
  
  const servicesList = await services.find(filter).sort({ createdAt: -1 })
  
  console.log('✅ Found services:', servicesList.length)
  
  res.status(200).json({
    status: 'success',
    data: servicesList
  })
})

// Obtener servicio por ID
export const getServiceById = catchAsync(async (req: Request, res: Response, next: any) => {
  const service = await services.findById(req.params.id)
  
  if (!service) {
    throw new ApiError(404, 'Servicio no encontrado')
  }
  
  res.status(200).json({
    status: 'success',
    data: service
  })
})

// Crear nuevo servicio
export const createService = catchAsync(async (req: Request, res: Response, next: any) => {
  console.log('🔍 Creating service with body:', req.body)
  
  const serviceData = pick(req.body, ['name', 'description', 'module'])
  serviceData.createdBy = (req as any).user?.id
  
  console.log('🔍 Service data to create:', serviceData)
  
  const service = await services.create(serviceData)
  
  console.log('✅ Service created:', service)
  
  res.status(201).json({
    status: 'success',
    data: service
  })
})

// Actualizar servicio
export const updateService = catchAsync(async (req: Request, res: Response, next: any) => {
  const serviceData = pick(req.body, ['name', 'description', 'module', 'isActive'])
  
  const service = await services.findByIdAndUpdate(
    req.params.id,
    serviceData,
    { new: true, runValidators: true }
  )
  
  if (!service) {
    throw new ApiError(404, 'Servicio no encontrado')
  }
  
  res.status(200).json({
    status: 'success',
    data: service
  })
})

// Eliminar servicio
export const deleteService = catchAsync(async (req: Request, res: Response, next: any) => {
  const service = await services.findByIdAndDelete(req.params.id)
  
  if (!service) {
    throw new ApiError(404, 'Servicio no encontrado')
  }
  
  res.status(200).json({
    status: 'success',
    message: 'Servicio eliminado correctamente'
  })
})

// Cambiar estado del servicio
export const toggleServiceStatus = catchAsync(async (req: Request, res: Response, next: any) => {
  const service = await services.findById(req.params.id)
  
  if (!service) {
    throw new ApiError(404, 'Servicio no encontrado')
  }
  
  service.isActive = !service.isActive
  await service.save()
  
  res.status(200).json({
    status: 'success',
    data: service
  })
}) 