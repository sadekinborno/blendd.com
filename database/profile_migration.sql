-- Migration to support user profiles: Display Name, Biography, and Avatar Data
-- Run this in your Supabase SQL Editor:

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_data TEXT; -- Base64 encoded cropped avatar image data URL
