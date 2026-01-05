# GameHappy Server Architecture

## Overview
A modular, extensible WebSocket server built with Node.js and Socket.IO that supports multiple multiplayer games.

## Structure

```
websocket/
├── server.js                  # Main Socket.IO server
├── package.json              # Node.js dependencies
├── key.pem                   # SSL certificate key
├── cert.pem                  # SSL certificate
└── games/
    ├── GameManager.js        # Base class for all games
    ├── GameServer.js         # Game instance manager
    └── SecretSyndicates.js   # Secret Syndicates game logic
```

## Core Components

### 1. **GameManager** (`games/GameManager.js`)
- Base abstract class for all games
- Manages players, game state, and common functionality
- Methods:
  - `addPlayer(token, name)` - Add player to game
  - `removePlayer(token)` - Remove player from game
  - `canStart()` - Check if game can start
  - `startGame()` - Initialize game
  - `handleEvent(eventName, token, data)` - Process game events
  - `getGameState()` - Get current game state
  - `getLobbyInfo()` - Get lobby information

### 2. **GameServer** (`games/GameServer.js`)
- Manages all active game instances
- Creates and deletes games
- Routes player actions to correct game
- Methods:
  - `createGame(gameType, token, name)` - Create new game instance
  - `joinGame(code, token, name)` - Player joins existing game
  - `startGame(code, token)` - Start a game
  - `handleGameEvent(token, event, data)` - Route events to game
  - `removePlayerFromGame(token)` - Player leaves game
  - `generateGameCode()` - Generate 4-letter game codes
  - `cleanupOldGames()` - Memory management

### 3. **SecretSyndicates** (`games/SecretSyndicates.js`)
- Extends GameManager
- Implements Mafia-style social deduction game
- Features:
  - Role assignment (Syndicate, Detective, Bystander, Eye Witness, Body Guard)
  - Phase management (night, murder, discussion, vote, trial)
  - Game state tracking
  - Win condition checking

## Socket.IO Events

### Server → Client (Server emits)
- `game-created` - Game successfully created
- `player-joined` - New player joined
- `game-started` - Game phase begins
- `game-state-updated` - Game state changed
- `player-ready-updated` - Player ready count updated
- `player-left` - Player left game
- `player-disconnected` - Player lost connection

### Client → Server (Client emits)
- `create-game` - Create new game with settings
- `join-game` - Join existing game
- `start-game` - Start game (host only)
- `leave-game` - Leave current game
- `get-game-state` - Request current state
- `game-event` - Trigger game-specific action
- `player-ready` - Mark player as ready

## Adding New Games

To add a new game (e.g., "tic-tac-toe"):

1. **Create game logic file** (`websocket/games/TicTacToe.js`):
```javascript
const GameManager = require('./GameManager');

class TicTacToe extends GameManager {
    constructor(gameCode) {
        super(gameCode, 'tictactoe');
        // Game-specific initialization
    }

    canStart() {
        return this.getPlayerCount() === 2;
    }

    startGame() {
        this.gameState = 'started';
        // Game initialization
        return { success: true };
    }

    handleEvent(eventName, playerToken, data) {
        switch(eventName) {
            case 'place-mark':
                // Handle move
                break;
        }
    }

    getGameState() {
        return {
            ...super.getGameState(),
            // Game-specific state
        };
    }
}

module.exports = TicTacToe;
```

2. **Register in GameServer.js**:
```javascript
if (gameType === 'tictactoe') {
    game = new TicTacToe(gameCode);
}
```

3. **Update client to support new game** in `gamehappy.app/tictactoe/js/game.js`

## Game Flow Example: Secret Syndicates

1. **Create Game**
   - Player creates game with settings
   - Server generates 4-letter code
   - Player becomes host

2. **Join Game**
   - Other players join with code
   - Game waits for minimum players (5)

3. **Start Game**
   - Host clicks "Start Game"
   - Server assigns roles randomly
   - Game transitions to "night" phase

4. **Game Phases**
   - Night: Syndicate votes on target
   - Murder: Reveal assassination
   - Discussion: Players discuss
   - Vote: Accuse suspicious player
   - Trial: Vote guilty/not guilty

5. **Win Condition**
   - Syndicate wins: Equals or outnumbers Town
   - Town wins: All Syndicate eliminated

## Running the Server

```bash
cd websocket
npm install
node server.js
```

Server runs on: `wss://gamehappy.app/websocket` (via nginx reverse proxy)

## Client Connection

```javascript
const socket = io('wss://gamehappy.app/websocket', {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
});
```

## Memory Management

Empty games are cleaned up automatically after 24 hours:
```javascript
gameServer.cleanupOldGames(24 * 60 * 60 * 1000);
```

## Future Enhancements

- Database persistence (games, player stats, history)
- Authentication system
- Ranked matchmaking
- Spectator mode
- Game recording/replay
- Chat system
- Custom game settings per game type
- Analytics and metrics
