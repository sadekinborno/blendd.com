# 🌌 blendd Portal — Tools & Mini Games Hub

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D%2022.0.0-blue.svg?style=for-the-badge&logo=node.js)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.21.2-green.svg?style=for-the-badge&logo=express)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.8.1-black.svg?style=for-the-badge&logo=socket.io)](https://socket.io/)
[![Google Gemini API](https://img.shields.io/badge/Gemini%20AI-0.21.0-orange.svg?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-emerald.svg?style=for-the-badge&logo=supabase)](https://supabase.com/)

Welcome to **blendd Portal**, an elegant, feature-rich web portal that combines robust web utilities, multiplayer social games, and a personality-driven AI companion into a single glassmorphic workspace. Created and designed by **Sadekin Borno**, this platform is built with a sleek UI, real-time WebSocket communication, and modern API integrations.

---

## 🎨 Visual Showcase

### Landing Page & Dashboard
The central dashboard greets users with smooth fade-in animations, a live digital clock, real-time server status checking, and quick access to all portals.
![Landing Page](images/Landing%20Page.png)

---

## 🚀 Key Modules

### 1. 📥 Media Downloader
A powerful utility that leverages `yt-dlp` to download high-quality videos or extract audio from major social and sharing platforms (YouTube, Twitter, Facebook, TikTok, and more).
* **Live Progress Tracking**: Uses server-sent updates to stream download progress directly to the user interface.
* **Audio Extraction**: Option to convert videos directly into high-fidelity MP3s.
* **Smart Binary Detection**: Automatically locates global `yt-dlp` instances, falling back to local Python pip execution setups.

### 2. 🔒 Link Saver (Link Vault)
A secure bookmarking system that allows users to store, filter, search, and categorize links with metadata.
* **Access Control**: Choose to store links as *Public*, *Restricted*, or *Private*.
* **Dynamic Search & Tags**: Instantly search by title, URL, or tags with a responsive search system.
* **Interactive Sorting**: Reorder and organize saved items smoothly using SortableJS.
![Link Vault](images/Link%20Vault.png)

### 3. 🎮 Arcade Zone (Real-Time Social Games)
A suite of interactive party games powered by Socket.io, enabling real-time local and multiplayer sessions.
* **CDBP (Social Deduction Game)**: A role-based team game of strategy and bluffing.
* **Who's the Worst (WTW)**: A voting game where friends vote on humorous and provocative player prompts.
* **Never Have I Ever (NHIE)**: A classic icebreaker game featuring hundreds of curated prompts.
![Arcade Games](images/Arcade%20Games.png)

### 4. 🤖 Brian AI (Personality-Driven Companion)
"Project Brian" is an AI younger brother representing Mehrab Sadekin Borno. Brian is not a generic assistant; he is a fully-realized character built using Google's Gemini API:
* **Memory & Relationship Layers**: Brian remembers user names, stores relationships (e.g. friends, family), and maintains a cohesive backstory.
* **Dynamic Moods**: Converses with loyalty, humor, slight sarcasm, and sibling pride.
* **Access Control**: Users can request access to chat with Brian, subject to owner approval.

### 5. 🛡️ Admin & Analytics Portal
An analytics dashboard for the administrator to keep track of site operations.
* **Real-Time Logging**: Displays server activity, network actions, and database status logs.
* **Visitor Tracking**: Graphs view counts across different sections (Dashboard, Downloader, Games, Link Saver).
* **User Management**: Approve or reject Brian AI access requests and manage user configurations.

---

## 🛠️ Tech Stack

### Frontend
* **UI & Styling**: Vanilla CSS featuring a premium dark mode, glassmorphism (`backdrop-filter`), responsive layout grids, and interactive CSS micro-animations.
* **Typography**: Plus Jakarta Sans & Space Grotesk via Google Fonts.
* **Libraries**: Lucide Icons, SortableJS, and marked.js for markdown rendering.

### Backend
* **Core Server**: Node.js & Express.js.
* **WebSockets**: Socket.io for multiplayer game lobbies and game state synchronization.
* **Downloader Core**: Python, FFmpeg, and `yt-dlp`.

### Database & AI
* **Database**: Supabase (PostgreSQL client) with local JSON files as a fallback when offline.
* **AI Engine**: Google Generative AI SDK (Gemini API) utilizing custom system instructions and memory stores.

---

## ⚙️ Environment Configuration

To run the application, configure your credentials in a `.env` file in the root directory:

```env
# Server Port
PORT=3000

# Admin / Owner Config
ADMIN_USERNAME=Borno

# Gemini API Key for Brian AI
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase Credentials (optional / required for database sync)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 💾 Database Schema Setup

If using Supabase, you can set up the database by executing the following scripts in your Supabase SQL Editor (all files are located inside the `database/` folder):

1. **`database/access_control.sql`**: Configures access permissions for Brian AI.
2. **`database/analytics_schema.sql`**: Creates analytics tables for page view counts and usage logging.
3. **`database/bookmarks_schema.sql`**: Configures tables for bookmarks/links storage and tag mappings.
4. **`database/brian_schema.sql`**: Initializes memories, relationships, and conversation storage for Brian AI.
5. **`database/nhie_schema.sql`** & **`database/wtw_schema.sql`**: Sets up custom question/prompt tables for games.

To seed Brian's core memories, run:
```bash
node database/seed_brian.js
```

---

## 📦 Setup & Installation

### Prerequisites
* **Node.js** (v22.0.0 or higher recommended)
* **Python 3** & **FFmpeg** (required for `yt-dlp` media downloader capabilities)

### Local Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/sadekinborno/TouchMe.git
   cd TouchMe
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Duplicate the env structure and create a `.env` file with your variables.

4. **Run the Server:**
   * **Development mode (Auto-restart):**
     ```bash
     npm run dev
     ```
   * **Production mode:**
     ```bash
     npm start
     ```
   * **Windows Quickstart:**
     Double-click `run.bat` to launch the server instantly on Windows.

### Docker Deployment

The project includes a multi-stage `Dockerfile` configured to pre-install Python, `yt-dlp`, and Node.js.

1. **Build the Image:**
   ```bash
   docker build -t blendd-portal .
   ```

2. **Run the Container:**
   ```bash
   docker run -d -p 3000:3000 --env-file .env --name blendd-portal-container blendd-portal
   ```

---

## 📄 License & Credits

Created with 💙 by **[Sadekin Borno](https://github.com/sadekinborno)**.

All rights reserved. Use of this portal is subject to owner permission and local security policies.
