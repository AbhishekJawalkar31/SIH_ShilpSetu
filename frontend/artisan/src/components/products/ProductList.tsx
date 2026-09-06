import React, { useState } from "react";
import { Search, Plus, Package, Layers, Tag, Eye } from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { Product } from "../../services/types";

interface ProductListProps {
  products: Product[];
  onAddProduct: () => void;
  lang: Language;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  onAddProduct,
  lang,
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Bags", "Home Decor", "Textiles", "Pottery"];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.material.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 space-y-4">
      {/* Header bar with count and Add button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-extrabold text-earthy-title">
            {t.myProducts}
          </h2>
          <p className="text-xs text-earthy-muted">
            {products.length} {lang === "hi" ? "सक्रिय उत्पाद" : "active listings"}
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

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t.searchPlaceholder}
          className="w-full pl-9 pr-4 py-2.5 rounded-2xl bg-white border border-warmcream-border text-xs text-earthy-title placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-terracotta/30 shadow-xs"
        />
      </div>

      {/* Category Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat
                ? "bg-terracotta text-white shadow-xs"
                : "bg-white border border-warmcream-border text-earthy-body hover:bg-stone-50"
            }`}
          >
            {cat === "All" && lang === "hi" ? "सभी" : cat}
          </button>
        ))}
      </div>

      {/* Product Grid / Cards */}
      {filteredProducts.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-warmcream-border">
          <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-xs font-bold text-earthy-title">
            {lang === "hi" ? "कोई उत्पाद नहीं मिला" : "No products found"}
          </p>
          <p className="text-[11px] text-earthy-muted mt-0.5">
            {lang === "hi"
              ? "दूसरा शब्द खोजें या नया उत्पाद जोड़ें"
              : "Try another search or list a new product"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="bg-white rounded-3xl p-3.5 border border-warmcream-border shadow-card flex gap-3 hover:shadow-md transition-shadow"
            >
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-warmcream-border">
                <img
                  src={prod.image_url}
                  alt={prod.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-warmcream-muted text-earthy-muted uppercase tracking-wide">
                      {prod.category}
                    </span>
                    <span className="text-[10px] font-bold text-craftgreen bg-craftgreen-50 px-2 py-0.5 rounded-full border border-craftgreen-100">
                      {prod.available_quantity || 15} in stock
                    </span>
                  </div>
                  <h4 className="font-extrabold text-xs text-earthy-title truncate mt-1">
                    {prod.title}
                  </h4>
                  <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                    {prod.material} • {prod.craft_type}
                  </p>
                </div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-stone-100">
                  <span className="text-sm font-black text-terracotta">
                    ₹{prod.price}
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Cap: {prod.production_capacity || 50}/mo
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

