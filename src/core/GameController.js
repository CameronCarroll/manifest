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
import UnitTypeComponent from '../entities/components/UnitTypeComponent.js';
import BuildingTypeComponent from '../entities/components/BuildingTypeComponent.js';

// Systems
import RenderSystem from '../entities/systems/RenderSystem.js';
import MovementSystem from '../entities/systems/MovementSystem.js';
import CombatSystem from '../entities/systems/CombatSystem.js';
import AISystem from '../entities/systems/AISystem.js';
import SpawnSystem from '../entities/systems/SpawnSystem.js';
import AnimationSystem from '../entities/systems/AnimationSystem.js'; // Add this line
import CollisionSystem from '../entities/systems/CollisionSystem.js';

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
    const unitTypeManager = new UnitTypeComponent();
    const buildingTypeManager = new BuildingTypeComponent();
    
    this.entityManager.registerComponentManager('position', positionManager);
    this.entityManager.registerComponentManager('health', healthManager);
    this.entityManager.registerComponentManager('render', renderManager);
    this.entityManager.registerComponentManager('faction', factionManager);
    this.entityManager.registerComponentManager('resource', resourceManager);
    this.entityManager.registerComponentManager('unitType', unitTypeManager);
    this.entityManager.registerComponentManager('buildingType', buildingTypeManager);
    
    console.log('Component managers initialized, including new unitType and buildingType components');
  }

  createSystems() {
    console.log('Creating systems - START');
    console.log('Current systems object:', this.systems);
  
    this.systems.render = new RenderSystem(
      this.entityManager, 
      this.sceneManager, 
      this.modelLoader,
      this.systems
    );
    console.log('Render system created:', this.systems.render);
    
    // Create collision system before movement system
    this.systems.collision = new CollisionSystem(this.entityManager);
    console.log('Collision system created:', this.systems.collision);
    
    this.systems.movement = new MovementSystem(this.entityManager, this.systems);
    console.log('Movement system created:', this.systems.movement);
    
    this.systems.combat = new CombatSystem(this.entityManager, this.systems.movement);
    console.log('Combat system created:', this.systems.combat);
    
    // Animation system should be created before AI system
    this.systems.animation = new AnimationSystem(this.entityManager, this.systems);
    console.log('Animation system created:', this.systems.animation);
    
    this.systems.ai = new AISystem(
      this.entityManager, 
      this.systems.combat, 
      this.systems.movement
    );
    console.log('AI system created:', this.systems.ai);
    
    this.systems.spawn = new SpawnSystem(this.entityManager);
    console.log('Spawn system created:', this.systems.spawn);
    
    this.systems.objectives = new ObjectiveSystem(this.entityManager);
    console.log('Objectives system created:', this.systems.objectives);
    
    console.log('Final systems object:', this.systems);
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
    
    // Update UI visibility based on scenario features
    this.updateUIVisibility();
    
    return true;
  }
  
  // New method to update UI visibility based on scenario features
  updateUIVisibility() {
    if (!this.currentScenario) { return; }
    
    // If we're using the DOM for UI elements, find and update their visibility
    const resourceDisplay = document.getElementById('resource-display');
    const productionDisplay = document.getElementById('production-display');
    const actionButtons = document.getElementById('action-buttons');
    
    if (resourceDisplay) {
      resourceDisplay.style.display = this.currentScenario.features.resources ? 'block' : 'none';
    }
    
    if (actionButtons) {
      actionButtons.style.display = this.currentScenario.features.resources ? 'flex' : 'none';
    }
    
    if (productionDisplay) {
      productionDisplay.style.display = this.currentScenario.features.production ? 'block' : 'none';
    }
    
    console.log(`UI visibility updated based on scenario: 
      Resources: ${this.currentScenario.features.resources ? 'Shown' : 'Hidden'}
      Production: ${this.currentScenario.features.production ? 'Shown' : 'Hidden'}`);
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

  // Update GameController.js to properly initialize the animation system
  initializeSystems() {
    console.log('Initializing systems');
  
    const activeScene = this.sceneManager.getActiveScene();
    if (!activeScene) {
      console.error('No active scene available for systems initialization');
      return false;
    }
  
    // Initialize render system first
    if (this.systems.render) {
      console.log('Initializing render system');
      this.systems.render.initialize();
    }
  
    // Initialize animation system early
    if (this.systems.animation) {
      console.log('Initializing animation system');
      this.systems.animation.initialize();
    }
  
    // Initialize combat system and connect it to the animation system
    if (this.systems.combat) {
      console.log('Initializing combat system');
      this.systems.combat.initialize();
      
      // Explicitly set the animation system reference
      if (this.systems.animation) {
        console.log('Connecting combat system to animation system');
        this.systems.combat.setAnimationSystem(this.systems.animation);
      } else {
        console.warn('Animation system not available for combat system');
      }
    }

    // Initialize collision system before movement
    if (this.systems.collision) {
      console.log('Initializing collision system');
      this.systems.collision.initialize();
    }
  
    // Initialize movement system and connect it to combat system
    if (this.systems.movement) {
      console.log('Initializing movement system');
      this.systems.movement.initialize();
      
      // Connect movement system to combat system
      if (this.systems.combat) {
        this.systems.combat.setMovementSystem(this.systems.movement);
      }
    }
  
    // Initialize AI and spawn systems last
    if (this.systems.ai) {
      console.log('Initializing AI system');
      this.systems.ai.initialize();
    }
  
    if (this.systems.spawn) {
      console.log('Initializing spawn system');
      this.systems.spawn.initialize();
    }
    
    if (this.systems.objectives) {
      console.log('Initializing objectives system');
      this.systems.objectives.initialize();
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

  // Toggle collision debug visualization
  toggleCollisionDebug() {
    if (!this.systems.collision) {
      console.warn('Collision system not available');
      return false;
    }
  
    const { scene } = this.sceneManager.getActiveScene();
    if (!scene) {
      console.warn('No active scene available');
      return false;
    }
  
    // Check if debug visualization is active
    if (this.systems.collision.debugMeshes && this.systems.collision.debugMeshes.length > 0) {
    // Remove existing visualization
      this.systems.collision.removeDebugVisualization(scene);
      console.log('Collision debug visualization disabled');
      return false;
    } else {
    // Create new visualization
      const count = this.systems.collision.createDebugVisualization(scene);
      console.log(`Collision debug visualization enabled for ${count} entities`);
      return true;
    }
  }
  
  // Toggle model debug visualization
  toggleModelDebug() {
    // Enable/disable model factory debugging
    if (this.systems.render && this.systems.render.modelFactory) {
      const modelFactory = this.systems.render.modelFactory;
      modelFactory.debug = !modelFactory.debug;
      console.log(`Model factory debug ${modelFactory.debug ? 'enabled' : 'disabled'}`);
      return modelFactory.debug;
    }
    return false;
  }
  
  // Toggle animation debug visualization
  toggleAnimationDebug() {
    // Enable/disable animation factory debugging
    if (this.systems.animation && this.systems.animation.animationFactory) {
      const animationFactory = this.systems.animation.animationFactory;
      animationFactory.debug = !animationFactory.debug;
      console.log(`Animation factory debug ${animationFactory.debug ? 'enabled' : 'disabled'}`);
      
      // Update debug flag in the animation system as well
      this.systems.animation.debug = animationFactory.debug;
      
      return animationFactory.debug;
    }
    return false;
  }
  
  // Toggle component debug information
  toggleComponentDebug() {
    // Create a debug overlay in the DOM to show component counts
    const existingOverlay = document.getElementById('component-debug-overlay');
    
    if (existingOverlay) {
      // Remove existing overlay
      document.body.removeChild(existingOverlay);
      console.log('Component debug overlay disabled');
      
      // Clear any interval that might be updating it
      if (this._componentDebugInterval) {
        clearInterval(this._componentDebugInterval);
        this._componentDebugInterval = null;
      }
      
      return false;
    } else {
      // Create new overlay
      const overlay = document.createElement('div');
      overlay.id = 'component-debug-overlay';
      overlay.style.position = 'absolute';
      overlay.style.top = '10px';
      overlay.style.right = '10px';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      overlay.style.color = 'white';
      overlay.style.padding = '10px';
      overlay.style.fontFamily = 'monospace';
      overlay.style.fontSize = '12px';
      overlay.style.zIndex = '1000';
      overlay.style.maxHeight = '80vh';
      overlay.style.overflowY = 'auto';
      
      document.body.appendChild(overlay);
      
      // Update component counts every second
      this._componentDebugInterval = setInterval(() => {
        // Count components
        const componentCounts = {};
        
        for (const [componentType, manager] of Object.entries(this.entityManager.componentManagers)) {
          if (manager && manager.components) {
            componentCounts[componentType] = manager.components.size;
          }
        }
        
        // Count entity types
        const entityTypes = {
          total: this.entityManager.gameState.entities.size,
          units: 0,
          buildings: 0,
          resources: 0,
          other: 0
        };
        
        // Count specific types
        this.entityManager.gameState.entities.forEach((entity, entityId) => {
          if (this.entityManager.hasComponent(entityId, 'unitType')) {
            entityTypes.units++;
          } else if (this.entityManager.hasComponent(entityId, 'buildingType')) {
            entityTypes.buildings++;
          } else if (this.entityManager.hasComponent(entityId, 'resource')) {
            entityTypes.resources++;
          } else {
            entityTypes.other++;
          }
        });
        
        // Update overlay content
        overlay.innerHTML = `
          <strong>Component Counts:</strong><br>
          ${Object.entries(componentCounts)
            .map(([type, count]) => `${type}: ${count}`)
            .join('<br>')
          }
          <br><br>
          <strong>Entity Types:</strong><br>
          ${Object.entries(entityTypes)
            .map(([type, count]) => `${type}: ${count}`)
            .join('<br>')
          }
          <br><br>
          <strong>FPS:</strong> ${Math.round(1 / this.gameState.deltaTime)}
        `;
      }, 1000);
      
      console.log('Component debug overlay enabled');
      return true;
    }
  }
}

export default GameController;