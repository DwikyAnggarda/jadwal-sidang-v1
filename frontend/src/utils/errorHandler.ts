export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export const handleApiError = (error: any): ApiError => {
  // Network error
  if (!error.response) {
    return {
      message: 'Network error. Please check your connection.',
      status: 0,
      code: 'NETWORK_ERROR'
    };
  }

  // HTTP error with response
  const { status, data } = error.response;
  
  switch (status) {
    case 400:
      return {
        message: data?.message || 'Invalid request data.',
        status,
        code: 'BAD_REQUEST'
      };
    case 401:
      return {
        message: data?.message || 'Authentication required.',
        status,
        code: 'UNAUTHORIZED'
      };
    case 403:
      return {
        message: data?.message || 'Access forbidden.',
        status,
        code: 'FORBIDDEN'
      };
    case 404:
      return {
        message: data?.message || 'Resource not found.',
        status,
        code: 'NOT_FOUND'
      };
    case 429:
      return {
        message: data?.message || 'Too many requests. Please try again later.',
        status,
        code: 'RATE_LIMITED'
      };
    case 500:
      return {
        message: data?.message || 'Internal server error.',
        status,
        code: 'SERVER_ERROR'
      };
    default:
      return {
        message: data?.message || 'An unexpected error occurred.',
        status,
        code: 'UNKNOWN_ERROR'
      };
  }
};

export const isAuthError = (error: any): boolean => {
  return error.response?.status === 401 || error.response?.status === 403;
};
