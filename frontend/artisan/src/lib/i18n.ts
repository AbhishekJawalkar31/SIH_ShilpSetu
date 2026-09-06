export type Language = "en" | "hi";

export const translations = {
  en: {
    // Header
    greeting: "Namaste, Sita",
    subtitle: "Artisan • Rajasthan",
    searchPlaceholder: "Search your products, orders...",
    langSwitch: "हिन्दी",

    // Dashboard Banner
    heroTitle: "Your craft Deserves the world.",
    heroSubtitle: "Reach more buyers with our platform.",
    heroBadge: "AI Enabled",

    // Quick Actions
    quickActions: "Quick Actions",
    addProduct: "Add Product",
    addProductSub: "Upload & List",
    myProducts: "My Products",
    myProductsSub: "12 Listed",
    orders: "Orders",
    ordersSub: "3 New",
    earnings: "Earnings",
    earningsSub: "₹12,340",

    // Recent Activity
    recentActivity: "Recent Activity",
    viewAll: "View All",
    orderReceived: "Order Received",
    listed: "Listed",
    quoteRequest: "Quote Request",

    // Navigation
    navHome: "Home",
    navProducts: "Products",
    navAdd: "Add",
    navOrders: "Orders",
    navProfile: "Profile",

    // Add Product Flow - Steps
    stepPhoto: "Photo",
    stepDetails: "Details",
    stepPrice: "Price",
    stepPublish: "Publish",

    // Add Product - Step 1: Upload & Voice
    uploadTitle: "Product Photo",
    uploadSubtitle: "Take a clear picture in natural light",
    cameraBtn: "Take Photo",
    galleryBtn: "Choose from Gallery",
    photoCount: "Photos",
    beforeAfter: "AI Enhanced Preview",
    before: "Original",
    after: "Enhanced",
    voicePrompt: "Describe your craft (Voice or Text)",
    voiceHint: "Tap mic and speak about material, size, or technique",
    recording: "Listening... speak now",
    tapToSpeak: "Tap to Speak",
    stopRecording: "Done Speaking",
    audioRecorded: "Voice note recorded",
    reRecord: "Record Again",
    typeInstead: "Or write in your words...",
    generateCatalogueBtn: "Generate Catalogue ✨",
    generating: "Generating AI Catalogue...",

    // AI Generation Loading States
    loadingStep1: "Uploading photo & voice note...",
    loadingStep2: "Analyzing craft patterns and weave...",
    loadingStep3: "Detecting natural materials & craft style...",
    loadingStep4: "Calculating fair market price recommendation...",

    // Add Product - Step 2: Catalogue Review
    reviewTitle: "Review AI Catalogue",
    reviewSubtitle: "AI identified your product. You can tap any field to edit.",
    titleLabel: "Product Title (AI Suggested)",
    descLabel: "Description",
    categoryLabel: "Category",
    materialLabel: "Material",
    craftTypeLabel: "Craft Type",
    tagsLabel: "Tags",
    attributesLabel: "Specifications / Attributes",
    colorLabel: "Color",
    sizeLabel: "Size",
    dimensionsLabel: "Dimensions",
    weightLabel: "Weight",

    // Add Product - Step 3: Price Recommendation
    priceTitle: "Price Recommendation",
    recommendedPrice: "Recommended Price",
    recommendedRange: "Fair market recommendation range",
    goodMatch: "Good Match",
    priceBasis: "Based on similar 143 products on our platform",
    yourPriceLabel: "Your Final Price",
    priceControlNote: "Artisan Note: You have 100% control of your selling price. The AI price is only a recommendation.",
    suggestedMin: "Min fair price",
    suggestedMax: "Max fair price",

    // Add Product - Step 4: Publish
    publishTitle: "Ready to Publish",
    publishSubtitle: "Your product will immediately be visible to buyers and bulk hotels.",
    publishBtn: "Publish Product",
    publishing: "Publishing to Marketplace...",
    successTitle: "Product Published Successfully! 🎉",
    successMsg: "Your listing is now live. Buyers and hotel networks can discover your craft.",
    viewListing: "View in My Products",
    addAnother: "Add Another Product",
    backToHome: "Back to Home",

    // Requests & Orders Screen
    requestsTitle: "Stay connected with buyers",
    tabOrders: "Orders",
    tabRequests: "Requests",
    tabMessages: "Messages",
    bulkQuoteBadge: "Bulk Quote Request",
    newBadge: "New",
    budgetLabel: "Budget",
    viewDetails: "View Details",
    chatWithBuyer: "Chat",
    recentOrders: "Recent Orders",
    delivered: "Delivered",
    processing: "Processing",
    shipped: "Shipped",

    // Controls
    next: "Next →",
    back: "← Back",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
  },
  hi: {
    // Header
    greeting: "नमस्ते, सीता जी",
    subtitle: "शिल्पकार • राजस्थान",
    searchPlaceholder: "अपने उत्पाद, ऑर्डर खोजें...",
    langSwitch: "English",

    // Dashboard Banner
    heroTitle: "आपकी कला का सम्मान पूरी दुनिया में।",
    heroSubtitle: "हमारे मंच से सीधे बड़े खरीदारों से जुड़ें।",
    heroBadge: "AI संचालित",

    // Quick Actions
    quickActions: "त्वरित कार्य",
    addProduct: "उत्पाद जोड़ें",
    addProductSub: "फोटो लें व जोड़ें",
    myProducts: "मेरे उत्पाद",
    myProductsSub: "12 उपलब्ध",
    orders: "ऑर्डर",
    ordersSub: "3 नए",
    earnings: "कुल कमाई",
    earningsSub: "₹12,340",

    // Recent Activity
    recentActivity: "हाल की गतिविधि",
    viewAll: "सभी देखें",
    orderReceived: "नया ऑर्डर प्राप्त",
    listed: "उत्पाद सूची में जुड़ा",
    quoteRequest: "थोक मांग अनुरोध",

    // Navigation
    navHome: "होम",
    navProducts: "उत्पाद",
    navAdd: "नया",
    navOrders: "ऑर्डर",
    navProfile: "प्रोफ़ाइल",

    // Add Product Flow - Steps
    stepPhoto: "फोटो",
    stepDetails: "विवरण",
    stepPrice: "कीमत",
    stepPublish: "प्रकाशित",

    // Add Product - Step 1: Upload & Voice
    uploadTitle: "उत्पाद की फोटो",
    uploadSubtitle: "प्राकृतिक रोशनी में साफ़ फोटो खींचें",
    cameraBtn: "फोटो खींचें",
    galleryBtn: "गैलरी से चुनें",
    photoCount: "तस्वीरें",
    beforeAfter: "AI संवर्धित पूर्वावलोकन",
    before: "मूल",
    after: "सुधारा हुआ",
    voicePrompt: "अपनी कला के बारे में बताएं (बोलकर या लिखकर)",
    voiceHint: "माइक दबाकर सामग्री, आकार या तकनीक के बारे में बोलें",
    recording: "सुन रहे हैं... कृपया बोलें",
    tapToSpeak: "बोलने के लिए दबाएं",
    stopRecording: "बोलना समाप्त",
    audioRecorded: "आवाज़ रिकॉर्ड हो गई",
    reRecord: "फिर से बोलें",
    typeInstead: "या अपने शब्दों में लिखें...",
    generateCatalogueBtn: "AI कैटलॉग बनाएं ✨",
    generating: "AI कैटलॉग तैयार हो रहा है...",

    // AI Generation Loading States
    loadingStep1: "फोटो और आवाज़ अपलोड हो रही है...",
    loadingStep2: "कला की बनावट और बुनाई की पहचान...",
    loadingStep3: "प्राकृतिक सामग्री और शिल्प प्रकार की पहचान...",
    loadingStep4: "उचित बाज़ार मूल्य का आकलन किया जा रहा है...",

    // Add Product - Step 2: Catalogue Review
    reviewTitle: "AI कैटलॉग की जांच करें",
    reviewSubtitle: "AI ने आपके उत्पाद की पहचान कर ली है। बदलाव के लिए किसी भी फ़ील्ड को छुएं।",
    titleLabel: "उत्पाद का नाम (AI सुझाया)",
    descLabel: "विवरण",
    categoryLabel: "श्रेणी",
    materialLabel: "सामग्री",
    craftTypeLabel: "शिल्प कला का प्रकार",
    tagsLabel: "टैग्स (खोज शब्द)",
    attributesLabel: "विशिष्टताएं / नाप",
    colorLabel: "रंग",
    sizeLabel: "आकार",
    dimensionsLabel: "लंबाई-चौड़ाई",
    weightLabel: "वज़न",

    // Add Product - Step 3: Price Recommendation
    priceTitle: "उचित मूल्य सुझाव",
    recommendedPrice: "AI अनुशंसित मूल्य",
    recommendedRange: "उचित बाज़ार मूल्य सीमा",
    goodMatch: "सटीक मूल्य",
    priceBasis: "हमारे मंच पर 143 समान उत्पादों के आधार पर",
    yourPriceLabel: "आपकी अंतिम बिक्री कीमत",
    priceControlNote: "शिल्पकार ध्यान दें: अपनी कीमत तय करने का 100% अधिकार आपका है। AI का मूल्य केवल एक सुझाव है।",
    suggestedMin: "न्यूनतम उचित मूल्य",
    suggestedMax: "अधिकतम उचित मूल्य",

    // Add Product - Step 4: Publish
    publishTitle: "प्रकाशित करने के लिए तैयार",
    publishSubtitle: "आपका उत्पाद तुरंत खरीदारों और होटल नेटवर्कों को दिखेगा।",
    publishBtn: "उत्पाद प्रकाशित करें",
    publishing: "बाज़ार में प्रकाशित हो रहा है...",
    successTitle: "बधाई हो! उत्पाद सफलतापूर्वक प्रकाशित हुआ 🎉",
    successMsg: "आपका उत्पाद अब सक्रिय है। थोक खरीदार और होटल अब आपकी कला देख सकते हैं।",
    viewListing: "मेरे उत्पादों में देखें",
    addAnother: "दूसरा उत्पाद जोड़ें",
    backToHome: "होम पर जाएं",

    // Requests & Orders Screen
    requestsTitle: "खरीदारों से जुड़े रहें",
    tabOrders: "ऑर्डर",
    tabRequests: "थोक मांग",
    tabMessages: "संदेश",
    bulkQuoteBadge: "थोक कोटेशन अनुरोध",
    newBadge: "नया",
    budgetLabel: "बजट",
    viewDetails: "विवरण देखें",
    chatWithBuyer: "बातचीत करें",
    recentOrders: "हाल के ऑर्डर",
    delivered: "पहुंच गया",
    processing: "तैयार हो रहा है",
    shipped: "भेज दिया गया",

    // Controls
    next: "आगे बढ़ें →",
    back: "← पीछे",
    save: "सहेजें",
    cancel: "रद्द करें",
    edit: "बदलें",
  },
};

