"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
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
  RefreshCw,
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
  getSeller,
  getSellerProducts,
  searchProducts,
  getQuotes,
  acceptQuote,
  getOrders,
  getOrder,
  getOrderItems,
  createDirectOrder,
  getNotifications,
  getUnreadNotifications,
  markNotificationRead,
  ApiError,
} from "../services/customerApi";
import {
  adaptBackendProduct,
  adaptSearchResultItem,
} from "../services/adapters";
import {
  Product as BackendProduct,
  OrderResponse,
  OrderItemResponse,
  OrderStatus,
  NotificationResponse,
  DirectOrderCreateRequest,
} from "../services/types";
import { useCustomerAuth } from "../context/CustomerAuthContext";
import { ProductImage } from "../components/ProductImage";

const featuredVideoUrls = [
  "https://pixabay.com/videos/download/video-45455_medium.mp4",
  "https://www.pexels.com/download/video/20143605/",
  "https://www.pexels.com/download/video/8066061/",
  "https://www.pexels.com/download/video/20788616/",
];

// Standard lifecycle stages based on real backend OrderStatus enum:
// Literal["pending", "confirmed", "processing", "completed", "cancelled"]
const ORDER_LIFECYCLE_STAGES: {
  status: OrderStatus;
  labelEn: string;
  labelHi: string;
  descriptionEn: string;
  descriptionHi: string;
}[] = [
  {
    status: "pending",
    labelEn: "Order Placed",
    labelHi: "ऑर्डर सबमिट हुआ",
    descriptionEn: "Order received and queued for cluster fulfillment",
    descriptionHi: "ऑर्डर प्राप्त हुआ और कारीगर समूह को भेजा गया",
  },
  {
    status: "confirmed",
    labelEn: "Confirmed",
    labelHi: "ऑर्डर पुष्ट",
    descriptionEn: "Artisans confirmed order specifications and allocated workshop capacity",
    descriptionHi: "कारीगरों ने विशिष्टताओं की पुष्टि कर कार्यशाला क्षमता आवंटित की",
  },
  {
    status: "processing",
    labelEn: "In Production",
    labelHi: "निर्माण कार्य प्रगति पर",
    descriptionEn: "Master craftspeople are hand-making your pieces with traditional techniques",
    descriptionHi: "कारीगर पारंपरिक तकनीकों से हस्तशिल्प तैयार कर रहे हैं",
  },
  {
    status: "completed",
    labelEn: "Delivered",
    labelHi: "ऑर्डर पूर्ण व वितरित",
    descriptionEn: "Heritage pieces crafted, quality-inspected, and delivered",
    descriptionHi: "पारंपरिक उत्पाद तैयार, गुणवत्ता-जांच पूर्ण और वितरित",
  },
];

const getOrderStatusMeta = (status: OrderStatus | string) => {
  switch (status) {
    case "pending":
      return {
        labelEn: "Pending",
        labelHi: "सबमिट हुआ",
        color: "bg-amber-100 text-amber-800 border-amber-200",
        stepIndex: 0,
      };
    case "confirmed":
      return {
        labelEn: "Confirmed",
        labelHi: "पुष्ट",
        color: "bg-sky-100 text-sky-800 border-sky-200",
        stepIndex: 1,
      };
    case "processing":
      return {
        labelEn: "In Production",
        labelHi: "निर्माण में",
        color: "bg-purple-100 text-purple-800 border-purple-200",
        stepIndex: 2,
      };
    case "completed":
      return {
        labelEn: "Completed",
        labelHi: "पूर्ण",
        color: "bg-emerald-100 text-emerald-800 border-emerald-200",
        stepIndex: 3,
      };
    case "cancelled":
      return {
        labelEn: "Cancelled",
        labelHi: "रद्द",
        color: "bg-rose-100 text-rose-800 border-rose-200",
        stepIndex: -1,
      };
    default:
      return {
        labelEn: String(status),
        labelHi: String(status),
        color: "bg-gray-100 text-gray-800 border-gray-200",
        stepIndex: 0,
      };
  }
};

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
  const [dashboardTab, setDashboardTab] = useState<"dashboard" | "orders" | "quotes" | "notifications" | "wishlist" | "profile" | "addresses">("dashboard");

  // Customer Quotes State
  const [dashboardQuotes, setDashboardQuotes] = useState<any[]>([]);
  const [isLoadingQuotes, setIsLoadingQuotes] = useState<boolean>(false);

  // Customer Real Orders State (Backend Source of Truth)
  const [backendOrders, setBackendOrders] = useState<OrderResponse[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState<boolean>(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  // Selected Order Detail & Tracking Modal State
  const [selectedDashboardOrder, setSelectedDashboardOrder] = useState<OrderResponse | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<OrderItemResponse[]>([]);
  const [isLoadingOrderItems, setIsLoadingOrderItems] = useState<boolean>(false);

  // Customer Notifications State
  const [dashboardNotifications, setDashboardNotifications] = useState<NotificationResponse[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState<number>(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState<boolean>(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

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

  // Customer Authentication Context Integration
  const {
    customer,
    token,
    isAuthenticated,
    login: authLogin,
    register: authRegister,
    logout: authLogout,
    isLoading: isAuthLoading,
    error: authError,
    clearError: clearAuthError,
  } = useCustomerAuth();

  // Auth Modal State
  const [isLoginOpen, setIsLoginOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authPhone, setAuthPhone] = useState<string>("");
  const [authFormError, setAuthFormError] = useState<string | null>(null);
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // Active customer profile (derived from real backend customer auth)
  const activeCustomerProfile = customer
    ? {
        name: customer.name,
        email: customer.email || "customer@shilpsetu.com",
        phone: customer.phone || "Not provided",
        tier: "Customer / ग्राहक",
      }
    : {
        name: "Guest Customer",
        email: "Sign in to view",
        phone: "—",
        tier: "Guest",
      };

  // Cart & Wishlist State (Cart in-memory & persisted to localStorage)
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [isCartQuoteModalOpen, setIsCartQuoteModalOpen] = useState<boolean>(false);
  const [customerCareModal, setCustomerCareModal] = useState<"faq" | "shipping" | "returns" | "contact" | null>(null);

  // D2C Direct Checkout States
  const [shippingAddress, setShippingAddress] = useState<string>("");
  const [orderNotes, setOrderNotes] = useState<string>("");
  const [isPlacingDirectOrder, setIsPlacingDirectOrder] = useState<boolean>(false);
  const [directOrderError, setDirectOrderError] = useState<string | null>(null);
  const [confirmedDirectOrder, setConfirmedDirectOrder] = useState<OrderResponse | null>(null);

  // Client-safe hydration of customer cart & wishlist from localStorage
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem("shilpsetu_customer_cart");
      if (storedCart) {
        const parsed = JSON.parse(storedCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCart(parsed);
        }
      }
    } catch (err) {
      console.warn("Could not read shilpsetu_customer_cart:", err);
    }
  }, []);

  // Persist cart updates to localStorage
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem("shilpsetu_customer_cart", JSON.stringify(cart));
      } else {
        localStorage.removeItem("shilpsetu_customer_cart");
      }
    } catch (err) {
      console.warn("Could not write shilpsetu_customer_cart:", err);
    }
  }, [cart]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("shilpsetu_customer_wishlist");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlist(parsed);
          return;
        }
      }
    } catch (err) {
      console.warn("Could not read shilpsetu_customer_wishlist:", err);
    }
    setWishlist([]);
  }, []);

  // Shop Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>("");
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [maxPrice, setMaxPrice] = useState<number>(5000);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [orderList, setOrderList] = useState<Order[]>([]);

  // Live Backend Product State
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);
  const [productError, setProductError] = useState<string | null>(null);
  const [artisanNameCache, setArtisanNameCache] = useState<Record<string, string>>({});

  const [isUsingMockFallback, setIsUsingMockFallback] = useState<boolean>(false);

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
      if (response && response.products && response.products.length > 0) {
        const adapted = response.products.map((p) =>
          adaptBackendProduct(p, artisanNameCache[p.artisan_id])
        );
        setLiveProducts(adapted);
        setIsUsingMockFallback(false);
      } else {
        // Backend returned empty published list (e.g. fresh DB), fallback to mock fixtures for browseable catalog
        const filteredMock = categoryFilter && categoryFilter !== "All"
          ? mockProducts.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase())
          : mockProducts;
        setLiveProducts(filteredMock);
        setIsUsingMockFallback(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Unable to reach server. Displaying offline catalog.";
      setProductError(msg);
      // Preserve existing Customer experience when local server is offline
      const filteredMock = categoryFilter && categoryFilter !== "All"
        ? mockProducts.filter((p) => p.category.toLowerCase() === categoryFilter.toLowerCase())
        : mockProducts;
      setLiveProducts(filteredMock);
      setIsUsingMockFallback(true);
    } finally {
      setIsLoadingProducts(false);
    }
  }, [artisanNameCache]);

  // Load customer quotes from backend
  const fetchCustomerQuotes = useCallback(async () => {
    setIsLoadingQuotes(true);
    try {
      const res = await getQuotes(customer?.id ? { buyer_id: customer.id } : {});
      if (res && res.quotes) {
        setDashboardQuotes(res.quotes);
      }
    } catch {
      // Graceful offline fallback
    } finally {
      setIsLoadingQuotes(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchCustomerQuotes();
  }, [fetchCustomerQuotes]);

  // Load real customer orders from backend
  const fetchCustomerOrders = useCallback(async () => {
    setIsLoadingOrders(true);
    setOrdersError(null);
    try {
      const res = await getOrders(customer?.id ? { buyer_id: customer.id } : {});
      if (res && res.items) {
        setBackendOrders(res.items);
      } else {
        setBackendOrders([]);
      }
    } catch (err: unknown) {
      setBackendOrders([]);
      const msg =
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Unable to connect to ShilpSetu order service. / ShilpSetu ऑर्डर सेवा से कनेक्शन नहीं हो सका।";
      setOrdersError(msg);
    } finally {
      setIsLoadingOrders(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchCustomerOrders();
  }, [fetchCustomerOrders]);

  // Load customer notifications from backend
  const fetchCustomerNotifications = useCallback(async () => {
    setIsLoadingNotifications(true);
    setNotificationsError(null);
    try {
      const res = await getNotifications(customer?.id ? { user_id: customer.id } : {});
      if (res && res.items) {
        setDashboardNotifications(res.items);
        setUnreadNotificationCount(res.unread_count ?? res.items.filter((n) => !n.is_read).length);
      } else {
        setDashboardNotifications([]);
        setUnreadNotificationCount(0);
      }
    } catch (err: unknown) {
      setDashboardNotifications([]);
      setUnreadNotificationCount(0);
      const msg =
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "Unable to connect to ShilpSetu notification service. / ShilpSetu सूचना सेवा से कनेक्शन नहीं हो सका।";
      setNotificationsError(msg);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    fetchCustomerNotifications();
  }, [fetchCustomerNotifications]);

  // Mark notification read
  const handleMarkNotificationRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setDashboardNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn("Could not mark notification as read:", err);
    }
  };

  // Open Order Details
  const handleOpenOrderDetail = async (order: OrderResponse) => {
    setSelectedDashboardOrder(order);
    setSelectedOrderItems(order.items || []);
    setIsLoadingOrderItems(true);
    try {
      const [fresh, items] = await Promise.all([
        getOrder(order.id).catch(() => order),
        getOrderItems(order.id).catch(() => order.items || []),
      ]);
      setSelectedDashboardOrder(fresh);
      setSelectedOrderItems(items);
    } catch (err) {
      console.warn("Could not load fresh order items:", err);
    } finally {
      setIsLoadingOrderItems(false);
    }
  };

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
            const artisanProf = await getSeller(liveDetail.artisan_id);
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

  // Select Seller (Artisan) and load live profile and products from backend
  const handleSelectSeller = useCallback(async (sellerIdOrName: string) => {
    // Check if sellerIdOrName is a UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sellerIdOrName);
    if (isUuid) {
      try {
        const [profile, products] = await Promise.all([
          getSeller(sellerIdOrName),
          getSellerProducts(sellerIdOrName).catch(() => []),
        ]);

        const sellerName = profile.business_name || profile.name || "Master Seller";
        const sellerLoc = profile.location || [profile.city, profile.state, profile.country].filter(Boolean).join(", ") || "India";

        const adaptedSeller: Artisan = {
          id: profile.id,
          name: sellerName,
          craft: profile.craft_type || "Traditional Craft",
          location: sellerLoc,
          description: profile.description || "Dedicated traditional craft master partnered with ShilpSetu.",
          image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400",
          bannerImage: "https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=1200&q=85",
          followersCount: 150,
          impactBadges: ["Direct Fair Trade", profile.craft_type || "Heritage Craft", "Registered Seller / पंजीकृत विक्रेता"],
          productsCount: products.length,
        };

        if (products.length > 0) {
          const adaptedProducts = products.map((p) =>
            adaptBackendProduct(p, sellerName, sellerLoc)
          );
          setLiveProducts((prev) => {
            const merged = [...adaptedProducts];
            for (const existing of prev) {
              if (!merged.some((m) => m.id === existing.id)) {
                merged.push(existing);
              }
            }
            return merged;
          });
        }

        setSelectedArtisan(adaptedSeller);
        setSelectedProduct(null);
        setActiveView("artisans");
        return;
      } catch (err) {
        console.warn("Could not fetch live seller profile:", err);
      }
    }

    // Fallback: match by name from mock artisans
    const found =
      artisans.find((a) => a.name.toLowerCase() === sellerIdOrName.toLowerCase() || a.id === sellerIdOrName) ||
      artisans[0];
    setSelectedArtisan(found);
    setSelectedProduct(null);
    setActiveView("artisans");
  }, []);

  // Cart Calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const shippingFee = cartSubtotal > 0 ? 100 : 0;
  const cartTotal = cartSubtotal + shippingFee;
  const totalCartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  // Helper Handlers (Wishlist synced to localStorage)
  const toggleWishlist = (productId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist((prev) => {
      const next = prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId];
      try {
        localStorage.setItem("shilpsetu_customer_wishlist", JSON.stringify(next));
      } catch (err) {
        console.warn("Could not persist wishlist to localStorage:", err);
      }
      return next;
    });
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

  // Legitimate commercial flow: opens ShilpSetu quote request modal (zero fake transactions)
  // Direct D2C Ordering: places real order via POST /api/orders/direct
  const handlePlaceDirectOrder = async () => {
    setDirectOrderError(null);

    // 1. Validate cart is not empty
    if (!cart || cart.length === 0) {
      setDirectOrderError("Your cart is empty. Please add items before placing an order.");
      return;
    }

    // 2. Validate customer authentication
    if (!isAuthenticated || !customer) {
      setDirectOrderError("Please sign in with your Customer account to place an order. / कृपया ऑर्डर जारी रखने के लिए लॉगिन करें।");
      setIsLoginOpen(true);
      return;
    }

    // 3. Prepare payload: actual product IDs and quantities (never client-calculated price)
    const items = cart.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    }));

    setIsPlacingDirectOrder(true);
    try {
      const order = await createDirectOrder(
        {
          items,
          shipping_address: shippingAddress.trim() || undefined,
          notes: orderNotes.trim() || undefined,
        },
        token || undefined
      );

      // 4. On successful 201 response:
      // Clear purchased cart items
      setCart([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("shilpsetu_customer_cart");
      }
      // Show real order confirmation
      setConfirmedDirectOrder(order);
    } catch (err: unknown) {
      console.error("Direct order failure:", err);
      if (err instanceof ApiError) {
        if (err.status === 401 || err.code === "UNAUTHORIZED" || err.code === "UNAUTHENTICATED") {
          setDirectOrderError("Your session has expired. Please sign in again to complete your order.");
          setIsLoginOpen(true);
        } else if (err.status === 403 || err.code === "INSUFFICIENT_ROLE" || err.code === "FORBIDDEN") {
          setDirectOrderError("Only registered customers can place direct orders. Sellers should sign in with a customer account.");
        } else if (err.status === 409 || err.code === "INVENTORY_INSUFFICIENT") {
          setDirectOrderError(`Insufficient Stock: ${err.message}`);
        } else if (err.status === 404 || err.code === "PRODUCT_NOT_FOUND") {
          setDirectOrderError(`Product Unavailable: ${err.message}`);
        } else if (err.status === 400 || err.code === "INVALID_ORDER_ITEMS") {
          setDirectOrderError(`Order Item Error: ${err.message}`);
        } else if (err.status === 422) {
          setDirectOrderError("One or more items in your cart are not valid live catalog products. Please remove demo items and add authentic artisan products.");
        } else {
          setDirectOrderError(err.message || "Failed to place direct order. Please try again.");
        }
      } else {
        const errorMsg = err instanceof Error ? err.message : "A network or server error occurred.";
        setDirectOrderError(errorMsg);
      }
    } finally {
      setIsPlacingDirectOrder(false);
    }
  };

  // Legitimate B2B quotation flow: opens ShilpSetu quote request modal (zero fake transactions)
  const handleCheckout = () => {
    setIsCartQuoteModalOpen(true);
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

  // Wishlist products pool strictly from live authentic catalog
  const wishlistedProducts = liveProducts.filter((p) => wishlist.includes(p.id));

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
            <Link
              href="/buyer/custom-request"
              className="hidden xl:inline-flex items-center gap-1.5 rounded-full border border-terracotta/30 bg-terracotta/10 px-3 py-1 text-xs font-bold text-terracotta transition hover:bg-terracotta hover:text-white"
            >
              <Sparkles className="h-3 w-3" />
              <span>Bulk & Custom / थोक ऑर्डर</span>
            </Link>
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

            {/* Notifications Trigger */}
            <button
              onClick={() => {
                if (isAuthenticated) {
                  setActiveView("dashboard");
                  setDashboardTab("notifications");
                } else {
                  setAuthMode("login");
                  setAuthFormError(null);
                  setIsLoginOpen(true);
                }
              }}
              className="relative p-2 rounded-full text-ink/80 hover:text-forest transition"
              aria-label="Notifications / सूचनाएं"
              title="Notifications / सूचनाएं"
            >
              <Bell className="h-5 w-5" />
              {unreadNotificationCount > 0 && (
                <span className="absolute top-0 right-0 flex h-4 w-4 items-center justify-center rounded-full bg-terracotta text-[10px] font-bold text-white">
                  {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                </span>
              )}
            </button>

            {/* Profile / Account / Login Trigger */}
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setActiveView("dashboard");
                  setDashboardTab("dashboard");
                }}
                className={`p-2 rounded-full text-ink/80 hover:text-forest transition ${activeView === "dashboard" ? "text-forest font-bold" : ""
                  }`}
                aria-label="Customer Account"
                title={customer?.name || "Customer / ग्राहक"}
              >
                <div className="flex items-center gap-1.5">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-forest text-[10px] font-bold text-white">
                    {(customer?.name || "C").slice(0, 1).toUpperCase()}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-ink/90">
                    {customer?.name?.split(" ")[0] || "Customer"}
                  </span>
                </div>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setAuthFormError(null);
                  setIsLoginOpen(true);
                }}
                className="rounded-full border border-forest px-4 py-1.5 text-xs sm:text-sm font-bold text-forest hover:bg-forest hover:text-white transition"
              >
                Login / लॉगिन
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
                      onClick={() => {
                        setAuthMode("register");
                        setAuthFormError(null);
                        setIsLoginOpen(true);
                      }}
                      className="inline-flex items-center gap-2 rounded-full border-2 border-[#164E46]/40 bg-transparent px-7 py-3.5 text-base font-bold text-[#164E46] transition duration-200 hover:border-[#164E46] hover:bg-[#164E46] hover:text-white"
                    >
                      Join as Customer / ग्राहक
                    </button>
                  </div>
                  <div>
                    <Link
                      href="/buyer/custom-request"
                      className="inline-flex items-center gap-2 text-xs font-bold text-terracotta hover:underline"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Looking for Bulk or Custom Orders? Try AI Multi-Seller Matching &rarr;</span>
                    </Link>
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
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=800&q=80";
                          }}
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
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80";
                          }}
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
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&q=80&w=900";
                      }}
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
                    liveProducts.slice(0, 4).map((product, index) => (
                      <div
                        key={product.id}
                        onClick={() => handleSelectProduct(product)}
                        className="group cursor-pointer rounded-2xl border border-line bg-white p-3 shadow-xs transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-paper">
                          <ProductImage
                            src={product.image}
                            fallbackSrc={product.fallbackImage}
                            category={product.category}
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
                  <p className="text-xs sm:text-sm font-semibold text-white/80 mt-1">Happy Craft Customers / संतुष्ट ग्राहक</p>
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
                src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=1200&q=85"
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

                {/* Live Backend Connection Status / Fallback Indicator */}
                {isUsingMockFallback ? (
                  <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold flex items-center gap-1.5 text-amber-900">
                        <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Offline Catalog Mode
                      </span>
                      <p className="mt-0.5 text-amber-700">
                        {productError || "Currently showing curated offline crafts while backend is disconnected."}
                      </p>
                    </div>
                    <button
                      onClick={() => fetchLiveProducts(selectedCategory)}
                      className="rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-amber-700 transition shrink-0"
                    >
                      Connect Live
                    </button>
                  </div>
                ) : (
                  <div className="mb-4 flex items-center gap-2 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full w-fit">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Live FastAPI Catalog Connected</span>
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
                            <ProductImage
                              src={product.image}
                              fallbackSrc={product.fallbackImage}
                              category={product.category}
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
                      <ProductImage
                        src={img}
                        fallbackSrc={selectedProduct.fallbackImage}
                        category={selectedProduct.category}
                        alt="Thumbnail"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>

                {/* Main Product Card */}
                <div className="relative flex-1 overflow-hidden rounded-3xl bg-paper aspect-square w-full shadow-xs">
                  <ProductImage
                    src={selectedProduct.gallery[activeGalleryIndex] || selectedProduct.image}
                    fallbackSrc={selectedProduct.fallbackImage}
                    category={selectedProduct.category}
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
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = artisans[0].image;
                        }}
                      />
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-terracotta">About the Seller / विक्रेता</p>
                        <h4 className="font-serif-title font-bold text-base text-ink">{selectedProduct.artisan}</h4>
                        <p className="text-xs text-ink/65 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-terracotta" /> {selectedProduct.artisanLocation}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleSelectSeller(selectedProduct.artisan)}
                      className="shrink-0 rounded-full border border-forest px-4 py-2 text-xs font-bold text-forest bg-white hover:bg-forest hover:text-white transition shadow-xs"
                    >
                      View Seller Profile →
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
                  🎨 About Seller / विक्रेता परिचय
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
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = artisans[0].image;
                      }}
                    />
                    <div className="space-y-2 text-center sm:text-left flex-1">
                      <span className="rounded-full bg-terracotta/10 px-3 py-1 text-[11px] font-bold text-terracotta uppercase">
                        Registered Seller / पंजीकृत विक्रेता
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
                        alert("⭐ Review added for this session / इस सत्र के लिए समीक्षा जोड़ी गई।");
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
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = artisans[0].bannerImage;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/90 to-transparent p-6 flex items-end">
                <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-white">Seller Profile / विक्रेता प्रोफ़ाइल</h1>
              </div>
            </div>

            {/* Profile Info Header */}
            <div className="relative z-10 -mt-12 mx-4 sm:mx-8 rounded-3xl bg-white p-6 shadow-xl border border-line flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <img
                  src={(selectedArtisan || artisans[0]).image}
                  alt={(selectedArtisan || artisans[0]).name}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-terracotta shadow-md"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = artisans[0].image;
                  }}
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

              {/* More Products by Seller */}
              <div className="space-y-4">
                <h3 className="font-serif-title text-2xl font-bold text-ink">More Creations by this Seller / इस विक्रेता के उत्पाद</h3>
                <div className="space-y-4">
                  {liveProducts
                    .filter((p: Product) => p.artisan === (selectedArtisan || artisans[0]).name)
                    .map((product: Product) => (
                      <div
                        key={product.id}
                        onClick={() => setSelectedProduct(product)}
                        className="cursor-pointer rounded-2xl border border-line bg-white p-3 flex items-center gap-4 hover:shadow-md transition"
                      >
                        <ProductImage
                          src={product.image}
                          fallbackSrc={product.fallbackImage}
                          category={product.category}
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

        {/* VIEW 5: USER DASHBOARD VIEW */}
        {activeView === "dashboard" && !selectedProduct && !selectedArtisan && (
          !isAuthenticated ? (
            <div className="mx-auto max-w-md px-4 py-16 text-center animate-fade-in">
              <div className="rounded-3xl border border-line bg-white p-8 shadow-sm space-y-4">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest/10 text-forest">
                  <User className="h-7 w-7 text-forest" />
                </div>
                <h2 className="font-serif-title text-2xl font-bold text-ink">
                  Customer Sign In Required
                </h2>
                <p className="text-xs text-ink/70 leading-relaxed">
                  Please sign in to your verified customer account to view your orders, quotes, wishlist, and notifications.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthFormError(null);
                      setIsLoginOpen(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-forest-dark transition"
                  >
                    <span>Sign In / लॉगिन करें →</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
                  onClick={() => setDashboardTab("quotes")}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition ${dashboardTab === "quotes" ? "bg-forest text-white shadow-md" : "text-ink/80 hover:bg-paper"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-terracotta" /> My Quotes / कोटेशन
                  </div>
                  {dashboardQuotes.length > 0 && (
                    <span className="rounded-full bg-terracotta/20 px-2 py-0.5 text-[10px] font-bold text-terracotta">
                      {dashboardQuotes.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setDashboardTab("notifications")}
                  className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold transition ${dashboardTab === "notifications" ? "bg-forest text-white shadow-md" : "text-ink/80 hover:bg-paper"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className="h-4 w-4 text-forest" /> Notifications / सूचनाएं
                  </div>
                  {unreadNotificationCount > 0 && (
                    <span className="rounded-full bg-terracotta px-2 py-0.5 text-[10px] font-bold text-white">
                      {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                    </span>
                  )}
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
                  onClick={() => {
                    authLogout();
                    setActiveView("home");
                  }}
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-terracotta hover:bg-terracotta/10 transition mt-4"
                >
                  <LogOut className="h-4 w-4" /> Logout / लॉगआउट
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
                        Welcome back, {activeCustomerProfile.name}!
                      </h1>
                      <p className="text-xs sm:text-sm text-ink/65 mt-1">
                        Here&apos;s your journey with ShilpSetu as a valued {activeCustomerProfile.tier}.
                      </p>
                    </div>

                    {/* 4 STAT CARDS connected to real backend customer data */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Total Orders</p>
                        <p className="font-serif-title text-3xl font-bold text-ink mt-1">
                          {isLoadingOrders ? "..." : backendOrders.length}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Wishlist Items</p>
                        <p className="font-serif-title text-3xl font-bold text-ink mt-1">{wishlist.length}</p>
                      </div>

                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Total Spent</p>
                        <p className="font-serif-title text-3xl font-bold text-forest mt-1">
                          ₹ {backendOrders.reduce((acc, o) => acc + (Number(o.total_price) || 0), 0).toLocaleString("en-IN")}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-line bg-paper/60 p-4 text-center">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-ink/60">Artisans Supported</p>
                        <p className="font-serif-title text-2xl font-bold text-terracotta mt-1">
                          {new Set(backendOrders.map((o) => o.artisan_id).filter(Boolean)).size} Artisans
                        </p>
                      </div>
                    </div>

                    {/* RECENT ORDERS TABLE (Real Backend Orders) */}
                    <div className="rounded-3xl border border-line bg-white p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg text-ink">Recent Orders / हालिया ऑर्डर</h3>
                          <span className="text-xs text-ink/60">({backendOrders.length})</span>
                        </div>
                        <button
                          onClick={() => setDashboardTab("orders")}
                          className="text-xs font-bold text-terracotta hover:underline"
                        >
                          View All →
                        </button>
                      </div>

                      {isLoadingOrders ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-ink/60 text-xs">
                          <RefreshCw className="h-4 w-4 animate-spin text-forest" />
                          <span>Loading real orders from server...</span>
                        </div>
                      ) : ordersError ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800 flex items-center justify-between">
                          <span>{ordersError}</span>
                          <button
                            onClick={() => fetchCustomerOrders()}
                            className="font-bold underline ml-2"
                          >
                            Retry / पुनः प्रयास
                          </button>
                        </div>
                      ) : backendOrders.length === 0 ? (
                        <div className="text-center py-8 text-xs text-ink/60">
                          <Package className="h-8 w-8 mx-auto text-ink/30 mb-2" />
                          <p className="font-bold text-ink/80">No orders placed yet / अभी कोई ऑर्डर नहीं है</p>
                          <p className="mt-0.5">Explore authentic artisanal handcrafted collections.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-line text-ink/60">
                                <th className="pb-3 font-semibold">Order ID</th>
                                <th className="pb-3 font-semibold">Date</th>
                                <th className="pb-3 font-semibold">Status</th>
                                <th className="pb-3 font-semibold text-right">Amount</th>
                                <th className="pb-3 font-semibold text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-line/60">
                              {backendOrders.slice(0, 3).map((order) => {
                                const statusMeta = getOrderStatusMeta(order.status);
                                return (
                                  <tr key={order.id} className="hover:bg-paper/30 transition">
                                    <td className="py-3 font-mono text-xs font-bold text-ink">
                                      #{order.id.slice(0, 8)}
                                    </td>
                                    <td className="py-3 text-ink/70">
                                      {order.created_at
                                        ? new Date(order.created_at).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })
                                        : "—"}
                                    </td>
                                    <td className="py-3">
                                      <span
                                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold border ${statusMeta.color}`}
                                      >
                                        {statusMeta.labelEn} / {statusMeta.labelHi}
                                      </span>
                                    </td>
                                    <td className="py-3 text-right font-bold text-ink">
                                      ₹ {(Number(order.total_price) || 0).toLocaleString("en-IN")}
                                    </td>
                                    <td className="py-3 text-right">
                                      <button
                                        onClick={() => handleOpenOrderDetail(order)}
                                        className="text-xs font-bold text-forest hover:text-forest-dark underline"
                                      >
                                        Track & Details
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. MY ORDERS TAB (Real Backend Orders) */}
                {dashboardTab === "orders" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-serif-title text-3xl font-bold text-ink">My Orders / मेरे ऑर्डर</h2>
                        <p className="text-xs sm:text-sm text-ink/65 mt-1">
                          Track and manage your order history ({backendOrders.length} orders)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchCustomerOrders()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink/70 hover:bg-paper transition"
                          title="Refresh Orders"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingOrders ? "animate-spin text-forest" : ""}`} />
                          <span>Refresh</span>
                        </button>
                        <Link
                          href="/buyer/orders"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-white px-4 py-2 text-xs font-bold text-forest hover:bg-forest hover:text-white transition"
                        >
                          <span>Full Orders Screen →</span>
                        </Link>
                      </div>
                    </div>

                    {isLoadingOrders ? (
                      <div className="rounded-3xl border border-line bg-white p-12 text-center">
                        <RefreshCw className="h-8 w-8 text-forest animate-spin mx-auto mb-3" />
                        <p className="font-bold text-ink text-sm">Loading orders from server...</p>
                        <p className="text-xs text-ink/60 mt-1">ShilpSetu ऑर्डर लोड हो रहे हैं...</p>
                      </div>
                    ) : ordersError ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                        <AlertCircle className="h-8 w-8 text-amber-700 mx-auto mb-2" />
                        <p className="font-bold text-amber-900 text-sm">{ordersError}</p>
                        <button
                          onClick={() => fetchCustomerOrders()}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-5 py-2 text-xs font-bold text-white hover:bg-forest-dark transition"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry / पुनः प्रयास करें</span>
                        </button>
                      </div>
                    ) : backendOrders.length === 0 ? (
                      <div className="rounded-3xl border border-line bg-white p-12 text-center">
                        <Package className="h-12 w-12 text-ink/30 mx-auto mb-3" />
                        <h4 className="font-serif-title text-lg font-bold text-ink">No orders found / कोई ऑर्डर नहीं मिला</h4>
                        <p className="text-xs text-ink/60 mt-1 mb-4">You haven&apos;t placed any handcrafted orders yet.</p>
                        <button
                          onClick={() => {
                            setActiveView("shop");
                            setSelectedProduct(null);
                            setSelectedArtisan(null);
                          }}
                          className="rounded-full bg-forest px-6 py-2 text-xs font-bold text-white hover:bg-forest-dark transition"
                        >
                          Explore Shop / कैटलॉग देखें
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {backendOrders.map((order) => {
                          const statusMeta = getOrderStatusMeta(order.status);
                          return (
                            <div
                              key={order.id}
                              className="rounded-2xl border border-line bg-white p-4 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-xl bg-forest/10 border border-forest/20 flex items-center justify-center shrink-0">
                                  <Package className="h-7 w-7 text-forest" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-ink">
                                      Order #{order.id.slice(0, 8)}
                                    </span>
                                    <span className="text-[10px] text-ink/50">&bull;</span>
                                    <span className="text-xs text-ink/60">
                                      {order.created_at
                                        ? new Date(order.created_at).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          })
                                        : "—"}
                                    </span>
                                  </div>
                                  <p className="text-xs text-ink/70 mt-1">
                                    Quantity: <span className="font-semibold text-ink">{order.quantity} units</span>
                                    {order.unit_price ? ` @ ₹${Number(order.unit_price).toLocaleString("en-IN")} each` : ""}
                                  </p>
                                </div>
                              </div>

                              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                                <span className="font-serif-title text-base font-bold text-ink">
                                  ₹ {(Number(order.total_price) || 0).toLocaleString("en-IN")}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${statusMeta.color}`}
                                  >
                                    {statusMeta.labelEn} / {statusMeta.labelHi}
                                  </span>
                                  <button
                                    onClick={() => handleOpenOrderDetail(order)}
                                    className="rounded-xl border border-line bg-paper px-3 py-1 text-xs font-bold text-forest hover:bg-forest hover:text-white transition"
                                  >
                                    Track & Details
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* 2.5. MY QUOTES TAB */}
                {dashboardTab === "quotes" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="font-serif-title text-3xl font-bold text-ink">
                          My Quotes / मेरे कोटेशन
                        </h2>
                        <p className="text-xs sm:text-sm text-ink/65 mt-1">
                          Manage bulk craft requirements, review multi-seller allocations, and confirm orders.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href="/buyer/custom-request"
                          className="inline-flex items-center gap-2 rounded-xl bg-forest px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-forest/90"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-terracotta" />
                          <span>New Bulk Request</span>
                        </Link>
                        <Link
                          href="/buyer/quotes"
                          className="inline-flex items-center gap-2 rounded-xl border border-forest/20 bg-white px-4 py-2 text-xs font-bold text-forest transition hover:bg-sand"
                        >
                          <span>Full Manager &rarr;</span>
                        </Link>
                      </div>
                    </div>

                    {dashboardQuotes.length === 0 ? (
                      <div className="rounded-3xl border border-line bg-white p-12 text-center">
                        <Sparkles className="h-12 w-12 text-ink/30 mx-auto mb-3" />
                        <h4 className="font-serif-title text-lg font-bold text-ink">No quote requests yet</h4>
                        <p className="text-xs text-ink/60 mt-1 mb-4 max-w-md mx-auto">
                          Need customized corporate gifts, wedding favors, or bulk craft orders? Our AI will distribute requirements across registered artisan clusters and craftspeople.
                        </p>
                        <Link
                          href="/buyer/custom-request"
                          className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-2.5 text-xs font-bold text-white hover:bg-forest/90 transition"
                        >
                          <Sparkles className="h-3.5 w-3.5 text-terracotta" />
                          <span>Submit Custom Requirement</span>
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {dashboardQuotes.map((q) => (
                          <div
                            key={q.id}
                            className="rounded-2xl border border-line bg-white p-5 shadow-xs transition hover:border-forest/40"
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-forest">
                                    #{q.id.slice(0, 10)}
                                  </span>
                                  <span className="rounded-full bg-forest/10 px-2 py-0.5 text-[10px] font-bold text-forest uppercase">
                                    {q.status}
                                  </span>
                                </div>
                                <h4 className="font-serif-title text-base font-bold text-ink mt-1 line-clamp-1">
                                  {q.requirement_text}
                                </h4>
                              </div>

                              <div className="flex items-center gap-3">
                                <Link
                                  href="/buyer/quotes"
                                  className="rounded-xl border border-forest/20 bg-sand/30 px-3.5 py-1.5 text-xs font-bold text-forest hover:bg-sand transition"
                                >
                                  View Allocations &rarr;
                                </Link>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line/60 pt-3 text-xs">
                              <div>
                                <span className="text-ink/60">Quantity:</span>
                                <p className="font-bold text-ink mt-0.5">{q.quantity} units</p>
                              </div>
                              <div>
                                <span className="text-ink/60">Budget:</span>
                                <p className="font-bold text-forest mt-0.5">
                                  ₹{(q.total_budget || (q.budget_per_unit ? q.budget_per_unit * q.quantity : 0)).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <div>
                                <span className="text-ink/60">Sellers Assigned:</span>
                                <p className="font-bold text-emerald-700 mt-0.5">
                                  {q.allocations?.length || 0} Artisans
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 2.6. NOTIFICATIONS TAB */}
                {dashboardTab === "notifications" && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-serif-title text-3xl font-bold text-ink">
                            Notifications / सूचनाएं
                          </h2>
                          {unreadNotificationCount > 0 && (
                            <span className="rounded-full bg-terracotta px-2.5 py-0.5 text-xs font-bold text-white">
                              {unreadNotificationCount} unread
                            </span>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-ink/65 mt-1">
                          Stay updated on real-time order tracking, quote responses, and handcrafted updates.
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => fetchCustomerNotifications()}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-xs font-bold text-ink/70 hover:bg-paper transition"
                          title="Refresh Notifications"
                        >
                          <RefreshCw className={`h-3.5 w-3.5 ${isLoadingNotifications ? "animate-spin text-forest" : ""}`} />
                          <span>Refresh</span>
                        </button>
                        <Link
                          href="/buyer/notifications"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-forest/20 bg-white px-4 py-2 text-xs font-bold text-forest hover:bg-forest hover:text-white transition"
                        >
                          <span>Full Screen →</span>
                        </Link>
                      </div>
                    </div>

                    {isLoadingNotifications ? (
                      <div className="rounded-3xl border border-line bg-white p-12 text-center">
                        <RefreshCw className="h-8 w-8 text-forest animate-spin mx-auto mb-3" />
                        <p className="font-bold text-ink text-sm">Loading notifications from server...</p>
                        <p className="text-xs text-ink/60 mt-1">ShilpSetu सूचनाएं लोड हो रही हैं...</p>
                      </div>
                    ) : notificationsError ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
                        <AlertCircle className="h-8 w-8 text-amber-700 mx-auto mb-2" />
                        <p className="font-bold text-amber-900 text-sm">{notificationsError}</p>
                        <button
                          onClick={() => fetchCustomerNotifications()}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-forest px-5 py-2 text-xs font-bold text-white hover:bg-forest-dark transition"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Retry / पुनः प्रयास करें</span>
                        </button>
                      </div>
                    ) : dashboardNotifications.length === 0 ? (
                      <div className="rounded-3xl border border-line bg-white p-12 text-center">
                        <Bell className="h-12 w-12 text-ink/30 mx-auto mb-3" />
                        <h4 className="font-serif-title text-lg font-bold text-ink">No notifications / कोई सूचना नहीं</h4>
                        <p className="text-xs text-ink/60 mt-1">
                          You will receive updates when artisans accept quotes or order statuses change.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dashboardNotifications.map((notif) => (
                          <div
                            key={notif.id}
                            className={`rounded-2xl border p-4 sm:p-5 transition flex items-start justify-between gap-4 ${
                              notif.is_read
                                ? "border-line bg-white/70 opacity-80"
                                : "border-terracotta/30 bg-white shadow-xs"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-1.5 h-2.5 w-2.5 rounded-full shrink-0 ${
                                  notif.is_read ? "bg-ink/20" : "bg-terracotta animate-pulse"
                                }`}
                              />
                              <div>
                                <h4 className="font-bold text-sm text-ink">{notif.title}</h4>
                                <p className="text-xs text-ink/70 mt-1 whitespace-pre-line leading-relaxed">
                                  {notif.message}
                                </p>
                                <span className="text-[11px] text-ink/50 mt-2 block">
                                  {notif.created_at
                                    ? new Date(notif.created_at).toLocaleString("en-IN", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                      })
                                    : "—"}
                                </span>
                              </div>
                            </div>

                            {!notif.is_read && (
                              <button
                                onClick={() => handleMarkNotificationRead(notif.id)}
                                className="shrink-0 rounded-xl border border-forest/20 bg-forest/5 px-3 py-1.5 text-xs font-bold text-forest hover:bg-forest hover:text-white transition"
                              >
                                Mark Read / पढ़ा हुआ
                              </button>
                            )}
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
                                <ProductImage
                                  src={product.image}
                                  fallbackSrc={product.fallbackImage}
                                  category={product.category}
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
                            {activeCustomerProfile.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-serif-title text-lg font-bold text-ink">{activeCustomerProfile.name}</h3>
                            <span className="rounded-full bg-terracotta/10 px-2.5 py-0.5 text-[10px] font-bold text-terracotta">
                              {activeCustomerProfile.tier}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div>
                            <label className="font-bold text-ink/60 uppercase text-[10px] tracking-wider block">Full Name</label>
                            <p className="font-semibold text-ink mt-0.5">{activeCustomerProfile.name}</p>
                          </div>
                          <div>
                            <label className="font-bold text-ink/60 uppercase text-[10px] tracking-wider block">Email Address</label>
                            <p className="font-semibold text-ink mt-0.5">{activeCustomerProfile.email}</p>
                          </div>
                          <div>
                            <label className="font-bold text-ink/60 uppercase text-[10px] tracking-wider block">Phone Number</label>
                            <p className="font-semibold text-ink mt-0.5">{activeCustomerProfile.phone}</p>
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
                          <p className="font-bold text-ink">{activeCustomerProfile.name}</p>
                          <p>402, Lotus Residency, 12th Main Road</p>
                          <p>Indiranagar, Bengaluru, Karnataka</p>
                          <p className="font-semibold">PIN: 560038</p>
                          <p className="text-ink/60 pt-1">Phone: {activeCustomerProfile.phone}</p>
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
        )
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
              <h2 className="font-serif-title text-2xl font-bold text-ink">
                {authMode === "login" ? "Customer Login / ग्राहक लॉगिन" : "Customer Registration / ग्राहक पंजीकरण"}
              </h2>
              <p className="text-xs text-ink/65 mt-1">
                {authMode === "login"
                  ? "Access your verified customer dashboard and order history"
                  : "Join ShilpSetu to connect directly with authentic Indian artisans"}
              </p>
            </div>

            {/* Customer Role Pill Indicator */}
            <div className="flex items-center justify-center mb-4">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3.5 py-1 text-xs font-bold text-forest border border-forest/20">
                <ShieldCheck className="h-3.5 w-3.5 text-terracotta" />
                Customer / ग्राहक Portal
              </span>
            </div>

            {/* Error banner */}
            {(authFormError || authError) && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {authFormError || authError}
              </div>
            )}

            {/* Login / Register Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setAuthFormError(null);
                clearAuthError();
                setIsSubmittingAuth(true);
                try {
                  if (authMode === "login") {
                    await authLogin({
                      email: authEmail.trim(),
                      password: authPassword,
                    });
                  } else {
                    await authRegister({
                      name: authName.trim(),
                      email: authEmail.trim(),
                      password: authPassword,
                      role: "buyer", // Preserves backend enum compatibility
                      phone: authPhone.trim() || undefined,
                    });
                  }
                  setIsLoginOpen(false);
                } catch (err: any) {
                  const msg =
                    err instanceof ApiError
                      ? err.message
                      : "Authentication failed. Please check your credentials and try again.";
                  setAuthFormError(msg);
                } finally {
                  setIsSubmittingAuth(false);
                }
              }}
              className="space-y-3.5"
            >
              {/* Full Name for Registration */}
              {authMode === "register" && (
                <div>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40" />
                    <input
                      type="text"
                      required
                      placeholder="Full Name / पूरा नाम"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-xs sm:text-sm text-ink outline-none focus:border-forest"
                    />
                  </div>
                </div>
              )}

              {/* Email Address */}
              <div>
                <div className="relative">
                  <Globe className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40" />
                  <input
                    type="email"
                    required
                    placeholder="Email Address / ईमेल"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-xs sm:text-sm text-ink outline-none focus:border-forest"
                  />
                </div>
              </div>

              {/* Phone for Registration */}
              {authMode === "register" && (
                <div>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40" />
                    <input
                      type="tel"
                      placeholder="Phone Number / फ़ोन नंबर"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full rounded-2xl border border-line bg-white py-3 pl-10 pr-4 text-xs sm:text-sm text-ink outline-none focus:border-forest"
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-ink/40" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Password / पासवर्ड (min 6 chars)"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
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
                {authMode === "login" && (
                  <a href="#forgot" className="text-forest hover:underline">Forgot password?</a>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmittingAuth || isAuthLoading}
                className="w-full rounded-2xl bg-forest py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-forest-dark disabled:opacity-50"
              >
                {isSubmittingAuth
                  ? "Processing..."
                  : authMode === "login"
                  ? "Login as Customer / लॉगिन"
                  : "Create Customer Account / खाता बनाएं"}
              </button>
            </form>

            <div className="mt-5 text-center text-xs font-semibold text-ink/70">
              {authMode === "login" ? (
                <>
                  Don&apos;t have a customer account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("register");
                      setAuthFormError(null);
                    }}
                    className="text-terracotta font-bold hover:underline"
                  >
                    Sign Up / नया खाता बनाएं
                  </button>
                </>
              ) : (
                <>
                  Already registered?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthFormError(null);
                    }}
                    className="text-terracotta font-bold hover:underline"
                  >
                    Log In / लॉगिन करें
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================= ORDER DETAILS & TRACKING MODAL ================= */}
      {selectedDashboardOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl rounded-3xl bg-ivory p-6 sm:p-8 shadow-2xl border border-line max-h-[90vh] overflow-y-auto animate-scale-up space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-ink">
                    Order #{selectedDashboardOrder.id.slice(0, 8)}
                  </span>
                  {(() => {
                    const meta = getOrderStatusMeta(selectedDashboardOrder.status);
                    return (
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${meta.color}`}>
                        {meta.labelEn} / {meta.labelHi}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-ink/60 mt-1">
                  Placed on{" "}
                  {selectedDashboardOrder.created_at
                    ? new Date(selectedDashboardOrder.created_at).toLocaleString("en-IN", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })
                    : "—"}
                </p>
              </div>

              <button
                onClick={() => setSelectedDashboardOrder(null)}
                className="rounded-full p-2 text-ink/50 hover:bg-paper hover:text-ink transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ORDER TRACKING TIMELINE */}
            <div className="rounded-2xl border border-line bg-white p-5 space-y-4">
              <h4 className="font-serif-title text-base font-bold text-ink flex items-center gap-2">
                <Clock className="h-4 w-4 text-forest" />
                <span>Order Tracking Timeline / ट्रैकिंग टाइमलाइन</span>
              </h4>

              {selectedDashboardOrder.status === "cancelled" ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-bold text-sm">Order Cancelled / ऑर्डर रद्द किया गया</p>
                    <p className="text-rose-700/80 mt-0.5">
                      This order has been cancelled. If payment or advance was collected, your refund will be processed in 3-5 business days.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="relative pt-2">
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {ORDER_LIFECYCLE_STAGES.map((stage, idx) => {
                      const currentMeta = getOrderStatusMeta(selectedDashboardOrder.status);
                      const currentStep = currentMeta.stepIndex;
                      const isDone = currentStep >= idx;
                      const isCurrent = currentStep === idx;

                      return (
                        <div key={stage.status} className="flex flex-col items-center relative">
                          {/* Connecting Bar */}
                          {idx > 0 && (
                            <div
                              className={`absolute top-4 -left-1/2 w-full h-1 -z-0 transition-all ${
                                currentStep >= idx ? "bg-forest" : "bg-line"
                              }`}
                            />
                          )}

                          <div
                            className={`relative z-10 grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-all shadow-xs ${
                              isCurrent
                                ? "bg-forest text-white ring-4 ring-forest/20"
                                : isDone
                                ? "bg-forest text-white"
                                : "bg-paper text-ink/40 border border-line"
                            }`}
                          >
                            {isDone ? <Check className="h-4 w-4" /> : idx + 1}
                          </div>

                          <div className="mt-2 text-center">
                            <p
                              className={`text-[11px] font-bold ${
                                isCurrent ? "text-forest" : isDone ? "text-ink" : "text-ink/40"
                              }`}
                            >
                              {stage.labelEn}
                            </p>
                            <p className="text-[9px] text-ink/50 leading-none mt-0.5">{stage.labelHi}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ORDER ITEMS & BREAKDOWN */}
            <div className="rounded-2xl border border-line bg-white p-5 space-y-4">
              <h4 className="font-serif-title text-base font-bold text-ink flex items-center gap-2">
                <Package className="h-4 w-4 text-forest" />
                <span>Order Summary & Items / सामग्री विवरण</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-line pb-4 text-xs">
                <div>
                  <span className="text-ink/60">Total Quantity:</span>
                  <p className="font-bold text-ink mt-0.5">{selectedDashboardOrder.quantity} units</p>
                </div>
                <div>
                  <span className="text-ink/60">Unit Price:</span>
                  <p className="font-bold text-ink mt-0.5">
                    {selectedDashboardOrder.unit_price
                      ? `₹${Number(selectedDashboardOrder.unit_price).toLocaleString("en-IN")}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <span className="text-ink/60">Total Amount:</span>
                  <p className="font-serif-title text-base font-bold text-forest mt-0.5">
                    ₹{(Number(selectedDashboardOrder.total_price) || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {isLoadingOrderItems ? (
                <div className="flex items-center justify-center py-4 gap-2 text-xs text-ink/60">
                  <RefreshCw className="h-4 w-4 animate-spin text-forest" />
                  <span>Loading itemized details...</span>
                </div>
              ) : selectedOrderItems.length > 0 ? (
                <div className="divide-y divide-line/60">
                  {selectedOrderItems.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-ink font-mono">Product #{item.product_id?.slice(0, 8) || "N/A"}</p>
                        <p className="text-[11px] text-ink/60 mt-0.5">Quantity: {item.quantity} units</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-ink">₹{(Number(item.total_price) || 0).toLocaleString("en-IN")}</p>
                        <p className="text-[10px] text-ink/60">@ ₹{Number(item.unit_price).toLocaleString("en-IN")} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-ink/60 italic py-2">
                  Direct artisan cluster fulfillment order #{selectedDashboardOrder.id.slice(0, 8)}.
                </p>
              )}
            </div>

            {/* Footer Action */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedDashboardOrder(null)}
                className="rounded-full border border-line bg-white px-5 py-2 text-xs font-bold text-ink hover:bg-paper transition"
              >
                Close / बंद करें
              </button>
              <Link
                href="/buyer/orders"
                className="rounded-full bg-forest px-5 py-2 text-xs font-bold text-white hover:bg-forest-dark transition"
              >
                View in Full Orders Screen →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= CART QUOTE INQUIRY MODAL (Replaces fake checkout) ================= */}
      {isCartQuoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-ivory p-6 sm:p-8 shadow-2xl border border-line animate-scale-up space-y-6">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-forest/10 flex items-center justify-center text-forest">
                  <Sparkles className="h-5 w-5 text-terracotta" />
                </div>
                <div>
                  <h3 className="font-serif-title text-xl font-bold text-ink">
                    Craft Quote & Matching / कोटेशन अनुरोध
                  </h3>
                  <p className="text-xs text-ink/60">
                    Direct Artisan Cluster Fulfillment
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartQuoteModalOpen(false)}
                className="rounded-full p-2 text-ink/50 hover:bg-paper hover:text-ink transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-2xl border border-forest/15 bg-white p-5 space-y-3">
              <p className="text-xs sm:text-sm text-ink/80 leading-relaxed">
                ShilpSetu handles authentic craft orders through Seller quotes and capacity matching. Your selected products will be used to prepare a bulk/custom requirement.
              </p>
              <p className="text-xs text-ink/65 leading-relaxed border-t border-line/60 pt-2 font-medium">
                ShilpSetu प्रामाणिक शिल्प ऑर्डर के लिए विक्रेता कोटेशन और क्षमता मिलान का उपयोग करता है। आपके चुने हुए उत्पादों के आधार पर थोक/कस्टम आवश्यकता तैयार की जाएगी।
              </p>
            </div>

            {cart.length > 0 && (
              <div className="rounded-2xl border border-line bg-paper/50 p-4 max-h-40 overflow-y-auto space-y-2 text-xs">
                <p className="font-bold text-ink/70 uppercase tracking-wider text-[10px]">
                  Selected Cart Items ({cart.reduce((a, b) => a + b.quantity, 0)} units):
                </p>
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between items-center py-1 border-b border-line/40 last:border-0">
                    <span className="font-semibold text-ink truncate max-w-[240px]">
                      {item.product.name}
                    </span>
                    <span className="text-ink/60 shrink-0">
                      {item.quantity} × {item.product.formattedPrice}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsCartQuoteModalOpen(false)}
                className="w-full sm:w-auto rounded-full border border-line bg-white px-5 py-2.5 text-xs font-bold text-ink hover:bg-paper transition"
              >
                Keep Shopping / जारी रखें
              </button>
              <Link
                href={`/buyer/custom-request?category=${encodeURIComponent(
                  cart[0]?.product?.category || "Handicrafts"
                )}&product_name=${encodeURIComponent(
                  cart[0]?.product?.name || ""
                )}&cart_items=${encodeURIComponent(
                  cart.map((c) => `${c.product.name} (${c.quantity})`).join(", ")
                )}`}
                onClick={() => setIsCartQuoteModalOpen(false)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-forest-dark transition"
              >
                <span>Proceed to Custom Requirement →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= D2C DIRECT ORDER CONFIRMATION MODAL ================= */}
      {confirmedDirectOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-ivory p-6 sm:p-8 shadow-2xl border border-line animate-scale-up space-y-6">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-serif-title text-xl sm:text-2xl font-bold text-ink">
                    Order Placed Successfully!
                  </h3>
                  <p className="text-xs text-forest font-semibold">
                    ऑर्डर सफलतापूर्वक दर्ज हुआ &bull; Direct D2C Purchase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setConfirmedDirectOrder(null)}
                className="rounded-full p-2 text-ink/50 hover:bg-paper hover:text-ink transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Order Details Card */}
            <div className="rounded-2xl border border-forest/15 bg-white p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-xs pb-3 border-b border-line/60">
                <div>
                  <p className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">Order ID / क्रमांक</p>
                  <p className="font-mono font-bold text-ink text-xs mt-0.5">#{confirmedDirectOrder.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">Status / स्थिति</p>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200 mt-0.5">
                    <Clock className="h-3 w-3" /> {confirmedDirectOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">Total Amount / कुल राशि</p>
                  <p className="font-bold text-forest text-base mt-0.5">
                    ₹ {confirmedDirectOrder.total_price.toLocaleString("en-IN")} {confirmedDirectOrder.currency || "INR"}
                  </p>
                </div>
                <div>
                  <p className="text-ink/60 uppercase tracking-wider text-[10px] font-bold">Items / कुल उत्पाद</p>
                  <p className="font-bold text-ink text-sm mt-0.5">
                    {confirmedDirectOrder.items?.length || confirmedDirectOrder.quantity} item(s)
                  </p>
                </div>
              </div>

              {/* Items summary */}
              {confirmedDirectOrder.items && confirmedDirectOrder.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink/70">Allocated Line Items:</p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {confirmedDirectOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-xs py-1 px-2.5 rounded-xl bg-paper/60 border border-line/40">
                        <span className="text-ink font-semibold truncate max-w-[200px]">
                          {item.product_title || `Product #${item.product_id?.slice(0, 8)}`}
                        </span>
                        <span className="font-mono text-ink/70">
                          Qty: {item.quantity} &bull; ₹ {(item.total_price || 0).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl bg-forest/5 p-3 text-[11px] text-ink/80 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-forest shrink-0 mt-0.5" />
                <p>
                  Inventory has been reserved in PostgreSQL. The master artisan has been notified to hand-pack your genuine craft pieces.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setConfirmedDirectOrder(null);
                  setActiveView("shop");
                }}
                className="w-full sm:w-auto rounded-full border border-line bg-white px-5 py-2.5 text-xs font-bold text-ink hover:bg-paper transition"
              >
                Continue Shopping / खरीदारी जारी रखें
              </button>
              <Link
                href="/buyer/orders"
                onClick={() => setConfirmedDirectOrder(null)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-forest px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-forest-dark transition"
              >
                <span>View in My Orders / मेरे ऑर्डर देखें →</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOMER CARE INFORMATIONAL MODAL ================= */}
      {customerCareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-ivory p-6 sm:p-8 shadow-2xl border border-line animate-scale-up space-y-6">
            <div className="flex items-start justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-serif-title text-xl font-bold text-ink">
                  {customerCareModal === "faq" && "Frequently Asked Questions / अक्सर पूछे जाने वाले प्रश्न"}
                  {customerCareModal === "shipping" && "Shipping & Delivery Policy / शिपिंग नीति"}
                  {customerCareModal === "returns" && "Returns & Replacement Policy / वापसी नीति"}
                  {customerCareModal === "contact" && "Contact Customer Care / संपर्क करें"}
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">ShilpSetu Customer Support & Fair Trade Policy</p>
              </div>
              <button
                onClick={() => setCustomerCareModal(null)}
                className="rounded-full p-2 text-ink/50 hover:bg-paper hover:text-ink transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-ink/80 max-h-[60vh] overflow-y-auto pr-1">
              {customerCareModal === "faq" && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-white border border-line">
                    <h5 className="font-bold text-ink">How does ShilpSetu connect customers with craftspeople?</h5>
                    <p className="mt-1 text-ink/70">ShilpSetu connects customers directly to rural artisan clusters without intermediaries. Every purchase and quote supports verified craftspeople directly.</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-line">
                    <h5 className="font-bold text-ink">How do custom and bulk quotes work?</h5>
                    <p className="mt-1 text-ink/70">Submit your requirement via the Custom Requirement engine. Our AI distributes the required volume across qualified workshop clusters and returns transparent allocations.</p>
                  </div>
                </div>
              )}

              {customerCareModal === "shipping" && (
                <div className="space-y-3">
                  <p className="leading-relaxed">All authentic handicrafts are packaged at the artisan workshop clusters across India. Standard orders are dispatched within 3-7 business days depending on handcrafting cycles.</p>
                  <p className="leading-relaxed font-semibold text-forest">Real-time production stages (Pending → Confirmed → In Production → Delivered) can be tracked directly inside your Customer Orders dashboard.</p>
                </div>
              )}

              {customerCareModal === "returns" && (
                <div className="space-y-3">
                  <p className="leading-relaxed">Because authentic handicrafts are made individually by master artisans, slight natural variations in color, texture, and wood grain are celebrated proof of authentic handmade creation.</p>
                  <p className="leading-relaxed font-semibold text-terracotta">If an item arrives damaged in transit, report it within 48 hours for an immediate artisan replacement or refund.</p>
                </div>
              )}

              {customerCareModal === "contact" && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-white border border-line space-y-2">
                    <p><span className="font-bold text-ink">Customer Support Email:</span> <a href="mailto:support@shilpsetu.in" className="text-forest font-bold underline">support@shilpsetu.in</a></p>
                    <p><span className="font-bold text-ink">Artisan Facilitation Desk:</span> +91 (800) 123-SHILP</p>
                    <p><span className="font-bold text-ink">Operating Hours:</span> Monday – Saturday, 9:00 AM – 6:00 PM IST</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setCustomerCareModal(null)}
                className="rounded-full bg-forest px-6 py-2 text-xs font-bold text-white hover:bg-forest-dark transition"
              >
                Close / बंद करें
              </button>
            </div>
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
                    <ProductImage
                      src={product.image}
                      fallbackSrc={product.fallbackImage}
                      category={product.category}
                      alt={product.name}
                      className="h-24 w-24 rounded-2xl object-cover sm:h-28 sm:w-28"
                    />
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
              <aside className="sticky top-24 rounded-3xl border border-forest/15 bg-[#f7f0e3] p-6 shadow-lg shadow-forest/5 space-y-5">
                <div>
                  <h2 className="font-serif-title text-2xl font-bold text-ink">Order summary</h2>
                  <p className="text-xs text-ink/60 mt-0.5">Direct checkout & cluster quotes</p>
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2.5 text-sm pt-2">
                  <div className="flex justify-between text-ink/70">
                    <span>Subtotal ({totalCartItemCount} items)</span>
                    <span className="font-bold text-ink">₹ {cartSubtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-ink/70">
                    <span>Estimated Shipping</span>
                    <span className="font-bold text-ink">₹ {shippingFee}</span>
                  </div>
                  <div className="flex justify-between border-t border-forest/15 pt-3 text-lg font-bold text-ink">
                    <span>Est. Total</span>
                    <span className="text-forest">₹ {cartTotal.toLocaleString("en-IN")}</span>
                  </div>
                  <p className="text-[10px] text-ink/50 italic">
                    * Final order total is verified authoritatively by backend based on live catalog prices.
                  </p>
                </div>

                {/* Shipping & Notes Inputs */}
                <div className="space-y-3 pt-3 border-t border-forest/15">
                  <div>
                    <label className="block text-xs font-bold text-ink/80 mb-1">
                      Delivery Address / डिलीवरी का पता
                    </label>
                    <textarea
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="e.g. 102 Craft Enclave, Civil Lines, Jaipur, RJ 302006"
                      rows={2}
                      className="w-full rounded-2xl border border-line bg-white p-3 text-xs text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink/80 mb-1">
                      Delivery Instructions / विशेष निर्देश (Optional)
                    </label>
                    <input
                      type="text"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="e.g. Fragile terracotta, handle with care"
                      className="w-full rounded-2xl border border-line bg-white px-3 py-2 text-xs text-ink placeholder:text-ink/40 focus:border-forest focus:outline-none focus:ring-1 focus:ring-forest"
                    />
                  </div>
                </div>

                {/* Unauthenticated notice */}
                {!isAuthenticated && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900 flex items-start gap-2">
                    <User className="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold">Customer Login Required / ग्राहक लॉगिन आवश्यक</p>
                      <p className="text-[11px] text-amber-800/85 mt-0.5">
                        Please sign in as a Customer to place orders with real-time stock allocation.
                      </p>
                      <button
                        onClick={() => setIsLoginOpen(true)}
                        className="mt-1.5 inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-forest text-[11px]"
                      >
                        Sign in now →
                      </button>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {directOrderError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700 flex items-start gap-2 animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800">Unable to Complete Order</p>
                      <p className="text-red-700 mt-0.5 leading-relaxed">{directOrderError}</p>
                    </div>
                    <button
                      onClick={() => setDirectOrderError(null)}
                      className="text-red-400 hover:text-red-700 p-0.5"
                      aria-label="Dismiss error"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                {/* ACTION 1: D2C Direct Checkout */}
                <div className="space-y-1.5 pt-1">
                  <button
                    onClick={handlePlaceDirectOrder}
                    disabled={isPlacingDirectOrder || cart.length === 0}
                    className="w-full rounded-2xl bg-forest py-3.5 px-4 text-sm font-bold text-white shadow-lg shadow-forest/20 transition hover:bg-forest-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isPlacingDirectOrder ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin text-white" />
                        <span>Placing D2C Order / सबमिट हो रहा है...</span>
                      </>
                    ) : (
                      <>
                        <Package className="h-4 w-4 text-terracotta" />
                        <span>Place Direct Order / सीधा ऑर्डर दें (D2C)</span>
                      </>
                    )}
                  </button>
                  <p className="text-center text-[10.5px] text-ink/60">
                    Instant purchase from verified artisan stock &bull; Real-time inventory deduction
                  </p>
                </div>

                {/* DIVIDER */}
                <div className="relative my-2 flex items-center justify-center">
                  <div className="border-t border-forest/15 w-full" />
                  <span className="bg-[#f7f0e3] px-3 text-[10px] font-bold uppercase tracking-wider text-ink/50">
                    OR / या
                  </span>
                </div>

                {/* ACTION 2: B2B Cluster Quote Inquiry */}
                <div className="space-y-1.5">
                  <button
                    onClick={handleCheckout}
                    className="w-full rounded-2xl border border-forest/25 bg-white py-3 px-4 text-xs font-bold text-forest hover:bg-paper transition flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-terracotta" />
                    <span>Proceed to Quote / थोक कोटेशन अनुरोध (B2B)</span>
                  </button>
                  <p className="text-center text-[10px] text-ink/50">
                    For bulk quantities, custom motifs, or multi-artisan cluster allocations
                  </p>
                </div>
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
              <li><button onClick={() => setCustomerCareModal("faq")} className="hover:text-white transition">FAQs</button></li>
              <li><button onClick={() => setCustomerCareModal("shipping")} className="hover:text-white transition">Shipping</button></li>
              <li><button onClick={() => setCustomerCareModal("returns")} className="hover:text-white transition">Returns</button></li>
              <li><button onClick={() => setCustomerCareModal("contact")} className="hover:text-white transition">Contact Us</button></li>
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
