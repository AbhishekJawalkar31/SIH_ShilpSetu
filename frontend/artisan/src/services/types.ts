export interface ArtisanProfile {
  id: string;
  business_name: string;
  craft_type: string;
  description: string;
  location: string;
  city: string;
  state: string;
  country: string;
  languages: string[];
  rating: number;
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

export interface ProductCreatePayload {
  artisan_id: string;
  title: string;
  description: string;
  category: string;
  material: string;
  craft_type: string;
  tags: string[];
  attributes: ProductAttributes;
  price: number;
  currency: string;
  image_url: string;
  status: "draft" | "published" | "archived";
}

export interface Product extends ProductCreatePayload {
  id: string;
  created_at?: string;
  updated_at?: string;
  available_quantity?: number;
  production_capacity?: number;
}

export interface SpeechTranscriptionResponse {
  text: string;
  language: string;
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

