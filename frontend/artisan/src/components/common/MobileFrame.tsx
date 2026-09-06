import React, { useState } from "react";
import { Wifi, Battery, Signal, Smartphone, Maximize2 } from "lucide-react";

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const [isFramed, setIsFramed] = useState(true);

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-start p-0 md:py-6 selection:bg-terracotta/20">
      {/* Desktop view switcher banner */}
      <div className="hidden md:flex items-center gap-3 mb-3 px-4 py-1.5 bg-white/90 backdrop-blur rounded-full shadow-sm border border-stone-200 text-xs text-stone-600 font-medium">
        <span className="flex items-center gap-1.5 text-stone-900 font-semibold">
          <Smartphone className="w-3.5 h-3.5 text-terracotta" />
          ShilpSetu Artisan App
        </span>
        <span className="text-stone-300">|</span>
        <button
          onClick={() => setIsFramed(!isFramed)}
          className="flex items-center gap-1 text-terracotta hover:underline font-semibold"
        >
          <Maximize2 className="w-3 h-3" />
          {isFramed ? "Expand Fullscreen" : "Mobile Frame View"}
        </button>
      </div>

      {/* Main Container */}
      <div
        className={`w-full bg-warmcream transition-all duration-300 ${
          isFramed
            ? "max-w-[430px] min-h-screen md:min-h-[860px] md:h-[860px] md:rounded-[44px] md:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)] md:border-[10px] md:border-stone-800 md:ring-1 md:ring-stone-700/20 overflow-hidden flex flex-col relative"
            : "max-w-md min-h-screen shadow-md flex flex-col relative"
        }`}
      >
        {/* Mobile Status Bar (9:30, Signal, Wifi, Battery) */}
        <div className="bg-warmcream px-6 pt-3 pb-1 flex justify-between items-center text-xs font-semibold text-earthy-title select-none z-30">
          <span>9:30</span>
          {/* Dynamic Island / Speaker cutout simulation on framed desktop */}
          <div className="hidden md:block w-20 h-4 bg-stone-800 rounded-full mx-auto" />
          <div className="flex items-center gap-1.5">
            <Signal className="w-3.5 h-3.5 stroke-[2.5]" />
            <Wifi className="w-3.5 h-3.5 stroke-[2.5]" />
            <Battery className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        {/* Inner Scrollable Screen Area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col pb-20">
          {children}
        </div>
      </div>
    </div>
  );
};

