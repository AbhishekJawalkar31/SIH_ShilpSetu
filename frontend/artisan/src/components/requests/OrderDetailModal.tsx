"use client";

import React, { useEffect } from "react";
import { X, Package, Clock, ShieldCheck, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { BackendOrder, BackendOrderStatus } from "../../services/types";
import { Language, translations } from "../../lib/i18n";

interface OrderDetailModalProps {
  order: BackendOrder | null;
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({
  order,
  isOpen,
  onClose,
  lang,
}) => {
  const t = translations[lang];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  const getStatusBadge = (status: BackendOrderStatus) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />,
          label: t.statusPending,
        };
      case "confirmed":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" />,
          label: t.statusConfirmed,
        };
      case "processing":
        return {
          bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: <Package className="w-3.5 h-3.5 mr-1 text-indigo-600" />,
          label: t.statusProcessing,
        };
      case "completed":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />,
          label: t.statusCompleted,
        };
      case "cancelled":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          icon: <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />,
          label: t.statusCancelled,
        };
      default:
        return {
          bg: "bg-stone-50 text-stone-700 border-stone-200",
          icon: null,
          label: status,
        };
    }
  };

  const statusBadge = getStatusBadge(order.status);
  const formattedDate = new Date(order.created_at).toLocaleDateString(
    lang === "hi" ? "hi-IN" : "en-IN",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-detail-title"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-warmcream-border max-h-[90vh] overflow-y-auto space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-3 border-b border-warmcream-border">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-extrabold text-terracotta bg-terracotta-50 px-2.5 py-0.5 rounded-lg border border-terracotta-200">
                #ORD-{order.id.slice(0, 8).toUpperCase()}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${statusBadge.bg}`}
              >
                {statusBadge.icon}
                {statusBadge.label}
              </span>
            </div>
            <h2
              id="order-detail-title"
              className="text-base font-extrabold text-earthy-title mt-1"
            >
              {t.orderDetailsTitle}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-warmcream/80 hover:bg-warmcream-muted text-earthy-muted hover:text-earthy-title transition-colors"
            aria-label={t.closeBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Order Meta Info */}
        <div className="grid grid-cols-2 gap-2 text-xs bg-warmcream/50 p-3.5 rounded-2xl border border-warmcream-border">
          <div>
            <span className="text-[11px] text-earthy-muted block">
              {t.dateLabel}
            </span>
            <span className="font-semibold text-earthy-title">
              {formattedDate}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-earthy-muted block">
              {t.customerLabel}
            </span>
            <span className="font-mono font-semibold text-earthy-title">
              #{order.buyer_id.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
              {t.itemsLabel} ({order.items?.length || 1})
            </h3>
            <span className="text-xs font-semibold text-earthy-body">
              {t.quantityLabel}: {order.quantity}
            </span>
          </div>

          <div className="space-y-2">
            {order.items && order.items.length > 0 ? (
              order.items.map((item, index) => (
                <div
                  key={item.id || index}
                  className="p-3 bg-white rounded-2xl border border-warmcream-border shadow-2xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-terracotta-50 text-terracotta flex items-center justify-center shrink-0 mt-0.5">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-earthy-title leading-snug">
                          {item.product_title ||
                            (lang === "hi" ? "शिल्प उत्पाद" : "Artisanal Product")}
                        </h4>
                        {item.artisan_business_name && (
                          <p className="text-[10px] text-earthy-muted">
                            {t.artisanNameLabel}: {item.artisan_business_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-xs text-earthy-title">
                        ₹{item.total_price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-earthy-muted pt-1 border-t border-stone-100">
                    <span>
                      {t.unitPriceLabel}: ₹{item.unit_price.toLocaleString()}
                    </span>
                    <span className="font-semibold text-earthy-title">
                      Qty: {item.quantity}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-3 bg-white rounded-2xl border border-warmcream-border shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-terracotta" />
                    <span className="font-bold text-xs text-earthy-title">
                      {lang === "hi" ? "शिल्प उत्पाद" : "Artisanal Product"}
                    </span>
                  </div>
                  <span className="font-black text-xs text-earthy-title">
                    ₹{order.total_price.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-earthy-muted mt-1">
                  <span>{t.unitPriceLabel}: ₹{order.unit_price.toLocaleString()}</span>
                  <span>Qty: {order.quantity}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Total Summary Box */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-terracotta/10 to-ochre/10 border border-terracotta/20 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-terracotta-900 block">
              {t.totalAmount}
            </span>
            <span className="text-[10px] text-earthy-muted">
              {order.quantity} {lang === "hi" ? "इकाईयां" : "units total"}
            </span>
          </div>
          <span className="text-base font-black text-terracotta">
            ₹{order.total_price.toLocaleString()}
          </span>
        </div>

        {/* Modal Actions */}
        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-terracotta text-white font-bold text-xs shadow-xs hover:bg-terracotta-700 active:scale-98 transition"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
