/**
 * Never Have I Ever (NHIE) — Multiplayer Social Game
 * Server-side game manager (Socket.io based)
 *
 * Game Flow:
 *   LOBBY → STATEMENT_PHASE (if custom) → ANSWERING_PHASE → STATEMENT_RESULTS → (repeat per statement) → FINAL_SCORES
 *
 * Min players: 2
 */

'use strict';

const { v4: uuidv4 } = require('uuid');
const supabase = require('../db');

// ── In-memory state ──────────────────────────────────────────────────────────
const rooms = new Map(); // roomId → room object

// ── Pre-made Statements pool ──────────────────────────────────────────────────
const PREMADE_STATEMENTS = [
  "Never have I ever lied about my age.",
  "Never have I ever fallen asleep in school or at work.",
  "Never have I ever eaten food that fell on the floor.",
  "Never have I ever texted the wrong person something embarrassing.",
  "Never have I ever pretended to know a stranger to avoid someone else.",
  "Never have I ever regifted a present.",
  "Never have I ever gone into the wrong cinema screen.",
  "Never have I ever sung in the shower.",
  "Never have I ever binge-watched an entire series in one day.",
  "Never have I ever gotten lost in my own neighborhood.",
  "Never have I ever cried during an animated movie.",
  "Never have I ever snooped in a friend's bathroom cabinet.",
  "Never have I ever stalked someone on social media.",
  "Never have I ever accidentally walked into a glass door.",
  "Never have I ever broken a bone.",
  "Never have I ever been on TV.",
  "Never have I ever stayed up for 24 hours straight.",
  "Never have I ever had a paranormal experience.",
  "Never have I ever forgotten someone's name right after meeting them.",
  "Never have I ever gotten a tattoo I regretted.",
  "Never have I ever eaten an entire pizza by myself.",
  "Never have I ever lied to get out of plans.",
  "Never have I ever used someone else's streaming account without them knowing.",
  "Never have I ever sent a text and immediately regretted it.",
  "Never have I ever fallen out of bed while sleeping.",
  "Never have I ever laughed at a completely inappropriate moment.",
  "Never have I ever worn mismatched shoes out of the house.",
  "Never have I ever re-watched a show more than 5 times.",
  "Never have I ever pretended to be sick to skip school or work.",
  "Never have I ever run into a wall or pole while looking at my phone.",
  "Never have I ever tried to cut my own hair.",
  "Never have I ever spent money on a mobile game.",
  "Never have I ever gotten stuck in an elevator.",
  "Never have I ever eaten something that looked so bad but tasted amazing.",
  "Never have I ever sang karaoke in front of a crowd.",
  "Never have I ever gone to a concert alone.",
  "Never have I ever googled my own name.",
  "Never have I ever stayed in my pajamas all day long.",
  "Never have I ever waved back at someone who was waving to someone else.",
  "Never have I ever bought something online and never used it.",
  "Never have I ever fallen down in public.",
  "Never have I ever hidden a purchase from my family.",
  "Never have I ever pretended to be on the phone to avoid someone.",
  "Never have I ever eaten a whole tub of ice cream in one sitting.",
  "Never have I ever gone to the cinema alone.",
  "Never have I ever broken a cup/plate in a restaurant and pretended it wasn't me.",
  "Never have I ever stayed up all night playing video games.",
  "Never have I ever tried to open a door by pulling when it said push.",
  "Never have I ever gotten a haircut I absolutely hated.",
  "Never have I ever lied about seeing a movie everyone was talking about.",
  "Never have I ever laughed so hard I cried.",
  "Never have I ever eaten breakfast food for dinner.",
  "Never have I ever lost my keys/wallet and found them in a ridiculous place.",
  "Never have I ever spent an hour looking for something that was in my hand.",
  "Never have I ever screamed during a scary movie.",
  "Never have I ever tried a weird food combination that actually worked.",
  "Never have I ever worn the same shirt two days in a row.",
  "Never have I ever pretended to like a gift I hated.",
  "Never have I ever set an alarm and slept right through it.",
  "Never have I ever forgotten where I parked my car/bicycle.",
  "Never have I ever dropped my phone on my face while reading in bed.",
  "Never have I ever gotten a song stuck in my head for days.",
  "Never have I ever tried to slide down a banister.",
  "Never have I ever made a funny face in a mirror when no one was looking.",
  "Never have I ever laughed when someone tripped."
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function log(roomId, msg) {
  console.log(`[NHIE:${roomId}] ${msg}`);
}

async function saveGameToDatabase(room) {
  try {
    log(room.roomId, 'Saving NHIE game record to Supabase database...');
    if (!room.players || room.players.length === 0) {
      log(room.roomId, 'No players in the room, skipping database save.');
      return;
    }

    // 1. Insert into nhie_games
    const { data: gameData, error: gameError } = await supabase
      .from('nhie_games')
      .insert([{ room_code: room.roomId }])
      .select();

    if (gameError) {
      console.error('[Supabase] Error inserting nhie_games:', gameError.message);
      return;
    }
    
    if (!gameData || gameData.length === 0) {
      console.error('[Supabase] No game data returned from insert.');
      return;
    }

    const gameId = gameData[0].id;

    // 2. Insert into nhie_players
    const playersToInsert = room.players.map(p => ({
      game_id: gameId,
      name: p.name,
      score: p.score
    }));

    const { error: playersError } = await supabase
      .from('nhie_players')
      .insert(playersToInsert);

    if (playersError) {
      console.error('[Supabase] Error inserting nhie_players:', playersError.message);
    }

    // 3. Insert statements and answers
    for (const q of room.statements) {
      const author = room.players.find(p => p.id === q.authorId);
      const authorName = author ? author.name : (q.authorName || null);

      const { data: statementData, error: statementError } = await supabase
        .from('nhie_statements')
        .insert([{
          game_id: gameId,
          text: q.text,
          author_name: authorName
        }])
        .select();

      if (statementError) {
        console.error('[Supabase] Error inserting nhie_statements:', statementError.message);
        continue;
      }

      const statementId = statementData[0].id;

      // Extract answers for this statement
      // q.answers: { [playerId]: hasDone }
      const answersToInsert = [];
      for (const [playerId, hasDone] of Object.entries(q.answers)) {
        const player = room.players.find(p => p.id === playerId);

        if (player) {
          answersToInsert.push({
            game_id: gameId,
            statement_id: statementId,
            player_name: player.name,
            has_done: hasDone
          });
        }
      }

      if (answersToInsert.length > 0) {
        const { error: answersError } = await supabase
          .from('nhie_answers')
          .insert(answersToInsert);

        if (answersError) {
          console.error('[Supabase] Error inserting nhie_answers:', answersError.message);
        }
      }
    }

    log(room.roomId, `NHIE Game record successfully saved to database with ID: ${gameId}`);
  } catch (err) {
    console.error('[Supabase] Unexpected error saving NHIE game to database:', err);
  }
}

function findRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === socketId)) return room;
  }
  return null;
}

/** Build safe room state to broadcast to clients */
function getClientRoomState(room) {
  const totalStatementsExpected = room.settings.statementsPerPlayer * room.players.length;
  const submittedCount = room.players.filter(p => p.hasSubmittedStatement).length;
  const answeredCount = room.players.filter(p => p.hasAnswered).length;

  const safeStatements = room.statements.map((s, idx) => {
    const isCurrentOrPast =
      room.status === 'STATEMENT_RESULTS' || room.status === 'FINAL_SCORES' || idx < room.currentStatementIndex;
    
    // Hide details of answers until they are revealed in RESULTS phase
    const answersToSend = isCurrentOrPast ? s.answers : null;

    return {
      id: s.id,
      text: s.text,
      authorName: s.authorName || null,
      answers: answersToSend
    };
  });

  return {
    roomId: room.roomId,
    status: room.status,
    hostId: room.hostId,
    timer: room.timer,
    settings: { ...room.settings },
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      isHost: p.isHost,
      score: p.score,
      connected: p.connected,
      hasSubmittedStatement: p.hasSubmittedStatement,
      hasAnswered: p.hasAnswered,
      lastAnswer: room.status === 'STATEMENT_RESULTS' ? room.statements[room.currentStatementIndex]?.answers[p.id] : null
    })),
    statements: safeStatements,
    currentStatementIndex: room.currentStatementIndex,
    totalStatementsExpected,
    submittedStatementsCount: submittedCount,
    answeredCount
  };
}

function broadcastRoomState(room) {
  const state = getClientRoomState(room);
  global.nhieIo.to(room.roomId).emit('nhie-room-updated', state);
}

// ── Phase State Machine ───────────────────────────────────────────────────────

function transitionToPhase(room, newStatus) {
  if (room.timerId) {
    clearInterval(room.timerId);
    room.timerId = null;
  }
  room.status = newStatus;
  log(room.roomId, `→ ${newStatus}`);

  switch (newStatus) {
    case 'STATEMENT_PHASE': {
      room.statements = [];
      room.currentStatementIndex = 0;
      room.players.forEach(p => {
        p.hasSubmittedStatement = false;
        p.hasAnswered = false;
        // Reset scores based on game mode
        p.score = room.settings.scoreMode === 'SURVIVAL' ? room.settings.startingLives : 0;
      });
      room.timer = room.settings.statementTime;
      broadcastRoomState(room);
      global.nhieIo.to(room.roomId).emit('nhie-phase-changed', { status: 'STATEMENT_PHASE', timer: room.timer });
      startCountdown(room, () => {
        // Time expired in Statement submission phase:
        // Fill up missing statements with pre-made statements
        fillPremadeStatements(room);
        transitionToPhase(room, 'ANSWERING_PHASE');
      });
      break;
    }

    case 'ANSWERING_PHASE': {
      // If we are starting round 0, shuffle statements
      if (room.currentStatementIndex === 0) {
        room.statements = shuffleArray(room.statements);
      }
      room.players.forEach(p => { p.hasAnswered = false; });
      room.timer = room.settings.answerTime;

      const currentS = room.statements[room.currentStatementIndex];
      broadcastRoomState(room);
      global.nhieIo.to(room.roomId).emit('nhie-phase-changed', {
        status: 'ANSWERING_PHASE',
        timer: room.timer,
        currentStatementIndex: room.currentStatementIndex,
        currentStatement: currentS ? { id: currentS.id, text: currentS.text } : null,
      });
      startCountdown(room, () => transitionToPhase(room, 'STATEMENT_RESULTS'));
      break;
    }

    case 'STATEMENT_RESULTS': {
      if (room.timerId) clearInterval(room.timerId);
      room.timerId = null;

      const s = room.statements[room.currentStatementIndex];
      if (s) {
        // Tally answers and update player scores/lives
        room.players.forEach(p => {
          const hasDone = s.answers[p.id];
          
          // If they didn't answer in time, default to false (I HAVE NEVER) to be safe
          if (hasDone === undefined) {
            s.answers[p.id] = false;
          }

          if (s.answers[p.id] === true) {
            if (room.settings.scoreMode === 'SURVIVAL') {
              if (p.score > 0) p.score--; // Lose a life
            } else {
              p.score++; // Earn a points
            }
          }
        });
      }

      room.timer = 10; // 10s results display
      broadcastRoomState(room);
      global.nhieIo.to(room.roomId).emit('nhie-phase-changed', {
        status: 'STATEMENT_RESULTS',
        timer: room.timer,
        currentStatementIndex: room.currentStatementIndex,
      });

      startCountdown(room, () => {
        room.currentStatementIndex++;
        if (room.currentStatementIndex < room.statements.length) {
          // If it is SURVIVAL mode and everyone is dead, skip to FINAL_SCORES
          const anyAlive = room.settings.scoreMode !== 'SURVIVAL' || room.players.some(p => p.score > 0);
          if (anyAlive) {
            transitionToPhase(room, 'ANSWERING_PHASE');
          } else {
            transitionToPhase(room, 'FINAL_SCORES');
          }
        } else {
          transitionToPhase(room, 'FINAL_SCORES');
        }
      });
      break;
    }

    case 'FINAL_SCORES': {
      room.timer = 0;
      broadcastRoomState(room);
      global.nhieIo.to(room.roomId).emit('nhie-phase-changed', { status: 'FINAL_SCORES' });
      saveGameToDatabase(room);
      break;
    }

    default:
      break;
  }
}

function startCountdown(room, onExpiry) {
  room.timerId = setInterval(() => {
    room.timer--;
    global.nhieIo.to(room.roomId).emit('nhie-timer-update', room.timer);
    if (room.timer <= 0) {
      clearInterval(room.timerId);
      room.timerId = null;
      onExpiry();
    }
  }, 1000);
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fillPremadeStatements(room) {
  const needed = room.settings.systemStatementsCount || 0;

  if (needed > 0) {
    const shuffledPool = shuffleArray(PREMADE_STATEMENTS);
    for (let i = 0; i < needed; i++) {
      const statementText = shuffledPool[i % shuffledPool.length];
      room.statements.push({
        id: uuidv4(),
        text: statementText,
        authorId: null,
        authorName: "System",
        answers: {} // { [playerId]: boolean }
      });
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

module.exports = function initNhieGame(io) {
  // Periodic cleanup — remove empty/inactive rooms older than 2 hours
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
      const allGone = room.players.every(p => !p.connected);
      const stale = now - room.lastActivity > 2 * 60 * 60 * 1000;
      if (allGone && stale) {
        if (room.timerId) clearInterval(room.timerId);
        rooms.delete(roomId);
        log(roomId, 'Room cleaned up (stale/empty)');
      }
    }
  }, 30 * 60 * 1000);

  io.on('connection', socket => {

    // ── CREATE ROOM ──────────────────────────────────────────────────────────
    socket.on('nhie-create', ({ playerName }, callback) => {
      if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
        return callback && callback({ error: 'Name is required' });
      }
      const name = playerName.trim().substring(0, 20);
      const roomId = generateRoomCode();

      const room = {
        roomId,
        status: 'LOBBY',
        hostId: socket.id,
        timer: 0,
        timerId: null,
        lastActivity: Date.now(),
        players: [
          {
            id: socket.id,
            name,
            isHost: true,
            score: 5, // Default for SURVIVAL mode
            connected: true,
            hasSubmittedStatement: false,
            hasAnswered: false,
          }
        ],
        settings: {
          scoreMode: 'SURVIVAL', // SURVIVAL | POINTS
          startingLives: 5, // 3 | 5 | 10
          statementTime: 60, // 30s | 45s | 60s
          answerTime: 15, // 10s | 15s | 30s
          statementsPerPlayer: 2, // 0 | 1 | 2 | 3
          systemStatementsCount: 10, // 0 | 5 | 10 | 15 | 20
        },
        statements: [],
        currentStatementIndex: 0,
      };

      rooms.set(roomId, room);
      socket.join(roomId);
      log(roomId, `Created by host: "${name}"`);

      callback && callback({ success: true, roomId, roomState: getClientRoomState(room) });
      broadcastRoomState(room);
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('nhie-join', ({ roomId, playerName }, callback) => {
      if (!roomId || typeof roomId !== 'string') {
        return callback && callback({ error: 'Room code is required' });
      }
      if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
        return callback && callback({ error: 'Name is required' });
      }

      const code = roomId.trim().toUpperCase();
      const name = playerName.trim().substring(0, 20);
      const room = rooms.get(code);

      if (!room) {
        return callback && callback({ error: 'Room not found' });
      }

      room.lastActivity = Date.now();

      // Check for Reconnection
      const existing = room.players.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing) {
        const oldId = existing.id;
        existing.id = socket.id;
        existing.connected = true;
        if (existing.isHost || room.hostId === oldId) {
          room.hostId = socket.id;
          existing.isHost = true;
        }
        socket.join(code);
        log(room.roomId, `"${name}" reconnected.`);
        
        callback && callback({ success: true, roomId: code, roomState: getClientRoomState(room) });
        broadcastRoomState(room);
        return;
      }

      // If game is in progress, block joins
      if (room.status !== 'LOBBY') {
        return callback && callback({ error: 'Game already in progress' });
      }

      if (room.players.length >= 12) {
        return callback && callback({ error: 'Room is full (max 12 players)' });
      }

      const newPlayer = {
        id: socket.id,
        name,
        isHost: false,
        score: room.settings.scoreMode === 'SURVIVAL' ? room.settings.startingLives : 0,
        connected: true,
        hasSubmittedStatement: false,
        hasAnswered: false,
      };

      room.players.push(newPlayer);
      socket.join(code);
      log(room.roomId, `"${name}" joined.`);

      callback && callback({ success: true, roomId: code, roomState: getClientRoomState(room) });
      broadcastRoomState(room);
    });

    // ── UPDATE SETTINGS (host only) ──────────────────────────────────────────
    socket.on('nhie-update-settings', (newSettings, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Room not found' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only the host can modify settings' });
      if (room.status !== 'LOBBY') return callback && callback({ error: 'Cannot change settings mid-game' });

      // Update room settings
      room.settings = {
        scoreMode: newSettings.scoreMode || room.settings.scoreMode,
        startingLives: isNaN(parseInt(newSettings.startingLives)) ? room.settings.startingLives : parseInt(newSettings.startingLives),
        statementTime: isNaN(parseInt(newSettings.statementTime)) ? room.settings.statementTime : parseInt(newSettings.statementTime),
        answerTime: isNaN(parseInt(newSettings.answerTime)) ? room.settings.answerTime : parseInt(newSettings.answerTime),
        statementsPerPlayer: isNaN(parseInt(newSettings.statementsPerPlayer)) ? room.settings.statementsPerPlayer : parseInt(newSettings.statementsPerPlayer),
        systemStatementsCount: isNaN(parseInt(newSettings.systemStatementsCount)) ? room.settings.systemStatementsCount : parseInt(newSettings.systemStatementsCount),
      };

      // Reset players scores to the new configuration
      room.players.forEach(p => {
        p.score = room.settings.scoreMode === 'SURVIVAL' ? room.settings.startingLives : 0;
      });

      room.lastActivity = Date.now();
      broadcastRoomState(room);
      callback && callback({ ok: true });
    });

    // ── START GAME (host only) ───────────────────────────────────────────────
    socket.on('nhie-start-game', (_, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Room not found' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only host can start the game' });
      if (room.status !== 'LOBBY') return callback && callback({ error: 'Game already started' });

      const activePlayers = room.players.filter(p => p.connected);
      if (activePlayers.length < 2) {
        return callback && callback({ error: 'Need at least 2 players to start!' });
      }

      room.lastActivity = Date.now();
      
      // Determine if we need to write statements or skip to answering
      if (room.settings.statementsPerPlayer === 0) {
        // Skip straight to answering
        fillPremadeStatements(room);
        transitionToPhase(room, 'ANSWERING_PHASE');
      } else {
        // Transition to custom statement input phase
        transitionToPhase(room, 'STATEMENT_PHASE');
      }

      callback && callback({ ok: true });
    });

    // ── SUBMIT STATEMENT ─────────────────────────────────────────────────────
    socket.on('nhie-submit-statement', ({ statementText }, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.status !== 'STATEMENT_PHASE') return callback && callback({ error: 'Not in statement submission phase' });

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return callback && callback({ error: 'Player not found' });
      if (player.hasSubmittedStatement) return callback && callback({ error: 'Already submitted statements' });

      const text = (statementText || '').trim().substring(0, 200);
      if (!text) return callback && callback({ error: 'Statement cannot be empty' });

      // Count how many statements this player has already submitted
      const alreadySubmitted = room.statements.filter(s => s.authorId === socket.id).length;
      if (alreadySubmitted >= room.settings.statementsPerPlayer) {
        return callback && callback({ error: `You can only submit ${room.settings.statementsPerPlayer} statement(s)` });
      }

      room.statements.push({
        id: uuidv4(),
        text,
        authorId: socket.id,
        authorName: player.name,
        answers: {}, // { [playerId]: boolean }
      });

      // Mark player as having completed submission
      if (alreadySubmitted + 1 >= room.settings.statementsPerPlayer) {
        player.hasSubmittedStatement = true;
      }

      room.lastActivity = Date.now();
      broadcastRoomState(room);
      callback && callback({ ok: true, submitted: alreadySubmitted + 1, total: room.settings.statementsPerPlayer });

      // Auto-advance if all players submitted
      const totalExpected = room.settings.statementsPerPlayer * room.players.length;
      if (room.statements.length >= totalExpected) {
        log(room.roomId, 'All statements submitted — advancing to ANSWERING_PHASE');
        if (room.timerId) clearInterval(room.timerId);
        fillPremadeStatements(room); // In case of Mixed, fills additional slots
        transitionToPhase(room, 'ANSWERING_PHASE');
      }
    });

    // ── SUBMIT ANSWER ────────────────────────────────────────────────────────
    socket.on('nhie-submit-answer', ({ hasDone }, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.status !== 'ANSWERING_PHASE') return callback && callback({ error: 'Not in answering phase' });

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return callback && callback({ error: 'Player not found' });
      if (player.hasAnswered) return callback && callback({ error: 'You have already answered this statement' });

      const s = room.statements[room.currentStatementIndex];
      if (!s) return callback && callback({ error: 'No active statement found' });

      s.answers[socket.id] = !!hasDone;
      player.hasAnswered = true;
      room.lastActivity = Date.now();

      broadcastRoomState(room);
      callback && callback({ ok: true });

      // Auto-advance if all players answered
      const allAnswered = room.players.every(p => p.hasAnswered);
      if (allAnswered) {
        log(room.roomId, 'All players answered — advancing to STATEMENT_RESULTS');
        if (room.timerId) clearInterval(room.timerId);
        transitionToPhase(room, 'STATEMENT_RESULTS');
      }
    });

    // ── SKIP ANSWERING (host only — force advance) ──────────────────────────
    socket.on('nhie-skip-answering', (_, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only the host can skip' });
      if (room.status !== 'ANSWERING_PHASE') return callback && callback({ error: 'Not in answering phase' });

      if (room.timerId) clearInterval(room.timerId);
      transitionToPhase(room, 'STATEMENT_RESULTS');
      callback && callback({ ok: true });
    });

    // ── NEXT ROUND (host only — from FINAL_SCORES back to game reset) ────────
    socket.on('nhie-next-round', (_, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only the host can restart' });
      if (room.status !== 'FINAL_SCORES') return callback && callback({ error: 'Can only restart from Final Scores screen' });

      // Reset scores and go back to Lobby Setup or start another match
      room.players.forEach(p => {
        p.score = room.settings.scoreMode === 'SURVIVAL' ? room.settings.startingLives : 0;
        p.hasSubmittedStatement = false;
        p.hasAnswered = false;
      });
      room.statements = [];
      room.currentStatementIndex = 0;
      
      // Send back to LOBBY
      transitionToPhase(room, 'LOBBY');
      callback && callback({ ok: true });
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.connected = false;
        log(room.roomId, `"${player.name}" disconnected`);
      }

      const anyConnected = room.players.some(p => p.connected);
      if (!anyConnected) {
        // All players gone — schedule cleanup
        room.lastActivity = Date.now();
        return;
      }

      // If host left and game is in LOBBY, assign new host
      if (room.hostId === socket.id && room.status === 'LOBBY') {
        const newHost = room.players.find(p => p.connected);
        if (newHost) {
          newHost.isHost = true;
          room.hostId = newHost.id;
          log(room.roomId, `Host transferred to "${newHost.name}"`);
        }
      }

      broadcastRoomState(room);
    });
  });
};

module.exports.bindIO = function(io) {
  global.nhieIo = io;
};
