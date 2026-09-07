"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowRight,
  Award,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  Filter,
  Globe,
  Heart,
  HelpCircle,
  Lock,
  LogOut,
  MapPin,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  X,
} from "lucide-react";
import {
  Artisan,
  Order,
  Product,
  artisans,
  categories,
  initialOrders,
  products as mockProducts,
  userProfile,
} from "../lib/mockData";
import {
  getProducts,
  getProduct,
  getArtisan,
  searchProducts,
  ApiError,
} from "../services/api";
import {
  adaptBackendProduct,
  adaptSearchResultItem,
} from "../services/adapters";
import { Product as BackendProduct } from "../services/types";

const featuredVideoUrls = [
  "https://pixabay.com/videos/download/video-45455_medium.mp4",
  "https://www.pexels.com/download/video/20143605/",
  "https://www.pexels.com/download/video/8066061/",
  "https://www.pexels.com/download/video/20788616/",
];

// --- OFFICIAL SHILPSETU LOGO SVG COMPONENT ---
function ShilpSetuLogo({
  className = "h-10",
  showTagline = true,
  variant = "dark",
}: {
  className?: string;
  showTagline?: boolean;
  variant?: "dark" | "light";
}) {
  const tealColor = variant === "light" ? "#ffffff" : "#164E46";
  const terracottaColor = variant === "light" ? "#F5ECE0" : "#BE5B38";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Precision Emblem Vector matching official logo image */}
      <svg
        viewBox="0 0 160 160"
        className="h-full w-auto shrink-0 drop-shadow-xs select-none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Framing Arch: Left Terracotta Rust, Right Forest Teal */}
        <path
          d="M 28 85 A 54 54 0 0 1 80 30"
          stroke={terracottaColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 80 30 A 54 54 0 0 1 132 85"
          stroke={tealColor}
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Plant / Green Leaf Sprouts on Left */}
        <path
          d="M 32 78 C 24 65 32 50 40 45 C 40 55 36 70 32 78 Z"
          fill="#3B7A57"
        />
        <path
          d="M 40 64 C 34 56 42 42 48 38 C 48 48 44 58 40 64 Z"
          fill="#3B7A57"
          opacity="0.85"
        />
        <line x1="32" y1="78" x2="40" y2="45" stroke="#2D5A40" strokeWidth="1.5" />

        {/* Tech/Digital Nodes Branch on Right */}
        <path d="M 125 76 L 125 52 M 125 58 L 136 48 M 125 66 L 115 56" stroke={tealColor} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="136" cy="48" r="3.5" fill={terracottaColor} />
        <circle cx="125" cy="52" r="3.5" fill={tealColor} />
        <circle cx="115" cy="56" r="3" fill="#3B7A57" />

        {/* Arched Bridge ("Setu") */}
        <path
          d="M 20 100 C 50 68 110 68 140 100 L 132 108 C 106 82 54 82 28 108 Z"
          fill={tealColor}
        />
        {/* Inner Bridge Arch cutout */}
        <path
          d="M 48 108 C 62 90 98 90 112 108 Z"
          fill={variant === "light" ? "#164E46" : "#FDFBF7"}
        />

        {/* Vertical Railings on Bridge */}
        <line x1="45" y1="92" x2="45" y2="102" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
        <line x1="65" y1="84" x2="65" y2="98" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
        <line x1="80" y1="81" x2="80" y2="97" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
        <line x1="95" y1="84" x2="95" y2="98" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />
        <line x1="115" y1="92" x2="115" y2="102" stroke="#ffffff" strokeWidth="1.5" opacity="0.7" />

        {/* Artisan Figure sitting on bridge shaping pottery */}
        <circle cx="70" cy="48" r="6" fill={terracottaColor} />
        <circle cx="66" cy="44" r="3" fill={terracottaColor} />
        <path
          d="M 64 54 C 64 54 74 54 78 64 C 76 68 68 70 60 66 Z"
          fill={terracottaColor}
        />
        <path
          d="M 80 62 C 77 62 76 68 78 72 C 80 75 86 75 88 72 C 90 68 89 62 86 62 Z"
          fill={terracottaColor}
        />

        {/* 3 Community Figures Under the Arch */}
        {/* Left person (Teal) */}
        <circle cx="58" cy="116" r="3.5" fill={tealColor} />
        <path d="M 52 130 C 52 123 64 123 64 130 Z" fill={tealColor} />
        {/* Middle person (Terracotta Rust) */}
        <circle cx="80" cy="112" r="4.5" fill={terracottaColor} />
        <path d="M 72 132 C 72 122 88 122 88 132 Z" fill={terracottaColor} />
        {/* Right person (Sage Green) */}
        <circle cx="102" cy="116" r="3.5" fill="#3B7A57" />
        <path d="M 96 130 C 96 123 108 123 108 130 Z" fill="#3B7A57" />
      </svg>

      <div className="flex flex-col leading-none select-none">
        <div className="flex items-center font-serif-title text-2xl font-bold tracking-tight">
          <span style={{ color: tealColor }}>Shilp</span>
          <span style={{ color: terracottaColor }}>Setu</span>
        </div>
        {showTagline && (
          <span
            className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: variant === "light" ? "rgba(255,255,255,0.7)" : "#5e6d69" }}
          >
            Artisans to You
          </span>
        )}
      </div>
    </div>
  );
}

export default function BuyerApp() {
  // Navigation & View States
  const [activeView, setActiveView] = useState<"home" | "shop" | "artisans" | "about" | "dashboard" | "cart">("home");
  const [dashboardTab, setDashboardTab] = useState<"dashboard" | "orders" | "wishlist" | "profile" | "addresses">("dashboard");

  // Selection Modals & Popups
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedArtisan, setSelectedArtisan] = useState<Artisan | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number>(0);
  const [detailQuantity, setDetailQuantity] = useState<number>(1);

  // Product Detail Tab & Review Submission State
  const [activeDetailTab, setActiveDetailTab] = useState<"story" | "artisan" | "reviews">("story");
  const [isWritingReview, setIsWritingReview] = useState<boolean>(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState<string>("Ishwari");
  const [newReviewRating, setNewReviewRating] = useState<number>(5);
  const [newReviewTitle, setNewReviewTitle] = useState<string>("");
  const [newReviewComment, setNewReviewComment] = useState<string>("");
  const [productReviewsMap, setProductReviewsMap] = useState<{ [productId: string]: any[] }>({});

  // Auth Modal State
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [loginRole, setLoginRole] = useState<"buyer" | "artisan">("buyer");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  // Cart & Wishlist State (Cart remains in-memory as required by scope)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([
    { product: mockProducts[0], quantity: 1 }, // Terracotta Vase ₹850
    { product: mockProducts[1], quantity: 1 }, // Handwoven Scarf ₹1,250
    { product: mockProducts[2], quantity: 1 }, // Silver Jhumkas ₹1,600
  ]);
  const [wishlist, setWishlist] = useState<string[]>(["p1", "p3", "p5"]);

  // Shop Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [orderList, setOrderList] = useState<Order[]>(initialOrders);

  // Live Backend Product State
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [artisanNameCache, setArtisanNameCache] = useState<Record<string, string>>({});

  // Fetch live products from backend
  const fetchLiveProducts = useCallback(async (categoryFilter?: string) => {
    setIsLoadingProducts(true);
    setProductError(null);
    try {
      const filterParams: Record<string, string | number> = {
        status: "published",
        limit: 50,
      };
      if (categoryFilter && categoryFilter !== "All") {
        filterParams.category = categoryFilter;
      }
      const response = await getProducts(filterParams);
      const adapted = response.products.map((p) =>
        adaptBackendProduct(p, artisanNameCache[p.artisan_id])
      );
      setLiveProducts(adapted);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Failed to load products from server.";
      setProductError(msg);
      setLiveProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [artisanNameCache]);

  // Load products when component mounts or category changes
  useEffect(() => {
    if (!activeSearchQuery) {
      fetchLiveProducts(selectedCategory);
    }
  }, [selectedCategory, activeSearchQuery, fetchLiveProducts]);

  // Handle Semantic Search
  const handleExecuteSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      setActiveSearchQuery("");
      setSearchError(null);
      fetchLiveProducts(selectedCategory);
      return;
    }
    setActiveSearchQuery(trimmed);
    setIsSearching(true);
    setSearchError(null);
    try {
      const response = await searchProducts({
        query: trimmed,
        require_full_capacity: false,
      });
      const adapted = response.results.map((item) =>
        adaptSearchResultItem(item, artisanNameCache[item.artisan_id])
      );
      setLiveProducts(adapted);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Semantic search failed. Please try again.";
      setSearchError(msg);
      setLiveProducts([]);
    } finally {
      setIsSearching(false);
    }
  }, [selectedCategory, fetchLiveProducts, artisanNameCache]);

  // Clear search and restore live products
  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setActiveSearchQuery("");
    setSearchError(null);
    fetchLiveProducts(selectedCategory);
  }, [selectedCategory, fetchLiveProducts]);

  // Select Product and load full backend details if needed
  const handleSelectProduct = useCallback(async (prod: Product) => {
    setSelectedProduct(prod);
    setActiveGalleryIndex(0);
    setDetailQuantity(1);
    setActiveDetailTab("story");
    // Fetch live backend detail if it's a valid backend UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(prod.id);
    if (isUuid) {
      try {
        const liveDetail = await getProduct(prod.id);
        let artisanName = prod.artisan;
        let artisanLoc = prod.artisanLocation;
        if (liveDetail.artisan_id && !artisanNameCache[liveDetail.artisan_id]) {
          try {
            const artisanProf = await getArtisan(liveDetail.artisan_id);
            artisanName = artisanProf.business_name || artisanProf.name;
            artisanLoc = artisanProf.location || [artisanProf.city, artisanProf.state].filter(Boolean).join(", ") || "India";
            setArtisanNameCache((prev) => ({ ...prev, [liveDetail.artisan_id]: artisanName }));
          } catch {
            // Non-critical: continue with available name
          }
        }
        setSelectedProduct(adaptBackendProduct(liveDetail, artisanName, artisanLoc));
      } catch {
        // Fallback to already adapted product
      }
    }
  }, [artisanNameCache]);

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingFee = cartSubtotal > 0 ? 100 : 0;
  const cartTotal = cartSubtotal + shippingFee;
  const totalCartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Helper Handlers
  const toggleWishlist = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const addToCart = (product: Product, quantity: number = 1, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
        );
      }
      return [...prev, { product, quantity }];
    });
    setActiveView("cart");
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as { product: Product; quantity: number }[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleCheckout = () => {
    alert("🎉 Order placed successfully! Thank you for supporting Indian artisans.");
    // Add new order to user history
    if (cart.length > 0) {
      const newOrder: Order = {
        id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        productName: cart[0].product.name,
        productImage: cart[0].product.image,
        artisan: cart[0].product.artisan,
        date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
        status: "Processing",
        amount: cartTotal,
        formattedAmount: `₹ ${cartTotal.toLocaleString("en-IN")}`,
      };
      setOrderList([newOrder, ...orderList]);
    }
    setCart([]);
    setActiveView("dashboard");
    setDashboardTab("orders");
  };

  // Filtered and Sorted Live Products
  const filteredProducts = liveProducts
    .filter((p) => {
      const matchesPrice = p.price <= maxPrice;
      const matchesRating = p.rating >= minRating;
      return matchesPrice && matchesRating;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      if (sortBy === "rating") return b.rating - a.rating;
      return 0; // default newest/received order
    });

  // Wishlist products pool combining live and mock products
  const allAvailableProducts = [
    ...liveProducts,
    ...mockProducts.filter((mp) => !liveProducts.some((lp) => lp.id === mp.id)),
  ];
  const wishlistedProducts = allAvailableProducts.filter((p) => wishlist.includes(p.id));

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col selection:bg-terracotta selection:text-white">
      {/* ================= HEADER / TOP NAV ================= */}
      <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E8DFD1] transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <button
            onClick={() => {
              setActiveView("home");
              setSelectedProduct(null);
              setSelectedArtisan(null);
            }}
            className="flex items-center focus:outline-none"
          >
            <ShilpSetuLogo className="h-11 sm:h-12" />
          </button>

          {/* Navigation Links */}
          <nav className="hidden items-center gap-8 text-sm font-semibold md:flex">
            <button
              onClick={() => {
                setActiveView("home");
                setSelectedProduct(null);
                setSelectedArtisan(null);
              }}
              className={`transition hover:text-terracotta ${activeView === "home" ? "text-forest font-bold underline underline-offset-8" : "text-ink/80"}`}
            >
              Home
            </button>
            <button
              onClick={() => {
                setActiveView("shop");
                setSelectedProduct(null);
                setSelectedArtisan(null);
              }}
              className={`transition hover:text-terracotta ${activeView === "shop" ? "text-forest font-bold underline underline-offset-8" : "text-ink/80"}`}
            >
              Shop
            </button>
            <button
              onClick={() => {
                setActiveView("artisans");
                setSelectedProduct(null);
                setSelectedArtisan(null);
              }}
              className={`transition hover:text-terracotta ${activeView === "artisans" ? "text-forest font-bold underline underline-offset-8" : "text-ink/80"}`}
            >
              Artisans
            </button>
            <button
              onClick={() => {
                setActiveView("about");
                setSelectedProduct(null);
                setSelectedArtisan(null);
              }}
              className={`transition hover:text-terracotta ${activeView === "about" ? "text-forest font-bold underline underline-offset-8" : "text-ink/80"}`}
            >
              About
            </button>
          </nav>

          {/* Header Search Bar */}
          <div className="hidden lg:flex items-center flex-1 max-w-sm mx-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveView("shop");
                handleExecuteSearch(searchQuery);
              }}
              className="relative w-full"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setActiveView("shop")}
                placeholder="Semantic AI search (e.g. jute bags under ₹700)..."
                className="w-full rounded-full border border-[#E0D5C5] bg-white/90 py-2 pl-4 pr-16 text-xs sm:text-sm text-ink placeholder:text-ink/40 outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10"
              />
              <div className="absolute right-2 top-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 text-ink/40 hover:text-ink transition"
                    title="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isSearching}
                  className="p-1.5 text-forest hover:text-terracotta transition"
                  title="Search"
                >
                  <Search className={`h-4 w-4 ${isSearching ? "animate-spin" : ""}`} />
                </button>
              </div>
            </form>
          </div>

          {/* Header Actions (Wishlist, Account/Dashboard, Cart) */}
          <div className="flex items-center gap-3 sm:gap-5">
            {/* Wishlist Button */}
            <button
              onClick={() => {
                setActiveView("dashboard");
                setDashboardTab("wishlist");
              }}
              className="relative p-2 rounded-full text-ink/80 hover:text-forest transition"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Profile / Account / Login Trigger */}
            {isLoggedIn ? (
              <button
                onClick={() => {
                  setActiveView("dashboard");
                  setDashboardTab("dashboard");
                }}
                className={`p-2 rounded-full text-ink/80 hover:text-forest transition ${activeView === "dashboard" ? "text-forest font-bold" : ""
                  }`}
                aria-label="User Account"
              >
                <User className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={() => setIsLoginOpen(true)}
                className="rounded-full border border-forest px-4 py-1.5 text-xs sm:text-sm font-bold text-forest hover:bg-forest hover:text-white transition"
              >
                Login
              </button>
            )}

            {/* Cart Trigger with dynamic count badge */}
            <button
              onClick={() => {
                setActiveView("cart");
                setSelectedProduct(null);
                setSelectedArtisan(null);
              }}
              className="relative p-2 rounded-full text-ink/80 hover:text-forest transition"
              aria-label="Cart"
            >
              <ShoppingBag className="h-5 w-5" />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C86443] text-[10px] font-bold text-white shadow-xs">
                  {totalCartItemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTENT VIEWS ================= */}
      <main className="flex-1">
        {/* VIEW 1: HOME PAGE */}
        {activeView === "home" && !selectedProduct && !selectedArtisan && (
          <div className="animate-fade-in">
            {/* HERO SECTION matching Image uploaded by User */}
            <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pb-20 lg:pt-12 bg-[#FAF7F2]">
              {/* Corner & Background Leaf Art Illustrations matching reference image */}
              <div className="pointer-events-none absolute left-2 top-4 h-24 w-24 text-terracotta/30 opacity-70">
                <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M 20 80 Q 40 40 80 20 M 40 55 Q 60 45 70 30 M 30 65 Q 50 65 65 55" />
                  <path d="M 15 85 C 25 70 35 75 40 65 C 30 65 20 75 15 85 Z" fill="#C86443" fillOpacity="0.15" />
                </svg>
              </div>

              <div className="relative z-10 grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
                {/* Left Text & CTA Column */}
                <div className="space-y-6 text-left lg:col-span-5 pr-2">
                  <h1 className="font-serif-title text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.12] tracking-tight text-[#164E46]">
                    Handcrafted <br />
                    Traditions, <br />
                    <span className="text-[#C86443]">Brighter Futures</span>
                  </h1>
                  <p className="max-w-md text-base sm:text-lg leading-relaxed text-[#164E46]/80 font-medium">
                    Support skilled artisans. Discover authentic handmade products. Be a part of their journey.
                  </p>

                  <div className="pt-3 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                    <button
                      onClick={() => setActiveView("shop")}
                      className="inline-flex items-center gap-2 rounded-full bg-[#C86443] px-8 py-3.5 text-base font-bold text-white shadow-md transition duration-200 hover:bg-[#b05335] hover:scale-[1.02]"
                    >
                      Explore Collection <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setIsLoginOpen(true)}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-[#164E46]/40 bg-transparent px-7 py-3.5 text-base font-bold text-[#164E46] transition duration-200 hover:border-[#164E46] hover:bg-[#164E46] hover:text-white"
                    >
                      Join as Artisan / Buyer
                    </button>
                  </div>
                </div>

                {/* Right Artwork: 4 Connected Cards & Flow Arrows matching User Image */}
                <div className="relative lg:col-span-7 min-h-[460px] sm:min-h-[500px] flex items-center justify-center p-2">
                  {/* Background Leaf Lines & Flow Arrows SVG */}
                  <svg className="absolute inset-0 h-full w-full pointer-events-none select-none z-0" viewBox="0 0 650 520" fill="none">
                    {/* Organic Botanical Leaf Sprigs matching uploaded image */}
                    <g stroke="#C86443" strokeWidth="1.5" opacity="0.45">
                      {/* Left Top Leaf Sprig */}
                      <path d="M 120 180 Q 90 140 100 90 M 100 130 Q 75 120 70 100 M 105 150 Q 80 160 65 150" />
                      {/* Mid Left Leaf Sprig */}
                      <path d="M 150 280 Q 110 270 90 230 M 130 275 Q 110 290 95 300" />
                      {/* Bottom Left Leaf Sprig */}
                      <path d="M 80 440 Q 60 400 40 460 M 70 420 Q 40 410 30 390" />
                      {/* Top Right Leaf Sprig */}
                      <path d="M 580 140 Q 610 100 590 60 M 590 110 Q 620 110 630 90" />
                      {/* Bottom Right Botanical Sprig */}
                      <path d="M 590 420 Q 630 400 640 450 M 600 440 Q 630 460 640 480" />
                    </g>

                    <g stroke="#3B7A57" strokeWidth="1.5" opacity="0.45">
                      <path d="M 140 140 Q 170 100 160 60 M 150 110 Q 180 110 190 90" />
                      <path d="M 560 380 Q 590 340 610 370 M 575 360 Q 605 340 600 320" />
                    </g>

                    {/* Connecting Curved Terracotta Arrows with Arrowheads */}
                    {/* Arrow 1: Artisan -> Crafting */}
                    <path d="M 285 105 C 330 65, 360 75, 385 110" stroke="#C86443" strokeWidth="2" strokeDasharray="5 4" fill="none" />
                    <polygon points="388,114 378,105 383,118" fill="#C86443" />

                    {/* Arrow 2: Crafting -> Finished Product */}
                    <path d="M 450 220 C 440 270, 390 270, 360 250" stroke="#C86443" strokeWidth="2" strokeDasharray="5 4" fill="none" />
                    <polygon points="355,247 367,245 361,256" fill="#C86443" />

                    {/* Arrow 3: Finished Product -> Your Home */}
                    <path d="M 320 395 C 360 445, 430 440, 465 405" stroke="#C86443" strokeWidth="2" strokeDasharray="5 4" fill="none" />
                    <polygon points="468,400 460,411 456,398" fill="#C86443" />
                  </svg>

                  {/* 4 Cards Grid Layout matching image strictly */}
                  <div className="relative z-10 w-full max-w-2xl grid grid-cols-2 gap-y-10 gap-x-6 sm:gap-x-10 items-center">
                    {/* CARD 1: Artisan (Top Left) */}
                    <div className="relative flex flex-col items-center">
                      <div className="w-full max-w-[260px] h-44 sm:h-52 rounded-3xl overflow-hidden shadow-lg border-2 border-white/90 bg-white relative">
                        <video
                          className="h-full w-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                        >
                          <source src="https://www.pexels.com/download/video/8066061/" type="video/mp4" />
                        </video>
                      </div>
                      <div className="-mt-3.5 z-20 rounded-full bg-white px-5 py-1.5 text-xs font-bold text-[#164E46] shadow-md border border-[#E8DFD1]">
                        Artisan
                      </div>
                    </div>

                    {/* CARD 2: Crafting (Top Right) */}
                    <div className="relative flex flex-col items-center">
                      <div className="w-full max-w-[260px] h-44 sm:h-52 rounded-3xl overflow-hidden shadow-lg border-2 border-white/90 bg-white relative">
                        <img
                          src="https://i.pinimg.com/736x/d2/17/8c/d2178cb0e0c97a6762b5a7609cc57ed3.jpg"
                          alt="Crafting"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="-mt-3.5 z-20 rounded-full bg-white px-5 py-1.5 text-xs font-bold text-[#164E46] shadow-md border border-[#E8DFD1]">
                        Crafting
                      </div>
                    </div>

                    {/* CARD 3: Finished Product (Mid-Left) */}
                    <div className="relative flex flex-col items-center">
                      <div className="w-full max-w-[260px] h-44 sm:h-52 rounded-3xl overflow-hidden shadow-lg border-2 border-white/90 bg-white relative">
                        <img
                          src="https://www.anokhilife.com/wp-content/uploads/AL-Featured-1-11.png"
                          alt="Finished Product"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="-mt-3.5 z-20 flex items-center gap-1.5 rounded-full bg-white px-5 py-1.5 text-xs font-bold text-[#164E46] shadow-md border border-[#E8DFD1]">
                        <span className="text-[#C86443]">❖</span> Finished Product
                      </div>
                    </div>

                    {/* CARD 4: Your Home (Bottom Right) */}
                    <div className="relative flex flex-col items-center pt-2">
                      <div className="w-full max-w-[260px] h-44 sm:h-52 rounded-3xl overflow-hidden shadow-lg border-2 border-white/90 bg-white relative">
                        <video
                          className="h-full w-full object-cover"
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="auto"
                        >
                          <source src="https://www.pexels.com/download/video/7293873/" type="video/mp4" />
                        </video>
                      </div>
                      <div className="-mt-3.5 z-20 rounded-full bg-white px-5 py-1.5 text-xs font-bold text-[#164E46] shadow-md border border-[#E8DFD1]">
                        Your Home
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* VALUE PROPOSITION BAR (4 Features matching reference image bottom) */}
            <section className="border-y border-[#E8DFD1] bg-[#FAF7F2] py-8">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-8">
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FAF0E6] text-[#C86443] border border-[#F3E3D3]">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#164E46]">Authentic</h4>
                      <p className="text-xs text-[#164E46]/70">Handcrafted Products</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#EBF4F2] text-[#164E46] border border-[#D5E6E3]">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#164E46]">Direct Support</h4>
                      <p className="text-xs text-[#164E46]/70">To Artisans</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FAF0E6] text-[#C86443] border border-[#F3E3D3]">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#164E46]">Fair Prices</h4>
                      <p className="text-xs text-[#164E46]/70">& Transparent Trade</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#FAF0E6] text-[#C86443] border border-[#F3E3D3]">
                      <Globe className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#164E46]">Preserving</h4>
                      <p className="text-xs text-[#164E46]/70">Indian Heritage</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SHOP BY CATEGORY SECTION */}
            <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-terracotta">Explore Traditions</span>
                  <h2 className="font-serif-title text-3xl sm:text-4xl font-bold text-ink mt-1">Shop by Category</h2>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory("All");
                    setActiveView("shop");
                  }}
                  className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-forest hover:text-terracotta transition"
                >
                  View All <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 lg:gap-6">
                {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setActiveView("shop");
                    }}
                    className="group relative overflow-hidden rounded-2xl bg-paper aspect-4/5 text-left border border-line shadow-xs transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/30 to-transparent p-4 flex flex-col justify-end text-white">
                      <h3 className="font-bold text-base sm:text-lg">{cat.name}</h3>
                      <p className="text-xs text-white/70 mt-0.5">{cat.count}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* FEATURED PRODUCTS CAROUSEL / GRID */}
            <section className="bg-paper/40 py-12 lg:py-16">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="flex items-end justify-between mb-8">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-terracotta">Curated Crafts</span>
                    <h2 className="font-serif-title text-3xl sm:text-4xl font-bold text-ink mt-1">Featured Masterpieces</h2>
                  </div>
                  <button
                    onClick={() => setActiveView("shop")}
                    className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-forest hover:text-terracotta transition"
                  >
                    Browse Catalog <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  {isLoadingProducts && liveProducts.length === 0 ? (
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="rounded-2xl border border-line bg-white p-3 shadow-xs animate-pulse">
                        <div className="aspect-square w-full rounded-xl bg-paper/80" />
                        <div className="pt-3 space-y-2">
                          <div className="h-3 w-1/3 bg-paper rounded" />
                          <div className="h-4 w-3/4 bg-paper rounded" />
                          <div className="h-3 w-1/2 bg-paper rounded" />
                        </div>
                        <div className="mt-4 pt-3 border-t border-line/60 flex justify-between items-center">
                          <div className="h-5 w-16 bg-paper rounded" />
                          <div className="h-7 w-20 bg-paper rounded-full" />
                        </div>
                      </div>
                    ))
                  ) : (
                    (liveProducts.length > 0 ? liveProducts : mockProducts).slice(0, 4).map((product, index) => (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className="group cursor-pointer rounded-2xl border border-line bg-white p-3 shadow-xs transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-paper">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                        />
                        <button
                          onClick={(e) => toggleWishlist(product.id, e)}
                          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-xs transition hover:bg-terracotta hover:text-white"
                        >
                          <Heart
                            className={`h-4 w-4 ${wishlist.includes(product.id) ? "fill-terracotta text-terracotta hover:fill-white hover:text-white" : ""}`}
                          />
                        </button>
                        <span className="absolute bottom-3 left-3 rounded-full bg-forest px-2.5 py-1 text-[10px] font-bold text-white">
                          {product.availability}
                        </span>
                      </div>

                      <div className="pt-3">
                        <div className="flex items-center justify-between text-xs text-ink/60">
                          <span>{product.category}</span>
                          <span className="flex items-center gap-1 font-bold text-ink">
                            <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                            {product.rating} ({product.reviewsCount})
                          </span>
                        </div>

                        <h3 className="mt-1 font-bold text-base text-ink group-hover:text-terracotta transition">
                          {product.name}
                        </h3>
                        <p className="text-xs text-ink/65">by {product.artisan}</p>

                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-line/60">
                          <span className="text-base font-bold text-forest">{product.formattedPrice}</span>
                          <button
                            onClick={(e) => addToCart(product, 1, e)}
                            className="rounded-full bg-paper px-3 py-1.5 text-xs font-bold text-forest hover:bg-forest hover:text-white transition"
                          >
                            + Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  )))}
                </div>
              </div>
            </section>

            {/* ================= WHY CHOOSE SHILPSETU SECTION ================= */}
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
              <div className="text-center max-w-3xl mx-auto mb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
                  Our Impact & Promises
                </span>
                <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mt-3">
                  Why Choose ShilpSetu?
                </h2>
                <p className="mt-3 text-sm sm:text-base text-ink/75 leading-relaxed">
                  Connecting traditional hands with modern hearts for a stronger, transparent, and sustainable craft economy.
                </p>
              </div>

              {/* 4 Core Value Pillar Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs hover:shadow-md transition group">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-terracotta/10 text-terracotta mb-4 group-hover:scale-110 transition">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif-title text-lg font-bold text-ink">100% Authentic Handcrafts</h3>
                  <p className="text-xs text-ink/70 leading-relaxed mt-2">
                    Every piece is crafted by hand using traditional techniques, sourced directly from verified artisan clusters across India.
                  </p>
                </div>

                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs hover:shadow-md transition group">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-forest/10 text-forest mb-4 group-hover:scale-110 transition">
                    <Award className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif-title text-lg font-bold text-ink">Direct Support to Artisans</h3>
                  <p className="text-xs text-ink/70 leading-relaxed mt-2">
                    By eliminating middlemen, over 85% of purchase proceeds flow straight to artisan families, boosting rural livelihoods.
                  </p>
                </div>

                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs hover:shadow-md transition group">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gold/20 text-gold mb-4 group-hover:scale-110 transition">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif-title text-lg font-bold text-ink">Fair Trade & Transparency</h3>
                  <p className="text-xs text-ink/70 leading-relaxed mt-2">
                    Transparent pricing breakdowns, origin certificates, and full traceability of artisan stories with every purchase.
                  </p>
                </div>

                <div className="rounded-3xl border border-line bg-white p-6 shadow-xs hover:shadow-md transition group">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-terracotta/10 text-terracotta mb-4 group-hover:scale-110 transition">
                    <Globe className="h-6 w-6" />
                  </div>
                  <h3 className="font-serif-title text-lg font-bold text-ink">Heritage & Sustainability</h3>
                  <p className="text-xs text-ink/70 leading-relaxed mt-2">
                    Eco-friendly natural materials and traditional processes preserving centuries of rich Indian cultural art forms.
                  </p>
                </div>
              </div>

              {/* Impact Counter Banner */}
              <div className="mt-12 rounded-3xl bg-forest p-8 text-white shadow-xl grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                <div>
                  <p className="font-serif-title text-3xl sm:text-4xl font-bold text-terracotta">5,000+</p>
                  <p className="text-xs sm:text-sm font-semibold text-white/80 mt-1">Artisans Empowered</p>
                </div>
                <div>
                  <p className="font-serif-title text-3xl sm:text-4xl font-bold text-gold">50+</p>
                  <p className="text-xs sm:text-sm font-semibold text-white/80 mt-1">Craft Clusters</p>
                </div>
                <div>
                  <p className="font-serif-title text-3xl sm:text-4xl font-bold text-white">100%</p>
                  <p className="text-xs sm:text-sm font-semibold text-white/80 mt-1">Direct Fair Trade</p>
                </div>
                <div>
                  <p className="font-serif-title text-3xl sm:text-4xl font-bold text-terracotta">25,000+</p>
                  <p className="text-xs sm:text-sm font-semibold text-white/80 mt-1">Happy Craft Buyers</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* VIEW 2: SHOP / PRODUCT CATALOG (Top Right Screen in mockup) */}
        {activeView === "shop" && !selectedProduct && !selectedArtisan && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
            {/* Banner matching Top-Right mockup header */}
            <div className="relative mb-8 overflow-hidden rounded-3xl bg-forest p-8 sm:p-10 text-white shadow-lg">
              <div className="relative z-10 max-w-2xl">
                <h1 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl font-bold">
                  Shop Authentic Handmade Products
                </h1>
                <p className="mt-3 text-sm sm:text-base text-white/80">
                  Support artisans, bring home unique crafts created with generational care.
                </p>
              </div>
              <img
                src="https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=1200&q=85"
                alt="Handmade craft banner"
                className="absolute inset-0 h-full w-full object-cover opacity-25"
              />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_1fr]">
              {/* FILTERS SIDEBAR */}
              <aside className="space-y-6 rounded-2xl border border-line bg-paper/50 p-5 h-fit">
                <div className="flex items-center justify-between pb-3 border-b border-line">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Filter className="h-4 w-4 text-terracotta" /> Filters
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedCategory("All");
                      setMaxPrice(5000);
                      setMinRating(0);
                      handleClearSearch();
                    }}
                    className="text-xs font-semibold text-terracotta hover:underline"
                  >
                    Reset All
                  </button>
                </div>

                {/* Category Checklist */}
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider text-ink/70 mb-3">Category</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                      <input
                        type="radio"
                        name="catFilter"
                        checked={selectedCategory === "All"}
                        onChange={() => setSelectedCategory("All")}
                        className="accent-terracotta"
                      />
                      All Categories
                    </label>
                    {categories.map((c) => (
                      <label key={c.name} className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-ink/80 hover:text-ink">
                        <input
                          type="radio"
                          name="catFilter"
                          checked={selectedCategory === c.name}
                          onChange={() => setSelectedCategory(c.name)}
                          className="accent-terracotta"
                        />
                        {c.name}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Range Slider */}
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs uppercase tracking-wider text-ink/70">Price Range</h4>
                    <span className="text-xs font-bold text-forest">₹0 - ₹{maxPrice}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="5000"
                    step="250"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-terracotta cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-ink/50 mt-1 font-bold">
                    <span>₹0</span>
                    <span>₹5000+</span>
                  </div>
                </div>

                {/* Ratings Filter */}
                <div className="pt-2 border-t border-line">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-ink/70 mb-3">Ratings</h4>
                  <div className="space-y-2">
                    {[4, 3, 2].map((r) => (
                      <label key={r} className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <input
                          type="radio"
                          name="ratingFilter"
                          checked={minRating === r}
                          onChange={() => setMinRating(r)}
                          className="accent-terracotta"
                        />
                        <span className="flex items-center gap-1 text-gold">
                          <Star className="h-3.5 w-3.5 fill-gold" /> {r}★ & above
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </aside>

              {/* PRODUCT GRID & CONTROLS */}
              <div>
                {/* Active Semantic Search Indicator Banner */}
                {activeSearchQuery && (
                  <div className="mb-6 flex items-center justify-between rounded-2xl bg-forest/10 border border-forest/20 px-5 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-forest shrink-0" />
                      <span className="text-ink/80">
                        Semantic Search Results for:{" "}
                        <strong className="text-forest">&ldquo;{activeSearchQuery}&rdquo;</strong>
                      </span>
                    </div>
                    <button
                      onClick={handleClearSearch}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 font-bold text-forest shadow-xs hover:bg-forest hover:text-white transition"
                    >
                      <X className="h-3 w-3" /> Clear Search
                    </button>
                  </div>
                )}

                {/* Search Error Message */}
                {searchError && (
                  <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-xs text-red-700 flex items-center justify-between">
                    <div>
                      <strong className="block font-bold">Search Error</strong>
                      <span>{searchError}</span>
                    </div>
                    <button
                      onClick={handleClearSearch}
                      className="rounded-full bg-white px-3 py-1 text-xs font-bold text-red-700 border border-red-200 hover:bg-red-100 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                )}

                {/* Server Error Message */}
                {productError && (
                  <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-center justify-between">
                    <div>
                      <strong className="block font-bold">Failed to load live catalog</strong>
                      <span>{productError}</span>
                    </div>
                    <button
                      onClick={() => fetchLiveProducts(selectedCategory)}
                      className="rounded-full bg-amber-600 px-3 py-1 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition"
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-3 border-b border-line">
                  <p className="text-xs sm:text-sm font-semibold text-ink/70">
                    {isLoadingProducts || isSearching ? (
                      <span>Loading authentic crafts...</span>
                    ) : (
                      <span>
                        Showing <span className="font-bold text-ink">{filteredProducts.length}</span> authentic handmade items
                      </span>
                    )}
                  </p>

                  <div className="flex items-center gap-2 text-xs font-bold">
                    <span>Sort by:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink outline-none focus:border-forest"
                    >
                      <option value="newest">Newest First</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="rating">Top Rated</option>
                    </select>
                  </div>
                </div>

                {/* Loading State Skeleton */}
                {(isLoadingProducts || isSearching) && (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="rounded-2xl border border-line bg-white p-3 shadow-xs animate-pulse">
                        <div className="aspect-square w-full rounded-xl bg-paper/80" />
                        <div className="pt-3 space-y-2">
                          <div className="h-3 w-1/3 bg-paper rounded" />
                          <div className="h-4 w-3/4 bg-paper rounded" />
                          <div className="h-3 w-1/2 bg-paper rounded" />
                        </div>
                        <div className="mt-4 pt-3 border-t border-line/60 flex justify-between items-center">
                          <div className="h-5 w-16 bg-paper rounded" />
                          <div className="h-7 w-20 bg-paper rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Empty State */}
                {!isLoadingProducts && !isSearching && filteredProducts.length === 0 && (
                  <div className="text-center py-16 px-4 bg-white rounded-3xl border border-line">
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-paper mx-auto text-ink/40 mb-4">
                      <Package className="h-8 w-8" />
                    </div>
                    <h3 className="font-serif-title text-xl font-bold text-ink">
                      {activeSearchQuery
                        ? `No craft products found matching "${activeSearchQuery}"`
                        : "No products available in this category"}
                    </h3>
                    <p className="mt-2 text-xs sm:text-sm text-ink/65 max-w-md mx-auto">
                      {activeSearchQuery
                        ? "Try adjusting your search terms, exploring different categories, or removing price filters."
                        : "Check back soon as our rural artisan clusters frequently add authentic new handicrafts."}
                    </p>
                    <div className="mt-6 flex justify-center gap-3">
                      {activeSearchQuery && (
                        <button
                          onClick={handleClearSearch}
                          className="rounded-full bg-forest px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-forest-dark transition"
                        >
                          Clear Search
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedCategory("All");
                          setMaxPrice(5000);
                          setMinRating(0);
                          handleClearSearch();
                        }}
                        className="rounded-full border border-line px-5 py-2 text-xs font-bold text-ink hover:bg-paper transition"
                      >
                        Reset All Filters
                      </button>
                    </div>
                  </div>
                )}

                {/* Products Grid */}
                {!isLoadingProducts && !isSearching && filteredProducts.length > 0 && (
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="group cursor-pointer rounded-2xl border border-line bg-white p-3 shadow-xs transition duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-paper">
                            <img
                              src={product.image}
                              alt={product.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                            <button
                              onClick={(e) => toggleWishlist(product.id, e)}
                              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink shadow-xs transition hover:bg-terracotta hover:text-white"
                            >
                              <Heart
                                className={`h-4 w-4 ${wishlist.includes(product.id) ? "fill-terracotta text-terracotta hover:fill-white" : ""}`}
                              />
                            </button>
                            <span className="absolute bottom-3 left-3 rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[10px] font-bold text-forest">
                              {product.availability}
                            </span>
                          </div>

                          <div className="pt-3">
                            <div className="flex items-center justify-between text-xs text-ink/60">
                              <span className="font-semibold text-terracotta">{product.category}</span>
                              <span className="flex items-center gap-1 font-bold text-ink">
                                <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                                {product.rating} ({product.reviewsCount})
                              </span>
                            </div>

                            <h3 className="mt-1 font-bold text-lg text-ink group-hover:text-terracotta transition">
                              {product.name}
                            </h3>
                            <p className="text-xs text-ink/60">by {product.artisan}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between pt-3 border-t border-line/60">
                          <span className="text-lg font-bold text-forest">{product.formattedPrice}</span>
                          <button
                            onClick={(e) => addToCart(product, 1, e)}
                            className="rounded-full bg-forest px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-forest-dark"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: PRODUCT DETAIL VIEW matching Image 2 */}
        {selectedProduct && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
            {/* Breadcrumb */}
            <div className="mb-6 flex items-center gap-2 text-xs font-semibold text-ink/60">
              <button onClick={() => setSelectedProduct(null)} className="hover:text-terracotta transition">Shop</button>
              <span>/</span>
              <span>{selectedProduct.category}</span>
              <span>/</span>
              <span className="text-ink font-bold">{selectedProduct.name}</span>
            </div>

            <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-12 bg-white p-6 sm:p-10 rounded-3xl border border-line shadow-lg">
              {/* Product Gallery (Thumbnail column on left + enlarged main image card) */}
              <div className="flex flex-col-reverse gap-4 sm:flex-row items-center sm:items-start">
                {/* Thumbnails */}
                <div className="flex sm:flex-col gap-3 justify-center">
                  {selectedProduct.gallery.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveGalleryIndex(idx)}
                      className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 transition ${activeGalleryIndex === idx ? "border-terracotta ring-2 ring-terracotta/20 scale-105" : "border-line opacity-75"
                        }`}
                    >
                      <img src={img} alt="Thumbnail" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>

                {/* Main Product Card */}
                <div className="relative flex-1 overflow-hidden rounded-3xl bg-paper aspect-square w-full shadow-xs">
                  <img
                    src={selectedProduct.gallery[activeGalleryIndex] || selectedProduct.image}
                    alt={selectedProduct.name}
                    className="h-full w-full object-cover"
                  />
                  <button
                    onClick={(e) => toggleWishlist(selectedProduct.id, e)}
                    className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-ink shadow-md transition hover:bg-terracotta hover:text-white"
                  >
                    <Heart
                      className={`h-5 w-5 ${wishlist.includes(selectedProduct.id) ? "fill-terracotta text-terracotta hover:fill-white" : ""}`}
                    />
                  </button>
                </div>
              </div>

              {/* Product Info Column matching Image 2 layout */}
              <div className="space-y-6 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Category Pill & Rating Badge */}
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-terracotta/10 px-3.5 py-1 text-[11px] font-bold uppercase tracking-widest text-terracotta">
                      {selectedProduct.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-ink">
                      <Star className="h-4 w-4 fill-gold text-gold" />
                      {selectedProduct.rating} ({selectedProduct.reviewsCount} reviews)
                    </span>
                  </div>

                  {/* Product Title */}
                  <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-forest tracking-tight">
                    {selectedProduct.name}
                  </h1>

                  {/* Product Price */}
                  <div className="text-3xl sm:text-4xl font-bold text-forest">
                    {selectedProduct.formattedPrice}
                  </div>

                  {/* Description */}
                  <p className="text-sm sm:text-base leading-relaxed text-ink/75">
                    {selectedProduct.description}
                  </p>

                  {/* Checkmark Feature Badges matching Image 2 */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedProduct.badges.map((b) => (
                      <span key={b} className="flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 text-xs font-bold text-ink border border-line/60">
                        <Check className="h-3.5 w-3.5 text-terracotta stroke-3" /> {b}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-6 pt-4 border-t border-line">
                  {/* Quantity selector & Add to Cart button matching Image 2 */}
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center rounded-full border border-line bg-paper px-4 py-2.5 shadow-xs">
                      <button
                        onClick={() => setDetailQuantity(Math.max(1, detailQuantity - 1))}
                        className="p-1 text-ink/70 hover:text-ink transition"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-10 text-center font-bold text-sm text-ink">{detailQuantity}</span>
                      <button
                        onClick={() => setDetailQuantity(detailQuantity + 1)}
                        className="p-1 text-ink/70 hover:text-ink transition"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      onClick={() => addToCart(selectedProduct, detailQuantity)}
                      className="flex-1 rounded-full bg-forest py-3.5 px-8 text-sm sm:text-base font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-dark hover:scale-[1.01]"
                    >
                      Add to Cart
                    </button>

                    <button
                      onClick={(e) => toggleWishlist(selectedProduct.id, e)}
                      className="grid h-12 w-12 place-items-center rounded-full border border-line bg-white text-ink shadow-xs hover:border-terracotta hover:text-terracotta transition"
                    >
                      <Heart className={`h-5 w-5 ${wishlist.includes(selectedProduct.id) ? "fill-terracotta text-terracotta" : ""}`} />
                    </button>
                  </div>

                  {/* PRODUCT DETAILS Specifications Table matching Image 2 */}
                  <div className="rounded-2xl border border-line bg-paper/40 p-4 space-y-2 text-xs">
                    <h4 className="font-bold text-ink uppercase tracking-wider mb-2">Product Details</h4>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div><span className="text-ink/60">Material:</span> <span className="font-bold text-ink ml-1">{selectedProduct.specs.material}</span></div>
                      <div><span className="text-ink/60">Dimensions:</span> <span className="font-bold text-ink ml-1">{selectedProduct.specs.dimensions}</span></div>
                      <div><span className="text-ink/60">Weight:</span> <span className="font-bold text-ink ml-1">{selectedProduct.specs.weight}</span></div>
                      <div><span className="text-ink/60">Category:</span> <span className="font-bold text-ink ml-1">{selectedProduct.specs.category}</span></div>
                    </div>
                  </div>

                  {/* ABOUT THE ARTISAN Card matching Image 2 */}
                  <div className="rounded-2xl border border-line bg-paper/60 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={artisans.find((a) => a.name === selectedProduct.artisan)?.image || artisans[0].image}
                        alt={selectedProduct.artisan}
                        className="h-14 w-14 rounded-full object-cover ring-2 ring-terracotta shadow-xs"
                      />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-terracotta">About the Artisan</p>
                        <h4 className="font-serif-title font-bold text-base text-ink">{selectedProduct.artisan}</h4>
                        <p className="text-xs text-ink/65 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-terracotta" /> {selectedProduct.artisanLocation}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const found = artisans.find((a) => a.name === selectedProduct.artisan) || {
                          id: "artisan-custom",
                          name: selectedProduct.artisan,
                          craft: selectedProduct.category,
                          location: selectedProduct.artisanLocation,
                          description: selectedProduct.artisanBio?.bio || `Dedicated master craftsperson specializing in authentic ${selectedProduct.category.toLowerCase()}.`,
                          image: selectedProduct.image,
                          bannerImage: "https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=1200&q=85",
                          followersCount: 120,
                          impactBadges: ["Direct Fair Trade", "Heritage Craft"],
                          productsCount: 6,
                        };
                        setSelectedArtisan(found);
                        setSelectedProduct(null);
                      }}
                      className="shrink-0 rounded-full border border-forest px-4 py-2 text-xs font-bold text-forest bg-white hover:bg-forest hover:text-white transition shadow-xs"
                    >
                      View Profile →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= EXPANDED PRODUCT DETAILS & REVIEWS SECTIONS ================= */}
            <div className="mt-10 space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-line shadow-lg">
              {/* Section Tabs Header */}
              <div className="flex border-b border-line gap-6 sm:gap-10 text-xs sm:text-sm font-bold">
                <button
                  onClick={() => setActiveDetailTab("story")}
                  className={`pb-4 transition relative ${activeDetailTab === "story"
                    ? "text-forest border-b-2 border-forest"
                    : "text-ink/60 hover:text-ink"
                    }`}
                >
                  📜 Product Story & Process
                </button>
                <button
                  onClick={() => setActiveDetailTab("artisan")}
                  className={`pb-4 transition relative ${activeDetailTab === "artisan"
                    ? "text-forest border-b-2 border-forest"
                    : "text-ink/60 hover:text-ink"
                    }`}
                >
                  🎨 About Artisan & Background
                </button>
                <button
                  onClick={() => setActiveDetailTab("reviews")}
                  className={`pb-4 transition relative ${activeDetailTab === "reviews"
                    ? "text-forest border-b-2 border-forest"
                    : "text-ink/60 hover:text-ink"
                    }`}
                >
                  ⭐ Customer Reviews ({(productReviewsMap[selectedProduct.id] || selectedProduct.reviewsList || []).length + selectedProduct.reviewsCount})
                </button>
              </div>

              {/* TAB 1: Product Story & Process */}
              {activeDetailTab === "story" && (
                <div className="space-y-6 animate-fade-in">
                  <div>
                    <h3 className="font-serif-title text-2xl font-bold text-ink">The Craft Story</h3>
                    <p className="mt-3 text-sm sm:text-base leading-relaxed text-ink/80">
                      {selectedProduct.detailedDescription || selectedProduct.description}
                    </p>
                  </div>

                  {selectedProduct.craftProcess && (
                    <div className="pt-4 border-t border-line">
                      <h4 className="font-bold text-base text-ink mb-3">Handcrafting Step-by-Step Process</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedProduct.craftProcess.map((step, idx) => (
                          <div key={idx} className="rounded-2xl bg-paper/60 p-3.5 text-xs font-semibold text-ink/80 border border-line/60">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProduct.careInstructions && (
                    <div className="rounded-2xl bg-forest/5 p-4 border border-forest/15">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-forest mb-1">Care & Maintenance Instructions</h4>
                      <p className="text-xs text-ink/80">{selectedProduct.careInstructions}</p>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: About Artisan & Background */}
              {activeDetailTab === "artisan" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-3xl bg-paper/50 border border-line">
                    <img
                      src={artisans.find(a => a.name === selectedProduct.artisan)?.image || artisans[0].image}
                      alt={selectedProduct.artisan}
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-terracotta shadow-md"
                    />
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <span className="rounded-full bg-terracotta/10 px-3 py-1 text-[11px] font-bold text-terracotta uppercase">
                        Master Artisan
                      </span>
                      <h3 className="font-serif-title text-2xl font-bold text-ink">{selectedProduct.artisan}</h3>
                      <p className="text-xs text-ink/65 flex items-center justify-center sm:justify-start gap-1">
                        <MapPin className="h-3.5 w-3.5 text-terracotta" /> {selectedProduct.artisanLocation}
                      </p>
                      <p className="text-xs text-ink/80 leading-relaxed pt-1">
                        {selectedProduct.artisanBio?.bio || artisans.find((a) => a.name === selectedProduct.artisan)?.description || `Dedicated artisan from ${selectedProduct.artisanLocation} preserving traditional Indian craftsmanship in ${selectedProduct.category.toLowerCase()}. Every piece reflects generations of cultural heritage, sustainable materials, and handmade excellence.`}
                      </p>
                    </div>
                  </div>

                  {/* Impact Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="rounded-2xl bg-ivory p-4 text-center border border-line">
                      <p className="font-serif-title text-2xl font-bold text-forest">
                        {selectedProduct.artisanBio?.experienceYears || 15}+ Years
                      </p>
                      <p className="text-xs font-semibold text-ink/70">Craft Heritage</p>
                    </div>
                    <div className="rounded-2xl bg-ivory p-4 text-center border border-line">
                      <p className="font-serif-title text-2xl font-bold text-terracotta">
                        {selectedProduct.artisanBio?.womenEmpowered || 12} Women
                      </p>
                      <p className="text-xs font-semibold text-ink/70">Artisans Empowered</p>
                    </div>
                    <div className="rounded-2xl bg-ivory p-4 text-center border border-line">
                      <p className="font-serif-title text-2xl font-bold text-gold">100% Direct</p>
                      <p className="text-xs font-semibold text-ink/70">Fair Trade Value</p>
                    </div>
                  </div>

                  {selectedProduct.artisanBio?.quote && (
                    <blockquote className="rounded-2xl bg-terracotta/5 p-4 border-l-4 border-terracotta italic text-xs text-ink/80">
                      "{selectedProduct.artisanBio.quote}"
                    </blockquote>
                  )}
                </div>
              )}

              {/* TAB 3: Customer Reviews & Ratings System */}
              {activeDetailTab === "reviews" && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-6 p-6 rounded-3xl bg-paper/50 border border-line">
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-serif-title text-4xl font-bold text-forest">{selectedProduct.rating}</p>
                        <div className="flex justify-center my-1 text-gold">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 fill-gold ${i < Math.floor(selectedProduct.rating) ? "text-gold" : "text-gray-300 fill-gray-200"}`} />
                          ))}
                        </div>
                        <p className="text-xs text-ink/65">Based on {selectedProduct.reviewsCount} reviews</p>
                      </div>

                      <div className="hidden sm:block space-y-1 text-xs text-ink/70">
                        <div className="flex items-center gap-2"><span>5★</span><div className="w-28 h-2 rounded-full bg-paper overflow-hidden"><div className="bg-forest h-full w-[85%]" /></div><span>85%</span></div>
                        <div className="flex items-center gap-2"><span>4★</span><div className="w-28 h-2 rounded-full bg-paper overflow-hidden"><div className="bg-forest h-full w-[12%]" /></div><span>12%</span></div>
                        <div className="flex items-center gap-2"><span>3★</span><div className="w-28 h-2 rounded-full bg-paper overflow-hidden"><div className="bg-gold h-full w-[3%]" /></div><span>3%</span></div>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsWritingReview(!isWritingReview)}
                      className="rounded-full bg-terracotta px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-terracotta-dark transition"
                    >
                      {isWritingReview ? "Cancel Review" : "+ Write a Review"}
                    </button>
                  </div>

                  {/* Interactive Review Form */}
                  {isWritingReview && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newReviewComment.trim()) return;
                        const newRev = {
                          id: `rev-${Date.now()}`,
                          author: newReviewAuthor,
                          rating: newReviewRating,
                          date: "Just now",
                          title: newReviewTitle || "Excellent Product",
                          comment: newReviewComment,
                          verified: true,
                        };
                        const updated = [newRev, ...(productReviewsMap[selectedProduct.id] || selectedProduct.reviewsList || [])];
                        setProductReviewsMap({ ...productReviewsMap, [selectedProduct.id]: updated });
                        setIsWritingReview(false);
                        setNewReviewComment("");
                        setNewReviewTitle("");
                        alert("⭐ Thank you for submitting your review!");
                      }}
                      className="space-y-4 rounded-3xl bg-ivory p-6 border border-line animate-scale-up"
                    >
                      <h4 className="font-bold text-sm text-ink">Write Your Review</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-ink">Your Rating:</span>
                        <div className="flex gap-1 cursor-pointer">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              onClick={() => setNewReviewRating(star)}
                              className={`h-5 w-5 ${star <= newReviewRating ? "fill-gold text-gold" : "text-gray-300 fill-gray-200"}`}
                            />
                          ))}
                        </div>
                      </div>

                      <input
                        type="text"
                        placeholder="Review Title"
                        value={newReviewTitle}
                        onChange={(e) => setNewReviewTitle(e.target.value)}
                        className="w-full rounded-xl border border-line bg-white p-3 text-xs outline-none focus:border-forest"
                      />

                      <textarea
                        required
                        rows={3}
                        placeholder="Write your honest review about this handcrafted product..."
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        className="w-full rounded-xl border border-line bg-white p-3 text-xs outline-none focus:border-forest"
                      />

                      <button
                        type="submit"
                        className="rounded-full bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-forest-dark transition"
                      >
                        Submit Review
                      </button>
                    </form>
                  )}

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {(productReviewsMap[selectedProduct.id] || selectedProduct.reviewsList || [
                      {
                        id: "r1",
                        author: "Priya Sharma",
                        rating: 5,
                        date: "24 Aug 2026",
                        title: "Stunning craft and detail!",
                        comment: "The quality is exceptional. You can feel the human touch in every detail. Delivered fast in eco packaging!",
                        verified: true,
                      },
                    ]).map((rev: any) => (
                      <div key={rev.id} className="rounded-2xl bg-white p-4 border border-line space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="grid h-8 w-8 place-items-center rounded-full bg-forest text-white text-xs font-bold">
                              {rev.author.charAt(0)}
                            </div>
                            <div>
                              <h5 className="font-bold text-xs text-ink">{rev.author}</h5>
                              <span className="text-[10px] text-emerald-700 font-bold">✓ Verified Purchase</span>
                            </div>
                          </div>
                          <span className="text-[10px] text-ink/60">{rev.date}</span>
                        </div>

                        <div className="flex items-center gap-1 text-gold">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < rev.rating ? "fill-gold text-gold" : "text-gray-300"}`} />
                          ))}
                        </div>

                        <h5 className="font-bold text-xs text-ink">{rev.title}</h5>
                        <p className="text-xs text-ink/75 leading-relaxed">{rev.comment}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: ARTISAN PROFILE VIEW (Bottom Middle Screen in mockup - Savitri Devi) */}
        {(selectedArtisan || activeView === "artisans") && !selectedProduct && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
            {/* Banner Cover */}
            <div className="relative overflow-hidden rounded-3xl bg-forest h-48 sm:h-64 shadow-md">
              <img
                src={(selectedArtisan || artisans[0]).bannerImage}
                alt="Cover"
                className="h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent p-6 flex items-end">
                <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-white">Artisan Profile</h1>
              </div>
            </div>

            {/* Profile Info Header */}
            <div className="relative z-10 -mt-12 mx-4 sm:mx-8 rounded-3xl bg-white p-6 shadow-xl border border-line flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <img
                  src={(selectedArtisan || artisans[0]).image}
                  alt={(selectedArtisan || artisans[0]).name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-terracotta shadow-md"
                />
                <div>
                  <h2 className="font-serif-title text-2xl sm:text-3xl font-bold text-ink">
                    {(selectedArtisan || artisans[0]).name}
                  </h2>
                  <p className="text-sm font-bold text-terracotta">
                    {(selectedArtisan || artisans[0]).craft}
                  </p>
                  <p className="text-xs text-ink/60 flex items-center justify-center sm:justify-start gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5 text-forest" /> {(selectedArtisan || artisans[0]).location}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="rounded-full bg-forest px-6 py-2.5 text-xs sm:text-sm font-bold text-white hover:bg-forest-dark transition">
                  Follow
                </button>
                <button
                  onClick={() => {
                    setSelectedArtisan(null);
                    setActiveView("shop");
                  }}
                  className="rounded-full border border-line px-4 py-2.5 text-xs sm:text-sm font-bold text-ink hover:bg-paper transition"
                >
                  Back to Shop
                </button>
              </div>
            </div>

            {/* Artisan Story & Impact */}
            <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-3xl border border-line">
                <h3 className="font-serif-title text-2xl font-bold text-ink">About</h3>
                <p className="text-sm sm:text-base leading-relaxed text-ink/80">
                  {(selectedArtisan || artisans[0]).description}
                </p>

                {/* Impact Badges matching mockup */}
                <div className="pt-4 border-t border-line grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {(selectedArtisan || artisans[0]).impactBadges.map((badge, idx) => (
                    <div key={idx} className="rounded-2xl bg-paper p-4 text-center">
                      <Sparkles className="h-5 w-5 mx-auto text-terracotta mb-1" />
                      <p className="text-xs font-bold text-ink">{badge}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* More Products by Artisan */}
              <div className="space-y-4">
                <h3 className="font-serif-title text-2xl font-bold text-ink">More Products</h3>
                <div className="space-y-4">
                  {(liveProducts.length > 0 ? liveProducts : mockProducts)
                    .filter((p: Product) => p.artisan === (selectedArtisan || artisans[0]).name)
                    .map((product: Product) => (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="cursor-pointer rounded-2xl border border-line bg-white p-3 flex items-center gap-4 hover:shadow-md transition"
                      >
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-sm text-ink">{product.name}</h4>
                          <p className="text-xs font-bold text-forest">{product.formattedPrice}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-ink/40" />
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: USER DASHBOARD VIEW (Bottom Right Screen in mockup - Welcome back, Ishwari!) */}
        {activeView === "dashboard" && !selectedProduct && !selectedArtisan && (
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8">
              {/* Dashboard Sidebar Navigation */}
              <aside className="rounded-3xl border border-line bg-white p-4 space-y-1 h-fit">
                <button
                  onClick={() => setDashboardTab("dashboard")}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition ${dashboardTab === "dashboard" ? "bg-forest text-white shadow-md" : "text-ink/80 hover:bg-paper"
                    }`}
                >
                  <User className="h-4 w-4" /> Dashboard
                </button>

                <button
                  onClick={() => setDashboardTab("orders")}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition ${dashboardTab === "orders" ? "bg-forest text-white shadow-md" : "text-ink/80 hover:bg-paper"
                    }`}
                >
                  <Package className="h-4 w-4" /> My Orders
                </button>

                <button
                  onClick={() => setDashboardTab("wishlist")}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition ${dashboardTab === "wishlist" ? "bg-forest text-white shadow-md" : "text-ink/80 hover:bg-paper"
                    }`}
                >
                  <Heart className="h-4 w-4" /> Wishlist ({wishlist.length})
                </button>

                <button
                  onClick={() => setDashboardTab("profile")}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition ${dashboardTab === "profile" ? "bg-forest text-white shadow-md" : "text-ink/80 hover:bg-paper"
                    }`}
                >
                  <User className="h-4 w-4" /> Profile
                </button>

                <button
                  onClick={() => setIsLoggedIn(false)}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-terracotta hover:bg-terracotta/10 transition mt-4"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </aside>

              {/* Main Dashboard Panel */}
              <div className="space-y-8">
                {/* 1. DASHBOARD OVERVIEW TAB */}
                {dashboardTab === "dashboard" && (
                  <div className="space-y-8 animate-fade-in">
                    {/* Greeting Header matching mockup */}
                    <div>
                      <h1 className="font-serif-title text-3xl font-bold text-ink">
                        Welcome back, {userProfile.name}!
                      </h1>
                      <p className="text-xs sm:text-sm text-ink/65 mt-1">
                        Here&apos;s your journey with ShilpSetu.
                      </p>
                    </div>

                    {/* 4 STAT CARDS matching mockup */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Total Orders</p>
                        <p className="font-serif-title text-3xl font-bold text-ink mt-1">{orderList.length}</p>
                      </div>

                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Wishlist Items</p>
                        <p className="font-serif-title text-3xl font-bold text-ink mt-1">{wishlist.length}</p>
                      </div>

                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Total Spent</p>
                        <p className="font-serif-title text-3xl font-bold text-forest mt-1">₹ 4,250</p>
                      </div>

                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Artisans Supported</p>
                        <p className="font-serif-title text-2xl font-bold text-terracotta mt-1">2 Artisans</p>
                      </div>
                    </div>

                    {/* RECENT ORDERS TABLE matching mockup */}
                    <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-lg text-ink">Recent Orders</h3>
                        <button
                          onClick={() => setDashboardTab("orders")}
                          className="text-xs font-bold text-terracotta hover:underline"
                        >
                          View All →
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                          <thead>
                            <tr className="border-b border-line text-ink/60">
                              <th className="pb-3 font-semibold">Product</th>
                              <th className="pb-3 font-semibold">Date</th>
                              <th className="pb-3 font-semibold">Status</th>
                              <th className="pb-3 font-semibold text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line/60">
                            {orderList.slice(0, 3).map((order) => (
                              <tr key={order.id} className="hover:bg-paper/30 transition">
                                <td className="py-3 flex items-center gap-3">
                                  <img
                                    src={order.productImage}
                                    alt={order.productName}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                  <div>
                                    <span className="font-bold text-ink block">{order.productName}</span>
                                    <span className="text-[11px] text-ink/60">by {order.artisan}</span>
                                  </div>
                                </td>
                                <td className="py-3 text-ink/70">{order.date}</td>
                                <td className="py-3">
                                  <span
                                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                      order.status === "Delivered"
                                        ? "bg-emerald-100 text-emerald-800"
                                        : "bg-blue-100 text-blue-800"
                                    }`}
                                  >
                                    {order.status}
                                  </span>
                                </td>
                                <td className="py-3 text-right font-bold text-ink">{order.formattedAmount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MY ORDERS TAB */}
                {dashboardTab === "orders" && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <h2 className="font-serif-title text-3xl font-bold text-ink">My Orders</h2>
                      <p className="text-xs sm:text-sm text-ink/65 mt-1">
                        Track and manage your order history ({orderList.length} orders)
                      </p>
                    </div>

                    {orderList.length === 0 ? (
                      <div className="rounded-3xl border border-line bg-white p-12 text-center">
                        <Package className="h-12 w-12 text-ink/30 mx-auto mb-3" />
                        <h4 className="font-serif-title text-lg font-bold text-ink">No orders found</h4>
                        <p className="text-xs text-ink/60 mt-1 mb-4">You haven&apos;t placed any orders yet.</p>
                        <button
                          onClick={() => {
                            setActiveView("shop");
                            setSelectedProduct(null);
                            setSelectedArtisan(null);
                          }}
                          className="rounded-full bg-forest px-6 py-2 text-xs font-bold text-white hover:bg-forest-dark transition"
                        >
                          Explore Shop
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orderList.map((order) => (
                          <div
                            key={order.id}
                            className="rounded-2xl border border-line bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-4">
                              <img
                                src={order.productImage}
                                alt={order.productName}
                                className="h-16 w-16 rounded-xl object-cover border border-line shrink-0"
                              />
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
                                  Order #{order.id} &bull; {order.date}
                                </span>
                                <h4 className="font-serif-title text-base font-bold text-ink mt-0.5">
                                  {order.productName}
                                </h4>
                                <p className="text-xs text-ink/60">Crafted by {order.artisan}</p>
                              </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                              <span className="font-serif-title text-base font-bold text-ink">
                                {order.formattedAmount}
                              </span>
                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                  order.status === "Delivered"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 3. WISHLIST TAB */}
                {dashboardTab === "wishlist" && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <h2 className="font-serif-title text-3xl font-bold text-ink">My Wishlist</h2>
                      <p className="text-xs sm:text-sm text-ink/65 mt-1">
                        Handmade creations you&apos;ve saved ({wishlistedProducts.length} items)
                      </p>
                    </div>

                    {wishlistedProducts.length === 0 ? (
                      <div className="rounded-3xl border border-line bg-white p-12 text-center">
                        <Heart className="h-12 w-12 text-ink/30 mx-auto mb-3" />
                        <h4 className="font-serif-title text-lg font-bold text-ink">Your wishlist is empty</h4>
                        <p className="text-xs text-ink/60 mt-1 mb-4">
                          Explore our collection of authentic handicrafts and save your favorites!
                        </p>
                        <button
                          onClick={() => {
                            setActiveView("shop");
                            setSelectedProduct(null);
                            setSelectedArtisan(null);
                          }}
                          className="rounded-full bg-forest px-6 py-2 text-xs font-bold text-white hover:bg-forest-dark transition"
                        >
                          Explore Catalog
                        </button>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {wishlistedProducts.map((product) => (
                          <div
                            key={product.id}
                            className="rounded-2xl border border-line bg-white p-3 shadow-xs flex flex-col justify-between"
                          >
                            <div>
                              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-paper">
                                <img
                                  src={product.image}
                                  alt={product.name}
                                  className="h-full w-full object-cover"
                                />
                                <button
                                  onClick={(e) => toggleWishlist(product.id, e)}
                                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-terracotta hover:bg-terracotta hover:text-white transition shadow-xs"
                                  title="Remove from wishlist"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="pt-3">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
                                  {product.category}
                                </span>
                                <h4
                                  onClick={() => handleSelectProduct(product)}
                                  className="font-bold text-sm text-ink hover:text-terracotta cursor-pointer transition line-clamp-1 mt-0.5"
                                >
                                  {product.name}
                                </h4>
                                <p className="text-xs text-ink/60">by {product.artisan}</p>
                              </div>
                            </div>
                            <div className="mt-3 pt-2 border-t border-line/60 flex items-center justify-between">
                              <span className="font-bold text-sm text-ink">{product.formattedPrice}</span>
                              <button
                                onClick={(e) => addToCart(product, 1, e)}
                                className="rounded-full bg-forest px-3 py-1.5 text-xs font-bold text-white hover:bg-forest-dark transition"
                              >
                                Add to Cart
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 4. PROFILE TAB */}
                {dashboardTab === "profile" && (
                  <div className="space-y-6 animate-fade-in">
                    <div>
                      <h2 className="font-serif-title text-3xl font-bold text-ink">User Profile</h2>
                      <p className="text-xs sm:text-sm text-ink/65 mt-1">
                        Manage your account settings and delivery preferences
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                      {/* Personal Info */}
                      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs space-y-4">
                        <div className="flex items-center gap-4 pb-4 border-b border-line">
                          <div className="h-14 w-14 rounded-full bg-forest text-white grid place-items-center font-serif-title text-xl font-bold">
                            {userProfile.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-serif-title text-lg font-bold text-ink">{userProfile.name}</h3>
                            <span className="rounded-full bg-terracotta/10 px-2.5 py-0.5 text-[10px] font-bold text-terracotta">
                              Artisan Patron Tier
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="font-bold text-ink/60 uppercase text-[10px] tracking-wider block">Full Name</label>
                            <p className="font-semibold text-ink mt-0.5">{userProfile.name}</p>
                          </div>
                          <div>
                            <label className="font-bold text-ink/60 uppercase text-[10px] tracking-wider block">Email Address</label>
                            <p className="font-semibold text-ink mt-0.5">{userProfile.email}</p>
                          </div>
                          <div>
                            <label className="font-bold text-ink/60 uppercase text-[10px] tracking-wider block">Phone Number</label>
                            <p className="font-semibold text-ink mt-0.5">{userProfile.phone}</p>
                          </div>
                        </div>
                      </div>

                      {/* Shipping Address */}
                      <div className="rounded-3xl border border-line bg-white p-6 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-4 border-b border-line">
                          <h3 className="font-serif-title text-lg font-bold text-ink flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-terracotta" /> Delivery Address
                          </h3>
                          <span className="text-[10px] font-bold bg-forest/10 text-forest px-2 py-0.5 rounded-full">Default</span>
                        </div>
                        <div className="text-xs space-y-2 text-ink/80">
                          <p className="font-bold text-ink">{userProfile.name}</p>
                          <p>402, Lotus Residency, 12th Main Road</p>
                          <p>Indiranagar, Bengaluru, Karnataka</p>
                          <p className="font-semibold">PIN: 560038</p>
                          <p className="text-ink/60 pt-1">Phone: {userProfile.phone}</p>
                        </div>
                      </div>
                    </div>

                    {/* ShilpSetu Fair Trade Guarantee Card */}
                    <div className="rounded-3xl border border-line bg-forest/5 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-forest text-white grid place-items-center shrink-0">
                        <ShieldCheck className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-xs">
                        <h4 className="font-bold text-forest text-sm">Direct Artisan Benefit Guarantee</h4>
                        <p className="text-ink/75 mt-0.5">
                          Every purchase you make on ShilpSetu sends fair compensation directly to rural craft clusters without middlemen markups.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: ABOUT VIEW */}
        {activeView === "about" && !selectedProduct && !selectedArtisan && (
          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 animate-fade-in text-center">
            <ShilpSetuLogo className="h-16 mx-auto mb-6" />
            <h1 className="font-serif-title text-4xl font-bold text-ink">
              Bridging Traditional Hands & Modern Homes
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-base text-ink/75 leading-relaxed">
              ShilpSetu directly connects rural Indian artisans with global buyers, eliminating intermediaries to ensure fair prices, cultural preservation, and sustainable livelihoods.
            </p>
          </div>
        )}
      </main>

      {/* ================= LOGIN / AUTH MODAL (Top Middle Screen in mockup) ================= */}
      {isLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-ivory p-6 sm:p-8 shadow-2xl border border-line overflow-hidden animate-scale-up">
            {/* Close Button */}
            <button
              onClick={() => setIsLoginOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-paper text-ink/60 hover:text-ink"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Floral Corner Accents matching mockup */}
            <div className="pattern-floral-corner absolute inset-0 pointer-events-none opacity-40" />

            {/* Modal Header */}
            <div className="text-center mb-6">
              <ShilpSetuLogo className="h-12 mx-auto justify-center mb-2" />
              <h2 className="font-serif-title text-2xl font-bold text-ink">Welcome Back</h2>
              <p className="text-xs text-ink/65">Login to continue your journey</p>
            </div>

            {/* Buyer vs Artisan Role Selector Tabs matching mockup */}
            <div className="grid grid-cols-2 rounded-2xl bg-paper p-1 mb-6 text-xs font-bold">
              <button
                onClick={() => setLoginRole("buyer")}
                className={`py-2 rounded-xl transition ${loginRole === "buyer" ? "bg-forest text-white shadow-xs" : "text-ink/70"
                  }`}
              >
                Buyer
              </button>
              <button
                onClick={() => setLoginRole("artisan")}
                className={`py-2 rounded-xl transition ${loginRole === "artisan" ? "bg-forest text-white shadow-xs" : "text-ink/70"
                  }`}
              >
                Artisan
              </button>
            </div>

            {/* Login Form Inputs */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setIsLoggedIn(true);
                setIsLoginOpen(false);
              }}
              className="space-y-4"
            >
              <div>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40" />
                  <input
                    type="text"
                    required
                    placeholder="Email or Phone Number"
                    defaultValue="ishwari@shilpsetu.com"
                    className="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-xs sm:text-sm text-ink outline-none focus:border-forest"
                  />
                </div>
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Password"
                    defaultValue="password123"
                    className="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-10 text-xs sm:text-sm text-ink outline-none focus:border-forest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-ink/40 hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-semibold">
                <label className="flex items-center gap-2 cursor-pointer text-ink/75">
                  <input type="checkbox" defaultChecked className="accent-forest" /> Remember me
                </label>
                <a href="#forgot" className="text-forest hover:underline">Forgot password?</a>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-forest py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-forest-dark"
              >
                Login
              </button>
            </form>

            {/* OR Divider */}
            <div className="relative my-5 text-center text-xs text-ink/40">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
              <span className="relative bg-ivory px-3 uppercase font-bold text-[10px]">OR</span>
            </div>

            {/* Google Login Button */}
            <button
              onClick={() => {
                setIsLoggedIn(true);
                setIsLoginOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border border-line bg-white py-3 text-xs font-bold text-ink hover:bg-paper transition"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.31 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              Continue with Google
            </button>

            <p className="mt-4 text-center text-xs font-semibold text-ink/70">
              Don&apos;t have an account? <button onClick={() => setLoginRole("buyer")} className="text-terracotta font-bold hover:underline">Sign Up</button>
            </p>
          </div>
        </div>
      )}

      {/* ================= FULL CART PAGE ================= */}
      {activeView === "cart" && (
        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-terracotta">Your collection</p>
              <h1 className="font-serif-title text-4xl font-bold text-ink sm:text-5xl">My Cart <span className="text-forest">({totalCartItemCount})</span></h1>
            </div>
            <button onClick={() => setActiveView("shop")} className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-white px-5 py-2.5 text-sm font-bold text-forest transition hover:bg-paper">
              <ArrowRight className="h-4 w-4 rotate-180" /> Continue shopping
            </button>
          </div>

          {cart.length === 0 ? (
            <div className="rounded-3xl border border-line bg-white py-20 text-center shadow-sm">
              <ShoppingBag className="mx-auto h-14 w-14 stroke-1 text-forest/40" />
              <p className="mt-4 text-lg font-bold text-ink">Your cart is currently empty.</p>
              <button onClick={() => setActiveView("shop")} className="mt-5 rounded-full bg-forest px-6 py-3 text-sm font-bold text-white">Start Shopping</button>
            </div>
          ) : (
            <div className="grid items-start gap-8 lg:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                {cart.map(({ product, quantity }) => (
                  <article key={product.id} className="flex gap-4 rounded-3xl border border-line bg-white p-4 shadow-sm sm:gap-6 sm:p-5">
                    <img src={product.image} alt={product.name} className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-ink/55">by {product.artisan}</p>
                      <h2 className="mt-1 text-base font-bold text-ink sm:text-lg">{product.name}</h2>
                      <p className="mt-2 font-bold text-forest">{product.formattedPrice}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex items-center rounded-full border border-line bg-paper px-2 py-1 text-sm font-bold">
                          <button aria-label="Decrease quantity" onClick={() => updateCartQuantity(product.id, -1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-8 text-center">{quantity}</span>
                          <button aria-label="Increase quantity" onClick={() => updateCartQuantity(product.id, 1)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-white"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <button onClick={() => removeFromCart(product.id)} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink/50 transition hover:text-terracotta"><Trash2 className="h-4 w-4" /> Remove</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="sticky top-24 rounded-3xl border border-forest/15 bg-[#f7f0e3] p-6 shadow-lg shadow-forest/5">
                <h2 className="font-serif-title text-2xl font-bold text-ink">Order summary</h2>
                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between text-ink/70"><span>Subtotal</span><span className="font-bold text-ink">₹ {cartSubtotal.toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between text-ink/70"><span>Shipping</span><span className="font-bold text-ink">₹ {shippingFee}</span></div>
                  <div className="flex justify-between border-t border-forest/15 pt-4 text-lg font-bold text-ink"><span>Total</span><span className="text-forest">₹ {cartTotal.toLocaleString("en-IN")}</span></div>
                </div>
                <button onClick={handleCheckout} className="mt-6 w-full rounded-2xl bg-forest py-3.5 text-sm font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-dark">Proceed to Checkout</button>
                <p className="mt-4 text-center text-xs text-ink/55">Secure checkout · Direct support for artisans</p>
              </aside>
            </div>
          )}
        </section>
      )}

      {/* ================= FOOTER & BRAND TRUST BAR ================= */}
      <footer className="mt-auto border-t border-line bg-forest text-white">
        {/* Trust bar at bottom of app */}
        <div className="border-b border-white/10 py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center text-xs font-semibold text-white/80">
            <div className="flex items-center justify-center gap-2">
              <ShieldCheck className="h-4 w-4 text-terracotta" /> Secure Payments
            </div>
            <div className="flex items-center justify-center gap-2">
              <Truck className="h-4 w-4 text-terracotta" /> Fast Delivery
            </div>
            <div className="flex items-center justify-center gap-2">
              <Heart className="h-4 w-4 text-terracotta" /> Support Local
            </div>
          </div>
        </div>

        {/* Main Footer Links */}
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-white/70">
          <div className="space-y-3 md:col-span-2">
            <ShilpSetuLogo variant="light" className="h-12" />
            <p className="max-w-sm text-xs leading-relaxed text-white/75">
              Connecting artisans with the world through craftsmanship. Bringing authentic handmade traditions straight to your doorstep.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-sm text-white mb-3">Quick Links</h4>
            <ul className="space-y-2">
              <li><button onClick={() => setActiveView("home")} className="hover:text-white">Home</button></li>
              <li><button onClick={() => setActiveView("shop")} className="hover:text-white">Shop</button></li>
              <li><button onClick={() => setActiveView("artisans")} className="hover:text-white">Artisans</button></li>
              <li><button onClick={() => setActiveView("about")} className="hover:text-white">About</button></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm text-white mb-3">Customer Care</h4>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-white">FAQs</a></li>
              <li><a href="#shipping" className="hover:text-white">Shipping</a></li>
              <li><a href="#returns" className="hover:text-white">Returns</a></li>
              <li><a href="#contact" className="hover:text-white">Contact Us</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Tagline bar matching mockup */}
        <div className="border-t border-white/10 py-4 bg-forest-dark text-[11px] text-center text-white/50 flex flex-col sm:flex-row items-center justify-between px-6 max-w-7xl mx-auto">
          <span>© 2026 ShilpSetu. All rights reserved.</span>
          <span className="font-semibold text-white/80 mt-1 sm:mt-0">
            Traditional Hands | Modern Platform | A Stronger Tomorrow
          </span>
        </div>
      </footer>
    </div>
  );
}
