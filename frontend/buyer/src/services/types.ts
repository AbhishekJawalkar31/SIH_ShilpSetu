export type ProductStatus = "draft" | "published" | "archived";
export type QuoteStatus = "pending" | "responded" | "accepted" | "rejected" | "closed";
export type AllocationStatus = "matched" | "contacted" | "quoted" | "accepted" | "rejected";
export type OrderStatus = "pending" | "confirmed" | "processing" | "completed" | "cancelled";

// ---------------------------------------------------------------------------
// 1. Products
// ---------------------------------------------------------------------------
export interface Product {
  id: string;
  artisan_id: string;
  title: string;
  description: string;
  category: string | null;
  material: string | null;
  craft_type: string | null;
  tags: string[];
  attributes: Record<string, unknown>;
  price: number | null;
  currency: string;
  image_url: string | null;
  status: ProductStatus;
  available_quantity: number;
  production_capacity: number;
  unit: string;
  created_at: string;
  updated_at: string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProductFilterParams {
  artisan_id?: string;
  category?: string;
  craft_type?: string;
  status?: ProductStatus;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// 2. Artisans
// ---------------------------------------------------------------------------
export interface ArtisanProfile {
  id: string;
  user_id: string;
  name: string;
  business_name: string | null;
  craft_type: string | null;
  description: string | null;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string;
  languages: string[];
  rating: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// 3. Search & B2B Matching
// ---------------------------------------------------------------------------
export interface SearchIntent {
  product: string | null;
  quantity: number | null;
  budget_per_unit: number | null;
  use_case: string | null;
  location: string | null;
}

export interface SearchResultItem {
  product_id: string;
  artisan_id: string;
  title: string;
  price: number | null;
  available_quantity: number;
  production_capacity: number;
  match_score: number;
}

export interface SearchRequest {
  query: string;
  quantity?: number;
  budget_per_unit?: number;
  location?: string;
  require_full_capacity?: boolean;
}

export interface SearchResponse {
  intent: SearchIntent;
  results: SearchResultItem[];
  total?: number;
}

export interface BulkMatchRequest {
  query: string;
  quantity: number;
}

export interface ArtisanPoolItem {
  artisan_id: string;
  business_name: string | null;
  product_id: string;
  matched_quantity: number;
  match_score: number;
}

export interface BulkMatchResponse {
  required_quantity: number;
  matched_quantity: number;
  artisans: ArtisanPoolItem[];
}

// ---------------------------------------------------------------------------
// 4. Quotes
// ---------------------------------------------------------------------------
export interface QuoteCreateRequest {
  buyer_id: string;
  requirement_text: string;
  quantity: number;
  product_id?: string;
  budget_per_unit?: number;
  total_budget?: number;
}

export interface QuoteArtisanAllocation {
  id: string;
  quote_request_id: string;
  artisan_id: string;
  matched_quantity: number;
  match_score: number;
  status: AllocationStatus;
  created_at: string;
  business_name?: string | null;
  artisan_name?: string | null;
  city?: string | null;
  state?: string | null;
  product_id?: string | null;
}

export interface QuoteResponse {
  id: string;
  buyer_id: string;
  product_id: string | null;
  quantity: number;
  budget_per_unit: number | null;
  total_budget: number | null;
  requirement_text: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  allocations: QuoteArtisanAllocation[];
}

export interface QuoteListResponse {
  quotes: QuoteResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface QuoteFilterParams {
  buyer_id?: string;
  status?: QuoteStatus;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// 5. Orders
// ---------------------------------------------------------------------------
export interface OrderItemResponse {
  id: string;
  order_id: string;
  artisan_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
  artisan_business_name?: string | null;
  product_title?: string | null;
}

export interface OrderResponse {
  id: string;
  buyer_id: string;
  artisan_id: string | null;
  product_id: string | null;
  quote_request_id: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  items: OrderItemResponse[];
}

export interface OrderListResponse {
  items: OrderResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface OrderFilterParams {
  buyer_id?: string;
  artisan_id?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface QuoteAcceptResponse {
  order: OrderResponse;
  quote_id: string;
  message: string;
}

// ---------------------------------------------------------------------------
// 6. Notifications
// ---------------------------------------------------------------------------
export interface NotificationResponse {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationListResponse {
  items: NotificationResponse[];
  total: number;
  unread_count: number;
}

export interface NotificationFilterParams {
  user_id?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// 7. Translation
// ---------------------------------------------------------------------------
export interface TranslationRequest {
  text: string;
  source_language: string;
  target_language: string;
}

export interface TranslationResponse {
  translated_text: string;
  source_language: string;
  target_language: string;
}
