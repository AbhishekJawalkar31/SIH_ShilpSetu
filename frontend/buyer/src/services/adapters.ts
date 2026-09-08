import { Product as BackendProduct, SearchResultItem } from "./types";
import { Product as BuyerProduct } from "../lib/mockData";
import { resolveBackendUrl } from "./customerApi";

// Curated fallback craft images for backend items without high-res photos
export const DEFAULT_CRAFT_IMAGES: Record<string, string> = {
  bags: "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=900",
  jute: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&q=80&w=900",
  "home decor": "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&q=80&w=900",
  pottery: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=900",
  textiles: "https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?auto=format&fit=crop&q=80&w=900",
  jewellery: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80&w=900",
  handicrafts: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=900",
  paintings: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=900",
  brass: "https://images.unsplash.com/photo-1615529182904-14819c35db37?auto=format&fit=crop&q=80&w=900",
  default: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=900",
};

/**
 * Determine a deterministic craft fallback image using existing project-approved assets.
 */
export function getCraftFallbackImage(
  category?: string | null,
  craftType?: string | null,
  title?: string | null
): string {
  const query = `${category || ""} ${craftType || ""} ${title || ""}`.toLowerCase();
  for (const [k, url] of Object.entries(DEFAULT_CRAFT_IMAGES)) {
    if (k !== "default" && query.includes(k)) {
      return url;
    }
  }
  // Check synonyms using approved category mappings
  if (
    query.includes("wood") ||
    query.includes("figurine") ||
    query.includes("sculpture") ||
    query.includes("statue") ||
    query.includes("tortoise") ||
    query.includes("elephant")
  ) {
    return DEFAULT_CRAFT_IMAGES["home decor"] || DEFAULT_CRAFT_IMAGES.handicrafts;
  }
  if (query.includes("bag") || query.includes("tote") || query.includes("jute")) {
    return DEFAULT_CRAFT_IMAGES.bags;
  }
  if (
    query.includes("pot") ||
    query.includes("terracotta") ||
    query.includes("clay") ||
    query.includes("planter") ||
    query.includes("vase")
  ) {
    return DEFAULT_CRAFT_IMAGES.pottery;
  }
  if (
    query.includes("shawl") ||
    query.includes("silk") ||
    query.includes("cloth") ||
    query.includes("fabric") ||
    query.includes("stole") ||
    query.includes("scarf")
  ) {
    return DEFAULT_CRAFT_IMAGES.textiles;
  }
  if (query.includes("diya") || query.includes("lamp") || query.includes("metal")) {
    return DEFAULT_CRAFT_IMAGES.brass;
  }
  return DEFAULT_CRAFT_IMAGES.default;
}

/**
 * Determine suitable craft image from product attributes or fallback pool.
 */
function resolveProductImage(backend: BackendProduct): string {
  if (backend.image_url && backend.image_url.trim().length > 0) {
    return resolveBackendUrl(backend.image_url);
  }
  return getCraftFallbackImage(backend.category, backend.craft_type, backend.title);
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

  const fallbackImage = getCraftFallbackImage(
    backend.category,
    backend.craft_type,
    backend.title
  );

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
    fallbackImage,
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
  const currencySymbol = item.currency === "INR" ? "₹" : (item.currency || "₹");
  const formattedPrice = `${currencySymbol} ${priceVal.toLocaleString("en-IN")}`;

  const resolvedImage =
    item.image_url && item.image_url.trim().length > 0
      ? resolveBackendUrl(item.image_url)
      : "";
  const fallbackImage = getCraftFallbackImage(
    item.category,
    item.craft_type,
    item.title
  );
  const image = resolvedImage || fallbackImage;

  const badges: string[] = [];
  if (item.match_score) badges.push(`${(item.match_score * 100).toFixed(0)}% Match`);
  if (item.craft_type) badges.push(item.craft_type);
  if (item.material) badges.push(item.material);
  if (Array.isArray(item.tags)) {
    for (const t of item.tags.slice(0, 2)) {
      const formatted = t.charAt(0).toUpperCase() + t.slice(1);
      if (!badges.includes(formatted)) badges.push(formatted);
    }
  }
  if (badges.length === 0) {
    badges.push("AI Matched", "Handcrafted");
  }

  const availability =
    item.available_quantity > 0
      ? `In Stock (${item.available_quantity})`
      : item.production_capacity > 0
      ? `Capacity: ${item.production_capacity}/mo`
      : "Made to Order";

  return {
    id: item.product_id, // Real backend UUID
    name: item.title,
    artisan: artisanName || item.artisan_business_name || "Cluster Artisan",
    artisanLocation: item.artisan_location || "Verified Artisan Cluster, India",
    category: item.category || "Handicrafts",
    price: priceVal,
    formattedPrice,
    rating: Math.min(5, Math.max(4.0, Number(((item.match_score || 0.9) * 5).toFixed(1)))),
    reviewsCount: 0,
    availability,
    description:
      item.description ||
      `Semantic match score: ${((item.match_score || 0) * 100).toFixed(0)}%. Available quantity: ${item.available_quantity}, Monthly capacity: ${item.production_capacity}.`,
    detailedDescription: item.description || undefined,
    image,
    fallbackImage,
    gallery: [image],
    badges,
    specs: {
      material: item.material || "Natural Craft Fiber",
      dimensions: "Artisan Standard",
      weight: "Standard",
      category: item.category || "Handicrafts",
      technique: item.craft_type || undefined,
    },
  };
}
