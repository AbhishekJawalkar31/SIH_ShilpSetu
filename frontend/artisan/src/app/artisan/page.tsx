"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  FileText,
} from "lucide-react";
import { AuthProvider, useAuth } from "../../context/AuthContext";
import { MobileFrame } from "../../components/common/MobileFrame";
import { Header } from "../../components/common/Header";
import { BottomNav } from "../../components/common/BottomNav";
import { HeroBanner } from "../../components/dashboard/HeroBanner";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { RecentActivity } from "../../components/dashboard/RecentActivity";
import { ProductList } from "../../components/products/ProductList";
import { RequestsList } from "../../components/requests/RequestsList";
import { ProfileView } from "../../components/profile/ProfileView";
import { SellerLoginForm } from "../../components/auth/SellerLoginForm";
import { SellerRegisterForm } from "../../components/auth/SellerRegisterForm";
import { Stepper, AddStep } from "../../components/add-product/Stepper";
import { PhotoUpload } from "../../components/add-product/PhotoUpload";
import { LoadingState } from "../../components/add-product/LoadingState";
import { CatalogueReview } from "../../components/add-product/CatalogueReview";
import { PriceRecommender } from "../../components/add-product/PriceRecommender";
import { PublishSuccess } from "../../components/add-product/PublishSuccess";
import { Language, translations } from "../../lib/i18n";
import {
  Product,
  ActivityItem,
  CatalogueGenerationResponse,
  InventoryData,
  ProductCreateRequest,
  BackendOrder,
  BackendNotification,
  ArtisanProfile,
} from "../../services/types";
import { api, resolveBackendUrl } from "../../services/apiClient";

type AddFlowStep = "photo" | "loading" | "error" | "details" | "price" | "success";

function SellerPortalApp() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [lang, setLang] = useState<Language>("en");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [activeScreen, setActiveScreen] = useState<string>("dashboard");

  // Real products and activities
  const [products, setProducts] = useState<Product[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  // Real backend orders
  const [orders, setOrders] = useState<BackendOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Real backend notifications
  const [unreadNotifications, setUnreadNotifications] = useState<BackendNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);

  // Real artisan profile
  const [artisanProfile, setArtisanProfile] = useState<ArtisanProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(false);

  // Add Product Flow State
  const [addStep, setAddStep] = useState<AddFlowStep>("photo");
  const [uploadedFile, setUploadedFile] = useState<File | Blob | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const [uploadedBackendUrl, setUploadedBackendUrl] = useState<string | null>(null);
  const [voiceText, setVoiceText] = useState<string>("");
  const [catalogueData, setCatalogueData] = useState<CatalogueGenerationResponse | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryData>({
    available_quantity: 1,
    production_capacity: 10,
    unit: "piece",
  });
  const [artisanPrice, setArtisanPrice] = useState<number>(500);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedProduct, setPublishedProduct] = useState<Product | null>(null);

  const t = translations[lang];

  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "hi" : "en"));
  };

  const resetAddProductFlow = () => {
    setAddStep("photo");
    setUploadedFile(null);
    setUploadedPreviewUrl(null);
    setUploadedBackendUrl(null);
    setVoiceText("");
    setCatalogueData(null);
    setInventoryData({
      available_quantity: 1,
      production_capacity: 10,
      unit: "piece",
    });
    setArtisanPrice(500);
    setAiError(null);
    setIsPublishing(false);
    setPublishError(null);
    setPublishedProduct(null);
  };

  // Fetch real products for authenticated seller with deduplication
  const loadSellerProducts = useCallback(async () => {
    if (!user?.artisan_id && !user?.id) return;
    const sellerId = user.artisan_id || user.id;

    setIsLoadingProducts(true);
    setProductsError(null);
    try {
      const liveProds = await api.getArtisanProducts(sellerId);
      if (Array.isArray(liveProds)) {
        setProducts((prev) => {
          const map = new Map<string, Product>();
          // 1. Authoritative products from backend
          liveProds.forEach((p) => map.set(p.id, p));
          // 2. Retain any locally prepended products if not yet indexed
          prev.forEach((p) => {
            if (!map.has(p.id)) map.set(p.id, p);
          });
          return Array.from(map.values());
        });
      }
    } catch (err: any) {
      console.warn("Could not load products for seller:", err);
      setProductsError(
        err.message ||
          (lang === "hi"
            ? "उत्पाद लोड करने में विफल। कृपया पुनः प्रयास करें।"
            : "Failed to load products. Please check your connection.")
      );
    } finally {
      setIsLoadingProducts(false);
    }
  }, [user?.artisan_id, user?.id, lang]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSellerProducts();
    }
  }, [isAuthenticated, loadSellerProducts]);

  const handleProductUpdated = (updatedProduct: Product) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p))
    );
  };

  // Fetch real orders for authenticated seller
  const loadSellerOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      const resp = await api.getOrders();
      if (resp && Array.isArray(resp.items)) {
        setOrders(resp.items);
      }
    } catch (err: any) {
      console.warn("Could not load seller orders:", err);
      setOrdersError(
        err.message ||
          (lang === "hi"
            ? "ऑर्डर लोड करने में विफल। कृपया पुनः प्रयास करें।"
            : "Failed to load orders. Please check your connection.")
      );
    } finally {
      setIsLoadingOrders(false);
    }
  }, [isAuthenticated, lang]);

  // Fetch real unread notifications for authenticated seller
  const loadUnreadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingNotifications(true);
    try {
      const resp = await api.getUnreadNotifications();
      if (resp && Array.isArray(resp.items)) {
        setUnreadNotifications(resp.items);
        setUnreadCount(resp.unread_count ?? resp.items.length);
      }
    } catch (err: any) {
      console.warn("Could not load unread notifications:", err);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isAuthenticated]);

  // Mark notification as read with backend confirmation
  const handleMarkNotificationRead = async (notificationId: string) => {
    const confirmed = await api.markNotificationRead(notificationId);
    if (confirmed) {
      setUnreadNotifications((prev) =>
        prev.filter((n) => n.id !== notificationId)
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  // Fetch real artisan profile for authenticated seller
  const loadSellerProfile = useCallback(async () => {
    if (!user?.artisan_id) return;
    setIsLoadingProfile(true);
    try {
      const prof = await api.getArtisanProfile(user.artisan_id);
      if (prof) {
        setArtisanProfile(prof);
      }
    } catch (err: any) {
      console.warn("Could not load artisan profile:", err);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user?.artisan_id]);

  useEffect(() => {
    if (isAuthenticated) {
      loadSellerOrders();
      loadUnreadNotifications();
      loadSellerProfile();
    }
  }, [isAuthenticated, loadSellerOrders, loadUnreadNotifications, loadSellerProfile]);

  // Refresh when switching screens to keep data authoritative
  useEffect(() => {
    if (isAuthenticated) {
      if (activeScreen === "requests") {
        loadSellerOrders();
      } else if (activeScreen === "dashboard") {
        loadUnreadNotifications();
      } else if (activeScreen === "profile") {
        loadSellerProfile();
      }
    }
  }, [activeScreen, isAuthenticated, loadSellerOrders, loadUnreadNotifications, loadSellerProfile]);

  // Real order calculations:
  // Pending count: orders with status pending, confirmed, or processing
  const pendingOrdersCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === "pending" ||
        o.status === "confirmed" ||
        o.status === "processing"
    ).length;
  }, [orders]);

  // Real earnings from completed orders
  const totalEarnings = useMemo(() => {
    return orders
      .filter((o) => o.status === "completed")
      .reduce((acc, o) => acc + (Number(o.total_price) || 0), 0);
  }, [orders]);

  const formattedEarnings = `₹${totalEarnings.toLocaleString()}`;

  // Generate activities from real orders
  useEffect(() => {
    if (orders.length > 0) {
      const orderActivities: ActivityItem[] = orders.slice(0, 5).map((o) => {
        const firstTitle =
          o.items && o.items.length > 0 && o.items[0].product_title
            ? o.items[0].product_title
            : lang === "hi"
            ? "शिल्प उत्पाद"
            : "Artisanal Craft";

        const orderDate = new Date(o.created_at);
        const timeAgo = orderDate.toLocaleDateString(
          lang === "hi" ? "hi-IN" : "en-IN",
          {
            month: "short",
            day: "numeric",
          }
        );

        return {
          id: o.id,
          title: `${firstTitle} (#ORD-${o.id.slice(0, 6).toUpperCase()})`,
          type: "order",
          time_ago: timeAgo,
          status: o.status,
        };
      });
      setActivities(orderActivities);
    } else {
      setActivities([]);
    }
  }, [orders, lang]);

  // Add Product Handlers
  const handleGenerateAiCatalogue = async (file: File | Blob, voiceNotes: string) => {
    if (!user?.artisan_id) {
      setAiError(
        lang === "hi"
          ? "विक्रेता प्रोफ़ाइल लिंक नहीं है। उत्पाद जोड़ने के लिए विक्रेता खाता आवश्यक है।"
          : "Seller profile is not linked. A seller account is required to list products."
      );
      setAddStep("error");
      return;
    }

    setUploadedFile(file);
    if (file instanceof File) {
      setUploadedPreviewUrl(URL.createObjectURL(file));
    }
    setVoiceText(voiceNotes);
    setAiError(null);
    setAddStep("loading");

    try {
      // 1. Upload image to backend static storage first
      let backendImageUrl = uploadedBackendUrl;
      if (!backendImageUrl) {
        const uploadRes = await api.uploadImage(file);
        backendImageUrl = uploadRes.image_url;
        setUploadedBackendUrl(backendImageUrl);
      }

      // 2. Multimodal catalogue generation
      const catRes = await api.generateCatalogue(file, user.artisan_id, voiceNotes);
      setCatalogueData(catRes);

      // 3. Set default price from AI recommendations
      if (catRes.recommended_price_min > 0 && catRes.recommended_price_max > 0) {
        const mid = Math.round((catRes.recommended_price_min + catRes.recommended_price_max) / 2);
        setArtisanPrice(mid);
      } else if (catRes.recommended_price_min > 0) {
        setArtisanPrice(catRes.recommended_price_min);
      } else {
        setArtisanPrice(500);
      }

      setAddStep("details");
    } catch (err: any) {
      console.error("AI catalogue generation error:", err);
      const msg =
        err.message ||
        (lang === "hi" ? "एआई कैटलॉग बनाने में विफल" : "Failed to generate AI catalogue");
      setAiError(msg);
      setAddStep("error");
    }
  };

  const handleManualEntry = (file: File | Blob, voiceNotes: string) => {
    setUploadedFile(file);
    if (file instanceof File) {
      setUploadedPreviewUrl(URL.createObjectURL(file));
    }
    setVoiceText(voiceNotes);
    setAiError(null);

    const fallbackCatalogue: CatalogueGenerationResponse = {
      title: "",
      description: voiceNotes || "",
      category: "Home Decor",
      material: "",
      craft_type: "",
      tags: [],
      attributes: {},
      recommended_price_min: 0,
      recommended_price_max: 0,
    };
    setCatalogueData(fallbackCatalogue);
    setArtisanPrice(500);

    // Upload image in background if needed
    if (!uploadedBackendUrl && file) {
      api.uploadImage(file)
        .then((res) => {
          setUploadedBackendUrl(res.image_url);
        })
        .catch((err) => {
          console.warn("Background image upload error:", err);
        });
    }

    setAddStep("details");
  };

  const handlePublishProduct = async () => {
    if (!user?.artisan_id) {
      setPublishError(
        lang === "hi" ? "विक्रेता प्रोफ़ाइल लिंक नहीं है।" : "Seller profile is not linked."
      );
      return;
    }
    if (!catalogueData) return;

    setIsPublishing(true);
    setPublishError(null);

    try {
      let finalImageUrl = uploadedBackendUrl;
      if (!finalImageUrl && uploadedFile) {
        const uploadRes = await api.uploadImage(uploadedFile);
        finalImageUrl = uploadRes.image_url;
        setUploadedBackendUrl(finalImageUrl);
      }

      const payload: ProductCreateRequest = {
        artisan_id: user.artisan_id,
        title: catalogueData.title.trim(),
        description: catalogueData.description.trim(),
        category: catalogueData.category,
        material: catalogueData.material?.trim() || undefined,
        craft_type: catalogueData.craft_type?.trim() || undefined,
        tags: Array.isArray(catalogueData.tags) ? catalogueData.tags : [],
        attributes: catalogueData.attributes || {},
        price: Number(artisanPrice) || 500,
        currency: "INR",
        image_url: finalImageUrl || undefined,
        status: "published",
        available_quantity: Number(inventoryData.available_quantity) || 1,
        production_capacity: Number(inventoryData.production_capacity) || 10,
        unit: inventoryData.unit || "piece",
      };

      const newProduct = await api.createProduct(payload);

      // Prepend to products state
      setProducts((prev) => [newProduct, ...prev]);
      setPublishedProduct(newProduct);
      setAddStep("success");
    } catch (err: any) {
      console.error("Product publishing error:", err);
      setPublishError(
        err.message ||
          (lang === "hi" ? "उत्पाद प्रकाशित करने में विफल" : "Failed to publish product")
      );
    } finally {
      setIsPublishing(false);
    }
  };

  // Loading Screen
  if (isLoading) {
    return (
      <MobileFrame>
        <div className="min-h-[600px] flex flex-col items-center justify-center p-6 bg-warmcream text-center">
          <div className="relative mb-4">
            <div className="w-16 h-16 rounded-3xl bg-terracotta text-white font-black text-2xl flex items-center justify-center shadow-lg animate-pulse">
              श
            </div>
            <div className="absolute -inset-2 rounded-3xl border-2 border-terracotta/30 animate-ping pointer-events-none" />
          </div>
          <h2 className="font-extrabold text-earthy-title text-lg tracking-tight">
            ShilpSetu
          </h2>
          <p className="text-xs text-terracotta font-semibold mt-0.5">
            {lang === "hi" ? "विक्रेता पोर्टल" : "Seller Portal"}
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-earthy-muted">
            <div className="w-3 h-3 border-2 border-terracotta/40 border-t-terracotta rounded-full animate-spin" />
            <span>
              {lang === "hi"
                ? "सत्र लोड हो रहा है..."
                : "Restoring seller session..."}
            </span>
          </div>
        </div>
      </MobileFrame>
    );
  }

  // Unauthenticated Screen: Login or Register
  if (!isAuthenticated) {
    return (
      <MobileFrame>
        {authMode === "login" ? (
          <SellerLoginForm
            lang={lang}
            onToggleLang={toggleLanguage}
            onSwitchToRegister={() => setAuthMode("register")}
          />
        ) : (
          <SellerRegisterForm
            lang={lang}
            onToggleLang={toggleLanguage}
            onSwitchToLogin={() => setAuthMode("login")}
          />
        )}
      </MobileFrame>
    );
  }

  // Map AddFlowStep to Stepper's AddStep
  const getStepperStep = (): AddStep => {
    if (addStep === "details") return "details";
    if (addStep === "price") return "price";
    if (addStep === "success") return "publish";
    return "photo";
  };

  // Authenticated Screen: Application Shell
  return (
    <MobileFrame>
      {/* Top App Header */}
      <Header
        lang={lang}
        onToggleLang={toggleLanguage}
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          if (activeScreen === "add" && screen !== "add") {
            resetAddProductFlow();
          }
          setActiveScreen(screen);
        }}
        unreadCount={unreadCount}
        notifications={unreadNotifications}
        isLoadingNotifications={isLoadingNotifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onRefreshNotifications={loadUnreadNotifications}
      />

      {/* Main Content Area */}
      <main className="pb-16 min-h-[560px]">
        {/* SCREEN 1: DASHBOARD */}
        {activeScreen === "dashboard" && (
          <div className="space-y-2 pb-4">
            <HeroBanner
              lang={lang}
              onAddProduct={() => {
                resetAddProductFlow();
                setActiveScreen("add");
              }}
            />

            <QuickActions
              lang={lang}
              productCount={products.length}
              newOrdersCount={pendingOrdersCount}
              earnings={formattedEarnings}
              onActionClick={(action) => {
                if (action === "add") {
                  resetAddProductFlow();
                  setActiveScreen("add");
                } else if (action === "products") {
                  setActiveScreen("products");
                } else if (action === "requests") {
                  setActiveScreen("requests");
                } else if (action === "earnings") {
                  alert(
                    lang === "hi"
                      ? `कुल कमाई विवरण: ${formattedEarnings} (${orders.filter((o) => o.status === "completed").length} पूर्ण ऑर्डर)`
                      : `Total Earnings: ${formattedEarnings} (${orders.filter((o) => o.status === "completed").length} completed orders)`
                  );
                }
              }}
            />

            {/* Zero mock data: Recent activity shows real order activity or clean empty state */}
            <RecentActivity
              lang={lang}
              activities={activities}
              onViewAll={() => setActiveScreen("requests")}
            />
          </div>
        )}

        {/* SCREEN 2: ADD PRODUCT FLOW (5 STAGES) */}
        {activeScreen === "add" && (
          <div>
            {/* Guard against missing seller/artisan profile */}
            {!user?.artisan_id ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-warmcream-border">
                  <button
                    onClick={() => setActiveScreen("dashboard")}
                    className="flex items-center gap-1 text-xs font-bold text-earthy-title hover:text-terracotta transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>{lang === "hi" ? "वापस डैशबोर्ड" : "Back to Dashboard"}</span>
                  </button>
                </div>

                <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-sm text-earthy-title">
                    {lang === "hi" ? "विक्रेता प्रोफ़ाइल लिंक नहीं है" : "Seller Profile Required"}
                  </h3>
                  <p className="text-xs text-earthy-muted leading-relaxed">
                    {lang === "hi"
                      ? "उत्पाद जोड़ने के लिए एक सक्रिय विक्रेता प्रोफ़ाइल आवश्यक है। कृपया अपनी प्रोफ़ाइल पूरी करें।"
                      : "An active seller profile is required to list products. Please sign in with a registered seller account."}
                  </p>
                  <button
                    onClick={() => setActiveScreen("profile")}
                    className="px-4 py-2 rounded-xl bg-terracotta text-white font-bold text-xs shadow-sm hover:bg-terracotta-700 transition"
                  >
                    {lang === "hi" ? "प्रोफ़ाइल देखें" : "View Profile"}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Top Stepper Bar (visible during stages 1-4) */}
                {addStep !== "success" && (
                  <div className="bg-white border-b border-warmcream-border sticky top-0 z-20">
                    <div className="flex items-center justify-between px-4 py-2">
                      <button
                        onClick={() => {
                          if (addStep === "photo") {
                            setActiveScreen("dashboard");
                          } else if (addStep === "details" || addStep === "error") {
                            setAddStep("photo");
                          } else if (addStep === "price") {
                            setAddStep("details");
                          }
                        }}
                        className="flex items-center gap-1 text-xs font-bold text-earthy-title hover:text-terracotta transition"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>
                          {addStep === "photo"
                            ? (lang === "hi" ? "वापस डैशबोर्ड" : "Back to Dashboard")
                            : (lang === "hi" ? "पिछला चरण" : "Previous Step")}
                        </span>
                      </button>

                      <span className="text-[11px] font-bold text-terracotta tracking-tight">
                        {lang === "hi" ? "नया उत्पाद जोड़ें" : "Add Product"}
                      </span>
                    </div>

                    <Stepper
                      currentStep={getStepperStep()}
                      onStepClick={(stepKey) => {
                        if (stepKey === "photo" && (addStep === "details" || addStep === "price")) {
                          setAddStep("photo");
                        } else if (stepKey === "details" && addStep === "price") {
                          setAddStep("details");
                        }
                      }}
                      lang={lang}
                    />
                  </div>
                )}

                {/* STAGE 1: Photo & Voice Note */}
                {addStep === "photo" && (
                  <PhotoUpload
                    lang={lang}
                    initialImageFile={uploadedFile}
                    initialImagePreview={uploadedPreviewUrl}
                    initialVoiceText={voiceText}
                    onGenerate={handleGenerateAiCatalogue}
                    onManualEntry={handleManualEntry}
                    isGenerating={false}
                  />
                )}

                {/* STAGE 2: Progressive Loading State */}
                {addStep === "loading" && <LoadingState lang={lang} />}

                {/* AI Error Fallback Card */}
                {addStep === "error" && (
                  <div className="p-5 flex flex-col items-center justify-center min-h-[420px] text-center space-y-4">
                    <div className="w-16 h-16 rounded-3xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm">
                      <AlertCircle className="w-8 h-8" />
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-earthy-title">
                        {lang === "hi" ? "एआई कैटलॉग विश्लेषण में समस्या" : "AI Service Notice"}
                      </h3>
                      <p className="text-xs text-earthy-body mt-1 max-w-xs mx-auto leading-relaxed bg-amber-50/60 p-3 rounded-2xl border border-amber-100">
                        {aiError || (lang === "hi" ? "एआई सेवा अनुपलब्ध है।" : "AI service unavailable.")}
                      </p>
                    </div>

                    <div className="w-full max-w-xs space-y-2.5 pt-2">
                      {uploadedFile && (
                        <button
                          onClick={() => handleGenerateAiCatalogue(uploadedFile, voiceText)}
                          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-terracotta to-ochre text-white font-black text-xs shadow-md hover:brightness-105 active:scale-95 transition flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span>{lang === "hi" ? "पुनः प्रयास करें (एआई)" : "Retry AI Generation"}</span>
                        </button>
                      )}

                      {uploadedFile && (
                        <button
                          onClick={() => handleManualEntry(uploadedFile, voiceText)}
                          className="w-full py-3 px-4 rounded-xl bg-white border border-warmcream-border text-earthy-title font-bold text-xs shadow-xs hover:bg-stone-50 active:scale-95 transition flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4 text-stone-500" />
                          <span>{lang === "hi" ? "मैन्युअल रूप से जारी रखें" : "Continue Manually"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setAddStep("photo")}
                        className="w-full py-2 text-xs font-semibold text-earthy-muted hover:text-terracotta transition"
                      >
                        {lang === "hi" ? "फोटो या विवरण बदलें" : "Change Photo or Voice Note"}
                      </button>
                    </div>
                  </div>
                )}

                {/* STAGE 3: Catalogue Review & Edit (+ Inventory) */}
                {addStep === "details" && catalogueData && (
                  <CatalogueReview
                    catalogue={catalogueData}
                    inventory={inventoryData}
                    imagePreview={uploadedPreviewUrl || resolveBackendUrl(uploadedBackendUrl || undefined)}
                    onChangeCatalogue={(updated) => setCatalogueData(updated)}
                    onChangeInventory={(updated) => setInventoryData(updated)}
                    onNext={() => setAddStep("price")}
                    onBack={() => setAddStep("photo")}
                    lang={lang}
                  />
                )}

                {/* STAGE 4: Fair Price Recommender */}
                {addStep === "price" && catalogueData && (
                  <PriceRecommender
                    catalogue={catalogueData}
                    price={artisanPrice}
                    onPriceChange={(newPrice) => setArtisanPrice(newPrice)}
                    onPublish={handlePublishProduct}
                    onBack={() => setAddStep("details")}
                    isPublishing={isPublishing}
                    publishError={publishError}
                    lang={lang}
                  />
                )}

                {/* STAGE 5: Publish Success */}
                {addStep === "success" && publishedProduct && (
                  <PublishSuccess
                    product={publishedProduct}
                    onViewListing={() => {
                      resetAddProductFlow();
                      setActiveScreen("products");
                    }}
                    onAddAnother={() => {
                      resetAddProductFlow();
                      setAddStep("photo");
                    }}
                    onGoHome={() => {
                      resetAddProductFlow();
                      setActiveScreen("dashboard");
                    }}
                    lang={lang}
                  />
                )}
              </div>
            )}
          </div>
        )}

        {/* SCREEN 3: MY PRODUCTS */}
        {activeScreen === "products" && (
          <ProductList
            products={products}
            onAddProduct={() => {
              resetAddProductFlow();
              setActiveScreen("add");
            }}
            isLoading={isLoadingProducts}
            error={productsError}
            onRetry={loadSellerProducts}
            onProductUpdated={handleProductUpdated}
            lang={lang}
          />
        )}

        {/* SCREEN 4: REQUESTS & ORDERS */}
        {activeScreen === "requests" && (
          <RequestsList
            orders={orders}
            isLoading={isLoadingOrders}
            error={ordersError}
            onRetry={loadSellerOrders}
            lang={lang}
          />
        )}

        {/* SCREEN 5: SELLER PROFILE */}
        {activeScreen === "profile" && (
          <ProfileView
            profile={artisanProfile}
            isLoading={isLoadingProfile}
            lang={lang}
            onToggleLang={toggleLanguage}
          />
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          if (activeScreen === "add" && screen !== "add") {
            resetAddProductFlow();
          }
          setActiveScreen(screen);
        }}
        lang={lang}
        pendingOrdersCount={pendingOrdersCount}
      />
    </MobileFrame>
  );
}

export default function ArtisanAppPage() {
  return (
    <AuthProvider>
      <SellerPortalApp />
    </AuthProvider>
  );
}
