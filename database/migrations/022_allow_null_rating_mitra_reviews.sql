-- Allow null rating for skipped reviews
-- This migration allows rating to be null for cases where pegawai skips review
-- because they didn't work directly with the mitra

-- Drop the existing constraint
ALTER TABLE mitra_reviews DROP CONSTRAINT IF EXISTS mitra_reviews_rating_check;

-- Add new constraint that allows null or rating between 1-5
ALTER TABLE mitra_reviews ADD CONSTRAINT mitra_reviews_rating_check 
  CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5));

-- Update the column to allow null
ALTER TABLE mitra_reviews ALTER COLUMN rating DROP NOT NULL;
