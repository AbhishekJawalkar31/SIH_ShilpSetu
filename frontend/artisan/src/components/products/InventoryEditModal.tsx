"use client";

import React, { useState } from "react";
import {
  Boxes,
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  Minus,
  Plus,
  Loader2,
} from "lucide-react";
import { Product, InventoryUpdateRequest } from "../../services/types";
import { api, resolveBackendUrl } from "../../services/apiClient";
import { Language, translations } from "../../lib/i18n";

interface InventoryEditModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedProduct: Product) => void;
  lang: Language;
}

export const InventoryEditModal: React.FC<InventoryEditModalProps> = ({
  product,
  isOpen,
  onClose,
  onSuccess,
  lang,
}) => {
  const t = translations[lang];

  const [availableQuantity, setAvailableQuantity] = useState<number>(
    product.available_quantity ?? 0
  );
  const [productionCapacity, setProductionCapacity] = useState<number>(
    product.production_capacity ?? 0
  );
  const [unit, setUnit] = useState<string>(product.unit || "piece");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const unitOptions = ["piece", "set", "meter", "pair", "kg"];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (availableQuantity < 0) {
      setError(
        lang === "hi"
          ? "उपलब्ध मात्रा 0 या उससे अधिक होनी चाहिए।"
          : "Available quantity must be non-negative."
      );
      return;
    }
    if (productionCapacity < 0) {
      setError(
        lang === "hi"
          ? "उत्पादन क्षमता 0 या उससे अधिक होनी चाहिए।"
          : "Production capacity must be non-negative."
      );
      return;
    }
    if (!unit.trim()) {
      setError(
        lang === "hi"
          ? "मात्रा इकाई रिक्त नहीं हो सकती।"
          : "Unit cannot be empty."
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload: InventoryUpdateRequest = {
      available_quantity: Math.floor(availableQuantity),
      production_capacity: Math.floor(productionCapacity),
      unit: unit.trim(),
    };

    try {
      const updatedProduct = await api.updateInventory(product.id, payload);
      setSuccessMessage(t.inventoryUpdateSuccess);
      setTimeout(() => {
        onSuccess(updatedProduct);
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Failed to update inventory:", err);
      setError(err.message || t.inventoryUpdateError);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-warmcream-border overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-terracotta-50 border border-terracotta-200 text-terracotta flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-xs text-earthy-title">
                {t.editInventoryTitle}
              </h3>
              <p className="text-[10px] text-earthy-muted truncate max-w-[180px]">
                {product.title}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="w-7 h-7 rounded-full bg-stone-100 text-stone-500 hover:text-earthy-title flex items-center justify-center transition disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product mini summary */}
        <div className="p-4 pb-0 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
            {product.image_url ? (
              <img
                src={resolveBackendUrl(product.image_url)}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-stone-400">
                <Boxes className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-bold text-xs text-earthy-title truncate">
              {product.title}
            </h4>
            <span className="text-[10px] text-terracotta font-semibold">
              ₹{product.price}
            </span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-4 space-y-3.5">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-craftgreen-50 border border-craftgreen-200 text-craftgreen-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-craftgreen" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Available Quantity (Stock) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-earthy-title">
              {t.availableQuantityLabel} *
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setAvailableQuantity((prev) => Math.max(0, prev - 1))
                }
                disabled={isSaving || availableQuantity <= 0}
                className="w-9 h-9 rounded-xl bg-warmcream-muted text-earthy-title flex items-center justify-center font-bold hover:bg-stone-200 active:scale-95 transition disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="0"
                required
                value={availableQuantity}
                onChange={(e) =>
                  setAvailableQuantity(
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                disabled={isSaving}
                className="flex-1 text-center font-black text-sm p-2 rounded-xl bg-warmcream/60 border border-warmcream-border focus:ring-2 focus:ring-terracotta/30 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => setAvailableQuantity((prev) => prev + 1)}
                disabled={isSaving}
                className="w-9 h-9 rounded-xl bg-warmcream-muted text-earthy-title flex items-center justify-center font-bold hover:bg-stone-200 active:scale-95 transition disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Monthly Production Capacity */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-earthy-title">
              {t.productionCapacityLabel} *
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setProductionCapacity((prev) => Math.max(0, prev - 5))
                }
                disabled={isSaving || productionCapacity <= 0}
                className="w-9 h-9 rounded-xl bg-warmcream-muted text-earthy-title flex items-center justify-center font-bold hover:bg-stone-200 active:scale-95 transition disabled:opacity-40"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                type="number"
                min="0"
                required
                value={productionCapacity}
                onChange={(e) =>
                  setProductionCapacity(
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                disabled={isSaving}
                className="flex-1 text-center font-black text-sm p-2 rounded-xl bg-warmcream/60 border border-warmcream-border focus:ring-2 focus:ring-terracotta/30 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => setProductionCapacity((prev) => prev + 5)}
                disabled={isSaving}
                className="w-9 h-9 rounded-xl bg-warmcream-muted text-earthy-title flex items-center justify-center font-bold hover:bg-stone-200 active:scale-95 transition disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Unit of Measurement */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-earthy-title">
              {t.unitLabel} *
            </label>
            <div className="flex gap-1.5 flex-wrap">
              {unitOptions.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  disabled={isSaving}
                  className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition ${
                    unit === u
                      ? "bg-terracotta text-white shadow-xs"
                      : "bg-warmcream-muted text-earthy-body hover:bg-stone-200"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              disabled={isSaving}
              placeholder="Or enter custom unit (e.g. box, dozen)"
              className="w-full text-xs p-2 rounded-xl bg-warmcream/40 border border-warmcream-border focus:outline-none mt-1"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="w-1/3 py-2.5 rounded-xl bg-stone-100 text-stone-600 font-bold text-xs hover:bg-stone-200 active:scale-95 transition disabled:opacity-50"
            >
              {t.cancelBtn}
            </button>

            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-terracotta to-ochre text-white font-bold text-xs shadow-md hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.savingInventoryBtn}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{t.saveInventoryBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
