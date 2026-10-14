import { auth } from '../../../services/firebaseService';

export type ApiErrorPayload = {
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly requestId?: string;

  constructor(message: string, status: number, payload: ApiErrorPayload = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.requestId = payload.requestId;
  }
}

export type ApiRequestOptions = Omit<RequestInit, 'body' | 'headers'> & {
  body?: unknown;
  headers?: Record<string, string>;
};

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const text = await response.text();
  return text ? { message: text.slice(0, 500) } : null;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeaders,
    ...(options.headers || {}),
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(path, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const payload = await parseResponsePayload(response);
  if (!response.ok) {
    const errorPayload = (payload && typeof payload === 'object' ? payload : {}) as ApiErrorPayload;
    const message = errorPayload.error || errorPayload.message || `Request failed (${response.status})`;
    throw new ApiError(message, response.status, {
      ...errorPayload,
      requestId: response.headers.get('X-Request-Id') || errorPayload.requestId,
    });
  }

  return payload as T;
}

export const api = {
  get<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(path, { ...options, method: 'GET' });
  },
  post<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(path, { ...options, method: 'POST', body });
  },
  put<T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(path, { ...options, method: 'PUT', body });
  },
  delete<T>(path: string, options?: Omit<ApiRequestOptions, 'method' | 'body'>) {
    return apiRequest<T>(path, { ...options, method: 'DELETE' });
  },
};
