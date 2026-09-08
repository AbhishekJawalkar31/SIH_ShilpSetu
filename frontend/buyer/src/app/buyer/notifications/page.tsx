"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock,
  AlertCircle,
  RefreshCw,
  Check,
  Package,
  Layers,
  Sparkles,
  Mail,
  MailOpen,
  Filter,
} from "lucide-react";
import { useCustomerAuth } from "../../../context/CustomerAuthContext";
import {
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  ApiError,
} from "../../../services/customerApi";
import { NotificationResponse } from "../../../services/types";

export default function CustomerNotificationsPage() {
  const { customer, isAuthenticated, isLoading: authLoading } = useCustomerAuth();

  const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "unread">("all");
  const [markingIds, setMarkingIds] = useState<Record<string, boolean>>({});

  // Fetch notifications from real backend
  const fetchCustomerNotifications = useCallback(async () => {
    if (!isAuthenticated || !customer?.id) {
      setIsLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const params = { user_id: customer.id };
      const res =
        filterMode === "unread"
          ? await getUnreadNotifications(params)
          : await getNotifications(params);

      if (res && res.items) {
        setNotifications(res.items);
        setUnreadCount(res.unread_count ?? res.items.filter((n) => !n.is_read).length);
      } else {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err: unknown) {
      console.warn("Backend notifications API error:", err);
      setNotifications([]);
      const msg =
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Unable to connect to ShilpSetu notification service. Please try again. / ShilpSetu सूचना सेवा से कनेक्शन नहीं हो सका। कृपया पुनः प्रयास करें।";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [customer?.id, isAuthenticated, filterMode]);

  useEffect(() => {
    fetchCustomerNotifications();
  }, [fetchCustomerNotifications]);

  // Mark a single notification as read on the backend
  const handleMarkAsRead = async (notificationId: string) => {
    setMarkingIds((prev) => ({ ...prev, [notificationId]: true }));
    try {
      const updated = await markNotificationRead(notificationId);
      // Only update local state after real backend confirms success
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err: unknown) {
      console.warn("Could not mark notification as read:", err);
      // Do not update UI state if backend request failed
    } finally {
      setMarkingIds((prev) => ({ ...prev, [notificationId]: false }));
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
              <span className="font-semibold text-forest">Notifications (सूचनाएं)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/buyer/orders"
              className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-sand/40 px-3.5 py-1.5 text-xs font-bold text-forest transition hover:bg-sand"
            >
              <Package className="h-3.5 w-3.5" />
              <span>My Orders / ऑर्डर</span>
            </Link>
            <Link
              href="/buyer/quotes"
              className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-sand/40 px-3.5 py-1.5 text-xs font-bold text-forest transition hover:bg-sand"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>My Quotes / कोटेशन</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-forest/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white px-3 py-0.5 text-xs font-semibold text-forest">
              <Bell className="h-3.5 w-3.5 text-terracotta" />
              <span>Customer In-App Notifications</span>
              <span className="text-ink/40">•</span>
              <span>ग्राहक सूचना केंद्र</span>
            </div>
            <h1 className="font-serif-title mt-2 text-3xl font-bold tracking-tight text-ink">
              Notifications
            </h1>
            <p className="text-xs text-ink/70 mt-1">
              Real-time updates regarding quote responses, workshop allocation status, and confirmed orders.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchCustomerNotifications}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-white px-3.5 py-2 text-xs font-semibold text-forest transition hover:bg-sand disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
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
              onClick={fetchCustomerNotifications}
              className="font-bold underline hover:text-red-900 ml-4 shrink-0"
            >
              Retry / पुनः प्रयास करें
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="mt-6 flex items-center justify-between border-b border-forest/10 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode("all")}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                filterMode === "all"
                  ? "bg-forest text-white shadow-xs"
                  : "border border-forest/15 bg-white text-ink/70 hover:bg-sand"
              }`}
            >
              All Notifications / सभी
            </button>
            <button
              onClick={() => setFilterMode("unread")}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                filterMode === "unread"
                  ? "bg-forest text-white shadow-xs"
                  : "border border-forest/15 bg-white text-ink/70 hover:bg-sand"
              }`}
            >
              <span>Unread / अपठित</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-terracotta px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Notification List */}
        {authLoading || isLoading ? (
          <div className="mt-12 flex flex-col items-center justify-center space-y-3 py-12 text-forest">
            <RefreshCw className="h-8 w-8 animate-spin" />
            <p className="text-xs font-semibold">Loading notifications from server...</p>
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
              Please sign in with your customer account to view your notifications. / अपनी सूचनाएं देखने के लिए कृपया लॉगिन करें।
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
        ) : notifications.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-forest/10 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-sand text-forest">
              <Bell className="h-6 w-6 text-terracotta" />
            </div>
            <h3 className="font-serif-title mt-4 text-lg font-bold text-ink">
              No Notifications Found
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs text-ink/60">
              {filterMode === "unread"
                ? "You have no unread notifications at this time."
                : "Your notifications inbox is completely up to date."}
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {notifications.map((notif) => {
              const isMarking = markingIds[notif.id];

              return (
                <div
                  key={notif.id}
                  className={`rounded-2xl border p-4 shadow-xs transition ${
                    notif.is_read
                      ? "border-forest/10 bg-white text-ink/80"
                      : "border-forest/30 bg-emerald-50/40 text-ink shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                          notif.is_read
                            ? "bg-forest/5 text-forest"
                            : "bg-terracotta/10 text-terracotta ring-2 ring-terracotta/20"
                        }`}
                      >
                        {notif.is_read ? (
                          <MailOpen className="h-4 w-4" />
                        ) : (
                          <Mail className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-ink">{notif.title}</h4>
                          {!notif.is_read && (
                            <span className="rounded-full bg-terracotta px-2 py-0.2 text-[9px] font-extrabold text-white uppercase tracking-wider">
                              New / नया
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-ink/75 leading-relaxed">{notif.message}</p>

                        <div className="flex items-center gap-3 pt-1 text-[11px] text-ink/45">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(notif.created_at).toLocaleString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </span>
                          {notif.reference_type && (
                            <span className="rounded-md bg-sand/60 px-1.5 py-0.5 text-[10px] font-mono text-ink/60">
                              Ref: {notif.reference_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!notif.is_read && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        disabled={isMarking}
                        className="shrink-0 inline-flex items-center gap-1 rounded-xl border border-forest/20 bg-white px-3 py-1.5 text-xs font-bold text-forest transition hover:bg-sand disabled:opacity-50"
                      >
                        {isMarking ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5" />
                        )}
                        <span>Mark as Read / पढ़ा हुआ चिन्हित करें</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

