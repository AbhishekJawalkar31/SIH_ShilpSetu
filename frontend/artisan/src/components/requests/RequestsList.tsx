import React, { useState } from "react";
import {
  Search,
  MessageCircle,
  Clock,
  Building2,
  Store,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Truck,
  Package,
} from "lucide-react";
import { translations, Language } from "../../lib/i18n";
import { QuoteRequestSummary, OrderSummary } from "../../services/types";

interface RequestsListProps {
  quoteRequests: QuoteRequestSummary[];
  orders: OrderSummary[];
  lang: Language;
}

export const RequestsList: React.FC<RequestsListProps> = ({
  quoteRequests,
  orders,
  lang,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<"requests" | "orders" | "messages">("requests");
  const [selectedQuote, setSelectedQuote] = useState<QuoteRequestSummary | null>(null);
  const [chatOpenWith, setChatOpenWith] = useState<string | null>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([
    { sender: "buyer", text: "Namaste Sita ji, we are hosting 100 delegates next month and loved your jute tote bags.", time: "10:15 AM" },
    { sender: "artisan", text: "Namaste! Yes, we can customize them with natural organic dyeing and strong handles.", time: "10:18 AM" },
  ]);

  const handleSendMessage = () => {
    if (chatMessage.trim()) {
      setChatHistory([
        ...chatHistory,
        { sender: "artisan", text: chatMessage.trim(), time: "Now" },
      ]);
      setChatMessage("");
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header matching Screenshot 3 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-earthy-title">
            {lang === "hi" ? "नमस्ते, सीता जी" : "Hello, Sita"}
          </h2>
          <p className="text-xs text-earthy-muted">
            {t.requestsTitle}
          </p>
        </div>

        <button className="p-2 rounded-xl bg-white border border-warmcream-border text-earthy-title shadow-xs hover:bg-stone-50">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs: Orders | Requests | Messages (matching Screenshot 3) */}
      <div className="grid grid-cols-3 p-1 rounded-2xl bg-white border border-warmcream-border shadow-xs text-center">
        <button
          onClick={() => setActiveTab("orders")}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "orders"
              ? "bg-terracotta text-white shadow-xs"
              : "text-earthy-muted hover:text-earthy-title"
          }`}
        >
          {t.tabOrders}
        </button>
        <button
          onClick={() => setActiveTab("requests")}
          className={`py-2 rounded-xl text-xs font-bold relative transition-all ${
            activeTab === "requests"
              ? "bg-terracotta text-white shadow-xs"
              : "text-earthy-muted hover:text-earthy-title"
          }`}
        >
          {t.tabRequests}
          <span className="absolute top-1.5 right-2 w-2 h-2 bg-ochre rounded-full" />
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "messages"
              ? "bg-terracotta text-white shadow-xs"
              : "text-earthy-muted hover:text-earthy-title"
          }`}
        >
          {t.tabMessages}
        </button>
      </div>

      {/* TAB 1: B2B Requests Tab */}
      {activeTab === "requests" && (
        <div className="space-y-3">
          {quoteRequests.map((quote) => (
            <div
              key={quote.id}
              className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card hover:shadow-md transition-shadow space-y-3"
            >
              {/* Top Meta Line: Bulk Quote Request Badge + Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-ochre-50 text-ochre font-bold text-[10px] border border-ochre-200">
                    {t.bulkQuoteBadge}
                  </span>
                  {quote.is_new && (
                    <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-bold text-[10px] border border-red-200">
                      {t.newBadge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-stone-400 font-medium">
                  {quote.time_ago}
                </span>
              </div>

              {/* Buyer & Requirement Details */}
              <div>
                <h3 className="font-extrabold text-sm text-earthy-title leading-snug">
                  {quote.buyer_name} wants {quote.quantity} {quote.requirement_title.split(" ").slice(1, 4).join(" ")}
                </h3>
                <p className="text-xs text-earthy-body mt-1 leading-relaxed">
                  {t.budgetLabel}:{" "}
                  <span className="font-bold text-craftgreen">
                    ₹{quote.budget_per_unit - 25}–₹{quote.budget_per_unit + 25} each
                  </span>{" "}
                  (Total ₹{quote.total_budget.toLocaleString()})
                </p>
                <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                  {quote.requirement_text}
                </p>
              </div>

              {/* Actions: View Details & Chat */}
              <div className="flex gap-2 pt-1 border-t border-stone-100">
                <button
                  onClick={() => setSelectedQuote(quote)}
                  className="flex-1 py-2 rounded-xl bg-warmcream/80 border border-warmcream-border text-earthy-title text-xs font-semibold hover:bg-warmcream-muted transition-colors text-center"
                >
                  {t.viewDetails}
                </button>
                <button
                  onClick={() => {
                    setChatOpenWith(quote.buyer_name);
                    setActiveTab("messages");
                  }}
                  className="flex-1 py-2 rounded-xl bg-craftgreen text-white text-xs font-bold hover:bg-craftgreen-600 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>{t.chatWithBuyer}</span>
                </button>
              </div>
            </div>
          ))}

          {/* Details Modal */}
          {selectedQuote && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-stone-200 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-ochre-50 text-ochre uppercase">
                      {selectedQuote.buyer_type || "B2B Buyer"}
                    </span>
                    <h3 className="font-extrabold text-base text-earthy-title mt-1">
                      {selectedQuote.buyer_name}
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedQuote(null)}
                    className="text-stone-400 hover:text-earthy-title font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3.5 rounded-2xl bg-warmcream/70 border border-warmcream-border text-xs space-y-2">
                  <p className="font-bold text-earthy-title">
                    {selectedQuote.requirement_title}
                  </p>
                  <p className="text-earthy-body leading-relaxed">
                    {selectedQuote.requirement_text}
                  </p>
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-semibold">
                    <span>Target Quantity:</span>
                    <span className="text-earthy-title font-bold">{selectedQuote.quantity} units</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Budget per unit:</span>
                    <span className="text-craftgreen font-bold">₹{selectedQuote.budget_per_unit}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedQuote(null)}
                    className="flex-1 py-2.5 rounded-xl border border-stone-300 text-xs font-semibold"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setChatOpenWith(selectedQuote.buyer_name);
                      setSelectedQuote(null);
                      setActiveTab("messages");
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-craftgreen text-white text-xs font-bold"
                  >
                    Chat & Quote
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Orders Tab (Matching Screenshot 3) */}
      {activeTab === "orders" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-earthy-muted">
            {t.recentOrders}
          </h3>

          <div className="bg-white rounded-3xl border border-warmcream-border shadow-card divide-y divide-warmcream-border overflow-hidden">
            {orders.map((ord) => (
              <div key={ord.id} className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                    <img
                      src={ord.image_url}
                      alt={ord.product_title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-earthy-title">
                      {ord.product_title}
                    </h4>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${
                        ord.status === "delivered"
                          ? "bg-craftgreen-50 text-craftgreen"
                          : ord.status === "shipped"
                          ? "bg-blue-50 text-blue-600"
                          : "bg-ochre-50 text-ochre"
                      }`}
                    >
                      {ord.status === "delivered" && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {ord.status === "shipped" && <Truck className="w-2.5 h-2.5" />}
                      {ord.status === "processing" && <Package className="w-2.5 h-2.5" />}
                      {ord.status === "delivered"
                        ? t.delivered
                        : ord.status === "shipped"
                        ? t.shipped
                        : t.processing}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-black text-xs text-earthy-title">
                    ₹{ord.total_price.toLocaleString()}
                  </span>
                  <p className="text-[10px] text-stone-400 mt-0.5">
                    Qty: {ord.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Messages Tab */}
      {activeTab === "messages" && (
        <div className="bg-white rounded-3xl p-4 border border-warmcream-border shadow-card space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-ochre-100 text-ochre font-bold text-xs flex items-center justify-center">
                🏨
              </div>
              <div>
                <h4 className="text-xs font-bold text-earthy-title">
                  {chatOpenWith || "Hotel Green Valley Procurement"}
                </h4>
                <p className="text-[10px] text-craftgreen font-semibold">Online • Verified Buyer</p>
              </div>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex flex-col ${
                  msg.sender === "artisan" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`p-2.5 rounded-2xl max-w-[82%] text-xs leading-relaxed ${
                    msg.sender === "artisan"
                      ? "bg-terracotta text-white rounded-tr-xs"
                      : "bg-stone-100 text-earthy-title rounded-tl-xs"
                  }`}
                >
                  {msg.text}
                </div>
                <span className="text-[9px] text-stone-400 mt-0.5 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2 pt-2 border-t border-stone-100">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={lang === "hi" ? "संदेश लिखें..." : "Type reply to buyer..."}
              className="flex-1 p-2 rounded-xl bg-warmcream/70 border border-warmcream-border text-xs focus:outline-none focus:ring-1 focus:ring-terracotta"
            />
            <button
              onClick={handleSendMessage}
              className="px-4 py-2 rounded-xl bg-terracotta text-white text-xs font-bold hover:brightness-105 active:scale-95"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

