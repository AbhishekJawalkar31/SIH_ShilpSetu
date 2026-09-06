import React from "react";
import { User, MapPin, Award, ShieldCheck, Star, Phone, Globe, Edit2 } from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { ArtisanProfile } from "../../services/types";

interface ProfileViewProps {
  profile: ArtisanProfile;
  lang: Language;
  onToggleLang: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  lang,
  onToggleLang,
}) => {
  const t = translations[lang];

  return (
    <div className="p-4 space-y-4">
      {/* Profile Card */}
      <div className="bg-white rounded-3xl p-5 border border-warmcream-border shadow-card text-center relative overflow-hidden">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-terracotta to-ochre text-white flex items-center justify-center font-extrabold text-2xl mx-auto shadow-md ring-4 ring-warmcream">
          सी
        </div>

        <h2 className="text-base font-extrabold text-earthy-title mt-3">
          {profile.business_name}
        </h2>

        <p className="text-xs text-terracotta font-semibold mt-0.5">
          {profile.craft_type}
        </p>

        <p className="text-xs text-earthy-muted flex items-center justify-center gap-1 mt-1">
          <MapPin className="w-3.5 h-3.5 text-stone-400" />
          {profile.location}
        </p>

        {/* Badges */}
        <div className="flex justify-center gap-2 mt-3 pt-3 border-t border-stone-100 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-craftgreen-50 text-craftgreen font-bold text-[11px] border border-craftgreen-200">
            <ShieldCheck className="w-3 h-3" />
            Verified Artisan
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px] border border-amber-200">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {profile.rating} Rating
          </span>
        </div>
      </div>

      {/* About Craft Section */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
          {lang === "hi" ? "शिल्प परिचय" : "About the Craft"}
        </h3>
        <p className="text-xs text-earthy-body leading-relaxed">
          {profile.description}
        </p>
      </div>

      {/* Language & Preferences */}
      <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
          {lang === "hi" ? "भाषा और सेटिंग्स" : "Language & Settings"}
        </h3>

        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-warmcream/80 border border-warmcream-border">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-terracotta" />
            <span className="text-xs font-semibold text-earthy-title">
              {lang === "hi" ? "भाषा (App Language)" : "App Language"}
            </span>
          </div>
          <button
            onClick={onToggleLang}
            className="px-3 py-1 rounded-xl bg-terracotta text-white text-xs font-bold shadow-xs active:scale-95"
          >
            {lang === "en" ? "हिन्दी में बदलें" : "Switch to English"}
          </button>
        </div>

        <div className="text-[11px] text-stone-400 pt-1 text-center">
          Artisan ID: {profile.id.slice(0, 18)}...
        </div>
      </div>
    </div>
  );
};

