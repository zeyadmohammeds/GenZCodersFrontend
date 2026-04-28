import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import axios from 'axios';

import { toApiError } from './errors';
import { API_BASE_URL, API_TIMEOUT_MS } from './config';

const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add authentication token
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    // Get token from localStorage
    const token = localStorage.getItem('accessToken');
    const normalizedToken = token?.trim();
    const hasValidToken =
      Boolean(normalizedToken) &&
      normalizedToken !== 'undefined' &&
      normalizedToken !== 'null';

    if (hasValidToken && config.headers) {
      config.headers.Authorization = `Bearer ${normalizedToken}`;
    }
    
    // Add CSRF protection headers if needed
    const csrfToken = localStorage.getItem('csrfToken');
    if (csrfToken && config.headers) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    
    return config;
  },
  (error: unknown) => Promise.reject(toApiError(error))
);

// Response interceptor to handle errors
http.interceptors.response.use(
  (response: AxiosResponse) => {
    // Extract CSRF token from response headers if present
    const csrfToken = response.headers['x-csrf-token'];
    if (csrfToken) {
      localStorage.setItem('csrfToken', csrfToken);
    }
    return response;
  },
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;

      // Determine if the user is currently on an auth page.
      // If so, the auth component handles ALL errors itself — we must not
      // clear tokens, redirect, or interfere in any way.
      const currentPath = window.location.pathname.toLowerCase();
      const authPaths = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password'];
      const isOnAuthPage = authPaths.some(
        (p) => currentPath === p || currentPath.startsWith(`${p}/`) || currentPath.startsWith(`${p}?`)
      );

      // Handle 401 Unauthorized — only for expired sessions on non-auth pages
      if (status === 401 && !isOnAuthPage) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('auth_user');
        window.location.href = '/sign-in';
      }

      // Handle 429 Too Many Requests
      if (status === 429) {
        const retryAfter = error.response?.headers['retry-after'];
        console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
      }

      // Handle 423 Locked (Account locked)
      if (status === 423) {
        console.error('Account is locked. Please try again later.');
      }
    }
    return Promise.reject(toApiError(error));
  }
);

export default http;


// import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// // Strategy A: No more process.env here.
// // We use "/api" so Vite (Dev) or IIS (Prod) can intercept it.
// const http: AxiosInstance = axios.create({
//   baseURL: "/api",
//   timeout: 15000,
// });

// // Request interceptor
// http.interceptors.request.use(
//   (config: InternalAxiosRequestConfig) => {
//     const token = localStorage.getItem('token');
//     if (token && config.headers) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error: AxiosError) => {
//     return Promise.reject(error);
//   }
// );

// // Response interceptor
// http.interceptors.response.use(
//   (response: AxiosResponse) => response,
//   (error: AxiosError) => {
//     if (error.response?.status === 401) {
//       localStorage.removeItem('token');
//       localStorage.removeItem('user');
//       if (!window.location.pathname.includes('/login')) {
//         window.location.href = '/login';
//       }
//     }

//     console.error('API Request Failed:', {
//       url: error.config?.url,
//       status: error.response?.status,
//       message: error.message,
//     });

//     return Promise.reject(error);
//   }
// );

// export default http;