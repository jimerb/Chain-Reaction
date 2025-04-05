// main.js
// Using globally loaded THREE from script tag
// Using globally loaded OrbitControls from script tag
// Using globally loaded UIManager, DiceController, etc.

// --- Global Variables ---
let gameManager;
let uiManager;
let diceController;
let enhancementController;
let scene, camera, renderer, controls; // Three.js basics
let interactionObjects = []; // For raycasting (dice, tokens)

// --- Initialization ---
function initThreeJS() {
    const container = document.getElementById('threejs-canvas-container');
    if (!container) {
        console.error("Three.js container not found!");
        return;
    }

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0e1216); // Dark background to match the nuclear theme
    // Optional - add a subtle fog effect for atmosphere
    scene.fog = new THREE.FogExp2(0x0e1216, 0.0025);

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 18, 12); // Angled view - high but slightly tilted
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    container.appendChild(renderer.domElement);

    // Remove any stats or debug elements if they exist
    const statsElement = document.getElementById('threejs-stats');
    if (statsElement) {
        statsElement.remove();
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // Soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    directionalLight.castShadow = true;
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
     // Adjust shadow camera bounds to cover the play area
    directionalLight.shadow.camera.left = -15;
    directionalLight.shadow.camera.right = 15;
    directionalLight.shadow.camera.top = 15;
    directionalLight.shadow.camera.bottom = -15;

    scene.add(directionalLight);
     // Optional: Light helper
    // const helper = new THREE.DirectionalLightHelper( directionalLight, 5 );
    // scene.add( helper );
     // Optional: Shadow camera helper
    // const shadowHelper = new THREE.CameraHelper( directionalLight.shadow.camera );
    // scene.add( shadowHelper );


    // Controls (Optional: for debugging camera movement)
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableRotate = true; // Allow limited rotation
    controls.maxPolarAngle = Math.PI / 3; // Limit how far user can tilt down
    controls.minPolarAngle = Math.PI / 6; // Limit how far user can tilt up
    controls.enableDamping = true; // Smooth camera movement
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.target.set(0, 0, 0); // Ensure controls focus on the center

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Add raycaster for interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('click', (event) => {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Update the picking ray with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the picking ray
        const intersects = raycaster.intersectObjects(interactionObjects, true); // Check children too

        if (intersects.length > 0) {
            let clickedObject = intersects[0].object;
            // Traverse up to find the main group/object if nested
             while (clickedObject.parent && !clickedObject.userData.isInteractable) {
                clickedObject = clickedObject.parent;
            }

            if (clickedObject.userData.isInteractable) {
                handleInteraction(clickedObject);
            }
        }
    });
}

function onWindowResize() {
    const container = document.getElementById('threejs-canvas-container');
    if (!container || !renderer) return; // Check if elements exist

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function handleInteraction(object) {
    console.log('Clicked on:', object.userData);
    const canSelect = gameManager.canSelectDie(); // Check condition first
    console.log(`   Checking gameManager.canSelectDie(): ${canSelect}`);

    // Delegate interaction based on object type
    if (object.userData.type === 'die' && canSelect) {
        console.log("   Condition met: Calling gameManager.handleDieClick()");
        gameManager.handleDieClick(object);
    } else if (object.userData.type === 'enhancementToken' && gameManager.canUseEnhancement(object.userData.enhancementType)) {
        enhancementController.attemptUseEnhancement(object.userData.enhancementType, object.userData.playerId);
    } else if (object.userData.type === 'selectableDieForEnrichment' && gameManager.isWaitingForEnrichmentTarget()) {
         enhancementController.selectEnrichmentTarget(object);
    } else {
        console.log("   Condition NOT met for die click or other interaction.");
    }
}

function animate() {
    requestAnimationFrame(animate);
    if(controls) controls.update(); // Required if damping enabled
    renderer.render(scene, camera);
}

// --- Game Setup and Control Flow ---
function setupGame() {
    const playerName = document.getElementById('player-name').value || "Player 1";
    const playerCount = parseInt(document.getElementById('player-count').value, 10);

    // Initialize Core Modules
    uiManager = new UIManager();
    diceController = new DiceController(scene, interactionObjects);
    gameManager = new GameManager(playerCount, playerName, uiManager, diceController, handleGameEnd);
    enhancementController = new EnhancementController(gameManager, uiManager, diceController);
    gameManager.setEnhancementController(enhancementController); // Link enhancement controller back

    // Create Dice and Table
    diceController.createTable();
    diceController.createDice(5); // Create 5 dice

    // Create Players and UI
    gameManager.setupPlayers();
    uiManager.initializeScoreboard(gameManager.getPlayers());
    diceController.createEnhancementTokens(gameManager.getPlayers(), interactionObjects); // Create tokens after players exist
    uiManager.displayPlayerEnhancements(gameManager.getPlayers(), diceController.enhancementTokens); // Display tokens

    // Transition Screens
    uiManager.showGameScreen();
    gameManager.startGame(); // Determine first player and update UI
}

function handleGameEnd(winnerInfo) {
     uiManager.displayWinner(winnerInfo);
     // Optionally disable controls further
     console.log("Game Over!", winnerInfo);
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Three.js
    initThreeJS();
    animate();
    
    // Set up event listeners
    document.getElementById('start-game-button').addEventListener('click', setupGame);
    document.getElementById('roll-button').addEventListener('click', () => gameManager.handleRollAction());
    document.getElementById('continue-button').addEventListener('click', () => gameManager.handleContinueAction());
    document.getElementById('stop-button').addEventListener('click', () => gameManager.handleStopAction());

    // Enhancement buttons delegate to the controller
    document.getElementById('enrichment-button').addEventListener('click', () => enhancementController.attemptUseEnhancement('enrichment'));
    document.getElementById('controlrod-button').addEventListener('click', () => enhancementController.attemptUseEnhancement('controlRod'));
    document.getElementById('fusion-button').addEventListener('click', () => enhancementController.attemptUseEnhancement('fusion'));
});