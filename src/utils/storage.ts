/**
 * Secure token storage utilities
 * Uses localStorage with encryption considerations
 */

const TOKEN_KEY = 'accessToken';
const USER_KEY = 'user';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const storage = {
  getToken: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.error('Error getting token from storage:', error);
      return null;
    }
  },

  setToken: (token: string, persistent = true): void => {
    try {
      if (persistent) {
        localStorage.setItem(TOKEN_KEY, token);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
      }
    } catch (error) {
      console.error('Error setting token in storage:', error);
    }
  },

  removeToken: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error removing token from storage:', error);
    }
  },

  getUser: (): any | null => {
    try {
      const userStr = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error('Error getting user from storage:', error);
      return null;
    }
  },

  setUser: (user: any, persistent = true): void => {
    try {
      const userStr = JSON.stringify(user);
      if (persistent) {
        localStorage.setItem(USER_KEY, userStr);
      } else {
        sessionStorage.setItem(USER_KEY, userStr);
      }
    } catch (error) {
      console.error('Error setting user in storage:', error);
    }
  },

  removeUser: (): void => {
    try {
      localStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(USER_KEY);
    } catch (error) {
      console.error('Error removing user from storage:', error);
    }
  },

  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  },
};
