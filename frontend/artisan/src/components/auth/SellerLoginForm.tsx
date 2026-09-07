"use client";

import React, { useState } from "react";
import { Lock, Mail, Eye, EyeOff, LogIn, AlertCircle, Sparkles } from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { useAuth } from "../../context/AuthContext";

interface SellerLoginFormProps {
  lang: Language;
  onToggleLang: () => void;
  onSwitchToRegister: () => void;
}

export const SellerLoginForm: React.FC<SellerLoginFormProps> = ({
  lang,
  onToggleLang,
  onSwitchToRegister,
}) => {
  const t = translations[lang];
  const { login, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email.trim() || !password.trim()) {
      setLocalError(
        lang === "hi"
          ? "कृपया ईमेल और पासवर्ड दोनों दर्ज करें।"
          : "Please enter both email and password."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        email: email.trim(),
        password: password.trim(),
      });
    } catch (err: any) {
      console.warn("Seller login error:", err);
      // AuthContext sets error state automatically
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-full flex flex-col justify-between p-5 bg-warmcream">
      {/* Top Bar: Brand + Language Switcher */}
      <div>
        <div className="flex items-center justify-between pt-2 pb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-terracotta to-terracotta-700 flex items-center justify-center text-white font-black text-xl shadow-md ring-2 ring-warmcream">
              श
            </div>
            <div>
              <h1 className="font-extrabold text-earthy-title text-lg tracking-tight leading-none">
                ShilpSetu
              </h1>
              <p className="text-[11px] text-terracotta font-semibold mt-0.5 tracking-wide uppercase">
                {t.sellerPortalTitle}
              </p>
            </div>
          </div>

          {/* Language Toggle Button */}
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

        {/* Welcome Card Banner */}
        <div className="bg-gradient-to-br from-terracotta via-terracotta-700 to-terracotta-800 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden mb-6">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-ochre/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/15 text-white text-[11px] font-semibold mb-2 backdrop-blur-xs">
              <Sparkles className="w-3 h-3 text-ochre-light" />
              <span>{lang === "hi" ? "कारीगरों का अपना बाज़ार" : "Handcrafted Excellence"}</span>
            </div>
            <h2 className="text-xl font-black tracking-tight leading-snug">
              {t.signIn}
            </h2>
            <p className="text-xs text-white/85 mt-1 leading-relaxed">
              {t.sellerPortalSubtitle}
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

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1.5">
              {t.emailLabel}
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
                className="w-full pl-10 pr-3.5 py-3 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-earthy-title uppercase tracking-wider mb-1.5">
              {t.passwordLabel}
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
                placeholder="••••••••"
                className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white border border-warmcream-border text-earthy-title text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/40 focus:border-terracotta transition shadow-xs placeholder:text-stone-400"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-terracotta hover:bg-terracotta-700 active:scale-[0.99] text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>{t.signingIn}</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>{t.signInBtn}</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Switch to Registration */}
      <div className="pt-6 pb-2 text-center">
        <div className="p-4 rounded-2xl bg-white border border-warmcream-border shadow-xs">
          <p className="text-xs text-earthy-muted">
            {t.noAccount}{" "}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-terracotta font-extrabold hover:underline ml-1"
            >
              {t.registerLink}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
