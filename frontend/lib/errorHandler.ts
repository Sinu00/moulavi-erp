import { toast } from 'sonner';

export interface ErrorInfo {
  message: string;
  code?: string;
  statusCode?: number;
}

export class AppError extends Error {
  public code?: string;
  public statusCode?: number;

  constructor(message: string, code?: string, statusCode?: number) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const handleApiError = (error: any, context?: string): void => {
  let errorMessage = 'An unexpected error occurred';
  let errorCode = 'UNKNOWN_ERROR';

  if (error?.response?.data?.error) {
    errorMessage = error.response.data.error;
    errorCode = error.response.data.code || 'API_ERROR';
  } else if (error?.response?.status) {
    switch (error.response.status) {
      case 400:
        errorMessage = 'Invalid request data';
        errorCode = 'BAD_REQUEST';
        break;
      case 401:
        errorMessage = 'Authentication required';
        errorCode = 'UNAUTHORIZED';
        break;
      case 403:
        errorMessage = 'Access denied';
        errorCode = 'FORBIDDEN';
        break;
      case 404:
        errorMessage = 'Resource not found';
        errorCode = 'NOT_FOUND';
        break;
      case 429:
        errorMessage = 'Too many requests. Please try again later';
        errorCode = 'RATE_LIMITED';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later';
        errorCode = 'SERVER_ERROR';
        break;
      default:
        errorMessage = `Request failed with status ${error.response.status}`;
        errorCode = 'HTTP_ERROR';
    }
  } else if (error?.message) {
    errorMessage = error.message;
  }

  // Log error for debugging (only in development)
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context || 'API'}] Error:`, {
      message: errorMessage,
      code: errorCode,
      originalError: error,
    });
  }

  // Show user-friendly toast
  toast.error(errorMessage);
};

export const handleAsyncError = async <T>(
  asyncFn: () => Promise<T>,
  context?: string
): Promise<T | null> => {
  try {
    return await asyncFn();
  } catch (error) {
    handleApiError(error, context);
    return null;
  }
};

export const createErrorHandler = (context: string) => {
  return (error: any) => handleApiError(error, context);
};
