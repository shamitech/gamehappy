const GameManager = require('./GameManager');

class FlagGuardians extends GameManager {
    constructor(gameCode) {
        super(gameCode, 'flagguardians');
        
        // Team assignments
        this.teams = new Map(); // playerToken -> 'red' or 'blue'
        
        // Game phase: 'waiting', 'flag-placement', 'active', 'finished'
        this.phase = 'waiting';
        this.phaseStartTime = null;
        
        // Scores
        this.redScore = 0;
        this.blueScore = 0;
        
        // Team rosters
        this.redTeam = [];
        this.blueTeam = [];
        
        // Flag placement
        this.flagPlacementPlayers = {
            red: null,   // playerToken selected to place red flag
            blue: null   // playerToken selected to place blue flag
        };
        this.flagsPlaced = {
            red: null,   // { house, floor, coord: {x,y} }
            blue: null
        };
        
        // Player positions during active game
        this.playerPositions = new Map(); // playerToken -> { location, x, y, nextMoveTarget, lastMove }
        
        // Movement tracking
        this.lastMoveTime = null;
        this.moveInterval = 2000; // 2 seconds
        
        // Flag status
        this.capturedFlags = {
            red: null,   // playerToken holding red flag, null if secure
            blue: null
        };
        
        // House data
        this.houses = this.initializeHouses();
    }

    /**
     * Initialize house data with locations
     */
    initializeHouses() {
        const houses = {};
        
        // Blue team (North side) house names
        const blueHouseNames = ['Sentinel', 'Guardian', 'Fortress', 'Bastion', 'Tower',
                               'Castle', 'Keep', 'Citadel', 'Haven', 'Sanctuary'];
        
        // Red team (South side) house names  
        const redHouseNames = ['Outpost', 'Stronghold', 'Bunker', 'Garrison', 'Redoubt',
                              'Blockade', 'Rampart', 'Bulwark', 'Lair', 'Compound'];
        
        // 10x10 grid of houses (each house occupies a grid square)
        // North side (Blue): rows 0-4, South side (Red): rows 5-9
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                const houseIndex = row * 10 + col;
                const side = row < 5 ? 'north' : 'south';
                const nameArray = side === 'north' ? blueHouseNames : redHouseNames;
                const nameIndex = (row * 10 + col) % nameArray.length;
                const name = nameArray[nameIndex];
                
                houses[`H${houseIndex}`] = {
                    id: `H${houseIndex}`,
                    name: `${name} (${row},${col})`,
                    side: side,
                    team: side === 'north' ? 'blue' : 'red',
                    floors: (houseIndex % 3) + 1,
                    row: row,
                    col: col,
                    // Tile grid: each house occupies a 10x10 tile area
                    tileX: col * 10,
                    tileY: row * 10,
                    tileWidth: 10,
                    tileHeight: 10,
                    // Floor layout: each floor is a 10x10 grid of tiles
                    floorTiles: this.generateFloorLayout((houseIndex % 3) + 1)
                };
            }
        }
        
        return houses;
    }
    
    /**
     * Generate floor layout (grid of tiles for each floor)
     */
    generateFloorLayout(floorCount) {
        const floors = {};
        for (let f = 1; f <= floorCount; f++) {
            floors[`floor${f}`] = {
                width: 10,
                height: 10,
                tiles: this.generateFloorTiles()
            };
        }
        return floors;
    }
    
    /**
     * Generate individual floor tiles (10x10 grid)
     */
    generateFloorTiles() {
        const tiles = {};
        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 10; x++) {
                const tileId = `tile_${x}_${y}`;
                tiles[tileId] = {
                    x: x,
                    y: y,
                    type: this.getRandomTileType(),
                    accessible: true
                };
            }
        }
        return tiles;
    }
    
    /**
     * Get random tile type for variety
     */
    getRandomTileType() {
        const types = ['floor', 'wall', 'door', 'window'];
        const walls = Math.random() < 0.2 ? 'wall' : 'floor';
        return walls;
    }

    /**
     * Add a player to the game
     */
    addPlayer(playerToken, playerName) {
        const result = super.addPlayer(playerToken, playerName);
        if (result.success) {
            this.teams.set(playerToken, null); // Team TBD
        }
        return result;
    }

    /**
     * Remove a player from the game
     */
    removePlayer(playerToken) {
        this.teams.delete(playerToken);
        
        const team = this.teams.get(playerToken);
        if (team === 'red') {
            this.redTeam = this.redTeam.filter(p => p.token !== playerToken);
        } else if (team === 'blue') {
            this.blueTeam = this.blueTeam.filter(p => p.token !== playerToken);
        }
        
        return super.removePlayer(playerToken);
    }

    /**
     * Player selects a team
     */
    selectTeam(playerToken, team) {
        if (!this.players.has(playerToken)) {
            return { success: false, message: 'Player not found' };
        }
        
        if (team !== 'red' && team !== 'blue') {
            return { success: false, message: 'Invalid team' };
        }
        
        const player = this.players.get(playerToken);
        this.teams.set(playerToken, team);
        
        const teamArray = team === 'red' ? this.redTeam : this.blueTeam;
        teamArray.push({ token: playerToken, name: player.name });
        
        return {
            success: true,
            redTeam: this.redTeam,
            blueTeam: this.blueTeam
        };
    }

    /**
     * Start the game - transition from waiting to flag-placement
     */
    startGame() {
        if (this.redTeam.length === 0 || this.blueTeam.length === 0) {
            return { success: false, message: 'Both teams must have players' };
        }
        
        this.phase = 'flag-placement';
        this.phaseStartTime = Date.now();
        
        // Randomly select a player from each team to place flags
        this.flagPlacementPlayers.red = this.redTeam[Math.floor(Math.random() * this.redTeam.length)].token;
        this.flagPlacementPlayers.blue = this.blueTeam[Math.floor(Math.random() * this.blueTeam.length)].token;
        
        return {
            success: true,
            phase: this.phase,
            redPlacingPlayer: this.flagPlacementPlayers.red,
            bluePlacingPlayer: this.flagPlacementPlayers.blue,
            houses: this.houses
        };
    }

    /**
     * Player places their team's flag
     */
    placeFlag(playerToken, houseId, floor, coord) {
        let team = null;
        
        if (playerToken === this.flagPlacementPlayers.red) {
            team = 'red';
        } else if (playerToken === this.flagPlacementPlayers.blue) {
            team = 'blue';
        } else {
            return { success: false, message: 'You are not authorized to place flag' };
        }
        
        if (!this.houses[houseId]) {
            return { success: false, message: 'Invalid house' };
        }
        
        const house = this.houses[houseId];
        
        // Validate floor
        if (floor === 'floor2' && house.floors < 2) {
            return { success: false, message: 'This house does not have a second floor' };
        }
        
        // Store flag position
        this.flagsPlaced[team] = {
            house: houseId,
            houseName: house.name,
            floor: floor,
            coord: coord
        };
        
        // Check if both flags are placed
        const bothPlaced = this.flagsPlaced.red && this.flagsPlaced.blue;
        
        if (bothPlaced) {
            this.startActiveGame();
        }
        
        return {
            success: true,
            team: team,
            flagPosition: this.flagsPlaced[team],
            bothFlagsPlaced: bothPlaced
        };
    }

    /**
     * Both flags placed - start active game
     */
    startActiveGame() {
        this.phase = 'active';
        this.phaseStartTime = Date.now();
        this.lastMoveTime = Date.now();
        
        // Initialize player positions in alleyway
        const alleyPositions = [
            { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 },
            { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 }
        ];
        
        let posIndex = 0;
        for (const playerToken of this.players.keys()) {
            const pos = alleyPositions[posIndex % alleyPositions.length];
            this.playerPositions.set(playerToken, {
                location: 'alley',
                x: pos.x,
                y: pos.y,
                nextMoveTarget: null,
                lastMove: pos
            });
            posIndex++;
        }
    }

    /**
     * Player submits movement target
     */
    movePlayer(playerToken, targetX, targetY) {
        if (!this.playerPositions.has(playerToken)) {
            return { success: false, message: 'Player position not found' };
        }
        
        const playerPos = this.playerPositions.get(playerToken);
        
        // Validate target is adjacent (including diagonals)
        const dx = Math.abs(targetX - playerPos.x);
        const dy = Math.abs(targetY - playerPos.y);
        
        if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) {
            return { success: false, message: 'Target must be adjacent' };
        }
        
        // Store the target for next movement cycle
        playerPos.nextMoveTarget = { x: targetX, y: targetY };
        
        return { success: true, message: 'Move registered' };
    }

    /**
     * Process movement for all players (called every 2 seconds)
     */
    processMoveInterval() {
        if (this.phase !== 'active') return null;
        
        const now = Date.now();
        if (now - this.lastMoveTime < this.moveInterval) {
            return null; // Not time yet
        }
        
        this.lastMoveTime = now;
        
        // Move all players with pending moves
        for (const [playerToken, playerPos] of this.playerPositions.entries()) {
            if (playerPos.nextMoveTarget) {
                playerPos.x = playerPos.nextMoveTarget.x;
                playerPos.y = playerPos.nextMoveTarget.y;
                playerPos.lastMove = { ...playerPos.nextMoveTarget };
                playerPos.nextMoveTarget = null;
            }
        }
        
        // Return updated positions for broadcast
        return this.getGameState();
    }

    /**
     * Get current game state for clients
     */
    getGameState() {
        const state = {
            phase: this.phase,
            redScore: this.redScore,
            blueScore: this.blueScore,
            redTeam: this.redTeam,
            blueTeam: this.blueTeam
        };
        
        if (this.phase === 'flag-placement') {
            state.redPlacingPlayer = this.flagPlacementPlayers.red;
            state.bluePlacingPlayer = this.flagPlacementPlayers.blue;
            state.houses = this.houses;
        } else if (this.phase === 'active') {
            state.playerPositions = Array.from(this.playerPositions.entries()).map(([token, pos]) => ({
                playerToken: token,
                playerName: this.players.get(token).name,
                team: this.teams.get(token),
                location: pos.location,
                x: pos.x,
                y: pos.y
            }));
            state.redFlag = this.flagsPlaced.red;
            state.blueFlag = this.flagsPlaced.blue;
            state.capturedFlags = this.capturedFlags;
        }
        
        return state;
    }

    /**
     * Handle game-specific events
     */
    handleEvent(eventName, playerToken, data) {
        console.log(`[${this.gameCode}] FlagGuardians event: ${eventName}`, data);
        
        switch (eventName) {
            case 'flag:place':
                return this.placeFlag(playerToken, data.house, data.floor, data.coord);
            
            case 'player:move':
                return this.movePlayer(playerToken, data.x, data.y);
            
            case 'flag:capture':
                return this.captureFlag(playerToken);
            
            case 'flag:return':
                return this.returnFlag(playerToken);
            
            default:
                return { success: false, message: 'Unknown event' };
        }
    }

    /**
     * Player attempts to capture flag
     */
    captureFlag(playerToken) {
        if (!this.playerPositions.has(playerToken)) {
            return { success: false, message: 'Player not found' };
        }
        
        const playerTeam = this.teams.get(playerToken);
        const playerPos = this.playerPositions.get(playerToken);
        
        // Determine which flag this player can capture (opposite team's)
        const enemyFlagTeam = playerTeam === 'red' ? 'blue' : 'red';
        const enemyFlag = this.flagsPlaced[enemyFlagTeam];
        
        if (!enemyFlag || this.capturedFlags[enemyFlagTeam]) {
            return { success: false, message: 'Enemy flag not available' };
        }
        
        // Check if player is at flag location
        if (playerPos.x === enemyFlag.coord.x && playerPos.y === enemyFlag.coord.y) {
            this.capturedFlags[enemyFlagTeam] = playerToken;
            return { success: true, message: 'Flag captured!' };
        }
        
        return { success: false, message: 'Not at flag location' };
    }

    /**
     * Player returns flag to start zone
     */
    returnFlag(playerToken) {
        const playerTeam = this.teams.get(playerToken);
        const playerPos = this.playerPositions.get(playerToken);
        
        // Check if player has an enemy flag
        const enemyFlagTeam = playerTeam === 'red' ? 'blue' : 'red';
        if (this.capturedFlags[enemyFlagTeam] !== playerToken) {
            return { success: false, message: 'You do not have the enemy flag' };
        }
        
        // Check if player is in alleyway
        if (playerPos.location !== 'alley') {
            return { success: false, message: 'Must be in alleyway to return flag' };
        }
        
        // Score!
        if (playerTeam === 'red') {
            this.redScore++;
        } else {
            this.blueScore++;
        }
        
        // Reset flag capture
        this.capturedFlags[enemyFlagTeam] = null;
        
        // Check for win
        let gameEnded = false;
        let winner = null;
        if (this.redScore >= 3) {
            gameEnded = true;
            winner = 'red';
            this.phase = 'finished';
        } else if (this.blueScore >= 3) {
            gameEnded = true;
            winner = 'blue';
            this.phase = 'finished';
        }
        
        return {
            success: true,
            message: 'Flag returned!',
            scoredTeam: playerTeam,
            redScore: this.redScore,
            blueScore: this.blueScore,
            gameEnded,
            winner
        };
    }

    /**
     * Get game state for player
     */
    getGameStateForPlayer(playerToken) {
        return this.getGameState();
    }

    /**
     * Get winner
     */
    getWinner() {
        if (this.redScore > this.blueScore) return 'red';
        if (this.blueScore > this.redScore) return 'blue';
        return 'tie';
    }
}

module.exports = FlagGuardians;
