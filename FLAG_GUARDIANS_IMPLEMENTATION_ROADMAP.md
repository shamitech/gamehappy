# Flag Guardians - Implementation Roadmap

## Current Status: Phase 1 ✅ Complete - Foundations in Place

The complete game infrastructure is now in place. Players can:
- Create and join games
- Select teams
- Enter flag placement phase
- See houses and place flags at coordinates
- See game map with player positions

## Phase 2 Implementation: Enable Real Gameplay 🚧 In Progress

### What's Working
- ✅ Flag placement logic (server accepts and validates)
- ✅ Game state management (phase transitions)
- ✅ Player position initialization
- ✅ Movement queuing
- ✅ Score tracking

### What's Missing
- ❌ **Movement Interval Loop** - Currently moves aren't processed every 2 seconds
- ❌ **Real-time Position Broadcasts** - Moves queue but don't execute
- ❌ **Win Condition Checking** - Scoring works but not checked
- ❌ **Building Interior Mechanics** - UI exists but no floor-specific logic

---

## Implementation Priority

### Priority 1: Movement Server Loop (CRITICAL)
**File**: `websocket/games/FlagGuardians.js`
**What to add**: Scheduled interval processor

```javascript
// In FlagGuardians constructor, add after this.moveInterval assignment:
this.moveIntervalTimer = null;

// Add new method:
startMoveIntervalTimer() {
    if (this.moveIntervalTimer) clearInterval(this.moveIntervalTimer);
    
    this.moveIntervalTimer = setInterval(() => {
        const result = this.processMoveInterval();
        
        if (result && this.phase === 'active') {
            // Broadcast updated positions to all players
            // This will emit game-state-updated to all clients
            // Trigger through GameServer or socket.io directly
        }
        
        // Check for flag captures
        this.checkFlagCaptures();
    }, this.moveInterval);
}

// Call this method in startActiveGame():
startActiveGame() {
    this.phase = 'active';
    // ... existing code ...
    this.startMoveIntervalTimer();
}

// Add cleanup:
stopMoveIntervalTimer() {
    if (this.moveIntervalTimer) {
        clearInterval(this.moveIntervalTimer);
        this.moveIntervalTimer = null;
    }
}
```

**Impact**: Once added, players will see real-time movement every 2 seconds

---

### Priority 2: Position Broadcast System
**File**: `websocket/server.js`
**What to add**: Game state update broadcasting mechanism

Currently `processMoveInterval()` returns state but it's not broadcast. Need to:

1. Store reference to socket.io in GameServer
2. When movement processes, broadcast to all players in that game:

```javascript
// In processMoveInterval result handling:
if (result && result.playerPositions) {
    // This should be called after each movement cycle
    io.to(`game-${this.gameCode}`).emit('game-state-updated', {
        gameState: result,
        playerPositions: result.playerPositions
    });
}
```

---

### Priority 3: Flag Capture Detection
**File**: `websocket/games/FlagGuardians.js`
**What to add**: Collision detection in movement processing

Add method to check if any player is at flag location:

```javascript
checkFlagCaptures() {
    for (const [playerToken, playerPos] of this.playerPositions.entries()) {
        // Check red flag capture
        if (!this.capturedFlags.red && this.flagsPlaced.red) {
            const redFlag = this.flagsPlaced.red;
            if (playerPos.x === redFlag.coord.x && playerPos.y === redFlag.coord.y) {
                const playerTeam = this.teams.get(playerToken);
                if (playerTeam === 'blue') { // Blue team captures red flag
                    this.capturedFlags.red = playerToken;
                    // Broadcast flag captured event
                }
            }
        }
        
        // Check blue flag capture
        if (!this.capturedFlags.blue && this.flagsPlaced.blue) {
            const blueFlag = this.flagsPlaced.blue;
            if (playerPos.x === blueFlag.coord.x && playerPos.y === blueFlag.coord.y) {
                const playerTeam = this.teams.get(playerToken);
                if (playerTeam === 'red') { // Red team captures blue flag
                    this.capturedFlags.blue = playerToken;
                    // Broadcast flag captured event
                }
            }
        }
    }
}
```

---

### Priority 4: Building Interior System
**File**: `websocket/games/FlagGuardians.js` and `game.js`
**What to add**: Floor-specific position tracking

Currently building system exists in UI but server doesn't know when players are inside:

1. **Add to player position tracking**:
```javascript
playerPositions.set(playerToken, {
    location: 'alley' | 'N0' | 'S5', // house or alley
    x: 0-5,     // grid x if in alley
    y: 0-2,     // grid y if in alley
    floor: 'floor1' | 'floor2', // if in building
    roomX: 0-3, // position within room if in building
    roomY: 0-3
});
```

2. **Add building entry event**:
```javascript
// In handleEvent:
case 'player:enter-building':
    return this.enterBuilding(playerToken, data.house, data.floor);

enterBuilding(playerToken, houseId, floor) {
    if (!this.playerPositions.has(playerToken)) return;
    
    const pos = this.playerPositions.get(playerToken);
    pos.location = houseId;
    pos.floor = floor;
    pos.roomX = 2; // Spawn in middle
    pos.roomY = 2;
    
    return { success: true, message: 'Entered building' };
}
```

---

### Priority 5: Visibility System (Performance)
**File**: `websocket/games/FlagGuardians.js`
**What to add**: Only broadcast nearby players

Currently all player positions are broadcast. With 100 players this becomes expensive.

```javascript
// Add method to get only nearby players:
getNearbyPlayers(playerToken) {
    const player = this.playerPositions.get(playerToken);
    if (!player) return [];
    
    const nearby = [];
    
    for (const [token, pos] of this.playerPositions.entries()) {
        if (token === playerToken) continue;
        
        const dx = Math.abs(player.x - pos.x);
        const dy = Math.abs(player.y - pos.y);
        
        // Show players within 1 cell distance (including diagonals)
        if (dx <= 1 && dy <= 1) {
            nearby.push({ token, pos });
        }
    }
    
    return nearby;
}

// Use in position broadcast - only send nearby players
```

---

## Testing Sequence

### Test 1: Basic Movement (No building)
1. Create game with 2 players
2. Place flags
3. Watch players move in alleyway
4. Verify positions update every 2 seconds
5. **Expected**: Players see each other moving

### Test 2: Flag Capture
1. Continue from Test 1
2. One player navigates to enemy flag position
3. Flag should be marked captured
4. Player must return to alleyway to score
5. **Expected**: Point awarded, flag reset

### Test 3: Win Condition
1. Continue until one team scores 3 points
2. Game should end and show winner
3. **Expected**: Game transitions to results screen

### Test 4: Building Entry (Optional)
1. Player enters house during movement
2. Should see building interior
3. Can move between floors
4. Can exit to return to map
5. **Expected**: Positions tracked in building, player seen by others outside

---

## Code Changes Needed

### Total Modifications
- **3-5 new methods** in FlagGuardians.js
- **1-2 broadcast handlers** in server.js
- **1 socket event listener** for building entry in server.js
- **Building entry/exit calls** in client game.js

### Estimated Implementation Time
- Movement loop: 30 minutes
- Position broadcast: 20 minutes
- Flag capture: 20 minutes
- Building system: 45 minutes
- Testing: 30 minutes

**Total: ~2-3 hours of focused development**

---

## Debugging Tips

### Movement Not Processing
- Check browser console for game-state-updated events
- Verify `processMoveInterval()` is being called
- Check that `lastMoveTime` is tracking correctly

### Positions Not Updating
- Verify socket broadcasts are sent (`io.to('game-XXX').emit()`)
- Check client socket listeners are registered
- Look for error in server console

### Flag Placement Not Showing
- Verify house data is being sent from server
- Check renderHousesForPlacement() in client
- Look at network tab in DevTools for house data

### Movement Clicks Not Working
- Verify socket connection is active
- Check that move is emitted: `flagguardians:move`
- Verify adjacent validation is correct

---

## Quick Start Checklist

- [ ] Read FLAG_GUARDIANS_REAL_MECHANICS.md for complete game flow
- [ ] Review FlagGuardians.js for existing methods
- [ ] Add startMoveIntervalTimer() method
- [ ] Test movement loop with console logs
- [ ] Add position broadcast in server.js
- [ ] Test real-time updates with 2 players
- [ ] Implement flag capture detection
- [ ] Test win condition (3 points)
- [ ] Add building interior support
- [ ] Full end-to-end test

---

## Files to Modify

1. **websocket/games/FlagGuardians.js** - Add movement loop and capture logic
2. **websocket/server.js** - Add position broadcast handlers
3. **gamehappy.app/flagguardians/js/game.js** - Add building entry socket events
4. **websocket/games/GameServer.js** - May need socket.io reference for broadcasting

No HTML or CSS changes needed for Phase 2.
