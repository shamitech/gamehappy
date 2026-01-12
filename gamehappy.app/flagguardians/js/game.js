// Flag Guardians - Client Game Logic

console.log('Game.js loaded');

class Game {
    constructor() {
        console.log('Game constructor called');
        this.socket = null;
        this.isHost = false;
        this.gameCode = null;
        this.playerName = null;
        this.playerToken = null;
        this.playerTeam = null; // 'red', 'blue', or null
        this.players = [];
        this.gameState = 'home';
        this.isConnected = false;
        
        // Game data
        this.redTeamPlayers = [];
        this.blueTeamPlayers = [];
        this.redScore = 0;
        this.blueScore = 0;
        this.currentRound = 1;
        this.gameStarted = false;

        // Map data
        this.mapConfig = null;
        this.houses = null;
        this.playerPosition = null; // {x, y}
        this.visiblePlayers = [];
        this.mapCanvas = null;
        this.canvasCtx = null;
        this.animationFrameId = null;
        
        this.init();
    }

    init() {
        console.log('Game.init() called');
        this.loadSession();
        this.bindEvents();
        this.connect();
    }

    // ===== SESSION MANAGEMENT =====
    loadSession() {
        const session = sessionStorage.getItem('flagguardians_session');
        if (session) {
            const data = JSON.parse(session);
            this.playerName = data.playerName;
            this.playerToken = data.playerToken;
            console.log(`[SESSION LOADED] ${this.playerName} (${this.playerToken})`);
        }
    }

    saveSession() {
        const data = {
            playerName: this.playerName,
            playerToken: this.playerToken
        };
        sessionStorage.setItem('flagguardians_session', JSON.stringify(data));
    }

    clearSession() {
        sessionStorage.removeItem('flagguardians_session');
    }

    // ===== SOCKET CONNECTION =====
    connect() {
        console.log('Attempting to connect to socket server...');
        
        // Determine the correct server URL
        let socketUrl;
        if (window.location.protocol === 'https:') {
            socketUrl = window.location.origin;
        } else {
            socketUrl = `http://${window.location.hostname}:8443`;
        }
        
        console.log('Connecting to:', socketUrl);
        
        this.socket = io(socketUrl, {
            path: '/websocket',
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.socket.on('connect', () => {
            console.log('✓ Connected to server');
            this.isConnected = true;
            this.showMessage('Connected to server', 'success');
        });

        this.socket.on('disconnect', () => {
            console.log('✗ Disconnected from server');
            this.isConnected = false;
            this.showMessage('Disconnected from server', 'error');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.isConnected = false;
            this.showMessage(`Connection error: ${error.message}`, 'error');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
            this.showMessage(`Socket error: ${error}`, 'error');
        });

        // Game events
        this.socket.on('game:created', (data) => this.onGameCreated(data));
        this.socket.on('game:joined', (data) => this.onGameJoined(data));
        this.socket.on('lobby:updated', (data) => this.onLobbyUpdated(data));
        this.socket.on('lobby:player-joined', (data) => this.onPlayerJoined(data));
        this.socket.on('lobby:player-left', (data) => this.onPlayerLeft(data));
        this.socket.on('game:started', (data) => this.onGameStarted(data));
        this.socket.on('game:error', (data) => this.onGameError(data));

        // Map events
        this.socket.on('map:players-update', (data) => this.onMapPlayersUpdate(data));
        this.socket.on('map:visible-players', (data) => this.onVisiblePlayersUpdate(data));
    }

    // ===== EVENT HANDLERS =====
    bindEvents() {
        console.log('[BIND EVENTS] Starting to bind event listeners');
        
        // Only bind once
        if (this.eventsAlreadyBound) {
            console.log('[BIND EVENTS] Events already bound, skipping');
            return;
        }
        this.eventsAlreadyBound = true;
        // Home screen
        const btnCreateGame = document.getElementById('btn-create-game');
        if (btnCreateGame) {
            console.log('[BIND EVENTS] Found btn-create-game, binding click listener');
            btnCreateGame.addEventListener('click', () => {
                console.log('[BIND EVENTS] btn-create-game clicked');
                this.showScreen('create-game-screen');
            });
        } else {
            console.error('[BIND EVENTS] btn-create-game NOT FOUND');
        }
        
        const btnJoinGame = document.getElementById('btn-join-game');
        if (btnJoinGame) {
            console.log('[BIND EVENTS] Found btn-join-game, binding click listener');
            btnJoinGame.addEventListener('click', () => this.showScreen('join-game-screen'));
        } else {
            console.error('[BIND EVENTS] btn-join-game NOT FOUND');
        }
        
        const btnHowToPlay = document.getElementById('btn-how-to-play');
        if (btnHowToPlay) {
            console.log('[BIND EVENTS] Found btn-how-to-play, binding click listener');
            btnHowToPlay.addEventListener('click', () => this.showScreen('how-to-play-screen'));
        } else {
            console.error('[BIND EVENTS] btn-how-to-play NOT FOUND');
        }

        // Navigation
        document.getElementById('btn-back-create')?.addEventListener('click', () => this.showScreen('home-screen'));
        document.getElementById('btn-back-join')?.addEventListener('click', () => this.showScreen('home-screen'));
        document.getElementById('btn-back-how-to-play')?.addEventListener('click', () => this.showScreen('home-screen'));

        // Create/Join Game
        document.getElementById('btn-start-create-game').addEventListener('click', () => this.createGame());
        document.getElementById('btn-start-join-game').addEventListener('click', () => this.joinGame());

        // Lobby
        document.getElementById('btn-join-red').addEventListener('click', () => this.selectTeam('red'));
        document.getElementById('btn-join-blue').addEventListener('click', () => this.selectTeam('blue'));
        document.getElementById('btn-start-game').addEventListener('click', () => this.startGame());
        document.getElementById('btn-leave-game').addEventListener('click', () => this.leaveGame());

        // Game
        document.getElementById('btn-leave-mid-game').addEventListener('click', () => this.leaveGame());

        // Results
        document.getElementById('btn-play-again').addEventListener('click', () => this.playAgain());
        document.getElementById('btn-back-home').addEventListener('click', () => this.backToHome());

        // Input events
        document.getElementById('input-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.createGame();
        });
        document.getElementById('input-join-player-name').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.joinGame();
        });
        document.getElementById('input-game-code').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }

    // ===== SCREEN MANAGEMENT =====
    showScreen(screenId) {
        console.log(`[SHOW SCREEN] Switching to: ${screenId}`);
        
        // Hide all screens
        const allScreens = document.querySelectorAll('.screen');
        console.log(`[SHOW SCREEN] Found ${allScreens.length} screens total`);
        
        console.log('[SHOW SCREEN] Starting to hide all screens...');
        for (let i = 0; i < allScreens.length; i++) {
            const screen = allScreens[i];
            console.log(`[SHOW SCREEN] Hiding screen ${i}: ${screen.id}`);
            screen.classList.remove('active');
        }
        console.log('[SHOW SCREEN] Finished hiding all screens');

        // Show selected screen
        const screen = document.getElementById(screenId);
        if (screen) {
            console.log(`[SHOW SCREEN] Found target screen, adding active class`);
            screen.classList.add('active');
            console.log(`[SHOW SCREEN] Successfully added active class to ${screenId}`);
            this.gameState = screenId;
        } else {
            console.error(`[SHOW SCREEN] Screen not found: ${screenId}`);
        }
    }

    showMessage(text, type = 'info', screenId = null) {
        let messageElement = null;
        
        if (screenId) {
            messageElement = document.querySelector(`#${screenId} .message`);
        } else {
            // Find the message element in the current active screen
            const activeScreen = document.querySelector('.screen.active');
            messageElement = activeScreen ? activeScreen.querySelector('.message') : null;
        }

        if (messageElement) {
            messageElement.textContent = text;
            messageElement.className = `message ${type} show`;
            
            // Auto-hide after 4 seconds
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, 4000);
        }
    }

    // ===== GAME CREATION & JOINING =====
    createGame() {
        console.log('[CREATE GAME] Button clicked');
        const playerName = document.getElementById('input-player-name').value.trim();
        console.log('[CREATE GAME] Player name:', playerName);

        if (!playerName) {
            console.log('[CREATE GAME] No player name entered');
            this.showMessage('Please enter your name', 'error', 'create-game-screen');
            return;
        }

        if (!this.isConnected) {
            console.log('[CREATE GAME] Not connected to server');
            this.showMessage('Not connected to server', 'error', 'create-game-screen');
            return;
        }

        console.log('[CREATE GAME] Emitting game:create event...');
        this.playerName = playerName;
        this.socket.emit('game:create', { playerName }, (response) => {
            console.log('[CREATE GAME] Received callback response:', response);
            if (response.success) {
                this.playerToken = response.playerToken;
                this.gameCode = response.gameCode;
                this.isHost = true;
                this.saveSession();
                this.showScreen('lobby-screen');
                this.updateLobbyScreen();
            } else {
                this.showMessage(response.message || 'Failed to create game', 'error', 'create-game-screen');
            }
        });
    }

    joinGame() {
        const gameCode = document.getElementById('input-game-code').value.trim().toUpperCase();
        const playerName = document.getElementById('input-join-player-name').value.trim();

        if (!gameCode || gameCode.length !== 6) {
            this.showMessage('Please enter a valid 6-character game code', 'error', 'join-game-screen');
            return;
        }

        if (!playerName) {
            this.showMessage('Please enter your name', 'error', 'join-game-screen');
            return;
        }

        if (!this.isConnected) {
            this.showMessage('Not connected to server', 'error', 'join-game-screen');
            return;
        }

        this.playerName = playerName;
        this.gameCode = gameCode;
        this.socket.emit('game:join', { gameCode, playerName }, (response) => {
            if (response.success) {
                this.playerToken = response.playerToken;
                this.isHost = false;
                this.saveSession();
                this.showScreen('lobby-screen');
                this.updateLobbyScreen();
            } else {
                this.showMessage(response.message || 'Failed to join game', 'error', 'join-game-screen');
            }
        });
    }

    selectTeam(team) {
        if (!this.gameCode || !this.playerToken) {
            this.showMessage('Game session lost', 'error');
            return;
        }

        this.socket.emit('lobby:select-team', 
            { gameCode: this.gameCode, playerToken: this.playerToken, team },
            (response) => {
                if (response.success) {
                    this.playerTeam = team;
                    this.updateLobbyTeams();
                } else {
                    this.showMessage(response.message || 'Failed to select team', 'error');
                }
            }
        );
    }

    startGame() {
        if (!this.isHost) {
            this.showMessage('Only the host can start the game', 'error');
            return;
        }

        this.socket.emit('game:start',
            { gameCode: this.gameCode, playerToken: this.playerToken },
            (response) => {
                if (response.success) {
                    console.log('Game start acknowledged by server');
                } else {
                    this.showMessage(response.message || 'Failed to start game', 'error');
                }
            }
        );
    }

    leaveGame() {
        this.socket.emit('game:leave',
            { gameCode: this.gameCode, playerToken: this.playerToken },
            (response) => {
                this.clearSession();
                this.gameCode = null;
                this.playerToken = null;
                this.playerTeam = null;
                this.showScreen('home-screen');
            }
        );
    }

    // ===== SOCKET EVENT HANDLERS =====
    onGameCreated(data) {
        console.log('Game created:', data);
        this.gameCode = data.gameCode;
        this.redScore = 0;
        this.blueScore = 0;
        this.currentRound = 1;
    }

    onGameJoined(data) {
        console.log('Joined game:', data);
        this.gameCode = data.gameCode;
        this.redScore = 0;
        this.blueScore = 0;
        this.currentRound = 1;
    }

    onLobbyUpdated(data) {
        console.log('Lobby updated:', data);
        this.players = data.players;
        this.redTeamPlayers = data.redTeam || [];
        this.blueTeamPlayers = data.blueTeam || [];
        
        // Find the host from the players list
        const hostPlayer = data.players?.find(p => p.isHost);
        if (hostPlayer) {
            this.isHost = (hostPlayer.token === this.playerToken);
            console.log(`[LOBBY UPDATED] Host is: ${hostPlayer.name}, I am host: ${this.isHost}`);
        }
        
        this.updateLobbyScreen();
    }

    onPlayerJoined(data) {
        console.log('Player joined:', data.playerName);
        this.players = data.players;
        this.redTeamPlayers = data.redTeam || [];
        this.blueTeamPlayers = data.blueTeam || [];
        
        // Find the host from the players list
        const hostPlayer = data.players?.find(p => p.isHost);
        if (hostPlayer) {
            this.isHost = (hostPlayer.token === this.playerToken);
            console.log(`[PLAYER JOINED] Host is: ${hostPlayer.name}, I am host: ${this.isHost}`);
        }
        
        this.updateLobbyTeams();
        this.updatePlayerCount();
    }

    onPlayerLeft(data) {
        console.log('Player left:', data.playerName);
        if (data.isHost) {
            this.isHost = true;
        }
        this.players = data.players;
        this.redTeamPlayers = data.redTeam || [];
        this.blueTeamPlayers = data.blueTeam || [];
        
        // Find the host from the players list
        const hostPlayer = data.players?.find(p => p.isHost);
        if (hostPlayer) {
            this.isHost = (hostPlayer.token === this.playerToken);
            console.log(`[PLAYER LEFT] Host is: ${hostPlayer.name}, I am host: ${this.isHost}`);
        }
        
        this.updateLobbyTeams();
        this.updatePlayerCount();
    }

    onGameStarted(data) {
        console.log('Game started:', data);
        this.gameStarted = true;
        this.currentRound = 1;
        
        // Extract map config from game state
        this.mapConfig = data.mapConfig || data.gameState?.mapConfig;
        this.houses = data.houses || data.gameState?.houses;
        this.playerPosition = data.playerPosition || { x: 60, y: this.playerTeam === 'red' ? 100 : 20 };
        
        this.showScreen('game-screen');
        this.initializeMapCanvas();
        this.updateGameScreen();
        this.startMapRendering();
    }

    onGameError(data) {
        console.error('Game error:', data);
        this.showMessage(data.message || 'Game error occurred', 'error');
    }

    onMapPlayersUpdate(data) {
        console.log('Map players update:', data);
        // This event notifies all clients of player positions
        // We don't use it directly - we use the map:visible-players instead
    }

    onVisiblePlayersUpdate(data) {
        console.log('Visible players:', data);
        this.visiblePlayers = data.visiblePlayers || [];
        this.playerPosition = data.playerPosition || this.playerPosition;
        
        // Update visible players in UI
        this.updateVisiblePlayersList();
    }

    // ===== MAP RENDERING =====
    initializeMapCanvas() {
        this.mapCanvas = document.getElementById('game-map-canvas');
        if (!this.mapCanvas) {
            console.error('Map canvas not found!');
            return;
        }
        
        this.canvasCtx = this.mapCanvas.getContext('2d');
        this.resizeCanvas();
        
        // Handle canvas clicks for movement
        this.mapCanvas.addEventListener('click', (e) => this.handleMapClick(e));
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.mapCanvas.parentElement;
        this.mapCanvas.width = container.offsetWidth;
        this.mapCanvas.height = container.offsetHeight;
    }

    startMapRendering() {
        const render = () => {
            this.renderMap();
            this.animationFrameId = requestAnimationFrame(render);
        };
        render();
    }

    stopMapRendering() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    renderMap() {
        if (!this.canvasCtx || !this.mapConfig) return;

        const ctx = this.canvasCtx;
        const canvas = this.mapCanvas;

        // Clear canvas
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate zoom and pan to keep player centered
        const mapWidth = this.mapConfig.width;
        const mapHeight = this.mapConfig.height;
        const zoomLevel = Math.min(
            canvas.width / (mapWidth * 1.2),
            canvas.height / (mapHeight * 1.2)
        );
        
        const offsetX = canvas.width / 2 - (this.playerPosition?.x || 60) * zoomLevel;
        const offsetY = canvas.height / 2 - (this.playerPosition?.y || 60) * zoomLevel;

        ctx.save();
        ctx.translate(offsetX, offsetY);
        ctx.scale(zoomLevel, zoomLevel);

        // Draw background
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, mapWidth, mapHeight);

        // Draw alleyway
        const alley = this.mapConfig.alleyway;
        ctx.fillStyle = '#444';
        ctx.fillRect(alley.x, alley.y, alley.width, alley.height);
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(alley.x, alley.y, alley.width, alley.height);

        // Draw team territories
        ctx.fillStyle = 'rgba(255, 59, 59, 0.08)';
        const redTerritory = this.mapConfig.redTerritory;
        ctx.fillRect(redTerritory.x, redTerritory.y, redTerritory.width, redTerritory.height);

        ctx.fillStyle = 'rgba(59, 126, 255, 0.08)';
        const blueTerritory = this.mapConfig.blueTerritory;
        ctx.fillRect(blueTerritory.x, blueTerritory.y, blueTerritory.width, blueTerritory.height);

        // Draw houses
        if (this.houses) {
            this.drawHouses(ctx);
        }

        // Draw visible players
        this.drawVisiblePlayers(ctx);

        // Draw player (self)
        this.drawPlayerMarker(ctx, this.playerPosition?.x || 60, this.playerPosition?.y || 60, true);

        // Draw grid (optional - for debugging)
        this.drawGrid(ctx, mapWidth, mapHeight);

        ctx.restore();
    }

    drawHouses(ctx) {
        const drawHouse = (house, color) => {
            ctx.fillStyle = color;
            ctx.fillRect(house.x, house.y, house.width, house.yardHeight);
            ctx.strokeStyle = this.playerTeam === house.team ? '#ff9f3b' : '#3b7eff';
            ctx.lineWidth = 1;
            ctx.strokeRect(house.x, house.y, house.width, house.yardHeight);

            // Draw house label
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 2px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`H${house.id}`, house.x + house.width / 2, house.y + 4);

            // Draw floors indicator for multi-story
            if (house.stories > 1) {
                ctx.fillStyle = '#f39c12';
                ctx.font = '1px Arial';
                ctx.fillText(`${house.stories}F`, house.x + house.width / 2, house.y + 2);
            }
        };

        if (this.houses.red) {
            this.houses.red.forEach(house => drawHouse(house, 'rgba(255, 59, 59, 0.2)'));
        }
        if (this.houses.blue) {
            this.houses.blue.forEach(house => drawHouse(house, 'rgba(59, 126, 255, 0.2)'));
        }
    }

    drawVisiblePlayers(ctx) {
        for (let player of this.visiblePlayers) {
            const color = player.team === 'red' ? '#ff3b3b' : '#3b7eff';
            this.drawPlayerMarker(ctx, player.position.x, player.position.y, false, color, player.name);
        }
    }

    drawPlayerMarker(ctx, x, y, isSelf = false, color = null, label = null) {
        const actualColor = color || (this.playerTeam === 'red' ? '#ff9f3b' : '#6ba3ff');
        
        ctx.fillStyle = actualColor;
        ctx.beginPath();
        ctx.arc(x, y, isSelf ? 1.5 : 1, 0, Math.PI * 2);
        ctx.fill();

        // Draw outline
        ctx.strokeStyle = isSelf ? '#fff' : actualColor;
        ctx.lineWidth = isSelf ? 0.5 : 0.3;
        ctx.stroke();

        // Draw name if available
        if (label) {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 1px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, y - 2);
        }
    }

    drawGrid(ctx, mapWidth, mapHeight) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.2;

        // Vertical lines
        for (let x = 0; x <= mapWidth; x += 10) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, mapHeight);
            ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= mapHeight; y += 10) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(mapWidth, y);
            ctx.stroke();
        }
    }

    handleMapClick(event) {
        if (!this.gameStarted || !this.mapCanvas) return;

        const rect = this.mapCanvas.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        // Convert canvas coordinates to map coordinates
        const mapWidth = this.mapConfig.width;
        const mapHeight = this.mapConfig.height;
        const zoomLevel = Math.min(
            this.mapCanvas.width / (mapWidth * 1.2),
            this.mapCanvas.height / (mapHeight * 1.2)
        );
        
        const offsetX = this.mapCanvas.width / 2 - (this.playerPosition?.x || 60) * zoomLevel;
        const offsetY = this.mapCanvas.height / 2 - (this.playerPosition?.y || 60) * zoomLevel;

        const targetX = (clickX - offsetX) / zoomLevel;
        const targetY = (clickY - offsetY) / zoomLevel;

        // Emit movement command
        this.moveToPosition(targetX, targetY);
    }

    moveToPosition(targetX, targetY) {
        if (!this.gameCode || !this.playerToken) return;

        // Clamp to map bounds
        targetX = Math.max(0, Math.min(targetX, this.mapConfig.width - 1));
        targetY = Math.max(0, Math.min(targetY, this.mapConfig.height - 1));

        this.socket.emit('game:move',
            {
                gameCode: this.gameCode,
                playerToken: this.playerToken,
                targetX: Math.round(targetX),
                targetY: Math.round(targetY)
            },
            (response) => {
                if (response.success) {
                    this.playerPosition = response.position;
                } else {
                    console.log('Move failed:', response.message);
                }
            }
        );
    }

    updateVisiblePlayersList() {
        const list = document.getElementById('visible-players');
        if (!list) return;

        if (this.visiblePlayers.length === 0) {
            list.innerHTML = '<p class="message-info">No enemies nearby...</p>';
            return;
        }

        list.innerHTML = this.visiblePlayers.map(player => `
            <div class="player-item ${player.team === 'red' ? 'enemy' : 'ally'}">
                ${player.team === 'red' ? '🔴' : '🔵'} ${player.name} (${player.distance}m)
            </div>
        `).join('');
    }

    // ===== UI UPDATE FUNCTIONS =====
    updateLobbyScreen() {
        // Update game code display
        document.getElementById('lobby-game-code').textContent = this.gameCode;

        // Update player info
        document.getElementById('lobby-player-name').textContent = this.playerName;

        // Show/hide host badge
        const hostBadge = document.getElementById('host-badge');
        if (this.isHost) {
            hostBadge.style.display = 'block';
        } else {
            hostBadge.style.display = 'none';
        }

        // Show host controls or waiting message
        const hostControls = document.getElementById('host-controls');
        const waitingMessage = document.getElementById('waiting-message');
        
        if (this.isHost) {
            hostControls.style.display = 'block';
            waitingMessage.style.display = 'none';
        } else {
            hostControls.style.display = 'none';
            waitingMessage.style.display = 'block';
        }

        this.updateLobbyTeams();
        this.updatePlayerCount();
    }

    updateLobbyTeams() {
        // Red team
        const redList = document.getElementById('red-team-list');
        if (this.redTeamPlayers.length === 0) {
            redList.innerHTML = '<p class="empty">Waiting for players...</p>';
        } else {
            redList.innerHTML = this.redTeamPlayers
                .map(p => `<div class="team-player red">${p.name}</div>`)
                .join('');
        }

        // Blue team
        const blueList = document.getElementById('blue-team-list');
        if (this.blueTeamPlayers.length === 0) {
            blueList.innerHTML = '<p class="empty">Waiting for players...</p>';
        } else {
            blueList.innerHTML = this.blueTeamPlayers
                .map(p => `<div class="team-player blue">${p.name}</div>`)
                .join('');
        }

        // Update button states
        const joinRedBtn = document.getElementById('btn-join-red');
        const joinBlueBtn = document.getElementById('btn-join-blue');

        if (this.playerTeam === 'red') {
            joinRedBtn.textContent = '✓ Joined Red Team';
            joinRedBtn.disabled = true;
            joinBlueBtn.textContent = 'Join Blue Team';
            joinBlueBtn.disabled = false;
        } else if (this.playerTeam === 'blue') {
            joinBlueBtn.textContent = '✓ Joined Blue Team';
            joinBlueBtn.disabled = true;
            joinRedBtn.textContent = 'Join Red Team';
            joinRedBtn.disabled = false;
        } else {
            joinRedBtn.textContent = 'Join Red Team';
            joinRedBtn.disabled = false;
            joinBlueBtn.textContent = 'Join Blue Team';
            joinBlueBtn.disabled = false;
        }
    }

    updatePlayerCount() {
        const totalPlayers = this.redTeamPlayers.length + this.blueTeamPlayers.length;
        document.getElementById('player-count-display').textContent = `Players: ${totalPlayers}/8`;

        // Enable start button if minimum 2 players and player has selected a team
        const startBtn = document.getElementById('btn-start-game');
        const canStart = this.isHost && totalPlayers >= 2 && this.playerTeam;
        startBtn.disabled = !canStart;
        
        if (canStart) {
            startBtn.textContent = 'Start Game';
        } else if (totalPlayers < 2) {
            startBtn.textContent = 'Start Game (Minimum 2 players)';
        } else if (!this.playerTeam) {
            startBtn.textContent = 'Select a team first';
        }
    }

    updateGameScreen() {
        // Update header with team scores
        document.getElementById('red-score').textContent = this.redScore;
        document.getElementById('blue-score').textContent = this.blueScore;
        document.getElementById('current-round').textContent = this.currentRound;

        // Update team display
        const teamEmoji = this.playerTeam === 'red' ? '🔴' : '🔵';
        const teamColor = this.playerTeam === 'red' ? 'Red' : 'Blue';
        document.getElementById('my-team-display').textContent = `${teamEmoji} ${teamColor}`;

        // Update my team players
        const myTeamPlayers = this.playerTeam === 'red' ? this.redTeamPlayers : this.blueTeamPlayers;
        const myTeamList = document.getElementById('my-team-players');
        
        if (myTeamPlayers.length === 0) {
            myTeamList.innerHTML = '<p>No teammates</p>';
        } else {
            myTeamList.innerHTML = myTeamPlayers
                .map(p => `<div class="player-item">${p.name}</div>`)
                .join('');
        }

        // Placeholder game log
        const gameLog = document.getElementById('game-log');
        gameLog.innerHTML = `
            <p class="message-info">🎮 Game started! Defend your flag and capture the enemy flag!</p>
            <p class="message-info">🔴 Red Team is ready to battle!</p>
            <p class="message-info">🔵 Blue Team is ready to battle!</p>
        `;
    }

    playAgain() {
        this.showScreen('home-screen');
        this.clearSession();
        this.gameCode = null;
        this.playerToken = null;
        this.playerTeam = null;
        this.gameStarted = false;
    }

    backToHome() {
        this.showScreen('home-screen');
        this.clearSession();
        this.gameCode = null;
        this.playerToken = null;
        this.playerTeam = null;
        this.gameStarted = false;
    }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing Game');
    new Game();
});
