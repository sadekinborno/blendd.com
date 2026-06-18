/**
 * Chor Dakat Babu Police (CDBP) - Game Manager Backend
 * Authoritative Server Logic & WebSockets Event Engine
 */

const { v4: uuidv4 } = require('uuid');

const rooms = new Map();

// Helper: Generate a unique room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Ensure uniqueness
  if (rooms.has(code)) return generateRoomCode();
  return code;
}

// Log game events
function logRoom(roomId, message) {
  console.log(`[CDBP Room ${roomId}] ${message}`);
}

module.exports = function initCDbpGame(io) {
  
  // Clean up inactive rooms periodically (e.g. every 1 hour)
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.length === 0 || (room.lastActivity && now - room.lastActivity > 4 * 60 * 60 * 1000)) {
        logRoom(roomId, 'Deleting inactive room.');
        if (room.timerId) clearInterval(room.timerId);
        rooms.delete(roomId);
      }
    }
  }, 30 * 60 * 1000);

  io.on('connection', (socket) => {

    // 1. CREATE ROOM
    socket.on('cdbp-create', ({ playerName }, callback) => {
      if (!playerName || !playerName.trim()) {
        return callback({ error: 'Name is required' });
      }

      const roomId = generateRoomCode();
      const player = {
        id: socket.id,
        name: playerName.trim(),
        isHost: true,
        points: 0,
        role: null,
        initialRole: null,
        connected: true
      };

      const room = {
        roomId,
        status: 'LOBBY',
        players: [player],
        hostId: socket.id,
        timer: 0,
        timerId: null,
        swapLogs: [],
        guesses: { chor: null, dakat: null },
        detectiveClue: '',
        spyInfo: '',
        history: [],
        lastActivity: Date.now()
      };

      rooms.set(roomId, room);
      socket.join(roomId);
      logRoom(roomId, `Created by host: ${playerName}`);

      callback({ success: true, roomId, roomState: getClientRoomState(room, socket.id) });
      io.to(roomId).emit('cdbp-room-updated', getClientRoomState(room));
    });

    // 2. JOIN ROOM
    socket.on('cdbp-join', ({ roomId, playerName }, callback) => {
      roomId = roomId.toUpperCase();
      const room = rooms.get(roomId);

      if (!room) {
        return callback({ error: 'Room not found' });
      }

      if (!playerName || !playerName.trim()) {
        return callback({ error: 'Name is required' });
      }

      const name = playerName.trim();
      room.lastActivity = Date.now();

      // Check for Reconnection
      const existingPlayer = room.players.find(p => p.name.toLowerCase() === name.toLowerCase());
      if (existingPlayer) {
        if (!existingPlayer.connected) {
          // Reconnect player slot
          existingPlayer.id = socket.id;
          existingPlayer.connected = true;
          socket.join(roomId);
          logRoom(roomId, `Player ${name} reconnected.`);
          
          callback({ success: true, roomId, roomState: getClientRoomState(room, socket.id) });
          io.to(roomId).emit('cdbp-room-updated', getClientRoomState(room));
          
          // Re-send phase info specifically to the reconnected socket
          sendPhaseChangedUpdate(room, socket.id);
          return;
        } else {
          return callback({ error: 'Player name is already in use' });
        }
      }

      // If game is in progress, no new players can join
      if (room.status !== 'LOBBY') {
        return callback({ error: 'Game is already in progress' });
      }

      if (room.players.length >= 7) {
        return callback({ error: 'Room is full (max 7 players)' });
      }

      const player = {
        id: socket.id,
        name,
        isHost: false,
        points: 0,
        role: null,
        initialRole: null,
        connected: true
      };

      room.players.push(player);
      socket.join(roomId);
      logRoom(roomId, `Player joined: ${name}`);

      callback({ success: true, roomId, roomState: getClientRoomState(room, socket.id) });
      io.to(roomId).emit('cdbp-room-updated', getClientRoomState(room));
    });

    // 3. START GAME
    socket.on('cdbp-start-game', (callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback({ error: 'Room not found' });
      if (room.hostId !== socket.id) return callback({ error: 'Only the host can start the game' });
      
      const count = room.players.length;
      if (count < 4 || count > 7) {
        return callback({ error: 'Requires between 4 and 7 players to play.' });
      }

      logRoom(room.roomId, `Game started with ${count} players.`);
      transitionToPhase(room, 'ROLE_ASSIGN');
      callback({ success: true });
    });

    // 4. JADUKAR SWAP ACTION
    socket.on('cdbp-jadukar-swap', ({ player1Name, player2Name }, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback({ error: 'Room not found' });
      if (room.status !== 'JADUKAR_SWAP') return callback({ error: 'Not in Jadukar swap phase' });
      
      const jadukarPlayer = room.players.find(p => p.role === 'Jadukar');
      if (!jadukarPlayer || jadukarPlayer.id !== socket.id) {
        return callback({ error: 'Only the Jadukar can swap roles!' });
      }

      const p1 = room.players.find(p => p.name === player1Name);
      const p2 = room.players.find(p => p.name === player2Name);

      if (!p1 || !p2) {
        return callback({ error: 'One or both players not found' });
      }

      // Execute role swap internally
      const tempRole = p1.role;
      p1.role = p2.role;
      p2.role = tempRole;

      room.swapLogs.push({ p1: p1.name, p2: p2.name });
      logRoom(room.roomId, `Jadukar swapped ${p1.name} and ${p2.name}`);

      callback({ success: true });
      // Transition early since swap was executed
      transitionToPhase(room, 'INFO_PHASE');
    });

    // 5. CHAT MESSAGES
    socket.on('cdbp-chat-message', (msgText) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return;
      if (room.status !== 'DISCUSSION') return; // Only chat in discussion

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      io.to(room.roomId).emit('cdbp-chat-message', {
        sender: player.name,
        text: msgText
      });
    });

    // 6. POLICE GUESS SUBMISSION
    socket.on('cdbp-police-decision', ({ chorPlayerName, dakatPlayerName }, callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback({ error: 'Room not found' });
      if (room.status !== 'POLICE_DECISION') return callback({ error: 'Not in Police decision phase' });

      const policePlayer = room.players.find(p => p.role === 'Police');
      if (!policePlayer || policePlayer.id !== socket.id) {
        return callback({ error: 'Only the Police can make the decision!' });
      }

      const chor = room.players.find(p => p.name === chorPlayerName);
      const dakat = room.players.find(p => p.name === dakatPlayerName);

      if (!chor || !dakat) {
        return callback({ error: 'Selected players are invalid' });
      }

      if (chor.id === dakat.id) {
        return callback({ error: 'You must select different players for Chor and Dakat' });
      }

      room.guesses = { chor: chor.name, dakat: dakat.name };
      logRoom(room.roomId, `Police guessed Chor: ${chor.name}, Dakat: ${dakat.name}`);

      callback({ success: true });
      // Proceed to reveal early
      transitionToPhase(room, 'REVEAL');
    });

    // Skip discussion early (By Host)
    socket.on('cdbp-skip-discussion', (callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback({ error: 'Room not found' });
      if (room.hostId !== socket.id) return callback({ error: 'Only the host can skip discussion' });
      if (room.status !== 'DISCUSSION') return callback({ error: 'Not in discussion phase' });

      transitionToPhase(room, 'POLICE_DECISION');
      callback({ success: true });
    });

    // 7. NEXT ROUND TRIGGER (By Host)
    socket.on('cdbp-next-round', (callback) => {
      const room = findRoomBySocketId(socket.id);
      if (!room) return callback({ error: 'Room not found' });
      if (room.hostId !== socket.id) return callback({ error: 'Only the host can start the next round' });
      if (room.status !== 'SCORING') return callback({ error: 'Not in scoring phase' });

      transitionToPhase(room, 'ROLE_ASSIGN');
      callback({ success: true });
    });

    // 8. DISCONNECT HANDLER
    socket.on('disconnect', () => {
      for (const [roomId, room] of rooms.entries()) {
        const player = room.players.find(p => p.id === socket.id);
        if (player) {
          player.connected = false;
          logRoom(roomId, `Player disconnected: ${player.name}`);

          if (room.status === 'LOBBY') {
            // Remove player if still in lobby
            room.players = room.players.filter(p => p.id !== socket.id);
            // Reassign host if needed
            if (room.hostId === socket.id && room.players.length > 0) {
              room.players[0].isHost = true;
              room.hostId = room.players[0].id;
              logRoom(roomId, `Host reassigned to ${room.players[0].name}`);
            }
          }

          // If room is empty, delete it
          const activePlayers = room.players.filter(p => p.connected);
          if (activePlayers.length === 0) {
            logRoom(roomId, 'Room empty. Deleting.');
            if (room.timerId) clearInterval(room.timerId);
            rooms.delete(roomId);
            return;
          }

          // Notify room
          io.to(roomId).emit('cdbp-room-updated', getClientRoomState(room));
          break;
        }
      }
    });

  });
};

// Find room containing socket ID
function findRoomBySocketId(socketId) {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === socketId)) return room;
  }
  return null;
}

// Map server state to a safe client JSON state (Prevents role cheating)
function getClientRoomState(room, requestSocketId = null) {
  const playersSafe = room.players.map(p => {
    const isSelf = p.id === requestSocketId;
    
    // Hide secret roles unless it's revealed or self
    // Revealed roles: Babu, Police, Jadukar (always publicly visible in their phases)
    const roleIsPublic = p.role === 'Babu' || p.role === 'Police' || (p.role === 'Jadukar' && (room.status === 'JADUKAR_SWAP' || room.status === 'REVEAL' || room.status === 'SCORING'));
    
    return {
      name: p.name,
      isHost: p.isHost,
      points: p.points,
      connected: p.connected,
      // Only reveal role details during REVEAL/SCORING, if public role, or if player is checking their own role
      role: (room.status === 'REVEAL' || room.status === 'SCORING' || roleIsPublic || isSelf) ? p.role : 'Hidden'
    };
  });

  return {
    roomId: room.roomId,
    status: room.status,
    players: playersSafe,
    hostName: room.players.find(p => p.isHost)?.name || 'Unknown',
    timer: room.timer,
    guesses: room.guesses,
    swapLogs: (room.status === 'REVEAL' || room.status === 'SCORING') ? room.swapLogs : []
  };
}

// Send secret phase data to a specific socket
function sendPhaseChangedUpdate(room, socketId) {
  const player = room.players.find(p => p.id === socketId);
  if (!player) return;

  const data = {
    status: room.status,
    timer: room.timer,
    myRole: player.role
  };

  // Attach secret information based on player role and phase
  if (room.status === 'INFO_PHASE' || room.status === 'DISCUSSION' || room.status === 'POLICE_DECISION') {
    if (player.role === 'Spy') {
      data.spyInfo = room.spyInfo;
    } else if (player.role === 'Detective') {
      data.detectiveClue = room.detectiveClue;
    }
  }

  if (room.status === 'REVEAL' || room.status === 'SCORING') {
    data.reveal = {
      guesses: room.guesses,
      swapLogs: room.swapLogs,
      actualRoles: room.players.map(p => ({ name: p.name, role: p.role, initialRole: p.initialRole }))
    };
  }

  ioToSocket(socketId, 'cdbp-phase-changed', data);
}

// Utility: emit to single socket ID directly
function ioToSocket(socketId, eventName, data) {
  // We grab the global io instance or client socket indirectly
  // The easiest way is to use express/socket setup. Since we are inside the sockets connection, we can just use io.to(socketId).emit()
  // io is passed or we can emit using standard express sockets emitter
  // Since we don't have io globally in this function, we require it or reference it from outer namespace
  // To avoid issues, we can just call it via socket references. In server.js, we initialize this and bind io.
}

// Transition state and handle logic
function transitionToPhase(room, newStatus) {
  if (room.timerId) clearInterval(room.timerId);
  room.status = newStatus;
  room.lastActivity = Date.now();

  logRoom(room.roomId, `Transitioned to status: ${newStatus}`);

  // Broadcast the base state change first
  // We'll iterate all players to send their specific secret updates
  
  if (newStatus === 'ROLE_ASSIGN') {
    room.timer = 5;
    room.guesses = { chor: null, dakat: null };
    room.swapLogs = [];
    room.detectiveClue = '';
    room.spyInfo = '';

    // Assign roles randomly
    assignRoles(room);
  } 
  
  else if (newStatus === 'JADUKAR_SWAP') {
    const hasJadukar = room.players.some(p => p.role === 'Jadukar');
    if (hasJadukar) {
      room.timer = 20;
    } else {
      // Skip phase
      return transitionToPhase(room, 'INFO_PHASE');
    }
  } 
  
  else if (newStatus === 'INFO_PHASE') {
    room.timer = 10;
    generateSecrets(room);
  } 
  
  else if (newStatus === 'DISCUSSION') {
    room.timer = 90;
  } 
  
  else if (newStatus === 'POLICE_DECISION') {
    room.timer = 45;
  } 
  
  else if (newStatus === 'REVEAL') {
    room.timer = 15;
    calculatePoints(room);
  } 
  
  else if (newStatus === 'SCORING') {
    room.timer = 0; // Infinite wait
  }

  // Broadcast phase state changes to each player individually to maintain secrets
  room.players.forEach(p => {
    if (p.connected) {
      const socket = global.ioInstance.sockets.sockets.get(p.id);
      if (socket) {
        // Send specific info
        const safeState = getClientRoomState(room, p.id);
        socket.emit('cdbp-room-updated', safeState);
        
        const phaseData = {
          status: room.status,
          timer: room.timer,
          myRole: p.role
        };
        
        if (room.status === 'INFO_PHASE' || room.status === 'DISCUSSION' || room.status === 'POLICE_DECISION') {
          if (p.role === 'Spy') phaseData.spyInfo = room.spyInfo;
          if (p.role === 'Detective') phaseData.detectiveClue = room.detectiveClue;
        }

        if (room.status === 'REVEAL' || room.status === 'SCORING') {
          phaseData.reveal = {
            guesses: room.guesses,
            swapLogs: room.swapLogs,
            actualRoles: room.players.map(pl => ({ name: pl.name, role: pl.role, initialRole: pl.initialRole }))
          };
        }

        socket.emit('cdbp-phase-changed', phaseData);
      }
    }
  });

  // Start Phase countdown timer
  if (room.timer > 0) {
    room.timerId = setInterval(() => {
      room.timer--;
      global.ioInstance.to(room.roomId).emit('cdbp-timer-update', room.timer);

      if (room.timer <= 0) {
        clearInterval(room.timerId);
        handleTimerExpiry(room);
      }
    }, 1000);
  }
}

// Randomly assign roles based on count
function assignRoles(room) {
  const count = room.players.length;
  // Core roles: Babu, Police, Chor, Dakat
  const roles = ['Babu', 'Police', 'Chor', 'Dakat'];
  
  // Conditional roles
  if (count >= 5) roles.push('Spy');
  if (count >= 6) roles.push('Detective');
  if (count >= 7) roles.push('Jadukar');

  // Shuffle roles array
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = roles[i];
    roles[i] = roles[j];
    roles[j] = temp;
  }

  // Assign to players
  room.players.forEach((p, idx) => {
    p.role = roles[idx];
    p.initialRole = roles[idx]; // Keep record of initial role before swaps
  });
}

// Generate secrets for Spy and Detective roles
function generateSecrets(room) {
  const spyPlayer = room.players.find(p => p.role === 'Spy');
  const detectivePlayer = room.players.find(p => p.role === 'Detective');
  const dakatPlayer = room.players.find(p => p.role === 'Dakat');

  // 1. Spy learns who Dakat is
  if (spyPlayer && dakatPlayer) {
    room.spyInfo = `${dakatPlayer.name} is the Dakat.`;
  }

  // 2. Detective clue generation
  if (detectivePlayer) {
    // Innocent roles are anything that is NOT Chor or Dakat
    const innocentPlayers = room.players.filter(p => p.role !== 'Chor' && p.role !== 'Dakat' && p.role !== 'Detective');
    
    if (innocentPlayers.length > 0) {
      const randType = Math.random() > 0.5 ? 'single' : 'pair';
      
      if (randType === 'single' || innocentPlayers.length < 2) {
        // Single innocent clue
        const target = innocentPlayers[Math.floor(Math.random() * innocentPlayers.length)];
        room.detectiveClue = `Player "${target.name}" is NOT a criminal.`;
      } else {
        // Pair innocent clue: select one innocent and one random criminal
        const targetInnocent = innocentPlayers[Math.floor(Math.random() * innocentPlayers.length)];
        const criminals = room.players.filter(p => p.role === 'Chor' || p.role === 'Dakat');
        if (criminals.length > 0) {
          const targetCriminal = criminals[Math.floor(Math.random() * criminals.length)];
          const names = [targetInnocent.name, targetCriminal.name].sort(() => Math.random() - 0.5);
          room.detectiveClue = `One of these players is innocent: "${names[0]}" or "${names[1]}".`;
        } else {
          const target = innocentPlayers[Math.floor(Math.random() * innocentPlayers.length)];
          room.detectiveClue = `Player "${target.name}" is NOT a criminal.`;
        }
      }
    } else {
      room.detectiveClue = "No clues are available.";
    }
  }
}

// Calculate scores at reveal
function calculatePoints(room) {
  const chorPlayer = room.players.find(p => p.role === 'Chor');
  const dakatPlayer = room.players.find(p => p.role === 'Dakat');
  const policePlayer = room.players.find(p => p.role === 'Police');

  if (!chorPlayer || !dakatPlayer || !policePlayer) return;

  const guessChor = room.guesses.chor;
  const guessDakat = room.guesses.dakat;

  const policeCorrectChor = guessChor === chorPlayer.name;
  const policeCorrectDakat = guessDakat === dakatPlayer.name;
  const policeSuccess = policeCorrectChor && policeCorrectDakat;

  logRoom(room.roomId, `Round results: Guess Correct Chor? ${policeCorrectChor}, Dakat? ${policeCorrectDakat}`);

  room.players.forEach(p => {
    let pts = 0;
    switch (p.role) {
      case 'Babu':
        pts = 1000; // Always receives +1000
        break;
      case 'Police':
        // +700 if fully correct, scaled to +300 if partially correct, else +0
        if (policeSuccess) pts = 700;
        else if (policeCorrectChor || policeCorrectDakat) pts = 300;
        else pts = 0;
        break;
      case 'Chor':
        // Chor wins if police failed to identify correctly
        pts = policeSuccess ? 0 : 400;
        break;
      case 'Dakat':
        // Dakat wins if police failed
        pts = policeSuccess ? 0 : 700;
        break;
      case 'Spy':
        // Spy gains points if criminals win (police fail)
        pts = policeSuccess ? 0 : 600;
        break;
      case 'Detective':
        // Detective gains points if police win
        pts = policeSuccess ? 250 : 0;
        break;
      case 'Jadukar':
        // chaos bonus
        pts = 400;
        break;
    }
    p.points += pts;
  });
}

// Auto transition on timer expire
function handleTimerExpiry(room) {
  if (room.status === 'ROLE_ASSIGN') {
    transitionToPhase(room, 'JADUKAR_SWAP');
  } 
  
  else if (room.status === 'JADUKAR_SWAP') {
    // Proceed without swap log
    transitionToPhase(room, 'INFO_PHASE');
  } 
  
  else if (room.status === 'INFO_PHASE') {
    transitionToPhase(room, 'DISCUSSION');
  } 
  
  else if (room.status === 'DISCUSSION') {
    transitionToPhase(room, 'POLICE_DECISION');
  } 
  
  else if (room.status === 'POLICE_DECISION') {
    // If police timer expires without guess, assign random guesses!
    if (!room.guesses.chor || !room.guesses.dakat) {
      const policePlayer = room.players.find(p => p.role === 'Police');
      const candidates = room.players.filter(p => p.role !== 'Police');
      
      if (candidates.length >= 2) {
        // Shuffle candidates
        const shuffled = [...candidates].sort(() => Math.random() - 0.5);
        room.guesses = {
          chor: shuffled[0].name,
          dakat: shuffled[1].name
        };
        logRoom(room.roomId, `Police guess expired. Auto-guessing Chor: ${shuffled[0].name}, Dakat: ${shuffled[1].name}`);
      }
    }
    transitionToPhase(room, 'REVEAL');
  } 
  
  else if (room.status === 'REVEAL') {
    transitionToPhase(room, 'SCORING');
  }
}

// Save the io instance globally for game manager functions to access
module.exports.bindIO = function (io) {
  global.ioInstance = io;
};
