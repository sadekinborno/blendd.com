-- ==========================================================================
-- Who's the Worst? (WTW) Game Database Schema
-- Run this SQL in your Supabase SQL Editor to create the required tables.
-- ==========================================================================

-- 1. Game sessions table
CREATE TABLE IF NOT EXISTS public.wtw_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Players scoreboard table
CREATE TABLE IF NOT EXISTS public.wtw_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.wtw_games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Questions table
CREATE TABLE IF NOT EXISTS public.wtw_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.wtw_games(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    author_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Votes table
CREATE TABLE IF NOT EXISTS public.wtw_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID NOT NULL REFERENCES public.wtw_games(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.wtw_questions(id) ON DELETE CASCADE,
    voter_name TEXT NOT NULL,
    votee_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security (RLS) Configuration:
-- To keep things simple and ensure your Node.js backend (using the anon key) can write/read records,
-- we disable RLS on these tables.
ALTER TABLE public.wtw_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wtw_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wtw_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.wtw_votes DISABLE ROW LEVEL SECURITY;
