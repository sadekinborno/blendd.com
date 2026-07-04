-- ==========================================================================
-- Analytics Database Schema
-- Run this SQL in your Supabase SQL Editor to configure analytics tables.
-- ==========================================================================

-- Create view_counts table
CREATE TABLE IF NOT EXISTS public.view_counts (
    view_id TEXT PRIMARY KEY,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create usage_logs table
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    username TEXT NOT NULL DEFAULT 'Guest',
    action TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT 'N/A'
);

-- Disable Row Level Security (RLS) to let the Node.js backend read/write records
ALTER TABLE public.view_counts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs DISABLE ROW LEVEL SECURITY;
