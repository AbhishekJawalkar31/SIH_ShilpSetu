import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import { translations, Language } from "../../lib/i18n";

interface HeroBannerProps {
  lang: Language;
  onAddProduct: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ lang, onAddProduct }) => {
  const t = translations[lang];

  return (
    <div className="relative mx-4 mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-terracotta via-[#A64520] to-[#8C3414] text-white shadow-artisan">
      {/* Decorative Traditional Indian Motif Patterns in Background */}
      <div className="absolute inset-0 opacity-15 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-ochre/30 rounded-full blur-2xl pointer-events-none" />

      <div className="relative p-5 flex items-center justify-between">
        <div className="max-w-[62%]">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold tracking-wide backdrop-blur-xs mb-2">
            <Sparkles className="w-3 h-3 text-amber-200" />
            {t.heroBadge}
          </div>

          <h2 className="text-lg font-extrabold leading-tight tracking-tight text-white drop-shadow-xs">
            {t.heroTitle}
          </h2>

          <p className="text-xs text-stone-200 mt-1 leading-normal">
            {t.heroSubtitle}
          </p>

          <button
            onClick={onAddProduct}
            className="mt-3.5 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white text-terracotta font-bold text-xs shadow-md hover:bg-stone-50 active:scale-95 transition-all"
          >
            <span>{t.addProduct}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Traditional Craft Image (Jute/Pottery preview matching screenshot) */}
        <div className="w-[110px] h-[110px] rounded-2xl overflow-hidden shadow-lg border-2 border-white/40 shrink-0 transform rotate-2 bg-stone-900/20">
          <img
            src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=350"
            alt="Handmade Pottery & Craft"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};

