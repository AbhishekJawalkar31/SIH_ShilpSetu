import {
  CatalogueGenerationResponse,
  Product,
  ProductCreatePayload,
  SpeechTranscriptionResponse,
  ArtisanProfile,
} from "./types";
import { initialProducts, mockArtisanProfile } from "../lib/mockData";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

let isBackendAvailableCache: boolean | null = null;
let lastHealthCheckTime = 0;

/**
 * Check if the FastAPI backend is running and reachable.
 */
export async function checkBackendHealth(): Promise<boolean> {
  const now = Date.now();
  // Cache health check for 5 seconds to prevent spamming
  if (isBackendAvailableCache !== null && now - lastHealthCheckTime < 5000) {
    return isBackendAvailableCache;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    isBackendAvailableCache = res.ok;
    lastHealthCheckTime = now;
    return isBackendAvailableCache;
  } catch {
    isBackendAvailableCache = false;
    lastHealthCheckTime = now;
    return false;
  }
}

/**
 * GET /api/artisans/{artisan_id}
 * Fetch public artisan profile.
 */
export async function getArtisanProfile(artisanId: string): Promise<ArtisanProfile> {
  const isOnline = await checkBackendHealth();

  if (isOnline) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/artisans/${artisanId}`);
      if (response.ok) {
        const data = (await response.json()) as ArtisanProfile;
        return {
          ...data,
          location: data.location || (data.city && data.state ? `${data.city}, ${data.state}` : mockArtisanProfile.location),
        };
      }
    } catch (err) {
      console.warn("Live fetch profile failed, using mock profile:", err);
    }
  }

  return mockArtisanProfile;
}

/**
 * GET /api/artisans/{artisan_id}/products
 * Fetch products for a specific artisan with robust response shape handling (array or items/products key).
 */
export async function getArtisanProducts(artisanId: string): Promise<Product[]> {
  const isOnline = await checkBackendHealth();

  if (isOnline) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/artisans/${artisanId}/products`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns list[ProductResponse] directly on /api/artisans/{id}/products
        // Or if wrapped as { items: [...] } or { products: [...] }
        if (Array.isArray(data)) {
          return data as Product[];
        }
        if (data.products && Array.isArray(data.products)) {
          return data.products as Product[];
        }
        if (data.items && Array.isArray(data.items)) {
          return data.items as Product[];
        }
      }
    } catch (err) {
      console.warn("Live fetch products failed, using mock fallback:", err);
    }
  }

  return initialProducts;
}

/**
 * POST /api/catalogue/generate
 * Generates an AI-assisted product catalogue from image and optional voice/text.
 */
export async function generateCatalogue(
  imageFile: File | Blob,
  voiceText?: string,
  artisanId: string = mockArtisanProfile.id
): Promise<CatalogueGenerationResponse> {
  const isOnline = await checkBackendHealth();

  if (isOnline) {
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      formData.append("artisan_id", artisanId);
      if (voiceText?.trim()) {
        formData.append("voice_text", voiceText.trim());
      }

      const response = await fetch(`${API_BASE_URL}/api/catalogue/generate`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error?.message || "Backend catalogue generation failed");
      }

      return (await response.json()) as CatalogueGenerationResponse;
    } catch (err) {
      console.warn("Live backend failed, switching to isolated mock service layer:", err);
    }
  }

  // Isolated Mock Service Layer (Contract-compliant fallback when backend is offline)
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const textHint = (voiceText || "").toLowerCase();
  
  if (textHint.includes("pot") || textHint.includes("clay") || textHint.includes("mitti") || textHint.includes("lamp") || textHint.includes("diya")) {
    return {
      title: "Handcrafted Terracotta Clay Vessel",
      description: "Authentic earthenware hand-moulded from fine riverbed clay, featuring traditional Rajasthani geometric patterns. Keeps water cool naturally and serves as elegant rustic decor.",
      category: "Home Decor",
      material: "Natural Terracotta Clay",
      craft_type: "Wheel-thrown Clay Pottery",
      tags: ["terracotta", "clay-pot", "handmade", "pottery", "organic", "artisan"],
      attributes: {
        color: "Natural Brick Terracotta",
        capacity: "1.5 Liters",
        finish: "Smooth Matte Porous",
        dimensions: "18 x 18 x 22 cm",
      },
      recommended_price_min: 450,
      recommended_price_max: 650,
    };
  } else if (textHint.includes("dupatta") || textHint.includes("saree") || textHint.includes("cotton") || textHint.includes("cloth") || textHint.includes("kapda")) {
    return {
      title: "Handblock Print Pure Cotton Stole",
      description: "Artisanal handblock printed lightweight cotton stole featuring heritage floral Bagru motifs. Handcrafted using non-toxic herbal dyes by rural Rajasthani textile artisans.",
      category: "Textiles",
      material: "Pure Mulmul Cotton",
      craft_type: "Handblock Print",
      tags: ["blockprint", "cotton", "textiles", "bagru", "vegetable-dye", "sustainable"],
      attributes: {
        color: "Indigo & Desert Ochre",
        length: "2.2 Meters",
        fabric_feel: "Soft Breathable",
        wash_care: "Cold gentle wash",
      },
      recommended_price_min: 800,
      recommended_price_max: 1100,
    };
  }

  return {
    title: "Handcrafted Jute Tote Bag",
    description: "Eco-friendly handwoven natural jute tote bag with reinforced cotton handles, traditional floral embroidery, and spacious capacity for daily shopping, events, or corporate bulk gifting.",
    category: "Bags",
    material: "Golden Jute Fiber",
    craft_type: "Handwoven",
    tags: ["handmade", "eco-friendly", "jute", "bulk", "gifting", "tote"],
    attributes: {
      color: "Natural Golden Brown",
      size: "Large (16x14 inches)",
      weight: "320g",
      closure: "Organic cotton loop & button",
    },
    recommended_price_min: 699,
    recommended_price_max: 899,
  };
}

/**
 * POST /api/speech/transcribe
 * Converts artisan audio recording into text via Sarvam Saaras.
 */
export async function transcribeSpeech(
  audioBlob: Blob,
  language: string = "hi"
): Promise<SpeechTranscriptionResponse> {
  const isOnline = await checkBackendHealth();

  if (isOnline) {
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      formData.append("language", language);

      const response = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        return (await response.json()) as SpeechTranscriptionResponse;
      }
    } catch (err) {
      console.warn("Live speech backend failed, using mock transcription:", err);
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 1400));

  if (language === "hi") {
    return {
      text: "यह प्राकृतिक सुनहरे जूट से बना हाथ से बुना हुआ बैग है। इसमें मजबूत हैंडल और फूलों की कढ़ाई है।",
      language: "hi",
    };
  }

  return {
    text: "This is a handwoven natural jute bag with reinforced handles and floral embroidery, perfect for hotel gifting.",
    language: "en",
  };
}

/**
 * POST /api/products
 * Creates a product listing with the artisan-approved details, price, and inventory.
 */
export async function createProduct(payload: ProductCreatePayload): Promise<Product> {
  const isOnline = await checkBackendHealth();

  // Validate and clean image URL: fallback to high-quality unsplash craft photo if blob URL cannot be stored remotely
  let imageUrl = payload.image_url;
  if (!imageUrl || imageUrl.startsWith("blob:")) {
    imageUrl = "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600";
  }

  const backendPayload = {
    artisan_id: payload.artisan_id,
    title: payload.title,
    description: payload.description,
    category: payload.category || "Home Decor",
    material: payload.material || "Natural Material",
    craft_type: payload.craft_type || "Handcrafted",
    tags: payload.tags || [],
    attributes: payload.attributes || {},
    price: payload.price,
    currency: payload.currency || "INR",
    image_url: imageUrl,
    status: payload.status || "published",
    available_quantity: payload.available_quantity ?? 25,
    production_capacity: payload.production_capacity ?? 100,
    unit: payload.unit || "piece",
  };

  if (isOnline) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload),
      });

      if (response.ok) {
        return (await response.json()) as Product;
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.warn("Backend createProduct rejected with:", errJson);
      }
    } catch (err) {
      console.warn("Live createProduct failed, falling back to local fallback:", err);
    }
  }

  // Isolated fallback creation
  await new Promise((resolve) => setTimeout(resolve, 800));
  const newProduct: Product = {
    ...backendPayload,
    id: `prod-${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return newProduct;
}

/**
 * PUT /api/products/{product_id}/inventory
 * Updates inventory availability and capacity for a product.
 */
export async function updateProductInventory(
  productId: string,
  availableQuantity: number,
  productionCapacity: number,
  unit: string = "piece"
): Promise<Product | null> {
  const isOnline = await checkBackendHealth();

  if (isOnline) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${productId}/inventory`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          available_quantity: availableQuantity,
          production_capacity: productionCapacity,
          unit: unit,
        }),
      });

      if (response.ok) {
        return (await response.json()) as Product;
      }
    } catch (err) {
      console.warn("Live updateProductInventory failed:", err);
    }
  }

  return null;
}
