export interface Review {
  id: string;
  author: string;
  avatar?: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
}

export interface Product {
  id: string;
  name: string;
  artisan: string;
  artisanLocation: string;
  category: string;
  price: number;
  formattedPrice: string;
  rating: number;
  reviewsCount: number;
  availability: string;
  description: string;
  detailedDescription?: string;
  craftProcess?: string[];
  careInstructions?: string;
  artisanBio?: {
    bio: string;
    experienceYears: number;
    womenEmpowered: number;
    quote: string;
  };
  reviewsList?: Review[];
  image: string;
  fallbackImage?: string;
  gallery: string[];
  badges: string[];
  specs: {
    material: string;
    dimensions: string;
    weight: string;
    category: string;
    technique?: string;
    origin?: string;
  };
}

export interface Artisan {
  id: string;
  name: string;
  craft: string;
  location: string;
  description: string;
  image: string;
  bannerImage: string;
  followersCount: number;
  impactBadges: string[];
  productsCount: number;
}

export interface Order {
  id: string;
  productName: string;
  productImage: string;
  artisan: string;
  date: string;
  status: "Delivered" | "Shipped" | "Processing";
  amount: number;
  formattedAmount: string;
}

export const categories = [
  { name: "Home Décor", count: "128 makers", image: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=700&q=85" },
  { name: "Textiles", count: "94 makers", image: "https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?auto=format&fit=crop&w=700&q=85" },
  { name: "Jewellery", count: "76 makers", image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=700&q=85" },
  { name: "Handicrafts", count: "112 makers", image: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=700&q=85" },
  { name: "Paintings", count: "61 makers", image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=700&q=85" },
];

export const products: Product[] = [
  {
    id: "p1",
    name: "Terracotta Vase",
    artisan: "Savitri Devi",
    artisanLocation: "Kutch, Gujarat",
    category: "Home Décor",
    price: 850,
    formattedPrice: "₹ 850",
    rating: 4.8,
    reviewsCount: 24,
    availability: "Ready to ship",
    description: "Beautifully handcrafted terracotta vase with traditional patterns. Perfect for home décor and gifting.",
    image: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1493106641515-6b5631de4bb9?auto=format&fit=crop&w=900&q=85",
    ],
    badges: ["Handmade", "Eco-friendly", "Durable"],
    specs: {
      material: "Terracotta",
      dimensions: "20 cm (H) x 12 cm (W)",
      weight: "500 g",
      category: "Home Décor",
    },
  },
  {
    id: "p2",
    name: "Handwoven Scarf",
    artisan: "Ravi & Loom",
    artisanLocation: "Kutch, Gujarat",
    category: "Textiles",
    price: 1250,
    formattedPrice: "₹ 1,250",
    rating: 4.9,
    reviewsCount: 18,
    availability: "Made to order",
    description: "Luxurious handwoven organic cotton scarf colored with natural indigo dyes.",
    image: "https://images.unsplash.com/photo-1583845112203-454c59f2f3ba?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1583845112203-454c59f2f3ba?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1606760227091-3dd850d97f1d?auto=format&fit=crop&w=900&q=85",
    ],
    badges: ["Organic Cotton", "Natural Dyes", "Handloom"],
    specs: {
      material: "Organic Cotton",
      dimensions: "180 cm (L) x 55 cm (W)",
      weight: "220 g",
      category: "Textiles",
    },
  },
  {
    id: "p3",
    name: "Silver Jhumkas",
    artisan: "Nila Studio",
    artisanLocation: "Jaipur, Rajasthan",
    category: "Jewellery",
    price: 1600,
    formattedPrice: "₹ 1,600",
    rating: 4.9,
    reviewsCount: 22,
    availability: "Only 4 left",
    description: "Intricately designed sterling silver jhumkas inspired by heritage Rajasthani craftsmanship.",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=85",
    ],
    badges: ["925 Silver", "Handcrafted", "Heritage Design"],
    specs: {
      material: "925 Sterling Silver",
      dimensions: "5 cm (H) x 2.5 cm (W)",
      weight: "35 g",
      category: "Jewellery",
    },
  },
  {
    id: "p4",
    name: "Wooden Elephant",
    artisan: "Meera Craft House",
    artisanLocation: "Saharanpur, UP",
    category: "Handicrafts",
    price: 950,
    formattedPrice: "₹ 950",
    rating: 4.7,
    reviewsCount: 20,
    availability: "Ready to ship",
    description: "Hand-carved rosewood elephant figurine with royal intricate jali work.",
    image: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85",
    ],
    badges: ["Solid Rosewood", "Jali Carving", "Eco Polish"],
    specs: {
      material: "Rosewood",
      dimensions: "15 cm (H) x 18 cm (L)",
      weight: "650 g",
      category: "Handicrafts",
    },
  },
  {
    id: "p5",
    name: "Madhubani Painting",
    artisan: "Folk Art Collective",
    artisanLocation: "Madhubani, Bihar",
    category: "Paintings",
    price: 1800,
    formattedPrice: "₹ 1,800",
    rating: 4.8,
    reviewsCount: 16,
    availability: "1 of a kind",
    description: "Authentic handmade Madhubani folk painting created with natural twig brushes and pigment.",
    image: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=900&q=85",
    ],
    badges: ["Folk Art", "Hand Painted", "Natural Dyes"],
    specs: {
      material: "Handmade Paper & Natural Pigment",
      dimensions: "30 cm x 40 cm",
      weight: "150 g",
      category: "Paintings",
    },
  },
  {
    id: "p6",
    name: "Embroidered Cushion",
    artisan: "Asha Weaves",
    artisanLocation: "Barmer, Rajasthan",
    category: "Textiles",
    price: 1200,
    formattedPrice: "₹ 1,200",
    rating: 4.6,
    reviewsCount: 34,
    availability: "Ready to ship",
    description: "Vibrant embroidered cotton cushion cover featuring authentic mirror work and tassels.",
    detailedDescription: "This vibrant cushion cover is a celebration of Barmer's legendary mirror-work embroidery. Crafted over 14 days using pure unbleached organic cotton, every intricate stitch is done by hand with silk threads and genuine glass mirrors. The geometric motifs reflect ancient desert folklore and protection symbols.",
    craftProcess: [
      "1. Sourcing 100% organic unbleached cotton base fabric",
      "2. Hand-sketching traditional Rajasthani geometric motifs",
      "3. Hand-embroidery with silk threads and glass mirrors",
      "4. Stitching corner tassels and concealed zipper closure"
    ],
    careInstructions: "Dry clean recommended for first wash. Gentle hand wash in cold water with mild liquid detergent afterwards. Do not wring or soak.",
    artisanBio: {
      bio: "Asha Devi carries forward a 3-generation lineage of Barmer textile artisans. She leads a self-help collective of 14 rural women embroiderers, preserving desert craft traditions while securing financial independence.",
      experienceYears: 18,
      womenEmpowered: 14,
      quote: "Every mirror on this fabric reflects our desert sun and the resilient spirit of our women artisans."
    },
    reviewsList: [
      {
        id: "r1",
        author: "Priya Sharma",
        rating: 5,
        date: "24 Aug 2026",
        title: "Stunning craft and mirror detail!",
        comment: "The mirror work is so intricate and the cotton quality is exceptional. It transformed my living room couch into a vibrant Rajasthani aesthetic!",
        verified: true
      },
      {
        id: "r2",
        author: "Rahul Verma",
        rating: 4,
        date: "15 Aug 2026",
        title: "Authentic and beautiful",
        comment: "Great quality handmade product. You can feel the human touch in every stitch. Delivered very fast in eco-friendly packaging.",
        verified: true
      }
    ],
    image: "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=900&q=85",
      "https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?auto=format&fit=crop&w=900&q=85"
    ],
    badges: ["Mirror Work", "100% Cotton", "Hand Embroidered"],
    specs: {
      material: "Cotton & Mirrors",
      dimensions: "45 cm x 45 cm",
      weight: "300 g",
      category: "Textiles",
      technique: "Barmer Mirror Embroidery",
      origin: "Barmer, Rajasthan"
    },
  },
  {
    id: "p7",
    name: "Clay Bowl Set",
    artisan: "Savitri Devi",
    artisanLocation: "Kutch, Gujarat",
    category: "Home Décor",
    price: 1200,
    formattedPrice: "₹ 1,200",
    rating: 4.8,
    reviewsCount: 15,
    availability: "Ready to ship",
    description: "Set of 4 handcrafted terracotta clay serving bowls with natural heat retention.",
    image: "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=900&q=85",
    ],
    badges: ["Handmade", "Organic Clay", "Set of 4"],
    specs: {
      material: "Natural Clay",
      dimensions: "14 cm (Dia) x 7 cm (H)",
      weight: "900 g",
      category: "Home Décor",
    },
  },
  {
    id: "p8",
    name: "Decorative Lamp",
    artisan: "Savitri Devi",
    artisanLocation: "Kutch, Gujarat",
    category: "Home Décor",
    price: 1500,
    formattedPrice: "₹ 1,500",
    rating: 4.9,
    reviewsCount: 30,
    availability: "Ready to ship",
    description: "Terracotta decorative lamp with carved perforations that cast warm geometric shadows.",
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    gallery: [
      "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=85",
    ],
    badges: ["Hand Carved", "Ambient Lighting", "Terracotta"],
    specs: {
      material: "Terracotta & Brass Fitting",
      dimensions: "25 cm (H) x 18 cm (W)",
      weight: "1.2 kg",
      category: "Home Décor",
    },
  },
];

export const artisans: Artisan[] = [
  {
    id: "a1",
    name: "Savitri Devi",
    craft: "Pottery Artisan",
    location: "Kutch, Gujarat",
    description: "Savitri Devi has been creating traditional pottery for over 15 years. Her work reflects the rich culture and heritage of Gujarat. She believes in keeping traditional techniques alive while embracing new ideas.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=85",
    bannerImage: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1600&q=85",
    followersCount: 1240,
    impactBadges: ["Handmade Products", "Supports Rural Women", "Traditional Techniques"],
    productsCount: 14,
  },
  {
    id: "a2",
    name: "Anita Rathore",
    craft: "Blue Pottery Artisan",
    location: "Jaipur, Rajasthan",
    description: "Keeping Jaipur's quiet blue-and-white pottery tradition alive, one hand-shaped piece at a time.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=85",
    bannerImage: "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=1600&q=85",
    followersCount: 890,
    impactBadges: ["Zero Quartz Waste", "Heritage Craft", "Women Led"],
    productsCount: 9,
  },
  {
    id: "a3",
    name: "Ravi & Loom",
    craft: "Textile Weaver",
    location: "Kutch, Gujarat",
    description: "A family loom creating sun-washed textiles with patient hands and local natural dyes.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=85",
    bannerImage: "https://images.unsplash.com/photo-1598301257982-0cf014dabbcd?auto=format&fit=crop&w=1600&q=85",
    followersCount: 1560,
    impactBadges: ["Solar Loom Powered", "Natural Dyes", "Organic Handloom"],
    productsCount: 18,
  },
];

export const userProfile = {
  name: "Ishwari",
  email: "ishwari@shilpsetu.com",
  phone: "+91 98765 43210",
  totalOrders: 3,
  wishlistCount: 5,
  totalSpent: 4250,
  artisansSupportedCount: 2,
};

export const initialOrders: Order[] = [
  {
    id: "ORD-94821",
    productName: "Terracotta Vase",
    productImage: "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=300&q=85",
    artisan: "Savitri Devi",
    date: "02 Sept 2026",
    status: "Delivered",
    amount: 850,
    formattedAmount: "₹ 850",
  },
  {
    id: "ORD-88312",
    productName: "Handwoven Scarf",
    productImage: "https://images.unsplash.com/photo-1583845112203-454c59f2f3ba?auto=format&fit=crop&w=300&q=85",
    artisan: "Ravi & Loom",
    date: "28 Aug 2026",
    status: "Shipped",
    amount: 1250,
    formattedAmount: "₹ 1,250",
  },
  {
    id: "ORD-76120",
    productName: "Silver Jhumkas",
    productImage: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=300&q=85",
    artisan: "Nila Studio",
    date: "20 Aug 2026",
    status: "Delivered",
    amount: 1600,
    formattedAmount: "₹ 1,600",
  },
];
