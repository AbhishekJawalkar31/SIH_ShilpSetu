import React, { useState } from "react";
import {
  Sparkles,
  Info,
  CheckCircle2,
  Minus,
  Plus,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { CatalogueGenerationResponse } from "../../services/types";

interface PriceRecommenderProps {
  catalogue: CatalogueGenerationResponse;
  price: number;
  onPriceChange: (newPrice: number) => void;
  onNext: () => void;
  onBack: () => void;
  lang: Language;
}

export const PriceRecommender: React.FC<PriceRecommenderProps> = ({
  catalogue,
  price,
  onPriceChange,
  onNext,
  onBack,
  lang,
}) => {
  const t = translations[lang];
  const [showTooltip, setShowTooltip] = useState(false);

  // Stepper helpers (+/- 50 rupees)
  const increment = (step: number = 50) => {
    onPriceChange(price + step);
  };

  const decrement = (step: number = 50) => {
    if (price - step >= 100) {
      onPriceChange(price - step);
    }
  };

  // Price match assessment
  const isWithinRecommended =
    price >= catalogue.recommended_price_min &&
    price <= catalogue.recommended_price_max;

  return (
    <div className="p-4 space-y-4">
      {/* Product Summary Header Card */}
      <div className="bg-white p-3.5 rounded-2xl border border-warmcream-border shadow-card flex items-center justify-between">
        <div className="flex-1 pr-3">
          <span className="text-[10px] font-bold text-terracotta uppercase tracking-wider block">
            {catalogue.category} • {catalogue.craft_type}
          </span>
          <h3 className="text-sm font-extrabold text-earthy-title mt-0.5 leading-snug line-clamp-1">
            {catalogue.title}
          </h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-terracotta-50 border border-terracotta-100 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-terracotta" />
        </div>
      </div>

      {/* AI Recommended Price Card (Matches Screenshot 2) */}
      <div className="bg-white p-4 rounded-3xl border border-warmcream-border shadow-card space-y-3 relative overflow-hidden">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-earthy-title">
              {t.recommendedPrice}
            </span>
            <button
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-stone-400 hover:text-earthy-title p-0.5"
              aria-label="Price info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* "Good Match" Badge (matching screenshot 2) */}
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-craftgreen-50 text-craftgreen font-bold text-xs border border-craftgreen-200">
            <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
            {t.goodMatch}
          </span>
        </div>

        {/* Info Tooltip Popup */}
        {showTooltip && (
          <div className="p-2.5 bg-stone-50 rounded-xl text-[11px] text-earthy-body border border-stone-200 animate-in fade-in">
            {lang === "hi"
              ? "यह मूल्य आपकी हस्तशिल्प सामग्री, बुनाई के घंटे और देश भर के बाज़ार मांग डेटा पर आधारित है।"
              : "This fair price is calculated using comparable products, material costs, craftsmanship hours, and market demand."}
          </div>
        )}

        {/* Price Range Display */}
        <div className="py-2">
          <div className="text-2xl font-black text-earthy-title tracking-tight">
            ₹{catalogue.recommended_price_min} – ₹{catalogue.recommended_price_max}
          </div>
          <p className="text-[11px] text-stone-500 font-medium mt-1">
            {t.priceBasis}
          </p>
        </div>

        {/* Visual Price Bar */}
        <div className="pt-1">
          <div className="h-2 w-full bg-stone-100 rounded-full overflow-hidden relative">
            <div className="absolute left-[20%] right-[20%] top-0 bottom-0 bg-craftgreen-400/80 rounded-full" />
          </div>
          <div className="flex justify-between text-[10px] text-stone-400 mt-1 font-medium">
            <span>₹{catalogue.recommended_price_min} ({t.suggestedMin})</span>
            <span>₹{catalogue.recommended_price_max} ({t.suggestedMax})</span>
          </div>
        </div>
      </div>

      {/* Artisan's Final Price Selection (Large Touch Controls) */}
      <div className="bg-white p-4 rounded-3xl border-2 border-terracotta/40 shadow-card space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-earthy-title flex items-center gap-1">
            <span>{t.yourPriceLabel}</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-ochre-50 text-ochre font-bold">
              {lang === "hi" ? "आपका निर्णय" : "Your Decision"}
            </span>
          </label>
        </div>

        {/* Big Number Touch Stepper */}
        <div className="flex items-center justify-between gap-3 py-2">
          <button
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
                value={price}
                onChange={(e) => onPriceChange(Number(e.target.value) || 0)}
                className="w-32 text-center bg-transparent border-b-2 border-terracotta/30 focus:border-terracotta focus:outline-none font-black"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">
              {isWithinRecommended ? (
                <span className="text-craftgreen font-semibold">
                  ✓ {lang === "hi" ? "उचित बाज़ार सीमा में है" : "Within fair market recommendation"}
                </span>
              ) : price < catalogue.recommended_price_min ? (
                <span className="text-ochre font-semibold">
                  ⚠️ {lang === "hi" ? "सुझाव से थोड़ा कम है" : "Below recommended range"}
                </span>
              ) : (
                <span className="text-blue-600 font-semibold">
                  💎 {lang === "hi" ? "प्रीमियम शिल्प मूल्य" : "Premium craft pricing"}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => increment(50)}
            className="w-12 h-12 rounded-2xl bg-warmcream-muted text-earthy-title flex items-center justify-center font-bold text-lg hover:bg-stone-200 active:scale-95 transition-all shadow-xs border border-warmcream-border"
            aria-label="Increase price by 50"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Quick Increment Chips for Rural Ease */}
        <div className="flex justify-center gap-2 pt-1 border-t border-stone-100">
          {[
            { label: "₹699", val: 699 },
            { label: "₹750", val: 750 },
            { label: "₹799", val: 799 },
            { label: "₹850", val: 850 },
          ].map((chip) => (
            <button
              key={chip.val}
              onClick={() => onPriceChange(chip.val)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                price === chip.val
                  ? "bg-terracotta text-white shadow-xs"
                  : "bg-warmcream/80 text-stone-600 hover:bg-stone-200 border border-warmcream-border"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mandatory Artisan Control Reassurance Note */}
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex items-start gap-2 text-xs text-stone-600">
        <ShieldCheck className="w-4 h-4 text-craftgreen mt-0.5 shrink-0" />
        <p className="leading-snug text-[11px]">
          {t.priceControlNote}
        </p>
      </div>

      {/* Actions */}
      <div className="pt-2 flex gap-3">
        <button
          onClick={onBack}
          className="w-1/3 py-3.5 rounded-2xl bg-white border border-stone-300 text-earthy-title font-bold text-xs hover:bg-stone-50 active:scale-95 transition-all"
        >
          {t.back}
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-terracotta to-[#9A3815] text-white font-extrabold text-sm shadow-floating hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>{t.next}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

