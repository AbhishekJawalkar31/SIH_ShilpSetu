-- =============================================================================
-- ShilpSetu — Supabase Storage Setup Migration
-- Migration: 002_storage_setup.sql
-- Description: Configures the Supabase Storage bucket 'product-images' for
--              artisan product photos and defines storage access policies.
-- Source of Truth: DATABASE_SCHEMA.md (Section 13) & ARCHITECTURE.md (Section 8)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create 'product-images' Bucket
-- -----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 MB limit per image
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

-- -----------------------------------------------------------------------------
-- 2. Storage Policies
-- -----------------------------------------------------------------------------

-- Allow public read access to all objects in 'product-images' bucket
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Public Access for Product Images'
    ) THEN
        CREATE POLICY "Public Access for Product Images"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'product-images');
    END IF;
END $$;

-- Allow authenticated users to upload product images
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Authenticated Uploads for Product Images'
    ) THEN
        CREATE POLICY "Authenticated Uploads for Product Images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'product-images');
    END IF;
END $$;

-- Allow service role full access
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND policyname = 'Service Role Access for Product Images'
    ) THEN
        CREATE POLICY "Service Role Access for Product Images"
        ON storage.objects FOR ALL
        TO service_role
        USING (bucket_id = 'product-images')
        WITH CHECK (bucket_id = 'product-images');
    END IF;
END $$;
