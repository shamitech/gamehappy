const GameManager = require('./GameManager');

class FlagGuardians extends GameManager {
    constructor(gameCode) {
        super(gameCode, 'flagguardians');
        
        // Team assignments
        this.teams = new Map(); // playerToken -> 'red' or 'blue'
        
        // Game phase tracking
        this.currentPhase = 'waiting'; // waiting, ready, active, finished
        this.currentRound = 0;
        this.maxRounds = 3;
        
        // Team scores
        this.redScore = 0;
        this.blueScore = 0;
        
        // Flag status
        this.redFlagHeld = null; // playerToken if held, null if secure
        this.blueFlagHeld = null; // playerToken if held, null if secure
        
        // Gameplay tracking
        this.captureEvents = []; // Track flag captures
        this.roundHistory = []; // Track rounds
        
        // Team data for lobby
        this.redTeam = []; // Array of player objects
        this.blueTeam = []; // Array of player objects

        // Map system
        this.initializeMap();
        
        // Player positions (x, y) on map - only during active game
        this.playerPositions = new Map(); // playerToken -> {x, y, team}
    }

    /**
     * Initialize the game map (The Block)
     * 120x120 grid with central alleyway
     */
    initializeMap() {
        const MAP_WIDTH = 120;
        const MAP_HEIGHT = 120;
        const ALLEY_WIDTH = 6;
        const ALLEY_START = 57; // Alleyway starts at y=57, goes to y=62
        
        this.mapConfig = {
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            alleyway: {
                x: 0,
                y: ALLEY_START,
                width: MAP_WIDTH,
                height: ALLEY_WIDTH
            },
            redTerritory: {
                x: 0,
                y: ALLEY_START + ALLEY_WIDTH,
                width: MAP_WIDTH,
                height: ALLEY_START - ALLEY_WIDTH
            },
            blueTerritory: {
                x: 0,
                y: 0,
                width: MAP_WIDTH,
                height: ALLEY_START
            }
        };

        // Generate 6 houses per team
        this.generateHouses();
    }

    /**
     * Generate houses with yards and floor layouts
     * Houses 1, 3, 5 are 3-story; Houses 2, 4, 6 are 1-story
     */
    generateHouses() {
        const housesPerTeam = 6;
        const houseWidth = 20; // Each house gets 20 squares width
        const yardHeight = 10;
        
        this.houses = {
            red: [],
            blue: []
        };

        // Red Team Houses (bottom, y = 63-120)
        for (let i = 0; i < housesPerTeam; i++) {
            const isMultiStory = [0, 2, 4].includes(i); // Houses 1, 3, 5 (0-indexed: 0, 2, 4)
            const stories = isMultiStory ? 3 : 1;
            
            this.houses.red.push({
                id: i + 1,
                x: i * houseWidth,
                y: 63, // Start after alleyway
                width: houseWidth,
                yardHeight,
                stories,
                team: 'red'
            });
        }

        // Blue Team Houses (top, y = 0-57)
        for (let i = 0; i < housesPerTeam; i++) {
            const isMultiStory = [0, 2, 4].includes(i);
            const stories = isMultiStory ? 3 : 1;
            
            this.houses.blue.push({
                id: i + 1,
                x: i * houseWidth,
                y: 47 - yardHeight, // Top area from blue perspective (mirrored)
                width: houseWidth,
                yardHeight,
                stories,
                team: 'blue'
            });
        }
    }

    /**
     * Get map configuration for client rendering
     */
    getMapConfig() {
        return {
            mapConfig: this.mapConfig,
            houses: this.houses
        };
    }

    /**
     * Place player on map at game start
     */
    placePlayerOnMap(playerToken, team) {
        if (team === 'red') {
            // Red team spawns at their base (bottom area)
            const x = Math.random() * 100 + 10; // 10-110 range
            const y = Math.random() * 20 + 90; // 90-110 (bottom of map)
            this.playerPositions.set(playerToken, { x, y, team });
        } else {
            // Blue team spawns at their base (top area)
            const x = Math.random() * 100 + 10; // 10-110 range
            const y = Math.random() * 20 + 10; // 10-30 (top of map)
            this.playerPositions.set(playerToken, { x, y, team });
        }
    }

    /**
     * Move player to new position on map
     */
    movePlayer(playerToken, newX, newY) {
        if (!this.playerPositions.has(playerToken)) {
            return { success: false, message: 'Player not found on map' };
        }

        const currentPos = this.playerPositions.get(playerToken);
        
        // Validate position is within map bounds
        if (newX < 0 || newX >= this.mapConfig.width || newY < 0 || newY >= this.mapConfig.height) {
            return { success: false, message: 'Position out of bounds' };
        }

        // Update position
        currentPos.x = newX;
        currentPos.y = newY;

        return { success: true, message: 'Player moved', position: { x: newX, y: newY } };
    }

    /**
     * Get all player positions (for server tracking)
     */
    getAllPlayerPositions() {
        return Object.fromEntries(this.playerPositions);
    }

    /**
     * Get visible players for a specific player
     * Uses line-of-sight and proximity checking
     */
    getVisiblePlayers(playerToken) {
        if (!this.playerPositions.has(playerToken)) {
            return [];
        }

        const currentPlayer = this.playerPositions.get(playerToken);
        const visibilityRange = 15; // Squares that player can see
        const visiblePlayers = [];

        for (let [otherToken, otherPos] of this.playerPositions) {
            if (otherToken === playerToken) continue; // Don't include self

            // Calculate distance
            const dx = otherPos.x - currentPlayer.x;
            const dy = otherPos.y - currentPlayer.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Check if within range
            if (distance > visibilityRange) continue;

            // Check line of sight (simplified - checking for obstacles)
            if (this.hasLineOfSight(currentPlayer, otherPos)) {
                visiblePlayers.push({
                    playerToken: otherToken,
                    name: this.players.get(otherToken)?.name || 'Unknown',
                    team: otherPos.team,
                    position: { x: otherPos.x, y: otherPos.y },
                    distance: Math.round(distance)
                });
            }
        }

        return visiblePlayers;
    }

    /**
     * Check if there's a clear line of sight between two positions
     * Simplified: returns true if no house directly blocks the line
     */
    hasLineOfSight(pos1, pos2) {
        // Simple proximity check with house obstacle detection
        // In a full implementation, this would do proper raycasting
        
        // For now, return true if not separated by a house
        const allHouses = [...this.houses.red, ...this.houses.blue];
        
        for (let house of allHouses) {
            // Check if line segment intersects with house bounds
            if (this.lineIntersectsRect(pos1, pos2, house)) {
                return false; // Line blocked by house
            }
        }

        return true;
    }

    /**
     * Check if line segment intersects rectangle (house)
     */
    lineIntersectsRect(p1, p2, rect) {
        // Simple AABB collision check for line segment
        const minX = Math.min(p1.x, p2.x);
        const maxX = Math.max(p1.x, p2.x);
        const minY = Math.min(p1.y, p2.y);
        const maxY = Math.max(p1.y, p2.y);

        return !(maxX < rect.x || minX > rect.x + rect.width ||
                 maxY < rect.y || minY > rect.y + rect.yardHeight);
    }

    /**
     * Remove player from map when they leave
     */
    removePlayerFromMap(playerToken) {
        this.playerPositions.delete(playerToken);
    }

    /**
     * Add a player to the game (override to include team assignment)
     */
    addPlayer(playerToken, playerName) {
        const result = super.addPlayer(playerToken, playerName);
        if (result.success) {
            // Initialize team as null - player must select team in lobby
            this.teams.set(playerToken, null);
        }
        return result;
    }

    /**
     * Remove a player from the game
     */
    removePlayer(playerToken) {
        const team = this.teams.get(playerToken);
        this.teams.delete(playerToken);
        
        // Remove from team roster
        if (team === 'red') {
            this.redTeam = this.redTeam.filter(p => p.token !== playerToken);
        } else if (team === 'blue') {
            this.blueTeam = this.blueTeam.filter(p => p.token !== playerToken);
        }

        // Remove from map if game is active
        this.removePlayerFromMap(playerToken);

        return super.removePlayer(playerToken);
    }

    /**
     * Player selects a team
     */
    selectTeam(playerToken, team) {
        if (!this.players.has(playerToken)) {
            return { success: false, message: 'Player not in game' };
        }

        if (team !== 'red' && team !== 'blue') {
            return { success: false, message: 'Invalid team' };
        }

        const player = this.players.get(playerToken);
        const oldTeam = this.teams.get(playerToken);

        // Remove from old team if switching
        if (oldTeam === 'red') {
            this.redTeam = this.redTeam.filter(p => p.token !== playerToken);
        } else if (oldTeam === 'blue') {
            this.blueTeam = this.blueTeam.filter(p => p.token !== playerToken);
        }

        // Add to new team
        this.teams.set(playerToken, team);
        const playerData = { token: playerToken, name: player.name };
        
        if (team === 'red') {
            this.redTeam.push(playerData);
        } else {
            this.blueTeam.push(playerData);
        }

        return { success: true, message: `Joined ${team} team` };
    }

    /**
     * Get team roster
     */
    getTeamRoster() {
        return {
            redTeam: this.redTeam,
            blueTeam: this.blueTeam
        };
    }

    /**
     * Check if game can start
     */
    canStart() {
        // Minimum 2 players total (1v1)
        // All players must have selected a team
        if (this.players.size < 2) {
            return false;
        }

        for (let playerToken of this.players.keys()) {
            if (this.teams.get(playerToken) === null) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get game starting validation message
     */
    getStartValidation() {
        if (this.players.size < 2) {
            return { valid: false, message: 'Need at least 2 players' };
        }

        const unassignedPlayers = Array.from(this.players.keys())
            .filter(token => this.teams.get(token) === null);

        if (unassignedPlayers.length > 0) {
            return { valid: false, message: 'All players must select a team' };
        }

        return { valid: true };
    }

    /**
     * Start the game
     */
    startGame() {
        const validation = this.getStartValidation();
        if (!validation.valid) {
            return { success: false, message: validation.message };
        }

        this.gameState = 'started';
        this.currentPhase = 'active';
        this.currentRound = 1;
        this.redScore = 0;
        this.blueScore = 0;
        
        // Initialize flags (not held by anyone)
        this.redFlagHeld = null;
        this.blueFlagHeld = null;

        // Place all players on map
        for (let [playerToken, _] of this.players) {
            const team = this.teams.get(playerToken);
            this.placePlayerOnMap(playerToken, team);
        }

        return { 
            success: true, 
            message: 'Game started',
            gameState: this.getGameState()
        };
    }

    /**
     * Handle player action (flag capture, etc.)
     */
    handlePlayerAction(playerToken, action, targetData = {}) {
        if (!this.players.has(playerToken)) {
            return { success: false, message: 'Player not found' };
        }

        const player = this.players.get(playerToken);
        const playerTeam = this.teams.get(playerToken);

        switch (action) {
            case 'capture-flag':
                return this.captureFlag(playerToken, playerTeam);
            case 'defend-flag':
                return this.defendFlag(playerToken, playerTeam, targetData);
            default:
                return { success: false, message: 'Unknown action' };
        }
    }

    /**
     * Capture enemy flag
     */
    captureFlag(playerToken, playerTeam) {
        if (playerTeam === 'red') {
            if (this.blueFlagHeld === null) {
                this.blueFlagHeld = playerToken;
                this.captureEvents.push({
                    round: this.currentRound,
                    playerToken,
                    playerTeam,
                    action: 'flag-capture',
                    target: 'blue',
                    timestamp: Date.now()
                });
                return { success: true, message: 'Blue flag captured!' };
            }
        } else if (playerTeam === 'blue') {
            if (this.redFlagHeld === null) {
                this.redFlagHeld = playerToken;
                this.captureEvents.push({
                    round: this.currentRound,
                    playerToken,
                    playerTeam,
                    action: 'flag-capture',
                    target: 'red',
                    timestamp: Date.now()
                });
                return { success: true, message: 'Red flag captured!' };
            }
        }

        return { success: false, message: 'Flag already held' };
    }

    /**
     * Score a flag capture (return flag to base)
     */
    scoreCapture(playerToken, playerTeam) {
        if (playerTeam === 'red' && this.blueFlagHeld === playerToken) {
            this.redScore += 1;
            this.blueFlagHeld = null;
            return { success: true, message: 'Red team scores!', points: 1 };
        } else if (playerTeam === 'blue' && this.redFlagHeld === playerToken) {
            this.blueScore += 1;
            this.redFlagHeld = null;
            return { success: true, message: 'Blue team scores!', points: 1 };
        }

        return { success: false, message: 'Cannot score' };
    }

    /**
     * Defend flag (block opponent)
     */
    defendFlag(playerToken, playerTeam, targetData) {
        const defender = this.players.get(playerToken);
        
        this.captureEvents.push({
            round: this.currentRound,
            playerToken,
            playerTeam,
            action: 'flag-defense',
            target: playerTeam === 'red' ? 'red' : 'blue',
            timestamp: Date.now()
        });

        return { success: true, message: `${defender.name} defended the flag!` };
    }

    /**
     * Complete a round
     */
    completeRound() {
        // Return any held flags to base
        this.redFlagHeld = null;
        this.blueFlagHeld = null;

        this.roundHistory.push({
            round: this.currentRound,
            redScore: this.redScore,
            blueScore: this.blueScore,
            events: [...this.captureEvents]
        });

        // Check if game should end (best of 3)
        if (this.currentRound >= this.maxRounds) {
            this.currentPhase = 'finished';
            return { gameEnded: true, winner: this.getWinner() };
        }

        this.currentRound++;
        return { gameEnded: false, nextRound: this.currentRound };
    }

    /**
     * Get winner
     */
    getWinner() {
        if (this.redScore > this.blueScore) {
            return 'red';
        } else if (this.blueScore > this.redScore) {
            return 'blue';
        } else {
            return 'tie';
        }
    }

    /**
     * Get current game state
     */
    getGameState() {
        return {
            gameCode: this.gameCode,
            gameType: this.gameType,
            gameState: this.gameState,
            currentPhase: this.currentPhase,
            currentRound: this.currentRound,
            players: this.getPlayers(),
            playerCount: this.getPlayerCount(),
            redTeam: this.redTeam,
            blueTeam: this.blueTeam,
            scores: {
                red: this.redScore,
                blue: this.blueScore
            },
            flagStatus: {
                redFlag: this.redFlagHeld,
                blueFlag: this.blueFlagHeld
            }
        };
    }

    /**
     * Get lobby info with team data
     */
    getLobbyInfo() {
        const base = super.getLobbyInfo();
        return {
            ...base,
            redTeam: this.redTeam,
            blueTeam: this.blueTeam,
            currentPhase: this.currentPhase
        };
    }

    /**
     * Get game results
     */
    getGameResults() {
        return {
            gameCode: this.gameCode,
            winner: this.getWinner(),
            finalScores: {
                red: this.redScore,
                blue: this.blueScore
            },
            redTeam: this.redTeam,
            blueTeam: this.blueTeam,
            roundHistory: this.roundHistory,
            captureEvents: this.captureEvents
        };
    }
}

module.exports = FlagGuardians;
