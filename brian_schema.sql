-- ==========================================================================
-- Project Brian - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to configure the tables
-- and similarity search functions.
-- ==========================================================================

-- 1. Enable the vector extension (pgvector)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create Table: People (Relationships & Opinions)
CREATE TABLE IF NOT EXISTS public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    real_name TEXT UNIQUE NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    relationship TEXT,
    opinion TEXT,
    notes TEXT,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Table: Stories (Blog Posts & Experiences)
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    full_text TEXT NOT NULL,
    people TEXT[] DEFAULT '{}',
    emotion TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    embedding vector(768)
);

-- 4. Create Table: Brian Memories (Facts learnt during user interactions)
CREATE TABLE IF NOT EXISTS public.brian_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_name TEXT NOT NULL,
    memory TEXT NOT NULL,
    embedding vector(768),
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Table: User Conversations (Summaries for session history)
CREATE TABLE IF NOT EXISTS public.user_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT UNIQUE NOT NULL,
    user_name TEXT NOT NULL,
    conversation_summary TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Disable Row Level Security (RLS) to allow backend client bypass
ALTER TABLE public.people DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brian_memories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_conversations DISABLE ROW LEVEL SECURITY;

-- 7. Similarity Search Stored Procedure: match_stories
CREATE OR REPLACE FUNCTION match_stories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  title text,
  summary text,
  full_text text,
  people text[],
  emotion text,
  date timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    stories.id,
    stories.title,
    stories.summary,
    stories.full_text,
    stories.people,
    stories.emotion,
    stories.date,
    1 - (stories.embedding <=> query_embedding) AS similarity
  FROM stories
  WHERE 1 - (stories.embedding <=> query_embedding) > match_threshold
  ORDER BY stories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Similarity Search Stored Procedure: match_memories
CREATE OR REPLACE FUNCTION match_memories (
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  user_name text,
  memory text,
  date timestamp with time zone,
  similarity float
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    brian_memories.id,
    brian_memories.user_name,
    brian_memories.memory,
    brian_memories.date,
    1 - (brian_memories.embedding <=> query_embedding) AS similarity
  FROM brian_memories
  WHERE 1 - (brian_memories.embedding <=> query_embedding) > match_threshold
  ORDER BY brian_memories.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 9. Add brian_access column to users table for access control
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS brian_access TEXT DEFAULT 'none';

