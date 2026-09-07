import {
  ArtisanProfile,
  BulkMatchRequest,
  BulkMatchResponse,
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
  TranslationRequest,
  TranslationResponse,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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
// Centralized Fetch Helper
// ---------------------------------------------------------------------------
interface RequestOptions extends RequestInit {
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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

  if (customConfig.body && typeof customConfig.body === "string" && !reqHeaders["Content-Type"]) {
    reqHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...customConfig,
      headers: reqHeaders,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Network error";
    throw new ApiError(0, `Network error: Could not reach backend at ${API_BASE_URL}. (${errorMsg})`, "NETWORK_ERROR");
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
    const errObj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
    const errCode = (errObj.detail as Record<string, string>)?.code || (errObj.error as Record<string, string>)?.code || "HTTP_ERROR";
    const errMsg = (errObj.detail as Record<string, string>)?.message || (errObj.error as Record<string, string>)?.message || (typeof errObj.detail === "string" ? errObj.detail : response.statusText);

    throw new ApiError(response.status, errMsg || `HTTP Error ${response.status}`, String(errCode), data);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const data = await request<{ status: string }>("/api/health");
    return data?.status === "ok";
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
export async function getProducts(filters: ProductFilterParams = {}): Promise<ProductListResponse> {
  return request<ProductListResponse>("/api/products", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
  });
}

export async function getProduct(productId: string): Promise<Product> {
  return request<Product>(`/api/products/${productId}`, {
    method: "GET",
  });
}

// ---------------------------------------------------------------------------
// Artisans
// ---------------------------------------------------------------------------
export async function getArtisan(artisanId: string): Promise<ArtisanProfile> {
  return request<ArtisanProfile>(`/api/artisans/${artisanId}`, {
    method: "GET",
  });
}

export async function getArtisanProducts(artisanId: string): Promise<Product[]> {
  const data = await request<Product[] | { items: Product[] } | { products: Product[] }>(
    `/api/artisans/${artisanId}/products`,
    { method: "GET" }
  );

  if (Array.isArray(data)) {
    return data;
  }
  if ((data as { products?: Product[] }).products && Array.isArray((data as { products: Product[] }).products)) {
    return (data as { products: Product[] }).products;
  }
  if ((data as { items?: Product[] }).items && Array.isArray((data as { items: Product[] }).items)) {
    return (data as { items: Product[] }).items;
  }
  return [];
}

// ---------------------------------------------------------------------------
// Search & B2B Matching
// ---------------------------------------------------------------------------
export async function searchProducts(body: SearchRequest): Promise<SearchResponse> {
  return request<SearchResponse>("/api/search", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function matchProducts(body: BulkMatchRequest): Promise<BulkMatchResponse> {
  return request<BulkMatchResponse>("/api/matching/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------
export async function createQuote(body: QuoteCreateRequest, token?: string): Promise<QuoteResponse> {
  return request<QuoteResponse>("/api/quotes", {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

export async function getQuotes(filters: QuoteFilterParams = {}, token?: string): Promise<QuoteListResponse> {
  return request<QuoteListResponse>("/api/quotes", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
    token,
  });
}

export async function getQuote(quoteId: string, token?: string): Promise<QuoteResponse> {
  return request<QuoteResponse>(`/api/quotes/${quoteId}`, {
    method: "GET",
    token,
  });
}

export async function acceptQuote(quoteId: string, token?: string): Promise<QuoteAcceptResponse> {
  return request<QuoteAcceptResponse>(`/api/quotes/${quoteId}/accept`, {
    method: "POST",
    token,
  });
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
export async function getOrders(filters: OrderFilterParams = {}, token?: string): Promise<OrderListResponse> {
  return request<OrderListResponse>("/api/orders", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
    token,
  });
}

export async function getOrder(orderId: string, token?: string): Promise<OrderResponse> {
  return request<OrderResponse>(`/api/orders/${orderId}`, {
    method: "GET",
    token,
  });
}

export async function getOrderItems(orderId: string, token?: string): Promise<OrderItemResponse[]> {
  return request<OrderItemResponse[]>(`/api/orders/${orderId}/items`, {
    method: "GET",
    token,
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------
export async function getNotifications(filters: NotificationFilterParams = {}, token?: string): Promise<NotificationListResponse> {
  return request<NotificationListResponse>("/api/notifications", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
    token,
  });
}

export async function getUnreadNotifications(filters: NotificationFilterParams = {}, token?: string): Promise<NotificationListResponse> {
  return request<NotificationListResponse>("/api/notifications/unread", {
    method: "GET",
    params: filters as Record<string, string | number | boolean>,
    token,
  });
}

export async function markNotificationRead(notificationId: string, token?: string): Promise<NotificationResponse> {
  return request<NotificationResponse>(`/api/notifications/${notificationId}/read`, {
    method: "PATCH",
    token,
  });
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------
export async function translateText(body: TranslationRequest): Promise<TranslationResponse> {
  return request<TranslationResponse>("/api/translate", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
