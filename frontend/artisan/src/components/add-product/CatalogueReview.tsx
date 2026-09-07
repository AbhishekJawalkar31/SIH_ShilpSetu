"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Edit3,
  Tag,
  Layers,
  Check,
  Plus,
  X,
  Package,
  Boxes,
  ArrowRight,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { CatalogueGenerationResponse, InventoryData } from "../../services/types";
import { resolveBackendUrl } from "../../services/apiClient";

interface CatalogueReviewProps {
  catalogue: CatalogueGenerationResponse;
  inventory: InventoryData;
  imagePreview?: string | null;
  onChangeCatalogue: (updated: CatalogueGenerationResponse) => void;
  onChangeInventory: (updated: InventoryData) => void;
  onNext: () => void;
  onBack: () => void;
  lang: Language;
}

export const CatalogueReview: React.FC<CatalogueReviewProps> = ({
  catalogue,
  inventory,
  imagePreview,
  onChangeCatalogue,
  onChangeInventory,
  onNext,
  onBack,
  lang,
}) => {
  const t = translations[lang];
  const [newTag, setNewTag] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const categories = [
    "Home Decor",
    "Textiles",
    "Bags",
    "Pottery",
    "Jewelry",
    "Wooden Crafts",
    "Brass & Metal",
    "Painting",
  ];

  const units = ["piece", "set", "meter", "pair", "kg"];

  const handleTextChange = (
    field: keyof CatalogueGenerationResponse,
    val: any
  ) => {
    onChangeCatalogue({
      ...catalogue,
      [field]: val,
    });
  };

  const handleAttributeChange = (attrKey: string, val: string) => {
    onChangeCatalogue({
      ...catalogue,
      attributes: {
        ...catalogue.attributes,
        [attrKey]: val,
      },
    });
  };

  const handleAddTag = () => {
    const clean = newTag.trim().toLowerCase();
    if (clean && !catalogue.tags.includes(clean)) {
      onChangeCatalogue({
        ...catalogue,
        tags: [...catalogue.tags, clean],
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChangeCatalogue({
      ...catalogue,
      tags: catalogue.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  const handleValidateAndNext = () => {
    if (!catalogue.title || !catalogue.title.trim()) {
      setFormError(
        lang === "hi"
          ? "कृपया उत्पाद का शीर्षक दर्ज करें।"
          : "Please enter a product title."
      );
      return;
    }
    if (!catalogue.description || !catalogue.description.trim()) {
      setFormError(
        lang === "hi"
          ? "कृपया उत्पाद का विवरण दर्ज करें।"
          : "Please enter a product description."
      );
      return;
    }
    setFormError(null);
    onNext();
  };

  return (
    <div className="p-4 space-y-4">
      {/* Top Banner */}
      <div className="p-3.5 bg-gradient-to-r from-ochre-50 to-terracotta-50 border border-ochre-200 rounded-2xl flex items-start gap-2.5 shadow-xs">
        <Sparkles className="w-4 h-4 text-terracotta shrink-0 mt-0.5" />
        <div>
          <h3 className="text-xs font-bold text-earthy-title leading-tight">
            {t.reviewTitle}
          </h3>
          <p className="text-[11px] text-earthy-body mt-0.5">
            {t.reviewSubtitle}
          </p>
        </div>
      </div>

      {formError && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs animate-in fade-in">
          {formError}
        </div>
      )}

      {/* Craft Photo Thumbnail Preview */}
      {imagePreview && (
        <div className="bg-white p-3 rounded-2xl border border-warmcream-border shadow-card flex items-center gap-3">
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-warmcream-border">
            <img
              src={resolveBackendUrl(imagePreview)}
              alt="Craft Thumbnail"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-bold text-terracotta uppercase tracking-wider block">
              Craft Photograph
            </span>
            <p className="text-xs font-bold text-earthy-title truncate mt-0.5">
              {catalogue.title || "Untitled Craft"}
            </p>
            <p className="text-[11px] text-earthy-muted">
              {catalogue.material} • {catalogue.craft_type}
            </p>
          </div>
        </div>
      )}

      {/* Product Title Field */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
            <span>{t.titleLabel} *</span>
          </label>
          <Edit3 className="w-3.5 h-3.5 text-stone-400" />
        </div>
        <input
          type="text"
          required
          value={catalogue.title}
          onChange={(e) => handleTextChange("title", e.target.value)}
          placeholder="e.g. Handcrafted Terracotta Clay Diya Set"
          className="w-full font-bold text-sm text-earthy-title p-2.5 rounded-xl bg-warmcream/60 border border-warmcream-border focus:ring-2 focus:ring-terracotta/30 focus:outline-none"
        />
      </div>

      {/* Description Field */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-earthy-title">
            {t.descLabel} *
          </label>
          <Edit3 className="w-3.5 h-3.5 text-stone-400" />
        </div>
        <textarea
          rows={3}
          required
          value={catalogue.description}
          onChange={(e) => handleTextChange("description", e.target.value)}
          placeholder="Describe your craft, heritage, and usage..."
          className="w-full text-xs text-earthy-body p-2.5 rounded-xl bg-warmcream/60 border border-warmcream-border focus:ring-2 focus:ring-terracotta/30 focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Category Selection */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-2">
        <label className="text-xs font-bold text-earthy-title">
          {t.categoryLabel}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => handleTextChange("category", cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                catalogue.category === cat
                  ? "bg-terracotta text-white shadow-xs scale-[1.02]"
                  : "bg-warmcream-muted text-earthy-body hover:bg-stone-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={catalogue.category}
          onChange={(e) => handleTextChange("category", e.target.value)}
          placeholder="Or type custom category..."
          className="w-full text-xs p-2 rounded-xl bg-warmcream/40 border border-warmcream-border focus:outline-none mt-1"
        />
      </div>

      {/* Material & Craft Type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-3 rounded-2xl border border-warmcream-border shadow-card space-y-1">
          <label className="text-[11px] font-bold text-earthy-title">
            {t.materialLabel}
          </label>
          <input
            type="text"
            value={catalogue.material}
            onChange={(e) => handleTextChange("material", e.target.value)}
            className="w-full text-xs font-semibold text-earthy-title p-2 rounded-xl bg-warmcream/60 border border-warmcream-border focus:outline-none focus:ring-1 focus:ring-terracotta"
          />
        </div>

        <div className="bg-white p-3 rounded-2xl border border-warmcream-border shadow-card space-y-1">
          <label className="text-[11px] font-bold text-earthy-title">
            {t.craftTypeLabel}
          </label>
          <input
            type="text"
            value={catalogue.craft_type}
            onChange={(e) => handleTextChange("craft_type", e.target.value)}
            className="w-full text-xs font-semibold text-earthy-title p-2 rounded-xl bg-warmcream/60 border border-warmcream-border focus:outline-none focus:ring-1 focus:ring-terracotta"
          />
        </div>
      </div>

      {/* Specifications / Attributes */}
      {catalogue.attributes && Object.keys(catalogue.attributes).length > 0 && (
        <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-2">
          <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-ochre" />
            <span>{t.attributesLabel}</span>
          </label>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(catalogue.attributes).map(([key, val]) => (
              <div
                key={key}
                className="p-2 rounded-xl bg-warmcream/70 border border-warmcream-border"
              >
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block truncate">
                  {key}
                </span>
                <input
                  type="text"
                  value={val || ""}
                  onChange={(e) => handleAttributeChange(key, e.target.value)}
                  className="w-full font-semibold text-xs text-earthy-title bg-transparent focus:outline-none border-b border-transparent focus:border-terracotta mt-0.5"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tags Chips */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-2">
        <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-terracotta" />
          <span>{t.tagsLabel}</span>
        </label>
        <div className="flex flex-wrap gap-1.5">
          {catalogue.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-terracotta-50 text-terracotta text-[11px] font-semibold border border-terracotta-200"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-red-700"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            placeholder={lang === "hi" ? "नया टैग लिखें..." : "Add a tag..."}
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
            className="flex-1 text-xs p-2 rounded-xl bg-warmcream/60 border border-warmcream-border focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddTag}
            className="px-3 py-1.5 rounded-xl bg-stone-200 text-earthy-title text-xs font-bold hover:bg-stone-300 active:scale-95"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* INVENTORY & PRODUCTION CAPACITY SECTION */}
      <div className="bg-white p-4 rounded-3xl border border-warmcream-border shadow-card space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-earthy-title flex items-center gap-1.5">
          <Boxes className="w-4 h-4 text-terracotta" />
          <span>{t.inventoryTitle}</span>
        </h4>

        <div className="grid grid-cols-2 gap-3 text-xs">
          {/* Available Quantity */}
          <div>
            <label className="block text-[11px] font-semibold text-earthy-title mb-1">
              {t.availableQuantityLabel}
            </label>
            <input
              type="number"
              min="0"
              value={inventory.available_quantity}
              onChange={(e) =>
                onChangeInventory({
                  ...inventory,
                  available_quantity: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              className="w-full p-2.5 rounded-xl bg-warmcream/60 border border-warmcream-border font-bold text-sm text-earthy-title focus:outline-none focus:ring-1 focus:ring-terracotta"
            />
          </div>

          {/* Production Capacity */}
          <div>
            <label className="block text-[11px] font-semibold text-earthy-title mb-1">
              {t.productionCapacityLabel}
            </label>
            <input
              type="number"
              min="0"
              value={inventory.production_capacity}
              onChange={(e) =>
                onChangeInventory({
                  ...inventory,
                  production_capacity: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
              className="w-full p-2.5 rounded-xl bg-warmcream/60 border border-warmcream-border font-bold text-sm text-earthy-title focus:outline-none focus:ring-1 focus:ring-terracotta"
            />
          </div>
        </div>

        {/* Unit Selector */}
        <div>
          <label className="block text-[11px] font-semibold text-earthy-title mb-1">
            {t.unitLabel}
          </label>
          <div className="flex gap-1.5 flex-wrap">
            {units.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() =>
                  onChangeInventory({
                    ...inventory,
                    unit: u,
                  })
                }
                className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                  inventory.unit === u
                    ? "bg-terracotta text-white shadow-xs"
                    : "bg-warmcream-muted text-earthy-body hover:bg-stone-200"
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="pt-2 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-1/3 py-3.5 rounded-2xl bg-white border border-stone-300 text-earthy-title font-bold text-xs hover:bg-stone-50 active:scale-95 transition"
        >
          {t.back}
        </button>
        <button
          type="button"
          onClick={handleValidateAndNext}
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-terracotta to-ochre text-white font-black text-sm shadow-floating hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-2"
        >
          <span>{t.next}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
