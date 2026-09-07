"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Info,
  CheckCircle2,
  Minus,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Send,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { CatalogueGenerationResponse } from "../../services/types";

interface PriceRecommenderProps {
  catalogue: CatalogueGenerationResponse;
  price: number;
  onPriceChange: (newPrice: number) => void;
  onPublish: () => void;
  onBack: () => void;
  isPublishing: boolean;
  publishError?: string | null;
  lang: Language;
}

export const PriceRecommender: React.FC<PriceRecommenderProps> = ({
  catalogue,
  price,
  onPriceChange,
  onPublish,
  onBack,
  isPublishing,
  publishError,
  lang,
}) => {
  const t = translations[lang];
  const [showTooltip, setShowTooltip] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const minPrice = catalogue.recommended_price_min || 0;
  const maxPrice = catalogue.recommended_price_max || 0;
  const hasAiRecommendation = minPrice > 0 && maxPrice > 0;

  // Derive dynamic quick choice chips from real backend recommendation
  const quickChips = React.useMemo(() => {
    if (!hasAiRecommendation) {
      return [250, 500, 750, 1000].map((v) => ({ label: `₹${v}`, val: v }));
    }
    const mid = Math.round((minPrice + maxPrice) / 2);
    const chips = [
      { label: `₹${minPrice}`, val: minPrice },
      { label: `₹${mid}`, val: mid },
      { label: `₹${maxPrice}`, val: maxPrice },
    ];
    // Add slightly above max as premium craft choice
    const premium = Math.round(maxPrice * 1.15);
    chips.push({ label: `₹${premium}`, val: premium });
    return chips;
  }, [minPrice, maxPrice, hasAiRecommendation]);

  // Stepper helpers (+/- 50 rupees)
  const increment = (step: number = 50) => {
    onPriceChange(Math.max(1, price + step));
    setValidationError(null);
  };

  const decrement = (step: number = 50) => {
    if (price - step >= 1) {
      onPriceChange(price - step);
    } else {
      onPriceChange(1);
    }
    setValidationError(null);
  };

  const handlePublishClick = () => {
    if (!price || price <= 0) {
      setValidationError(t.invalidPriceError);
      return;
    }
    setValidationError(null);
    onPublish();
  };

  // Price match assessment
  const isWithinRecommended =
    hasAiRecommendation && price >= minPrice && price <= maxPrice;

  return (
    <div className="p-4 space-y-4">
      {/* Product Summary Header Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card flex items-center justify-between">
        <div className="flex-1 pr-3">
          <span className="text-[10px] font-bold text-terracotta uppercase tracking-wider block">
            {catalogue.category || "Craft"} • {catalogue.craft_type || "Handmade"}
          </span>
          <h3 className="text-sm font-extrabold text-earthy-title mt-0.5 leading-snug line-clamp-1">
            {catalogue.title}
          </h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-terracotta-50 border border-terracotta-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-terracotta" />
        </div>
      </div>

      {/* Errors */}
      {(validationError || publishError) && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <p className="leading-snug">{validationError || publishError}</p>
        </div>
      )}

      {/* AI Recommended Price Card */}
      {hasAiRecommendation ? (
        <div className="bg-white p-4 rounded-3xl border border-warmcream-border shadow-card space-y-3 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-earthy-title">
                {t.recommendedPrice}
              </span>
              <button
                type="button"
                onClick={() => setShowTooltip(!showTooltip)}
                className="text-stone-400 hover:text-earthy-title p-0.5"
                aria-label="Price info"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-craftgreen-50 text-craftgreen-700 font-bold text-xs border border-craftgreen-200">
              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
              {t.goodMatch}
            </span>
          </div>

          {showTooltip && (
            <div className="p-2.5 bg-stone-50 rounded-xl text-[11px] text-earthy-body border border-stone-200 animate-in fade-in">
              {lang === "hi"
                ? "यह मूल्य आपकी हस्तशिल्प सामग्री, बुनाई के घंटे और देश भर के बाज़ार मांग डेटा पर आधारित है।"
                : "This fair price is calculated using comparable products, material costs, craftsmanship hours, and market demand."}
            </div>
          )}

          <div className="py-2">
            <div className="text-2xl font-black text-earthy-title tracking-tight">
              ₹{minPrice} – ₹{maxPrice}
            </div>
            <p className="text-[11px] text-stone-500 font-medium mt-1">
              {t.priceBasis}
            </p>
          </div>

          {/* Visual Price Range Bar */}
          <div className="pt-1">
            <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden relative">
              <div className="absolute left-[20%] right-[20%] top-0 bottom-0 bg-craftgreen-500 rounded-full" />
            </div>
            <div className="flex justify-between text-[10px] text-stone-400 mt-1 font-medium">
              <span>
                ₹{minPrice} ({t.suggestedMin})
              </span>
              <span>
                ₹{maxPrice} ({t.suggestedMax})
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Manual Pricing Banner when AI pricing is skipped */
        <div className="bg-white p-4 rounded-3xl border border-warmcream-border shadow-card space-y-2">
          <span className="text-xs font-bold text-earthy-title flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-terracotta" />
            <span>{t.priceTitle}</span>
          </span>
          <p className="text-xs text-earthy-muted">
            {lang === "hi"
              ? "आप अपनी शिल्प कला के अनुसार कोई भी उचित बिक्री मूल्य तय कर सकते हैं।"
              : "Set a fair price that reflects your craft quality, materials, and time."}
          </p>
        </div>
      )}

      {/* Seller's Final Price Selection */}
      <div className="bg-white p-4 rounded-3xl border-2 border-terracotta/40 shadow-card space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
            <span>{t.yourPriceLabel} *</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ochre-50 text-ochre font-bold">
              {lang === "hi" ? "आपका निर्णय" : "Your Decision"}
            </span>
          </label>
        </div>

        {/* Big Number Touch Stepper */}
        <div className="flex items-center justify-between gap-3 py-2">
          <button
            type="button"
            onClick={() => decrement(50)}
            className="w-12 h-12 rounded-2xl bg-warmcream-muted text-earthy-title flex items-center justify-center font-bold text-lg hover:bg-stone-200 active:scale-95 transition-all shadow-xs border border-warmcream-border"
            aria-label="Decrease price by 50"
          >
            <Minus className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="flex-1 text-center">
            <div className="flex items-center justify-center text-3xl font-extrabold text-terracotta tracking-tight">
              <span className="text-xl mr-1 text-earthy-muted">₹</span>
              <input
                type="number"
                min="1"
                value={price || ""}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  onPriceChange(val);
                  setValidationError(null);
                }}
                className="w-32 text-center bg-transparent border-b-2 border-terracotta/30 focus:border-terracotta focus:outline-none font-black"
              />
            </div>

            {hasAiRecommendation && (
              <p className="text-[11px] text-stone-400 mt-1">
                {isWithinRecommended ? (
                  <span className="text-craftgreen font-semibold">
                    ✓ {lang === "hi" ? "उचित बाज़ार सीमा में है" : "Within fair market recommendation"}
                  </span>
                ) : price < minPrice ? (
                  <span className="text-ochre font-semibold">
                    ⚠️ {lang === "hi" ? "सुझाव से थोड़ा कम है" : "Below recommended range"}
                  </span>
                ) : (
                  <span className="text-blue-600 font-semibold">
                    💎 {lang === "hi" ? "प्रीमियम शिल्प मूल्य" : "Premium craft pricing"}
                  </span>
                )}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => increment(50)}
            className="w-12 h-12 rounded-2xl bg-warmcream-muted text-earthy-title flex items-center justify-center font-bold text-lg hover:bg-stone-200 active:scale-95 transition-all shadow-xs border border-warmcream-border"
            aria-label="Increase price by 50"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Dynamic Quick Increment Chips */}
        <div className="flex justify-center gap-2 pt-1 border-t border-stone-100 flex-wrap">
          {quickChips.map((chip) => (
            <button
              key={chip.val}
              type="button"
              onClick={() => {
                onPriceChange(chip.val);
                setValidationError(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                price === chip.val
                  ? "bg-terracotta text-white shadow-xs scale-105"
                  : "bg-warmcream/80 text-stone-600 hover:bg-stone-200 border border-warmcream-border"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Artisan Control Reassurance Note */}
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-snug">
        <p className="text-[11px]">{t.priceControlNote}</p>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isPublishing}
          className="w-1/3 py-3.5 rounded-2xl bg-white border border-stone-300 text-earthy-title font-bold text-xs hover:bg-stone-50 active:scale-95 transition disabled:opacity-60"
        >
          {t.back}
        </button>

        <button
          type="button"
          onClick={handlePublishClick}
          disabled={isPublishing}
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-terracotta to-[#9A3815] text-white font-black text-sm shadow-floating hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPublishing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t.publishing}</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>{t.publishBtn}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
