/* ============================================================
   Project Intelligence Platform - Authentication Context
   Manages user session, token persistence, and auth state.
   ============================================================ */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import type { User, LoginRequest, RegisterRequest } from '../types';
import { auth as authApi, setToken, clearToken, getToken, ApiError } from '../services/api';

// ─── State ───────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: getToken(),
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// ─── Actions ─────────────────────────────────────────────────

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'AUTH_USER_LOADED'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_CLEAR_ERROR' };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true, error: null };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_USER_LOADED':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'AUTH_LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'AUTH_CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  const login = useCallback(async (data: LoginRequest) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authApi.login(data);
      setToken(response.access_token);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: response.user, token: response.access_token },
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : 'Login failed. Please try again.';
      clearToken();
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw err;
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    dispatch({ type: 'AUTH_START' });
    try {
      const response = await authApi.register(data);
      setToken(response.access_token);
      dispatch({
        type: 'AUTH_SUCCESS',
        payload: { user: response.user, token: response.access_token },
      });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.detail : 'Registration failed. Please try again.';
      clearToken();
      dispatch({ type: 'AUTH_FAILURE', payload: message });
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    dispatch({ type: 'AUTH_LOGOUT' });
  }, []);

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      dispatch({ type: 'AUTH_LOGOUT' });
      return;
    }

    dispatch({ type: 'AUTH_START' });
    try {
      const user = await authApi.getMe();
      dispatch({ type: 'AUTH_USER_LOADED', payload: user });
    } catch {
      clearToken();
      dispatch({ type: 'AUTH_LOGOUT' });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'AUTH_CLEAR_ERROR' });
  }, []);

  // Auto-check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      register,
      logout,
      checkAuth,
      clearError,
    }),
    [state, login, register, logout, checkAuth, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
