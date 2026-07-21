-- ==========================================================================
-- Bookmarks Database Schema
-- Run this SQL in your Supabase SQL Editor to configure the bookmarks table.
-- ==========================================================================

-- Create bookmarks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.bookmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    favicon TEXT,
    domain TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    added_by TEXT DEFAULT 'Owner',
    is_deleted BOOLEAN DEFAULT FALSE,
    hidden_by_admin BOOLEAN DEFAULT FALSE,
    sort_order FLOAT
);

-- Row Level Security (RLS) Configuration:
-- We disable RLS on this table to let the Node.js backend read/write records.
ALTER TABLE public.bookmarks DISABLE ROW LEVEL SECURITY;
