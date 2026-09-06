import React, { useState } from "react";
import { Menu, Bell, User, X, ShieldCheck, MapPin, Sparkles } from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { ArtisanProfile } from "../../services/types";

interface HeaderProps {
  lang: Language;
  onToggleLang: () => void;
  profile: ArtisanProfile;
  activeScreen: string;
  onNavigate: (screen: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  lang,
  onToggleLang,
  profile,
  activeScreen,
  onNavigate,
}) => {
  const t = translations[lang];
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
                  {lang === "hi" ? "नमस्ते, सीता जी" : "Namaste, Sita"}
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-craftgreen-50 text-craftgreen-700 border border-craftgreen-200">
                  <ShieldCheck className="w-2.5 h-2.5 mr-0.5" />
                  Verified
                </span>
              </div>
              <p className="text-xs text-earthy-muted flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-terracotta" />
                {lang === "hi" ? "शिल्पकार • राजस्थान" : "Artisan • Rajasthan"}
              </p>
            </div>
          </div>

          {/* Right: Language switch, Notification bell, Avatar */}
          <div className="flex items-center gap-2">
            {/* Language Switcher Button (Large touch target for rural artisans) */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white border border-terracotta/30 text-terracotta font-semibold text-xs shadow-sm hover:bg-terracotta-50 transition-all active:scale-95"
              title="Change Language / भाषा बदलें"
            >
              <span className="font-bold text-[13px]">{lang === "en" ? "अ" : "A"}</span>
              <span className="text-[11px]">{t.langSwitch}</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl text-earthy-title hover:bg-warmcream-muted transition-colors active:scale-95"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-terracotta rounded-full ring-2 ring-warmcream" />
            </button>

            {/* Profile Avatar */}
            <button
              onClick={() => onNavigate("profile")}
              className="w-8 h-8 rounded-full bg-gradient-to-tr from-terracotta to-ochre text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white"
              aria-label="Artisan Profile"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick notification drawer */}
        {notificationsOpen && (
          <div className="mt-2 p-3 bg-white rounded-2xl shadow-card border border-warmcream-border animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-earthy-title">
                {lang === "hi" ? "सूचनाएं" : "Recent Alerts"}
              </span>
              <button
                onClick={() => setNotificationsOpen(false)}
                className="text-earthy-muted text-xs hover:text-earthy-title"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-xl bg-craftgreen-50 border border-craftgreen-100 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-craftgreen mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold text-craftgreen-700">
                    {lang === "hi" ? "नई थोक मांग! होटल ग्रीन वैली" : "New Bulk Request! Hotel Green Valley"}
                  </p>
                  <p className="text-[11px] text-earthy-muted">
                    {lang === "hi" ? "100 जूट बैग की मांग • बजट ₹700-₹750" : "100 Jute Bags requested • Budget ₹700-₹750"}
                  </p>
                </div>
              </div>
            </div>
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
              <div className="flex items-center justify-between pb-4 border-b border-warmcream-border">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-terracotta flex items-center justify-center text-white font-bold">
                    श
                  </div>
                  <div>
                    <h2 className="font-bold text-sm text-earthy-title">ShilpSetu</h2>
                    <p className="text-[11px] text-earthy-muted">Artisan Portal • शिल्प सेतु</p>
                  </div>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1.5 rounded-lg text-earthy-muted hover:bg-warmcream-muted"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Artisan Summary */}
              <div className="mt-4 p-3 bg-terracotta-50 rounded-2xl border border-terracotta-100">
                <p className="font-bold text-xs text-terracotta-800">{profile.business_name}</p>
                <p className="text-[11px] text-earthy-body mt-0.5">{profile.craft_type}</p>
                <div className="mt-2 flex items-center justify-between text-[11px] text-earthy-muted font-medium">
                  <span>⭐ {profile.rating} Rating</span>
                  <span>📍 {profile.city}</span>
                </div>
              </div>

              {/* Navigation Items */}
              <div className="mt-5 space-y-1">
                {[
                  { id: "dashboard", label: lang === "hi" ? "डैशबोर्ड (होम)" : "Dashboard (Home)" },
                  { id: "products", label: lang === "hi" ? "मेरे उत्पाद (12)" : "My Products (12)" },
                  { id: "add", label: lang === "hi" ? "नया उत्पाद जोड़ें" : "Add New Product" },
                  { id: "requests", label: lang === "hi" ? "ऑर्डर व थोक मांग" : "Orders & Bulk Requests" },
                  { id: "profile", label: lang === "hi" ? "मेरी प्रोफ़ाइल" : "Artisan Profile" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      onNavigate(item.id);
                      setMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      activeScreen === item.id
                        ? "bg-terracotta text-white font-semibold"
                        : "text-earthy-body hover:bg-warmcream-muted"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom: Language switch in menu */}
            <div className="pt-4 border-t border-warmcream-border space-y-3">
              <button
                onClick={onToggleLang}
                className="w-full flex items-center justify-between p-2.5 rounded-xl bg-warmcream-muted text-xs font-semibold text-earthy-title"
              >
                <span>{lang === "hi" ? "भाषा बदलें (Language)" : "Switch Language"}</span>
                <span className="px-2 py-1 bg-white rounded-md text-terracotta font-bold border border-terracotta/20">
                  {lang === "hi" ? "English" : "हिन्दी"}
                </span>
              </button>
              <p className="text-[10px] text-center text-earthy-muted">
                ShilpSetu MVP v0.1 • Artisan First
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

