// Types for Agency Configuration module

export interface ConfigTab {
  id: 'navieras' | 'routes' | 'localRoutes' | 'services' | 'localServices'
  label: string
  icon?: React.ReactNode
}

export interface NavieraFormData {
  name: string
  code: string
  description: string
  contact: string
  email: string
  phone: string
}

export interface RouteFormData {
  fromLocation: string
  toLocation: string
  estimatedDuration: number
  basePrice: number
  pricePerContainer: number
  description: string
}

export interface ServiceFormData {
  name: string
  description: string
  code: string
  price: number
  category: string
}

export interface LocalServicePrices {
  CLG097: number
  TRK163: number
  TRK179: number
  SLR168: number
}

export interface ConfigState {
  activeTab: ConfigTab['id']
  isAddingNaviera: boolean
  isAddingRoute: boolean
  isAddingService: boolean
  editingNaviera: string | null
  editingRoute: string | null
  editingService: string | null
  editingLocalService: string | null
  showDeleteConfirm: boolean
  itemToDelete: any
  deleteType: 'naviera' | 'route' | 'service' | null
}