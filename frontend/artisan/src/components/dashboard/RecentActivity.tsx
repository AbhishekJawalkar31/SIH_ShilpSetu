import React from "react";
import { ShoppingBag, CheckCircle2, FileText, ChevronRight } from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { ActivityItem } from "../../services/types";

interface RecentActivityProps {
  lang: Language;
  activities: ActivityItem[];
  onViewAll: () => void;
}

export const RecentActivity: React.FC<RecentActivityProps> = ({
  lang,
  activities,
  onViewAll,
}) => {
  const t = translations[lang];

  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "order":
        return (
          <div className="w-9 h-9 rounded-xl bg-craftgreen-50 text-craftgreen flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
        );
      case "listed":
        return (
          <div className="w-9 h-9 rounded-xl bg-ochre-50 text-ochre flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case "quote":
        return (
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
    }
  };

  const getLocalizedStatus = (activity: ActivityItem) => {
    if (lang === "hi") {
      if (activity.type === "order") return "ऑर्डर प्राप्त हुआ";
      if (activity.type === "listed") return "सूचीबद्ध किया गया";
      if (activity.type === "quote") return "थोक मांग अनुरोध";
    }
    return activity.status || activity.type;
  };

  const getLocalizedTime = (timeAgo: string) => {
    if (lang === "hi") {
      return timeAgo
        .replace("days ago", "दिन पहले")
        .replace("day ago", "दिन पहले")
        .replace("week ago", "सप्ताह पहले")
        .replace("hours ago", "घंटे पहले")
        .replace("~10m ago", "10 मिनट पहले");
    }
    return timeAgo;
  };

  return (
    <div className="mx-4 mt-5 mb-4">
      <div className="flex justify-between items-center mb-2.5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
          {t.recentActivity}
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-terracotta hover:underline flex items-center"
        >
          {t.viewAll}
          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-warmcream-border shadow-card divide-y divide-warmcream-border overflow-hidden">
        {activities.map((item) => (
          <div
            key={item.id}
            className="p-3.5 flex items-center justify-between hover:bg-stone-50/60 transition-colors"
          >
            <div className="flex items-center gap-3">
              {getIcon(item.type)}
              <div>
                <p className="text-xs font-bold text-earthy-title leading-tight">
                  {item.title}
                </p>
                <p className="text-[11px] text-earthy-muted mt-0.5">
                  {getLocalizedStatus(item)}
                </p>
              </div>
            </div>
            <span className="text-[11px] text-stone-400 font-medium">
              {getLocalizedTime(item.time_ago)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

