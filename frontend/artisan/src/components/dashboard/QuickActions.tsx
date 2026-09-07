import React from "react";
import { Plus, ShoppingBag, Package, IndianRupee } from "lucide-react";
import { translations, Language } from "../../lib/i18n";

interface QuickActionsProps {
  lang: Language;
  onActionClick: (action: string) => void;
  productCount?: number;
  newOrdersCount?: number;
  earnings?: string;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  lang,
  onActionClick,
  productCount = 0,
  newOrdersCount = 0,
  earnings = "₹0",
}) => {
  const t = translations[lang];

  return (
    <div className="mx-4 mt-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted mb-2.5">
        {t.quickActions}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Card 1: Add Product (Upload & List) - Prominent Highlighted Card */}
        <button
          onClick={() => onActionClick("add")}
          className="p-3.5 rounded-2xl bg-white border border-craftgreen-200/80 shadow-card hover:shadow-md transition-all text-left flex items-center gap-3 group active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-craftgreen-50 text-craftgreen flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <div className="w-8 h-8 rounded-lg bg-craftgreen text-white flex items-center justify-center shadow-xs">
              <Plus className="w-5 h-5 stroke-[3]" />
            </div>
          </div>
          <div>
            <p className="font-bold text-xs text-earthy-title leading-tight">
              {t.addProduct}
            </p>
            <p className="text-[11px] text-craftgreen font-medium mt-0.5">
              {t.addProductSub}
            </p>
          </div>
        </button>

        {/* Card 2: My Products */}
        <button
          onClick={() => onActionClick("products")}
          className="p-3.5 rounded-2xl bg-white border border-warmcream-border shadow-card hover:shadow-md transition-all text-left flex items-center gap-3 group active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-ochre-50 text-ochre flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Package className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="font-bold text-xs text-earthy-title leading-tight">
              {t.myProducts}
            </p>
            <p className="text-[11px] text-earthy-muted mt-0.5">
              {lang === "hi" ? `${productCount} उपलब्ध` : `${productCount} Listed`}
            </p>
          </div>
        </button>

        {/* Card 3: Orders */}
        <button
          onClick={() => onActionClick("requests")}
          className="p-3.5 rounded-2xl bg-white border border-warmcream-border shadow-card hover:shadow-md transition-all text-left flex items-center gap-3 group active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform relative">
            <ShoppingBag className="w-6 h-6 stroke-[2.2]" />
            {newOrdersCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-terracotta rounded-full" />
            )}
          </div>
          <div>
            <p className="font-bold text-xs text-earthy-title leading-tight">
              {t.orders}
            </p>
            <p className="text-[11px] text-blue-600 font-medium mt-0.5">
              {lang === "hi" ? `${newOrdersCount} नए` : `${newOrdersCount} New`}
            </p>
          </div>
        </button>

        {/* Card 4: Earnings */}
        <button
          onClick={() => onActionClick("earnings")}
          className="p-3.5 rounded-2xl bg-white border border-warmcream-border shadow-card hover:shadow-md transition-all text-left flex items-center gap-3 group active:scale-[0.98]"
        >
          <div className="w-11 h-11 rounded-xl bg-terracotta-50 text-terracotta flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <IndianRupee className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <p className="font-bold text-xs text-earthy-title leading-tight">
              {t.earnings}
            </p>
            <p className="text-[11px] text-terracotta font-semibold mt-0.5">
              {earnings}
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};

