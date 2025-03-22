import * as THREE from 'three';
import GameLoop from './core/GameLoop.js';
import GameState from './core/GameState.js';
import SaveSystem from './core/SaveSystem.js';
import SceneManager from './core/SceneManager.js';
import EntityManager from './core/EntityManager.js';

// Component Managers
import PositionComponent from './entities/components/PositionComponent.js';
import HealthComponent from './entities/components/HealthComponent.js';
import RenderComponent from './entities/components/RenderComponent.js';
import FactionComponent from './entities/components/FactionComponent.js';

// Systems
import RenderSystem from './entities/systems/RenderSystem.js';
import MovementSystem from './entities/systems/MovementSystem.js';
import CombatSystem from './entities/systems/CombatSystem.js';
import AISystem from './entities/systems/AISystem.js';
import SpawnSystem from './entities/systems/SpawnSystem.js';

// Utilities
import InputManager from './utils/InputManager.js';
import { Grid, PathFinder } from './utils/pathfinding.js';

// Loaders
import ModelLoader from './loaders/ModelLoader.js';

class Game {
  constructor() {
    console.log('Game constructor started');
    
    // Create core game objects
    this.gameState = new GameState();
    this.saveSystem = new SaveSystem();
    this.sceneManager = new SceneManager();
    this.entityManager = new EntityManager(this.gameState);
    this.modelLoader = new ModelLoader();
    
    // Initialize component managers
    this.initializeComponentManagers();
    
    // Create empty systems object - systems will be created but not initialized yet
    this.systems = {};
    
    // Create systems (without initializing them)
    this.createSystems();
    
    // Create main game scene
    this.createMainScene();
    
    // Initialize input manager
    this.inputManager = new InputManager(this.entityManager, this.sceneManager, this.systems);
    
    // Initialize game loop
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this)
    );
    
    console.log('Game constructor completed');
  }

  initializeComponentManagers() {
    console.log('Initializing component managers');
    const positionManager = new PositionComponent();
    const healthManager = new HealthComponent();
    const renderManager = new RenderComponent();
    const factionManager = new FactionComponent();
    
    this.entityManager.registerComponentManager('position', positionManager);
    this.entityManager.registerComponentManager('health', healthManager);
    this.entityManager.registerComponentManager('render', renderManager);
    this.entityManager.registerComponentManager('faction', factionManager);
  }

  createSystems() {
    console.log('Creating systems (not initializing yet)');
    // Create systems but don't initialize them
    this.systems.render = new RenderSystem(this.entityManager, this.sceneManager, this.modelLoader);
    this.systems.movement = new MovementSystem(this.entityManager);
    this.systems.combat = new CombatSystem(this.entityManager);
    this.systems.ai = new AISystem(this.entityManager, this.systems.combat, this.systems.movement);
    this.systems.spawn = new SpawnSystem(this.entityManager);
  }

  // This is now a separate method called after the main scene is created and set as active
  initializeSystems() {
    console.log('Initializing systems with deferred initialization');
    
    // Verify that the scene is active before initializing systems
    const activeScene = this.sceneManager.getActiveScene();
    if (!activeScene) {
      console.error('No active scene available for systems initialization');
      return false;
    }
    
    // Now initialize systems that depend on the scene
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
    
    // Explicitly set the active scene and verify success
    const success = this.sceneManager.setActiveScene('main');
    console.log('Set active scene result:', success);
    
    // Verify active scene was set correctly
    const activeScene = this.sceneManager.getActiveScene();
    if (!activeScene) {
      console.error('Failed to set active scene in createMainScene');
    } else {
      console.log('Active scene set successfully');
    }
    
    // Set camera bounds for a large world
    this.sceneManager.setCameraBounds(-100, 100, -100, 100);
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Add a much larger ground plane for a Starcraft-like map
    const groundSize = 200; // 200x200 units
    const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a7c5f, // Green-ish color for ground
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be flat
    ground.position.y = -0.1; // Slightly below origin to avoid z-fighting
    scene.add(ground);
    
    // Add grid lines to visualize the map (optional)
    const gridHelper = new THREE.GridHelper(groundSize, 20);
    gridHelper.position.y = 0.01; // Slightly above ground
    scene.add(gridHelper);
    
    // Add some terrain features to make the world more interesting
    this.addTerrainFeatures(scene);
    
    // Create test entities
    this.createTestEntities();
    
    // Create enemy spawn points and initial wave
    this.createEnemySpawnPoints();
    
    console.log('Main scene creation completed');
  }

  addTerrainFeatures(scene) {
    console.log('Adding terrain features');
    
    // Add some hills
    for (let i = 0; i < 10; i++) {
      const hillSize = 5 + Math.random() * 10;
      const hillHeight = 2 + Math.random() * 3;
      
      const hillGeometry = new THREE.ConeGeometry(hillSize, hillHeight, 8);
      const hillMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x6b8e4e,
        roughness: 0.9
      });
      
      const hill = new THREE.Mesh(hillGeometry, hillMaterial);
      
      // Position randomly on the map
      hill.position.x = (Math.random() - 0.5) * 180;
      hill.position.y = 0; // At ground level
      hill.position.z = (Math.random() - 0.5) * 180;
      
      scene.add(hill);
    }
    
    // Add some rock formations
    for (let i = 0; i < 15; i++) {
      const rockSize = 2 + Math.random() * 4;
      
      const rockGeometry = new THREE.DodecahedronGeometry(rockSize, 0);
      const rockMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x7b7b7b,
        roughness: 0.7
      });
      
      const rock = new THREE.Mesh(rockGeometry, rockMaterial);
      
      // Position randomly on the map
      rock.position.x = (Math.random() - 0.5) * 180;
      rock.position.y = rockSize / 2; // Half height above ground
      rock.position.z = (Math.random() - 0.5) * 180;
      
      // Random rotation
      rock.rotation.y = Math.random() * Math.PI * 2;
      
      scene.add(rock);
    }
  }

  createTestEntities() {
    console.log('Creating test entities');
    
    // Create multiple test units spread across the map
    for (let i = 0; i < 10; i++) {
      const unitEntity = this.entityManager.createEntity();
      const posX = (Math.random() - 0.5) * 100; // Random position within ±50 units
      const posZ = (Math.random() - 0.5) * 100;
      
      this.entityManager.addComponent(unitEntity, 'position', { 
        x: posX, 
        y: 0, 
        z: posZ,
        rotation: Math.random() * Math.PI * 2 // Random rotation
      });
      this.entityManager.addComponent(unitEntity, 'health', { maxHealth: 100 });
      this.entityManager.addComponent(unitEntity, 'render', {
        meshId: 'unit',
        scale: { x: 1, y: 1, z: 1 },
        color: 0x0000ff
      });
      this.entityManager.addComponent(unitEntity, 'faction', {
        faction: 'player',
        unitType: 'assault',
        attackType: 'ranged',
        damageType: 'normal'
      });
    }
    
    // Create a few test buildings
    for (let i = 0; i < 3; i++) {
      const buildingEntity = this.entityManager.createEntity();
      const posX = (Math.random() - 0.5) * 80; // Position within a slightly smaller area
      const posZ = (Math.random() - 0.5) * 80;
      
      this.entityManager.addComponent(buildingEntity, 'position', { 
        x: posX, 
        y: 0, 
        z: posZ,
        rotation: Math.random() * Math.PI * 2 
      });
      this.entityManager.addComponent(buildingEntity, 'health', { maxHealth: 500 });
      this.entityManager.addComponent(buildingEntity, 'render', {
        meshId: 'building',
        scale: { x: 2, y: 2, z: 2 },
        color: 0xff0000
      });
      this.entityManager.addComponent(buildingEntity, 'faction', {
        faction: 'player',
        unitType: 'building',
        attackType: 'none',
        damageType: 'none'
      });
    }
  }

  createEnemySpawnPoints() {
    console.log('Creating enemy spawn points');
    
    // Create spawn points at the edges of the map
    const spawnPoints = [];
    
    // North edge
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: 0, y: 0, z: -90 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: 50, y: 0, z: -90 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: -50, y: 0, z: -90 }));
    
    // South edge
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: 0, y: 0, z: 90 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: 50, y: 0, z: 90 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: -50, y: 0, z: 90 }));
    
    // East edge
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: 90, y: 0, z: 0 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: 90, y: 0, z: 50 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: 90, y: 0, z: -50 }));
    
    // West edge
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: -90, y: 0, z: 0 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: -90, y: 0, z: 50 }));
    spawnPoints.push(this.systems.spawn.createSpawnPoint({ x: -90, y: 0, z: -50 }));
    
    // Create initial wave
    this.systems.spawn.createWave({
      spawnPointIds: spawnPoints,
      enemyTypes: ['lightInfantry', 'heavyInfantry'],
      totalEnemies: 10,
      spawnInterval: 3
    });
    
    // Create a more difficult second wave
    this.systems.spawn.createWave({
      spawnPointIds: spawnPoints,
      enemyTypes: ['lightInfantry', 'heavyInfantry', 'sniperUnit', 'supportUnit'],
      totalEnemies: 15,
      spawnInterval: 2
    });
    
    // Create a final wave with elite units
    this.systems.spawn.createWave({
      spawnPointIds: spawnPoints,
      enemyTypes: ['heavyInfantry', 'sniperUnit', 'supportUnit', 'specialistUnit', 'eliteUnit'],
      totalEnemies: 20,
      spawnInterval: 2
    });
  }

  update(deltaTime) {
    // Update game state
    this.gameState.update(deltaTime);
    
    // Update all systems with proper error handling
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
  }

  render(deltaTime) {
    // Check if SceneManager exists
    if (!this.sceneManager) {
      console.error('SceneManager is null in render method');
      return;
    }
    
    try {
      // Render the current scene, passing deltaTime for camera updates
      this.sceneManager.render(deltaTime);
    } catch (error) {
      console.error('Error in render method:', error);
    }
  }

  start() {
    console.log('Starting game');
    
    // Initialize systems after everything else is ready
    const systemsInitialized = this.initializeSystems();
    if (!systemsInitialized) {
      console.error('Failed to initialize systems. Game may not function correctly.');
    }
    
    // Start the game loop
    this.gameLoop.start();
    console.log('Game loop started');
  }

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

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM content loaded, creating game instance');
  const game = new Game();
  game.start();
  
  // Expose game instance for debugging
  window.game = game;
  console.log('Game instance exposed as window.game for debugging');
});
