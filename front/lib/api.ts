/**
 * Centralized API utility with automatic error logging
 * All API calls should use this utility for consistent error handling and logging
 */

import { createApiUrl, getApiBaseUrl } from './api-config';
import { logError } from './errorLogger';

interface ApiOptions extends RequestInit {
  module?: string;
  action?: string;
  componentName?: string;
  skipErrorLogging?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  statusCode: number;
}

// Obtener token del localStorage
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

// Obtener info del usuario para logs
const getUserInfo = () => {
  if (typeof window === 'undefined') return {};
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return {
        userId: user.id || user._id,
        userEmail: user.email,
        userName: user.name || user.fullName
      };
    }
  } catch {
    // Ignorar errores
  }
  return {};
};

/**
 * Función principal de API con logging automático
 */
export async function api<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const startTime = Date.now();
  const url = endpoint.startsWith('http') ? endpoint : createApiUrl(endpoint);
  const { module, action, componentName, skipErrorLogging, ...fetchOptions } = options;

  // Headers por defecto
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  // Agregar token si existe
  const token = getAuthToken();
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
    });

    const responseTime = Date.now() - startTime;
    let data: any;

    // Intentar parsear JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      data = await response.text();
    }

    // Si hay error HTTP, loguear
    if (!response.ok && !skipErrorLogging) {
      const userInfo = getUserInfo();
      await logError({
        method: fetchOptions.method || 'GET',
        url,
        statusCode: response.status,
        responseTime,
        error: {
          message: data?.message || data?.error || `HTTP Error ${response.status}`,
          code: String(response.status),
          name: 'APIError'
        },
        module,
        action,
        componentName,
        requestBody: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
        responseBody: data,
        ...userInfo
      });

      return {
        success: false,
        error: data?.message || data?.error || `Error ${response.status}`,
        message: data?.message,
        statusCode: response.status,
        data
      };
    }

    // Log de éxito para debugging (opcional, solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [${fetchOptions.method || 'GET'}] ${endpoint} - ${response.status} (${responseTime}ms)`);
    }

    return {
      success: true,
      data: data?.payload || data?.data || data,
      message: data?.message,
      statusCode: response.status
    };

  } catch (error: any) {
    const responseTime = Date.now() - startTime;

    // Error de red
    if (!skipErrorLogging) {
      const userInfo = getUserInfo();
      await logError({
        method: fetchOptions.method || 'GET',
        url,
        statusCode: 0,
        responseTime,
        error: {
          message: error.message || 'Network error',
          stack: error.stack,
          name: error.name || 'NetworkError'
        },
        module,
        action,
        componentName,
        requestBody: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
        ...userInfo
      });
    }

    console.error(`❌ [${fetchOptions.method || 'GET'}] ${endpoint} - Error: ${error.message}`);

    return {
      success: false,
      error: error.message || 'Network error',
      statusCode: 0
    };
  }
}

/**
 * Métodos de conveniencia
 */
export const apiGet = <T = any>(endpoint: string, options?: ApiOptions) =>
  api<T>(endpoint, { ...options, method: 'GET' });

export const apiPost = <T = any>(endpoint: string, body: any, options?: ApiOptions) =>
  api<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });

export const apiPut = <T = any>(endpoint: string, body: any, options?: ApiOptions) =>
  api<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });

export const apiPatch = <T = any>(endpoint: string, body: any, options?: ApiOptions) =>
  api<T>(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });

export const apiDelete = <T = any>(endpoint: string, options?: ApiOptions) =>
  api<T>(endpoint, { ...options, method: 'DELETE' });

/**
 * Hook-friendly API call con manejo de estado
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: ApiOptions = {},
  callbacks?: {
    onSuccess?: (data: T) => void;
    onError?: (error: string) => void;
    onFinally?: () => void;
  }
): Promise<ApiResponse<T>> {
  try {
    const result = await api<T>(endpoint, options);

    if (result.success && callbacks?.onSuccess) {
      callbacks.onSuccess(result.data!);
    } else if (!result.success && callbacks?.onError) {
      callbacks.onError(result.error || 'Unknown error');
    }

    return result;
  } finally {
    callbacks?.onFinally?.();
  }
}

export default api;
