// Level definitions - Road circuits around blocks
const LEVELS = {
    level1: {
        id: 1,
        title: "To School",
        destination: "School",
        description: "Help Grandma get to school",
        // Circuit-based level: car drives around a block
        // Each segment is a road piece in the circuit
        circuit: [
            // North road (going east)
            { id: 0, x: 1, y: 0, direction: 'east', canGoStraight: true, canTurnRight: true, nextStraight: 1, nextRight: -1 },
            { id: 1, x: 2, y: 0, direction: 'east', canGoStraight: true, canTurnRight: true, nextStraight: 2, nextRight: -1 },
            
            // Northeast corner - turn right to go south
            { id: 2, x: 3, y: 0, direction: 'east', canGoStraight: false, canTurnRight: true, nextStraight: -1, nextRight: 3, autoTurn: true },
            
            // East road (going south)
            { id: 3, x: 3, y: 1, direction: 'south', canGoStraight: true, canTurnRight: true, nextStraight: 4, nextRight: -1 },
            { id: 4, x: 3, y: 2, direction: 'south', canGoStraight: true, canTurnRight: true, nextStraight: 5, nextRight: -1 },
            
            // Southeast corner - turn right to go west
            { id: 5, x: 3, y: 3, direction: 'south', canGoStraight: false, canTurnRight: true, nextStraight: -1, nextRight: 6, autoTurn: true },
            
            // South road (going west) - DESTINATION IS HERE
            { id: 6, x: 2, y: 3, direction: 'west', canGoStraight: true, canTurnRight: true, nextStraight: 7, nextRight: 999, destination: 'School', destinationName: 'School' },
            { id: 7, x: 1, y: 3, direction: 'west', canGoStraight: true, canTurnRight: true, nextStraight: 8, nextRight: -1 },
            
            // Southwest corner - turn right to go north
            { id: 8, x: 0, y: 3, direction: 'west', canGoStraight: false, canTurnRight: true, nextStraight: -1, nextRight: 9, autoTurn: true },
            
            // West road (going north)
            { id: 9, x: 0, y: 2, direction: 'north', canGoStraight: true, canTurnRight: true, nextStraight: 10, nextRight: -1 },
            { id: 10, x: 0, y: 1, direction: 'north', canGoStraight: true, canTurnRight: true, nextStraight: 11, nextRight: -1 },
            
            // Northwest corner - turn right to go east (back to start)
            { id: 11, x: 0, y: 0, direction: 'north', canGoStraight: false, canTurnRight: true, nextStraight: -1, nextRight: 0, autoTurn: true }
        ],
        startSegment: 0,
        blockSize: 3, // 4x4 block
        instructions: [
            "Follow the road around the block",
            "Turn right into the School driveway",
            "Watch for the driveway sign!"
        ]
    }
};

class LevelManager {
    constructor() {
        this.currentLevel = null;
        this.currentSegmentId = 0;
        this.playerScore = 0;
        this.correctTurns = 0;
        this.wrongTurns = 0;
    }

    getLevel(levelId) {
        return LEVELS[levelId];
    }

    loadLevel(levelId) {
        this.currentLevel = this.getLevel(levelId);
        this.currentSegmentId = this.currentLevel.startSegment;
        this.correctTurns = 0;
        this.wrongTurns = 0;
        return this.currentLevel;
    }

    getCurrentSegment() {
        if (!this.currentLevel) return null;
        return this.currentLevel.circuit.find(seg => seg.id === this.currentSegmentId);
    }

    getSegmentById(id) {
        if (!this.currentLevel) return null;
        return this.currentLevel.circuit.find(seg => seg.id === id);
    }

    moveSegment(direction) {
        const current = this.getCurrentSegment();
        if (!current) return { success: false, message: 'Invalid segment' };

        // Check if trying to go straight when not allowed
        if (direction === 'straight' && !current.canGoStraight) {
            // Auto-turn right instead
            direction = 'right';
        }

        // Auto-turn right if can't go straight
        if (current.autoTurn && direction === 'straight') {
            direction = 'right';
        }

        // Get next segment
        const nextId = direction === 'straight' ? current.nextStraight : current.nextRight;

        if (nextId === -1) {
            // Crashed into dead end
            this.wrongTurns++;
            return { success: false, message: "You drove into a dead end!" };
        }

        if (nextId === 999) {
            // Reached destination
            return { success: true, reachedDestination: true, destination: current.destinationName };
        }

        // Move to next segment
        this.currentSegmentId = nextId;
        const nextSegment = this.getSegmentById(nextId);

        return {
            success: true,
            segment: nextSegment,
            autoTurned: current.autoTurn && direction === 'right'
        };
    }

    calculateScore() {
        if (!this.currentLevel) return 0;
        // Score based on reaching destination with minimal wrong turns
        return Math.max(0, 100 - (this.wrongTurns * 20));
    }

    renderMapView() {
        const mapDisplay = document.getElementById('map-display');
        if (!this.currentLevel) return;

        const circuit = this.currentLevel.circuit;
        const blockSize = this.currentLevel.blockSize;

        // Create SVG map
        let mapHtml = `<svg width="100%" height="100%" viewBox="0 0 400 400" style="background: #fff; border-radius: 8px;">`;

        const cellSize = 360 / (blockSize + 2);

        // Draw grid/block
        mapHtml += `<g stroke="#ccc" stroke-width="1">`;
        for (let i = 0; i <= blockSize + 1; i++) {
            mapHtml += `<line x1="${20 + i * cellSize}" y1="20" x2="${20 + i * cellSize}" y2="${20 + (blockSize + 1) * cellSize}" />`;
            mapHtml += `<line x1="20" y1="${20 + i * cellSize}" x2="${20 + (blockSize + 1) * cellSize}" y2="${20 + i * cellSize}" />`;
        }
        mapHtml += `</g>`;

        // Draw roads (thick yellow lines)
        mapHtml += `<g stroke="#ffeb3b" stroke-width="12" fill="none" stroke-linecap="round">`;
        for (const segment of circuit) {
            const x = 20 + segment.x * cellSize + cellSize / 2;
            const y = 20 + segment.y * cellSize + cellSize / 2;

            // Just mark the position
            mapHtml += `<circle cx="${x}" cy="${y}" r="6" fill="#ffeb3b" />`;
        }
        mapHtml += `</g>`;

        // Draw destination (School)
        const destSegment = circuit.find(s => s.destination === 'School');
        if (destSegment) {
            const x = 20 + destSegment.x * cellSize + cellSize / 2;
            const y = 20 + destSegment.y * cellSize + cellSize / 2;
            mapHtml += `<circle cx="${x}" cy="${y}" r="14" fill="none" stroke="#e74c3c" stroke-width="3" />`;
            mapHtml += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" fill="#e74c3c" font-weight="bold">SCHOOL</text>`;
        }

        // Draw current position
        const current = this.getCurrentSegment();
        if (current) {
            const x = 20 + current.x * cellSize + cellSize / 2;
            const y = 20 + current.y * cellSize + cellSize / 2;
            mapHtml += `<circle cx="${x}" cy="${y}" r="10" fill="#2ecc71" />`;
        }

        mapHtml += `</svg>`;

        mapDisplay.innerHTML = mapHtml;
    }
}

// Level selection handler
document.addEventListener('DOMContentLoaded', () => {
    const level1Btn = document.getElementById('level-1-btn');
    if (level1Btn) {
        level1Btn.addEventListener('click', () => {
            if (gameAuth && gameAuth.isLoggedIn()) {
                const levelManager = new LevelManager();
                levelManager.loadLevel('level1');
                startGame(levelManager);
            }
        });
    }
});
