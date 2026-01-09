// Level definitions and maps
const LEVELS = {
    level1: {
        id: 1,
        title: "To School",
        destination: "School",
        description: "Help Grandma get to school",
        map: {
            width: 4,
            height: 6,
            // Grid-based map
            // S = start, E = end, - = straight, R = right turn
            // 0,0 is top-left
            // Represented as a path of coordinates and actions
            path: [
                { x: 2, y: 0, type: 'start', direction: 'down' },
                { x: 2, y: 1, type: 'straight', direction: 'down' },
                { x: 2, y: 2, type: 'intersection', direction: 'down', correctAction: 'straight' },
                { x: 2, y: 3, type: 'straight', direction: 'down' },
                { x: 2, y: 4, type: 'intersection', direction: 'down', correctAction: 'right' },
                { x: 3, y: 4, type: 'straight', direction: 'right' },
                { x: 3, y: 5, type: 'end', direction: 'right' }
            ]
        },
        instructions: [
            "Navigate Grandma's car to the School",
            "Grandma can only go straight or turn RIGHT",
            "Watch the road layout carefully!"
        ]
    }
};

class LevelManager {
    constructor() {
        this.currentLevel = null;
        this.currentPathIndex = 0;
        this.playerScore = 0;
        this.correctDecisions = 0;
    }

    getLevel(levelId) {
        return LEVELS[levelId];
    }

    loadLevel(levelId) {
        this.currentLevel = this.getLevel(levelId);
        this.currentPathIndex = 0;
        this.correctDecisions = 0;
        return this.currentLevel;
    }

    getCurrentPathNode() {
        if (!this.currentLevel) return null;
        return this.currentLevel.map.path[this.currentPathIndex];
    }

    getNextPathNode() {
        if (!this.currentLevel) return null;
        const nextIndex = this.currentPathIndex + 1;
        if (nextIndex < this.currentLevel.map.path.length) {
            return this.currentLevel.map.path[nextIndex];
        }
        return null;
    }

    moveToNextNode(playerAction) {
        if (!this.currentLevel) return false;

        const currentNode = this.getCurrentPathNode();
        const nextNode = this.getNextPathNode();

        if (!nextNode) {
            // Reached end
            return { success: true, levelComplete: true };
        }

        // Check if this is an intersection
        if (currentNode.correctAction) {
            if (playerAction === currentNode.correctAction) {
                this.correctDecisions++;
                this.currentPathIndex++;
                return { success: true, correct: true };
            } else {
                // Wrong turn
                return { success: false, correct: false, message: "Wrong turn! Grandma couldn't make that turn." };
            }
        } else {
            // Just move forward
            this.currentPathIndex++;
            return { success: true, correct: true };
        }
    }

    isLevelComplete() {
        if (!this.currentLevel) return false;
        return this.currentPathIndex >= this.currentLevel.map.path.length - 1;
    }

    calculateScore() {
        if (!this.currentLevel) return 0;
        const totalIntersections = this.currentLevel.map.path.filter(n => n.correctAction).length;
        return Math.round((this.correctDecisions / totalIntersections) * 100);
    }

    renderMapView() {
        const mapDisplay = document.getElementById('map-display');
        if (!this.currentLevel) return;

        const map = this.currentLevel.map;
        
        // Create a simple ASCII-style map representation
        let mapHtml = '<svg width="100%" height="100%" viewBox="0 0 400 300" style="background: #fff; border-radius: 8px;">';
        
        // Draw grid
        const cellWidth = 400 / map.width;
        const cellHeight = 300 / map.height;
        
        // Draw path
        const path = map.path;
        mapHtml += '<g stroke="#667eea" stroke-width="3" fill="none">';
        
        for (let i = 0; i < path.length - 1; i++) {
            const current = path[i];
            const next = path[i + 1];
            
            const x1 = (current.x + 0.5) * cellWidth;
            const y1 = (current.y + 0.5) * cellHeight;
            const x2 = (next.x + 0.5) * cellWidth;
            const y2 = (next.y + 0.5) * cellHeight;
            
            mapHtml += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
        }
        
        mapHtml += '</g>';
        
        // Draw points
        path.forEach((node, index) => {
            const x = (node.x + 0.5) * cellWidth;
            const y = (node.y + 0.5) * cellHeight;
            
            let color = '#667eea';
            let label = '';
            
            if (node.type === 'start') {
                color = '#2ecc71';
                label = 'START';
            } else if (node.type === 'end') {
                color = '#e74c3c';
                label = 'SCHOOL';
            } else if (node.correctAction) {
                color = '#f39c12';
                label = node.correctAction === 'right' ? '↻' : '↓';
            }
            
            mapHtml += `<circle cx="${x}" cy="${y}" r="8" fill="${color}" />`;
            if (label) {
                mapHtml += `<text x="${x}" y="${y}" text-anchor="middle" dy="0.3em" font-size="10" fill="white" font-weight="bold">${label}</text>`;
            }
        });
        
        mapHtml += '</svg>';
        
        mapDisplay.innerHTML = mapHtml;
    }

    renderCarView() {
        const roadDisplay = document.getElementById('road-display');
        if (!roadDisplay) return;

        // Create car element if it doesn't exist
        if (!roadDisplay.querySelector('.car')) {
            const car = document.createElement('div');
            car.className = 'car';
            roadDisplay.appendChild(car);
        }
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
