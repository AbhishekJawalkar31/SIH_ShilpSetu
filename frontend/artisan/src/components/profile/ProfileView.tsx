"use client";

import React from "react";
import {
  User,
  MapPin,
  Star,
  Phone,
  Mail,
  Store,
  Palette,
  Globe,
  LogOut,
  Hash,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Info,
  Calendar,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { ArtisanProfile } from "../../services/types";
import { useAuth } from "../../context/AuthContext";

interface ProfileViewProps {
  profile?: ArtisanProfile | null;
  isLoading?: boolean;
  lang: Language;
  onToggleLang: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  isLoading = false,
  lang,
  onToggleLang,
}) => {
  const t = translations[lang];
  const { user, logout } = useAuth();

  const displayName =
    user?.name || profile?.name || (lang === "hi" ? "विक्रेता" : "Seller");

  const businessName =
    profile?.business_name ||
    user?.business_name ||
    (lang === "hi" ? "शिल्प कार्यशाला" : "Craft Workshop");

  const craftType =
    profile?.craft_type ||
    user?.craft_type ||
    (lang === "hi" ? "पारंपरिक हस्तशिल्प" : "Traditional Handicrafts");

  const locationDisplay =
    profile?.city && profile?.state
      ? `${profile.city}, ${profile.state}`
      : user?.city && user?.state
      ? `${user.city}, ${user.state}`
      : profile?.location ||
        user?.city ||
        user?.state ||
        (lang === "hi" ? "भारत" : "India");

  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || "S";
  const sellerId = user?.artisan_id || user?.id || profile?.id || "";

  const formattedJoinDate =
    profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString(
          lang === "hi" ? "hi-IN" : "en-IN",
          {
            year: "numeric",
            month: "short",
            day: "numeric",
          }
        )
      : null;

  return (
    <div className="p-4 space-y-4 pb-20">
      {/* Header Profile Summary Card */}
      <div className="bg-white rounded-3xl p-5 border border-warmcream-border shadow-card text-center relative overflow-hidden">
        {/* Decorative background accent */}
        <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-terracotta/5 blur-xl pointer-events-none" />

        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-terracotta to-ochre text-white flex items-center justify-center font-black text-2xl mx-auto shadow-md ring-4 ring-warmcream">
          {avatarInitial}
        </div>

        <h2 className="text-base font-extrabold text-earthy-title mt-3">
          {displayName}
        </h2>

        <p className="text-xs text-terracotta font-bold mt-0.5">
          {businessName} • {craftType}
        </p>

        <p className="text-xs text-earthy-muted flex items-center justify-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5 text-terracotta" />
          <span>{locationDisplay}</span>
        </p>

        {/* Real Badges Row */}
        <div className="flex justify-center items-center gap-2 mt-3 pt-3 border-t border-stone-100 text-xs">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-terracotta-50 text-terracotta-800 font-bold text-[11px] border border-terracotta-200">
            <Store className="w-3 h-3 text-terracotta" />
            {t.sellerBadge}
          </span>

          {profile?.rating && profile.rating > 0 ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {profile.rating.toFixed(1)} {t.ratingLabel}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-warmcream/80 text-earthy-muted font-medium text-[11px] border border-warmcream-border">
              <Sparkles className="w-3 h-3 text-ochre" />
              {t.unratedBadge}
            </span>
          )}
        </div>
      </div>

      {/* Section 1: Contact Information */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
          {t.contactSectionTitle}
        </h3>

        <div className="space-y-2 text-xs">
          {/* Email */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-warmcream/50 border border-warmcream-border">
            <div className="flex items-center gap-2 text-earthy-muted">
              <Mail className="w-4 h-4 text-terracotta" />
              <span>{t.emailLabel}</span>
            </div>
            <span className="font-semibold text-earthy-title select-all">
              {user?.email || "—"}
            </span>
          </div>

          {/* Phone */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-warmcream/50 border border-warmcream-border">
            <div className="flex items-center gap-2 text-earthy-muted">
              <Phone className="w-4 h-4 text-terracotta" />
              <span>{t.phoneLabel}</span>
            </div>
            <span className="font-semibold text-earthy-title">
              {user?.phone || "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Account Details */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
          {t.accountSectionTitle}
        </h3>

        <div className="space-y-2 text-xs">
          {/* Seller ID */}
          {sellerId && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-warmcream/50 border border-warmcream-border">
              <div className="flex items-center gap-2 text-earthy-muted">
                <Hash className="w-4 h-4 text-terracotta" />
                <span>{t.sellerIdLabel}</span>
              </div>
              <span className="font-mono text-[11px] font-bold text-terracotta bg-white px-2 py-0.5 rounded-md border border-terracotta/20 select-all">
                #ART-{sellerId.slice(0, 8).toUpperCase()}
              </span>
            </div>
          )}

          {/* Role */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-warmcream/50 border border-warmcream-border">
            <div className="flex items-center gap-2 text-earthy-muted">
              <User className="w-4 h-4 text-terracotta" />
              <span>{t.roleLabel}</span>
            </div>
            <span className="font-bold text-earthy-title">
              {t.sellerRole}
            </span>
          </div>

          {/* Account Status */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-warmcream/50 border border-warmcream-border">
            <div className="flex items-center gap-2 text-earthy-muted">
              <CheckCircle2 className="w-4 h-4 text-craftgreen" />
              <span>{t.accountStatusLabel}</span>
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-craftgreen-50 text-craftgreen border border-craftgreen-200">
              {user?.is_active ? t.statusActive : t.statusInactive}
            </span>
          </div>

          {/* Joined Date if available */}
          {formattedJoinDate && (
            <div className="flex items-center justify-between p-2.5 rounded-2xl bg-warmcream/50 border border-warmcream-border">
              <div className="flex items-center gap-2 text-earthy-muted">
                <Calendar className="w-4 h-4 text-terracotta" />
                <span>{t.dateLabel}</span>
              </div>
              <span className="font-medium text-earthy-body">
                {formattedJoinDate}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Section 3: About Craft & Workshop (Displayed only when real data exists) */}
      {(profile?.description || (profile?.languages && profile.languages.length > 0)) && (
        <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
            {t.craftSectionTitle}
          </h3>

          {profile.description && (
            <div className="p-3 bg-warmcream/40 rounded-2xl border border-warmcream-border text-xs leading-relaxed text-earthy-body">
              {profile.description}
            </div>
          )}

          {profile.languages && profile.languages.length > 0 && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-earthy-muted font-medium">
                {t.languagesLabel}:
              </span>
              <div className="flex flex-wrap gap-1">
                {profile.languages.map((langItem, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-lg bg-stone-100 text-earthy-title font-semibold text-[10px]"
                  >
                    {langItem}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Truthful Read-Only Notice Banner */}
      <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-1">
        <div className="flex items-center gap-1.5 text-blue-900 font-bold text-[11px]">
          <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
          <span>{t.profileReadOnlyNotice}</span>
        </div>
        <p className="text-[11px] text-blue-800/80 leading-relaxed pl-5">
          {t.profileFutureNotice}
        </p>
      </div>

      {/* Section 4: App Settings & Language */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
          {t.settingsSectionTitle}
        </h3>

        {/* Working Language Toggle */}
        <div className="flex items-center justify-between p-3 rounded-2xl bg-warmcream/60 border border-warmcream-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-terracotta-50 text-terracotta flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-earthy-title block">
                {t.appLanguageLabel}
              </span>
              <span className="text-[10px] text-earthy-muted">
                {lang === "en" ? "English (Active)" : "हिन्दी (सक्रिय)"}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleLang}
            className="px-3 py-2 rounded-xl bg-terracotta text-white text-xs font-bold shadow-xs hover:bg-terracotta-700 transition active:scale-95 flex items-center gap-1.5"
            aria-label={t.switchLangBtn}
          >
            <span>{t.switchLangBtn}</span>
          </button>
        </div>

        {/* Security & Session Information */}
        <div className="p-3 rounded-2xl bg-craftgreen-50/50 border border-craftgreen-200 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-craftgreen mt-0.5 shrink-0" />
          <div>
            <span className="text-xs font-bold text-craftgreen-800 block">
              {t.securitySectionTitle}
            </span>
            <p className="text-[10px] text-earthy-muted mt-0.5 leading-relaxed">
              {t.securityNotice}
            </p>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 p-3.5 rounded-2xl bg-red-50 text-red-700 text-xs font-bold border border-red-200 hover:bg-red-100 transition active:scale-95 shadow-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>{t.logoutBtn}</span>
        </button>
      </div>
    </div>
  );
};
