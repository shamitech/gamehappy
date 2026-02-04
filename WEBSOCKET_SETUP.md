# WebSocket Server Setup & Testing

## Installation

1. **Navigate to websocket directory**
   ```bash
   cd websocket
   ```

2. **Install dependencies** (if not already installed)
   ```bash
   npm install
   ```

3. **Start the server**
   ```bash
   node server.js
   ```

   You should see:
   ```
   Socket.IO server running at wss://gamehappy.app/websocket
   Ready to handle: secretsyndicates and future games
   ```

## Testing the Game

### Local Testing (Development)

1. Open browser to: `https://gamehappy.app/`
2. Click "Secret Syndicates"
3. Click "Create Game" 
4. Enter your name and optional settings
5. Share the 4-letter game code with other players
6. Other players click "Join Game" and enter the code
7. Once 5+ players are in, host can click "Start Game"

### Testing with Multiple Players Locally

Open multiple browser windows/tabs to the same game:
- Each tab creates a new "player"
- You can test game mechanics across different roles
- Server broadcasts state changes to all players in game

## Current Implementation

### Implemented Features ✓
- Game creation and joining
- Player management
- Role assignment system
- Phase management (structure ready)
- Game state broadcasting
- Socket.IO connection handling
- Auto-reconnection

### Ready for Next Phase
- Role-specific UI interactions
- Night phase syndicate voting
- Day phase discussions and voting
- Trial system
- Win condition checking
- Game completion

## Debugging

### Check Server Status
Use browser console when connected:
```javascript
socket.emit('debug-games', (response) => {
    console.log('Active games:', response.games);
});
```

### Monitor Server Output
Watch terminal where `node server.js` is running for:
- `Player connected: [socket-id]`
- `Creating game: [game-type]`
- `Game started: [game-code]`
- `Player disconnected: [socket-id]`

### Browser Console
Player-side debugging:
```javascript
console.log(game.gameCode);        // Current game code
console.log(game.playerName);      // Player name
console.log(game.playerToken);     // Session token
console.log(game.role);            // Assigned role
socket.connected;                  // Socket.IO connection status
```

## Common Issues

### "Game not found"
- Verify game code is exactly 4 letters
- Game may have been ended/cleaned up
- Check server is still running

### "Not connected to server"
- Check browser shows green connection status indicator
- Verify websocket path in nginx is correct
- Check SSL certificates are valid

### "Only host can start game"
- Make sure the player who created the game is clicking Start
- Check `game.isHost` in console

### "Need at least 5 players"
- Minimum required: 5 players
- Player count shown in lobby as "X/5 minimum"

## Next Steps

1. **Implement UI for game phases**
   - Update phase screens with server state
   - Handle role-specific interfaces

2. **Complete voting systems**
   - Syndicate night votes
   - Day accusations
   - Trial verdicts

3. **Add role-specific features**
   - Detective investigations
   - Eye Witness information
   - Body Guard protections

4. **Polish gameplay**
   - Add game sounds/animations
   - Better error messages
   - Improved UI/UX

## Architecture Notes

The backend is designed to easily support additional games:
- Each game extends `GameManager` base class
- Register new games in `GameServer.js` create method
- Client integration varies by game mechanics
- Server handles all game state and validation
