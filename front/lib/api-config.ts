// API Configuration utility
// This file handles dynamic API URL configuration for both local and production environments

/**
 * Get the base API URL based on environment configuration
 * Priority:
 * 1. NEXT_PUBLIC_API_URL environment variable
 * 2. Fallback to localhost:8080 for development
 */
export const getApiBaseUrl = (): string => {
  // In browser environment, use the environment variable or fallback
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  }
  
  // For server-side rendering, use environment variable or fallback
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
}

/**
 * Create a full API URL by combining base URL with endpoint
 * @param endpoint - The API endpoint (should start with /api/)
 * @returns Full API URL
 */
export const createApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl()
  // Remove trailing slash from base URL and ensure endpoint starts with /
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  
  return `${cleanBaseUrl}${cleanEndpoint}`
}

/**
 * Available API environments
 */
export const API_ENVIRONMENTS = {
  LOCAL: 'http://localhost:8080',
  PRODUCTION: 'https://barcos-production-3aad.up.railway.app'
} as const

/**
 * Check if we're currently using the production API
 */
export const isProductionApi = (): boolean => {
  return getApiBaseUrl().includes('barcos-production-3aad.up.railway.app')
}

/**
 * Check if we're currently using the local API
 */
export const isLocalApi = (): boolean => {
  return getApiBaseUrl().includes('localhost')
}