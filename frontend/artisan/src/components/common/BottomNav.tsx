import React from "react";
import { Home, Package, Plus, ShoppingBag, User } from "lucide-react";
import { translations, Language } from "../../lib/i18n";

interface BottomNavProps {
  activeScreen: string;
  onNavigate: (screen: string) => void;
  lang: Language;
  pendingOrdersCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeScreen,
  onNavigate,
  lang,
  pendingOrdersCount = 3,
}) => {
  const t = translations[lang];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-warmcream-border max-w-md mx-auto px-2 py-1.5 shadow-lg">
      <div className="flex items-center justify-around">
        {/* Home */}
        <button
          onClick={() => onNavigate("dashboard")}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activeScreen === "dashboard"
              ? "text-terracotta font-semibold"
              : "text-earthy-muted hover:text-earthy-body"
          }`}
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-0.5">{t.navHome}</span>
        </button>

        {/* Products */}
        <button
          onClick={() => onNavigate("products")}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activeScreen === "products"
              ? "text-terracotta font-semibold"
              : "text-earthy-muted hover:text-earthy-body"
          }`}
        >
          <Package className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-0.5">{t.navProducts}</span>
        </button>

        {/* Center Floating Action Button: Add Product */}
        <button
          onClick={() => onNavigate("add")}
          className="relative -top-4 flex items-center justify-center w-13 h-13 rounded-full bg-gradient-to-tr from-terracotta to-ochre text-white shadow-floating hover:brightness-110 active:scale-95 transition-all p-3.5 border-4 border-white"
          aria-label="Add New Product"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        {/* Orders / Requests */}
        <button
          onClick={() => onNavigate("requests")}
          className={`relative flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activeScreen === "requests"
              ? "text-terracotta font-semibold"
              : "text-earthy-muted hover:text-earthy-body"
          }`}
        >
          <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
          {pendingOrdersCount > 0 && (
            <span className="absolute top-0.5 right-2 w-4 h-4 bg-terracotta text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
              {pendingOrdersCount}
            </span>
          )}
          <span className="text-[10px] mt-0.5">{t.navOrders}</span>
        </button>

        {/* Profile */}
        <button
          onClick={() => onNavigate("profile")}
          className={`flex flex-col items-center py-1 px-3 rounded-xl transition-all ${
            activeScreen === "profile"
              ? "text-terracotta font-semibold"
              : "text-earthy-muted hover:text-earthy-body"
          }`}
        >
          <User className="w-5 h-5 stroke-[2.2]" />
          <span className="text-[10px] mt-0.5">{t.navProfile}</span>
        </button>
      </div>
    </nav>
  );
};

