"use client";

import React, { useState } from "react";
import {
  User,
  Mail,
  Lock,
  Phone,
  Store,
  Palette,
  MapPin,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { useAuth } from "../../context/AuthContext";

interface SellerRegisterFormProps {
  lang: Language;
  onToggleLang: () => void;
  onSwitchToLogin: () => void;
}

export const SellerRegisterForm: React.FC<SellerRegisterFormProps> = ({
  lang,
  onToggleLang,
  onSwitchToLogin,
}) => {
  const t = translations[lang];
  const { register, error, clearError } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [craftType, setCraftType] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!name.trim() || !email.trim() || !password.trim()) {
      setLocalError(
        lang === "hi"
          ? "कृपया नाम, ईमेल और पासवर्ड भरें।"
          : "Please fill in your name, email, and password."
      );
      return;
    }

    if (password.length < 6) {
      setLocalError(
        lang === "hi"
          ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।"
          : "Password must be at least 6 characters long."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim() || undefined,
        business_name: businessName.trim() || undefined,
        craft_type: craftType.trim() || undefined,
        city: city.trim() || undefined,
        state: stateVal.trim() || undefined,
        role: "artisan", // Enforced as backend expects artisan role
      });
    } catch (err: any) {
      console.warn("Seller registration error:", err);
      // AuthContext populates error
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-full flex flex-col justify-between p-5 bg-warmcream">
      {/* Top Bar */}
      <div>
        <div className="flex items-center justify-between pt-2 pb-4">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="flex items-center gap-1 text-xs font-bold text-earthy-muted hover:text-earthy-title transition active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.signInBtn}</span>
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-terracotta/30 text-terracotta font-bold text-xs shadow-xs hover:bg-terracotta-50 transition-all active:scale-95"
            title="Switch Language / भाषा बदलें"
          >
            <span className="font-bold text-[13px]">{lang === "en" ? "अ" : "A"}</span>
            <span className="text-[11px]">{t.langSwitch}</span>
          </button>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-br from-terracotta via-terracotta-700 to-terracotta-800 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden mb-5">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-ochre/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold mb-2 backdrop-blur-xs">
              <Sparkles className="w-3 h-3 text-ochre-light" />
              <span>{lang === "hi" ? "नया विक्रेता पंजीकरण" : "New Seller Onboarding"}</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              {t.registerTitle}
            </h2>
            <p className="text-xs text-white/85 mt-1 leading-relaxed">
              {t.registerSub}
            </p>
          </div>
        </div>

        {/* Error Alert Box */}
        {displayError && (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <p className="leading-snug">{displayError}</p>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
              {t.fullNameLabel} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
              {t.emailLabel} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seller@shilpsetu.in"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
              {t.passwordLabel} *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-10 pr-11 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-400 hover:text-earthy-title transition"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
              {t.phoneLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Phone className="w-4 h-4" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Business / Workshop Name */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
              {t.businessNameLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Store className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Jaipur Terracotta Studio"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Craft Type */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
              {t.regCraftTypeLabel}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Palette className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={craftType}
                onChange={(e) => setCraftType(e.target.value)}
                placeholder="e.g. Terracotta Pottery, Handblock Print"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Location: City & State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
                {t.cityLabel}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jaipur"
                  className="w-full pl-8 pr-2.5 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1">
                {t.stateLabel}
              </label>
              <input
                type="text"
                value={stateVal}
                onChange={(e) => setStateVal(e.target.value)}
                placeholder="Rajasthan"
                className="w-full px-3 py-2.5 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-3 py-3.5 px-4 rounded-2xl bg-terracotta hover:bg-terracotta-700 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t.registering}</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>{t.registerBtn}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Switch to Login */}
      <div className="pt-6 pb-2 text-center">
        <div className="p-4 rounded-2xl bg-white border border-warmcream-border shadow-xs">
          <p className="text-xs text-earthy-muted">
            {t.hasAccount}{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-terracotta font-extrabold hover:underline ml-1"
            >
              {t.signInLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
