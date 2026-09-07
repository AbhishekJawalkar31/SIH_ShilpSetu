-- =============================================================================
-- ShilpSetu — Database Schema Migration
-- Migration: 003_orders_enhancement_and_notifications.sql
-- Description: Enhances the orders table with quote_request_id linkage,
--              creates order_items table for multi-artisan allocations,
--              and creates in-app notifications table.
-- Source of Truth: DATABASE_SCHEMA.md & ARCHITECTURE.md (Step 5H)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enhance orders table: Link to quote_requests with unique constraint
-- -----------------------------------------------------------------------------
ALTER TABLE orders 
    ADD COLUMN IF NOT EXISTS quote_request_id UUID UNIQUE REFERENCES quote_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_quote_request_id ON orders(quote_request_id);

-- Make artisan_id and product_id nullable on orders table if the order is multi-artisan B2B fulfilled
ALTER TABLE orders 
    ALTER COLUMN artisan_id DROP NOT NULL,
    ALTER COLUMN product_id DROP NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. Table: order_items
-- Multi-artisan order line items representing fulfilled allocations.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
    total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_artisan_id ON order_items(artisan_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- -----------------------------------------------------------------------------
-- 3. Table: notifications
-- In-app notifications for artisans and buyers.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
