"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Package,
  Layers,
  Tag,
  Eye,
  Boxes,
  Edit3,
  X,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { Product } from "../../services/types";
import { resolveBackendUrl } from "../../services/apiClient";
import { ProductDetailModal } from "./ProductDetailModal";
import { InventoryEditModal } from "./InventoryEditModal";

interface ProductListProps {
  products: Product[];
  onAddProduct: () => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onProductUpdated?: (updated: Product) => void;
  lang: Language;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onAddProduct,
  isLoading = false,
  error = null,
  onRetry,
  onProductUpdated,
  lang,
}) => {
  const t = translations[lang];

  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Derive dynamic category list from real loaded products
  const dynamicCategories = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category && p.category.trim()) {
        cats.add(p.category.trim());
      }
    });
    return ["All", ...Array.from(cats)];
  }, [products]);

  // Status filters matching backend ProductStatus enum
  const statusOptions = [
    { key: "All", label: t.allFilter },
    { key: "published", label: t.statusPublished },
    { key: "draft", label: t.statusDraft },
    { key: "archived", label: t.statusArchived },
  ];

  // Client-side search and filtering
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchesSearch =
        !term ||
        (p.title || "").toLowerCase().includes(term) ||
        (p.category || "").toLowerCase().includes(term) ||
        (p.material || "").toLowerCase().includes(term) ||
        (p.craft_type || "").toLowerCase().includes(term);

      const matchesCategory =
        selectedCategory === "All" || p.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "All" || p.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [products, searchTerm, selectedCategory, selectedStatus]);

  const handleInventorySuccess = (updated: Product) => {
    if (selectedProduct && selectedProduct.id === updated.id) {
      setSelectedProduct(updated);
    }
    onProductUpdated?.(updated);
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-craftgreen-50 text-craftgreen border border-craftgreen-200">
            {t.statusPublished}
          </span>
        );
      case "draft":
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {t.statusDraft}
          </span>
        );
      case "archived":
      default:
        return (
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
            {t.statusArchived}
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Header with title and Add Product CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-earthy-title">
            {t.myProducts}
          </h2>
          <p className="text-xs text-earthy-muted">
            {products.length}{" "}
            {lang === "hi" ? "सक्रिय उत्पाद सूची" : "active listings"}
          </p>
        </div>

        <button
          onClick={onAddProduct}
          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gradient-to-r from-terracotta to-ochre text-white font-bold text-xs shadow-sm hover:brightness-105 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>{t.addProduct}</span>
        </button>
      </div>

      {/* Search Input with Clear Button */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.searchProductsPlaceholder}
          className="w-full pl-9 pr-9 py-2.5 rounded-2xl bg-white border border-warmcream-border text-xs text-earthy-title placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-terracotta/30 shadow-xs"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm("")}
            className="absolute right-3 top-2.5 w-5 h-5 rounded-full bg-stone-100 text-stone-500 hover:text-earthy-title flex items-center justify-center transition"
            aria-label={t.clearSearch}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Category Pills (Dynamically derived from real products) */}
      {dynamicCategories.length > 1 && (
        <div className="space-y-1">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {dynamicCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-terracotta text-white shadow-xs scale-[1.02]"
                    : "bg-white border border-warmcream-border text-earthy-body hover:bg-stone-50"
                }`}
              >
                {cat === "All" ? t.allFilter : cat}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Status Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
        <span className="text-stone-400 font-semibold text-[10px] uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" />
          <span>{t.statusFilterLabel}:</span>
        </span>
        {statusOptions.map((st) => (
          <button
            key={st.key}
            onClick={() => setSelectedStatus(st.key)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
              selectedStatus === st.key
                ? "bg-earthy-title text-white shadow-xs"
                : "bg-warmcream-muted text-earthy-muted hover:bg-stone-200"
            }`}
          >
            {st.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="text-center py-2 flex items-center justify-center gap-2 text-xs text-earthy-muted">
            <div className="w-3.5 h-3.5 border-2 border-terracotta/40 border-t-terracotta rounded-full animate-spin" />
            <span>{t.loadingProducts}</span>
          </div>

          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl p-3.5 border border-warmcream-border shadow-card flex gap-3 animate-pulse"
            >
              <div className="w-20 h-20 rounded-2xl bg-stone-200 shrink-0" />
              <div className="flex-1 space-y-2 py-1">
                <div className="h-3 w-16 bg-stone-200 rounded-md" />
                <div className="h-4 w-3/4 bg-stone-200 rounded-md" />
                <div className="h-3 w-1/2 bg-stone-200 rounded-md" />
                <div className="h-4 w-20 bg-stone-200 rounded-md pt-2" />
              </div>
            </div>
          ))}
        </div>
      ) : error && products.length === 0 ? (
        /* Error State */
        <div className="p-8 text-center bg-white rounded-3xl border border-red-200 shadow-card space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-earthy-title">
            {lang === "hi" ? "उत्पाद लोड नहीं हो सके" : "Could not load products"}
          </h3>
          <p className="text-xs text-earthy-muted max-w-xs mx-auto">
            {error}
          </p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 rounded-xl bg-terracotta text-white font-bold text-xs shadow-sm hover:bg-terracotta-700 transition flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t.retryBtn}</span>
            </button>
          )}
        </div>
      ) : products.length === 0 ? (
        /* Empty State (No products added yet) */
        <div className="p-8 text-center bg-white rounded-3xl border border-warmcream-border shadow-card space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-terracotta-50 text-terracotta flex items-center justify-center mx-auto border border-terracotta-100 shadow-xs">
            <Package className="w-8 h-8" />
          </div>

          <div>
            <h3 className="font-black text-sm text-earthy-title">
              {t.noProductsTitle}
            </h3>
            <p className="text-xs text-earthy-muted mt-1 max-w-xs mx-auto leading-relaxed">
              {t.noProductsDesc}
            </p>
          </div>

          <button
            onClick={onAddProduct}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-terracotta to-ochre text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t.addProduct}</span>
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        /* Search / Filter Empty State */
        <div className="p-8 text-center bg-white rounded-3xl border border-warmcream-border shadow-card space-y-3">
          <Package className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-bold text-xs text-earthy-title">
            {t.noSearchResultsTitle}
          </h3>
          <p className="text-[11px] text-earthy-muted max-w-xs mx-auto">
            {t.noSearchResultsDesc}
          </p>
          {(searchTerm || selectedCategory !== "All" || selectedStatus !== "All") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setSelectedStatus("All");
              }}
              className="text-xs font-bold text-terracotta hover:underline"
            >
              {lang === "hi" ? "सभी फ़िल्टर साफ़ करें" : "Clear all filters"}
            </button>
          )}
        </div>
      ) : (
        /* Product List Grid */
        <div className="space-y-3">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              onClick={() => setSelectedProduct(prod)}
              className="bg-white rounded-3xl p-3.5 border border-warmcream-border shadow-card flex gap-3 hover:shadow-md transition-shadow cursor-pointer group relative"
            >
              {/* Product Thumbnail */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-warmcream-border relative">
                {prod.image_url ? (
                  <img
                    src={resolveBackendUrl(prod.image_url)}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Package className="w-7 h-7 stroke-[1.5]" />
                  </div>
                )}
              </div>

              {/* Card Body */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-warmcream-muted text-earthy-muted uppercase tracking-wide truncate max-w-[90px]">
                      {prod.category || "Craft"}
                    </span>
                    <div className="flex items-center gap-1">
                      {renderStatusBadge(prod.status)}
                    </div>
                  </div>

                  <h4 className="font-extrabold text-xs text-earthy-title truncate mt-1 group-hover:text-terracotta transition-colors">
                    {prod.title}
                  </h4>

                  <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                    {prod.material || "Handmade"}
                    {prod.craft_type ? ` • ${prod.craft_type}` : ""}
                  </p>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                  <span className="text-sm font-black text-terracotta">
                    ₹{prod.price}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-craftgreen bg-craftgreen-50 px-2 py-0.5 rounded-md border border-craftgreen-100">
                      {prod.available_quantity ?? 0} {t.inStock}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduct(prod);
                      }}
                      className="p-1 rounded-lg text-stone-400 hover:text-terracotta hover:bg-stone-100 transition"
                      title={t.editInventoryBtn}
                    >
                      <Boxes className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        onOpenInventoryEdit={() => {
          if (selectedProduct) {
            setEditingProduct(selectedProduct);
          }
        }}
        lang={lang}
      />

      {/* Inventory Quick Edit Modal */}
      {editingProduct && (
        <InventoryEditModal
          product={editingProduct}
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSuccess={handleInventorySuccess}
          lang={lang}
        />
      )}
    </div>
  );
};
