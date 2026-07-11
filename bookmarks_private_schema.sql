-- ==========================================================================
-- Migration for Private Bookmarks & Sharing Keys
-- Run this in your Supabase SQL Editor.
-- ==========================================================================

-- Alter public.bookmarks table to add columns for private mode and folders
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS owner_username TEXT DEFAULT 'Owner';
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS folder_name TEXT DEFAULT NULL;
ALTER TABLE public.bookmarks ADD COLUMN IF NOT EXISTS folder_key TEXT DEFAULT NULL;

-- Create bookmark_folders table to store folder key metadata
CREATE TABLE IF NOT EXISTS public.bookmark_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_name TEXT NOT NULL,
    link_key TEXT UNIQUE NOT NULL,
    owner_username TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_saved_folders table to store folder subscription mapping
CREATE TABLE IF NOT EXISTS public.user_saved_folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    link_key TEXT NOT NULL,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(username, link_key)
);
