// core/GameController.js
import * as THREE from 'three';
import GameLoop from './GameLoop.js';
import GameState from './GameState.js';
import SaveSystem from './SaveSystem.js';
import SceneManager from './SceneManager.js';
import EntityManager from './EntityManager.js';
import ObjectiveSystem from './ObjectiveSystem.js';

// Component Managers
import PositionComponent from '../entities/components/PositionComponent.js';
import HealthComponent from '../entities/components/HealthComponent.js';
import RenderComponent from '../entities/components/RenderComponent.js';
import FactionComponent from '../entities/components/FactionComponent.js';
import ResourceComponent from '../entities/components/ResourceComponent.js';

// Systems
import RenderSystem from '../entities/systems/RenderSystem.js';
import MovementSystem from '../entities/systems/MovementSystem.js';
import CombatSystem from '../entities/systems/CombatSystem.js';
import AISystem from '../entities/systems/AISystem.js';
import SpawnSystem from '../entities/systems/SpawnSystem.js';
import AnimationSystem from '../entities/systems/AnimationSystem.js'; // Add this line

// Utilities
import InputManager from '../utils/InputManager.js';
import ModelLoader from '../loaders/ModelLoader.js';

// Scenarios
import ScenarioManager from '../scenarios/ScenarioManager.js';

class GameController {
  constructor() {
    console.log('GameController initializing');
    
    // Create core game objects
    this.gameState = new GameState();
    this.saveSystem = new SaveSystem();
    this.sceneManager = new SceneManager();
    this.entityManager = new EntityManager(this.gameState);
    this.modelLoader = new ModelLoader();
    
    // Initialize component managers
    this.initializeComponentManagers();
    
    // Create systems (without initializing)
    this.systems = {};
    this.createSystems();
    
    // Create main scene
    this.createMainScene();
    
    // Create scenario manager
    this.scenarioManager = new ScenarioManager(this);
    
    // Current scenario
    this.currentScenario = null;
    
    // Game end callback (will be set by index.js)
    this.onGameEnd = null;
    
    // Game state
    this.isRunning = false;
    this.isPaused = false;
    
    console.log('GameController initialization completed');
  }

  initializeComponentManagers() {
    console.log('Initializing component managers');
    const positionManager = new PositionComponent();
    const healthManager = new HealthComponent();
    const renderManager = new RenderComponent();
    const factionManager = new FactionComponent();
    const resourceManager = new ResourceComponent();
    
    this.entityManager.registerComponentManager('position', positionManager);
    this.entityManager.registerComponentManager('health', healthManager);
    this.entityManager.registerComponentManager('render', renderManager);
    this.entityManager.registerComponentManager('faction', factionManager);
    this.entityManager.registerComponentManager('resource', resourceManager);
  }

  createSystems() {
    console.log('Creating systems');
    this.systems.render = new RenderSystem(this.entityManager, this.sceneManager, this.modelLoader);
    this.systems.movement = new MovementSystem(this.entityManager);
    this.systems.combat = new CombatSystem(this.entityManager);
    this.systems.ai = new AISystem(this.entityManager, this.systems.combat, this.systems.movement);
    this.systems.spawn = new SpawnSystem(this.entityManager);
    // Add animation system
    this.systems.animation = new AnimationSystem(this.entityManager, this.systems);
  }

  createMainScene() {
    console.log('Creating main scene');
    
    // Create main game scene with a top-down RTS camera
    const { scene, camera } = this.sceneManager.createScene('main', {
      fov: 60,
      position: new THREE.Vector3(0, 50, 50),
      near: 0.1,
      far: 2000
    });
    
    // Set camera to look down at an angle (RTS style)
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.rotation.z = 0; // Keep the horizon level
    
    // Set active scene
    this.sceneManager.setActiveScene('main');
    
    // Set camera bounds for a large world
    this.sceneManager.setCameraBounds(-100, 100, -100, 100);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Add a ground plane
    const groundSize = 200;
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a7c5f,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.userData.isGround = true; // Mark as ground for raycasting
    scene.add(ground);
    
    // Add grid helper
    const gridHelper = new THREE.GridHelper(groundSize, 20);
    gridHelper.position.y = 0.01;
    scene.add(gridHelper);
  }

  loadScenario(scenarioId) {
    console.log(`Loading scenario: ${scenarioId}`);
    
    // Clear any existing game state
    this.resetGame();
    
    // Load the scenario
    this.currentScenario = this.scenarioManager.loadScenario(scenarioId);
    
    if (!this.currentScenario) {
      console.error(`Failed to load scenario: ${scenarioId}`);
      return false;
    }
    
    return true;
  }

  resetGame() {
    console.log('Resetting game state');
    
    // Clear entities
    this.gameState.entities.clear();
    this.gameState.nextEntityId = 1;
    
    // Reset resources
    this.gameState.playerResources = { minerals: 0, gas: 0 };
    
    // Reset game time
    this.gameState.gameTime = 0;
    
    // Reset systems
    for (const system of Object.values(this.systems)) {
      if (typeof system.reset === 'function') {
        system.reset();
      }
    }
  }

  start() {
    if (this.isRunning) {return;}
    
    console.log('Starting game');
    
    // Initialize systems
    const systemsInitialized = this.initializeSystems();
    if (!systemsInitialized) {
      console.error('Failed to initialize systems');
      return;
    }
    
    // Initialize input manager with edge scrolling preference from menu if available
    this.inputManager = new InputManager(
      this.entityManager,
      this.sceneManager,
      this.systems
    );
    
    // Apply edge scrolling setting from menu if it exists
    if (window.game && window.game.menuSystem) {
      this.inputManager.toggleEdgeScrolling(window.game.menuSystem.edgeScrollingEnabled);
    }
    
    // Initialize game loop
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this)
    );
    
    // Start scenario
    if (this.currentScenario) {
      this.currentScenario.start();
    }
    
    // Start the game loop
    this.gameLoop.start();
    
    this.isRunning = true;
    console.info('Game started');
  }

  initializeSystems() {
    console.log('Initializing systems');
    
    const activeScene = this.sceneManager.getActiveScene();
    if (!activeScene) {
      console.error('No active scene available for systems initialization');
      return false;
    }
    
    // Initialize each system
    for (const [name, system] of Object.entries(this.systems)) {
      if (typeof system.initialize === 'function') {
        try {
          console.log(`Initializing system: ${name}`);
          system.initialize();
        } catch (error) {
          console.error(`Error initializing system ${name}:`, error);
          return false;
        }
      }
    }
    
    console.log('All systems initialized successfully');
    return true;
  }

  update(deltaTime) {
    if (this.isPaused) {return;}
    
    // Update game state
    this.gameState.update(deltaTime);
    
    // Update current scenario
    if (this.currentScenario) {
      this.currentScenario.update(deltaTime);
    }
    
    // Update all systems
    for (const [name, system] of Object.entries(this.systems)) {
      if (typeof system.update === 'function') {
        try {
          // Special case for spawn system which needs AI system reference
          if (name === 'spawn') {
            system.update(deltaTime, this.systems.ai);
          } else {
            system.update(deltaTime);
          }
        } catch (error) {
          console.error(`Error updating system ${name}:`, error);
        }
      }
    }
    
    // Check for game over conditions
    if (this.currentScenario) {
      if (this.currentScenario.checkVictory()) {
        this.endGame(true);
      } else if (this.currentScenario.checkDefeat()) {
        this.endGame(false);
      }
    }
  }

  render(deltaTime) {
    try {
      this.sceneManager.render(deltaTime);
    } catch (error) {
      console.error('Error in render method:', error);
    }
  }

  endGame(playerWon) {
    console.log(`Game ended: ${playerWon ? 'Victory' : 'Defeat'}`);
    
    // Stop the game loop
    if (this.gameLoop) {
      this.gameLoop.stop();
    }
    
    this.isRunning = false;
    
    // Call the game end callback
    if (this.onGameEnd) {
      this.onGameEnd(playerWon);
    }
  }

  pause() {
    if (!this.isRunning) {return;}
    this.isPaused = true;
    console.log('Game paused');
  }

  resume() {
    if (!this.isRunning) {return;}
    this.isPaused = false;
    console.log('Game resumed');
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }
  
  // Save/load methods
  async saveGame(saveName) {
    try {
      const saveId = await this.saveSystem.saveGame(this.gameState, saveName);
      console.log(`Game saved with ID: ${saveId}`);
      return saveId;
    } catch (error) {
      console.error('Failed to save game:', error);
      throw error;
    }
  }

  async loadGame(saveId) {
    try {
      const saveData = await this.saveSystem.loadGame(saveId);
      this.gameState.deserialize(saveData);
      
      // Reinitialize systems with loaded data
      for (const system of Object.values(this.systems)) {
        if (typeof system.deserialize === 'function' && saveData[system.constructor.name]) {
          system.deserialize(saveData[system.constructor.name]);
        }
      }
      
      console.log(`Game loaded from save ID: ${saveId}`);
      return true;
    } catch (error) {
      console.error('Failed to load game:', error);
      throw error;
    }
  }

  async getSaveList() {
    try {
      return await this.saveSystem.getSaveList();
    } catch (error) {
      console.error('Failed to get save list:', error);
      throw error;
    }
  }
}

export default GameController;