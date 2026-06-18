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
const supabase = require('./db');

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
      return res.status(400).json({ 
        error: 'Failed to fetch video information. Ensure the URL is valid.',
        details: `Exit code: ${code}\nStdout: ${stdout}\nStderr: ${stderr}`
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

// REST API: Link Saver CRUD
app.get('/api/links', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('*')
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Fetch bookmarks error:', error.message);
      return res.status(500).json({ error: 'Could not read links' });
    }

    // Map database fields to frontend keys (specifically added_at -> addedAt)
    const formatted = data.map(item => ({
      id: item.id,
      title: item.title,
      url: item.url,
      category: item.category,
      favicon: item.favicon,
      domain: item.domain,
      addedAt: item.added_at
    }));

    res.json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Link metadata auto-fetch and Save
app.post('/api/links', async (req, res) => {
  const { linkUrl, category, customTitle, favicon: inputFavicon } = req.body;
  if (!linkUrl) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    let title = customTitle ? customTitle.trim() : '';
    const domain = getDomainName(linkUrl);
    
    let favicon = inputFavicon;
    if (!favicon || favicon === 'auto') {
      favicon = `https://www.google.com/s2/favicons?sz=64&domain=${domain || 'google.com'}`;
    }

    // If no custom title is provided, scrape it from the webpage
    if (!title) {
      const meta = await fetchUrlTitle(linkUrl);
      title = meta.title;
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('bookmarks')
      .insert([{
        title,
        url: linkUrl,
        category: category || 'General',
        favicon,
        domain
      }])
      .select();

    if (error) {
      console.error('Insert bookmark error:', error.message);
      return res.status(500).json({ error: 'Could not save link' });
    }

    const inserted = data[0];
    const formatted = {
      id: inserted.id,
      title: inserted.title,
      url: inserted.url,
      category: inserted.category,
      favicon: inserted.favicon,
      domain: inserted.domain,
      addedAt: inserted.added_at
    };

    res.status(201).json(formatted);
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/links/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete bookmark error:', error.message);
      return res.status(500).json({ error: 'Could not update links' });
    }

    res.json({ message: 'Link deleted successfully' });
  } catch (err) {
    console.error('API Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/links/:id', async (req, res) => {
  const id = req.params.id;
  const { linkUrl, category, customTitle, favicon: inputFavicon } = req.body;

  if (!linkUrl) {
    return res.status(400).json({ error: 'URL is required' });
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

    let { data, error } = await supabase
      .from('bookmarks')
      .update({
        title,
        url: linkUrl,
        category: category || 'General',
        favicon,
        domain
      })
      .eq('id', id)
      .select();

    if (!error && (!data || data.length === 0)) {
      console.log('[Supabase] Update returned 0 rows. Attempting delete-and-insert fallback...');
      
      const { data: deletedData, error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .select();

      if (deleteError) {
        error = deleteError;
      } else if (deletedData && deletedData.length > 0) {
        const oldRow = deletedData[0];
        const { data: insertData, error: insertError } = await supabase
          .from('bookmarks')
          .insert([{
            id,
            title,
            url: linkUrl,
            category: category || 'General',
            favicon,
            domain,
            added_at: oldRow.added_at
          }])
          .select();

        if (insertError) {
          error = insertError;
        } else if (insertData && insertData.length > 0) {
          data = insertData;
        }
      }
    }

    if (error) {
      console.error('Update bookmark error:', error.message);
      return res.status(500).json({ error: 'Could not update link' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    const updated = data[0];
    const formatted = {
      id: updated.id,
      title: updated.title,
      url: updated.url,
      category: updated.category,
      favicon: updated.favicon,
      domain: updated.domain,
      addedAt: updated.added_at
    };

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

    // Insert new user
    const { error: insertError } = await supabase
      .from('users')
      .insert([{ username: cleanUsername, password: cleanPassword }]);

    if (insertError) {
      console.error('Signup Insert Error:', insertError.message);
      return res.status(500).json({ error: 'Could not register user' });
    }

    res.status(201).json({ message: 'User registered successfully', username: cleanUsername });
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
    const { data, error } = await supabase
      .from('users')
      .select('username, password')
      .ilike('username', cleanUsername)
      .eq('password', cleanPassword);

    if (error) {
      console.error('Login Query Error:', error.message);
      return res.status(500).json({ error: 'Database error during login' });
    }

    if (!data || data.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    res.json({ success: true, username: data[0].username });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Socket.io connection logic for Video Downloads
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('download-request', (data) => {
    const { url: videoUrl, format, title } = data;
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

    downloadProcess.stderr.on('data', (chunk) => {
      const errorMsg = chunk.toString();
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
        socket.emit('download-status', {
          status: 'error',
          message: 'Download failed. Ensure the link is valid or try a different format.'
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

// Catch-all route to serve SPA
app.get('/*splat', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`blend.com server running on http://localhost:${PORT}`);
});
