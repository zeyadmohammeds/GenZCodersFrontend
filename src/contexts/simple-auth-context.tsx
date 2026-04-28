import type { User, UserRole, AuthState } from 'src/types/user';

import { useMemo, useEffect, useContext, useReducer, useCallback, createContext } from 'react';

import { storage } from 'src/utils/storage';

import { authApi } from 'src/api';

type AuthAction =
  | { type: 'LOGIN'; payload: User }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'UPDATE_USER'; payload: Partial<User> };

type AuthContextValue = AuthState & {
  login: (email: string, password: string, persistent?: boolean) => Promise<User>;
  loginWithGoogle: (idToken: string, persistent?: boolean) => Promise<User>;
  register: (params: {
    email: string;
    password: string;
    nationalId: string;
    fullNameEn: string;
    fullNameAr: string;
    phone: string;
    educationalLevelId: number;
  }) => Promise<User>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
};

const AUTH_USER_KEY = 'auth_user';

const mapBackendRoleToRole = (params: { roleId?: number | string | null; roleName?: string | null }): UserRole => {
  const roleName = String(params.roleName ?? '').toLowerCase().trim();
  if (roleName.includes('admin')) return 'admin';
  if (roleName.includes('engineer')) return 'engineer';
  if (roleName.includes('co-instructor') || roleName.includes('co instructor') || roleName.includes('instructor') || roleName.includes('teacher')) {
    return 'instructor';
  }

  const roleId = Number(params.roleId ?? 0);
  if (roleId === 1) return 'admin';
  if (roleId === 39) return 'engineer';
  if (roleId === 2) return 'instructor';
  return 'student';
};

const reviveUser = (value: unknown): User | null => {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<User>;
  if (!candidate.id || !candidate.email || !candidate.role) return null;

  return {
    id: String(candidate.id),
    name: candidate.name || String(candidate.email).split('@')[0],
    email: String(candidate.email),
    role: candidate.role,
    isActive: candidate.isActive ?? true,
    createdAt: candidate.createdAt ? new Date(candidate.createdAt) : new Date(),
    updatedAt: candidate.updatedAt ? new Date(candidate.updatedAt) : new Date(),
    phone: candidate.phone,
    avatar: candidate.avatar,
  };
};

const getPersistedUser = (): User | null => {
  try {
    const storedAuthUser = localStorage.getItem(AUTH_USER_KEY);
    if (storedAuthUser) {
      return reviveUser(JSON.parse(storedAuthUser));
    }

    return reviveUser(storage.getUser());
  } catch (error) {
    console.error('Error loading auth state from storage:', error);
    return null;
  }
};

const persistUser = (user: User, persistent = true) => {
  if (persistent) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  }
  storage.setUser(user, persistent);
};

const clearPersistedAuth = () => {
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
  storage.clear();
};

const getInitialState = (): AuthState => {
  const token = storage.getToken();
  const user = getPersistedUser();

  if (token && user) {
    return {
      user,
      isAuthenticated: true,
      isLoading: false,
    };
  }

  return {
    user: null,
    isAuthenticated: false,
    isLoading: false,
  };
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

type AuthProviderProps = {
  children: React.ReactNode;
};

const buildUser = (params: {
  accountId: number | string;
  email: string;
  roleId?: number | string | null;
  roleName?: string | null;
  name?: string;
  phone?: string;
}): User => ({
  id: String(params.accountId),
  name: params.name || params.email.split('@')[0],
  email: params.email,
  role: mapBackendRoleToRole({ roleId: params.roleId, roleName: params.roleName }),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  phone: params.phone,
});

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, undefined, getInitialState);

  useEffect(() => {
    const token = storage.getToken();
    const persistedUser = getPersistedUser();

    if (!token) {
      if (persistedUser) {
        clearPersistedAuth();
        dispatch({ type: 'LOGOUT' });
      }
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    authApi.getMe()
      .then((userInfo) => {
        if (!userInfo.accountId || !userInfo.email) {
          throw new Error('Invalid session.');
        }

        const restoredUser = buildUser({
          accountId: userInfo.accountId,
          email: userInfo.email,
          roleId: userInfo.roleId,
          roleName: userInfo.roleName,
          name: persistedUser?.name,
          phone: persistedUser?.phone,
        });

        persistUser(restoredUser);
        dispatch({ type: 'LOGIN', payload: restoredUser });
      })
      .catch(() => {
        clearPersistedAuth();
        dispatch({ type: 'LOGOUT' });
      });
  }, []);

  useEffect(() => {
    if (state.user) {
      // We don't know the persistent flag here, but buildUser/persistUser already handled it during login/register.
      // This effect is mostly for profile updates. We'll check if it's already in localStorage.
      const isPersistent = Boolean(localStorage.getItem(AUTH_USER_KEY));
      persistUser(state.user, isPersistent);
    }
  }, [state.user]);

  const login = useCallback(async (email: string, password: string, persistent = true) => {
    // NOTE: Do NOT dispatch SET_LOADING here.
    // The sign-in view manages its own loading state.
    // Dispatching SET_LOADING causes GuestGuard to unmount/remount the form,
    // destroying all user input and error messages.

    try {
      const response = await authApi.login({ email: email.trim(), password });
      const token = response.accessToken ?? response.token;
      if (token) storage.setToken(token, persistent);

      const user = buildUser({
        accountId: response.accountId,
        email: response.email,
        roleId: response.roleId,
        roleName: response.roleName,
      });

      persistUser(user, persistent);
      dispatch({ type: 'LOGIN', payload: user });
      return user;
    } catch (error: unknown) {
      if (error instanceof Error) throw error;
      throw new Error('Login failed.');
    }
  }, []);

  const loginWithGoogle = useCallback(async (idToken: string, persistent = true) => {
    // NOTE: Do NOT dispatch SET_LOADING here — same reason as login().

    try {
      const response = await authApi.googleAuth({ idToken });
      const token = response.accessToken ?? response.token;
      if (token) storage.setToken(token, persistent);

      let userName = response.email.split('@')[0];
      try {
        const profile = await authApi.getProfile();
        userName = profile.fullNameEn || userName;
      } catch {
        // Ignore profile fallback failures and keep the email-derived name.
      }

      const user = buildUser({
        accountId: response.accountId,
        email: response.email,
        roleId: response.roleId,
        roleName: response.roleName,
        name: userName,
      });

      persistUser(user, persistent);
      dispatch({ type: 'LOGIN', payload: user });
      return user;
    } catch (error: unknown) {
      if (error instanceof Error) throw error;
      throw new Error('Google authentication failed.');
    }
  }, []);

  const register = useCallback(
    async (params: {
      email: string;
      password: string;
      nationalId: string;
      fullNameEn: string;
      fullNameAr: string;
      phone: string;
      educationalLevelId: number;
    }) => {
      // NOTE: Do NOT dispatch SET_LOADING here — same reason as login().

      try {
        const response = await authApi.signup({
          fullNameEn: params.fullNameEn.trim(),
          fullNameAr: params.fullNameAr.trim(),
          nationalId: params.nationalId.trim(),
          phone: params.phone.trim(),
          email: params.email.trim(),
          password: params.password,
          educationalLevelId: params.educationalLevelId,
        });

        const token = response.accessToken ?? response.token;
        if (token) storage.setToken(token);

        const user = buildUser({
          accountId: response.accountId,
          email: response.email,
          roleId: response.roleId,
          roleName: response.roleName,
          name: params.fullNameEn.trim(),
          phone: params.phone.trim(),
        });

        persistUser(user);
        dispatch({ type: 'LOGIN', payload: user });
        return user;
      } catch (error: unknown) {
        if (error instanceof Error) throw error;
        throw new Error('Registration failed.');
      }
    },
    []
  );

  const logout = useCallback(() => {
    clearPersistedAuth();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback(
    (updates: Partial<User>) => dispatch({ type: 'UPDATE_USER', payload: updates }),
    []
  );

  const hasRole = useCallback((role: UserRole) => state.user?.role === role, [state.user?.role]);

  const hasAnyRole = useCallback(
    (roles: UserRole[]) => (state.user ? roles.includes(state.user.role) : false),
    [state.user]
  );

  const value = useMemo(
    () => ({
      ...state,
      login,
      loginWithGoogle,
      register,
      logout,
      updateUser,
      hasRole,
      hasAnyRole,
    }),
    [state, login, loginWithGoogle, register, logout, updateUser, hasRole, hasAnyRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
