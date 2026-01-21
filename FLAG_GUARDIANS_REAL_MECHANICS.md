# Flag Guardians - Real Game Mechanics

## Game Overview
A real-time tactical flag capture game on a neighborhood block with multi-level building interiors.

## Map Structure

### Street Level (Alleyway)
- 6 columns (houses on north/south)
- 1 row (alleyway middle)
- Each square: 1x1 player space
- Players start here at game beginning

### House Interiors (1-2 Floors)
- **Ground Floor**: 4x4 grid of squares (house property)
- **Second Floor**: 4x4 grid (if house has 2 stories)
- **Stairs**: Special square on ground floor that leads to 2nd floor
- Players click building to enter, stairs to go up

### Named Houses
```
NORTH SIDE (Red Team Defense):
N0: Smith House      (2 floors)
N1: Jones House      (1 floor)
N2: Williams House   (2 floors)
N3: Brown House      (1 floor)
N4: Davis House      (2 floors)
N5: Miller House     (1 floor)

SOUTH SIDE (Blue Team Defense):
S0: Wilson House     (2 floors)
S1: Moore House      (1 floor)
S2: Taylor House     (2 floors)
S3: Anderson House   (1 floor)
S4: Thomas House     (2 floors)
S5: Jackson House    (1 floor)
```

## Game Phases

### Phase 1: Flag Placement (30 seconds per team)
1. Game created, players in lobby
2. Game starts → Random player from Red Team selected to place flag
3. Red Team sees their house interiors with clickable squares
4. Selected player clicks a square to place flag
5. All Red Team players notified: "Flag placed at Jones House, Ground Floor"
6. Same for Blue Team
7. Both flags placed → Move to Phase 2

### Phase 2: Active Game
1. All players start in alleyway squares (evenly distributed)
2. Players see:
   - Their position on map
   - Adjacent players (8 directions including diagonals)
   - Houses they can enter
3. Every 2 seconds: Movement window opens
   - Player clicks an adjacent square (or diagonals)
   - At 2-second interval, all players move simultaneously
4. Movement rules:
   - Can move to adjacent square (8 directions)
   - Cannot move through walls
   - Cannot move to occupied square (blocked)
   - Late clicks move next interval
   - No click = stay in place

### Phase 3: Flag Interaction
1. Reach opponent's flag square → Capture it
2. Captured flag → Must return to your starting zone
3. Return to start → Score 1 point
4. First team to 3 points wins

## Data Structures

### House
```javascript
{
  id: 'N0',
  name: 'Smith House',
  side: 'north',
  floors: 2,
  flagPlaced: false,
  flagTeam: null,
  flagFloor: null,
  flagCoord: { x: 0, y: 0 }
}
```

### Player Position
```javascript
{
  playerToken: 'abc123',
  location: 'alley',        // 'alley', 'N0-ground', 'N0-floor2', etc.
  x: 2,
  y: 0,
  team: 'red',
  hasFlagPosition: { x: 2, y: 0 },  // null if no flag
  lastMove: { x: 2, y: 0 },
  nextMoveTarget: null      // Clicked square for next interval
}
```

### Game State
```javascript
{
  gameCode: 'GAME',
  phase: 'flag-placement',  // flag-placement, active, ended
  redPlacingPlayer: 'token1',
  bluePlacingPlayer: 'token2',
  redFlag: { house: 'N0', floor: 'ground', coord: {x: 2, y: 1} },
  blueFlag: { house: 'S0', floor: 'ground', coord: {x: 1, y: 2} },
  playerPositions: {},
  scores: { red: 0, blue: 0 },
  moveInterval: 2000,       // ms between moves
  lastMoveTime: timestamp
}
```

## Socket Events

### Flag Placement Phase
**Client → Server**: `game:place-flag`
```javascript
socket.emit('game:place-flag', {
  gameCode: 'GAME',
  playerToken: 'abc123',
  houseId: 'N0',
  floor: 'ground',
  coord: { x: 2, y: 1 }
});
```

**Server → Client**: `flag:placed`
```javascript
socket.on('flag:placed', {
  team: 'red',
  houseId: 'N0',
  houseName: 'Smith House',
  floor: 'ground',
  coord: { x: 2, y: 1 }
});
```

### Active Game - Movement
**Client → Server**: `game:move`
```javascript
socket.emit('game:move', {
  gameCode: 'GAME',
  playerToken: 'abc123',
  targetSquare: { x: 3, y: 0 }
});
```

**Server → Client**: `game:positions-update`
```javascript
socket.on('game:positions-update', {
  players: [
    { playerToken: 'abc123', location: 'alley', x: 2, y: 0, team: 'red' },
    { playerToken: 'xyz789', location: 'alley', x: 3, y: 0, team: 'blue' }
  ],
  flagPositions: {
    red: { house: 'N0', floor: 'ground', coord: {x: 2, y: 1}, captured: false },
    blue: { house: 'S0', floor: 'ground', coord: {x: 1, y: 2}, captured: false }
  }
});
```

## Implementation Priority

### Step 1: Flag Placement UI (Current Focus)
- [ ] Add house data to game
- [ ] Phase detection (flag-placement vs active)
- [ ] Show house interiors on flag placement
- [ ] Allow clicking squares to place flag
- [ ] Notify all players when flags placed

### Step 2: Game Start & Movement
- [ ] Place all players in alleyway
- [ ] 2-second movement timer
- [ ] Click-to-move UI
- [ ] Update all player positions every 2 seconds
- [ ] Show adjacent players

### Step 3: Building Navigation
- [ ] Click building to enter interior
- [ ] Show ground floor map
- [ ] Click stairs to go to floor 2
- [ ] Click back to return to alley

### Step 4: Flag Capture
- [ ] Detect flag capture
- [ ] Track flag holders
- [ ] Return-to-start logic
- [ ] Scoring system
- [ ] Win conditions

## Next Steps
Start with Step 1: Create flag placement phase with house data and UI.
