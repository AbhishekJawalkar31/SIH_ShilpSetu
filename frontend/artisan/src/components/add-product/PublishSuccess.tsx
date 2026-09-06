import React from "react";
import { CheckCircle2, ArrowRight, PlusCircle, Home, ExternalLink } from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { Product } from "../../services/types";

interface PublishSuccessProps {
  product: Product;
  onViewListing: () => void;
  onAddAnother: () => void;
  onGoHome: () => void;
  lang: Language;
}

export const PublishSuccess: React.FC<PublishSuccessProps> = ({
  product,
  onViewListing,
  onAddAnother,
  onGoHome,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div className="p-5 flex flex-col items-center justify-center min-h-[520px] text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
      {/* Celebration Icon */}
      <div className="w-20 h-20 rounded-full bg-craftgreen-50 text-craftgreen flex items-center justify-center shadow-md ring-8 ring-craftgreen-100/50">
        <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
      </div>

      <div>
        <h2 className="text-xl font-black text-earthy-title leading-tight">
          {t.successTitle}
        </h2>
        <p className="text-xs text-earthy-body mt-1.5 max-w-xs mx-auto leading-relaxed">
          {t.successMsg}
        </p>
      </div>

      {/* Published Product Card Summary */}
      <div className="w-full max-w-xs bg-white rounded-3xl p-3.5 border border-warmcream-border shadow-card flex items-center gap-3 text-left">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
          <img
            src={product.image_url}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-craftgreen-50 text-craftgreen border border-craftgreen-200 uppercase">
            {lang === "hi" ? "सक्रिय सूची" : "Live Listing"}
          </span>
          <h4 className="font-bold text-xs text-earthy-title truncate mt-1">
            {product.title}
          </h4>
          <p className="text-xs font-black text-terracotta mt-0.5">
            ₹{product.price}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-2.5 pt-2">
        <button
          onClick={onViewListing}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-terracotta to-ochre text-white font-extrabold text-xs shadow-floating hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <span>{t.viewListing}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onAddAnother}
          className="w-full py-3 px-4 rounded-2xl bg-white border border-stone-300 text-earthy-title font-bold text-xs hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-4 h-4 text-terracotta" />
          <span>{t.addAnother}</span>
        </button>

        <button
          onClick={onGoHome}
          className="w-full py-2.5 text-earthy-muted font-medium text-xs hover:text-earthy-title flex items-center justify-center gap-1.5"
        >
          <Home className="w-3.5 h-3.5" />
          <span>{t.backToHome}</span>
        </button>
      </div>
    </div>
  );
};

