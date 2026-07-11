require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const https = require('https');
const url = require('url');
const crypto = require('crypto');
const supabase = require('./db');

// Utility: Hash password using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Utility: Generate a human-readable recovery code like BORNO-A3F9-X7Q2
function generateRecoveryCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `BORNO-${seg()}-${seg()}`;
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize CDBP Social Deduction Game
const initCDbpGame = require('./game_manager');
initCDbpGame(io);
initCDbpGame.bindIO(io);

// Initialize Who's the Worst Social Voting Game
const initWtwGame = require('./wtw_manager');
initWtwGame(io);
initWtwGame.bindIO(io);

// Initialize Never Have I Ever Social Game
const initNhieGame = require('./nhie_manager');
initNhieGame(io);
initNhieGame.bindIO(io);

const PORT = process.env.PORT || 3000;

// Setup directories
const DATA_DIR = path.join(__dirname, 'data');
const TEMP_DIR = path.join(__dirname, 'temp');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
if (!fs.existsSync(LINKS_FILE)) fs.writeFileSync(LINKS_FILE, JSON.stringify([], null, 2));
const USERS_FILE = path.join(DATA_DIR, 'users.json');
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));

const PRIVATE_BOOKMARKS_FILE = path.join(DATA_DIR, 'private_bookmarks.json');
const BOOKMARK_FOLDERS_FILE = path.join(DATA_DIR, 'bookmark_folders.json');
const USER_SAVED_FOLDERS_FILE = path.join(DATA_DIR, 'user_saved_folders.json');
const USER_HIDDEN_ITEMS_FILE = path.join(DATA_DIR, 'user_hidden_items.json');

if (!fs.existsSync(PRIVATE_BOOKMARKS_FILE)) fs.writeFileSync(PRIVATE_BOOKMARKS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(BOOKMARK_FOLDERS_FILE)) fs.writeFileSync(BOOKMARK_FOLDERS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(USER_SAVED_FOLDERS_FILE)) fs.writeFileSync(USER_SAVED_FOLDERS_FILE, JSON.stringify([], null, 2));
if (!fs.existsSync(USER_HIDDEN_ITEMS_FILE)) fs.writeFileSync(USER_HIDDEN_ITEMS_FILE, JSON.stringify([], null, 2));

const VIEW_COUNTS_FILE = path.join(DATA_DIR, 'view_counts.json');
const USAGE_LOGS_FILE = path.join(DATA_DIR, 'usage_logs.json');

if (!fs.existsSync(VIEW_COUNTS_FILE)) {
  fs.writeFileSync(VIEW_COUNTS_FILE, JSON.stringify({
    dashboard: 0,
    downloader: 0,
    linksaver: 0,
    games: 0,
    admin: 0
  }, null, 2));
}
if (!fs.existsSync(USAGE_LOGS_FILE)) {
  fs.writeFileSync(USAGE_LOGS_FILE, JSON.stringify([], null, 2));
}

async function trackUsage(username, action, req) {
  try {
    let ip = 'N/A';
    if (req) {
      ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      if (ip.includes('::ffff:')) {
        ip = ip.replace('::ffff:', '');
      }
    }

    let dbSuccess = false;
    try {
      const { error: insertError } = await supabase.from('usage_logs').insert({
        username: username || 'Guest',
        action: action,
        ip: ip
      });
      if (!insertError) {
        dbSuccess = true;
      }
    } catch (dbErr) {
      // Catch database errors gracefully (e.g. table not created yet)
    }

    if (!dbSuccess) {
      const logs = JSON.parse(fs.readFileSync(USAGE_LOGS_FILE, 'utf8') || '[]');
      logs.unshift({
        timestamp: new Date().toISOString(),
        username: username || 'Guest',
        action: action,
        ip: ip
      });
      if (logs.length > 1000) {
        logs.pop();
      }
      fs.writeFileSync(USAGE_LOGS_FILE, JSON.stringify(logs, null, 2));
    }
  } catch (e) {
    console.error('Error tracking usage:', e);
  }
}


// Owner Mode Security Configuration
const OWNER_CONFIG_FILE = path.join(DATA_DIR, 'owner_config.json');
let ownerPassword = process.env.OWNER_PASSWORD || 'pass';
if (fs.existsSync(OWNER_CONFIG_FILE)) {
  try {
    const config = JSON.parse(fs.readFileSync(OWNER_CONFIG_FILE, 'utf8'));
    if (config.password) {
      ownerPassword = config.password;
    }
  } catch (e) {
    console.error('Error reading owner_config.json:', e);
  }
}
const ownerSessionToken = uuidv4();

function requireOwner(req, res, next) {
  const token = req.headers['x-owner-token'];
  if (token && token === ownerSessionToken) {
    req.isOwner = true;
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized: Owner access required' });
  }
}

// Memory map to track download sessions
const activeDownloads = new Map();

// Detect available yt-dlp executable/wrapper
let pythonCommand = 'python';
let ytDlpArgsPrefix = ['-m', 'yt_dlp'];

function detectDownloader() {
  const { execSync } = require('child_process');
  
  // Try direct yt-dlp first
  try {
    execSync('yt-dlp --version', { stdio: 'ignore' });
    console.log('Downloader check: yt-dlp command is available directly');
    pythonCommand = 'yt-dlp';
    ytDlpArgsPrefix = [];
    return;
  } catch (e) {}

  // Try python3 -m yt_dlp
  try {
    execSync('python3 -m yt_dlp --version', { stdio: 'ignore' });
    console.log('Downloader check: python3 -m yt_dlp is available');
    pythonCommand = 'python3';
    ytDlpArgsPrefix = ['-m', 'yt_dlp'];
    return;
  } catch (e) {}

  // Try python -m yt_dlp
  try {
    execSync('python -m yt_dlp --version', { stdio: 'ignore' });
    console.log('Downloader check: python -m yt_dlp is available');
    pythonCommand = 'python';
    ytDlpArgsPrefix = ['-m', 'yt_dlp'];
    return;
  } catch (e) {}

  console.warn('WARNING: yt-dlp was not found on the server path! Downloader functionality will fail.');
}
detectDownloader();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Project Brian AI Router
const brianRouter = require('./brian_router');

// Middleware to restrict access to Brian AI (Bro Mode or Owner Only)
async function requireBrianAccess(req, res, next) {
  const ownerToken = req.headers['x-owner-token'];
  // Check if owner
  if (ownerToken && ownerToken === ownerSessionToken) {
    req.isOwner = true;
    return next();
  }

  // Check if approved guest
  const userName = req.headers['x-user-name'];
  if (!userName || userName.toLowerCase() === 'guest') {
    return res.status(401).json({ error: 'Unauthorized: Guest login required' });
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('brian_access')
      .ilike('username', userName.trim());

    if (error) {
      console.error('[Auth Middleware] Database error:', error.message);
      return res.status(500).json({ error: 'Database authentication error' });
    }

    if (data && data.length > 0 && data[0].brian_access === 'approved') {
      return next();
    }

    return res.status(403).json({ error: 'Forbidden: Brian AI access is pending or not approved' });
  } catch (err) {
    console.error('[Auth Middleware] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

app.use('/api/brian', requireBrianAccess, brianRouter);

// Cleanup temp files on server startup
fs.readdir(TEMP_DIR, (err, files) => {
  if (!err) {
    for (const file of files) {
      fs.unlink(path.join(TEMP_DIR, file), () => {});
    }
  }
});

// Helper: Extract domain name
function getDomainName(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return '';
  }
}

// Helper: Fetch URL title via native fetch
async function fetchUrlTitle(targetUrl) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    clearTimeout(timeoutId);

    const html = await response.text();
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : new URL(targetUrl).hostname;
    title = title
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");

    return { title, domain: new URL(targetUrl).hostname };
  } catch (e) {
    try {
      return { title: new URL(targetUrl).hostname, domain: new URL(targetUrl).hostname };
    } catch (err) {
      return { title: targetUrl, domain: '' };
    }
  }
}

// REST API: Video Info Extractor
app.get('/api/info', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) {
    return res.status(400).json({ error: 'URL query parameter is required' });
  }

  const args = [
    ...ytDlpArgsPrefix,
    '--socket-timeout', '10',
    '--no-playlist',
    '--no-warnings',
    '--no-cache-dir',
    '--dump-json',
    '--skip-download',
    videoUrl
  ];
  const ytDlp = spawn(pythonCommand, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  // Kill the process if it hangs more than 15 seconds
  const timeoutId = setTimeout(() => {
    console.warn('yt-dlp info process timed out, killing...');
    ytDlp.kill('SIGKILL');
  }, 15000);

  ytDlp.on('error', (err) => {
    clearTimeout(timeoutId);
    console.error('yt-dlp spawn error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Downloader not configured correctly or not found on the server.' });
    }
  });

  let stdout = '';
  let stderr = '';

  ytDlp.stdout.on('data', (data) => {
    stdout += data;
  });

  ytDlp.stderr.on('data', (data) => {
    stderr += data;
  });

  ytDlp.on('close', (code) => {
    clearTimeout(timeoutId);
    if (code !== 0) {
      console.error(`yt-dlp error: ${stderr}`);
      
      let friendlyError = 'Failed to fetch video information. Ensure the URL is valid.';
      let friendlyDetails = `Exit code: ${code}\nStdout: ${stdout}\nStderr: ${stderr}`;

      if (stderr.includes("confirm you’re not a bot") || stderr.includes("confirm you're not a bot") || stderr.includes("Sign in")) {
        friendlyError = "YouTube is blocking the hosted server's IP address.";
        friendlyDetails = "YouTube actively blocks cloud hosting platforms (like Render, Heroku, AWS) to prevent automated scraping, triggering their 'Sign in to confirm you're not a bot' check.\n\nWhy it works on localhost:\nYour local machine runs on a residential home internet connection which YouTube trusts. The hosted version on Render runs on a commercial datacenter IP, which YouTube blocks.\n\nHow to fix:\n1. Run the portal locally (highly recommended for personal use).\n2. Configure residential proxies on the hosted server.";
      }

      return res.status(400).json({ 
        error: friendlyError,
        details: friendlyDetails
      });
    }

    try {
      const meta = JSON.parse(stdout);
      
      // Filter video & audio qualities we can suggest
      const formats = [];
      
      // Standard video quality choices
      formats.push({ id: '1080p', label: '1080p MP4 (High Definition)', ext: 'mp4' });
      formats.push({ id: '720p', label: '720p MP4 (Standard Definition)', ext: 'mp4' });
      formats.push({ id: '480p', label: '480p MP4 (Medium)', ext: 'mp4' });
      formats.push({ id: 'best', label: 'Highest Quality Available', ext: 'mp4' });
      formats.push({ id: 'mp3', label: 'Audio Only (MP3 Extraction)', ext: 'mp3' });

      const requestUser = req.headers['x-user-name'] || 'Guest';
      trackUsage(requestUser, `Fetched media metadata for: "${meta.title}"`, req);

      res.json({
        title: meta.title,
        duration: meta.duration, // in seconds
        thumbnail: meta.thumbnail,
        uploader: meta.uploader || meta.channel || 'Unknown Uploader',
        description: meta.description ? meta.description.substring(0, 150) + '...' : '',
        formats: formats,
        originalUrl: videoUrl
      });
    } catch (e) {
      res.status(500).json({ error: 'Failed to parse video metadata' });
    }
  });
});

// REST API: Video Downloader Retrieval (File download handoff)
app.get('/api/retrieve/:token', (req, res) => {
  const token = req.params.token;
  const downloadDetails = activeDownloads.get(token);

  if (!downloadDetails) {
    return res.status(404).send('Download link expired or invalid.');
  }

  const filePath = downloadDetails.filePath;
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found on server.');
  }

  // Create clean download filename
  let safeTitle = downloadDetails.title.replace(/[^a-zA-Z0-9]/g, '_');
  if (safeTitle.length > 50) safeTitle = safeTitle.substring(0, 50);
  const ext = path.extname(filePath);
  const downloadName = `${safeTitle}${ext}`;

  res.download(filePath, downloadName, (err) => {
    // Delete file after download complete or error to free disk space
    fs.unlink(filePath, () => {
      activeDownloads.delete(token);
    });
  });
});

// Local JSON helper functions for bookmarks & folders
function readLocalPrivateBookmarks() {
  try {
    return JSON.parse(fs.readFileSync(PRIVATE_BOOKMARKS_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}
function writeLocalPrivateBookmarks(data) {
  fs.writeFileSync(PRIVATE_BOOKMARKS_FILE, JSON.stringify(data, null, 2));
}

function readLocalFolders() {
  try {
    return JSON.parse(fs.readFileSync(BOOKMARK_FOLDERS_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}
function writeLocalFolders(data) {
  fs.writeFileSync(BOOKMARK_FOLDERS_FILE, JSON.stringify(data, null, 2));
}

function readLocalUserSavedFolders() {
  try {
    return JSON.parse(fs.readFileSync(USER_SAVED_FOLDERS_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}
function writeLocalUserSavedFolders(data) {
  fs.writeFileSync(USER_SAVED_FOLDERS_FILE, JSON.stringify(data, null, 2));
}

function readLocalHiddenItems() {
  try {
    return JSON.parse(fs.readFileSync(USER_HIDDEN_ITEMS_FILE, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}
function writeLocalHiddenItems(data) {
  fs.writeFileSync(USER_HIDDEN_ITEMS_FILE, JSON.stringify(data, null, 2));
}

// Get the set of bookmark IDs hidden by a specific user
function getUserHiddenIds(username) {
  const all = readLocalHiddenItems();
  return new Set(
    all
      .filter(h => (h.username || '').toLowerCase() === username.toLowerCase())
      .map(h => h.bookmark_id)
  );
}

// REST API: Link Saver CRUD
app.get('/api/links', async (req, res) => {
  try {
    const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;
    const reqUser = req.headers['x-user-name'] || 'Guest';
    const mode = req.query.mode || 'shared';

    let data = [];
    if (mode === 'private') {
      let privateLinks = [];
      let savedFolderKeys = [];
      let sharedFoldersBookmarks = [];
      let dbSuccess = false;

      try {
        const { data: ownPrivate, error: ownPrivateErr } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('is_private', true)
          .ilike('owner_username', reqUser)
          .order('sort_order', { ascending: true, nullsFirst: false });

        if (!ownPrivateErr) {
          privateLinks = ownPrivate || [];
          dbSuccess = true;
        }

        const { data: savedFolders, error: savedFoldersErr } = await supabase
          .from('user_saved_folders')
          .select('link_key')
          .ilike('username', reqUser);

        if (!savedFoldersErr && savedFolders && savedFolders.length > 0) {
          savedFolderKeys = savedFolders.map(f => f.link_key);
          const { data: sharedBookmarks, error: sharedBookmarksErr } = await supabase
            .from('bookmarks')
            .select('*')
            .in('folder_key', savedFolderKeys)
            .order('sort_order', { ascending: true, nullsFirst: false });
          
          if (!sharedBookmarksErr) {
            sharedFoldersBookmarks = sharedBookmarks || [];
          }
        }
      } catch (e) {
        dbSuccess = false;
      }

      if (!dbSuccess) {
        const localBookmarks = readLocalPrivateBookmarks();
        const localSavedFolders = readLocalUserSavedFolders();

        privateLinks = localBookmarks.filter(item =>
          item.is_private === true &&
          item.is_deleted !== true &&
          (item.owner_username || '').toLowerCase() === reqUser.toLowerCase()
        );

        savedFolderKeys = localSavedFolders
          .filter(f => (f.username || '').toLowerCase() === reqUser.toLowerCase())
          .map(f => f.link_key);

        sharedFoldersBookmarks = localBookmarks.filter(item =>
          item.folder_key && savedFolderKeys.includes(item.folder_key)
        );
      }

      data = [...privateLinks, ...sharedFoldersBookmarks];
    } else {
      // Shared mode
      let dbSuccess = false;
      try {
        let { data: dbData, error: dbErr } = await supabase
          .from('bookmarks')
          .select('*')
          .eq('is_private', false)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('added_at', { ascending: false });

        if (dbErr && dbErr.message && dbErr.message.includes('is_private')) {
          const fallback = await supabase
            .from('bookmarks')
            .select('*')
            .order('sort_order', { ascending: true, nullsFirst: false })
            .order('added_at', { ascending: false });
          dbData = fallback.data;
          dbErr = fallback.error;
        }

        if (!dbErr) {
          data = dbData || [];
          dbSuccess = true;
        }
      } catch (e) {
        dbSuccess = false;
      }

      if (!dbSuccess) {
        const localBookmarks = readLocalPrivateBookmarks();
        data = localBookmarks.filter(item => item.is_private !== true);
      }
    }

    let currentMax = 0;
    if (data && data.length > 0) {
      data.forEach(item => {
        if (item.sort_order !== null && item.sort_order !== undefined) {
          currentMax = Math.max(currentMax, item.sort_order);
        }
      });
    }
    if (currentMax === 0) currentMax = 1000;

    // Get IDs the user has personally hidden from their space
    const userHiddenIds = mode === 'private' ? getUserHiddenIds(reqUser) : new Set();

    const filtered = (data || [])
      .filter(item => item.is_deleted !== true && item.deleted !== true)
      .filter(item => !userHiddenIds.has(String(item.id)))
      .filter(item => {
        if (!isOwnerRequest && item.hidden_by_admin === true) return false;
        return true;
      });

    filtered.forEach(item => {
      if (item.sort_order === null || item.sort_order === undefined) {
        currentMax += 10;
        item.sort_order = currentMax;
      }
    });

    const formatted = filtered.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      category: item.category,
      favicon: item.favicon,
      domain: item.domain,
      addedAt: item.added_at,
      addedBy: item.added_by || item.addedby || 'Owner',
      ownerUsername: item.owner_username || 'Owner',
      isPrivate: item.is_private === true,
      folderName: item.folder_name || null,
      folderKey: item.folder_key || null,
      hiddenByAdmin: item.hidden_by_admin === true,
      sortOrder: item.sort_order
    }));

    res.json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Link metadata auto-fetch and Save
app.post('/api/links', async (req, res) => {
  const { linkUrl, category, customTitle, favicon: inputFavicon, addedBy, isPrivate, folderName } = req.body;
  if (!linkUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  const reqUser = req.headers['x-user-name'] || 'Guest';
  const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;

  // Shared mode rule: Only admins (owner) can add public links
  if (isPrivate !== true && !isOwnerRequest) {
    return res.status(403).json({ error: 'Only admins can add bookmarks to the Shared Bookmark Hub' });
  }

  try {
    let title = customTitle ? customTitle.trim() : '';
    const domain = getDomainName(linkUrl);
    
    let favicon = inputFavicon;
    if (!favicon || favicon === 'auto') {
      favicon = `https://www.google.com/s2/favicons?sz=64&domain=${domain || 'google.com'}`;
    }

    if (!title) {
      const meta = await fetchUrlTitle(linkUrl);
      title = meta.title;
    }

    // Fetch the minimum sort_order in the category
    let minSortOrder = 1000;
    let hasSortOrderColumn = true;
    try {
      const { data: catData, error: catError } = await supabase
        .from('bookmarks')
        .select('sort_order')
        .eq('category', category || 'General')
        .order('sort_order', { ascending: true })
        .limit(1);

      if (catError) {
        if (catError.message && catError.message.includes('column "sort_order" does not exist')) {
          hasSortOrderColumn = false;
        }
      } else if (catData && catData.length > 0 && catData[0].sort_order !== null && catData[0].sort_order !== undefined) {
        minSortOrder = catData[0].sort_order - 10;
      }
    } catch (err) {
      console.warn('Failed to query min sort_order:', err);
    }

    // Insert logic
    let inserted;
    let dbSuccess = false;
    
    const insertObj = {
      title,
      url: linkUrl,
      category: category || 'General',
      favicon,
      domain,
      added_by: addedBy || reqUser,
      is_private: isPrivate === true,
      owner_username: reqUser,
      folder_name: folderName || null
    };

    if (hasSortOrderColumn) {
      insertObj.sort_order = minSortOrder;
    }

    try {
      let { data, error } = await supabase
        .from('bookmarks')
        .insert([insertObj])
        .select();

      if (error && error.message && (error.message.includes('is_private') || error.message.includes('owner_username'))) {
        throw new Error('New columns missing');
      }

      if (!error && data && data.length > 0) {
        inserted = data[0];
        dbSuccess = true;
      }
    } catch (e) {
      dbSuccess = false;
    }

    if (!dbSuccess) {
      const localBookmarks = readLocalPrivateBookmarks();
      inserted = {
        id: uuidv4(),
        title,
        url: linkUrl,
        category: category || 'General',
        favicon,
        domain,
        added_at: new Date().toISOString(),
        added_by: addedBy || reqUser,
        owner_username: reqUser,
        is_private: isPrivate === true,
        folder_name: folderName || null,
        folder_key: null,
        hidden_by_admin: false,
        sort_order: minSortOrder
      };
      localBookmarks.push(inserted);
      writeLocalPrivateBookmarks(localBookmarks);
    }

    const formatted = {
      id: inserted.id,
      title: inserted.title,
      url: inserted.url,
      category: inserted.category,
      favicon: inserted.favicon,
      domain: inserted.domain,
      addedAt: inserted.added_at,
      addedBy: inserted.added_by || inserted.addedby || 'Owner',
      ownerUsername: inserted.owner_username || 'Owner',
      isPrivate: inserted.is_private === true,
      folderName: inserted.folder_name || null,
      folderKey: inserted.folder_key || null,
      hiddenByAdmin: inserted.hidden_by_admin === true,
      sortOrder: inserted.sort_order
    };

    trackUsage(formatted.addedBy, `Created bookmark: "${formatted.title}"`, req);
    res.status(201).json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/links/:id', async (req, res) => {
  const id = req.params.id;
  const reqUser = req.headers['x-user-name'] || 'Guest';
  const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;

  try {
    let bookmark = null;
    let dbSuccess = false;

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        bookmark = data;
        dbSuccess = true;
      }
    } catch (e) {
      dbSuccess = false;
    }

    // Check local fallback if not found in DB
    if (!dbSuccess || !bookmark) {
      const localBookmarks = readLocalPrivateBookmarks();
      const index = localBookmarks.findIndex(b => b.id === id);
      if (index !== -1) {
        const localB = localBookmarks[index];
        const owner = (localB.owner_username || localB.added_by || 'Owner').toLowerCase();
        const reqUserLower = reqUser.toLowerCase();
        const isOwnItem = isOwnerRequest || owner === reqUserLower || owner === 'owner' || owner === 'guest';

        if (isOwnItem) {
          // Soft-delete own bookmark
          localB.is_deleted = true;
          writeLocalPrivateBookmarks(localBookmarks);
          trackUsage(reqUser, `Soft-deleted bookmark: "${localB.title}"`, req);
          return res.json({ message: 'Link deleted successfully' });
        } else {
          // Foreign item: add to user's personal hidden list
          const hidden = readLocalHiddenItems();
          const alreadyHidden = hidden.some(h =>
            h.bookmark_id === id && (h.username || '').toLowerCase() === reqUserLower
          );
          if (!alreadyHidden) {
            hidden.push({ username: reqUser, bookmark_id: id, hidden_at: new Date().toISOString() });
            writeLocalHiddenItems(hidden);
          }
          trackUsage(reqUser, `Removed foreign bookmark from space: "${localB.title}"`, req);
          return res.json({ message: 'Removed from your space' });
        }
      }

      if (!dbSuccess) {
        // Bookmark not found anywhere — hide it anyway to clear it from view
        const hidden = readLocalHiddenItems();
        const reqUserLower = reqUser.toLowerCase();
        const alreadyHidden = hidden.some(h =>
          h.bookmark_id === id && (h.username || '').toLowerCase() === reqUserLower
        );
        if (!alreadyHidden) {
          hidden.push({ username: reqUser, bookmark_id: id, hidden_at: new Date().toISOString() });
          writeLocalHiddenItems(hidden);
        }
        return res.json({ message: 'Removed from your space' });
      }
    }

    if (bookmark) {
      const owner = (bookmark.owner_username || bookmark.added_by || bookmark.addedby || 'Owner').toLowerCase();
      const reqUserLower = reqUser.toLowerCase();
      const isOwnItem = isOwnerRequest || owner === reqUserLower || owner === 'owner' || owner === 'guest';

      if (isOwnItem) {
        // Soft-delete own bookmark in DB
        let { error } = await supabase
          .from('bookmarks')
          .update({ is_deleted: true })
          .eq('id', id);

        if (error && error.message && error.message.includes('is_deleted')) {
          console.warn('[Supabase] "is_deleted" column missing. Falling back to hard delete.');
          const hardDeleteResult = await supabase.from('bookmarks').delete().eq('id', id);
          error = hardDeleteResult.error;
        }

        if (error) {
          console.error('Delete bookmark error:', error.message);
          return res.status(500).json({ error: 'Could not delete bookmark' });
        }

        trackUsage(reqUser, `Deleted bookmark: "${bookmark.title}"`, req);
        return res.json({ message: 'Link deleted successfully' });
      } else {
        // Foreign item: add to user's personal hidden list (local fallback)
        const hidden = readLocalHiddenItems();
        const alreadyHidden = hidden.some(h =>
          h.bookmark_id === id && (h.username || '').toLowerCase() === reqUserLower
        );
        if (!alreadyHidden) {
          hidden.push({ username: reqUser, bookmark_id: id, hidden_at: new Date().toISOString() });
          writeLocalHiddenItems(hidden);
        }
        trackUsage(reqUser, `Removed foreign bookmark from space: "${bookmark.title}"`, req);
        return res.json({ message: 'Removed from your space' });
      }
    }
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/links/:id', async (req, res) => {
  const id = req.params.id;
  const reqUser = req.headers['x-user-name'] || 'Guest';
  const { linkUrl, category, customTitle, favicon: inputFavicon, addedBy, folderName } = req.body;

  if (!linkUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    let bookmark = null;
    let dbSuccess = false;

    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (!error && data) {
        bookmark = data;
        dbSuccess = true;
      }
    } catch (e) {
      dbSuccess = false;
    }

    let title = customTitle ? customTitle.trim() : '';
    const domain = getDomainName(linkUrl);
    
    let favicon = inputFavicon;
    if (!favicon || favicon === 'auto') {
      favicon = `https://www.google.com/s2/favicons?sz=64&domain=${domain || 'google.com'}`;
    }

    if (!title) {
      const meta = await fetchUrlTitle(linkUrl);
      title = meta.title;
    }

    if (!dbSuccess || !bookmark) {
      const localBookmarks = readLocalPrivateBookmarks();
      const index = localBookmarks.findIndex(b => b.id === id);
      if (index !== -1) {
        const localB = localBookmarks[index];
        const owner = localB.owner_username || localB.added_by || 'Owner';
        const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;
        const ownerLower = owner.toLowerCase();
        const reqUserLower = reqUser.toLowerCase();
        const isDefaultOwner = ownerLower === 'owner' || ownerLower === 'guest';
        if (!isOwnerRequest && ownerLower !== reqUserLower && !isDefaultOwner) {
          return res.status(403).json({ error: 'You can only edit your own bookmarks' });
        }

        localB.title = title;
        localB.url = linkUrl;
        localB.category = category || 'General';
        localB.favicon = favicon;
        localB.domain = domain;
        localB.folder_name = folderName || null;
        
        writeLocalPrivateBookmarks(localBookmarks);

        const formatted = {
          id: localB.id,
          title: localB.title,
          url: localB.url,
          category: localB.category,
          favicon: localB.favicon,
          domain: localB.domain,
          addedAt: localB.added_at,
          addedBy: localB.added_by || 'Owner',
          ownerUsername: localB.owner_username || 'Owner',
          isPrivate: localB.is_private === true,
          folderName: localB.folder_name || null,
          folderKey: localB.folder_key || null,
          hiddenByAdmin: localB.hidden_by_admin === true
        };

        trackUsage(reqUser, `Updated bookmark: "${formatted.title}"`, req);
        return res.json(formatted);
      }

      if (!dbSuccess) {
        return res.status(404).json({ error: 'Bookmark not found' });
      }
    }

    if (bookmark) {
      const owner = bookmark.owner_username || bookmark.added_by || bookmark.addedby || 'Owner';
      const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;
      const ownerLower = owner.toLowerCase();
      const reqUserLower = reqUser.toLowerCase();
      const isDefaultOwner = ownerLower === 'owner' || ownerLower === 'guest';
      if (!isOwnerRequest && ownerLower !== reqUserLower && !isDefaultOwner) {
        return res.status(403).json({ error: 'You can only edit your own bookmarks' });
      }

      const updateObj = {
        title,
        url: linkUrl,
        category: category || 'General',
        favicon,
        domain,
        folder_name: folderName || null
      };

      let updatedRow;
      let updateSuccess = false;
      try {
        let { data, error } = await supabase
          .from('bookmarks')
          .update(updateObj)
          .eq('id', id)
          .select();

        if (error && error.message && error.message.includes('folder_name')) {
          delete updateObj.folder_name;
          const retry = await supabase
            .from('bookmarks')
            .update(updateObj)
            .eq('id', id)
            .select();
          data = retry.data;
          error = retry.error;
        }

        if (!error && data && data.length > 0) {
          updatedRow = data[0];
          updateSuccess = true;
        }
      } catch (e) {
        updateSuccess = false;
      }

      if (!updateSuccess) {
        const localBookmarks = readLocalPrivateBookmarks();
        let localB = localBookmarks.find(b => b.id === id);
        if (!localB) {
          localB = {
            ...bookmark,
            is_private: bookmark.is_private === true,
            owner_username: bookmark.owner_username || owner
          };
          localBookmarks.push(localB);
        }
        localB.title = title;
        localB.url = linkUrl;
        localB.category = category || 'General';
        localB.favicon = favicon;
        localB.domain = domain;
        localB.folder_name = folderName || null;
        writeLocalPrivateBookmarks(localBookmarks);
        updatedRow = localB;
      }

      const formatted = {
        id: updatedRow.id,
        title: updatedRow.title,
        url: updatedRow.url,
        category: updatedRow.category,
        favicon: updatedRow.favicon,
        domain: updatedRow.domain,
        addedAt: updatedRow.added_at,
        addedBy: updatedRow.added_by || updatedRow.addedby || 'Owner',
        ownerUsername: updatedRow.owner_username || 'Owner',
        isPrivate: updatedRow.is_private === true,
        folderName: updatedRow.folder_name || null,
        folderKey: updatedRow.folder_key || null,
        hiddenByAdmin: updatedRow.hidden_by_admin === true
      };

      trackUsage(reqUser, `Updated bookmark: "${formatted.title}"`, req);
      res.json(formatted);
    }
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Folder Sharing & Subscriptions
app.post('/api/folders/share', async (req, res) => {
  const { folderName } = req.body;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  if (!folderName) {
    return res.status(400).json({ error: 'Folder name is required' });
  }

  // Generate unique linkKey
  const prefix = folderName.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toLowerCase();
  const linkKey = `${prefix}-${Math.random().toString(36).substring(2, 7)}`;

  try {
    let dbSuccess = false;
    try {
      const { data, error } = await supabase
        .from('bookmark_folders')
        .insert([{
          folder_name: folderName,
          link_key: linkKey,
          owner_username: reqUser
        }])
        .select();

      if (!error && data && data.length > 0) {
        const { error: updateError } = await supabase
          .from('bookmarks')
          .update({ folder_key: linkKey })
          .eq('is_private', true)
          .ilike('owner_username', reqUser)
          .eq('folder_name', folderName);

        if (!updateError) {
          dbSuccess = true;
        }
      }
    } catch (e) {
      dbSuccess = false;
    }

    if (!dbSuccess) {
      const localFolders = readLocalFolders();
      localFolders.push({
        folder_name: folderName,
        link_key: linkKey,
        owner_username: reqUser,
        created_at: new Date().toISOString()
      });
      writeLocalFolders(localFolders);

      const localBookmarks = readLocalPrivateBookmarks();
      localBookmarks.forEach(b => {
        if (b.is_private === true &&
            (b.owner_username || '').toLowerCase() === reqUser.toLowerCase() &&
            b.folder_name === folderName) {
          b.folder_key = linkKey;
        }
      });
      writeLocalPrivateBookmarks(localBookmarks);
    }

    trackUsage(reqUser, `Generated linkKey for folder: "${folderName}"`, req);
    res.json({ linkKey });
  } catch (err) {
    console.error('Share folder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/folders/save', async (req, res) => {
  const { linkKey } = req.body;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  if (!linkKey) {
    return res.status(400).json({ error: 'Link key is required' });
  }

  try {
    let folder = null;
    let dbSuccess = false;

    try {
      const { data, error } = await supabase
        .from('bookmark_folders')
        .select('*')
        .eq('link_key', linkKey)
        .maybeSingle();

      if (!error && data) {
        folder = data;
        dbSuccess = true;
      }
    } catch (e) {
      dbSuccess = false;
    }

    if (!dbSuccess || !folder) {
      const localFolders = readLocalFolders();
      folder = localFolders.find(f => f.link_key === linkKey);
      if (!folder) {
        return res.status(404).json({ error: 'Invalid link key. Folder not found.' });
      }
    }

    if (folder.owner_username.toLowerCase() === reqUser.toLowerCase()) {
      return res.status(400).json({ error: 'You cannot import your own folder.' });
    }

    let saveSuccess = false;
    try {
      const { error } = await supabase
        .from('user_saved_folders')
        .insert([{
          username: reqUser,
          link_key: linkKey
        }]);

      if (!error || (error.message && error.message.includes('unique'))) {
        saveSuccess = true;
      }
    } catch (e) {
      saveSuccess = false;
    }

    if (!saveSuccess) {
      const localSaved = readLocalUserSavedFolders();
      const exists = localSaved.some(s =>
        (s.username || '').toLowerCase() === reqUser.toLowerCase() &&
        s.link_key === linkKey
      );
      if (!exists) {
        localSaved.push({
          username: reqUser,
          link_key: linkKey,
          saved_at: new Date().toISOString()
        });
        writeLocalUserSavedFolders(localSaved);
      }
    }

    trackUsage(reqUser, `Imported shared folder: "${folder.folder_name}"`, req);
    res.json({ folderName: folder.folder_name, ownerUsername: folder.owner_username });
  } catch (err) {
    console.error('Save folder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/folders/unsave', async (req, res) => {
  const { linkKey } = req.body;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  if (!linkKey) {
    return res.status(400).json({ error: 'Link key is required' });
  }

  try {
    let dbSuccess = false;
    try {
      const { error } = await supabase
        .from('user_saved_folders')
        .delete()
        .eq('username', reqUser)
        .eq('link_key', linkKey);

      if (!error) {
        dbSuccess = true;
      }
    } catch (e) {
      dbSuccess = false;
    }

    if (!dbSuccess) {
      const localSaved = readLocalUserSavedFolders();
      const filtered = localSaved.filter(s =>
        !((s.username || '').toLowerCase() === reqUser.toLowerCase() && s.link_key === linkKey)
      );
      writeLocalUserSavedFolders(filtered);
    }

    trackUsage(reqUser, `Unsaved/Unsubscribed shared folder key: "${linkKey}"`, req);
    res.json({ message: 'Folder unsaved successfully' });
  } catch (err) {
    console.error('Unsave folder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Batch copy bookmarks from Shared to Private space
app.post('/api/links/copy-batch', async (req, res) => {
  const { linkIds, folderName } = req.body;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
    return res.status(400).json({ error: 'linkIds must be a non-empty array' });
  }

  try {
    let dbSuccess = false;
    let copiedLinks = [];

    // Try DB first
    try {
      const { data: sourceLinks, error: selectError } = await supabase
        .from('bookmarks')
        .select('*')
        .in('id', linkIds);

      if (!selectError && sourceLinks && sourceLinks.length > 0) {
        dbSuccess = true;
        const insertObjects = sourceLinks.map(link => ({
          title: link.title,
          url: link.url,
          category: link.category,
          favicon: link.favicon,
          domain: link.domain,
          added_by: reqUser,
          is_private: true,
          owner_username: reqUser,
          folder_name: folderName || null,
          sort_order: link.sort_order
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('bookmarks')
          .insert(insertObjects)
          .select();

        if (!insertError && inserted) {
          copiedLinks = inserted;
        } else {
          dbSuccess = false;
        }
      }
    } catch (e) {
      dbSuccess = false;
    }

    if (!dbSuccess) {
      const localBookmarks = readLocalPrivateBookmarks();
      const sourceLinks = localBookmarks.filter(b => linkIds.includes(b.id));
      
      sourceLinks.forEach(link => {
        const newLink = {
          id: uuidv4(),
          title: link.title,
          url: link.url,
          category: link.category,
          favicon: link.favicon,
          domain: link.domain,
          added_at: new Date().toISOString(),
          added_by: reqUser,
          owner_username: reqUser,
          is_private: true,
          folder_name: folderName || null,
          folder_key: null,
          hidden_by_admin: false,
          sort_order: link.sort_order
        };
        localBookmarks.push(newLink);
        copiedLinks.push(newLink);
      });
      writeLocalPrivateBookmarks(localBookmarks);
    }

    trackUsage(reqUser, `Batch copied ${copiedLinks.length} bookmarks to folder "${folderName || 'General'}"`, req);
    res.json({ success: true, count: copiedLinks.length });
  } catch (err) {
    console.error('Copy batch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Clone a shared folder into a local private folder
app.post('/api/folders/clone', async (req, res) => {
  const { folderKey, targetFolderName } = req.body;
  const reqUser = req.headers['x-user-name'] || 'Guest';

  if (!folderKey || !targetFolderName) {
    return res.status(400).json({ error: 'folderKey and targetFolderName are required' });
  }

  try {
    let dbSuccess = false;
    let copiedCount = 0;

    try {
      const { data: sourceLinks, error: selectError } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('folder_key', folderKey);

      if (!selectError && sourceLinks && sourceLinks.length > 0) {
        dbSuccess = true;
        const insertObjects = sourceLinks.map(link => ({
          title: link.title,
          url: link.url,
          category: link.category,
          favicon: link.favicon,
          domain: link.domain,
          added_by: reqUser,
          is_private: true,
          owner_username: reqUser,
          folder_name: targetFolderName,
          sort_order: link.sort_order
        }));

        const { data: inserted, error: insertError } = await supabase
          .from('bookmarks')
          .insert(insertObjects)
          .select();

        if (!insertError && inserted) {
          copiedCount = inserted.length;
        } else {
          dbSuccess = false;
        }
      }
    } catch (e) {
      dbSuccess = false;
    }

    if (!dbSuccess) {
      const localBookmarks = readLocalPrivateBookmarks();
      const sourceLinks = localBookmarks.filter(b => b.folder_key === folderKey);

      sourceLinks.forEach(link => {
        const newLink = {
          id: uuidv4(),
          title: link.title,
          url: link.url,
          category: link.category,
          favicon: link.favicon,
          domain: link.domain,
          added_at: new Date().toISOString(),
          added_by: reqUser,
          owner_username: reqUser,
          is_private: true,
          folder_name: targetFolderName,
          folder_key: null,
          hidden_by_admin: false,
          sort_order: link.sort_order
        };
        localBookmarks.push(newLink);
        copiedCount++;
      });
      writeLocalPrivateBookmarks(localBookmarks);
    }

    trackUsage(reqUser, `Cloned shared folder key "${folderKey}" to private folder "${targetFolderName}"`, req);
    res.json({ success: true, count: copiedCount });
  } catch (err) {
    console.error('Clone folder error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Bulk delete/hide multiple bookmarks
app.delete('/api/bookmarks/bulk', async (req, res) => {
  const reqUser = req.headers['x-user-name'] || 'Guest';
  const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'No IDs provided' });
  }

  let deleted = 0;
  let hidden = 0;
  const reqUserLower = reqUser.toLowerCase();

  for (const id of ids) {
    try {
      let bookmark = null;
      let dbSuccess = false;

      try {
        const { data, error } = await supabase.from('bookmarks').select('*').eq('id', id).maybeSingle();
        if (!error && data) { bookmark = data; dbSuccess = true; }
      } catch (e) { dbSuccess = false; }

      if (!dbSuccess || !bookmark) {
        // Try local JSON
        const localBookmarks = readLocalPrivateBookmarks();
        const idx = localBookmarks.findIndex(b => b.id === id);
        if (idx !== -1) {
          const localB = localBookmarks[idx];
          const owner = (localB.owner_username || localB.added_by || 'Owner').toLowerCase();
          const isOwn = isOwnerRequest || owner === reqUserLower || owner === 'owner' || owner === 'guest';
          if (isOwn) {
            localB.is_deleted = true;
            deleted++;
          } else {
            const hiddenList = readLocalHiddenItems();
            const already = hiddenList.some(h => h.bookmark_id === id && (h.username || '').toLowerCase() === reqUserLower);
            if (!already) hiddenList.push({ username: reqUser, bookmark_id: id, hidden_at: new Date().toISOString() });
            writeLocalHiddenItems(hiddenList);
            hidden++;
          }
          writeLocalPrivateBookmarks(localBookmarks);
        }
        continue;
      }

      const owner = (bookmark.owner_username || bookmark.added_by || 'Owner').toLowerCase();
      const isOwn = isOwnerRequest || owner === reqUserLower || owner === 'owner' || owner === 'guest';

      if (isOwn) {
        let { error } = await supabase.from('bookmarks').update({ is_deleted: true }).eq('id', id);
        if (error && error.message && error.message.includes('is_deleted')) {
          await supabase.from('bookmarks').delete().eq('id', id);
        }
        deleted++;
      } else {
        const hiddenList = readLocalHiddenItems();
        const already = hiddenList.some(h => h.bookmark_id === id && (h.username || '').toLowerCase() === reqUserLower);
        if (!already) hiddenList.push({ username: reqUser, bookmark_id: id, hidden_at: new Date().toISOString() });
        writeLocalHiddenItems(hiddenList);
        hidden++;
      }
    } catch (err) {
      console.error(`Bulk delete error for id ${id}:`, err.message);
    }
  }

  trackUsage(reqUser, `Bulk removed ${deleted + hidden} bookmarks (${deleted} deleted, ${hidden} hidden)`, req);
  res.json({ message: 'Bulk operation complete', deleted, hidden, total: deleted + hidden });
});

// REST API: Clear all unfiled (General) private bookmarks for a user

app.delete('/api/bookmarks/clear-general', async (req, res) => {
  const reqUser = req.headers['x-user-name'] || 'Guest';

  try {
    let count = 0;
    let dbSuccess = false;

    // Try Supabase first
    try {
      // Find all unfiled private bookmarks for this user
      const { data: toDelete, error: findErr } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('is_private', true)
        .ilike('owner_username', reqUser)
        .is('folder_name', null)
        .is('folder_key', null);

      if (!findErr) {
        if (toDelete && toDelete.length > 0) {
          const ids = toDelete.map(b => b.id);
          const { error: delErr } = await supabase
            .from('bookmarks')
            .update({ is_deleted: true })
            .in('id', ids);

          if (!delErr) {
            count = ids.length;
            dbSuccess = true;
          } else if (delErr.message && delErr.message.includes('is_deleted')) {
            // Hard delete fallback if is_deleted column doesn't exist
            const { error: hardDelErr } = await supabase
              .from('bookmarks')
              .delete()
              .in('id', ids);
            if (!hardDelErr) {
              count = ids.length;
              dbSuccess = true;
            }
          }
        } else {
          dbSuccess = true; // Nothing to delete
          count = 0;
        }
      }
    } catch (e) {
      dbSuccess = false;
    }

    // Local JSON fallback
    if (!dbSuccess) {
      const localBookmarks = readLocalPrivateBookmarks();
      let deleted = 0;
      const updated = localBookmarks.map(b => {
        const isMatch = b.is_private === true &&
          (b.owner_username || '').toLowerCase() === reqUser.toLowerCase() &&
          !b.folder_name &&
          !b.folder_key &&
          !b.is_deleted;
        if (isMatch) {
          deleted++;
          return { ...b, is_deleted: true };
        }
        return b;
      });
      count = deleted;
      writeLocalPrivateBookmarks(updated);
    }

    trackUsage(reqUser, `Cleared ${count} general (unfiled) private bookmarks`, req);
    res.json({ message: 'General bookmarks cleared', count });
  } catch (err) {
    console.error('Clear general bookmarks error:', err);
    res.status(500).json({ error: 'Failed to clear general bookmarks' });
  }
});

// REST API: Delete a folder and all its bookmarks
app.delete('/api/folders', async (req, res) => {
  const reqUser = req.headers['x-user-name'] || 'Guest';
  const ownerSessionToken = process.env.OWNER_SESSION_TOKEN || ''; // we can read or use existing ownerSessionToken if initialized
  const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;
  const { folderName } = req.query;

  if (!folderName) {
    return res.status(400).json({ error: 'folderName is required' });
  }

  try {
    let dbSuccess = false;
    
    // 1. Try deleting from Supabase
    try {
      // Find the folder key first if it exists
      const { data: folderInfo, error: findErr } = await supabase
        .from('bookmark_folders')
        .select('link_key')
        .eq('folder_name', folderName)
        .ilike('owner_username', reqUser)
        .maybeSingle();

      const linkKey = (!findErr && folderInfo) ? folderInfo.link_key : null;

      // Delete the folder key from bookmark_folders
      await supabase
        .from('bookmark_folders')
        .delete()
        .eq('folder_name', folderName)
        .ilike('owner_username', reqUser);

      // If it was shared, we also remove subscriptions to it
      if (linkKey) {
        await supabase
          .from('user_saved_folders')
          .delete()
          .eq('link_key', linkKey);
      }

      // Delete all bookmarks in this folder belonging to this owner
      const deleteQuery = supabase
        .from('bookmarks')
        .delete();
        
      if (linkKey) {
        const { error: delErr } = await deleteQuery
          .or(`and(folder_name.eq."${folderName}",owner_username.ilike."${reqUser}"),folder_key.eq."${linkKey}"`);
        if (!delErr) dbSuccess = true;
      } else {
        const { error: delErr } = await deleteQuery
          .eq('folder_name', folderName)
          .ilike('owner_username', reqUser);
        if (!delErr) dbSuccess = true;
      }
    } catch (e) {
      dbSuccess = false;
    }

    // 2. Local fallback if DB failed
    if (!dbSuccess) {
      const localBookmarks = readLocalPrivateBookmarks();
      const localFolders = readLocalFolders();
      const localSavedFolders = readLocalUserSavedFolders();

      // Find the folder key
      const folderInfo = localFolders.find(f => 
        f.folder_name === folderName && 
        (f.owner_username || '').toLowerCase() === reqUser.toLowerCase()
      );
      const linkKey = folderInfo ? folderInfo.link_key : null;

      // Filter out bookmarks in this folder
      const updatedBookmarks = localBookmarks.filter(item => {
        const isMatch = (item.folder_name === folderName && (item.owner_username || '').toLowerCase() === reqUser.toLowerCase()) ||
                        (linkKey && item.folder_key === linkKey);
        return !isMatch;
      });
      writeLocalPrivateBookmarks(updatedBookmarks);

      // Remove from folders
      const updatedFolders = localFolders.filter(f => 
        !(f.folder_name === folderName && (f.owner_username || '').toLowerCase() === reqUser.toLowerCase())
      );
      writeLocalFolders(updatedFolders);

      // Remove subscriptions
      if (linkKey) {
        const updatedSavedFolders = localSavedFolders.filter(s => s.link_key !== linkKey);
        writeLocalUserSavedFolders(updatedSavedFolders);
      }
    }

    trackUsage(reqUser, `Deleted folder: "${folderName}" and its bookmarks`, req);
    res.json({ message: `Successfully deleted folder "${folderName}"` });
  } catch (err) {
    console.error('Delete folder error:', err);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
});


// Periodic folder key reset/rotation
async function resetFolderKeys() {
  console.log('[Folder Keys] Starting periodic folder key reset...');
  try {
    let dbSuccess = false;
    try {
      const { data: dbFolders, error: getErr } = await supabase
        .from('bookmark_folders')
        .select('*');

      if (!getErr && dbFolders && dbFolders.length > 0) {
        dbSuccess = true;
        for (const folder of dbFolders) {
          const oldKey = folder.link_key;
          const prefix = folder.folder_name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toLowerCase();
          const newKey = `${prefix}-${Math.random().toString(36).substring(2, 7)}`;
          
          await supabase
            .from('bookmark_folders')
            .update({ link_key: newKey })
            .eq('id', folder.id);

          await supabase
            .from('bookmarks')
            .update({ folder_key: newKey })
            .eq('folder_key', oldKey);

          await supabase
            .from('user_saved_folders')
            .update({ link_key: newKey })
            .eq('link_key', oldKey);
        }
      }
    } catch (dbErr) {
      dbSuccess = false;
    }

    // Local files key update
    const localFolders = readLocalFolders();
    if (localFolders.length > 0) {
      const localBookmarks = readLocalPrivateBookmarks();
      const localSavedFolders = readLocalUserSavedFolders();

      localFolders.forEach(folder => {
        const oldKey = folder.link_key;
        const prefix = folder.folder_name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toLowerCase();
        const newKey = `${prefix}-${Math.random().toString(36).substring(2, 7)}`;

        folder.link_key = newKey;

        localBookmarks.forEach(b => {
          if (b.folder_key === oldKey) {
            b.folder_key = newKey;
          }
        });

        localSavedFolders.forEach(sf => {
          if (sf.link_key === oldKey) {
            sf.link_key = newKey;
          }
        });
      });

      writeLocalFolders(localFolders);
      writeLocalPrivateBookmarks(localBookmarks);
      writeLocalUserSavedFolders(localSavedFolders);
    }
    console.log('[Folder Keys] Folder keys successfully rotated.');
  } catch (err) {
    console.error('[Folder Keys] Failed to reset folder keys:', err);
  }
}

// Rotate folder keys on startup, then every 30 minutes
setTimeout(resetFolderKeys, 5000);
setInterval(resetFolderKeys, 1000 * 60 * 30);

// Toggle bookmark visibility (admin hide/unhide)
app.patch('/api/links/:id/visibility', async (req, res) => {
  const id = req.params.id;
  const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;

  if (!isOwnerRequest) {
    return res.status(401).json({ error: 'Unauthorized: Owner access required' });
  }

  const { hidden } = req.body;
  if (typeof hidden !== 'boolean') {
    return res.status(400).json({ error: '"hidden" must be a boolean' });
  }

  try {
    let { data, error } = await supabase
      .from('bookmarks')
      .update({ hidden_by_admin: hidden })
      .eq('id', id)
      .select();

    // Defensive: if column doesn't exist yet, return a helpful error
    if (error && error.message && error.message.includes('hidden_by_admin')) {
      console.error('[Supabase] "hidden_by_admin" column does not exist. Please run: ALTER TABLE bookmarks ADD COLUMN hidden_by_admin BOOLEAN DEFAULT FALSE;');
      return res.status(500).json({ error: 'Database column "hidden_by_admin" not found. Please add it to your bookmarks table.' });
    }

    if (error) {
      console.error('Toggle visibility error:', error.message);
      return res.status(500).json({ error: 'Could not update visibility' });
    }

    if (!data || data.length === 0) {
      console.warn('[Supabase] No rows updated. This usually happens if Row Level Security (RLS) is enabled on the "bookmarks" table and there is no UPDATE policy. Please run: ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;');
      return res.status(404).json({ error: 'Bookmark not found (No rows updated. Make sure Row Level Security is disabled or configured properly on the bookmarks table).' });
    }

    const updated = data[0];
    const formatted = {
      id: updated.id,
      title: updated.title,
      url: updated.url,
      category: updated.category,
      favicon: updated.favicon,
      domain: updated.domain,
      addedAt: updated.added_at,
      addedBy: updated.added_by || updated.addedby || 'Owner',
      hiddenByAdmin: updated.hidden_by_admin === true
    };

    trackUsage('Owner', `${hidden ? 'Hid' : 'Unhid'} bookmark: "${formatted.title}"`, req);
    res.json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reorder bookmark (admin/owner only)
app.patch('/api/links/:id/reorder', async (req, res) => {
  const id = req.params.id;
  const isOwnerRequest = req.headers['x-owner-token'] === ownerSessionToken;

  if (!isOwnerRequest) {
    return res.status(401).json({ error: 'Unauthorized: Owner access required' });
  }

  const { category, sortOrder } = req.body;
  if (!category || typeof sortOrder !== 'number') {
    return res.status(400).json({ error: 'category (string) and sortOrder (number) are required' });
  }

  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .update({
        category: category,
        sort_order: sortOrder
      })
      .eq('id', id)
      .select();

    if (error && error.message && error.message.includes('column "sort_order" does not exist')) {
      console.error('[Supabase] "sort_order" column does not exist. Please run: ALTER TABLE bookmarks ADD COLUMN sort_order FLOAT;');
      return res.status(500).json({ error: 'Database column "sort_order" not found. Please add it to your bookmarks table.' });
    }

    if (error) {
      console.error('Reorder bookmark error:', error.message);
      return res.status(500).json({ error: 'Could not reorder bookmark' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    const inserted = data[0];
    const formatted = {
      id: inserted.id,
      title: inserted.title,
      url: inserted.url,
      category: inserted.category,
      favicon: inserted.favicon,
      domain: inserted.domain,
      addedAt: inserted.added_at,
      addedBy: inserted.added_by || inserted.addedby || 'Owner',
      hiddenByAdmin: inserted.hidden_by_admin === true,
      sortOrder: inserted.sort_order
    };

    trackUsage('Owner', `Reordered bookmark: "${formatted.title}" in category "${formatted.category}"`, req);
    res.json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Guest Auth Signup
app.post('/api/auth/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (cleanUsername.length < 2) {
    return res.status(400).json({ error: 'Username must be at least 2 characters long' });
  }

  try {
    // Check if user exists in Supabase (case-insensitive)
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('username')
      .ilike('username', cleanUsername);

    if (checkError) {
      console.error('Signup Check Error:', checkError.message);
      return res.status(500).json({ error: 'Database error during signup' });
    }

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash the password securely using SHA-256 before inserting
    const hashedPasswordStr = hashPassword(cleanPassword);

    // Generate a recovery code (shown once to user, stored hashed)
    const rawRecoveryCode = generateRecoveryCode();
    const hashedRecoveryCode = hashPassword(rawRecoveryCode);

    // Insert new user with hashed password and hashed recovery code
    let insertError;
    try {
      const result = await supabase
        .from('users')
        .insert([{ 
          username: cleanUsername, 
          password: hashedPasswordStr, 
          recovery_code: hashedRecoveryCode,
          display_name: cleanUsername,
          bio: ''
        }]);
      insertError = result.error;
    } catch (err) {
      insertError = err;
    }

    if (insertError && (insertError.message?.includes('column') || insertError.message?.includes('does not exist'))) {
      console.warn('[Supabase] Display name / bio columns do not exist yet. Running fallback registration.');
      const resultFallback = await supabase
        .from('users')
        .insert([{ username: cleanUsername, password: hashedPasswordStr, recovery_code: hashedRecoveryCode }]);
      insertError = resultFallback.error;
    }

    if (insertError) {
      console.error('Signup Insert Error:', insertError.message);
      // Postgres unique constraint violation code is 23505
      if (insertError.code === '23505' || insertError.message?.toLowerCase().includes('unique')) {
        return res.status(400).json({ error: 'Username already taken. Please choose a different one.' });
      }
      return res.status(500).json({ error: 'Could not register user' });
    }


    trackUsage(cleanUsername, 'Registered a new guest account', req);
    // Return the raw recovery code ONCE — never stored in plaintext
    res.status(201).json({ message: 'User registered successfully', username: cleanUsername, recoveryCode: rawRecoveryCode });
  } catch (err) {
    console.error('Signup Error:', err);
    res.status(500).json({ error: 'Internal server error during signup' });
  }
});

// REST API: Guest Auth Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  try {
    // Fetch user by username (case-insensitive)
    const { data, error } = await supabase
      .from('users')
      .select('username, password')
      .ilike('username', cleanUsername);

    if (error) {
      console.error('Login Query Error:', error.message);
      return res.status(500).json({ error: 'Database error during login' });
    }

    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = data[0];
    const hashedPasswordStr = hashPassword(cleanPassword);

    // Verify password: matches hashed OR matches legacy plaintext
    const isValid = (user.password === hashedPasswordStr) || (user.password === cleanPassword);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    trackUsage(user.username, 'Logged into guest account', req);
    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// REST API: Get Guest User Profile & Access Status
app.get('/api/auth/profile', async (req, res) => {
  const userName = req.headers['x-user-name'];
  if (!userName || userName.toLowerCase() === 'guest') {
    return res.status(401).json({ error: 'Not logged in' });
  }

  try {
    let data, error;
    try {
      const result = await supabase
        .from('users')
        .select('username, created_at, brian_access, display_name, bio, avatar_data')
        .ilike('username', userName.trim());
      data = result.data;
      error = result.error;
    } catch (e) {
      error = e;
    }

    if (error && (error.message?.includes('column') || error.message?.includes('does not exist'))) {
      console.warn('[Supabase] Detailed profile columns (display_name, bio, avatar_data) do not exist. Please run profile_migration.sql. Falling back to basic columns.');
      const fallbackResult = await supabase
        .from('users')
        .select('username, created_at, brian_access')
        .ilike('username', userName.trim());
      data = fallbackResult.data;
      error = fallbackResult.error;
    }

    if (error) {
      console.error('Fetch profile error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(data[0]);
  } catch (err) {
    console.error('Fetch profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Guest User Requests Access to Brian AI
app.post('/api/auth/request-access', async (req, res) => {
  const userName = req.headers['x-user-name'];
  if (!userName || userName.toLowerCase() === 'guest') {
    return res.status(401).json({ error: 'Username is required to request access' });
  }

  try {
    // Check if user exists
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('username, brian_access')
      .ilike('username', userName.trim());

    if (fetchError || !data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = data[0];
    if (user.brian_access === 'approved') {
      return res.json({ success: true, status: 'approved', message: 'Access already approved' });
    }

    // Update status to pending
    const { error: updateError } = await supabase
      .from('users')
      .update({ brian_access: 'pending' })
      .ilike('username', userName.trim());

    if (updateError) {
      console.error('Request access error:', updateError.message);
      return res.status(500).json({ error: 'Failed to request access' });
    }

    trackUsage(user.username, 'Requested access to Brian AI', req);
    res.json({ success: true, status: 'pending', message: 'Access request submitted successfully' });
  } catch (err) {
    console.error('Request access error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Socket.io connection logic for Video Downloads
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('download-request', (data) => {
    const { url: videoUrl, format, title, username } = data;
    trackUsage(username || 'Guest', `Started media download: "${title || videoUrl}"`);
    const downloadToken = uuidv4();
    
    // Create folder mapping and standard output file path
    const args = [
      ...ytDlpArgsPrefix,
      '--socket-timeout', '15',
      '--no-playlist',
      '--no-warnings',
      '--no-cache-dir',
      '--newline',
      '--progress'
    ];

    // Quality mapping options
    if (format === 'mp3') {
      args.push('-f', 'bestaudio/best', '--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
    } else if (format === '1080p') {
      args.push('-f', 'bestvideo[height<=1080]+bestaudio/best', '--merge-output-format', 'mp4');
    } else if (format === '720p') {
      args.push('-f', 'bestvideo[height<=720]+bestaudio/best', '--merge-output-format', 'mp4');
    } else if (format === '480p') {
      args.push('-f', 'bestvideo[height<=480]+bestaudio/best', '--merge-output-format', 'mp4');
    } else {
      args.push('-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4');
    }

    // Set output template
    const ext = format === 'mp3' ? 'mp3' : 'mp4';
    const filePath = path.join(TEMP_DIR, `${downloadToken}.${ext}`);
    args.push('-o', filePath);
    args.push(videoUrl);

    socket.emit('download-status', { status: 'starting', message: 'Spawning downloader...' });

    const downloadProcess = spawn(pythonCommand, args, { stdio: ['ignore', 'pipe', 'pipe'] });

    const downloadTimeoutId = setTimeout(() => {
      console.warn('Download process timed out, killing...');
      downloadProcess.kill('SIGKILL');
      socket.emit('download-status', { status: 'failed', message: 'Download timed out on the server.' });
    }, 300000); // 5 minutes timeout

    downloadProcess.on('error', (err) => {
      clearTimeout(downloadTimeoutId);
      console.error('Download spawn error:', err);
      socket.emit('download-status', { status: 'failed', message: 'Failed to start downloader on the server.' });
    });

    // Regex to parse progress from stdout
    // yt-dlp format: [download]  12.5% of 45.21MiB at  3.51MiB/s ETA 00:10
    const progressRegex = /\[download\]\s+([\d.]+)\%\s+of\s+([\d.A-Za-z]+)\s+at\s+([\d.A-Za-z/]+)\s+ETA\s+([\d:]+)/;

    downloadProcess.stdout.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (!line.trim()) continue;

        if (line.includes('[download] Destination:')) {
          socket.emit('download-status', { status: 'downloading', message: 'Downloading stream...' });
        } else if (line.includes('[Merger] Merging formats')) {
          socket.emit('download-status', { status: 'merging', message: 'Merging audio and video streams (this may take a few seconds)...' });
        } else if (line.includes('[ExtractAudio]')) {
          socket.emit('download-status', { status: 'extracting', message: 'Extracting audio and converting to MP3...' });
        } else {
          const match = line.match(progressRegex);
          if (match) {
            socket.emit('download-progress', {
              percent: parseFloat(match[1]),
              size: match[2],
              speed: match[3],
              eta: match[4]
            });
          }
        }
      }
    });

    let downloadStderr = '';
    downloadProcess.stderr.on('data', (chunk) => {
      const errorMsg = chunk.toString();
      downloadStderr += errorMsg;
      // Only log errors that are critical, ignore warnings
      if (errorMsg.includes('ERROR:')) {
        console.error(`Download Stderr: ${errorMsg}`);
      }
    });

    downloadProcess.on('close', (code) => {
      clearTimeout(downloadTimeoutId);
      if (code === 0 && fs.existsSync(filePath)) {
        // Success
        activeDownloads.set(downloadToken, {
          filePath: filePath,
          title: title || 'download',
          format: format
        });
        socket.emit('download-status', {
          status: 'ready',
          token: downloadToken,
          title: title || 'download',
          ext: ext
        });
      } else {
        let msg = 'Download failed. Ensure the link is valid or try a different format.';
        if (downloadStderr.includes("confirm you’re not a bot") || downloadStderr.includes("confirm you're not a bot") || downloadStderr.includes("Sign in")) {
          msg = "YouTube blocked the server's IP (bot check protection). Try running the app locally.";
        }
        socket.emit('download-status', {
          status: 'error',
          message: msg
        });
        // Remove temp file if it exists
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
      }
    });
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// ==========================================================================
// Admin & Owner Portal Endpoints
// ==========================================================================

app.post('/api/auth/owner', async (req, res) => {
  const { username, password } = req.body;
  const adminUsername = process.env.ADMIN_USERNAME || 'Borno';

  if (username && password) {
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (cleanUsername.toLowerCase() === adminUsername.toLowerCase()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('username, password')
          .ilike('username', cleanUsername)
          .eq('password', cleanPassword);

        if (error) {
          console.error('Admin Auth Query Error:', error.message);
          return res.status(500).json({ error: 'Database error during admin authentication' });
        }

        if (data && data.length > 0) {
          trackUsage(data[0].username, 'Logged into Owner Mode via credentials', req);
          return res.json({ success: true, token: ownerSessionToken });
        }
      } catch (err) {
        console.error('Admin Auth Error:', err);
        return res.status(500).json({ error: 'Internal server error during admin authentication' });
      }
    }
  }

  // Fallback support for single password owner login
  if (!username && password && password === ownerPassword) {
    trackUsage('Owner', 'Logged into Owner Mode via password fallback', req);
    return res.json({ success: true, token: ownerSessionToken });
  }

  res.status(401).json({ error: 'Incorrect username or password' });
});

app.get('/api/admin/stats', requireOwner, async (req, res) => {
  try {
    const os = require('os');
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    // Fetch exact counts from Supabase
    const { count: bookmarksCount, error: bmError } = await supabase
      .from('bookmarks')
      .select('*', { count: 'exact', head: true });
    
    const { count: usersCount, error: usrError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    res.json({
      uptime,
      memory: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
        external: memory.external
      },
      system: {
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        freeMem: os.freemem(),
        totalMem: os.totalmem()
      },
      stats: {
        users: usersCount || 0,
        bookmarks: bookmarksCount || 0,
        activeDownloads: activeDownloads.size
      }
    });
  } catch (err) {
    console.error('Stats Error:', err);
    res.status(500).json({ error: 'Failed to fetch server statistics' });
  }
});

app.get('/api/admin/users', requireOwner, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('username, created_at, brian_access')
      .order('username', { ascending: true });

    if (error) {
      console.error('Fetch users error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    res.json(data || []);
  } catch (err) {
    console.error('Users API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/users/:username', requireOwner, async (req, res) => {
  const username = req.params.username;
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .ilike('username', username);

    if (error) {
      console.error('Delete user error:', error.message);
      return res.status(500).json({ error: 'Failed to delete user' });
    }

    trackUsage('Owner', `Deleted user account "${username}"`, req);
    res.json({ message: `User "${username}" deleted successfully` });
  } catch (err) {
    console.error('Delete user API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:username/reset-password', requireOwner, async (req, res) => {
  const username = req.params.username;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters long' });
  }
  try {
    // BUG FIX: Always hash the new password before storing (was stored as plaintext before)
    const hashedNew = hashPassword(newPassword.trim());
    const { error } = await supabase
      .from('users')
      .update({ password: hashedNew })
      .ilike('username', username);

    if (error) {
      console.error('Reset password error:', error.message);
      return res.status(500).json({ error: 'Failed to reset password' });
    }

    trackUsage('Owner', `Reset password for user "${username}"`, req);
    res.json({ message: `Password for "${username}" reset successfully` });
  } catch (err) {
    console.error('Reset password API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/users/:username/brian-access', requireOwner, async (req, res) => {
  const username = req.params.username;
  const { status } = req.body;
  
  if (!['approved', 'rejected', 'none', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid access status' });
  }

  try {
    const { error } = await supabase
      .from('users')
      .update({ brian_access: status })
      .ilike('username', username);

    if (error) {
      console.error('Update brian access error:', error.message);
      return res.status(500).json({ error: 'Failed to update user access' });
    }

    trackUsage('Owner', `Updated Brian access for user "${username}" to "${status}"`, req);
    res.json({ message: `User "${username}" access status updated to "${status}" successfully` });
  } catch (err) {
    console.error('Update access API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Self-serve password reset via recovery code
app.post('/api/auth/reset-password', async (req, res) => {
  const { username, recoveryCode, newPassword } = req.body;
  if (!username || !recoveryCode || !newPassword) {
    return res.status(400).json({ error: 'Username, recovery code, and new password are required' });
  }
  if (newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long' });
  }

  const cleanUsername = username.trim();
  const cleanCode = recoveryCode.trim().toUpperCase();
  const cleanPassword = newPassword.trim();

  try {
    // Fetch user
    const { data, error } = await supabase
      .from('users')
      .select('username, recovery_code')
      .ilike('username', cleanUsername);

    if (error) {
      console.error('Reset-password query error:', error.message);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = data[0];
    if (!user.recovery_code) {
      return res.status(400).json({ error: 'No recovery code set for this account. Please contact the site owner to reset your password.' });
    }

    // Verify recovery code against its stored hash
    const hashedInputCode = hashPassword(cleanCode);
    if (hashedInputCode !== user.recovery_code) {
      return res.status(401).json({ error: 'Invalid recovery code' });
    }

    // Generate a brand new recovery code (invalidates the old one)
    const newRawCode = generateRecoveryCode();
    const newHashedCode = hashPassword(newRawCode);
    const newHashedPassword = hashPassword(cleanPassword);

    // Update password + regenerate recovery code atomically
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: newHashedPassword, recovery_code: newHashedCode })
      .ilike('username', cleanUsername);

    if (updateError) {
      console.error('Reset-password update error:', updateError.message);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    trackUsage(user.username, 'Reset password via recovery code', req);
    // Return the new raw recovery code so the user can save it
    res.json({ success: true, message: 'Password reset successfully', newRecoveryCode: newRawCode });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// REST API: Update Guest User Profile (Display Name, Bio, Avatar)
app.post('/api/auth/profile/update', async (req, res) => {
  const userName = req.headers['x-user-name'];
  if (!userName || userName.toLowerCase() === 'guest') {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { displayName, bio, avatarData } = req.body;
  
  try {
    const updatePayload = {};
    if (typeof displayName === 'string') updatePayload.display_name = displayName.trim();
    if (typeof bio === 'string') updatePayload.bio = bio.trim();
    if (typeof avatarData === 'string') updatePayload.avatar_data = avatarData;

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updatePayload)
      .ilike('username', userName.trim())
      .select();

    if (error) {
      console.error('Update profile error:', error.message);
      if (error.message?.includes('column') || error.message?.includes('does not exist')) {
        return res.status(400).json({ error: 'Database needs migration. Please ask Owner to run profile_migration.sql.' });
      }
      return res.status(500).json({ error: 'Failed to update profile settings' });
    }

    trackUsage(userName, 'Updated profile settings', req);
    res.json({ success: true, message: 'Profile updated successfully', user: data[0] });
  } catch (err) {
    console.error('Update profile server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// REST API: Change User Password
app.post('/api/auth/profile/change-password', async (req, res) => {
  const userName = req.headers['x-user-name'];
  if (!userName || userName.toLowerCase() === 'guest') {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  if (newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long' });
  }

  try {
    // 1. Fetch user to verify current password
    const { data, error } = await supabase
      .from('users')
      .select('username, password')
      .ilike('username', userName.trim());

    if (error || !data || data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = data[0];
    const hashedCurrent = hashPassword(currentPassword.trim());

    // Allow comparison to hashed or legacy plaintext
    const isValid = (user.password === hashedCurrent) || (user.password === currentPassword.trim());
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect current password' });
    }

    // 2. Hash new password and update
    const hashedNew = hashPassword(newPassword.trim());
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedNew })
      .ilike('username', userName.trim());

    if (updateError) {
      console.error('Change password update error:', updateError.message);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    trackUsage(userName, 'Changed password', req);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password server error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/change-password', requireOwner, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (currentPassword !== ownerPassword) {
    return res.status(400).json({ error: 'Current owner password is incorrect' });
  }
  if (!newPassword || newPassword.trim().length < 4) {
    return res.status(400).json({ error: 'New password must be at least 4 characters long' });
  }

  ownerPassword = newPassword.trim();
  try {
    fs.writeFileSync(OWNER_CONFIG_FILE, JSON.stringify({ password: ownerPassword }, null, 2));
    trackUsage('Owner', 'Changed Owner Access Password', req);
    res.json({ message: 'Owner password changed successfully' });
  } catch (err) {
    console.error('Failed to save config:', err);
    res.status(500).json({ error: 'Failed to save new password on the server' });
  }
});

app.post('/api/admin/clean-temp', requireOwner, (req, res) => {
  fs.readdir(TEMP_DIR, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read temp directory' });
    }
    let deletedCount = 0;
    for (const file of files) {
      try {
        fs.unlinkSync(path.join(TEMP_DIR, file));
        deletedCount++;
      } catch (e) {
        console.error(`Failed to delete ${file}:`, e);
      }
    }
    trackUsage('Owner', `Purged temporary downloads folder (${deletedCount} files)`, req);
    res.json({ message: `Cleaned temp directory. Removed ${deletedCount} files.` });
  });
});

app.get('/api/admin/export', requireOwner, async (req, res) => {
  try {
    const { data: bookmarks, error: bmError } = await supabase
      .from('bookmarks')
      .select('*');
    const { data: users, error: usrError } = await supabase
      .from('users')
      .select('username, created_at, brian_access');

    trackUsage('Owner', 'Exported database backup', req);
    res.json({
      exportedAt: new Date().toISOString(),
      bookmarks: bookmarks || [],
      users: users || []
    });
  } catch (err) {
    console.error('Export Error:', err);
    res.status(500).json({ error: 'Failed to export site data' });
  }
});

// New Analytics Tracking Endpoints
app.post('/api/track/view', async (req, res) => {
  const { viewId, username } = req.body;
  if (!viewId) return res.status(400).json({ error: 'viewId is required' });

  try {
    let updatedCounts = null;
    try {
      const { data: existing, error: selectError } = await supabase
        .from('view_counts')
        .select('count')
        .eq('view_id', viewId)
        .maybeSingle();

      if (!selectError) {
        const currentCount = existing ? existing.count : 0;
        const { error: upsertError } = await supabase
          .from('view_counts')
          .upsert({ view_id: viewId, count: currentCount + 1, updated_at: new Date().toISOString() });

        if (!upsertError) {
          const { data: countRows } = await supabase.from('view_counts').select('view_id, count');
          if (countRows) {
            updatedCounts = { dashboard: 0, downloader: 0, linksaver: 0, games: 0, admin: 0 };
            countRows.forEach(row => {
              updatedCounts[row.view_id] = row.count;
            });
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Supabase] DB view tracking error, falling back to local file:', dbErr.message);
    }

    if (!updatedCounts) {
      const counts = JSON.parse(fs.readFileSync(VIEW_COUNTS_FILE, 'utf8') || '{}');
      counts[viewId] = (counts[viewId] || 0) + 1;
      fs.writeFileSync(VIEW_COUNTS_FILE, JSON.stringify(counts, null, 2));
      updatedCounts = counts;
    }

    const cleanName = username || 'Guest';
    let sectionName = viewId;
    if (viewId === 'dashboard') sectionName = 'Dashboard';
    else if (viewId === 'downloader') sectionName = 'Media Downloader';
    else if (viewId === 'linksaver') sectionName = 'Link Saver';
    else if (viewId === 'games') sectionName = 'Arcade Zone';
    else if (viewId === 'admin') sectionName = 'Admin Portal';

    await trackUsage(cleanName, `Viewed section: ${sectionName}`, req);
    res.json({ success: true, counts: updatedCounts });
  } catch (err) {
    console.error('Track view error:', err);
    res.status(500).json({ error: 'Failed to record section view' });
  }
});

app.get('/api/admin/analytics', requireOwner, async (req, res) => {
  try {
    let counts = { dashboard: 0, downloader: 0, linksaver: 0, games: 0, admin: 0 };
    let countsFromDb = false;
    try {
      const { data: countRows, error: dbError } = await supabase.from('view_counts').select('view_id, count');
      if (!dbError && countRows && countRows.length > 0) {
        countRows.forEach(row => {
          counts[row.view_id] = row.count;
        });
        countsFromDb = true;
      }
    } catch (e) {
      // Fall back silently to JSON file
    }

    if (!countsFromDb) {
      counts = JSON.parse(fs.readFileSync(VIEW_COUNTS_FILE, 'utf8') || '{}');
    }

    let logs = [];
    let logsFromDb = false;
    try {
      const { data: dbLogs, error: dbError } = await supabase
        .from('usage_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(1000);
      if (!dbError && dbLogs) {
        logs = dbLogs.map(log => ({
          timestamp: log.timestamp,
          username: log.username,
          action: log.action,
          ip: log.ip
        }));
        logsFromDb = true;
      }
    } catch (e) {
      // Fall back silently to JSON file
    }

    if (!logsFromDb) {
      logs = JSON.parse(fs.readFileSync(USAGE_LOGS_FILE, 'utf8') || '[]');
    }

    res.json({ counts, logs });
  } catch (err) {
    console.error('Fetch analytics error:', err);
    res.status(500).json({ error: 'Failed to retrieve analytics data' });
  }
});


// Check if WTW tables exist on startup
async function verifyWtwTables() {
  try {
    const { error } = await supabase
      .from('wtw_games')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'P0001' || error.message.includes('does not exist') || error.message.includes('undefined_table') || error.message.includes('schema cache') || error.message.includes('Could not find')) {
        console.warn('\n[Supabase] ⚠️ WARNING: "wtw_games" table not found in database.');
        console.warn('[Supabase] ⚠️ Please execute the SQL queries in "wtw_schema.sql" via the Supabase SQL Editor to enable game history tracking.\n');
      } else {
        console.error('[Supabase] Error verifying WTW tables on boot:', error.message);
      }
    } else {
      console.log('[Supabase] WTW tables verified successfully. Game history is active.');
    }
  } catch (err) {
    console.error('[Supabase] Unexpected error verifying WTW tables on boot:', err);
  }
}
verifyWtwTables();

// Check if NHIE tables exist on startup
async function verifyNhieTables() {
  try {
    const { error } = await supabase
      .from('nhie_games')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'P0001' || error.message.includes('does not exist') || error.message.includes('undefined_table') || error.message.includes('schema cache') || error.message.includes('Could not find')) {
        console.warn('\n[Supabase] ⚠️ WARNING: "nhie_games" table not found in database.');
        console.warn('[Supabase] ⚠️ Please execute the SQL queries in "nhie_schema.sql" via the Supabase SQL Editor to enable game history tracking.\n');
      } else {
        console.error('[Supabase] Error verifying NHIE tables on boot:', error.message);
      }
    } else {
      console.log('[Supabase] NHIE tables verified successfully. Game history is active.');
    }
  } catch (err) {
    console.error('[Supabase] Unexpected error verifying NHIE tables on boot:', err);
  }
}
verifyNhieTables();

// Check if Analytics tables exist on startup
async function verifyAnalyticsTables() {
  try {
    const { error: viewCountError } = await supabase
      .from('view_counts')
      .select('view_id')
      .limit(1);

    const { error: usageLogError } = await supabase
      .from('usage_logs')
      .select('id')
      .limit(1);

    if (viewCountError || usageLogError) {
      if (
        (viewCountError && (viewCountError.code === 'P0001' || viewCountError.message.includes('does not exist') || viewCountError.message.includes('undefined_table') || viewCountError.message.includes('schema cache') || viewCountError.message.includes('Could not find'))) ||
        (usageLogError && (usageLogError.code === 'P0001' || usageLogError.message.includes('does not exist') || usageLogError.message.includes('undefined_table') || usageLogError.message.includes('schema cache') || usageLogError.message.includes('Could not find')))
      ) {
        console.warn('\n[Supabase] ⚠️ WARNING: Analytics tables ("view_counts" or "usage_logs") not found in database.');
        console.warn('[Supabase] ⚠️ Please execute the SQL queries in "analytics_schema.sql" via the Supabase SQL Editor to enable all-time analytics tracking.\n');
      } else {
        console.error('[Supabase] Error verifying analytics tables on boot:', (viewCountError || usageLogError).message);
      }
    } else {
      console.log('[Supabase] Analytics tables verified successfully. All-time analytics tracking is active.');
    }
  } catch (err) {
    console.error('[Supabase] Unexpected error verifying analytics tables on boot:', err);
  }
}
verifyAnalyticsTables();


// WTW Game History API: Get list of games
app.get('/api/wtw/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('wtw_games')
      .select(`
        id,
        room_code,
        created_at,
        wtw_players ( name, score )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch WTW history error:', error.message);
      return res.status(500).json({ error: 'Could not fetch history' });
    }

    const formatted = data.map(game => {
      let winner = null;
      if (game.wtw_players && game.wtw_players.length > 0) {
        winner = game.wtw_players.reduce((max, p) => p.score > max.score ? p : max, game.wtw_players[0]);
      }

      return {
        id: game.id,
        roomCode: game.room_code,
        createdAt: game.created_at,
        playerCount: game.wtw_players ? game.wtw_players.length : 0,
        winnerName: winner ? winner.name : 'No winner',
        winnerScore: winner ? winner.score : 0
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// WTW Game History API: Get single game details
app.get('/api/wtw/history/:gameId', async (req, res) => {
  const { gameId } = req.params;
  try {
    const { data, error } = await supabase
      .from('wtw_games')
      .select(`
        id,
        room_code,
        created_at,
        wtw_players ( name, score ),
        wtw_questions (
          id,
          text,
          author_name,
          wtw_votes ( voter_name, votee_name )
        )
      `)
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('Fetch WTW game details error:', error.message);
      return res.status(500).json({ error: 'Could not fetch game details' });
    }

    if (data && data.wtw_players) {
      data.wtw_players.sort((a, b) => b.score - a.score);
    }

    res.json(data);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// NHIE Game History API: Get list of games
app.get('/api/nhie/history', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('nhie_games')
      .select(`
        id,
        room_code,
        created_at,
        nhie_players ( name, score )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch NHIE history error:', error.message);
      return res.status(500).json({ error: 'Could not fetch history' });
    }

    const formatted = data.map(game => {
      let winner = null;
      if (game.nhie_players && game.nhie_players.length > 0) {
        winner = game.nhie_players.reduce((max, p) => p.score > max.score ? p : max, game.nhie_players[0]);
      }

      return {
        id: game.id,
        roomCode: game.room_code,
        createdAt: game.created_at,
        playerCount: game.nhie_players ? game.nhie_players.length : 0,
        winnerName: winner ? winner.name : 'No winner',
        winnerScore: winner ? winner.score : 0
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// NHIE Game History API: Get single game details
app.get('/api/nhie/history/:gameId', async (req, res) => {
  const { gameId } = req.params;
  try {
    const { data, error } = await supabase
      .from('nhie_games')
      .select(`
        id,
        room_code,
        created_at,
        nhie_players ( name, score ),
        nhie_statements (
          id,
          text,
          author_name,
          nhie_answers ( player_name, has_done )
        )
      `)
      .eq('id', gameId)
      .single();

    if (error) {
      console.error('Fetch NHIE game details error:', error.message);
      return res.status(500).json({ error: 'Could not fetch game details' });
    }

    if (data && data.nhie_players) {
      data.nhie_players.sort((a, b) => b.score - a.score);
    }

    res.json(data);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Catch-all route to serve SPA
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`blendd.com server running on http://localhost:${PORT}`);
});
