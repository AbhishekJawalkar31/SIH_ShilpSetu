"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getProduct, getSeller, resolveBackendUrl, ApiError } from "@/services/customerApi";
import { adaptBackendProduct } from "@/services/adapters";
import { Product } from "@/lib/mockData";
import { ProductImage } from "@/components/ProductImage";
import {
  Check,
  Heart,
  MapPin,
  Minus,
  ArrowLeft,
  Plus,
  ShoppingBag,
  Sparkles,
  Star,
} from "lucide-react";
import Link from "next/link";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) return;
      setIsLoading(true);
      setError(null);

      try {
        const backendProduct = await getProduct(productId);
        let artisanName = "Master Seller / विक्रेता";
        let artisanLoc = "Artisan Cluster, India";

        if (backendProduct.artisan_id) {
          try {
            const seller = await getSeller(backendProduct.artisan_id);
            artisanName = seller.business_name || seller.name || artisanName;
            artisanLoc = seller.location || [seller.city, seller.state].filter(Boolean).join(", ") || artisanLoc;
          } catch {
            // Keep default seller label
          }
        }

        const adapted = adaptBackendProduct(backendProduct, artisanName, artisanLoc);
        setProduct(adapted);
      } catch (err: unknown) {
        const msg =
          err instanceof ApiError
            ? err.message
            : "Product not found or currently unavailable.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-3 border-forest border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-ink/70">Loading authentic craft details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-line text-center shadow-lg space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-100 text-red-600 grid place-items-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-ink">Product Unavailable</h2>
          <p className="text-xs text-ink/70 leading-relaxed">
            {error || "The requested craft item could not be retrieved from the ShilpSetu catalogue."}
          </p>
          <button
            onClick={() => router.push("/buyer")}
            className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 text-xs font-bold text-white hover:bg-forest-dark transition"
          >
            <ArrowLeft className="h-4 w-4" /> Return to Marketplace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-ink flex flex-col selection:bg-terracotta selection:text-white">
      {/* Top Breadcrumb Nav */}
      <div className="mx-auto max-w-7xl w-full px-4 pt-6 sm:px-6 lg:px-8">
        <Link
          href="/buyer"
          className="inline-flex items-center gap-2 text-xs font-bold text-forest hover:text-terracotta transition"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace / बाज़ार
        </Link>
      </div>

      <main className="mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 bg-white p-6 sm:p-10 rounded-3xl border border-line shadow-lg">
          {/* Gallery */}
          <div className="flex flex-col-reverse gap-4 sm:flex-row items-center sm:items-start">
            <div className="flex sm:flex-col gap-3 justify-center">
              {product.gallery.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveGalleryIndex(idx)}
                  className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 transition ${
                    activeGalleryIndex === idx
                      ? "border-terracotta ring-2 ring-terracotta/20 scale-105"
                      : "border-line opacity-75"
                  }`}
                >
                  <ProductImage
                    src={img}
                    fallbackSrc={product.fallbackImage}
                    category={product.category}
                    alt={`Thumbnail ${idx + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            <div className="relative flex-1 overflow-hidden rounded-3xl bg-paper aspect-square w-full shadow-xs">
              <ProductImage
                src={product.gallery[activeGalleryIndex] || product.image}
                fallbackSrc={product.fallbackImage}
                category={product.category}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-terracotta/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-terracotta">
                  {product.category}
                </span>
                <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  {product.rating} ({product.reviewsCount} reviews)
                </span>
              </div>

              <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-forest tracking-tight">
                {product.name}
              </h1>

              <div className="text-3xl sm:text-4xl font-bold text-forest">
                {product.formattedPrice}
              </div>

              <p className="text-sm sm:text-base leading-relaxed text-ink/75">
                {product.description}
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {product.badges.map((b) => (
                  <span
                    key={b}
                    className="flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold text-ink border border-line/60"
                  >
                    <Check className="h-3.5 w-3.5 text-terracotta stroke-3" /> {b}
                  </span>
                ))}
              </div>
            </div>

            {/* Specifications */}
            <div className="space-y-6 pt-4 border-t border-line">
              <div className="rounded-2xl border border-line bg-paper/40 p-4 space-y-2 text-xs">
                <h4 className="font-bold text-ink uppercase tracking-wider mb-2">
                  Product Details / उत्पाद विवरण
                </h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <div>
                    <span className="text-ink/60">Material:</span>
                    <span className="font-bold text-ink ml-1">{product.specs.material}</span>
                  </div>
                  <div>
                    <span className="text-ink/60">Dimensions:</span>
                    <span className="font-bold text-ink ml-1">{product.specs.dimensions}</span>
                  </div>
                  <div>
                    <span className="text-ink/60">Weight:</span>
                    <span className="font-bold text-ink ml-1">{product.specs.weight}</span>
                  </div>
                  <div>
                    <span className="text-ink/60">Category:</span>
                    <span className="font-bold text-ink ml-1">{product.specs.category}</span>
                  </div>
                </div>
              </div>

              {/* Seller attribution card */}
              <div className="rounded-2xl border border-line bg-paper/60 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-terracotta">
                    About the Seller / विक्रेता
                  </p>
                  <h4 className="font-serif-title font-bold text-base text-ink">{product.artisan}</h4>
                  <p className="text-xs text-ink/65 flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-terracotta" /> {product.artisanLocation}
                  </p>
                </div>
              </div>

              {/* Primary Commercial Action: Request Bulk Quote */}
              <div className="space-y-2 pt-2">
                <Link
                  href={`/buyer/custom-request?product=${encodeURIComponent(product.id)}&category=${encodeURIComponent(product.category)}&product_name=${encodeURIComponent(product.name)}`}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-forest py-3.5 px-6 text-sm font-bold text-white shadow-lg shadow-forest/20 hover:bg-forest-dark hover:scale-[1.01] transition text-center"
                >
                  <Sparkles className="h-4 w-4 text-terracotta" />
                  <span>Request Bulk Quote / कोटेशन अनुरोध</span>
                </Link>
                <p className="text-[11px] text-center text-ink/60">
                  Direct artisan cluster fulfillment &bull; Customization & bulk capacities available
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

