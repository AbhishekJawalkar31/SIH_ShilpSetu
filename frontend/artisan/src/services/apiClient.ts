import {
  ArtisanProfile,
  AuthUser,
  BackendNotification,
  BackendNotificationListResponse,
  BackendOrder,
  BackendOrderListResponse,
  CatalogueGenerationResponse,
  ImageUploadResponse,
  InventoryUpdateRequest,
  Product,
  ProductCreateRequest,
  SpeechTranscriptionResponse,
  TokenResponse,
  UserLoginRequest,
  UserRegisterRequest,
} from "./types";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const TOKEN_STORAGE_KEY = "shilpsetu_seller_token";
export const USER_STORAGE_KEY = "shilpsetu_seller_user";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

/**
 * Resolves a backend-relative URL (e.g. `/uploads/products/<filename>`)
 * against the configured backend base URL without hardcoding frontend host.
 */
export function resolveBackendUrl(imageUrl?: string | null): string {
  if (!imageUrl) return "";
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("blob:") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }
  const cleanPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setAuthToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  // Automatically inject Bearer token if available and not already set
  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Handle Content-Type: do NOT set for FormData so browser sets boundary
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      "Unable to connect to the ShilpSetu server. Please check your internet connection or try again later."
    );
  }

  if (!response.ok) {
    let errorCode = "UNKNOWN_ERROR";
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorJson = await response.json();
      if (errorJson.error) {
        errorCode = errorJson.error.code || errorCode;
        errorMessage = errorJson.error.message || errorMessage;
      } else if (errorJson.detail) {
        if (typeof errorJson.detail === "object") {
          errorCode = errorJson.detail.code || errorCode;
          errorMessage = errorJson.detail.message || errorMessage;
        } else if (typeof errorJson.detail === "string") {
          errorMessage = errorJson.detail;
        }
      }
    } catch {
      // Non-JSON response body
    }

    throw new ApiError(response.status, errorCode, errorMessage);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export const api = {
  // Authentication
  async register(payload: UserRegisterRequest): Promise<TokenResponse> {
    const data = await apiRequest<TokenResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthToken(data.access_token);
    return data;
  },

  async login(payload: UserLoginRequest): Promise<TokenResponse> {
    const data = await apiRequest<TokenResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setAuthToken(data.access_token);
    return data;
  },

  async getMe(): Promise<AuthUser> {
    return await apiRequest<AuthUser>("/api/auth/me", {
      method: "GET",
    });
  },

  // Products & Media
  async uploadImage(file: File | Blob): Promise<ImageUploadResponse> {
    const formData = new FormData();
    if (file instanceof File) {
      formData.append("image", file);
    } else {
      formData.append("image", file, "product_photo.jpg");
    }
    return await apiRequest<ImageUploadResponse>("/api/products/upload-image", {
      method: "POST",
      body: formData,
    });
  },

  // Speech Transcription
  async transcribeSpeech(
    audioBlob: Blob,
    language: string = "hi"
  ): Promise<SpeechTranscriptionResponse> {
    const formData = new FormData();
    formData.append("audio", audioBlob, "recording.webm");
    formData.append("language", language);
    return await apiRequest<SpeechTranscriptionResponse>(
      "/api/speech/transcribe",
      {
        method: "POST",
        body: formData,
      }
    );
  },

  // AI Catalogue Generation
  async generateCatalogue(
    imageFile: File | Blob,
    artisanId: string,
    voiceText?: string
  ): Promise<CatalogueGenerationResponse> {
    const formData = new FormData();
    if (imageFile instanceof File) {
      formData.append("image", imageFile);
    } else {
      formData.append("image", imageFile, "product_photo.jpg");
    }
    formData.append("artisan_id", artisanId);
    if (voiceText && voiceText.trim()) {
      formData.append("voice_text", voiceText.trim());
    }
    return await apiRequest<CatalogueGenerationResponse>(
      "/api/catalogue/generate",
      {
        method: "POST",
        body: formData,
      }
    );
  },

  // Product Publishing & Listing
  async createProduct(payload: ProductCreateRequest): Promise<Product> {
    return await apiRequest<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getArtisanProducts(artisanId: string): Promise<Product[]> {
    try {
      const res = await apiRequest<any>(`/api/artisans/${artisanId}/products`, {
        method: "GET",
      });
      if (Array.isArray(res)) return res as Product[];
      if (res.items && Array.isArray(res.items)) return res.items as Product[];
      if (res.products && Array.isArray(res.products)) return res.products as Product[];
      return [];
    } catch {
      return [];
    }
  },

  async getArtisanProfile(artisanId: string): Promise<ArtisanProfile> {
    return await apiRequest<ArtisanProfile>(`/api/artisans/${artisanId}`, {
      method: "GET",
    });
  },

  async getProduct(productId: string): Promise<Product> {
    return await apiRequest<Product>(`/api/products/${productId}`, {
      method: "GET",
    });
  },

  async updateInventory(
    productId: string,
    payload: InventoryUpdateRequest
  ): Promise<Product> {
    return await apiRequest<Product>(`/api/products/${productId}/inventory`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // Orders (Authenticated Seller Scoped by backend)
  async getOrders(
    status?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<BackendOrderListResponse> {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("limit", limit.toString());
    params.set("offset", offset.toString());

    return await apiRequest<BackendOrderListResponse>(
      `/api/orders?${params.toString()}`,
      { method: "GET" }
    );
  },

  async getOrder(orderId: string): Promise<BackendOrder> {
    return await apiRequest<BackendOrder>(`/api/orders/${orderId}`, {
      method: "GET",
    });
  },

  // Notifications (Authenticated User Scoped by backend)
  async getUnreadNotifications(
    limit: number = 50,
    offset: number = 0
  ): Promise<BackendNotificationListResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return await apiRequest<BackendNotificationListResponse>(
      `/api/notifications/unread?${params.toString()}`,
      { method: "GET" }
    );
  },

  async markNotificationRead(
    notificationId: string
  ): Promise<BackendNotification> {
    return await apiRequest<BackendNotification>(
      `/api/notifications/${notificationId}/read`,
      { method: "PATCH" }
    );
  },

  // Health
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/api/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
