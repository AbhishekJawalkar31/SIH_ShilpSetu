import React, { useEffect, useState } from "react";
import { Sparkles, Check, Loader2 } from "lucide-react";
import { translations, Language } from "../../lib/i18n";

interface LoadingStateProps {
  lang: Language;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ lang }) => {
  const t = translations[lang];
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    t.loadingStep1,
    t.loadingStep2,
    t.loadingStep3,
    t.loadingStep4,
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 600);

    return () => clearInterval(timer);
  }, [steps.length]);

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[420px] text-center space-y-6">
      {/* Animated Glowing Badge */}
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-terracotta to-ochre flex items-center justify-center shadow-floating animate-pulse">
          <Sparkles className="w-10 h-10 text-white animate-spin duration-3000" />
        </div>
        <div className="absolute inset-0 rounded-full bg-terracotta/20 blur-xl animate-ping duration-1000" />
      </div>

      <div>
        <h3 className="text-base font-extrabold text-earthy-title">
          {lang === "hi" ? "AI शिल्प कैटलॉग बन रहा है..." : "Generating AI Catalogue..."}
        </h3>
        <p className="text-xs text-earthy-muted mt-1 max-w-[280px] mx-auto">
          {lang === "hi"
            ? "जेमिनी एआई आपकी कला की पहचान और उचित मूल्य विश्लेषण कर रहा है।"
            : "Gemini Multimodal AI is classifying your craft and determining fair price ranges."}
        </p>
      </div>

      {/* Progressive Step Checklist */}
      <div className="w-full max-w-xs space-y-2.5 text-left bg-white p-4 rounded-2xl border border-warmcream-border shadow-xs">
        {steps.map((stepText, idx) => {
          const isDone = idx < activeStep;
          const isCurrent = idx === activeStep;

          return (
            <div
              key={idx}
              className={`flex items-center gap-2.5 text-xs transition-all duration-300 ${
                isDone
                  ? "text-craftgreen font-medium"
                  : isCurrent
                  ? "text-terracotta font-bold scale-[1.02]"
                  : "text-stone-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                  isDone
                    ? "bg-craftgreen text-white"
                    : isCurrent
                    ? "bg-terracotta text-white animate-spin"
                    : "bg-stone-100 text-stone-300"
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3 stroke-[3]" />
                ) : isCurrent ? (
                  <Loader2 className="w-3 h-3" />
                ) : (
                  idx + 1
                )}
              </div>
              <span className="leading-tight">{stepText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

