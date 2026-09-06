import React from "react";
import { Camera, FileText, IndianRupee, Send, Check } from "lucide-react";
import { translations, Language } from "../../lib/i18n";

export type AddStep = "photo" | "details" | "price" | "publish";

interface StepperProps {
  currentStep: AddStep;
  onStepClick?: (step: AddStep) => void;
  lang: Language;
}

export const Stepper: React.FC<StepperProps> = ({ currentStep, onStepClick, lang }) => {
  const t = translations[lang];

  const steps: { key: AddStep; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "photo", label: t.stepPhoto, icon: Camera },
    { key: "details", label: t.stepDetails, icon: FileText },
    { key: "price", label: t.stepPrice, icon: IndianRupee },
    { key: "publish", label: t.stepPublish, icon: Send },
  ];

  const stepOrder: AddStep[] = ["photo", "details", "price", "publish"];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="px-4 py-3 bg-white border-b border-warmcream-border">
      <div className="flex items-center justify-between relative">
        {/* Connecting line */}
        <div className="absolute left-6 right-6 top-3.5 h-0.5 bg-stone-200 -z-0" />
        <div
          className="absolute left-6 top-3.5 h-0.5 bg-terracotta transition-all duration-300 -z-0"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 82}%` }}
        />

        {steps.map((s, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;
          const Icon = s.icon;

          return (
            <button
              key={s.key}
              onClick={() => isCompleted && onStepClick?.(s.key)}
              disabled={!isCompleted}
              className={`flex flex-col items-center group relative z-10 ${
                isCompleted ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-terracotta text-white ring-4 ring-terracotta/20 shadow-sm scale-110"
                    : isCompleted
                    ? "bg-craftgreen text-white shadow-xs"
                    : "bg-stone-100 text-stone-400 border border-stone-200"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Icon className="w-3.5 h-3.5 stroke-[2.2]" />
                )}
              </div>
              <span
                className={`text-[10px] mt-1 font-semibold transition-colors ${
                  isActive
                    ? "text-terracotta"
                    : isCompleted
                    ? "text-craftgreen font-medium"
                    : "text-stone-400"
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

