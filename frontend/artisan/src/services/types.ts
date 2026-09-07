export type UserRole = "artisan" | "buyer" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  artisan_id?: string | null;
  is_active: boolean;
  business_name?: string | null;
  craft_type?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

export interface UserLoginRequest {
  email: string;
  password: string;
}

export interface UserRegisterRequest {
  name: string;
  email: string;
  password: string;
  role: "artisan";
  phone?: string;
  business_name?: string;
  craft_type?: string;
  city?: string;
  state?: string;
}

export interface ImageUploadResponse {
  image_url: string;
  filename: string;
}

export interface ArtisanProfile {
  id: string;
  user_id?: string;
  name?: string;
  business_name?: string | null;
  craft_type?: string | null;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string;
  languages?: string[];
  rating?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ProductAttributes {
  color?: string;
  size?: string;
  dimensions?: string;
  weight?: string;
  care_instructions?: string;
  technique?: string;
  [key: string]: string | undefined;
}

export interface CatalogueGenerationResponse {
  title: string;
  description: string;
  category: string;
  material: string;
  craft_type: string;
  tags: string[];
  attributes: ProductAttributes;
  recommended_price_min: number;
  recommended_price_max: number;
}

export interface InventoryData {
  available_quantity: number;
  production_capacity: number;
  unit: string;
}

export interface InventoryUpdateRequest {
  available_quantity: number;
  production_capacity: number;
  unit: string;
}

export interface ProductCreatePayload {
  artisan_id: string;
  title: string;
  description: string;
  category?: string;
  material?: string;
  craft_type?: string;
  tags?: string[];
  attributes?: Record<string, any>;
  price?: number;
  currency?: string;
  image_url?: string;
  status: "draft" | "published" | "archived";
  available_quantity?: number;
  production_capacity?: number;
  unit?: string;
}

export type ProductCreateRequest = ProductCreatePayload;

export interface Product extends ProductCreatePayload {
  id: string;
  created_at?: string;
  updated_at?: string;
  available_quantity: number;
  production_capacity: number;
  unit?: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

export interface SpeechTranscriptionResponse {
  text: string;
  language: string;
}

export type BackendOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "completed"
  | "cancelled";

export interface BackendOrderItem {
  id: string;
  order_id: string;
  artisan_id: string;
  product_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  artisan_business_name?: string | null;
  product_title?: string | null;
}

export interface BackendOrder {
  id: string;
  buyer_id: string;
  artisan_id?: string | null;
  product_id?: string | null;
  quote_request_id?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: BackendOrderStatus;
  created_at: string;
  updated_at: string;
  items: BackendOrderItem[];
}

export interface BackendOrderListResponse {
  items: BackendOrder[];
  total: number;
  limit: number;
  offset: number;
}

export interface BackendNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_type?: string | null;
  reference_id?: string | null;
  is_read: boolean;
  created_at: string;
}

export interface BackendNotificationListResponse {
  items: BackendNotification[];
  total: number;
  unread_count: number;
}

export interface QuoteRequestSummary {
  id: string;
  buyer_name: string;
  buyer_type?: string;
  requirement_title: string;
  requirement_text: string;
  quantity: number;
  budget_per_unit: number;
  total_budget: number;
  status: "pending" | "responded" | "accepted" | "rejected";
  time_ago: string;
  is_new?: boolean;
}

export interface OrderSummary {
  id: string;
  product_title: string;
  image_url: string;
  quantity: number;
  total_price: number;
  status: "processing" | "shipped" | "delivered" | "cancelled";
  date: string;
}

export interface ActivityItem {
  id: string;
  title: string;
  type: "order" | "listed" | "quote";
  time_ago: string;
  status?: string;
}

