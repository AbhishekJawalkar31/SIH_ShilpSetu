"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  X,
  ArrowUpDown,
  Inbox,
  MessageSquare,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { BackendOrder, BackendOrderStatus } from "../../services/types";
import { useAuth } from "../../context/AuthContext";
import { OrderDetailModal } from "./OrderDetailModal";

interface RequestsListProps {
  orders: BackendOrder[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  lang: Language;
}

export const RequestsList: React.FC<RequestsListProps> = ({
  orders = [],
  isLoading = false,
  error = null,
  onRetry,
  lang,
}) => {
  const t = translations[lang];
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"orders" | "requests" | "messages">("orders");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [selectedOrder, setSelectedOrder] = useState<BackendOrder | null>(null);

  const displayName = user?.name
    ? user.name.trim().split(" ")[0]
    : lang === "hi"
    ? "विक्रेता"
    : "Seller";

  // Status Badge Helper
  const getStatusBadge = (status: BackendOrderStatus) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: <Clock className="w-3 h-3 mr-1 text-amber-600" />,
          label: t.statusPending,
        };
      case "confirmed":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          icon: <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" />,
          label: t.statusConfirmed,
        };
      case "processing":
        return {
          bg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          icon: <Package className="w-3 h-3 mr-1 text-indigo-600" />,
          label: t.statusProcessing,
        };
      case "completed":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          icon: <ShieldCheck className="w-3 h-3 mr-1 text-emerald-600" />,
          label: t.statusCompleted,
        };
      case "cancelled":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          icon: <AlertCircle className="w-3 h-3 mr-1 text-rose-600" />,
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

  // Filter & Search Logic
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    // Status filter
    if (selectedStatus !== "all") {
      result = result.filter((o) => o.status === selectedStatus);
    }

    // Search query across ID, item product titles, and status
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((o) => {
        const orderIdMatch = o.id.toLowerCase().includes(q);
        const customerIdMatch = o.buyer_id.toLowerCase().includes(q);
        const statusMatch = o.status.toLowerCase().includes(q);
        const itemMatch = o.items?.some((item) =>
          item.product_title?.toLowerCase().includes(q)
        );
        return orderIdMatch || customerIdMatch || statusMatch || itemMatch;
      });
    }

    // Sort
    result.sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [orders, selectedStatus, searchQuery, sortOrder]);

  const availableStatuses: { id: string; label: string }[] = [
    { id: "all", label: t.allFilter },
    { id: "pending", label: t.statusPending },
    { id: "confirmed", label: t.statusConfirmed },
    { id: "processing", label: t.statusProcessing },
    { id: "completed", label: t.statusCompleted },
    { id: "cancelled", label: t.statusCancelled },
  ];

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-earthy-title">
            {lang === "hi" ? `नमस्ते, ${displayName}` : `Namaste, ${displayName}`}
          </h2>
          <p className="text-xs text-earthy-muted">{t.requestsTitle}</p>
        </div>
      </div>

      {/* Tabs: Orders | Requests | Messages */}
      <div className="grid grid-cols-3 p-1 rounded-2xl bg-white border border-warmcream-border shadow-xs text-center">
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "orders"
              ? "bg-terracotta text-white shadow-xs"
              : "text-earthy-muted hover:text-earthy-title"
          }`}
        >
          {t.tabOrders}
          {orders.length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
              {orders.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`py-2 rounded-xl text-xs font-bold relative transition-all ${
            activeTab === "requests"
              ? "bg-terracotta text-white shadow-xs"
              : "text-earthy-muted hover:text-earthy-title"
          }`}
        >
          {t.tabRequests}
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "messages"
              ? "bg-terracotta text-white shadow-xs"
              : "text-earthy-muted hover:text-earthy-title"
          }`}
        >
          {t.tabMessages}
        </button>
      </div>

      {/* TAB 1: REAL ORDERS LIST */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          {/* Search and Sort Row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchOrdersPlaceholder}
                className="w-full pl-9 pr-8 py-2 bg-white rounded-xl border border-warmcream-border text-xs text-earthy-title placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-terracotta shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  aria-label="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Toggle Button */}
            <button
              onClick={() =>
                setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
              }
              className="p-2 rounded-xl bg-white border border-warmcream-border text-earthy-title hover:bg-stone-50 shadow-2xs flex items-center gap-1 shrink-0 text-xs font-semibold"
              title={`${t.sortBy}: ${sortOrder === "newest" ? t.newestSort : t.oldestSort}`}
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-terracotta" />
              <span className="text-[11px] hidden sm:inline">
                {sortOrder === "newest" ? t.newestSort : t.oldestSort}
              </span>
            </button>
          </div>

          {/* Dynamic Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {availableStatuses.map((status) => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                className={`px-3 py-1.5 rounded-full font-bold text-[11px] whitespace-nowrap transition-all ${
                  selectedStatus === status.id
                    ? "bg-terracotta text-white shadow-2xs"
                    : "bg-white text-earthy-muted border border-warmcream-border hover:bg-stone-50"
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-xs font-semibold text-earthy-title">{error}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-terracotta text-white text-xs font-bold shadow-2xs hover:bg-terracotta-700 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{t.retryOrders}</span>
                </button>
              )}
            </div>
          )}

          {/* Loading Skeleton */}
          {isLoading && !error && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3 animate-pulse"
                >
                  <div className="flex justify-between items-center">
                    <div className="h-4 w-28 bg-stone-200 rounded-md" />
                    <div className="h-4 w-20 bg-stone-200 rounded-full" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-4 w-3/4 bg-stone-200 rounded-md" />
                    <div className="h-3 w-1/2 bg-stone-100 rounded-md" />
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                    <div className="h-4 w-16 bg-stone-200 rounded-md" />
                    <div className="h-4 w-24 bg-stone-200 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State (Zero orders in system) */}
          {!isLoading && !error && orders.length === 0 && (
            <div className="p-8 text-center bg-white rounded-3xl border border-warmcream-border shadow-card space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-terracotta-50 border border-terracotta-100 text-terracotta flex items-center justify-center mx-auto">
                <Package className="w-7 h-7 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-earthy-title">
                  {t.noOrdersYet}
                </h3>
                <p className="text-xs text-earthy-muted mt-1 max-w-xs mx-auto leading-relaxed">
                  {t.noOrdersDesc}
                </p>
              </div>
            </div>
          )}

          {/* Filtered Empty State (Orders exist, but query/filter doesn't match) */}
          {!isLoading && !error && orders.length > 0 && filteredOrders.length === 0 && (
            <div className="p-6 text-center bg-white rounded-2xl border border-warmcream-border shadow-card space-y-2">
              <Inbox className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-xs font-bold text-earthy-title">
                {lang === "hi"
                  ? "फ़िल्टर या खोज से कोई ऑर्डर मेल नहीं खाता"
                  : "No orders match your filter or search"}
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedStatus("all");
                }}
                className="text-xs text-terracotta font-semibold hover:underline"
              >
                {lang === "hi" ? "सभी फ़िल्टर साफ़ करें" : "Clear all filters"}
              </button>
            </div>
          )}

          {/* Order Cards List */}
          {!isLoading &&
            !error &&
            filteredOrders.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              const formattedDate = new Date(order.created_at).toLocaleDateString(
                lang === "hi" ? "hi-IN" : "en-IN",
                {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }
              );

              // Extract product title(s)
              const firstItemTitle =
                order.items && order.items.length > 0
                  ? order.items[0].product_title ||
                    (lang === "hi" ? "शिल्प उत्पाद" : "Artisanal Craft")
                  : lang === "hi"
                  ? "शिल्प उत्पाद"
                  : "Artisanal Craft";

              const extraItemsCount =
                order.items && order.items.length > 1
                  ? order.items.length - 1
                  : 0;

              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card hover:shadow-md transition-all cursor-pointer space-y-3 active:scale-[0.99]"
                >
                  {/* Top Meta Line: Reference, Date, Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-lg bg-terracotta-50 text-terracotta font-mono font-bold text-[10px] border border-terracotta-200">
                        #ORD-{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[11px] text-stone-400 font-medium">
                        {formattedDate}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.bg}`}
                    >
                      {statusBadge.icon}
                      {statusBadge.label}
                    </span>
                  </div>

                  {/* Order Products & Customer */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-warmcream/80 text-terracotta flex items-center justify-center shrink-0 border border-warmcream-border">
                        <Package className="w-5 h-5 stroke-[1.8]" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-xs text-earthy-title leading-snug">
                          {firstItemTitle}
                          {extraItemsCount > 0 && (
                            <span className="text-stone-400 text-[10px] font-normal ml-1">
                              +{extraItemsCount} {lang === "hi" ? "अन्य" : "more"}
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-earthy-muted mt-0.5">
                          {t.customerLabel}:{" "}
                          <span className="font-mono text-earthy-title font-semibold">
                            #{order.buyer_id.slice(0, 6).toUpperCase()}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-sm text-earthy-title block">
                        ₹{order.total_price.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-earthy-muted">
                        Qty: {order.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 text-xs">
                    <span className="text-[11px] font-semibold text-terracotta hover:underline flex items-center gap-0.5">
                      {t.viewDetails}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {order.items?.length || 1} {lang === "hi" ? "आइटम" : "item(s)"}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* TAB 2: TRUTHFUL FUTURE STATE FOR REQUESTS */}
      {activeTab === "requests" && (
        <div className="p-8 text-center bg-white rounded-3xl border border-warmcream-border shadow-card space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-ochre-50 border border-ochre-200 text-ochre flex items-center justify-center mx-auto">
            <Inbox className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-earthy-title">
              {t.requestsFutureTitle}
            </h3>
            <p className="text-xs text-earthy-muted mt-1 max-w-xs mx-auto leading-relaxed">
              {t.requestsFutureDesc}
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: TRUTHFUL FUTURE STATE FOR MESSAGING */}
      {activeTab === "messages" && (
        <div className="p-8 text-center bg-white rounded-3xl border border-warmcream-border shadow-card space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto">
            <MessageSquare className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-earthy-title">
              {t.messagingFutureTitle}
            </h3>
            <p className="text-xs text-earthy-muted mt-1 max-w-xs mx-auto leading-relaxed">
              {t.messagingFutureDesc}
            </p>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={selectedOrder !== null}
        onClose={() => setSelectedOrder(null)}
        lang={lang}
      />
    </div>
  );
};
