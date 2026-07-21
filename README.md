# blendd.com Portal

A sleek, responsive web portal combining system utilities, real-time multiplayer social games, and a personality-driven AI assistant into a modern, glassmorphic workspace. Built with Node.js, Express, Socket.io, and Supabase.

---

## Visual Preview

| Landing Page | Link Vault | Arcade Games |
| :---: | :---: | :---: |
| ![Landing Page](images/Landing%20Page.png) | ![Link Vault](images/Link%20Vault.png) | ![Arcade Games](images/Arcade%20Games.png) |

---

## Key Features

* **Media Downloader**: Fast video and audio downloads powered by `yt-dlp` with real-time download progress tracking.
* **Link Vault**: Secure bookmarking system with tags, dynamic search, sorting (via SortableJS), and visibility control (Public/Restricted/Private).
* **Arcade Zone**: Real-time multiplayer party games (CDBP, Who's the Worst, Never Have I Ever) using WebSocket (Socket.io).
* **Brian AI**: Personality-driven conversational assistant powered by Google Gemini API, featuring persistent user relationships and custom memory layers.
* **Admin & Analytics**: Dashboard for viewing page analytics, active visitor counts, application logs, and managing AI access requests.

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Real-Time**: Socket.io
- **AI Integration**: Google Generative AI SDK (Gemini API)
- **Database**: Supabase (PostgreSQL client) with local JSON storage fallback
- **Frontend**: Vanilla HTML5/CSS3 (Glassmorphism, responsive grids), Lucide Icons, SortableJS, Marked.js

---

## Environment Configuration

Create a `.env` file in the root directory and configure the following variables:

```env
PORT=3000
ADMIN_USERNAME=your_admin_username
GEMINI_API_KEY=your_gemini_api_key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Database Schema Setup

To set up the Supabase database, execute the SQL scripts found in the `database/` directory:
1. `access_control.sql` — AI permission levels.
2. `analytics_schema.sql` — Metrics tracking.
3. `bookmarks_schema.sql` — Link vault tables.
4. `brian_schema.sql` — AI memory and relationships.
5. `nhie_schema.sql` & `wtw_schema.sql` — Game question datasets.

To populate the seed data for the AI's core memory:
```bash
node database/seed_brian.js
```

---

## Getting Started

### Prerequisites
* **Node.js** (v22.0.0 or higher recommended)
* **Python 3** & **FFmpeg** (required for `yt-dlp` downloads)

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sadekinborno/TouchMe.git
   cd TouchMe
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   - **Development Mode:** `npm run dev`
   - **Production Mode:** `npm start`
   - **Windows Run Shortcut:** Double-click `run.bat`

### Docker Support

1. **Build container:**
   ```bash
   docker build -t blendd-portal .
   ```
2. **Run container:**
   ```bash
   docker run -d -p 3000:3000 --env-file .env --name blendd-portal blendd-portal
   ```

---

## License & Credits

Created by **[Sadekin Borno](https://github.com/sadekinborno)**.

All rights reserved. Private distribution and usage subject to authorization.
