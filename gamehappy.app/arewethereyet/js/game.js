// Main game engine for Are We There Yet - Circuit-based driving
class GameEngine {
    constructor(levelManager) {
        this.levelManager = levelManager;
        this.gameState = 'map-view';
        this.mapDisplayTime = 8000; // 8 seconds to view the map
        this.segmentDriveTime = 1500; // 1.5 seconds per road segment
        this.distanceTraveled = 0;
        this.startTime = 0;
    }

    startGame() {
        console.log('Starting game with level:', this.levelManager.currentLevel.title);
        
        // Show game screen
        document.getElementById('home-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');

        // Start map view phase
        this.startMapViewPhase();
    }

    startMapViewPhase() {
        this.gameState = 'map-view';
        
        // Show map phase
        document.getElementById('map-phase').classList.add('active');
        document.getElementById('car-phase').classList.remove('active');
        document.getElementById('results-phase').classList.remove('active');

        // Render the map
        this.levelManager.renderMapView();
        
        // Update destination title
        document.getElementById('destination-title').textContent = 
            `Destination: ${this.levelManager.currentLevel.destination}`;

        // After 8 seconds, transition to car view
        setTimeout(() => this.startCarDrivePhase(), this.mapDisplayTime);
    }

    startCarDrivePhase() {
        this.gameState = 'car-drive';
        this.distanceTraveled = 0;
        this.startTime = Date.now();

        // Hide map phase, show car phase
        document.getElementById('map-phase').classList.remove('active');
        document.getElementById('car-phase').classList.add('active');
        document.getElementById('results-phase').classList.remove('active');

        // Render the car view
        this.renderCarView();

        // Start driving
        this.driveLoop();
    }

    renderCarView() {
        const roadDisplay = document.getElementById('road-display');
        roadDisplay.innerHTML = '';

        // Draw a simple road view (bird's eye view of car on road)
        const road = document.createElement('div');
        road.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(to bottom, #444 0%, #333 50%, #444 100%);
            display: flex;
            align-items: flex-end;
            justify-content: center;
            padding-bottom: 80px;
        `;

        // Draw road markers
        const roadMarkers = document.createElement('div');
        roadMarkers.style.cssText = `
            position: absolute;
            width: 80%;
            height: 100%;
            border-left: 3px dashed #ffeb3b;
            border-right: 3px dashed #ffeb3b;
        `;
        road.appendChild(roadMarkers);

        // Draw car
        const car = document.createElement('div');
        car.className = 'car';
        car.id = 'grandmas-car';
        car.style.cssText = `
            width: 70px;
            height: 90px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ff5252 100%);
            border-radius: 8px;
            position: relative;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.7);
            z-index: 10;
        `;

        // Windows
        car.innerHTML = `
            <div style="position: absolute; top: 8px; left: 8px; width: 20px; height: 16px; background: #87ceeb; border-radius: 2px;"></div>
            <div style="position: absolute; top: 8px; right: 8px; width: 20px; height: 16px; background: #87ceeb; border-radius: 2px;"></div>
        `;
        road.appendChild(car);

        roadDisplay.appendChild(road);
    }

    driveLoop() {
        if (this.gameState !== 'car-drive') return;

        const current = this.levelManager.getCurrentSegment();
        if (!current) {
            this.endGame(false, 'Navigation error');
            return;
        }

        // Update distance and segment display
        this.distanceTraveled++;
        document.getElementById('distance-value').textContent = this.distanceTraveled;

        // Get direction name
        const dirName = {
            'north': '↑ North',
            'south': '↓ South',
            'east': '→ East',
            'west': '← West'
        }[current.direction];

        const instructionText = document.getElementById('instruction-text');
        instructionText.textContent = `Heading ${dirName}...`;

        // Show turn right button if we can turn
        const turnBtn = document.getElementById('turn-right-btn');
        if (current.canTurnRight && !current.autoTurn) {
            turnBtn.classList.remove('hidden');
        } else {
            turnBtn.classList.add('hidden');
        }

        // Wait for player input or auto-drive if can only go straight
        if (!current.canTurnRight) {
            // No choice, auto-move forward
            setTimeout(() => this.moveForward('straight'), this.segmentDriveTime);
        } else {
            // Give player a moment to decide
            let decided = false;

            const handleTurnRight = () => {
                if (!decided) {
                    decided = true;
                    turnBtn.onclick = null;
                    document.removeEventListener('keydown', handleKeypress);
                    this.moveForward('right');
                }
            };

            const handleKeypress = (e) => {
                if ((e.key === ' ' || e.code === 'Space') && !decided) {
                    decided = true;
                    turnBtn.onclick = null;
                    document.removeEventListener('keydown', handleKeypress);
                    this.moveForward('straight');
                }
            };

            turnBtn.onclick = handleTurnRight;
            document.addEventListener('keydown', handleKeypress);

            // Auto-drive straight after decision time if no input
            setTimeout(() => {
                if (!decided) {
                    decided = true;
                    turnBtn.onclick = null;
                    document.removeEventListener('keydown', handleKeypress);
                    this.moveForward('straight');
                }
            }, this.segmentDriveTime);
        }
    }

    moveForward(direction) {
        const result = this.levelManager.moveSegment(direction);

        if (!result.success) {
            // Crashed or dead end
            this.endGame(false, result.message);
            return;
        }

        if (result.reachedDestination) {
            // Reached the destination!
            const instructionText = document.getElementById('instruction-text');
            instructionText.textContent = `✓ Arrived at ${result.destination}!`;
            
            setTimeout(() => this.completeLevel(), 1200);
            return;
        }

        if (result.autoTurned) {
            const instructionText = document.getElementById('instruction-text');
            instructionText.textContent = '✓ Auto-turn right (forced)';
        } else if (direction === 'right') {
            const instructionText = document.getElementById('instruction-text');
            instructionText.textContent = '✓ Turned right';
        }

        // Continue driving
        setTimeout(() => this.driveLoop(), this.segmentDriveTime);
    }

    completeLevel() {
        const score = this.levelManager.calculateScore();
        this.endGame(true, score);
    }

    endGame(success, scoreOrMessage) {
        this.gameState = 'finished';

        // Show results phase
        document.getElementById('map-phase').classList.remove('active');
        document.getElementById('car-phase').classList.remove('active');
        document.getElementById('results-phase').classList.add('active');

        const resultTitle = document.getElementById('result-title');
        const resultMessage = document.getElementById('result-message');
        const scoreValue = document.getElementById('score-value');

        if (success) {
            resultTitle.textContent = 'Level Complete!';
            resultMessage.textContent = `Great job! You guided Grandma safely to the ${this.levelManager.currentLevel.destination}.`;
            scoreValue.textContent = scoreOrMessage;
            document.getElementById('next-level-btn').style.display = 'block';
        } else {
            resultTitle.textContent = 'Oops! Game Over';
            resultMessage.textContent = scoreOrMessage;
            scoreValue.textContent = '0';
            document.getElementById('next-level-btn').style.display = 'none';
        }

        // Set up result button handlers
        document.getElementById('next-level-btn').onclick = () => this.nextLevel();
        document.getElementById('home-btn').onclick = () => this.goHome();
    }

    nextLevel() {
        document.getElementById('next-level-btn').style.display = 'block';
        this.goHome();
        // TODO: Load next level
    }

    goHome() {
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('home-screen').classList.add('active');
    }
}

// Global game engine instance
let gameEngine = null;

// Start game function called from level selection
function startGame(levelManager) {
    gameEngine = new GameEngine(levelManager);
    gameEngine.startGame();
}

// Initialize game screen handlers when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.addEventListener('click', () => {
            document.getElementById('game-screen').classList.remove('active');
            document.getElementById('home-screen').classList.add('active');
        });
    }
});
