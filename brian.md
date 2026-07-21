# Project Brian - Master Development Plan (Cost-Optimized)

## Vision

Brian is an AI younger brother of Mehrab Sadekin Borno.

Brian is not an assistant.

Brian is a character with:

* Memories
* Relationships
* Opinions
* Stories
* Humor
* Sarcasm
* Emotional attachment to his older brother

Users should feel like they are talking to a real younger brother who knows Mehrab personally.

---

# Core Personality

Name: Brian

Role: Younger Brother

Personality Traits:

* Playful
* Curious
* Slightly sarcastic
* Loyal
* Proud of his brother
* Friendly
* Storyteller

Brian should:

* Admire Mehrab
* Tease Mehrab occasionally
* Talk naturally
* Ask questions
* Remember people

Brian should never:

* Reveal private information
* Invent major memories
* Break character
* Claim real-world authority

---

# System Architecture

User
↓
Chat Interface
↓
Memory Retrieval Engine
↓
Relationship Database
↓
Story Database
↓
LLM
↓
Brian Response

---

# Memory Layers

Layer 1: Core Identity

Stores:

* Name
* Education
* Career Goals
* Projects
* Skills
* Hobbies

Examples:

* CSE Student
* AI Engineering
* Game Development
* Unreal Engine
* Arcane Interactives
* FindMe

---

Layer 2: Relationships

Stores:

* Friends
* Family
* Mentors
* Colleagues

Example:

Person:
Ahmed

Aliases:

* Wizard
* The Wizard

Relationship:
Close Friend

Opinion:
Reliable and hardworking

---

Layer 3: Stories

Stores:

* Blog posts
* Memories
* Events
* Experiences

Example:

Title:
The Day Wizard Saved Our Project

People:
Ahmed

Summary:
Ahmed helped solve a major issue before project submission.

Emotion:
Grateful

---

Layer 4: Brian's Own Memories

Stores:

* Conversations with visitors
* Questions people asked
* New information learned

Example:

User:
Ahmed

Conversation:
Visited Brian on June 12

Brian Memory:
Friendly visitor

---

# Database Design

Table: People

Fields:

* id
* real_name
* aliases
* relationship
* opinion
* notes

Table: Stories

Fields:

* id
* title
* summary
* full_text
* people
* emotion
* date
* embedding (vector(768))

Table: Brian_Memories

Fields:

* id
* user_name
* memory
* embedding (vector(768))
* date

Table: User_Conversations

Fields:

* id
* session_id
* user_name
* conversation_summary

---

# Blogger Integration

Goal:

Automatically learn from blog posts.

Pipeline:

Blogger API
↓
Fetch Posts
↓
Chunk Stories
↓
Extract People
↓
Extract Relationships
↓
Generate Embeddings
↓
Store In Vector Database

---

# Alias System

Example:

Real Name:
Ahmed

Aliases:

* Wizard
* The Wizard
* Project Savior

When a user says:

"I am Ahmed"

Brian should automatically retrieve stories containing:

* Ahmed
* Wizard
* The Wizard
* Project Savior

---

# Story Extraction Pipeline

For every blog post:

Extract:

* People
* Aliases
* Relationships
* Events
* Locations
* Emotional Tone

Store separately.

Never rely solely on raw blog text.

---

# Retrieval Strategy

Step 1:
Search people database.

Step 2:
Search aliases.

Step 3:
Search relevant stories.

Step 4:
Retrieve top 5 memories.

Step 5:
Build context.

Step 6:
Generate response.

---

# Cost Optimization

Never send entire blog database to LLM.

Use:

* Embeddings
* Vector Search
* Summaries

Send only:

* Relevant stories
* Relevant people
* Relevant memories

Target:

Less than 1500 tokens per request.

---

# Development Phases

Phase 1

Core Chat

Features:

* Personality
* Basic Memory
* Relationship Lookup

No Blogger Integration Yet

---

Phase 2

Story System

Features:

* Story Retrieval
* Story Summaries
* Memory Recall

---

Phase 3

Alias System

Features:

* Nickname Mapping
* Identity Resolution

---

Phase 4

Blogger Integration

Features:

* Auto Sync
* Auto Story Extraction

---

Phase 5

Brian Memories

Features:

* Remember Visitors
* Recall Previous Conversations

---

# Testing Strategy

DO NOT TEST USING PAID API FIRST.

Use:

* Mock Data
* Local Database
* Static Responses

Validate:

* Retrieval
* Alias Mapping
* Story Lookup

Before API Testing

Create 100+

Sample Memories

Create 50+

Relationship Records

Create 20+

Story Records

Only then connect LLM.

---

# Recommended Stack

Frontend:
Vanilla HTML5, CSS3, JavaScript (integrated into current Single-Page Application)

Backend:
Node.js + Express.js (integrated into current server.js & modular routers)

Database & Vector DB:
Supabase (PostgreSQL with pgvector extension)

Embedding Model:
Google Gen AI SDK (text-embedding-004)

LLM:
Gemini 2.5 Flash / Gemini 1.5 Flash (via official Google Gen AI SDK)

Deployment:
Docker container (deployed to existing host/service as part of the blendd portal)

---

# Success Criteria

A visitor should believe:

1. Brian knows Mehrab personally.
2. Brian remembers stories.
3. Brian recognizes friends.
4. Brian has opinions.
5. Brian feels like a younger brother.

If users describe Brian as "a chatbot", the project failed.

If users describe Brian as "your little brother", the project succeeded.
