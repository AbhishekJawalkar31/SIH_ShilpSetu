-- =============================================================================
-- ShilpSetu — Database Seed Data
-- Migration: seeds/001_seed_data.sql
-- Description: Inserts realistic seed data for the MVP demo:
--              1. Platform users (artisans, buyers, admin)
--              2. Artisan profiles across different craft regions
--              3. Diverse product catalogue (hero jute bags, pottery, textiles, metal)
--              4. Inventory and production capacity (available vs capacity)
--              5. 768-dim normalized semantic embeddings for pgvector
--              6. B2B Quote requests demonstrating hero 100-jute-bag matching pool
--              7. Sample reviews and historical orders
-- Source of Truth: DATABASE_SCHEMA.md & ARCHITECTURE.md
-- =============================================================================

-- Safe, non-destructive seed operations (never drops or deletes existing data)

-- -----------------------------------------------------------------------------
-- Helper function to generate deterministic, normalized 768-dim vectors
-- for pgvector product_embeddings during seeding.
-- Dropped at the end of the script.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION generate_seed_vector(seed_val INT, dim INT DEFAULT 768)
RETURNS vector AS $$
DECLARE
    v float8[] := '{}';
    mag float8 := 0;
    i INT;
    val float8;
BEGIN
    FOR i IN 1..dim LOOP
        -- Deterministic pseudo-random generation clustered by seed_val
        val := sin(i * 0.05 + seed_val * 0.71) + 0.5 * cos(i * 0.11 + seed_val * 0.33);
        v := array_append(v, val);
        mag := mag + (val * val);
    END LOOP;
    mag := sqrt(mag);
    FOR i IN 1..dim LOOP
        v[i] := round((v[i] / mag)::numeric, 6);
    END LOOP;
    RETURN ('[' || array_to_string(v, ',') || ']')::vector;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 1. USERS
-- -----------------------------------------------------------------------------
INSERT INTO users (id, name, email, phone, role) VALUES
    -- Sita Devi (Matches frontend artisan mock profile)
    ('550e8400-e29b-41d4-a716-446655440001', 'Sita Devi', 'sita.devi@shilpsetu.org', '+919829012345', 'artisan'),

    -- Hero B2B Jute Artisans (Artisan A, B, C)
    ('550e8400-e29b-41d4-a716-446655440002', 'Kavita Devi', 'kavita.jute@shilpsetu.org', '+919829123456', 'artisan'),
    ('550e8400-e29b-41d4-a716-446655440003', 'Ramesh Soren', 'ramesh.soren@shilpsetu.org', '+919830234567', 'artisan'),
    ('550e8400-e29b-41d4-a716-446655440004', 'Sunita Bai', 'sunita.bai@shilpsetu.org', '+919831345678', 'artisan'),

    -- Specialized Craft Artisans
    ('550e8400-e29b-41d4-a716-446655440005', 'Rajesh Prajapati', 'rajesh.pottery@shilpsetu.org', '+919835456789', 'artisan'),
    ('550e8400-e29b-41d4-a716-446655440006', 'Meenakshi Sundaram', 'meenakshi.weaves@shilpsetu.org', '+919840567890', 'artisan'),
    ('550e8400-e29b-41d4-a716-446655440007', 'Mohammed Aslam', 'aslam.brass@shilpsetu.org', '+919837678901', 'artisan'),

    -- Buyers
    ('550e8400-e29b-41d4-a716-446655440010', 'Vikram Mehta', 'procurement@hotelgreenvalley.com', '+919811122233', 'buyer'),
    ('550e8400-e29b-41d4-a716-446655440011', 'Anita Sharma', 'gifting@apexcorp.in', '+919822233344', 'buyer'),

    -- Admin
    ('550e8400-e29b-41d4-a716-446655440099', 'Admin ShilpSetu', 'admin@shilpsetu.org', '+919899999999', 'admin')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. ARTISANS
-- -----------------------------------------------------------------------------
INSERT INTO artisans (id, user_id, business_name, craft_type, description, location, city, state, country, languages, rating) VALUES
    -- Matches frontend artisan UI mock profile
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'Sita''s Rural Craft Collective', 'Handwoven Jute & Terracotta', 'Authentic sustainable handcrafted products made by women artisans of rural Rajasthan.', 'Barmer, Rajasthan', 'Barmer', 'Rajasthan', 'India', ARRAY['hi', 'en', 'raj'], 4.90),

    -- Hero B2B Pool Artisans
    ('a1111111-1111-1111-1111-111111111111', '550e8400-e29b-41d4-a716-446655440002', 'Kavita Jute Handicrafts (Artisan A)', 'Handwoven Jute Bags', 'Artisan collective specializing in natural golden fiber jute bags and sustainable hotel packaging.', 'Sanganer, Jaipur, Rajasthan', 'Jaipur', 'Rajasthan', 'India', ARRAY['hi', 'en'], 4.85),
    ('a2222222-2222-2222-2222-222222222222', '550e8400-e29b-41d4-a716-446655440003', 'Bengal Gramin Jute Udyog (Artisan B)', 'Traditional Jute Weaving', 'Rural handloom weavers crafting eco-friendly durable jute conference bags and totes.', 'Howrah, Kolkata, West Bengal', 'Kolkata', 'West Bengal', 'India', ARRAY['bn', 'hi', 'en'], 4.75),
    ('a3333333-3333-3333-3333-333333333333', '550e8400-e29b-41d4-a716-446655440004', 'Mahila Hastkala SHG (Artisan C)', 'Natural Fiber & Jute Crafts', 'Tribal women self-help group producing hand-braided jute bags and corporate gift hampers.', 'Namkum, Ranchi, Jharkhand', 'Ranchi', 'Jharkhand', 'India', ARRAY['hi', 'en'], 4.65),

    -- Additional Craft Artisans
    ('a4444444-4444-4444-4444-444444444444', '550e8400-e29b-41d4-a716-446655440005', 'Mitti Rang Terracotta Studio', 'Clay Pottery & Earthenware', 'Generational potters producing organic, lead-free earthenware and terracotta decor.', 'Prajapati Nagar, Khurja, Uttar Pradesh', 'Khurja', 'Uttar Pradesh', 'India', ARRAY['hi'], 4.80),
    ('a5555555-5555-5555-5555-555555555555', '550e8400-e29b-41d4-a716-446655440006', 'Chanderi Heritage Handlooms', 'Chanderi Silk & Cotton Weaving', 'Master weavers preserving GI-tagged traditional Chanderi handloom sarees and stoles.', 'Pranpur, Chanderi, Madhya Pradesh', 'Chanderi', 'Madhya Pradesh', 'India', ARRAY['hi', 'en'], 4.95),
    ('a6666666-6666-6666-6666-666666666666', '550e8400-e29b-41d4-a716-446655440007', 'Moradabad Brass Guild', 'Brass & Bell Metal Engraving', 'Artisanal brass crafting, casting, and hand-engraved metal homeware.', 'Peetal Mandi, Moradabad, Uttar Pradesh', 'Moradabad', 'Uttar Pradesh', 'India', ARRAY['hi', 'ur'], 4.70)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS
-- -----------------------------------------------------------------------------
INSERT INTO products (id, artisan_id, title, description, category, material, craft_type, tags, attributes, price, currency, image_url, status) VALUES
    -- Hero Jute Products (Under ₹700 each, suitable for Hotel Bulk Requirement)
    (
        'b1111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111',
        'Eco-Friendly Handwoven Jute Conference Bag',
        'Sturdy handwoven natural golden jute bag with padded cotton tape handles and zipper closure. Ideal for hotel welcome kits, seminars, and corporate hospitality gifts.',
        'Bags',
        'Natural Jute',
        'Handwoven',
        ARRAY['jute', 'bag', 'handmade', 'eco-friendly', 'hotel', 'conference', 'bulk'],
        '{"color": "Natural Golden Brown", "dimensions": "38x32x10 cm", "capacity_kg": 8, "closure": "Zipper"}'::jsonb,
        620.00,
        'INR',
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600',
        'published'
    ),
    (
        'b2222222-2222-2222-2222-222222222222',
        'a2222222-2222-2222-2222-222222222222',
        'Premium Natural Jute Tote Bag with Cotton Webbing',
        'Export-grade tight-weave jute tote bag with reinforced stitching and soft unbleached cotton handles. Designed for durability and eco-friendly hospitality amenities.',
        'Bags',
        'High-density Jute Fiber',
        'Handloom Weaving',
        ARRAY['jute', 'tote', 'handmade', 'hotel-amenity', 'sustainable', 'bulk-supply'],
        '{"color": "Natural Beige", "dimensions": "35x30x12 cm", "capacity_kg": 10, "handle": "Cotton Webbing"}'::jsonb,
        580.00,
        'INR',
        'https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&q=80&w=600',
        'published'
    ),
    (
        'b3333333-3333-3333-3333-333333333333',
        'a3333333-3333-3333-3333-333333333333',
        'Handcrafted Gusseted Jute Shopping & Gift Bag',
        'Spacious side-gusseted jute gift bag crafted by tribal women artisans, featuring organic cotton piping and wooden button accent.',
        'Bags',
        'Biodegradable Jute',
        'Hand-braided',
        ARRAY['jute', 'gift-bag', 'handmade', 'hotel', 'eco-packaging', 'event-gifting'],
        '{"color": "Natural Jute with Red Piping", "dimensions": "36x30x14 cm", "capacity_kg": 9, "accent": "Wooden Button"}'::jsonb,
        650.00,
        'INR',
        'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600',
        'published'
    ),

    -- Products for Sita's Collective (matching frontend initialProducts)
    (
        'b4444444-4444-4444-4444-444444444401',
        '550e8400-e29b-41d4-a716-446655440000',
        'Handcrafted Jute Tote Bag',
        'Eco-friendly handwoven natural jute tote bag with reinforced cotton handles, traditional floral embroidery, and spacious capacity for daily shopping or events.',
        'Bags',
        'Natural Jute Fiber',
        'Handwoven',
        ARRAY['handmade', 'eco-friendly', 'jute', 'bulk', 'tote', 'sustainable'],
        '{"color": "Natural Golden Brown", "size": "Large (16x14 inches)", "weight": "320g", "capacity": "10-12 kg"}'::jsonb,
        750.00,
        'INR',
        'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&q=80&w=600',
        'published'
    ),
    (
        'b4444444-4444-4444-4444-444444444402',
        '550e8400-e29b-41d4-a716-446655440000',
        'Terracotta Festive Oil Lamp Set',
        'Hand-moulded natural clay terracotta diyas with intricate geometric cutwork designed for festive illumination and sustainable home decor.',
        'Home Decor',
        'Riverbed Clay / Terracotta',
        'Clay Pottery',
        ARRAY['terracotta', 'pottery', 'diya', 'lamp', 'eco-decor', 'festive'],
        '{"color": "Earthy Terracotta Red", "size": "Medium (4 inches diameter)", "pack": "Set of 6"}'::jsonb,
        480.00,
        'INR',
        'https://images.unsplash.com/photo-1606293926075-69a00dbfde81?auto=format&fit=crop&q=80&w=600',
        'published'
    ),
    (
        'b4444444-4444-4444-4444-444444444403',
        '550e8400-e29b-41d4-a716-446655440000',
        'Handblock Print Cotton Dupatta',
        'Breathable pure mulmul cotton dupatta featuring heritage floral bagru block printing crafted using authentic organic plant dyes.',
        'Textiles',
        'Organic Mulmul Cotton',
        'Block Print',
        ARRAY['blockprint', 'cotton', 'dupatta', 'organic dye', 'rajasthan craft'],
        '{"color": "Indigo & Ochre", "length": "2.5 meters", "wash_care": "Gentle cold hand wash"}'::jsonb,
        1150.00,
        'INR',
        'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&q=80&w=600',
        'published'
    ),
    (
        'b4444444-4444-4444-4444-444444444404',
        '550e8400-e29b-41d4-a716-446655440000',
        'Handcrafted Cane & Bamboo Planter',
        'Durable woven natural cane planter basket with water-resistant inner lining suitable for indoor plants and balcony gardens.',
        'Home Decor',
        'Cane & Bamboo',
        'Handwoven Basketry',
        ARRAY['cane', 'bamboo', 'planter', 'sustainable', 'artisan made'],
        '{"color": "Natural Beige", "diameter": "8 inches", "height": "7 inches"}'::jsonb,
        650.00,
        'INR',
        'https://images.unsplash.com/photo-1592150621744-aca64f48394a?auto=format&fit=crop&q=80&w=600',
        'published'
    ),

    -- Additional Craft Products
    (
        'b5555555-5555-5555-5555-555555555501',
        'a4444444-4444-4444-4444-444444444444',
        'Handcrafted Terracotta Clay Water Carafe with Tumbler',
        'Unglazed porous terracotta water pitcher that cools water naturally through micro-evaporation. Eco-friendly table beverage server.',
        'Kitchenware',
        'Natural Terracotta Clay',
        'Wheel-thrown Pottery',
        ARRAY['terracotta', 'pitcher', 'water-carafe', 'organic', 'cooling', 'pottery'],
        '{"capacity": "1.5 Liters", "finish": "Matte Porous", "height": "22 cm"}'::jsonb,
        820.00,
        'INR',
        'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&q=80&w=600',
        'published'
    ),
    (
        'b6666666-6666-6666-6666-666666666601',
        'a5555555-5555-5555-5555-555555555555',
        'Traditional Handloom Chanderi Silk Cotton Saree',
        'Lightweight handwoven Chanderi saree woven with pure mulberry silk warp and fine cotton weft, adorned with zari bootis and border.',
        'Textiles',
        'Silk Cotton with Zari',
        'Handloom Weaving',
        ARRAY['chanderi', 'saree', 'silk', 'handloom', 'traditional', 'heritage'],
        '{"length": "6.3 meters with blouse piece", "color": "Emerald Green & Gold", "weave": "Chanderi GI"}'::jsonb,
        2800.00,
        'INR',
        'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&q=80&w=600',
        'published'
    ),
    (
        'b7777777-7777-7777-7777-777777777701',
        'a6666666-6666-6666-6666-666666666666',
        'Antique Hand-Engraved Brass Planter Pot',
        'Traditional Moradabad brass bowl planter featuring embossed mughal jaali patterns, treated with antique golden lacquer finish.',
        'Home Decor',
        'Pure Solid Brass',
        'Metal Embossing & Etching',
        ARRAY['brass', 'planter', 'metalwork', 'antique', 'handcrafted', 'decor'],
        '{"diameter": "10 inches", "finish": "Antique Polish", "weight": "1.2 kg"}'::jsonb,
        1750.00,
        'INR',
        'https://images.unsplash.com/photo-1616046229478-9901c5536a45?auto=format&fit=crop&q=80&w=600',
        'published'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. INVENTORY & CAPACITY
-- Availability (ready stock) vs Production Capacity (bulk feasibility)
-- -----------------------------------------------------------------------------
INSERT INTO inventory (id, product_id, available_quantity, production_capacity, unit) VALUES
    -- Hero Jute Products:
    -- Artisan A: 20 available, 50 capacity -> Can satisfy 40
    ('c1111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 20, 50, 'piece'),
    -- Artisan B: 15 available, 40 capacity -> Can satisfy 35
    ('c2222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 15, 40, 'piece'),
    -- Artisan C: 10 available, 30 capacity -> Can satisfy 25
    -- Combined: 40 + 35 + 25 = 100 units!
    ('c3333333-3333-3333-3333-333333333333', 'b3333333-3333-3333-3333-333333333333', 10, 30, 'piece'),

    -- Sita's Collective products
    ('c4444444-4444-4444-4444-444444444401', 'b4444444-4444-4444-4444-444444444401', 45, 150, 'piece'),
    ('c4444444-4444-4444-4444-444444444402', 'b4444444-4444-4444-4444-444444444402', 60, 300, 'set'),
    ('c4444444-4444-4444-4444-444444444403', 'b4444444-4444-4444-4444-444444444403', 20, 80, 'piece'),
    ('c4444444-4444-4444-4444-444444444404', 'b4444444-4444-4444-4444-444444444404', 18, 70, 'piece'),

    -- Additional products
    ('c5555555-5555-5555-5555-555555555501', 'b5555555-5555-5555-5555-555555555501', 25, 90, 'piece'),
    ('c6666666-6666-6666-6666-666666666601', 'b6666666-6666-6666-6666-666666666601', 12, 30, 'piece'),
    ('c7777777-7777-7777-7777-777777777701', 'b7777777-7777-7777-7777-777777777701', 14, 40, 'piece')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 5. PRODUCT EMBEDDINGS (pgvector)
-- 768-dimensional normalized unit vectors generated for semantic similarity.
-- -----------------------------------------------------------------------------
INSERT INTO product_embeddings (id, product_id, embedding, embedding_model, source_text) VALUES
    (
        'd1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111',
        generate_seed_vector(101, 768),
        'gemini-embedding-2',
        'Eco-Friendly Handwoven Jute Conference Bag. Sturdy handwoven natural golden jute bag with padded cotton tape handles and zipper closure. Ideal for hotel welcome kits, seminars, and corporate hospitality gifts. Category: Bags. Material: Natural Jute. Craft: Handwoven.'
    ),
    (
        'd2222222-2222-2222-2222-222222222222',
        'b2222222-2222-2222-2222-222222222222',
        generate_seed_vector(102, 768),
        'gemini-embedding-2',
        'Premium Natural Jute Tote Bag with Cotton Webbing. Export-grade tight-weave jute tote bag with reinforced stitching and soft unbleached cotton handles. Designed for durability and eco-friendly hospitality amenities. Category: Bags. Material: High-density Jute Fiber. Craft: Handloom Weaving.'
    ),
    (
        'd3333333-3333-3333-3333-333333333333',
        'b3333333-3333-3333-3333-333333333333',
        generate_seed_vector(103, 768),
        'gemini-embedding-2',
        'Handcrafted Gusseted Jute Shopping & Gift Bag. Spacious side-gusseted jute gift bag crafted by tribal women artisans, featuring organic cotton piping and wooden button accent. Category: Bags. Material: Biodegradable Jute. Craft: Hand-braided.'
    ),
    (
        'd4444444-4444-4444-4444-444444444401',
        'b4444444-4444-4444-4444-444444444401',
        generate_seed_vector(104, 768),
        'gemini-embedding-2',
        'Handcrafted Jute Tote Bag. Eco-friendly handwoven natural jute tote bag with reinforced cotton handles, traditional floral embroidery, and spacious capacity for daily shopping or events. Category: Bags. Material: Natural Jute Fiber.'
    ),
    (
        'd4444444-4444-4444-4444-444444444402',
        'b4444444-4444-4444-4444-444444444402',
        generate_seed_vector(201, 768),
        'gemini-embedding-2',
        'Terracotta Festive Oil Lamp Set. Hand-moulded natural clay terracotta diyas with intricate geometric cutwork designed for festive illumination and sustainable home decor. Category: Home Decor. Material: Riverbed Clay / Terracotta.'
    ),
    (
        'd4444444-4444-4444-4444-444444444403',
        'b4444444-4444-4444-4444-444444444403',
        generate_seed_vector(301, 768),
        'gemini-embedding-2',
        'Handblock Print Cotton Dupatta. Breathable pure mulmul cotton dupatta featuring heritage floral bagru block printing crafted using authentic organic plant dyes. Category: Textiles. Material: Organic Mulmul Cotton.'
    ),
    (
        'd4444444-4444-4444-4444-444444444404',
        'b4444444-4444-4444-4444-444444444404',
        generate_seed_vector(202, 768),
        'gemini-embedding-2',
        'Handcrafted Cane & Bamboo Planter. Durable woven natural cane planter basket with water-resistant inner lining suitable for indoor plants and balcony gardens. Category: Home Decor. Material: Cane & Bamboo.'
    ),
    (
        'd5555555-5555-5555-5555-555555555501',
        'b5555555-5555-5555-5555-555555555501',
        generate_seed_vector(203, 768),
        'gemini-embedding-2',
        'Handcrafted Terracotta Clay Water Carafe with Tumbler. Unglazed porous terracotta water pitcher that cools water naturally through micro-evaporation. Eco-friendly table beverage server. Category: Kitchenware. Material: Natural Terracotta Clay.'
    ),
    (
        'd6666666-6666-6666-6666-666666666601',
        'b6666666-6666-6666-6666-666666666601',
        generate_seed_vector(302, 768),
        'gemini-embedding-2',
        'Traditional Handloom Chanderi Silk Cotton Saree. Lightweight handwoven Chanderi saree woven with pure mulberry silk warp and fine cotton weft, adorned with zari bootis and border. Category: Textiles. Material: Silk Cotton with Zari.'
    ),
    (
        'd7777777-7777-7777-7777-777777777701',
        'b7777777-7777-7777-7777-777777777701',
        generate_seed_vector(401, 768),
        'gemini-embedding-2',
        'Antique Hand-Engraved Brass Planter Pot. Traditional Moradabad brass bowl planter featuring embossed mughal jaali patterns, treated with antique golden lacquer finish. Category: Home Decor. Material: Pure Solid Brass.'
    )
ON CONFLICT (id) DO NOTHING;

-- Clean up temporary seed helper function
DROP FUNCTION IF EXISTS generate_seed_vector(INT, INT);

-- -----------------------------------------------------------------------------
-- 6. QUOTE REQUESTS
-- Demonstrating the Hero B2B Journey:
-- "I need 100 handmade jute bags for my hotel under ₹700 each."
-- -----------------------------------------------------------------------------
INSERT INTO quote_requests (id, buyer_id, product_id, quantity, budget_per_unit, total_budget, requirement_text, status) VALUES
    (
        'e1111111-1111-1111-1111-111111111111',
        '550e8400-e29b-41d4-a716-446655440010', -- Vikram Mehta (Hotel Green Valley)
        NULL, -- NL search requirement matched to an artisan pool
        100,
        700.00,
        70000.00,
        'I need 100 handmade jute bags for my hotel under ₹700 each.',
        'responded'
    ),
    (
        'e2222222-2222-2222-2222-222222222222',
        '550e8400-e29b-41d4-a716-446655440011', -- Anita Sharma (Apex Corp)
        'b4444444-4444-4444-4444-444444444402', -- Direct product quote: Terracotta Oil Lamps
        50,
        450.00,
        22500.00,
        'Requirement for 50 Diwali festive lamp sets for corporate gift hampers.',
        'pending'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. QUOTE REQUEST ARTISANS (The B2B Multi-Artisan Matching Pool)
-- Fulfilling the 100-unit requirement across 3 artisans:
-- Artisan A (40) + Artisan B (35) + Artisan C (25) = 100 units
-- -----------------------------------------------------------------------------
INSERT INTO quote_request_artisans (id, quote_request_id, artisan_id, matched_quantity, match_score, status) VALUES
    (
        'f1111111-1111-1111-1111-111111111111',
        'e1111111-1111-1111-1111-111111111111',
        'a1111111-1111-1111-1111-111111111111', -- Artisan A
        40,
        0.9300,
        'quoted'
    ),
    (
        'f2222222-2222-2222-2222-222222222222',
        'e1111111-1111-1111-1111-111111111111',
        'a2222222-2222-2222-2222-222222222222', -- Artisan B
        35,
        0.8900,
        'quoted'
    ),
    (
        'f3333333-3333-3333-3333-333333333333',
        'e1111111-1111-1111-1111-111111111111',
        'a3333333-3333-3333-3333-333333333333', -- Artisan C
        25,
        0.8600,
        'quoted'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. REVIEWS (Optional MVP module demonstration)
-- -----------------------------------------------------------------------------
INSERT INTO reviews (id, buyer_id, artisan_id, product_id, rating, comment) VALUES
    (
        '91111111-1111-1111-1111-111111111111',
        '550e8400-e29b-41d4-a716-446655440010',
        'a1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111',
        5,
        'Exceptional build quality on the conference bags. Our hotel guests praised the natural finish and durability.'
    ),
    (
        '92222222-2222-2222-2222-222222222222',
        '550e8400-e29b-41d4-a716-446655440011',
        '550e8400-e29b-41d4-a716-446655440000',
        'b4444444-4444-4444-4444-444444444402',
        5,
        'The festive terracotta diyas arrived well-packed and beautifully crafted. Highly recommend for corporate gifts.'
    )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 9. ORDERS (Completed/confirmed sample purchase records)
-- -----------------------------------------------------------------------------
INSERT INTO orders (id, buyer_id, artisan_id, product_id, quantity, unit_price, total_price, status) VALUES
    (
        '81111111-1111-1111-1111-111111111111',
        '550e8400-e29b-41d4-a716-446655440010',
        'a1111111-1111-1111-1111-111111111111',
        'b1111111-1111-1111-1111-111111111111',
        40,
        620.00,
        24800.00,
        'confirmed'
    ),
    (
        '82222222-2222-2222-2222-222222222222',
        '550e8400-e29b-41d4-a716-446655440011',
        '550e8400-e29b-41d4-a716-446655440000',
        'b4444444-4444-4444-4444-444444444404',
        10,
        650.00,
        6500.00,
        'completed'
    )
ON CONFLICT (id) DO NOTHING;

