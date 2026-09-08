"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  RefreshCw,
  Eye,
  Check,
  Building2,
  ChevronRight,
  X,
  Truck,
  Sparkles,
  Calendar,
  Layers,
  FileText,
} from "lucide-react";
import { useCustomerAuth } from "../../../context/CustomerAuthContext";
import {
  getOrders,
  getOrder,
  getOrderItems,
  ApiError,
} from "../../../services/customerApi";
import {
  OrderResponse,
  OrderItemResponse,
  OrderStatus,
} from "../../../services/types";

// Standard lifecycle stages based on real backend OrderStatus enum:
// Literal["pending", "confirmed", "processing", "completed", "cancelled"]
const ORDER_LIFECYCLE_STAGES: {
  status: OrderStatus;
  labelEn: string;
  labelHi: string;
  descriptionEn: string;
  descriptionHi: string;
}[] = [
  {
    status: "pending",
    labelEn: "Order Placed",
    labelHi: "ऑर्डर सबमिट हुआ",
    descriptionEn: "Order received and queued for cluster fulfillment",
    descriptionHi: "ऑर्डर प्राप्त हुआ और कारीगर समूह को भेजा गया",
  },
  {
    status: "confirmed",
    labelEn: "Confirmed",
    labelHi: "ऑर्डर पुष्ट",
    descriptionEn: "Artisans confirmed order specifications and allocated workshop capacity",
    descriptionHi: "कारीगरों ने विशिष्टताओं की पुष्टि कर कार्यशाला क्षमता आवंटित की",
  },
  {
    status: "processing",
    labelEn: "In Production",
    labelHi: "निर्माण कार्य प्रगति पर",
    descriptionEn: "Master craftspeople are hand-making your pieces with traditional techniques",
    descriptionHi: "कारीगर पारंपरिक तकनीकों से हस्तशिल्प तैयार कर रहे हैं",
  },
  {
    status: "completed",
    labelEn: "Delivered",
    labelHi: "ऑर्डर पूर्ण व वितरित",
    descriptionEn: "Heritage pieces crafted, quality-inspected, and delivered",
    descriptionHi: "पारंपरिक उत्पाद तैयार, गुणवत्ता-जांच पूर्ण और वितरित",
  },
];

export default function CustomerOrdersPage() {
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomerAuth();

  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Order Detail & Tracking State
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemResponse[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Fetch Orders from real backend
  const fetchCustomerOrders = useCallback(async () => {
    if (!isAuthenticated || !customer?.id) {
      setIsLoading(false);
      setOrders([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params: { buyer_id?: string; status?: string } = {
        buyer_id: customer.id,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const res = await getOrders(params);
      if (res && res.items) {
        setOrders(res.items);
      } else {
        setOrders([]);
      }
    } catch (err: unknown) {
      console.warn("Backend orders API error:", err);
      setOrders([]);
      const msg =
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Unable to connect to ShilpSetu services. Please try again. / ShilpSetu सेवा से कनेक्शन नहीं हो सका। कृपया पुनः प्रयास करें।";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [customer?.id, isAuthenticated, statusFilter]);

  useEffect(() => {
    fetchCustomerOrders();
  }, [fetchCustomerOrders]);

  // Open Order Detail & Tracking Modal
  const handleOpenDetail = async (order: OrderResponse) => {
    setSelectedOrder(order);
    setOrderItems(order.items || []);
    setDetailError(null);
    setIsLoadingDetail(true);

    try {
      // Fetch fresh order details and line items directly from backend
      const [freshOrder, items] = await Promise.all([
        getOrder(order.id).catch(() => order),
        getOrderItems(order.id).catch(() => order.items || []),
      ]);
      setSelectedOrder(freshOrder);
      setOrderItems(items);
    } catch (err: unknown) {
      console.warn("Could not fetch fresh order items:", err);
      // Preserve existing order data
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // Status Badge Formatting
  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          label: "Order Placed / सबमिट हुआ",
        };
      case "confirmed":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          label: "Confirmed / पुष्ट",
        };
      case "processing":
        return {
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          label: "In Production / निर्माण में",
        };
      case "completed":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "Delivered / पूर्ण",
        };
      case "cancelled":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          label: "Cancelled / रद्द",
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-700 border-gray-200",
          label: status,
        };
    }
  };

  // Calculate Lifecycle Index
  const getStageIndex = (status: OrderStatus) => {
    if (status === "cancelled") return -1;
    return ORDER_LIFECYCLE_STAGES.findIndex((s) => s.status === status);
  };

  return (
    <div className="min-h-screen bg-sand text-ink selection:bg-terracotta/20 selection:text-terracotta">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-sand/60 px-3.5 py-1.5 text-xs font-semibold text-forest transition hover:bg-forest hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Marketplace</span>
            </Link>
            <div className="hidden items-center gap-2 text-xs text-ink/60 sm:flex">
              <span>Customer Portal (ग्राहक)</span>
              <span>/</span>
              <span className="font-semibold text-forest">My Orders (मेरे ऑर्डर)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/buyer/quotes"
              className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-sand/40 px-3.5 py-1.5 text-xs font-bold text-forest transition hover:bg-sand"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>My Quotes / कोटेशन</span>
            </Link>
            <Link
              href="/buyer/custom-request"
              className="inline-flex items-center gap-1.5 rounded-full bg-forest px-4 py-1.5 text-xs font-bold text-white transition hover:bg-forest/90"
            >
              <Sparkles className="h-3.5 w-3.5 text-terracotta" />
              <span>New Custom Request</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Page Title & Status Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-forest/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white px-3 py-0.5 text-xs font-semibold text-forest">
              <Package className="h-3.5 w-3.5 text-terracotta" />
              <span>Customer Order History & Tracking</span>
              <span className="text-ink/40">•</span>
              <span>ऑर्डर इतिहास व ट्रैकिंग</span>
            </div>
            <h1 className="font-serif-title mt-2 text-3xl font-bold tracking-tight text-ink">
              My Orders
            </h1>
            <p className="text-xs text-ink/70 mt-1">
              Track production progress across registered craftspeople (शिल्पकार) and manage confirmed order batches.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCustomerOrders}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-white px-3.5 py-2 text-xs font-semibold text-forest transition hover:bg-sand disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Orders</span>
            </button>
          </div>
        </div>

        {/* Real Backend Error Alert */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchCustomerOrders}
              className="font-bold underline hover:text-red-900 ml-4 shrink-0"
            >
              Retry / पुनः प्रयास करें
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-forest/10 pb-4">
          {[
            { id: "all", label: "All Orders / सभी" },
            { id: "pending", label: "Placed / सबमिट हुआ" },
            { id: "confirmed", label: "Confirmed / पुष्ट" },
            { id: "processing", label: "In Production / निर्माण में" },
            { id: "completed", label: "Delivered / पूर्ण" },
            { id: "cancelled", label: "Cancelled / रद्द" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                statusFilter === tab.id
                  ? "bg-forest text-white shadow-xs"
                  : "border border-forest/15 bg-white text-ink/70 hover:bg-sand"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {authLoading || isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center space-y-3 py-12 text-forest">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="text-xs font-semibold">Loading orders from ShilpSetu network...</p>
          </div>
        ) : !isAuthenticated ? (
          <div className="mt-12 rounded-2xl border border-forest/10 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertCircle className="h-6 w-6 text-amber-700" />
            </div>
            <h3 className="font-serif-title mt-4 text-lg font-bold text-ink">
              Customer Sign-In Required / ग्राहक लॉगिन आवश्यक
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink/60">
              Please sign in with your customer account to view and track your orders. / अपने ऑर्डर देखने और ट्रैक करने के लिए कृपया लॉगिन करें।
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/buyer"
                className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white transition hover:bg-forest/90"
              >
                <span>Sign In / लॉगिन करें</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-forest/20 bg-sand/40 px-5 py-2.5 text-xs font-bold text-forest transition hover:bg-sand"
              >
                <span>Browse Marketplace / उत्पाद देखें</span>
              </Link>
            </div>
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-forest/10 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand text-forest">
              <Package className="h-6 w-6 text-terracotta" />
            </div>
            <h3 className="font-serif-title mt-4 text-lg font-bold text-ink">
              No Orders Found
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink/60">
              You haven&apos;t placed any orders matching this status yet. Orders created directly or converted from accepted quotes will appear here automatically.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/buyer/quotes"
                className="inline-flex items-center gap-2 rounded-xl border border-forest/20 bg-sand/40 px-5 py-2.5 text-xs font-bold text-forest transition hover:bg-sand"
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Check My Quotes / कोटेशन देखें</span>
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white transition hover:bg-forest/90"
              >
                <span>Browse Marketplace / उत्पाद देखें</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((order) => {
              const statusBadge = getStatusBadge(order.status);
              const itemCount = order.items?.length || 1;

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-forest/15 bg-white p-5 shadow-xs transition hover:border-forest/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-forest">
                          Order #{order.id.slice(0, 12)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadge.bg}`}
                        >
                          {statusBadge.label}
                        </span>
                        <span className="text-[11px] text-ink/40">
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="font-serif-title text-base font-bold text-ink">
                        {order.items && order.items.length > 0 && order.items[0].product_title
                          ? order.items[0].product_title
                          : `Batch Order (${order.quantity} units)`}
                      </h3>

                      {order.quote_request_id && (
                        <p className="text-[11px] text-ink/60 flex items-center gap-1">
                          <Layers className="h-3 w-3 text-terracotta" />
                          <span>Generated from Quote Request #{order.quote_request_id.slice(0, 8)}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleOpenDetail(order)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-forest/90"
                      >
                        <Truck className="h-3.5 w-3.5 text-terracotta" />
                        <span>Track & Details / विवरण</span>
                      </button>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-forest/10 pt-3 sm:grid-cols-4 text-xs">
                    <div>
                      <span className="text-ink/60">Total Quantity:</span>
                      <p className="font-bold text-ink mt-0.5">{order.quantity} units</p>
                    </div>

                    <div>
                      <span className="text-ink/60">Total Amount:</span>
                      <p className="font-bold text-forest mt-0.5">
                        ₹{order.total_price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      <span className="text-ink/60">Unit Price:</span>
                      <p className="font-bold text-ink mt-0.5">
                        ₹{order.unit_price.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      <span className="text-ink/60">Fulfillment Items:</span>
                      <p className="font-bold text-emerald-700 mt-0.5">
                        {itemCount} Seller Batch{itemCount > 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Order Details & Tracking Timeline Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-forest/15">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-forest/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-forest">
                    Order #{selectedOrder.id}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      getStatusBadge(selectedOrder.status).bg
                    }`}
                  >
                    {getStatusBadge(selectedOrder.status).label}
                  </span>
                </div>
                <h3 className="font-serif-title mt-1 text-xl font-bold text-ink">
                  Order Tracking & Production Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full p-1 text-ink/50 hover:bg-sand hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ORDER TRACKING TIMELINE */}
            <div className="mt-6 rounded-2xl bg-sand/30 p-5 border border-forest/10">
              <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest">
                <Truck className="h-4 w-4 text-terracotta" />
                <span>Production & Delivery Timeline (उत्पादन व वितरण समयरेखा)</span>
              </h4>

              {selectedOrder.status === "cancelled" ? (
                <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>This order has been cancelled. Please contact support for any refund or cancellation queries.</span>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {ORDER_LIFECYCLE_STAGES.map((stage, idx) => {
                    const currentIdx = getStageIndex(selectedOrder.status);
                    const isCompleted = currentIdx > idx;
                    const isCurrent = currentIdx === idx;
                    const isUpcoming = currentIdx < idx;

                    return (
                      <div key={stage.status} className="relative flex items-start gap-4">
                        {/* Connecting Line */}
                        {idx < ORDER_LIFECYCLE_STAGES.length - 1 && (
                          <div
                            className={`absolute left-3.5 top-7 h-10 w-0.5 transition-colors ${
                              isCompleted ? "bg-forest" : "bg-forest/15"
                            }`}
                          />
                        )}

                        {/* Step Marker */}
                        <div
                          className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                            isCompleted
                              ? "bg-forest text-white shadow-xs"
                              : isCurrent
                              ? "bg-terracotta text-white ring-4 ring-terracotta/20 animate-pulse"
                              : "border border-forest/20 bg-white text-ink/40"
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <span>{idx + 1}</span>
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <h5
                              className={`text-xs font-bold ${
                                isCurrent
                                  ? "text-terracotta font-extrabold"
                                  : isCompleted
                                  ? "text-forest"
                                  : "text-ink/50"
                              }`}
                            >
                              {stage.labelEn} ({stage.labelHi})
                            </h5>
                            {isCurrent && (
                              <span className="rounded-full bg-terracotta/10 px-2 py-0.5 text-[9px] font-bold text-terracotta">
                                Current Status
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-ink/65">
                            {stage.descriptionEn}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ORDER ITEMS BREAKDOWN */}
            <div className="mt-6 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70">
                Fulfilled Line Items & Craftsperson Allocations
              </h4>

              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-6 text-forest gap-2 text-xs">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading order items...</span>
                </div>
              ) : orderItems.length === 0 ? (
                <p className="text-xs text-ink/60 italic">No individual line items returned by server.</p>
              ) : (
                <div className="space-y-3">
                  {orderItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between rounded-xl border border-forest/10 bg-white p-3.5 text-xs shadow-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5 text-forest" />
                          <strong className="text-ink">
                            {item.artisan_business_name || `Craftsperson Batch #${idx + 1}`}
                          </strong>
                        </div>
                        <p className="text-[11px] text-ink/70 font-medium">
                          {item.product_title || `Handcrafted Units`}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-ink/60 text-[11px]">
                          {item.quantity} units @ ₹{item.unit_price.toLocaleString("en-IN")}
                        </span>
                        <p className="font-extrabold text-forest text-sm mt-0.5">
                          ₹{item.total_price.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Metrics Summary */}
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-forest/10 pt-4 text-xs">
              <div className="rounded-xl border border-forest/10 bg-sand/20 p-3">
                <span className="text-ink/60">Total Quantity:</span>
                <p className="mt-0.5 text-base font-extrabold text-ink">
                  {selectedOrder.quantity} units
                </p>
              </div>
              <div className="rounded-xl border border-forest/10 bg-sand/20 p-3">
                <span className="text-ink/60">Unit Price:</span>
                <p className="mt-0.5 text-base font-extrabold text-ink">
                  ₹{selectedOrder.unit_price.toLocaleString("en-IN")}
                </p>
              </div>
              <div className="rounded-xl border border-forest/10 bg-sand/20 p-3">
                <span className="text-ink/60">Total Order Value:</span>
                <p className="mt-0.5 text-base font-extrabold text-forest">
                  ₹{selectedOrder.total_price.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex justify-end border-t border-forest/10 pt-4">
              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-forest/20 px-5 py-2.5 text-xs font-bold text-ink/80 transition hover:bg-sand"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

