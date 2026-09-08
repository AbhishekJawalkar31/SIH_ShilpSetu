import {
  ArtisanProfile,
  AuthUser,
  BulkMatchRequest,
  BulkMatchResponse,
  DirectOrderCreateRequest,
  DirectOrderItemRequest,
  NotificationFilterParams,
  NotificationListResponse,
  NotificationResponse,
  OrderFilterParams,
  OrderItemResponse,
  OrderListResponse,
  OrderResponse,
  Product,
  ProductFilterParams,
  ProductListResponse,
  QuoteAcceptResponse,
  QuoteCreateRequest,
  QuoteFilterParams,
  QuoteListResponse,
  QuoteResponse,
  SearchRequest,
  SearchResponse,
  TokenResponse,
  TranslationRequest,
  TranslationResponse,
  UserLoginRequest,
  UserRegisterRequest,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Customer-specific token storage key to strictly avoid collisions with Seller auth
export const CUSTOMER_TOKEN_STORAGE_KEY = "shilpsetu_customer_token";
export const CUSTOMER_USER_STORAGE_KEY = "shilpsetu_customer_user";

/**
 * Resolves a backend-relative URL (e.g. `/uploads/products/<filename>`)
 * against the configured backend base URL without hardcoding frontend host.
 */
export function resolveBackendUrl(imageUrl?: string | null): string {
  if (!imageUrl || typeof imageUrl !== "string") return "";
  const trimmed = imageUrl.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${API_BASE_URL}${cleanPath}`;
}

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  public status: number;
  public code?: string;
  public details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Customer Token Helpers
// ---------------------------------------------------------------------------
export function getCustomerToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(CUSTOMER_TOKEN_STORAGE_KEY);
}

export function setCustomerToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOMER_TOKEN_STORAGE_KEY, token);
}

export function clearCustomerToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CUSTOMER_TOKEN_STORAGE_KEY);
  localStorage.removeItem(CUSTOMER_USER_STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Centralized Fetch Helper
// ---------------------------------------------------------------------------
interface RequestOptions extends RequestInit {
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined | null>;
}

export async function customerRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { token, params, headers, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string>),
  };

  const isFormData = customConfig.body instanceof FormData;
  if (!isFormData && customConfig.body && typeof customConfig.body === "string" && !reqHeaders["Content-Type"]) {
    reqHeaders["Content-Type"] = "application/json";
  }

  // Use explicit token or read customer token from localStorage
  const activeToken = token !== undefined ? token : getCustomerToken();
  if (activeToken) {
    reqHeaders["Authorization"] = `Bearer ${activeToken}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...customConfig,
      headers: reqHeaders,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new ApiError(
      0,
      `Unable to connect to ShilpSetu server at ${API_BASE_URL}. (${errorMsg})`,
      "NETWORK_ERROR"
    );
  }

  // Parse response
  let data: unknown;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    let errorCode = response.status === 401 ? "UNAUTHORIZED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR";
    let errorMessage = `Request failed with status ${response.status}`;

    if (typeof data === "object" && data !== null) {
      const errObj = data as Record<string, any>;
      if (errObj.error) {
        errorCode = errObj.error.code || errorCode;
        errorMessage = errObj.error.message || errorMessage;
      } else if (errObj.detail) {
        if (Array.isArray(errObj.detail)) {
          errorCode = "VALIDATION_ERROR";
          errorMessage = errObj.detail
            .map((item: any) => (item.msg ? `${item.loc?.join(".") || "field"}: ${item.msg}` : JSON.stringify(item)))
            .join("; ");
        } else if (typeof errObj.detail === "object") {
          errorCode = errObj.detail.code || errorCode;
          errorMessage = errObj.detail.message || errorMessage;
        } else if (typeof errObj.detail === "string") {
          errorMessage = errObj.detail;
        }
      }
    }

    throw new ApiError(response.status, errorMessage, errorCode, data);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Typed API Client Functions
// ---------------------------------------------------------------------------

// 1. Customer Authentication
export async function registerCustomer(
  payload: UserRegisterRequest
): Promise<TokenResponse> {
  const fullPayload: UserRegisterRequest = {
    ...payload,
    role: "buyer", // Preserves backend enum compatibility while UI displays Customer (ग्राहक)
  };
  const res = await customerRequest<TokenResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(fullPayload),
  });
  if (res.access_token) {
    setCustomerToken(res.access_token);
  }
  return res;
}

export async function loginCustomer(
  credentials: UserLoginRequest
): Promise<TokenResponse> {
  const res = await customerRequest<TokenResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (res.access_token) {
    setCustomerToken(res.access_token);
  }
  return res;
}

export async function getCurrentCustomer(token?: string): Promise<AuthUser> {
  return await customerRequest<AuthUser>("/api/auth/me", {
    method: "GET",
    token,
  });
}

// 2. Products & Catalogue
export async function getProducts(
  filters: ProductFilterParams = {}
): Promise<ProductListResponse> {
  return await customerRequest<ProductListResponse>("/api/products", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
  });
}

export async function getProduct(productId: string): Promise<Product> {
  return await customerRequest<Product>(`/api/products/${productId}`, {
    method: "GET",
  });
}

// 3. Search & B2B Matching
export async function searchProducts(
  body: SearchRequest
): Promise<SearchResponse> {
  return await customerRequest<SearchResponse>("/api/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function matchProducts(
  body: BulkMatchRequest
): Promise<BulkMatchResponse> {
  return await customerRequest<BulkMatchResponse>("/api/matching/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// 4. Sellers (Artisans)
export async function getSeller(sellerId: string): Promise<ArtisanProfile> {
  return await customerRequest<ArtisanProfile>(`/api/artisans/${sellerId}`, {
    method: "GET",
  });
}

export async function getSellerProducts(sellerId: string): Promise<Product[]> {
  const data = await customerRequest<
    Product[] | { items: Product[] } | { products: Product[] }
  >(`/api/artisans/${sellerId}/products`, {
    method: "GET",
  });

  if (Array.isArray(data)) return data;
  if ((data as { products?: Product[] }).products && Array.isArray((data as { products: Product[] }).products)) {
    return (data as { products: Product[] }).products;
  }
  if ((data as { items?: Product[] }).items && Array.isArray((data as { items: Product[] }).items)) {
    return (data as { items: Product[] }).items;
  }
  return [];
}

// 5. Quotes (Custom Requirements)
export async function createQuote(
  body: QuoteCreateRequest,
  token?: string
): Promise<QuoteResponse> {
  return await customerRequest<QuoteResponse>("/api/quotes", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function getQuotes(
  filters: QuoteFilterParams = {},
  token?: string
): Promise<QuoteListResponse> {
  return await customerRequest<QuoteListResponse>("/api/quotes", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
    token,
  });
}

export async function getQuote(
  quoteId: string,
  token?: string
): Promise<QuoteResponse> {
  return await customerRequest<QuoteResponse>(`/api/quotes/${quoteId}`, {
    method: "GET",
    token,
  });
}

export async function acceptQuote(
  quoteId: string,
  token?: string
): Promise<QuoteAcceptResponse> {
  return await customerRequest<QuoteAcceptResponse>(
    `/api/quotes/${quoteId}/accept`,
    {
      method: "POST",
      token,
    }
  );
}

// 6. Orders
export async function getOrders(
  filters: OrderFilterParams = {},
  token?: string
): Promise<OrderListResponse> {
  return await customerRequest<OrderListResponse>("/api/orders", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
    token,
  });
}

export async function getOrder(
  orderId: string,
  token?: string
): Promise<OrderResponse> {
  return await customerRequest<OrderResponse>(`/api/orders/${orderId}`, {
    method: "GET",
    token,
  });
}

export async function getOrderItems(
  orderId: string,
  token?: string
): Promise<OrderItemResponse[]> {
  return await customerRequest<OrderItemResponse[]>(
    `/api/orders/${orderId}/items`,
    {
      method: "GET",
      token,
    }
  );
}

export async function createDirectOrder(
  payload: DirectOrderCreateRequest,
  token?: string
): Promise<OrderResponse> {
  return await customerRequest<OrderResponse>("/api/orders/direct", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

// 7. Notifications
export async function getNotifications(
  filters: NotificationFilterParams = {},
  token?: string
): Promise<NotificationListResponse> {
  return await customerRequest<NotificationListResponse>(
    "/api/notifications",
    {
      method: "GET",
      params: filters as Record<string, string | number | boolean>,
      token,
    }
  );
}

export async function getUnreadNotifications(
  filters: NotificationFilterParams = {},
  token?: string
): Promise<NotificationListResponse> {
  return await customerRequest<NotificationListResponse>(
    "/api/notifications/unread",
    {
      method: "GET",
      params: filters as Record<string, string | number | boolean>,
      token,
    }
  );
}

export async function markNotificationRead(
  notificationId: string,
  token?: string
): Promise<NotificationResponse> {
  return await customerRequest<NotificationResponse>(
    `/api/notifications/${notificationId}/read`,
    {
      method: "PATCH",
      token,
    }
  );
}

// 8. Translation
export async function translate(
  body: TranslationRequest
): Promise<TranslationResponse> {
  return await customerRequest<TranslationResponse>("/api/translate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// 9. Health
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

