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
  registerCustomer,
  loginCustomer,
  getCurrentCustomer,
  getCustomerToken,
  clearCustomerToken,
  CUSTOMER_USER_STORAGE_KEY,
  ApiError,
} from "../services/customerApi";

interface CustomerAuthContextType {
  customer: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: UserLoginRequest) => Promise<TokenResponse>;
  register: (payload: UserRegisterRequest) => Promise<TokenResponse>;
  logout: () => void;
  refreshCustomer: () => Promise<AuthUser | null>;
  clearError: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(
  undefined
);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [customer, setCustomer] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    clearCustomerToken();
    setToken(null);
    setCustomer(null);
    setError(null);
  }, []);

  const refreshCustomer = useCallback(async (): Promise<AuthUser | null> => {
    const existingToken = getCustomerToken();
    if (!existingToken) {
      setCustomer(null);
      setToken(null);
      return null;
    }

    try {
      const me = await getCurrentCustomer(existingToken);
      setCustomer(me);
      setToken(existingToken);
      if (typeof window !== "undefined") {
        localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, JSON.stringify(me));
      }
      return me;
    } catch (err: any) {
      console.warn("Failed to fetch customer session:", err);
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
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
        const storedToken = getCustomerToken();
        if (storedToken) {
          setToken(storedToken);
          // Try restoring cached profile first for instant UI response
          if (typeof window !== "undefined") {
            const cachedUserStr = localStorage.getItem(CUSTOMER_USER_STORAGE_KEY);
            if (cachedUserStr) {
              try {
                const cachedUser = JSON.parse(cachedUserStr);
                if (isMounted) setCustomer(cachedUser);
              } catch {
                // Ignore parse error
              }
            }
          }
          // Validate with backend
          const me = await getCurrentCustomer(storedToken);
          if (isMounted) {
            setCustomer(me);
            if (typeof window !== "undefined") {
              localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, JSON.stringify(me));
            }
          }
        }
      } catch (err: any) {
        console.warn("Customer session restore error:", err);
        if (isMounted) {
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
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
        const res = await loginCustomer(credentials);
        setToken(res.access_token);
        const me = await getCurrentCustomer(res.access_token);
        setCustomer(me);
        if (typeof window !== "undefined") {
          localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, JSON.stringify(me));
        }
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
        // Enforce backend role "buyer" compatibility while UI displays Customer (ग्राहक)
        const res = await registerCustomer(payload);
        setToken(res.access_token);
        const me = await getCurrentCustomer(res.access_token);
        setCustomer(me);
        if (typeof window !== "undefined") {
          localStorage.setItem(CUSTOMER_USER_STORAGE_KEY, JSON.stringify(me));
        }
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
    <CustomerAuthContext.Provider
      value={{
        customer,
        token,
        isLoading,
        error,
        isAuthenticated: !!customer && !!token,
        login,
        register,
        logout,
        refreshCustomer,
        clearError,
      }}
    >
      {children}
    </CustomerAuthContext.Provider>
  );
};

export function useCustomerAuth(): CustomerAuthContextType {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error(
      "useCustomerAuth must be used within a CustomerAuthProvider"
    );
  }
  return context;
}

