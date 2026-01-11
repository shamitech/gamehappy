# Flag Guardians - Game Setup Guide

## Overview
Flag Guardians is a team-based capture-the-flag mobile game built with Socket.IO. Players are divided into two teams (Red and Blue) and compete to capture and defend flags.

## Project Structure

### Client-Side Files
- **index.html** - Main game interface with all screen layouts
  - Home screen with navigation
  - Create/Join game screens
  - Lobby screen with team selection
  - Game screen with real-time gameplay
  - Results screen with final scores
  
- **css/style.css** - Modern tech-forward styling
  - Red vs Blue team themes
  - Mobile-optimized responsive design
  - Smooth animations and transitions
  - Neon/sci-fi aesthetic with gradients
  
- **js/game.js** - Client-side game logic
  - Socket.IO connection management
  - Game creation and joining
  - Team selection handling
  - Lobby management
  - Session persistence using sessionStorage
  - Real-time UI updates

### Server-Side Files
- **websocket/games/FlagGuardians.js** - Server game manager
  - Extends GameManager base class
  - Team management (Red/Blue)
  - Game state tracking
  - Flag capture mechanics
  - Score tracking
  - Game lifecycle (waiting → ready → active → finished)
  
- **websocket/games/GameServer.js** - Updated to support Flag Guardians
  - Game creation and joining logic
  - 6-character alphanumeric game code generation
  - Player session management
  
- **websocket/server.js** - Socket.IO event handlers
  - `game:create` - Create new game
  - `game:join` - Join existing game
  - `lobby:select-team` - Select Red or Blue team
  - `game:start` - Start the game (host only)
  - `game:leave` - Leave the game

## Game Rules

### Objective
- Capture and defend flags to score points
- First team to reach victory conditions wins

### Teams
- **Red Team** (🔴) - Defend red flag, capture blue flag
- **Blue Team** (🔵) - Defend blue flag, capture red flag

### Minimum Players
- 2 players minimum (1v1 configuration)
- Can support up to 8 players

### Game Flow
1. **Waiting Phase** - Players join and select teams
2. **Active Phase** - Teams compete to capture flags
3. **Results Phase** - Final scores and winner announcement

## Key Features

### Game Code System
- 6-character alphanumeric codes (e.g., "AB3X7Z")
- Ensures unique game identification
- Easy to share with friends

### Mobile Responsive
- Designed for mobile viewports
- Touch-friendly interface
- Fits screens from 320px to 500px width
- Proper scaling on all devices

### Team Management
- Players select team before game starts
- Real-time team roster updates
- Visual distinction between teams (Red/Blue)
- Minimum player requirement enforced

### Session Management
- Player sessions saved to browser storage
- Quick reconnection support
- Game code and player token preservation

## Socket Events

### Client to Server
```javascript
socket.emit('game:create', { playerName }, callback)
socket.emit('game:join', { gameCode, playerName }, callback)
socket.emit('lobby:select-team', { gameCode, team }, callback)
socket.emit('game:start', { gameCode }, callback)
socket.emit('game:leave', { gameCode }, callback)
```

### Server to Client
```javascript
socket.on('game:created', data)
socket.on('game:joined', data)
socket.on('lobby:updated', data)
socket.on('lobby:player-joined', data)
socket.on('lobby:player-left', data)
socket.on('game:started', data)
socket.on('game:error', data)
```

## Accessing the Game

### Local Development
```
http://localhost:3000/gamehappy.app/flagguardians/
```

### Production
```
https://gamehappy.app/gamehappy.app/flagguardians/
```

## Next Steps - Game Logic Implementation

To extend Flag Guardians with active gameplay:

1. **Add Player Actions**
   - Flag capture mechanics
   - Flag defense mechanics
   - Round progression

2. **Implement Scoring System**
   - Points for flag captures
   - Round results calculation
   - Victory conditions

3. **Add Game Events**
   - Real-time action notifications
   - Flag status updates
   - Score tracking

4. **Create Admin Dashboard**
   - Live game monitoring
   - Player action tracking
   - Game statistics

## File Locations

```
gamehappy.app/flagguardians/
├── index.html           (Main game interface)
├── css/
│   └── style.css       (Styling - 1200+ lines)
└── js/
    └── game.js         (Client logic - 500+ lines)

websocket/games/
├── FlagGuardians.js    (Server game manager)
├── GameServer.js       (Updated for Flag Guardians)
└── GameManager.js      (Base class)

websocket/
└── server.js           (Socket.IO handlers added)
```

## Team Specifications

- **Minimum Players**: 2 (1v1)
- **Maximum Players**: 8 (4v4)
- **Game Rounds**: 3 best-of-3
- **Team Sizes**: Flexible (can be unbalanced)

## Technical Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Communication**: Socket.IO 4.5.4
- **Server**: Node.js with Express
- **Game Logic**: Custom JavaScript classes

## Current Status

✅ Create Game functionality
✅ Join Game with 6-character codes
✅ Team selection (Red/Blue)
✅ Mobile-optimized UI
✅ Real-time lobby updates
✅ Host controls
✅ Session management

⏳ Active gameplay mechanics
⏳ Flag capture/defense logic
⏳ Scoring system
⏳ Results calculation
