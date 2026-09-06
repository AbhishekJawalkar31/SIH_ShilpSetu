"use client";

import React, { useState } from "react";
import { ChevronLeft, Globe } from "lucide-react";
import { MobileFrame } from "../../components/common/MobileFrame";
import { Header } from "../../components/common/Header";
import { BottomNav } from "../../components/common/BottomNav";
import { HeroBanner } from "../../components/dashboard/HeroBanner";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { RecentActivity } from "../../components/dashboard/RecentActivity";
import { Stepper, AddStep } from "../../components/add-product/Stepper";
import { PhotoUpload } from "../../components/add-product/PhotoUpload";
import { LoadingState } from "../../components/add-product/LoadingState";
import { CatalogueReview } from "../../components/add-product/CatalogueReview";
import { PriceRecommender } from "../../components/add-product/PriceRecommender";
import { PublishSuccess } from "../../components/add-product/PublishSuccess";
import { ProductList } from "../../components/products/ProductList";
import { RequestsList } from "../../components/requests/RequestsList";
import { ProfileView } from "../../components/profile/ProfileView";
import {
  initialProducts,
  mockArtisanProfile,
  mockQuoteRequests,
  mockOrders,
  mockActivities,
} from "../../lib/mockData";
import { Language, translations } from "../../lib/i18n";
import {
  Product,
  CatalogueGenerationResponse,
  ActivityItem,
} from "../../services/types";
import { generateCatalogue, createProduct } from "../../services/api";

export default function ArtisanApp() {
  // Localization state (Hindi / English)
  const [lang, setLang] = useState<Language>("en");
  const t = translations[lang];

  // Screen state: "dashboard" | "add" | "products" | "requests" | "profile"
  const [activeScreen, setActiveScreen] = useState<string>("dashboard");

  // Add Product Multi-step state: "photo" | "loading" | "details" | "price" | "success"
  const [addStep, setAddStep] = useState<
    "photo" | "loading" | "details" | "price" | "success"
  >("photo");

  // Products and Activities list
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [activities, setActivities] = useState<ActivityItem[]>(mockActivities);
  const [earnings, setEarnings] = useState<string>("₹12,340");

  // Add Product Form Data
  const [uploadedImageFile, setUploadedImageFile] = useState<File | Blob | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string>(
    "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600"
  );
  const [catalogueData, setCatalogueData] = useState<CatalogueGenerationResponse>({
    title: "Handcrafted Jute Tote Bag",
    description:
      "Eco-friendly handwoven natural jute tote bag with reinforced handles and traditional floral embroidery.",
    category: "Bags",
    material: "Golden Jute Fiber",
    craft_type: "Handwoven",
    tags: ["handmade", "eco-friendly", "jute", "bulk", "gifting"],
    attributes: {
      color: "Natural Golden Brown",
      size: "Large (16x14 inches)",
      weight: "320g",
    },
    recommended_price_min: 699,
    recommended_price_max: 899,
  });
  const [artisanPrice, setArtisanPrice] = useState<number>(750);
  const [publishedProduct, setPublishedProduct] = useState<Product | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);

  // Toggle Language
  const toggleLanguage = () => {
    setLang((prev) => (prev === "en" ? "hi" : "en"));
  };

  // Trigger AI Catalogue Generation
  const handleGenerateCatalogue = async (
    imageFile: File | Blob,
    voiceText: string
  ) => {
    setUploadedImageFile(imageFile);
    if (imageFile instanceof File) {
      setUploadedImagePreview(URL.createObjectURL(imageFile));
    }
    setAddStep("loading");
    setIsGenerating(true);

    try {
      const generated = await generateCatalogue(
        imageFile,
        voiceText,
        mockArtisanProfile.id
      );
      setCatalogueData(generated);
      setArtisanPrice(
        Math.round((generated.recommended_price_min + generated.recommended_price_max) / 2)
      );
      setAddStep("details");
    } catch (err) {
      console.error("Catalogue generation error:", err);
      setAddStep("details");
    } finally {
      setIsGenerating(false);
    }
  };

  // Publish final product
  const handlePublishProduct = async () => {
    setIsPublishing(true);
    try {
      const newProduct = await createProduct({
        artisan_id: mockArtisanProfile.id,
        title: catalogueData.title,
        description: catalogueData.description,
        category: catalogueData.category,
        material: catalogueData.material,
        craft_type: catalogueData.craft_type,
        tags: catalogueData.tags,
        attributes: catalogueData.attributes,
        price: artisanPrice,
        currency: "INR",
        image_url: uploadedImagePreview,
        status: "published",
      });

      setProducts((prev) => [newProduct, ...prev]);
      setPublishedProduct(newProduct);
      setActivities((prev) => [
        {
          id: `act-${Date.now()}`,
          title: newProduct.title,
          type: "listed",
          time_ago: "Just now",
          status: "Listed",
        },
        ...prev,
      ]);

      setAddStep("success");
    } catch (err) {
      console.error("Publishing error:", err);
    } finally {
      setIsPublishing(false);
    }
  };

  // Reset Add Product flow
  const handleResetAddFlow = () => {
    setAddStep("photo");
    setArtisanPrice(750);
    setPublishedProduct(null);
  };

  return (
    <MobileFrame>
      {/* Top Header */}
      <Header
        lang={lang}
        onToggleLang={toggleLanguage}
        profile={mockArtisanProfile}
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          setActiveScreen(screen);
          if (screen === "add") handleResetAddFlow();
        }}
      />

      {/* SCREEN 1: DASHBOARD / HOME (Matches Screenshot 1) */}
      {activeScreen === "dashboard" && (
        <div className="space-y-2 pb-4">
          <HeroBanner
            lang={lang}
            onAddProduct={() => {
              setActiveScreen("add");
              handleResetAddFlow();
            }}
          />

          <QuickActions
            lang={lang}
            productCount={products.length}
            newOrdersCount={3}
            earnings={earnings}
            onActionClick={(action) => {
              if (action === "add") {
                setActiveScreen("add");
                handleResetAddFlow();
              } else if (action === "products") {
                setActiveScreen("products");
              } else if (action === "requests") {
                setActiveScreen("requests");
              } else if (action === "earnings") {
                alert(
                  lang === "hi"
                    ? "कुल कमाई विवरण: ₹12,340 (इस माह 3 पूर्ण ऑर्डर)"
                    : "Total Earnings: ₹12,340 (3 completed orders this month)"
                );
              }
            }}
          />

          <RecentActivity
            lang={lang}
            activities={activities}
            onViewAll={() => setActiveScreen("requests")}
          />
        </div>
      )}

      {/* SCREEN 2: ADD PRODUCT FLOW (Matches Screenshot 2) */}
      {activeScreen === "add" && (
        <div>
          {/* Back to dashboard top bar */}
          <div className="px-4 py-2 bg-warmcream flex items-center justify-between border-b border-warmcream-border">
            <button
              onClick={() => {
                if (addStep === "details") setAddStep("photo");
                else if (addStep === "price") setAddStep("details");
                else setActiveScreen("dashboard");
              }}
              className="flex items-center gap-1 text-xs font-bold text-earthy-title hover:text-terracotta"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{t.addProduct}</span>
            </button>

            {/* Language toggle pill in Add Product header (matching screenshot 2) */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-terracotta/30 text-terracotta font-bold text-xs shadow-xs"
            >
              <span className="font-extrabold">{lang === "en" ? "अ" : "A"}</span>
              <span className="text-[10px]">{t.langSwitch}</span>
            </button>
          </div>

          {/* Stepper Navigation */}
          {addStep !== "loading" && addStep !== "success" && (
            <Stepper
              currentStep={
                addStep === "details"
                  ? "details"
                  : addStep === "price"
                  ? "price"
                  : "photo"
              }
              onStepClick={(step) => {
                if (step === "photo") setAddStep("photo");
                else if (step === "details") setAddStep("details");
              }}
              lang={lang}
            />
          )}

          {/* Stage 1: Photo & Voice Note */}
          {addStep === "photo" && (
            <PhotoUpload
              lang={lang}
              onGenerate={handleGenerateCatalogue}
              isGenerating={isGenerating}
            />
          )}

          {/* Stage 2: AI Loading Screen */}
          {addStep === "loading" && <LoadingState lang={lang} />}

          {/* Stage 3: Catalogue Review & Edit */}
          {addStep === "details" && (
            <CatalogueReview
              catalogue={catalogueData}
              onChange={setCatalogueData}
              onNext={() => setAddStep("price")}
              onBack={() => setAddStep("photo")}
              lang={lang}
            />
          )}

          {/* Stage 4: Price Recommender (Matches Screenshot 2) */}
          {addStep === "price" && (
            <PriceRecommender
              catalogue={catalogueData}
              price={artisanPrice}
              onPriceChange={setArtisanPrice}
              onNext={handlePublishProduct}
              onBack={() => setAddStep("details")}
              lang={lang}
            />
          )}

          {/* Stage 5: Success Screen */}
          {addStep === "success" && publishedProduct && (
            <PublishSuccess
              product={publishedProduct}
              onViewListing={() => setActiveScreen("products")}
              onAddAnother={handleResetAddFlow}
              onGoHome={() => setActiveScreen("dashboard")}
              lang={lang}
            />
          )}
        </div>
      )}

      {/* SCREEN 3: MY PRODUCTS LISTINGS */}
      {activeScreen === "products" && (
        <ProductList
          products={products}
          onAddProduct={() => {
            setActiveScreen("add");
            handleResetAddFlow();
          }}
          lang={lang}
        />
      )}

      {/* SCREEN 4: REQUESTS / CHAT / ORDERS (Matches Screenshot 3) */}
      {activeScreen === "requests" && (
        <RequestsList
          quoteRequests={mockQuoteRequests}
          orders={mockOrders}
          lang={lang}
        />
      )}

      {/* SCREEN 5: ARTISAN PROFILE */}
      {activeScreen === "profile" && (
        <ProfileView
          profile={mockArtisanProfile}
          lang={lang}
          onToggleLang={toggleLanguage}
        />
      )}

      {/* Fixed Bottom Navigation */}
      <BottomNav
        activeScreen={activeScreen}
        onNavigate={(screen) => {
          setActiveScreen(screen);
          if (screen === "add") handleResetAddFlow();
        }}
        lang={lang}
        pendingOrdersCount={3}
      />
    </MobileFrame>
  );
}

