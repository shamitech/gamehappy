// Three.js game engine
let gameInstance = null;

class Game {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.car = null;
        this.carSpeed = 0;
        this.carRotation = 0;
        this.carPosition = { x: 0, z: 0 };
        this.wheels = [];
        this.wheelRotation = 0;
        this.keys = {};
        this.isRunning = false;
        
        this.init();
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.scene.fog = new THREE.Fog(0x87ceeb, 200, 500);

        // Camera setup - fixed to always face north
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        this.camera.position.set(0, 12, -25);
        this.camera.lookAt(0, 0, 0);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(width, height);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFShadowShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        this.scene.add(directionalLight);

        // Ground
        const groundGeometry = new THREE.PlaneGeometry(400, 400);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x2d5016 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Create car
        this.createCar();

        // Input handling
        this.setupControls();

        // Window resize handling
        window.addEventListener('resize', () => this.onWindowResize());

        // Start game loop
        this.isRunning = true;
        this.gameLoop();
    }

    createCar() {
        this.car = new THREE.Group();
        this.car.position.set(0, 0, 0);
        this.wheels = [];

        // Main body with rounded corners using LatheGeometry for smooth sides
        const carBodyMaterial = new THREE.MeshStandardMaterial({
            color: 0xC41E3A,
            metalness: 0.6,
            roughness: 0.3,
            side: THREE.DoubleSide
        });

        // Front section (hood)
        const frontGeometry = new THREE.BoxGeometry(1.1, 0.4, 0.8);
        const front = new THREE.Mesh(frontGeometry, carBodyMaterial);
        front.position.set(0, 0.4, 1.4);
        front.scale.z = 0.6;
        front.castShadow = true;
        front.receiveShadow = true;
        this.car.add(front);

        // Main cabin body (rounded)
        const cabinGeometry = new THREE.BoxGeometry(1.15, 0.8, 2.0);
        const cabin = new THREE.Mesh(cabinGeometry, carBodyMaterial);
        cabin.position.set(0, 0.45, 0);
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        this.car.add(cabin);

        // Rear cargo section
        const cargoGeometry = new THREE.BoxGeometry(1.15, 0.7, 1.2);
        const cargo = new THREE.Mesh(cargoGeometry, carBodyMaterial);
        cargo.position.set(0, 0.4, -1.3);
        cargo.castShadow = true;
        cargo.receiveShadow = true;
        this.car.add(cargo);

        // Rounded roof
        const roofGeometry = new THREE.BoxGeometry(1.0, 0.5, 1.8);
        const roof = new THREE.Mesh(roofGeometry, carBodyMaterial);
        roof.position.set(0, 1.15, 0.1);
        roof.castShadow = true;
        roof.receiveShadow = true;
        this.car.add(roof);

        // Glass material for windows
        const glassMaterial = new THREE.MeshStandardMaterial({
            color: 0x87CEEB,
            transparent: true,
            opacity: 0.35,
            metalness: 0.2,
            roughness: 0.1,
            side: THREE.DoubleSide
        });

        // Windshield
        const windshieldGeometry = new THREE.PlaneGeometry(1.0, 0.45);
        const windshield = new THREE.Mesh(windshieldGeometry, glassMaterial);
        windshield.position.set(0, 0.75, 1.1);
        windshield.rotation.x = -0.2;
        windshield.castShadow = false;
        windshield.receiveShadow = true;
        this.car.add(windshield);

        // Side windows
        const sideWindowGeometry = new THREE.PlaneGeometry(0.4, 0.5);
        const leftWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        leftWindow.rotation.y = Math.PI / 2;
        leftWindow.position.set(-0.625, 0.65, 0.2);
        leftWindow.castShadow = false;
        leftWindow.receiveShadow = true;
        this.car.add(leftWindow);

        const rightWindow = new THREE.Mesh(sideWindowGeometry, glassMaterial);
        rightWindow.rotation.y = Math.PI / 2;
        rightWindow.position.set(0.625, 0.65, 0.2);
        rightWindow.castShadow = false;
        rightWindow.receiveShadow = true;
        this.car.add(rightWindow);

        // Rear window
        const rearWindowGeometry = new THREE.PlaneGeometry(1.0, 0.4);
        const rearWindow = new THREE.Mesh(rearWindowGeometry, glassMaterial);
        rearWindow.position.set(0, 0.8, -1.5);
        rearWindow.castShadow = false;
        rearWindow.receiveShadow = true;
        this.car.add(rearWindow);

        // Headlights
        const headlightGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 16);
        const headlightMaterial = new THREE.MeshStandardMaterial({
            color: 0xFFFF99,
            metalness: 0.8,
            roughness: 0.2,
            emissive: 0xFFFF00,
            emissiveIntensity: 0.3
        });

        const leftHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        leftHeadlight.position.set(-0.35, 0.35, 1.8);
        leftHeadlight.rotation.z = Math.PI / 2;
        leftHeadlight.castShadow = true;
        this.car.add(leftHeadlight);

        const rightHeadlight = new THREE.Mesh(headlightGeometry, headlightMaterial);
        rightHeadlight.position.set(0.35, 0.35, 1.8);
        rightHeadlight.rotation.z = Math.PI / 2;
        rightHeadlight.castShadow = true;
        this.car.add(rightHeadlight);

        // Bumpers (sleek looking)
        const bumperMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,
            metalness: 0.5,
            roughness: 0.4
        });

        const frontBumperGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.15);
        const frontBumper = new THREE.Mesh(frontBumperGeometry, bumperMaterial);
        frontBumper.position.set(0, 0.25, 1.95);
        frontBumper.castShadow = true;
        frontBumper.receiveShadow = true;
        this.car.add(frontBumper);

        const rearBumperGeometry = new THREE.BoxGeometry(1.2, 0.1, 0.15);
        const rearBumper = new THREE.Mesh(rearBumperGeometry, bumperMaterial);
        rearBumper.position.set(0, 0.25, -2.0);
        rearBumper.castShadow = true;
        rearBumper.receiveShadow = true;
        this.car.add(rearBumper);

        // Wheels
        const wheelGeometry = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 32);
        const wheelMaterial = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            metalness: 0.7,
            roughness: 0.4
        });

        const rimGeometry = new THREE.CylinderGeometry(0.24, 0.24, 0.3, 32);
        const rimMaterial = new THREE.MeshStandardMaterial({
            color: 0xc0c0c0,
            metalness: 0.9,
            roughness: 0.2
        });

        const wheelPositions = [
            { x: -0.48, z: 0.75 },
            { x: 0.48, z: 0.75 },
            { x: -0.48, z: -0.75 },
            { x: 0.48, z: -0.75 }
        ];

        wheelPositions.forEach((pos) => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(pos.x, 0.38, pos.z);
            wheelGroup.rotation.z = Math.PI / 2;

            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.castShadow = true;
            wheel.receiveShadow = true;
            wheelGroup.add(wheel);

            const rim = new THREE.Mesh(rimGeometry, rimMaterial);
            rim.position.z = 0.02;
            rim.castShadow = true;
            rim.receiveShadow = true;
            wheelGroup.add(rim);

            this.car.add(wheelGroup);
            this.wheels.push(wheelGroup);
        });

        this.scene.add(this.car);
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    updateCarMovement() {
        const acceleration = 0.01;
        const maxSpeed = 0.3;
        const friction = 0.92;
        const turnSpeed = 0.08;

        // Forward/Backward
        if (this.keys['arrowup'] || this.keys['w']) {
            this.carSpeed = Math.min(this.carSpeed + acceleration, maxSpeed);
        } else if (this.keys['arrowdown'] || this.keys['s']) {
            this.carSpeed = Math.max(this.carSpeed - acceleration, -maxSpeed);
        } else {
            this.carSpeed *= friction;
        }

        // Left/Right turning
        if (this.keys['arrowleft'] || this.keys['a']) {
            this.carRotation += turnSpeed;
        }
        if (this.keys['arrowright'] || this.keys['d']) {
            this.carRotation -= turnSpeed;
        }

        // Update wheel rotation based on movement
        this.wheelRotation += this.carSpeed * 0.15;
        this.wheels.forEach(wheel => {
            wheel.rotation.x = this.wheelRotation;
        });

        // Update car position based on rotation and speed
        this.carPosition.x += Math.sin(this.carRotation) * this.carSpeed;
        this.carPosition.z += Math.cos(this.carRotation) * this.carSpeed;

        // Update car world position and rotation
        this.car.position.x = this.carPosition.x;
        this.car.position.z = this.carPosition.z;
        this.car.rotation.y = this.carRotation;

        // Camera positioned behind the car, always looking at it
        const cameraDistance = 6;
        const cameraHeight = 2;
        
        // Position camera behind car based on its rotation
        this.camera.position.x = this.carPosition.x + Math.sin(this.carRotation) * cameraDistance;
        this.camera.position.z = this.carPosition.z + Math.cos(this.carRotation) * cameraDistance;
        this.camera.position.y = cameraHeight;

        // Always look at the car
        this.camera.lookAt(this.carPosition.x, 0.3, this.carPosition.z);
    }

    gameLoop = () => {
        if (!this.isRunning) return;

        this.updateCarMovement();
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.gameLoop);
    }

    onWindowResize() {
        if (!this.container || !this.camera || !this.renderer) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    stop() {
        this.isRunning = false;
        if (this.renderer && this.container && this.renderer.domElement.parentNode === this.container) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

function startGame() {
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    
    if (gameInstance) {
        gameInstance.stop();
    }
    
    gameInstance = new Game('game-container');
}

// Cleanup when going back
document.addEventListener('DOMContentLoaded', () => {
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            if (gameInstance) {
                gameInstance.stop();
                gameInstance = null;
            }
        });
    }
});
