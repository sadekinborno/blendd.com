/**
 * Who's the Worst? — Multiplayer Social Voting Game
 * Server-side game manager (Socket.io based)
 *
 * Game Flow:
 *   LOBBY → QUESTION_PHASE → VOTING_PHASE → QUESTION_RESULTS → (repeat per question) → FINAL_SCORES
 *
 * Min players: 3
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

// ── In-memory state ──────────────────────────────────────────────────────────
const rooms = new Map(); // roomId → room object

// ── Room / Player shapes ─────────────────────────────────────────────────────
/*
  Room: {
    roomId, status, hostId, timer, timerId, lastActivity,
    players: [{ id, name, isHost, score, connected, hasSubmittedQuestion, hasVoted }],
    settings: { questionTime, voteTime, questionsPerPlayer, showRealTimeResults },
    questions: [{ id, text, votes: { [voterId]: voteeId } }],
    currentQuestionIndex,
  }

  Statuses:
    LOBBY | QUESTION_PHASE | VOTING_PHASE | QUESTION_RESULTS | FINAL_SCORES
*/

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
  console.log(`[WTW:${roomId}] ${msg}`);
}

function findRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === socketId)) return room;
  }
  return null;
}

/** Returns vote counts (not raw voter→votee mapping) for a question — safe to send to clients */
function getVoteCounts(question, players) {
  const counts = {};
  players.forEach(p => { counts[p.id] = 0; });
  Object.values(question.votes).forEach(voteeId => {
    if (counts[voteeId] !== undefined) counts[voteeId]++;
  });
  return counts; // { [playerId]: count }
}

/** Build a safe room state to broadcast — never exposes raw votes */
function getClientRoomState(room) {
  const totalQExpected = room.settings.questionsPerPlayer * room.players.length;
  const submittedCount = room.players.filter(p => p.hasSubmittedQuestion).length;
  const votedCount = room.players.filter(p => p.hasVoted).length;

  // Build safe questions array — hide votes unless in QUESTION_RESULTS or FINAL_SCORES
  const safeQuestions = room.questions.map((q, idx) => {
    const isCurrentOrPast =
      room.status === 'QUESTION_RESULTS' || room.status === 'FINAL_SCORES' || idx < room.currentQuestionIndex;
    const isCurrentVoting = room.status === 'VOTING_PHASE' && idx === room.currentQuestionIndex;
    const showVotes = isCurrentOrPast || (isCurrentVoting && room.settings.showRealTimeResults);

    return {
      id: q.id,
      text: q.text,
      // Show vote counts only when allowed (never raw voter→votee)
      voteCounts: showVotes ? getVoteCounts(q, room.players) : null,
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
      hasSubmittedQuestion: p.hasSubmittedQuestion,
      hasVoted: p.hasVoted,
    })),
    questions: safeQuestions,
    currentQuestionIndex: room.currentQuestionIndex,
    totalQuestionsExpected: totalQExpected,
    submittedQuestionsCount: submittedCount,
    votedCount,
  };
}

function broadcastRoomState(room) {
  const state = getClientRoomState(room);
  global.wtwIo.to(room.roomId).emit('wtw-room-updated', state);
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
    case 'QUESTION_PHASE': {
      room.questions = [];
      room.currentQuestionIndex = 0;
      room.players.forEach(p => {
        p.hasSubmittedQuestion = false;
        p.hasVoted = false;
      });
      room.timer = room.settings.questionTime;
      broadcastRoomState(room);
      global.wtwIo.to(room.roomId).emit('wtw-phase-changed', { status: 'QUESTION_PHASE', timer: room.timer });
      startCountdown(room, () => transitionToPhase(room, 'VOTING_PHASE'));
      break;
    }

    case 'VOTING_PHASE': {
      // Shuffle questions anonymously before presenting
      if (room.currentQuestionIndex === 0) {
        room.questions = shuffleArray(room.questions);
      }
      // Reset hasVoted for this question
      room.players.forEach(p => { p.hasVoted = false; });
      room.timer = room.settings.voteTime;

      const currentQ = room.questions[room.currentQuestionIndex];
      broadcastRoomState(room);
      global.wtwIo.to(room.roomId).emit('wtw-phase-changed', {
        status: 'VOTING_PHASE',
        timer: room.timer,
        currentQuestionIndex: room.currentQuestionIndex,
        currentQuestion: currentQ ? { id: currentQ.id, text: currentQ.text } : null,
      });
      startCountdown(room, () => transitionToPhase(room, 'QUESTION_RESULTS'));
      break;
    }

    case 'QUESTION_RESULTS': {
      if (room.timerId) clearInterval(room.timerId);
      room.timerId = null;

      // Tally scores from this question's votes
      const q = room.questions[room.currentQuestionIndex];
      if (q) {
        const counts = getVoteCounts(q, room.players);
        room.players.forEach(p => {
          p.score += counts[p.id] || 0;
        });
      }

      room.timer = 8; // 8s results display
      broadcastRoomState(room);
      global.wtwIo.to(room.roomId).emit('wtw-phase-changed', {
        status: 'QUESTION_RESULTS',
        timer: room.timer,
        currentQuestionIndex: room.currentQuestionIndex,
      });

      startCountdown(room, () => {
        room.currentQuestionIndex++;
        if (room.currentQuestionIndex < room.questions.length) {
          transitionToPhase(room, 'VOTING_PHASE');
        } else {
          transitionToPhase(room, 'FINAL_SCORES');
        }
      });
      break;
    }

    case 'FINAL_SCORES': {
      room.timer = 0;
      broadcastRoomState(room);
      global.wtwIo.to(room.roomId).emit('wtw-phase-changed', { status: 'FINAL_SCORES' });
      break;
    }

    default:
      break;
  }
}

function startCountdown(room, onExpiry) {
  room.timerId = setInterval(() => {
    room.timer--;
    global.wtwIo.to(room.roomId).emit('wtw-timer-update', room.timer);
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

// ── Main export ───────────────────────────────────────────────────────────────

module.exports = function initWtwGame(io) {
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
    socket.on('wtw-create', ({ playerName }, callback) => {
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
        settings: {
          questionTime: 60,
          voteTime: 15,
          questionsPerPlayer: 1,
          showRealTimeResults: true,
        },
        players: [{
          id: socket.id,
          name,
          isHost: true,
          score: 0,
          connected: true,
          hasSubmittedQuestion: false,
          hasVoted: false,
        }],
        questions: [],
        currentQuestionIndex: 0,
      };

      rooms.set(roomId, room);
      socket.join(roomId);
      log(roomId, `Room created by "${name}"`);

      callback && callback({ roomId, roomState: getClientRoomState(room) });
    });

    // ── JOIN ROOM ────────────────────────────────────────────────────────────
    socket.on('wtw-join', ({ roomId, playerName }, callback) => {
      const room = rooms.get(roomId?.toUpperCase());
      if (!room) {
        return callback && callback({ error: 'Room not found. Check the code and try again.' });
      }
      if (!playerName || typeof playerName !== 'string' || !playerName.trim()) {
        return callback && callback({ error: 'Name is required' });
      }
      const name = playerName.trim().substring(0, 20);

      // Reconnection — same name, was in the room
      const existing = room.players.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existing && !existing.connected) {
        existing.id = socket.id;
        existing.connected = true;
        socket.join(roomId);
        room.lastActivity = Date.now();
        log(roomId, `"${name}" reconnected`);
        broadcastRoomState(room);
        return callback && callback({ roomState: getClientRoomState(room) });
      }

      // Name conflict with active player
      if (existing && existing.connected) {
        return callback && callback({ error: `"${name}" is already in this room. Choose a different name.` });
      }

      // Game already started — only allow reconnects
      if (room.status !== 'LOBBY') {
        return callback && callback({ error: 'Game already in progress. You can only reconnect if you were a player.' });
      }

      // Too many players
      if (room.players.length >= 12) {
        return callback && callback({ error: 'Room is full (max 12 players).' });
      }

      room.players.push({
        id: socket.id,
        name,
        isHost: false,
        score: 0,
        connected: true,
        hasSubmittedQuestion: false,
        hasVoted: false,
      });
      socket.join(roomId);
      room.lastActivity = Date.now();
      log(roomId, `"${name}" joined (${room.players.length} players)`);
      broadcastRoomState(room);
      callback && callback({ roomState: getClientRoomState(room) });
    });

    // ── UPDATE SETTINGS (host only) ──────────────────────────────────────────
    socket.on('wtw-update-settings', ({ questionTime, voteTime, questionsPerPlayer, showRealTimeResults }, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only the host can change settings' });
      if (room.status !== 'LOBBY') return callback && callback({ error: 'Cannot change settings mid-game' });

      const validQTimes = [30, 60, 90, 120];
      const validVTimes = [10, 15, 20, 30];
      const validQPP = [1, 2, 3];

      if (questionTime !== undefined && validQTimes.includes(questionTime)) room.settings.questionTime = questionTime;
      if (voteTime !== undefined && validVTimes.includes(voteTime)) room.settings.voteTime = voteTime;
      if (questionsPerPlayer !== undefined && validQPP.includes(questionsPerPlayer)) room.settings.questionsPerPlayer = questionsPerPlayer;
      if (showRealTimeResults !== undefined) room.settings.showRealTimeResults = !!showRealTimeResults;

      broadcastRoomState(room);
      callback && callback({ ok: true });
    });

    // ── START GAME (host only) ───────────────────────────────────────────────
    socket.on('wtw-start-game', (_, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only the host can start the game' });
      if (room.status !== 'LOBBY') return callback && callback({ error: 'Game already started' });
      if (room.players.filter(p => p.connected).length < 3) {
        return callback && callback({ error: 'Need at least 3 players to start' });
      }

      log(room.roomId, 'Game starting...');
      callback && callback({ ok: true });
      transitionToPhase(room, 'QUESTION_PHASE');
    });

    // ── SUBMIT QUESTION ──────────────────────────────────────────────────────
    socket.on('wtw-submit-question', ({ questionText }, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.status !== 'QUESTION_PHASE') return callback && callback({ error: 'Not in question phase' });

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return callback && callback({ error: 'Player not found' });

      const text = (questionText || '').trim().substring(0, 200);
      if (!text) return callback && callback({ error: 'Question cannot be empty' });

      // Count how many questions this player has already submitted
      const alreadySubmitted = room.questions.filter(q => q.authorId === socket.id).length;
      if (alreadySubmitted >= room.settings.questionsPerPlayer) {
        return callback && callback({ error: `You can only submit ${room.settings.questionsPerPlayer} question(s)` });
      }

      room.questions.push({
        id: uuidv4(),
        text,
        authorId: socket.id, // kept server-side only — never sent to clients
        votes: {}, // { [voterId]: voteeId }
      });

      // Mark player as having submitted all their questions
      if (alreadySubmitted + 1 >= room.settings.questionsPerPlayer) {
        player.hasSubmittedQuestion = true;
      }

      room.lastActivity = Date.now();
      broadcastRoomState(room);
      callback && callback({ ok: true, submitted: alreadySubmitted + 1, total: room.settings.questionsPerPlayer });

      // Auto-advance if all players submitted all questions
      const totalExpected = room.settings.questionsPerPlayer * room.players.filter(p => p.connected).length;
      if (room.questions.length >= totalExpected) {
        log(room.roomId, 'All questions submitted — advancing to VOTING');
        if (room.timerId) clearInterval(room.timerId);
        transitionToPhase(room, 'VOTING_PHASE');
      }
    });

    // ── SUBMIT VOTE ──────────────────────────────────────────────────────────
    socket.on('wtw-submit-vote', ({ voteeId }, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.status !== 'VOTING_PHASE') return callback && callback({ error: 'Not in voting phase' });

      const voter = room.players.find(p => p.id === socket.id);
      if (!voter) return callback && callback({ error: 'Player not found' });
      if (voter.hasVoted) return callback && callback({ error: 'You have already voted' });

      // No self-voting
      if (voteeId === socket.id) return callback && callback({ error: 'You cannot vote for yourself' });

      const votee = room.players.find(p => p.id === voteeId);
      if (!votee) return callback && callback({ error: 'Invalid vote target' });

      const q = room.questions[room.currentQuestionIndex];
      if (!q) return callback && callback({ error: 'No active question' });

      q.votes[socket.id] = voteeId;
      voter.hasVoted = true;
      room.lastActivity = Date.now();

      // If real-time results are on, broadcast updated vote counts (not raw votes)
      if (room.settings.showRealTimeResults) {
        const voteCounts = getVoteCounts(q, room.players);
        global.wtwIo.to(room.roomId).emit('wtw-vote-update', {
          questionIndex: room.currentQuestionIndex,
          voteCounts,
          votedCount: room.players.filter(p => p.hasVoted).length,
        });
      }

      broadcastRoomState(room);
      callback && callback({ ok: true });

      // Auto-advance if all connected players voted
      const activePlayers = room.players.filter(p => p.connected);
      const allVoted = activePlayers.every(p => p.hasVoted);
      if (allVoted) {
        log(room.roomId, 'All players voted — advancing to QUESTION_RESULTS');
        if (room.timerId) clearInterval(room.timerId);
        transitionToPhase(room, 'QUESTION_RESULTS');
      }
    });

    // ── NEXT ROUND (host — from FINAL_SCORES back to QUESTION_PHASE) ─────────
    socket.on('wtw-next-round', (_, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only the host can start a new round' });
      if (room.status !== 'FINAL_SCORES') return callback && callback({ error: 'Can only start new round from Final Scores screen' });

      // Reset scores for fresh game
      room.players.forEach(p => { p.score = 0; });
      transitionToPhase(room, 'QUESTION_PHASE');
      callback && callback({ ok: true });
    });

    // ── SKIP TO RESULTS (host — force advance voting phase) ──────────────────
    socket.on('wtw-skip-voting', (_, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback && callback({ error: 'Not in a room' });
      if (room.hostId !== socket.id) return callback && callback({ error: 'Only the host can skip' });
      if (room.status !== 'VOTING_PHASE') return callback && callback({ error: 'Not in voting phase' });

      if (room.timerId) clearInterval(room.timerId);
      transitionToPhase(room, 'QUESTION_RESULTS');
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
  global.wtwIo = io;
};
