import React, { useState } from "react";
import { Sparkles, Edit3, Tag, Layers, Check, Plus, X } from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { CatalogueGenerationResponse } from "../../services/types";

interface CatalogueReviewProps {
  catalogue: CatalogueGenerationResponse;
  onChange: (updated: CatalogueGenerationResponse) => void;
  onNext: () => void;
  onBack: () => void;
  lang: Language;
}

export const CatalogueReview: React.FC<CatalogueReviewProps> = ({
  catalogue,
  onChange,
  onNext,
  onBack,
  lang,
}) => {
  const t = translations[lang];
  const [newTag, setNewTag] = useState("");

  const categories = ["Bags", "Home Decor", "Textiles", "Pottery", "Jewelry", "Wooden Crafts"];
  const craftTypes = ["Handwoven", "Clay Pottery", "Block Print", "Wood Carving", "Embroidery", "Metal Craft"];

  const handleTextChange = (field: keyof CatalogueGenerationResponse, val: string) => {
    onChange({
      ...catalogue,
      [field]: val,
    });
  };

  const handleAttributeChange = (attrKey: string, val: string) => {
    onChange({
      ...catalogue,
      attributes: {
        ...catalogue.attributes,
        [attrKey]: val,
      },
    });
  };

  const handleAddTag = () => {
    if (newTag.trim() && !catalogue.tags.includes(newTag.trim().toLowerCase())) {
      onChange({
        ...catalogue,
        tags: [...catalogue.tags, newTag.trim().toLowerCase()],
      });
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onChange({
      ...catalogue,
      tags: catalogue.tags.filter((tag) => tag !== tagToRemove),
    });
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header Notification Banner */}
      <div className="p-3 bg-gradient-to-r from-ochre-50 to-terracotta-50 border border-ochre-200 rounded-2xl flex items-start gap-2.5">
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

      {/* Product Title Field */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
            <span>{t.titleLabel}</span>
            <span className="text-[10px] text-terracotta font-semibold">(AI)</span>
          </label>
          <Edit3 className="w-3.5 h-3.5 text-stone-400" />
        </div>
        <input
          type="text"
          value={catalogue.title}
          onChange={(e) => handleTextChange("title", e.target.value)}
          className="w-full font-bold text-sm text-earthy-title p-2 rounded-xl bg-warmcream/60 border border-warmcream-border focus:ring-2 focus:ring-terracotta/30 focus:outline-none"
        />
      </div>

      {/* Description Field */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-earthy-title">
            {t.descLabel}
          </label>
          <Edit3 className="w-3.5 h-3.5 text-stone-400" />
        </div>
        <textarea
          rows={3}
          value={catalogue.description}
          onChange={(e) => handleTextChange("description", e.target.value)}
          className="w-full text-xs text-earthy-body p-2.5 rounded-xl bg-warmcream/60 border border-warmcream-border focus:ring-2 focus:ring-terracotta/30 focus:outline-none resize-none leading-relaxed"
        />
      </div>

      {/* Category Pills (Minimal typing for rural artisans) */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-2">
        <label className="text-xs font-bold text-earthy-title">
          {t.categoryLabel}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleTextChange("category", cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                catalogue.category === cat
                  ? "bg-terracotta text-white font-bold shadow-xs scale-[1.02]"
                  : "bg-warmcream-muted text-earthy-body hover:bg-stone-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Material & Craft Type */}
      <div className="grid grid-cols-2 gap-3">
        {/* Material */}
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

        {/* Craft Type */}
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
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-2">
        <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-ochre" />
          {t.attributesLabel}
        </label>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(catalogue.attributes).map(([key, val]) => (
            <div key={key} className="p-2 rounded-xl bg-warmcream/70 border border-warmcream-border">
              <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide block">
                {key}
              </span>
              <input
                type="text"
                value={val || ""}
                onChange={(e) => handleAttributeChange(key, e.target.value)}
                className="w-full font-medium text-xs text-earthy-title bg-transparent focus:outline-none border-b border-transparent focus:border-terracotta mt-0.5"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tags Chips */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card space-y-2">
        <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
          <Tag className="w-3.5 h-3.5 text-terracotta" />
          {t.tagsLabel}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {catalogue.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-terracotta-50 text-terracotta text-[11px] font-semibold border border-terracotta-200"
            >
              #{tag}
              <button
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
            onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
            className="flex-1 text-xs p-2 rounded-xl bg-warmcream/60 border border-warmcream-border focus:outline-none"
          />
          <button
            onClick={handleAddTag}
            className="px-3 py-1.5 rounded-xl bg-stone-200 text-earthy-title text-xs font-bold hover:bg-stone-300"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex gap-3">
        <button
          onClick={onBack}
          className="w-1/3 py-3.5 rounded-2xl bg-white border border-stone-300 text-earthy-title font-bold text-xs hover:bg-stone-50 active:scale-95 transition-all"
        >
          {t.back}
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-terracotta to-ochre text-white font-extrabold text-sm shadow-floating hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>{t.next}</span>
        </button>
      </div>
    </div>
  );
};

