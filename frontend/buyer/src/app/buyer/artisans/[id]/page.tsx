"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getSeller, getSellerProducts, resolveBackendUrl, ApiError } from "@/services/customerApi";
import { adaptBackendProduct } from "@/services/adapters";
import { Product } from "@/lib/mockData";
import { ProductImage } from "@/components/ProductImage";
import {
  MapPin,
  Sparkles,
  ArrowLeft,
  Star,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface SellerProfileData {
  id: string;
  name: string;
  craft: string;
  location: string;
  description: string;
  image: string;
  bannerImage: string;
  impactBadges: string[];
}

export default function SellerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const sellerId = params?.id as string;

  const [seller, setSeller] = useState<SellerProfileData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSeller() {
      if (!sellerId) return;
      setIsLoading(true);
      setError(null);

      try {
        const [profile, backendProducts] = await Promise.all([
          getSeller(sellerId),
          getSellerProducts(sellerId).catch(() => []),
        ]);

        const sellerName = profile.business_name || profile.name || "Master Seller / विक्रेता";
        const sellerLoc =
          profile.location ||
          [profile.city, profile.state, profile.country].filter(Boolean).join(", ") ||
          "India";

        setSeller({
          id: profile.id,
          name: sellerName,
          craft: profile.craft_type || "Traditional Craft",
          location: sellerLoc,
          description: profile.description || "Master craftsperson preserving traditional heritage through ShilpSetu.",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
          bannerImage: "https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=1200&q=85",
          impactBadges: ["Direct Fair Trade", profile.craft_type || "Heritage Craft", "Registered Seller / पंजीकृत विक्रेता"],
        });

        const adapted = backendProducts.map((p) => adaptBackendProduct(p, sellerName, sellerLoc));
        setProducts(adapted);
      } catch (err: unknown) {
        const msg =
          err instanceof ApiError ? err.message : "Seller profile could not be loaded.";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }

    loadSeller();
  }, [sellerId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="h-10 w-10 border-3 border-forest border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-ink/70">Loading seller profile...</p>
        </div>
      </div>
    );
  }

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-line text-center shadow-lg space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-100 text-red-600 grid place-items-center mx-auto text-xl font-bold">
            !
          </div>
          <h2 className="font-serif-title text-2xl font-bold text-ink">Seller Profile Not Found</h2>
          <p className="text-xs text-ink/70 leading-relaxed">
            {error || "The requested seller profile could not be found."}
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
        {/* Banner Cover */}
        <div className="relative overflow-hidden rounded-3xl bg-forest h-48 sm:h-64 shadow-md">
          <img
            src={seller.bannerImage}
            alt="Cover"
            className="h-full w-full object-cover opacity-60"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&q=80&w=1200";
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent p-6 flex items-end">
            <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-white">
              Seller Profile / विक्रेता प्रोफ़ाइल
            </h1>
          </div>
        </div>

        {/* Profile Info Header */}
        <div className="relative z-10 -mt-12 mx-4 sm:mx-8 rounded-3xl bg-white p-6 shadow-xl border border-line flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <img
              src={seller.image}
              alt={seller.name}
              className="h-24 w-24 rounded-full object-cover ring-4 ring-terracotta shadow-md"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400";
              }}
            />
            <div>
              <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-ink">
                {seller.name}
              </h2>
              <p className="text-sm font-bold text-terracotta">{seller.craft}</p>
              <p className="text-xs text-ink/60 flex items-center justify-center sm:justify-start gap-1 mt-1">
                <MapPin className="h-3.5 w-3.5 text-forest" /> {seller.location}
              </p>
            </div>
          </div>
        </div>

        {/* Story and Products */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-3xl border border-line">
            <h3 className="font-serif-title text-2xl font-bold text-ink">
              About the Seller / विक्रेता का परिचय
            </h3>
            <p className="text-sm sm:text-base leading-relaxed text-ink/80">
              {seller.description}
            </p>

            {/* Impact Badges */}
            <div className="pt-4 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-4">
              {seller.impactBadges.map((badge, idx) => (
                <div key={idx} className="rounded-2xl bg-paper p-4 text-center">
                  <Sparkles className="h-5 w-5 mx-auto text-terracotta mb-1" />
                  <p className="text-xs font-bold text-ink">{badge}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Seller's Products */}
          <div className="space-y-4">
            <h3 className="font-serif-title text-2xl font-bold text-ink">
              Creations ({products.length})
            </h3>
            {products.length === 0 ? (
              <p className="text-xs text-ink/60 bg-white p-6 rounded-2xl border border-line">
                No active published products listed by this seller yet.
              </p>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <Link
                    key={product.id}
                    href={`/buyer/products/${product.id}`}
                    className="rounded-2xl border border-line bg-white p-3 flex items-center gap-4 hover:shadow-md transition group"
                  >
                    <ProductImage
                      src={product.image}
                      fallbackSrc={product.fallbackImage}
                      category={product.category}
                      alt={product.name}
                      className="h-16 w-16 rounded-xl object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-ink group-hover:text-terracotta transition truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs font-bold text-forest">{product.formattedPrice}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-ink/40 group-hover:text-forest transition" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

