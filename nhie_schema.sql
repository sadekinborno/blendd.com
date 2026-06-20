-- ==========================================================================
-- Never Have I Ever (NHIE) Game Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables.
-- ==========================================================================

-- 1. Game sessions table
CREATE TABLE IF NOT EXISTS public.nhie_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Players scoreboard table
CREATE TABLE IF NOT EXISTS public.nhie_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.nhie_games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Statements table
CREATE TABLE IF NOT EXISTS public.nhie_statements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.nhie_games(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Answers table
CREATE TABLE IF NOT EXISTS public.nhie_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.nhie_games(id) ON DELETE CASCADE,
    statement_id UUID NOT NULL REFERENCES public.nhie_statements(id) ON DELETE CASCADE,
    player_name TEXT NOT NULL,
    has_done BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Configuration:
-- We disable RLS on these tables to let the Node.js backend read/write records.
ALTER TABLE public.nhie_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhie_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhie_statements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.nhie_answers DISABLE ROW LEVEL SECURITY;
