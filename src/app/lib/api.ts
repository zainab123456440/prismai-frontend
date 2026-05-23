// src/app/lib/api.ts

const API_BASE = 'https://prismai-backend-3hsi.onrender.com';

const getToken = () =>
  typeof window !== 'undefined' ? localStorage.getItem('token') : null;

const getHeaders = (includeAuth = true): Record<string, string> => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(includeAuth && token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ─── Custom Error Classes ────────────────────────────────────────────────────

export class NetworkError extends Error {
  constructor(message = 'Unable to reach the server. Please check your connection.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  status: number;
  constructor(message = 'Authentication failed. Please log in again.', status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ─── Shared fetch wrapper ────────────────────────────────────────────────────

async function apiFetch(
  url: string,
  options: RequestInit = {},
  includeAuth = true
): Promise<unknown> {
  let res: Response;

  try {
    res = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(includeAuth),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  }  catch (error) {
  console.error('FETCH FAILED:', error);
  throw new NetworkError();
}
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (res.status === 401 || res.status === 403) {
    throw new AuthError(
      (data as { detail?: string })?.detail || 'Session expired. Please log in again.',
      res.status
    );
  }

  if (!res.ok) {
    throw new ApiError(
      (data as { detail?: string })?.detail || `Request failed (${res.status})`,
      res.status
    );
  }

  return data;
}

// ==================== AUTH ====================

export const auth = {
  register: async (email: string, password: string, full_name?: string) => {
    return apiFetch(
      `${API_BASE}/auth/register`,
      {
        method: 'POST',
        body: JSON.stringify({ email, password, full_name }),
      },
      false
    );
  },

  login: async (email: string, password: string) => {
    return apiFetch(
      `${API_BASE}/auth/login`,
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
      false
    );
  },

  getMe: async () => {
    const token = getToken();

    if (!token) {
      throw new AuthError('No token found', 401);
    }

    return apiFetch(`${API_BASE}/auth/me`, { method: 'GET' }, true);
  },
};

// ==================== DOCUMENTS ====================

export const documents = {
  list: async () => {
    return apiFetch(`${API_BASE}/documents/`, { method: 'GET' }, true);
  },

  upload: async (formData: FormData) => {
    const token = getToken();
    let res: Response;
    try {
      // Don't set Content-Type — browser sets it automatically with the multipart boundary
      res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
    } catch {
      throw new NetworkError();
    }

    let data: unknown;
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (res.status === 401 || res.status === 403) {
      throw new AuthError(
        (data as { detail?: string })?.detail || 'Session expired.',
        res.status
      );
    }

    if (!res.ok) {
      throw new ApiError(
        (data as { detail?: string })?.detail || 'Upload failed',
        res.status
      );
    }

    return data;
  },

  delete: async (documentId: string) => {
    return apiFetch(
      `${API_BASE}/documents/${documentId}`,
      { method: 'DELETE' },
      true
    );
  },
};

// ==================== QUERY / RAG ====================

export const query = {
  ask: async (question: string, document_id?: string | null) => {
    return apiFetch(
      `${API_BASE}/query/`,
      {
        method: 'POST',
        body: JSON.stringify({ question, document_id }),
      },
      true
    );
  },
};

// ==================== ANALYTICS ====================
// All endpoints require authentication.
// Each function maps 1-to-1 with a backend route.

export const analytics = {

  /**
   * High-level dashboard cards:
   * total docs, total questions, total users,
   * avg response time, questions today,
   * docs ready vs processing.
   * GET /analytics/summary
   */
  getSummary: async () => {
    return apiFetch(`${API_BASE}/analytics/summary`, { method: 'GET' }, true);
  },

  /**
   * Query counts per day for the last 30 days.
   * Use for a line chart showing usage trends.
   * GET /analytics/queries-per-day
   */
  getQueriesPerDay: async () => {
    return apiFetch(`${API_BASE}/analytics/queries-per-day`, { method: 'GET' }, true);
  },

  /**
   * Most queried documents.
   * Use for a bar chart: document name vs query count.
   * GET /analytics/top-documents?limit=10
   */
  getTopDocuments: async (limit = 10) => {
    return apiFetch(
      `${API_BASE}/analytics/top-documents?limit=${limit}`,
      { method: 'GET' },
      true
    );
  },

  /**
   * Average response time per day for the last 30 days.
   * Use for a line chart tracking performance over time.
   * GET /analytics/response-times
   */
  getResponseTimes: async () => {
    return apiFetch(`${API_BASE}/analytics/response-times`, { method: 'GET' }, true);
  },

  /**
   * Most frequently asked questions.
   * Use for a list or word cloud.
   * GET /analytics/popular-questions?limit=10
   */
  getPopularQuestions: async (limit = 10) => {
    return apiFetch(
      `${API_BASE}/analytics/popular-questions?limit=${limit}`,
      { method: 'GET' },
      true
    );
  },

  /**
   * Full query history for the logged-in user.
   * Use for a searchable table of past questions/answers.
   * GET /analytics/query-history?limit=50
   */
  getQueryHistory: async (limit = 50) => {
    return apiFetch(
      `${API_BASE}/analytics/query-history?limit=${limit}`,
      { method: 'GET' },
      true
    );
  },

  /**
   * Personal usage stats for the logged-in user:
   * total queries, avg response time, most active day,
   * total documents, docs ready vs processing.
   * GET /analytics/user-stats
   */
  getUserStats: async () => {
    return apiFetch(`${API_BASE}/analytics/user-stats`, { method: 'GET' }, true);
  },
};