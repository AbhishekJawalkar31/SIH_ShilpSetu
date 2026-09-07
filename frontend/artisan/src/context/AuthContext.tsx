"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  AuthUser,
  TokenResponse,
  UserLoginRequest,
  UserRegisterRequest,
} from "../services/types";
import {
  api,
  getAuthToken,
  setAuthToken,
  clearAuthToken,
  ApiError,
} from "../services/apiClient";

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: UserLoginRequest) => Promise<TokenResponse>;
  register: (payload: UserRegisterRequest) => Promise<TokenResponse>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    const existingToken = getAuthToken();
    if (!existingToken) {
      setUser(null);
      setToken(null);
      return null;
    }

    try {
      const me = await api.getMe();
      setUser(me);
      setToken(existingToken);
      return me;
    } catch (err: any) {
      console.warn("Failed to fetch authenticated seller session:", err);
      if (err instanceof ApiError && err.status === 401) {
        logout();
      }
      return null;
    }
  }, [logout]);

  // Initial session restoration on mount
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      setIsLoading(true);
      try {
        const storedToken = getAuthToken();
        if (storedToken) {
          setToken(storedToken);
          const me = await api.getMe();
          if (isMounted) {
            setUser(me);
          }
        }
      } catch (err: any) {
        console.warn("Session restore error:", err);
        if (isMounted) {
          if (err instanceof ApiError && err.status === 401) {
            logout();
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [logout]);

  const login = useCallback(
    async (credentials: UserLoginRequest): Promise<TokenResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.login(credentials);
        setToken(res.access_token);
        const me = await api.getMe();
        setUser(me);
        return res;
      } catch (err: any) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Login failed. Please check your credentials and try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (payload: UserRegisterRequest): Promise<TokenResponse> => {
      setIsLoading(true);
      setError(null);
      try {
        // Enforce backend role "artisan" while presenting Seller to user
        const fullPayload: UserRegisterRequest = {
          ...payload,
          role: "artisan",
        };
        const res = await api.register(fullPayload);
        setToken(res.access_token);
        const me = await api.getMe();
        setUser(me);
        return res;
      } catch (err: any) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Registration failed. Please verify your details and try again.";
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        error,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        refreshUser,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
