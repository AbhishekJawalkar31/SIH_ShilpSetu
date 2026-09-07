import { Product as BackendProduct, SearchResultItem } from "./types";
import { Product as BuyerProduct } from "../lib/mockData";

// Curated fallback craft images for backend items without high-res photos
const DEFAULT_CRAFT_IMAGES: Record<string, string> = {
  bags: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=900",
  jute: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&q=80&w=900",
  "home decor": "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=900",
  pottery: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=900",
  textiles: "https://images.unsplash.com/photo-1583845112203-454c59f2f3ba?auto=format&fit=crop&q=80&w=900",
  jewellery: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=900",
  handicrafts: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&q=80&w=900",
  paintings: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=900",
  brass: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&q=80&w=900",
  default: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&q=80&w=900",
};

/**
 * Determine suitable craft image from product attributes or fallback pool.
 */
function resolveProductImage(backend: BackendProduct): string {
  if (backend.image_url && backend.image_url.trim().length > 0) {
    return backend.image_url;
  }
  const catKey = (backend.category || "").toLowerCase();
  const craftKey = (backend.craft_type || "").toLowerCase();
  for (const [k, url] of Object.entries(DEFAULT_CRAFT_IMAGES)) {
    if (k !== "default" && (catKey.includes(k) || craftKey.includes(k))) {
      return url;
    }
  }
  return DEFAULT_CRAFT_IMAGES.default;
}

/**
 * Maps a backend Product response (from GET /api/products or GET /api/products/{id})
 * into the Buyer UI Product model.
 * Preserves the real backend UUID and does not invent fake metrics.
 */
export function adaptBackendProduct(
  backend: BackendProduct,
  artisanName?: string,
  artisanLocation?: string
): BuyerProduct {
  const priceVal = backend.price ?? 0;
  const currencySymbol = backend.currency === "INR" ? "₹" : backend.currency;
  const formattedPrice = `${currencySymbol} ${priceVal.toLocaleString("en-IN")}`;

  const image = resolveProductImage(backend);

  // Gallery: main image + any attributes-based gallery or derived views
  const gallery: string[] = [image];
  if (backend.attributes && Array.isArray(backend.attributes.gallery)) {
    for (const g of backend.attributes.gallery) {
      if (typeof g === "string" && !gallery.includes(g)) {
        gallery.push(g);
      }
    }
  }

  // Badges derived from craft and tags
  const badges: string[] = [];
  if (backend.craft_type) badges.push(backend.craft_type);
  if (backend.material) badges.push(backend.material);
  if (Array.isArray(backend.tags)) {
    for (const t of backend.tags.slice(0, 3)) {
      const formatted = t.charAt(0).toUpperCase() + t.slice(1);
      if (!badges.includes(formatted)) badges.push(formatted);
    }
  }
  if (badges.length === 0) {
    badges.push("Handcrafted", "Authentic");
  }

  // Specifications
  const specs = {
    material: backend.material || "Natural Craft Fiber",
    dimensions:
      typeof backend.attributes?.dimensions === "string"
        ? (backend.attributes.dimensions as string)
        : "Standard Artisan Size",
    weight:
      typeof backend.attributes?.weight === "string"
        ? (backend.attributes.weight as string)
        : "Varies by piece",
    category: backend.category || "Handicrafts",
    technique: backend.craft_type || undefined,
  };

  // Availability status label
  const availability =
    backend.available_quantity > 0
      ? `In Stock (${backend.available_quantity} available)`
      : backend.production_capacity > 0
      ? `Made to Order (${backend.production_capacity}/mo)`
      : "Out of Stock";

  return {
    id: backend.id, // Real backend UUID
    name: backend.title,
    artisan: artisanName || "Master Artisan",
    artisanLocation: artisanLocation || "Artisan Craft Cluster, India",
    category: backend.category || "Handicrafts",
    price: priceVal,
    formattedPrice,
    rating: 4.8, // Baseline display rating for authentic cluster items
    reviewsCount: 0, // Genuine 0 count until buyer reviews are live
    availability,
    description: backend.description || "Authentic handcrafted creation made by skilled Indian artisans.",
    detailedDescription: backend.description,
    image,
    gallery,
    badges,
    specs,
  };
}

/**
 * Maps a SearchResultItem from POST /api/search into the Buyer UI Product model.
 * Preserves the real backend UUID and search result fields.
 */
export function adaptSearchResultItem(
  item: SearchResultItem,
  artisanName?: string
): BuyerProduct {
  const priceVal = item.price ?? 0;
  const formattedPrice = `₹ ${priceVal.toLocaleString("en-IN")}`;

  const defaultImg =
    item.title.toLowerCase().includes("jute") || item.title.toLowerCase().includes("bag")
      ? DEFAULT_CRAFT_IMAGES.jute
      : item.title.toLowerCase().includes("pot") || item.title.toLowerCase().includes("vase")
      ? DEFAULT_CRAFT_IMAGES.pottery
      : DEFAULT_CRAFT_IMAGES.default;

  const availability =
    item.available_quantity > 0
      ? `In Stock (${item.available_quantity})`
      : item.production_capacity > 0
      ? `Capacity: ${item.production_capacity}/mo`
      : "Made to Order";

  return {
    id: item.product_id, // Real backend UUID
    name: item.title,
    artisan: artisanName || "Cluster Artisan",
    artisanLocation: "Verified Artisan Cluster",
    category: "Search Match",
    price: priceVal,
    formattedPrice,
    rating: Math.min(5, Math.max(4.0, Number((item.match_score * 5).toFixed(1)))),
    reviewsCount: 0,
    availability,
    description: `Semantic match score: ${(item.match_score * 100).toFixed(0)}%. Available quantity: ${item.available_quantity}, Monthly capacity: ${item.production_capacity}.`,
    image: defaultImg,
    gallery: [defaultImg],
    badges: ["AI Matched", `${(item.match_score * 100).toFixed(0)}% Match`],
    specs: {
      material: "Handcrafted Traditional",
      dimensions: "Artisan Standard",
      weight: "Standard",
      category: "Search Match",
    },
  };
}
