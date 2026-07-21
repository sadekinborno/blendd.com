-- Migration to add Brian AI access control column to users table in Supabase
-- Run this in your Supabase SQL Editor:
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS brian_access TEXT DEFAULT 'none';
