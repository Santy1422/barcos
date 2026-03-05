/**
 * Error Logger para Frontend
 * Envía errores al backend para tracking centralizado
 */

interface ErrorLogData {
  method?: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  error: {
    message: string;
    stack?: string;
    code?: string;
    name?: string;
  };
  module?: string;
  action?: string;
  componentName?: string;
  pageUrl?: string;
  requestBody?: any;
  responseBody?: any;
}

interface UserInfo {
  userId?: string;
  userEmail?: string;
  userName?: string;
}

// Detectar información del navegador
const getBrowserInfo = () => {
  if (typeof window === 'undefined') return undefined;

  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = '';
  let os = 'Unknown';
  let device = 'Desktop';

  // Detectar navegador
  if (ua.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = ua.split('Firefox/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Chrome/')) {
    browserName = 'Chrome';
    browserVersion = ua.split('Chrome/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.split('Version/')[1]?.split(' ')[0] || '';
  } else if (ua.includes('Edge/')) {
    browserName = 'Edge';
    browserVersion = ua.split('Edge/')[1]?.split(' ')[0] || '';
  }

  // Detectar OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  // Detectar dispositivo
  if (ua.includes('Mobile')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';

  return {
    name: browserName,
    version: browserVersion,
    os,
    device
  };
};

// Obtener usuario del localStorage
const getUserFromStorage = (): UserInfo => {
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
    // Ignorar errores de parsing
  }
  return {};
};

// URL del API
const getApiUrl = () => {
  if (typeof window === 'undefined') return '';
  return process.env.NEXT_PUBLIC_API_URL || '';
};

/**
 * Envía un error al backend para logging
 */
export const logError = async (data: ErrorLogData): Promise<void> => {
  try {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      console.error('[ErrorLogger] API URL not configured');
      return;
    }

    const userInfo = getUserFromStorage();
    const browserInfo = getBrowserInfo();

    const logData = {
      ...data,
      ...userInfo,
      pageUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      browserInfo
    };

    // No esperar la respuesta para no bloquear
    fetch(`${apiUrl}/api/logs/frontend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(logData),
    }).catch(err => {
      console.error('[ErrorLogger] Failed to send error log:', err);
    });

  } catch (err) {
    console.error('[ErrorLogger] Error in logError:', err);
  }
};

/**
 * Wrapper para fetch que automáticamente loguea errores
 */
export const fetchWithErrorLogging = async (
  url: string,
  options?: RequestInit,
  context?: { module?: string; action?: string; componentName?: string }
): Promise<Response> => {
  const startTime = Date.now();
  let response: Response | undefined;

  try {
    response = await fetch(url, options);
    const responseTime = Date.now() - startTime;

    // Si hay error HTTP, loguear
    if (!response.ok) {
      let responseBody;
      try {
        responseBody = await response.clone().json();
      } catch {
        responseBody = await response.clone().text();
      }

      await logError({
        method: options?.method || 'GET',
        url,
        statusCode: response.status,
        responseTime,
        error: {
          message: responseBody?.message || responseBody?.error || `HTTP ${response.status}`,
          code: String(response.status),
          name: 'HTTPError'
        },
        requestBody: options?.body ? JSON.parse(options.body as string) : undefined,
        responseBody,
        ...context
      });
    }

    return response;
  } catch (err: any) {
    const responseTime = Date.now() - startTime;

    // Error de red o similar
    await logError({
      method: options?.method || 'GET',
      url,
      statusCode: 0,
      responseTime,
      error: {
        message: err.message || 'Network error',
        stack: err.stack,
        name: err.name || 'NetworkError'
      },
      requestBody: options?.body ? JSON.parse(options.body as string) : undefined,
      ...context
    });

    throw err;
  }
};

/**
 * Log error de componente React
 */
export const logComponentError = async (
  error: Error,
  componentName: string,
  additionalInfo?: Record<string, any>
): Promise<void> => {
  await logError({
    method: 'COMPONENT_ERROR',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    statusCode: 500,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    componentName,
    module: additionalInfo?.module,
    action: additionalInfo?.action,
    ...additionalInfo
  });
};

/**
 * Log error de Redux/Estado
 */
export const logStateError = async (
  error: Error,
  action: string,
  module?: string,
  additionalInfo?: Record<string, any>
): Promise<void> => {
  await logError({
    method: 'STATE_ERROR',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
    statusCode: 500,
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    action,
    module,
    ...additionalInfo
  });
};

// Capturar errores globales no manejados
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    logError({
      method: 'UNHANDLED_ERROR',
      url: window.location.href,
      statusCode: 500,
      error: {
        message: event.message,
        stack: event.error?.stack,
        name: 'UnhandledError'
      }
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    logError({
      method: 'UNHANDLED_REJECTION',
      url: window.location.href,
      statusCode: 500,
      error: {
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        name: 'UnhandledRejection'
      }
    });
  });
}

export default {
  logError,
  fetchWithErrorLogging,
  logComponentError,
  logStateError
};
