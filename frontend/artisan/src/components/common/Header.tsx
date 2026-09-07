"use client";

import React, { useState } from "react";
import {
  Menu,
  Bell,
  User,
  X,
  MapPin,
  Sparkles,
  LogOut,
  ChevronRight,
  Store,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { useAuth } from "../../context/AuthContext";
import { BackendNotification } from "../../services/types";
import { Check, CheckCheck, RefreshCw } from "lucide-react";

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  activeScreen: string;
  onNavigate: (screen: string) => void;
  unreadCount?: number;
  notifications?: BackendNotification[];
  isLoadingNotifications?: boolean;
  onMarkNotificationRead?: (notificationId: string) => Promise<void>;
  onRefreshNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  activeScreen,
  onNavigate,
  unreadCount = 0,
  notifications = [],
  isLoadingNotifications = false,
  onMarkNotificationRead,
  onRefreshNotifications,
}) => {
  const t = translations[lang];
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);

  const handleMarkRead = async (id: string) => {
    if (!onMarkNotificationRead || markingId) return;
    setMarkingId(id);
    setReadError(null);
    try {
      await onMarkNotificationRead(id);
    } catch (err: any) {
      setReadError(
        err.message ||
          (lang === "hi"
            ? "सूचना अद्यतन करने में विफल।"
            : "Failed to update notification.")
      );
    } finally {
      setMarkingId(null);
    }
  };

  const firstName = user?.name ? user.name.trim().split(" ")[0] : "";
  const displayName = firstName
    ? firstName
    : lang === "hi"
    ? "विक्रेता"
    : "Seller";

  const locationDisplay =
    user?.city && user?.state
      ? `${user.city}, ${user.state}`
      : user?.city || user?.state || (lang === "hi" ? "भारत" : "India");

  const craftDisplay =
    user?.craft_type ||
    (lang === "hi" ? "शिल्प विक्रेता" : "Craft Seller");

  const avatarInitial = user?.name
    ? user.name.trim().charAt(0).toUpperCase()
    : "S";

  return (
    <>
      <header className="sticky top-0 z-30 bg-warmcream/95 backdrop-blur-md border-b border-warmcream-border px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left: Menu & Greeting */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-xl text-earthy-title hover:bg-warmcream-muted transition-colors active:scale-95"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-earthy-title text-base leading-tight tracking-tight">
                  {lang === "hi"
                    ? `नमस्ते, ${displayName}`
                    : `Namaste, ${displayName}`}
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-terracotta-50 text-terracotta-800 border border-terracotta-200">
                  <Store className="w-2.5 h-2.5 mr-0.5 text-terracotta" />
                  {t.sellerBadge}
                </span>
              </div>
              <p className="text-xs text-earthy-muted flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-terracotta" />
                <span>{craftDisplay} • {locationDisplay}</span>
              </p>
            </div>
          </div>

          {/* Right: Language switch, Notification bell, Avatar */}
          <div className="flex items-center gap-2">
            {/* Language Switcher Button */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-terracotta/30 text-terracotta font-semibold text-xs shadow-sm hover:bg-terracotta-50 transition-all active:scale-95"
              title="Change Language / भाषा बदलें"
            >
              <span className="font-bold text-[13px]">
                {lang === "en" ? "अ" : "A"}
              </span>
              <span className="text-[11px]">{t.langSwitch}</span>
            </button>

            {/* Notification Bell with Real Backend Badge */}
            <button
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                if (!notificationsOpen && onRefreshNotifications) {
                  onRefreshNotifications();
                }
              }}
              className="relative p-2 rounded-xl text-earthy-title hover:bg-warmcream-muted transition-colors active:scale-95"
              aria-label={t.notificationsTitle}
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-terracotta text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-warmcream shadow-xs">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => onNavigate("profile")}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-terracotta to-ochre text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white"
              aria-label="Seller Profile"
            >
              {avatarInitial}
            </button>
          </div>
        </div>

        {/* Real Backend Notification Drawer */}
        {notificationsOpen && (
          <div className="mt-2.5 p-3.5 bg-white rounded-2xl shadow-card border border-warmcream-border animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-earthy-title">
                  {t.notificationsTitle}
                </span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta font-bold text-[10px] border border-terracotta-200">
                    {unreadCount} {t.unreadBadge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {onRefreshNotifications && (
                  <button
                    onClick={onRefreshNotifications}
                    className="p-1 rounded-lg text-earthy-muted hover:text-earthy-title hover:bg-stone-100 transition-colors"
                    title="Refresh notifications"
                    disabled={isLoadingNotifications}
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${
                        isLoadingNotifications ? "animate-spin text-terracotta" : ""
                      }`}
                    />
                  </button>
                )}
                <button
                  onClick={() => setNotificationsOpen(false)}
                  className="w-6 h-6 flex items-center justify-center rounded-lg text-stone-400 hover:text-earthy-title text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {readError && (
              <div className="p-2 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-semibold">
                {readError}
              </div>
            )}

            {/* Notifications List */}
            {isLoadingNotifications && notifications.length === 0 ? (
              <div className="py-4 text-center text-xs text-earthy-muted space-y-1">
                <div className="w-4 h-4 border-2 border-terracotta border-t-transparent rounded-full animate-spin mx-auto" />
                <p>{t.loadingNotifications}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-5 text-center space-y-1.5">
                <CheckCheck className="w-8 h-8 text-craftgreen/60 mx-auto" />
                <p className="text-xs font-bold text-earthy-title">
                  {t.noNewNotifications}
                </p>
                <p className="text-[11px] text-earthy-muted max-w-xs mx-auto leading-relaxed">
                  {t.noNotificationsDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {notifications.map((notif) => {
                  const formattedTime = new Date(notif.created_at).toLocaleTimeString(
                    lang === "hi" ? "hi-IN" : "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  );

                  return (
                    <div
                      key={notif.id}
                      className={`p-2.5 rounded-xl border text-xs space-y-1.5 transition-colors ${
                        notif.is_read
                          ? "bg-stone-50 border-stone-200/80 opacity-75"
                          : "bg-terracotta-50/40 border-terracotta-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-lg bg-terracotta-50 text-terracotta flex items-center justify-center shrink-0 mt-0.5">
                            <Sparkles className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-xs text-earthy-title leading-tight">
                              {notif.title}
                            </p>
                            <p className="text-[11px] text-earthy-body mt-0.5 leading-relaxed">
                              {notif.message}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] text-stone-400 shrink-0">
                          {formattedTime}
                        </span>
                      </div>

                      {!notif.is_read && onMarkNotificationRead && (
                        <div className="flex justify-end pt-1">
                          <button
                            onClick={() => handleMarkRead(notif.id)}
                            disabled={markingId === notif.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-terracotta/30 text-terracotta text-[10px] font-bold shadow-2xs hover:bg-terracotta-50 active:scale-95 transition-all disabled:opacity-50"
                          >
                            <Check className="w-3 h-3" />
                            <span>
                              {markingId === notif.id
                                ? t.markingAsRead
                                : t.markAsRead}
                            </span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Side Menu Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative w-72 bg-white h-full shadow-2xl p-5 flex flex-col justify-between z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Top */}
              <div className="flex items-center justify-between pb-4 border-b border-warmcream-border">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-terracotta flex items-center justify-center text-white font-black text-base shadow-xs">
                    श
                  </div>
                  <div>
                    <h2 className="font-extrabold text-sm text-earthy-title leading-tight">
                      ShilpSetu
                    </h2>
                    <p className="text-[11px] text-terracotta font-semibold">
                      {lang === "hi"
                        ? "विक्रेता पोर्टल • Seller Side"
                        : "Seller Portal • विक्रेता पक्ष"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-lg text-earthy-muted hover:bg-warmcream-muted"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Seller Summary Box */}
              <div className="mt-4 p-3.5 bg-terracotta-50 rounded-2xl border border-terracotta-100">
                <p className="font-bold text-xs text-terracotta-900">
                  {user?.business_name || user?.name || "ShilpSetu Seller"}
                </p>
                <p className="text-[11px] text-earthy-body mt-0.5">
                  {craftDisplay}
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-earthy-muted font-medium">
                  <span className="text-terracotta font-semibold">
                    📍 {locationDisplay}
                  </span>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-terracotta/20 text-terracotta font-bold">
                    {user?.email || "Seller Account"}
                  </span>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="mt-5 space-y-1">
                {[
                  {
                    id: "dashboard",
                    label:
                      lang === "hi"
                        ? "डैशबोर्ड (होम)"
                        : "Dashboard (Home)",
                  },
                  {
                    id: "products",
                    label:
                      lang === "hi"
                        ? "मेरे उत्पाद सूची"
                        : "My Products",
                  },
                  {
                    id: "add",
                    label:
                      lang === "hi"
                        ? "नया उत्पाद जोड़ें"
                        : "Add New Product",
                  },
                  {
                    id: "requests",
                    label:
                      lang === "hi"
                        ? "ऑर्डर व थोक मांग"
                        : "Orders & Bulk Requests",
                  },
                  {
                    id: "profile",
                    label:
                      lang === "hi"
                        ? "मेरी विक्रेता प्रोफ़ाइल"
                        : "Seller Profile",
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-between ${
                      activeScreen === item.id
                        ? "bg-terracotta text-white font-semibold shadow-xs"
                        : "text-earthy-body hover:bg-warmcream-muted"
                    }`}
                  >
                    <span>{item.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom: Language switch & Logout */}
            <div className="pt-4 border-t border-warmcream-border space-y-2">
              <button
                onClick={onToggleLang}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-warmcream-muted text-xs font-semibold text-earthy-title hover:bg-stone-200/60 transition"
              >
                <span>
                  {lang === "hi"
                    ? "भाषा बदलें (Language)"
                    : "Switch Language"}
                </span>
                <span className="px-2 py-1 bg-white rounded-md text-terracotta font-bold border border-terracotta/20 text-[11px]">
                  {lang === "hi" ? "English" : "हिन्दी"}
                </span>
              </button>

              {/* Working Logout Button */}
              <button
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-bold border border-red-200 hover:bg-red-100 transition active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.logoutBtn}</span>
              </button>

              <p className="text-[10px] text-center text-earthy-muted pt-1">
                ShilpSetu Seller Portal • Real Auth
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
