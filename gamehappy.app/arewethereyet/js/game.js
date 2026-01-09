// Main game engine for Are We There Yet
class GameEngine {
    constructor(levelManager) {
        this.levelManager = levelManager;
        this.gameState = 'map-view'; // map-view, car-drive, results
        this.mapDisplayTime = 8000; // 8 seconds
        this.carDriveSpeed = 2000; // 2 seconds per segment
        this.distanceTraveled = 0;
        this.wrongTurns = 0;
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

        // Hide map phase, show car phase
        document.getElementById('map-phase').classList.remove('active');
        document.getElementById('car-phase').classList.add('active');
        document.getElementById('results-phase').classList.remove('active');

        // Render car
        this.levelManager.renderCarView();

        // Reset to start of path
        this.levelManager.currentPathIndex = 1; // Skip the start node
        
        // Start driving sequence
        this.drivePath();
    }

    drivePath() {
        const driveSegment = () => {
            const currentNode = this.levelManager.getCurrentPathNode();
            
            if (!currentNode) {
                this.completeLevel();
                return;
            }

            // Update distance
            this.distanceTraveled++;
            document.getElementById('distance-value').textContent = this.distanceTraveled;

            // Check if this is an intersection
            if (currentNode.correctAction) {
                this.showIntersection(currentNode);
            } else {
                // Just keep driving
                this.levelManager.currentPathIndex++;
                setTimeout(driveSegment, this.carDriveSpeed);
            }
        };

        driveSegment();
    }

    showIntersection(intersectionNode) {
        // Show the turn right button and pause
        const turnBtn = document.getElementById('turn-right-btn');
        const instructionText = document.getElementById('instruction-text');

        turnBtn.classList.remove('hidden');
        instructionText.textContent = 'Choose your action!';

        // Set up handlers for this intersection
        const handleTurnRight = () => {
            this.handlePlayerAction('right', intersectionNode, handleTurnRight, handleGoStraight);
        };

        const handleGoStraight = () => {
            this.handlePlayerAction('straight', intersectionNode, handleTurnRight, handleGoStraight);
        };

        // One-time listeners
        turnBtn.onclick = handleTurnRight;
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') handleGoStraight();
        }, { once: true });
    }

    handlePlayerAction(action, intersectionNode, turnHandler, straightHandler) {
        const turnBtn = document.getElementById('turn-right-btn');
        turnBtn.classList.add('hidden');
        turnBtn.onclick = null;

        const result = this.levelManager.moveToNextNode(action);

        if (result.success) {
            // Correct action
            const instructionText = document.getElementById('instruction-text');
            instructionText.textContent = action === 'right' ? '✓ Turned right' : '✓ Going straight';
            
            setTimeout(() => {
                this.distanceTraveled++;
                document.getElementById('distance-value').textContent = this.distanceTraveled;
                
                if (result.levelComplete) {
                    this.completeLevel();
                } else {
                    this.drivePath();
                }
            }, 800);
        } else {
            // Wrong action
            this.wrongTurns++;
            const instructionText = document.getElementById('instruction-text');
            instructionText.textContent = '✗ Wrong turn! Game Over';
            
            setTimeout(() => this.endGame(false), 1500);
        }
    }

    completeLevel() {
        const score = this.levelManager.calculateScore();
        this.endGame(true, score);
    }

    endGame(success, score = 0) {
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
            scoreValue.textContent = score;
        } else {
            resultTitle.textContent = 'Level Failed!';
            resultMessage.textContent = 'Grandma couldn\'t complete that turn. Try again!';
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
