"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Layers,
  Send,
  Building2,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Coins,
  Package,
  Sliders,
  Check,
  RefreshCw,
  LogOut,
  User,
} from "lucide-react";
import { useCustomerAuth } from "../../../context/CustomerAuthContext";
import {
  matchProducts,
  createQuote,
  ApiError,
} from "../../../services/customerApi";
import {
  ArtisanPoolItem,
  BulkMatchResponse,
  QuoteResponse,
} from "../../../services/types";

// Quick requirement suggestion prompts
const PROMPT_SUGGESTIONS = [
  {
    title: "Diwali Corporate Gift Sets",
    titleHi: "दिवाली उपहार सेट",
    prompt:
      "500 hand-carved Sheesham wood gift boxes with engraved brass inlay and 2 handmade terracotta diyas inside.",
    category: "Woodcraft",
    quantity: 500,
    unitBudget: 650,
  },
  {
    title: "Artisanal Restaurant Dinnerware",
    titleHi: "होटल व रेस्टोरेंट क्रॉकरी",
    prompt:
      "300 organic glazed ceramic dinner plates and matching serving bowls with traditional Jaipur blue pottery motifs.",
    category: "Pottery & Ceramics",
    quantity: 300,
    unitBudget: 420,
  },
  {
    title: "Handloom Heritage Wedding Favors",
    titleHi: "हथकरघा वेडिंग शॉल",
    prompt:
      "150 authentic handwoven Pashmina and Tussar silk stoles with zari embroidery for wedding guests.",
    category: "Handloom & Textiles",
    quantity: 150,
    unitBudget: 1200,
  },
  {
    title: "Eco-Friendly Jute Conference Bags",
    titleHi: "पर्यावरण-अनुकूल जूट बैग",
    prompt:
      "1000 premium handcrafted jute and cotton laptop messenger bags with custom embroidered company logo.",
    category: "Handmade Crafts",
    quantity: 1000,
    unitBudget: 280,
  },
];

const CRAFT_CATEGORIES = [
  "All Categories",
  "Pottery & Ceramics",
  "Handloom & Textiles",
  "Woodcraft",
  "Metalwork & Brass",
  "Jewelry & Silver",
  "Folk Paintings",
  "Stone Carving",
];

const PRESET_QUANTITIES = [50, 100, 250, 500, 1000, 2500];

function CustomRequestContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { customer, isAuthenticated, login, register } = useCustomerAuth();

  // Form State
  const [requirementText, setRequirementText] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [quantity, setQuantity] = useState<number>(250);
  const [unitBudget, setUnitBudget] = useState<number>(500);
  const [timelineDays, setTimelineDays] = useState<number>(30);
  const [customBranding, setCustomBranding] = useState(false);
  const [notes, setNotes] = useState("");
  const [hasUserEdited, setHasUserEdited] = useState(false);

  // Prefill from URL query params (e.g. from Product Detail page or Cart)
  useEffect(() => {
    if (hasUserEdited) return;
    const cat = searchParams?.get("category");
    const pName = searchParams?.get("product_name");
    const cartItems = searchParams?.get("cart_items");

    if (cat) {
      const match = CRAFT_CATEGORIES.find(
        (c) => c.toLowerCase() === cat.toLowerCase()
      );
      if (match) setCategory(match);
    }

    if (pName) {
      setRequirementText(
        `Bulk inquiry for authentic handcrafted ${pName}. Seeking certified artisan cluster production capacity, scheduled delivery, and custom finish options.`
      );
    } else if (cartItems) {
      setRequirementText(
        `Bulk inquiry for selected crafts: ${cartItems}. Seeking artisan cluster production capacity, scheduled delivery, and bulk pricing.`
      );
    }
  }, [searchParams, hasUserEdited]);

  // AI Matching State
  const [isMatching, setIsMatching] = useState(false);
  const [matchingError, setMatchingError] = useState<string | null>(null);
  const [matchResult, setMatchResult] = useState<BulkMatchResponse | null>(null);
  const [activeStep, setActiveStep] = useState<"form" | "matching" | "success">(
    "form"
  );

  // Quote Submission State
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdQuote, setCreatedQuote] = useState<QuoteResponse | null>(null);

  // Inline Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState("ishwari@shilpsetu.com");
  const [authPassword, setAuthPassword] = useState("password123");
  const [authName, setAuthName] = useState("Ishwari");
  const [authPhone, setAuthPhone] = useState("+91 98765 43210");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Apply Prompt Suggestion
  const handleApplySuggestion = (s: (typeof PROMPT_SUGGESTIONS)[0]) => {
    setHasUserEdited(true);
    setRequirementText(s.prompt);
    setCategory(s.category);
    setQuantity(s.quantity);
    setUnitBudget(s.unitBudget);
  };

  // Step 1 -> Run AI Bulk Matching Engine
  const handleRunAiMatching = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!requirementText.trim()) {
      setMatchingError("Please describe your custom requirement in detail.");
      return;
    }
    if (quantity <= 0) {
      setMatchingError("Please enter a valid quantity greater than 0.");
      return;
    }

    setIsMatching(true);
    setMatchingError(null);

    try {
      const response = await matchProducts({
        query: requirementText,
        quantity: quantity,
        budget_per_unit: unitBudget > 0 ? unitBudget : undefined,
      });

      if (!response.artisans || response.artisans.length === 0) {
        setMatchingError(
          "No registered sellers found matching this requirement capacity. Please adjust quantity or requirement description. / इस आवश्यकता क्षमता से मेल खाने वाले कोई पंजीकृत विक्रेता नहीं मिले। कृपया मात्रा या विवरण समायोजित करें।"
        );
        return;
      }

      setMatchResult(response);
      setActiveStep("matching");
    } catch (err: unknown) {
      console.warn("Backend bulk matching error:", err);
      const msg =
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Unable to connect to ShilpSetu services. Please try again. / ShilpSetu सेवा से कनेक्शन नहीं हो सका। कृपया पुनः प्रयास करें।";
      setMatchingError(msg);
    } finally {
      setIsMatching(false);
    }
  };

  // Step 2 -> Submit Final Quote Request
  const handleSubmitQuote = async () => {
    if (!isAuthenticated || !customer) {
      setShowAuthModal(true);
      return;
    }

    setIsSubmittingQuote(true);
    setSubmitError(null);

    try {
      const payload = {
        buyer_id: customer.id,
        requirement_text: requirementText + (notes ? `\n\nNotes: ${notes}` : "") + (customBranding ? "\nBranding: Custom logo & packaging requested" : ""),
        quantity: quantity,
        budget_per_unit: unitBudget > 0 ? unitBudget : undefined,
        total_budget: unitBudget > 0 ? unitBudget * quantity : undefined,
      };

      const quoteRes = await createQuote(payload);
      setCreatedQuote(quoteRes);
      setActiveStep("success");
    } catch (err: unknown) {
      const msg =
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Unable to submit quote request to ShilpSetu services. Please try again. / ShilpSetu सेवा पर कोटेशन अनुरोध सबमिट नहीं किया जा सका। कृपया पुनः प्रयास करें।";
      setSubmitError(msg);
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // Quick Auth Handling
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMsg(null);
    setIsAuthSubmitting(true);
    try {
      if (authMode === "login") {
        await login({ email: authEmail, password: authPassword });
      } else {
        await register({
          email: authEmail,
          password: authPassword,
          name: authName,
          phone: authPhone,
          role: "buyer",
        });
      }
      setShowAuthModal(false);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Authentication failed. Please verify credentials.";
      setAuthErrorMsg(msg);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const calculatedTotalBudget = unitBudget > 0 ? unitBudget * quantity : 0;

  return (
    <div className="min-h-screen bg-sand text-ink selection:bg-terracotta/20 selection:text-terracotta">
      {/* Top Banner Navigation */}
      <header className="sticky top-0 z-40 border-b border-forest/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-sand/60 px-3.5 py-1.5 text-xs font-semibold text-forest transition hover:bg-forest hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Marketplace</span>
            </Link>
            <div className="hidden items-center gap-2 text-xs text-ink/60 sm:flex">
              <span>Customer Portal (ग्राहक)</span>
              <span>/</span>
              <span className="font-semibold text-forest">Custom Requirement & Bulk Matching</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/buyer/quotes"
              className="inline-flex items-center gap-2 rounded-full border border-terracotta/30 bg-terracotta/10 px-4 py-1.5 text-xs font-bold text-terracotta transition hover:bg-terracotta hover:text-white"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>My Quotes / मेरे कोटेशन</span>
            </Link>

            {isAuthenticated && customer ? (
              <div className="flex items-center gap-2 rounded-full border border-forest/20 bg-forest/5 px-3 py-1 text-xs">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-semibold text-forest">{customer.name}</span>
                <span className="text-ink/40 text-[10px]">(Customer / ग्राहक)</span>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="rounded-full bg-forest px-4 py-1.5 text-xs font-bold text-white transition hover:bg-forest/90"
              >
                Sign In as Customer
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Header */}
      <section className="border-b border-forest/10 bg-gradient-to-b from-forest/5 to-transparent px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white px-4 py-1 text-xs font-semibold text-forest shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-terracotta" />
            <span>AI Multi-Seller Allocation Engine</span>
            <span className="text-ink/40">•</span>
            <span>बहु-विक्रेता AI मिलान</span>
          </div>

          <h1 className="font-serif-title mt-4 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Custom Craft Requirements & Bulk Orders
          </h1>
          <p className="mt-2 text-sm text-ink/70 sm:text-base">
            Describe what you need in natural language. ShilpSetu distributes bulk capacity across registered artisan clusters and craftspeople (विक्रेता / शिल्पकार) to fulfill large orders on time.
          </p>

          {/* Stepper Indicator */}
          <div className="mt-8 flex items-center justify-center gap-2 text-xs font-bold">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                activeStep === "form"
                  ? "bg-forest text-white"
                  : "bg-forest/10 text-forest"
              }`}
            >
              <span>1</span>
              <span>Requirement / आवश्यकता</span>
            </div>
            <div className="h-0.5 w-6 bg-forest/20" />
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                activeStep === "matching"
                  ? "bg-forest text-white"
                  : activeStep === "success"
                  ? "bg-forest/10 text-forest"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              <span>2</span>
              <span>AI Seller Allocation / विक्रेता मिलान</span>
            </div>
            <div className="h-0.5 w-6 bg-forest/20" />
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition ${
                activeStep === "success"
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              <span>3</span>
              <span>Quote Confirmed / कोटेशन</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {/* STEP 1: REQUIREMENT FORM */}
        {activeStep === "form" && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Left 2 Cols: Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm">
                <h2 className="font-serif-title text-xl font-bold text-ink">
                  1. Describe Your Craft Requirement
                </h2>
                <p className="text-xs text-ink/60 mt-1">
                  Type in English, Hindi, or regional languages. Our semantic AI understands craft terminology and techniques.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                    Requirement Details (प्राकृतिक भाषा विवरण) *
                  </label>
                  <textarea
                    rows={4}
                    value={requirementText}
                    onChange={(e) => {
                      setHasUserEdited(true);
                      setRequirementText(e.target.value);
                    }}
                    placeholder="e.g. 500 hand-carved Sheesham wood boxes with brass latch for corporate Diwali hampers, delivered within 30 days..."
                    className="mt-1.5 w-full rounded-xl border border-forest/20 bg-sand/30 p-3.5 text-sm text-ink outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10"
                  />
                </div>

                {/* Craft Category */}
                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                    Craft Category (शिल्प श्रेणी)
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CRAFT_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategory(cat)}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          category === cat
                            ? "bg-forest text-white"
                            : "border border-forest/20 bg-sand/40 text-ink/80 hover:bg-forest/5"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity Selection */}
                <div className="mt-6 border-t border-forest/10 pt-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                      Total Quantity (आवश्यक मात्रा) *
                    </label>
                    <span className="text-xs text-ink/60">Minimum 10 units for B2B allocation</span>
                  </div>

                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-36 rounded-xl border border-forest/20 bg-sand/30 px-3.5 py-2 text-base font-bold text-ink outline-none focus:border-forest"
                    />
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_QUANTITIES.map((q) => (
                        <button
                          key={q}
                          type="button"
                          onClick={() => setQuantity(q)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                            quantity === q
                              ? "bg-terracotta text-white"
                              : "border border-forest/20 bg-white text-ink/70 hover:bg-sand"
                          }`}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Budget Calculator */}
                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-forest/10 pt-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                      Target Budget Per Unit (₹ प्रति इकाई)
                    </label>
                    <div className="relative mt-1.5">
                      <span className="absolute left-3 top-2.5 text-sm font-bold text-ink/40">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={10}
                        value={unitBudget}
                        onChange={(e) => setUnitBudget(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full rounded-xl border border-forest/20 bg-sand/30 py-2 pl-8 pr-3 text-sm font-bold text-ink outline-none focus:border-forest"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                      Estimated Total Budget (कुल अनुमानित बजट)
                    </label>
                    <div className="mt-1.5 flex h-10 items-center rounded-xl bg-forest/5 px-4 font-serif-title text-base font-bold text-forest">
                      ₹{calculatedTotalBudget.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Delivery Timeline & Custom Options */}
                <div className="mt-6 grid grid-cols-1 gap-4 border-t border-forest/10 pt-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                      Target Delivery Days (कार्य दिवस)
                    </label>
                    <select
                      value={timelineDays}
                      onChange={(e) => setTimelineDays(parseInt(e.target.value))}
                      className="mt-1.5 w-full rounded-xl border border-forest/20 bg-sand/30 p-2.5 text-xs font-semibold text-ink outline-none focus:border-forest"
                    >
                      <option value={15}>15 Days (Urgent / Express)</option>
                      <option value={30}>30 Days (Standard Bulk)</option>
                      <option value={45}>45 Days (Handcrafted Detailed)</option>
                      <option value={60}>60+ Days (Flexible)</option>
                    </select>
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={customBranding}
                        onChange={(e) => setCustomBranding(e.target.checked)}
                        className="h-4 w-4 rounded border-forest/30 text-forest focus:ring-forest"
                      />
                      <span className="text-xs font-semibold text-ink">
                        Custom Branding / Engraving / Tags Required
                      </span>
                    </label>
                  </div>
                </div>

                {/* Additional Notes */}
                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-ink/70">
                    Packaging or Specific Instructions (वैकल्पिक निर्देश)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Eco-friendly kraft boxes, individual bubble wrap, GI tag certificate copy"
                    className="mt-1.5 w-full rounded-xl border border-forest/20 bg-sand/30 p-2.5 text-xs text-ink outline-none focus:border-forest"
                  />
                </div>

                {/* Error Banner */}
                {matchingError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{matchingError}</span>
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleRunAiMatching}
                    disabled={isMatching}
                    className="inline-flex items-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-forest/90 disabled:opacity-50"
                  >
                    {isMatching ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Analyzing Artisan Capacity & Match...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-terracotta" />
                        <span>Run AI Bulk Allocation / विक्रेता मिलान</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Col: Sample Prompts & ShilpSetu Trust Info */}
            <div className="space-y-6">
              <div className="rounded-2xl border border-forest/10 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-terracotta">
                  <Sparkles className="h-4 w-4" />
                  <span>Sample Requirements</span>
                </div>
                <p className="text-xs text-ink/60 mt-1">
                  Click any template to auto-fill requirement parameters:
                </p>

                <div className="mt-3 space-y-3">
                  {PROMPT_SUGGESTIONS.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleApplySuggestion(s)}
                      className="group cursor-pointer rounded-xl border border-forest/15 bg-sand/30 p-3 transition hover:border-forest hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-forest">
                        <span>{s.title}</span>
                        <span className="text-[10px] text-terracotta">Qty: {s.quantity}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] text-ink/70">
                        {s.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How ShilpSetu Multi-Artisan Allocation Works */}
              <div className="rounded-2xl border border-forest/10 bg-forest/5 p-5">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-forest">
                  <ShieldCheck className="h-4 w-4" />
                  <span>How ShilpSetu Bulk Allocation Works</span>
                </h3>
                <ul className="mt-3 space-y-2 text-xs text-ink/80">
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      <strong>Greedy Capacity Split:</strong> When your order exceeds a single artisan&apos;s output, our algorithm distributes quantities among multiple registered sellers (पंजीकृत विक्रेता).
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      <strong>Fair Price Guarantee:</strong> Artisans receive transparent direct payments without middlemen margins.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                    <span>
                      <strong>Craft Integrity:</strong> Every participating seller is registered directly on the ShilpSetu craft network.
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AI ALLOCATION PREVIEW */}
        {activeStep === "matching" && matchResult && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-forest/10 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-forest/10 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>AI Allocation Complete ({matchResult.artisans.length} Sellers Matched)</span>
                  </div>
                  <h2 className="font-serif-title text-2xl font-bold text-ink mt-2">
                    Multi-Seller Capacity Breakdown
                  </h2>
                  <p className="text-xs text-ink/70">
                    Requirement: <span className="font-medium text-ink">&ldquo;{requirementText}&rdquo;</span>
                  </p>
                </div>

                <button
                  onClick={() => setActiveStep("form")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-sand/40 px-3.5 py-2 text-xs font-bold text-forest transition hover:bg-sand"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  <span>Modify Parameters</span>
                </button>
              </div>

              {/* Allocation Progress Bar */}
              <div className="mt-6 rounded-xl bg-forest/5 p-4">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-forest">
                    Allocated Quantity: {matchResult.matched_quantity} / {matchResult.required_quantity} units
                  </span>
                  <span className="text-emerald-700">
                    {Math.round((matchResult.matched_quantity / matchResult.required_quantity) * 100)}% Fulfilled
                  </span>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-forest/10">
                  <div
                    className="h-full bg-gradient-to-r from-forest to-emerald-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, (matchResult.matched_quantity / matchResult.required_quantity) * 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* Matched Seller Cards */}
              <div className="mt-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink/70">
                  Allocated Registered Sellers (आवंटित पंजीकृत विक्रेता)
                </h3>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {matchResult.artisans.map((artisan, index) => (
                    <div
                      key={artisan.artisan_id || index}
                      className="rounded-xl border border-forest/15 bg-white p-4 shadow-xs transition hover:border-forest hover:shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 rounded-full bg-forest/10 px-2.5 py-0.5 text-[10px] font-bold text-forest">
                          <Building2 className="h-3 w-3" />
                          <span>Seller #{index + 1}</span>
                        </div>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 border border-emerald-200">
                          {Math.round(artisan.match_score * 100)}% Match
                        </span>
                      </div>

                      <h4 className="font-serif-title mt-2 font-bold text-ink">
                        {artisan.business_name || `Master Artisan Cluster ${index + 1}`}
                      </h4>

                      <div className="mt-3 flex items-center justify-between border-t border-forest/10 pt-3 text-xs">
                        <span className="text-ink/60">Allocated Units:</span>
                        <span className="font-extrabold text-forest text-sm">
                          {artisan.matched_quantity} units
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-xs">
                        <span className="text-ink/60">Unit Estimate:</span>
                        <span className="font-bold text-ink">
                          ₹{unitBudget.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary & Submit */}
              {submitError && (
                <div className="mt-6 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-forest/10 pt-6 sm:flex-row">
                <div className="text-xs text-ink/70">
                  <p>
                    Estimated Total: <strong className="text-forest text-sm">₹{calculatedTotalBudget.toLocaleString("en-IN")}</strong>
                  </p>
                  <p className="text-[11px] text-ink/50">
                    Submitting places an official quote request with your authenticated Customer profile.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveStep("form")}
                    className="rounded-xl border border-forest/20 px-5 py-2.5 text-xs font-bold text-ink/80 transition hover:bg-sand"
                  >
                    Back
                  </button>

                  <button
                    onClick={handleSubmitQuote}
                    disabled={isSubmittingQuote}
                    className="inline-flex items-center gap-2 rounded-xl bg-forest px-6 py-3 text-sm font-bold text-white shadow-md transition hover:bg-forest/90 disabled:opacity-50"
                  >
                    {isSubmittingQuote ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Submitting Quote to Sellers...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Submit Quote Request / कोटेशन भेजें</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: SUCCESS BANNER */}
        {activeStep === "success" && (
          <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <span className="mt-4 inline-block rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              Status: Pending Review / प्रतीक्षारत
            </span>

            <h2 className="font-serif-title mt-2 text-2xl font-bold text-ink">
              Quote Request Submitted Successfully!
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-xs text-ink/70 sm:text-sm">
              Your bulk requirement has been submitted and notifications sent to the allocated master sellers. Track quote responses and accept quotes in your Customer Portal.
            </p>

            {createdQuote && (
              <div className="mx-auto mt-6 max-w-md rounded-xl border border-forest/10 bg-sand/30 p-4 text-left text-xs">
                <div className="flex justify-between py-1 border-b border-forest/10">
                  <span className="text-ink/60">Quote ID:</span>
                  <span className="font-mono font-bold text-forest">{createdQuote.id}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-forest/10">
                  <span className="text-ink/60">Total Quantity:</span>
                  <span className="font-bold text-ink">{createdQuote.quantity} units</span>
                </div>
                <div className="flex justify-between py-1 border-b border-forest/10">
                  <span className="text-ink/60">Total Budget:</span>
                  <span className="font-bold text-forest">₹{(createdQuote.total_budget || calculatedTotalBudget).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-ink/60">Allocations:</span>
                  <span className="font-bold text-emerald-700">{createdQuote.allocations?.length || matchResult?.artisans.length || 0} Sellers assigned</span>
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/buyer/quotes"
                className="inline-flex items-center gap-2 rounded-xl bg-forest px-6 py-3 text-xs font-bold text-white shadow-md transition hover:bg-forest/90"
              >
                <Layers className="h-4 w-4" />
                <span>Manage My Quotes / कोटेशन प्रबंधित करें</span>
              </Link>
              <button
                onClick={() => {
                  setRequirementText("");
                  setMatchResult(null);
                  setCreatedQuote(null);
                  setActiveStep("form");
                }}
                className="rounded-xl border border-forest/20 px-5 py-3 text-xs font-bold text-forest transition hover:bg-sand"
              >
                Submit Another Requirement
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Customer Auth Modal for Guest Users */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-forest/10">
            <div className="flex items-center justify-between border-b border-forest/10 pb-3">
              <div>
                <h3 className="font-serif-title text-lg font-bold text-ink">
                  {authMode === "login" ? "Customer Sign In (ग्राहक)" : "Register as Customer (ग्राहक)"}
                </h3>
                <p className="text-[11px] text-ink/60">
                  Sign in to connect your quote request to your account
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="rounded-full p-1 text-ink/50 hover:bg-sand hover:text-ink"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="mt-4 space-y-3">
              {authMode === "register" && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-ink/70">Full Name</label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-forest/20 bg-sand/30 p-2 text-xs text-ink outline-none focus:border-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-ink/70">Phone Number</label>
                    <input
                      type="text"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-forest/20 bg-sand/30 p-2 text-xs text-ink outline-none focus:border-forest"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-ink/70">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-forest/20 bg-sand/30 p-2 text-xs text-ink outline-none focus:border-forest"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-ink/70">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-forest/20 bg-sand/30 p-2 text-xs text-ink outline-none focus:border-forest"
                />
              </div>

              {authErrorMsg && (
                <div className="rounded-lg bg-red-50 p-2 text-[11px] text-red-700">
                  {authErrorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isAuthSubmitting}
                className="mt-2 w-full rounded-xl bg-forest py-2.5 text-xs font-bold text-white transition hover:bg-forest/90 disabled:opacity-50"
              >
                {isAuthSubmitting
                  ? "Authenticating..."
                  : authMode === "login"
                  ? "Sign In & Continue Quote"
                  : "Register & Continue Quote"}
              </button>
            </form>

            <div className="mt-4 text-center text-xs">
              {authMode === "login" ? (
                <p className="text-ink/60">
                  Don&apos;t have a Customer account?{" "}
                  <button
                    onClick={() => setAuthMode("register")}
                    className="font-bold text-terracotta underline"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <p className="text-ink/60">
                  Already registered?{" "}
                  <button
                    onClick={() => setAuthMode("login")}
                    className="font-bold text-forest underline"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomRequestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6">
          <div className="text-center space-y-3">
            <div className="h-10 w-10 border-3 border-forest border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-ink/70">Loading custom requirement form...</p>
          </div>
        </div>
      }
    >
      <CustomRequestContent />
    </Suspense>
  );
}
