# Flag Guardians - Development Reference Guide

## Socket.IO Event Flow

### Creating a Game (Client Perspective)

```javascript
// Step 1: User enters name and clicks "Create Game"
socket.emit('game:create', { playerName: 'John' }, (response) => {
  if (response.success) {
    // Success! Game created with code
    console.log('Game Code:', response.gameCode); // e.g., "AB3X7Z"
    console.log('Player Token:', response.playerToken);
  }
});

// Step 2: Server creates game and joins socket to room
// Step 3: Client receives 'game:created' event from server
socket.on('game:created', (data) => {
  console.log('Game created:', data.gameCode);
  console.log('Players:', data.players);
  // Show lobby screen
});
```

### Joining a Game

```javascript
// Step 1: User enters game code and name
socket.emit('game:join', 
  { gameCode: 'AB3X7Z', playerName: 'Jane' }, 
  (response) => {
    if (response.success) {
      console.log('Joined game:', response.gameCode);
    }
  }
);

// Step 2: Server joins player to game
// Step 3: Client receives 'game:joined' event
socket.on('game:joined', (data) => {
  console.log('Game joined');
  console.log('Red Team:', data.redTeam);
  console.log('Blue Team:', data.blueTeam);
});
```

### Selecting a Team

```javascript
// User clicks "Join Red Team"
socket.emit('lobby:select-team',
  { gameCode: 'AB3X7Z', team: 'red' },
  (response) => {
    if (response.success) {
      console.log('Team selected');
    }
  }
);

// Server broadcasts update to all players
socket.on('lobby:updated', (data) => {
  console.log('Updated teams:');
  console.log('Red:', data.redTeam);
  console.log('Blue:', data.blueTeam);
  // Update UI with new team rosters
});
```

### Starting the Game

```javascript
// Host clicks "Start Game"
socket.emit('game:start',
  { gameCode: 'AB3X7Z' },
  (response) => {
    if (response.success) {
      console.log('Game started');
    }
  }
);

// All players receive game started event
socket.on('game:started', (data) => {
  console.log('Game phase started');
  console.log('Red Team:', data.redTeam);
  console.log('Blue Team:', data.blueTeam);
  console.log('Round:', data.currentRound);
  // Show game screen
});
```

### Leaving a Game

```javascript
socket.emit('game:leave',
  { gameCode: 'AB3X7Z' },
  (response) => {
    // Return to home screen
  }
);

// Other players notified
socket.on('lobby:player-left', (data) => {
  console.log('Player left');
  console.log('Remaining players:', data.players);
});
```

## Server-Side Implementation

### FlagGuardians.js - Game Manager

```javascript
class FlagGuardians extends GameManager {
  constructor(gameCode) {
    super(gameCode, 'flagguardians');
    
    this.teams = new Map(); // playerToken -> 'red' or 'blue'
    this.redTeam = [];      // Array of players
    this.blueTeam = [];     // Array of players
    this.redScore = 0;
    this.blueScore = 0;
    this.currentPhase = 'waiting'; // waiting, ready, active, finished
    this.currentRound = 0;
  }

  // Select team for player
  selectTeam(playerToken, team) {
    // Update teams array
    // Update team rosters
    // Return result
  }

  // Check if game can start
  canStart() {
    // At least 2 players
    // All players have selected teams
    return this.players.size >= 2 && allPlayersSelected;
  }

  // Start the game
  startGame() {
    this.gameState = 'started';
    this.currentPhase = 'active';
    this.currentRound = 1;
    return { success: true, gameState: this.getGameState() };
  }

  // Get current game state
  getGameState() {
    return {
      gameCode: this.gameCode,
      gameState: this.gameState,
      currentPhase: this.currentPhase,
      currentRound: this.currentRound,
      players: this.getPlayers(),
      redTeam: this.redTeam,
      blueTeam: this.blueTeam,
      scores: { red: this.redScore, blue: this.blueScore }
    };
  }
}
```

### GameServer.js - Game Creation

```javascript
class GameServer {
  createGame(gameType, playerToken, playerName) {
    const gameCode = this.generateGameCode(); // 6 chars

    let game;
    if (gameType === 'flagguardians') {
      game = new FlagGuardians(gameCode);
    }

    game.addPlayer(playerToken, playerName);
    this.games.set(gameCode, game);
    
    return {
      success: true,
      gameCode,
      game: game.getLobbyInfo(),
      isHost: true
    };
  }

  generateGameCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.games.has(code));
    return code;
  }
}
```

### server.js - Socket Events

```javascript
const gameServer = new GameServer();

io.on('connection', (socket) => {
  const playerToken = socket.handshake.query.token || socket.id;

  // Create game
  socket.on('game:create', (data, callback) => {
    const result = gameServer.createGame('flagguardians', playerToken, data.playerName);
    if (result.success) {
      socket.join(`game-${result.gameCode}`);
      io.to(`game-${result.gameCode}`).emit('game:created', result);
      callback({ success: true, ...result });
    } else {
      callback({ success: false, message: result.message });
    }
  });

  // Join game
  socket.on('game:join', (data, callback) => {
    const result = gameServer.joinGame(data.gameCode, playerToken, data.playerName);
    if (result.success) {
      socket.join(`game-${result.gameCode}`);
      const game = gameServer.getGame(data.gameCode);
      io.to(`game-${result.gameCode}`).emit('lobby:player-joined', {
        playerName: data.playerName,
        redTeam: game.redTeam,
        blueTeam: game.blueTeam
      });
      callback({ success: true, ...result });
    } else {
      callback({ success: false, message: result.message });
    }
  });

  // Select team
  socket.on('lobby:select-team', (data, callback) => {
    const game = gameServer.getGame(data.gameCode);
    const result = game.selectTeam(playerToken, data.team);
    if (result.success) {
      io.to(`game-${data.gameCode}`).emit('lobby:updated', {
        redTeam: game.redTeam,
        blueTeam: game.blueTeam
      });
      callback({ success: true });
    } else {
      callback({ success: false, message: result.message });
    }
  });

  // Start game
  socket.on('game:start', (data, callback) => {
    const game = gameServer.getGame(data.gameCode);
    const result = game.startGame();
    if (result.success) {
      io.to(`game-${data.gameCode}`).emit('game:started', {
        gameState: result.gameState
      });
      callback({ success: true });
    } else {
      callback({ success: false, message: result.message });
    }
  });

  // Leave game
  socket.on('game:leave', (data, callback) => {
    const game = gameServer.getGame(data.gameCode);
    if (game) {
      game.removePlayer(playerToken);
      socket.leave(`game-${data.gameCode}`);
      if (!game.isEmpty()) {
        io.to(`game-${data.gameCode}`).emit('lobby:player-left', {
          players: game.getPlayers()
        });
      }
    }
    callback({ success: true });
  });
});
```

## Client-Side Implementation

### game.js - Game Class Structure

```javascript
class Game {
  constructor() {
    this.socket = null;
    this.isHost = false;
    this.gameCode = null;
    this.playerName = null;
    this.playerToken = null;
    this.playerTeam = null;
    this.redTeamPlayers = [];
    this.blueTeamPlayers = [];
    this.init();
  }

  init() {
    this.loadSession();
    this.bindEvents();
    this.connect();
  }

  connect() {
    this.socket = io(socketUrl);
    this.socket.on('game:created', (data) => this.onGameCreated(data));
    this.socket.on('lobby:updated', (data) => this.onLobbyUpdated(data));
    this.socket.on('game:started', (data) => this.onGameStarted(data));
  }

  createGame() {
    const playerName = document.getElementById('input-player-name').value;
    this.socket.emit('game:create', { playerName }, (response) => {
      if (response.success) {
        this.playerToken = response.playerToken;
        this.gameCode = response.gameCode;
        this.isHost = true;
        this.saveSession();
        this.showScreen('lobby-screen');
      }
    });
  }

  selectTeam(team) {
    this.socket.emit('lobby:select-team',
      { gameCode: this.gameCode, team },
      (response) => {
        if (response.success) {
          this.playerTeam = team;
        }
      }
    );
  }

  startGame() {
    this.socket.emit('game:start',
      { gameCode: this.gameCode },
      (response) => { /* handle response */ }
    );
  }
}
```

## Data Flow Diagram

```
CLIENT                              SERVER
  │                                   │
  ├─ User enters name ───────────────>│
  │                           game:create
  │<────── gameCode, playerToken ──────┤
  │                                   │
  │ Shows lobby screen                │
  │                                   │
  ├─ Player joins room               >│
  │                        game:create
  │<─── lobby:updated (teams) ────────┤
  │ Updates team display              │
  │                                   │
  ├─ Player selects team ───────────>│
  │                       lobby:select-team
  │<─── lobby:updated ────────────────┤
  │ Updates UI                        │
  │                                   │
  ├─ Host clicks Start ──────────────>│
  │                            game:start
  │<─── game:started ─────────────────┤
  │ Shows game screen                 │
  │                                   │
```

## Next Steps - Game Logic

To implement active gameplay mechanics:

```javascript
// 1. Add flag capture events
socket.on('game:action', (data, callback) => {
  const result = game.handlePlayerAction(playerToken, data.action);
  io.to(`game-${gameCode}`).emit('game:state-update', result);
});

// 2. Add score tracking
socket.on('flag:capture', (data, callback) => {
  const result = game.captureFlag(playerToken);
  // Broadcast score update
});

// 3. Add round progression
socket.on('round:complete', (data, callback) => {
  const result = game.completeRound();
  if (result.gameEnded) {
    // Show results screen
  }
});

// 4. Add game results
socket.on('game:results', (data, callback) => {
  const results = game.getGameResults();
  io.to(`game-${gameCode}`).emit('game:ended', results);
});
```

## Testing Checklist

- [ ] Create game generates valid 6-character code
- [ ] Join game with valid code works
- [ ] Team selection updates both players' views
- [ ] Start button only enabled when conditions met
- [ ] Host can start game, others cannot
- [ ] Minimum 2 players enforced
- [ ] All players must select team
- [ ] Leave game removes player and updates others
- [ ] Session saved and restored correctly
- [ ] Mobile responsive on all screen sizes
- [ ] Connection error handling works
- [ ] Socket reconnection works
