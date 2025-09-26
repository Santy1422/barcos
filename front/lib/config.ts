export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
export const APP_NAME = 'Barcos Agency System'
export const APP_VERSION = '1.0.0'

export const CONFIG = {
  api: {
    baseUrl: API_BASE_URL,
    timeout: 30000,
  },
  pagination: {
    defaultPageSize: 10,
    pageSizeOptions: [5, 10, 20, 50, 100],
  },
  currency: {
    default: 'USD',
    options: ['USD', 'PAB'],
  },
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
}