"use client";

import React from "react";
import {
  X,
  Package,
  Layers,
  Tag,
  Boxes,
  Edit3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  Info,
} from "lucide-react";
import { Product } from "../../services/types";
import { resolveBackendUrl } from "../../services/apiClient";
import { Language, translations } from "../../lib/i18n";

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenInventoryEdit: () => void;
  lang: Language;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onOpenInventoryEdit,
  lang,
}) => {
  const t = translations[lang];

  if (!isOpen || !product) return null;

  const getStatusBadge = () => {
    switch (product.status) {
      case "published":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-craftgreen-50 text-craftgreen-800 text-[11px] font-bold border border-craftgreen-200">
            <CheckCircle2 className="w-3 h-3 text-craftgreen" />
            <span>{t.statusPublished}</span>
          </span>
        );
      case "draft":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>{t.statusDraft}</span>
          </span>
        );
      case "archived":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[11px] font-bold border border-stone-200">
            <FileText className="w-3 h-3 text-stone-400" />
            <span>{t.statusArchived}</span>
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-warmcream-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 bg-warmcream/40 shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-terracotta" />
            <span className="font-extrabold text-xs text-earthy-title">
              {t.productDetailsTitle}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white border border-stone-200 text-stone-500 hover:text-earthy-title flex items-center justify-center transition"
            aria-label={t.closeBtn}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Image banner */}
          <div className="w-full h-56 rounded-2xl overflow-hidden bg-stone-100 border border-warmcream-border relative">
            {product.image_url ? (
              <img
                src={resolveBackendUrl(product.image_url)}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-stone-400 gap-2">
                <Package className="w-12 h-12 stroke-[1.5]" />
                <span className="text-xs font-semibold text-stone-400">
                  {lang === "hi" ? "कोई छवि उपलब्ध नहीं है" : "No image available"}
                </span>
              </div>
            )}

            <div className="absolute top-2.5 right-2.5">
              {getStatusBadge()}
            </div>
          </div>

          {/* Title & Price Header */}
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-terracotta-50 text-terracotta border border-terracotta-200 uppercase tracking-wider">
                {product.category || "Craft"}
              </span>
              <span className="text-lg font-black text-terracotta">
                ₹{product.price}
              </span>
            </div>

            <h2 className="text-base font-extrabold text-earthy-title leading-snug">
              {product.title}
            </h2>

            <div className="flex items-center gap-2 text-[11px] text-stone-500 pt-0.5">
              <span>{product.material || "Handmade"}</span>
              {product.craft_type && (
                <>
                  <span>•</span>
                  <span>{product.craft_type}</span>
                </>
              )}
            </div>
          </div>

          {/* Current Inventory Box */}
          <div className="bg-gradient-to-br from-warmcream/80 to-warmcream-muted p-3.5 rounded-2xl border border-warmcream-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-earthy-title flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-terracotta" />
                <span>{t.stockAndInventory}</span>
              </span>

              <button
                type="button"
                onClick={onOpenInventoryEdit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-terracotta text-white font-bold text-[11px] shadow-xs hover:bg-terracotta-700 active:scale-95 transition"
              >
                <Edit3 className="w-3 h-3" />
                <span>{t.editInventoryBtn}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                <span className="text-[10px] text-stone-400 font-semibold block">
                  {t.availableQuantityLabel}
                </span>
                <span className="text-base font-black text-craftgreen mt-0.5 block">
                  {product.available_quantity ?? 0} {product.unit || "units"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white border border-stone-200/80">
                <span className="text-[10px] text-stone-400 font-semibold block">
                  {t.productionCapacityLabel}
                </span>
                <span className="text-base font-black text-earthy-title mt-0.5 block">
                  {product.production_capacity ?? 0}/{product.unit || "mo"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-earthy-title">
              {t.descLabel}
            </h4>
            <p className="text-xs text-earthy-body leading-relaxed whitespace-pre-line bg-stone-50/70 p-3 rounded-xl border border-stone-200/60">
              {product.description || (lang === "hi" ? "कोई विवरण नहीं दिया गया है।" : "No description provided.")}
            </p>
          </div>

          {/* Specifications / Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-earthy-title flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-ochre" />
                <span>{t.specificationsTitle}</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(product.attributes).map(([k, v]) => (
                  <div
                    key={k}
                    className="p-2 rounded-xl bg-stone-50 border border-stone-200/70"
                  >
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block truncate">
                      {k}
                    </span>
                    <span className="font-semibold text-xs text-earthy-title mt-0.5 block truncate">
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-earthy-title flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-terracotta" />
                <span>{t.tagsLabel}</span>
              </h4>

              <div className="flex flex-wrap gap-1.5">
                {product.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-terracotta-50 text-terracotta border border-terracotta-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Read-Only Disclaimer */}
          <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
            <p>{t.metadataReadOnlyNotice}</p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-white border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 active:scale-95 transition"
          >
            {t.closeBtn}
          </button>

          <button
            type="button"
            onClick={onOpenInventoryEdit}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-terracotta to-ochre text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t.editInventoryBtn}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
