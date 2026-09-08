"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Layers,
  Building2,
  AlertCircle,
  RefreshCw,
  Eye,
  Check,
  Package,
  Sparkles,
  ChevronRight,
  X,
  FileText,
  DollarSign,
  Calendar,
} from "lucide-react";
import { useCustomerAuth } from "../../../context/CustomerAuthContext";
import {
  getQuotes,
  getQuote,
  acceptQuote,
  ApiError,
} from "../../../services/customerApi";
import {
  QuoteResponse,
  QuoteAcceptResponse,
  QuoteStatus,
} from "../../../services/types";

export default function CustomerQuotesPage() {
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomerAuth();

  const [quotes, setQuotes] = useState<QuoteResponse[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Selected Quote Modal State
  const [selectedQuote, setSelectedQuote] = useState<QuoteResponse | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Quote Acceptance State
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [acceptResult, setAcceptResult] = useState<QuoteAcceptResponse | null>(null);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Fetch Quotes
  const fetchQuotesList = useCallback(async () => {
    if (!isAuthenticated || !customer?.id) {
      setIsLoading(false);
      setQuotes([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params: { buyer_id?: string; status?: QuoteStatus } = {
        buyer_id: customer.id,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter as QuoteStatus;
      }

      const res = await getQuotes(params);
      if (res && res.quotes) {
        setQuotes(res.quotes);
      } else {
        setQuotes([]);
      }
    } catch (err: unknown) {
      console.warn("Backend quotes list error:", err);
      setQuotes([]);
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
    fetchQuotesList();
  }, [fetchQuotesList]);

  // Open Quote Details
  const handleOpenDetail = async (quote: QuoteResponse) => {
    setSelectedQuote(quote);
    setAcceptResult(null);
    setAcceptError(null);

    // If UUID format, attempt live detail refresh
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      quote.id
    );
    if (isUuid) {
      setIsLoadingDetail(true);
      try {
        const freshQuote = await getQuote(quote.id);
        setSelectedQuote(freshQuote);
      } catch (err) {
        console.warn("Could not fetch fresh quote detail:", err);
      } finally {
        setIsLoadingDetail(false);
      }
    }
  };

  // Accept Quote Action
  const handleAcceptQuote = async (quoteId: string) => {
    setIsAccepting(true);
    setAcceptError(null);
    try {
      const res = await acceptQuote(quoteId);
      setAcceptResult(res);

      // Update local state
      setQuotes((prev) =>
        prev.map((q) =>
          q.id === quoteId ? { ...q, status: "accepted" as QuoteStatus } : q
        )
      );
      if (selectedQuote && selectedQuote.id === quoteId) {
        setSelectedQuote({ ...selectedQuote, status: "accepted" as QuoteStatus });
      }
    } catch (err: unknown) {
      console.warn("Accept quote API error:", err);
      const msg =
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Unable to accept quote and place order on ShilpSetu services. Please try again. / ShilpSetu सेवा पर कोटेशन स्वीकार कर ऑर्डर नहीं बनाया जा सका। कृपया पुनः प्रयास करें।";
      setAcceptError(msg);
    } finally {
      setIsAccepting(false);
    }
  };

  // Status Badge Colors & Labels
  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case "pending":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          label: "Pending Review / प्रतीक्षारत",
        };
      case "responded":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          label: "Quotes Received / प्राप्त",
        };
      case "accepted":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "Order Placed / स्वीकृत",
        };
      case "rejected":
        return {
          bg: "bg-rose-50 text-rose-800 border-rose-200",
          label: "Declined / अस्वीकृत",
        };
      case "closed":
        return {
          bg: "bg-gray-100 text-gray-700 border-gray-200",
          label: "Closed / समाप्त",
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-700 border-gray-200",
          label: status,
        };
    }
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
              <span className="font-semibold text-forest">My Quotes (मेरे कोटेशन)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/buyer/custom-request"
              className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-1.5 text-xs font-bold text-white transition hover:bg-forest/90"
            >
              <Sparkles className="h-3.5 w-3.5 text-terracotta" />
              <span>New Bulk Request / नया अनुरोध</span>
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
              <Layers className="h-3.5 w-3.5 text-terracotta" />
              <span>Customer Quote Management</span>
              <span className="text-ink/40">•</span>
              <span>कोटेशन प्रबंधन</span>
            </div>
            <h1 className="font-serif-title mt-2 text-3xl font-bold tracking-tight text-ink">
              My B2B & Custom Quotes
            </h1>
            <p className="text-xs text-ink/70 mt-1">
              Track multi-seller allocations, view craft estimates, and accept quotes to convert them directly into confirmed orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchQuotesList}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-white px-3.5 py-2 text-xs font-semibold text-forest transition hover:bg-sand disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error / Offline Alert */}
        {error && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchQuotesList}
              className="font-bold underline hover:text-red-900 ml-4 shrink-0"
            >
              Retry / पुनः प्रयास करें
            </button>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-forest/10 pb-4">
          {[
            { id: "all", label: "All Quotes / सभी" },
            { id: "pending", label: "Pending Review / प्रतीक्षारत" },
            { id: "responded", label: "Quotes Ready / प्राप्त" },
            { id: "accepted", label: "Accepted / स्वीकृत" },
            { id: "closed", label: "Closed / समाप्त" },
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

        {/* Quotes List */}
        {authLoading || isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center space-y-3 py-12 text-forest">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="text-xs font-semibold">Loading your quotes from ShilpSetu network...</p>
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
              Please sign in with your customer account to view and manage your quotes. / अपने कोटेशन देखने और प्रबंधित करने के लिए कृपया लॉगिन करें।
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
        ) : quotes.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-forest/10 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand text-forest">
              <Layers className="h-6 w-6 text-terracotta" />
            </div>
            <h3 className="font-serif-title mt-4 text-lg font-bold text-ink">
              No Quote Requests Found
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink/60">
              You have not submitted any bulk craft requirements under this status yet.
            </p>
            <div className="mt-6">
              <Link
                href="/buyer/custom-request"
                className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white transition hover:bg-forest/90"
              >
                <Sparkles className="h-3.5 w-3.5 text-terracotta" />
                <span>Submit Your First Custom Requirement</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {quotes.map((quote) => {
              const statusBadge = getStatusBadge(quote.status);
              const totalAmount =
                quote.total_budget ||
                (quote.budget_per_unit ? quote.budget_per_unit * quote.quantity : 0);

              return (
                <div
                  key={quote.id}
                  className="rounded-2xl border border-forest/15 bg-white p-5 shadow-xs transition hover:border-forest/40 hover:shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-forest">
                          #{quote.id.slice(0, 12)}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${statusBadge.bg}`}
                        >
                          {statusBadge.label}
                        </span>
                        <span className="text-[11px] text-ink/40">
                          {new Date(quote.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="font-serif-title text-base font-bold text-ink line-clamp-1">
                        {quote.requirement_text}
                      </h3>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleOpenDetail(quote)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-sand/40 px-4 py-2 text-xs font-bold text-forest transition hover:bg-sand"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>View Allocations / विवरण</span>
                      </button>

                      {quote.status !== "accepted" && quote.status !== "closed" && (
                        <button
                          onClick={() => handleAcceptQuote(quote.id)}
                          disabled={isAccepting}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-forest/90 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Accept Quote / स्वीकार करें</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="mt-4 grid grid-cols-2 gap-3 border-t border-forest/10 pt-3 sm:grid-cols-4 text-xs">
                    <div>
                      <span className="text-ink/60">Required Quantity:</span>
                      <p className="font-bold text-ink mt-0.5">{quote.quantity} units</p>
                    </div>

                    <div>
                      <span className="text-ink/60">Unit Budget:</span>
                      <p className="font-bold text-ink mt-0.5">
                        ₹{quote.budget_per_unit ? quote.budget_per_unit.toLocaleString("en-IN") : "Custom Quote"}
                      </p>
                    </div>

                    <div>
                      <span className="text-ink/60">Estimated Total:</span>
                      <p className="font-bold text-forest mt-0.5">
                        ₹{totalAmount.toLocaleString("en-IN")}
                      </p>
                    </div>

                    <div>
                      <span className="text-ink/60">Allocated Sellers:</span>
                      <p className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        <span>{quote.allocations?.length || 0} Sellers Assigned</span>
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Quote Details & Acceptance Modal */}
      {selectedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-forest/15">
            <div className="flex items-center justify-between border-b border-forest/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-forest">
                    Quote #{selectedQuote.id}
                  </span>
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      getStatusBadge(selectedQuote.status).bg
                    }`}
                  >
                    {getStatusBadge(selectedQuote.status).label}
                  </span>
                </div>
                <h3 className="font-serif-title mt-1 text-xl font-bold text-ink">
                  Requirement Specifications & Allocation
                </h3>
              </div>
              <button
                onClick={() => setSelectedQuote(null)}
                className="rounded-full p-1 text-ink/50 hover:bg-sand hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Requirement Detail */}
            <div className="mt-4 space-y-4">
              <div className="rounded-xl bg-sand/30 p-4 border border-forest/10">
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink/60">
                  Natural Language Requirement:
                </span>
                <p className="mt-1 text-sm text-ink leading-relaxed font-medium">
                  {selectedQuote.requirement_text}
                </p>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl border border-forest/10 bg-white p-3">
                  <span className="text-ink/60">Total Quantity:</span>
                  <p className="mt-0.5 text-base font-extrabold text-ink">
                    {selectedQuote.quantity} units
                  </p>
                </div>
                <div className="rounded-xl border border-forest/10 bg-white p-3">
                  <span className="text-ink/60">Unit Budget:</span>
                  <p className="mt-0.5 text-base font-extrabold text-ink">
                    ₹{selectedQuote.budget_per_unit || "Open"}
                  </p>
                </div>
                <div className="rounded-xl border border-forest/10 bg-white p-3">
                  <span className="text-ink/60">Total Budget:</span>
                  <p className="mt-0.5 text-base font-extrabold text-forest">
                    ₹{(selectedQuote.total_budget || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Multi-Artisan Allocations */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink/70">
                  Allocated Registered Sellers (आवंटित पंजीकृत विक्रेता)
                </h4>
                <div className="mt-3 space-y-3">
                  {selectedQuote.allocations && selectedQuote.allocations.length > 0 ? (
                    selectedQuote.allocations.map((alloc, idx) => (
                      <div
                        key={alloc.id || idx}
                        className="flex items-center justify-between rounded-xl border border-forest/10 bg-sand/20 p-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-forest" />
                            <strong className="text-ink">
                              {alloc.business_name || alloc.artisan_name || `Artisan Cluster ${idx + 1}`}
                            </strong>
                          </div>
                          {(alloc.city || alloc.state) && (
                            <p className="text-[11px] text-ink/60">
                              {[alloc.city, alloc.state].filter(Boolean).join(", ")}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            {Math.round(alloc.match_score * 100)}% Match
                          </span>
                          <p className="font-extrabold text-forest mt-1 text-sm">
                            {alloc.matched_quantity} units
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-ink/50 italic">
                      Multi-seller allocation is in progress. Sellers are reviewing capacity.
                    </p>
                  )}
                </div>
              </div>

              {/* Acceptance Feedback / Result */}
              {acceptResult && (
                <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Order Confirmed Successfully!</span>
                  </div>
                  <p className="mt-1 text-emerald-700">
                    Generated Order ID: <strong className="font-mono">{acceptResult.order.id}</strong>.
                    Total: <strong>₹{acceptResult.order.total_price.toLocaleString("en-IN")}</strong> across {acceptResult.order.items?.length || 1} seller batches.
                  </p>
                </div>
              )}

              {acceptError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{acceptError}</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex items-center justify-between border-t border-forest/10 pt-4">
              <button
                onClick={() => setSelectedQuote(null)}
                className="rounded-xl border border-forest/20 px-4 py-2 text-xs font-bold text-ink/80 transition hover:bg-sand"
              >
                Close
              </button>

              {selectedQuote.status !== "accepted" && (
                <button
                  onClick={() => handleAcceptQuote(selectedQuote.id)}
                  disabled={isAccepting}
                  className="inline-flex items-center gap-2 rounded-xl bg-forest px-5 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-forest/90 disabled:opacity-50"
                >
                  {isAccepting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Converting to Order...</span>
                    </>
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Accept Quote & Place Order / कोट स्वीकार करें</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
