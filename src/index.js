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

// Systems
import RenderSystem from './entities/systems/RenderSystem.js';
import MovementSystem from './entities/systems/MovementSystem.js';

// Utilities
import InputManager from './utils/InputManager.js';
import { Grid, PathFinder } from './utils/pathfinding.js';

// Loaders
import ModelLoader from './loaders/ModelLoader.js';

class Game {
  constructor() {
    this.gameState = new GameState();
    this.saveSystem = new SaveSystem();
    this.sceneManager = new SceneManager();
    this.entityManager = new EntityManager(this.gameState);
    this.modelLoader = new ModelLoader();
    
    // Initialize component managers
    this.initializeComponentManagers();
    
    // Initialize systems
    this.initializeSystems();
    
    // Initialize input manager
    this.inputManager = new InputManager(this.entityManager, this.sceneManager, this.systems);
    
    // Create main game scene
    this.createMainScene();
    
    // Initialize game loop
    this.gameLoop = new GameLoop(
      this.update.bind(this),
      this.render.bind(this)
    );
  }

  initializeComponentManagers() {
    const positionManager = new PositionComponent();
    const healthManager = new HealthComponent();
    const renderManager = new RenderComponent();
    
    this.entityManager.registerComponentManager('position', positionManager);
    this.entityManager.registerComponentManager('health', healthManager);
    this.entityManager.registerComponentManager('render', renderManager);
  }

  initializeSystems() {
    this.systems = {};
    
    // Create systems
    this.systems.render = new RenderSystem(this.entityManager, this.sceneManager, this.modelLoader);
    this.systems.movement = new MovementSystem(this.entityManager);
    
    // Initialize systems
    for (const system of Object.values(this.systems)) {
      if (typeof system.initialize === 'function') {
        system.initialize();
      }
    }
  }

  createMainScene() {
    // Create main game scene
    const { scene, camera } = this.sceneManager.createScene('main');
    
    // Set active scene
    this.sceneManager.setActiveScene('main');
    
    // Add lighting
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);
    
    // Add ground plane
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    
    // Create some test entities
    this.createTestEntities();
  }

  createTestEntities() {
    // Create a test unit
    const unitEntity = this.entityManager.createEntity();
    this.entityManager.addComponent(unitEntity, 'position', { x: 0, y: 0, z: 0 });
    this.entityManager.addComponent(unitEntity, 'health', { maxHealth: 100 });
    this.entityManager.addComponent(unitEntity, 'render', {
      meshId: 'unit',
      scale: { x: 1, y: 1, z: 1 },
      color: 0x0000ff
    });
    
    // Create a test building
    const buildingEntity = this.entityManager.createEntity();
    this.entityManager.addComponent(buildingEntity, 'position', { x: 5, y: 0, z: 5 });
    this.entityManager.addComponent(buildingEntity, 'health', { maxHealth: 500 });
    this.entityManager.addComponent(buildingEntity, 'render', {
      meshId: 'building',
      scale: { x: 2, y: 2, z: 2 },
      color: 0xff0000
    });
  }

  update(deltaTime) {
    // Update game state
    this.gameState.update(deltaTime);
    
    // Update all systems
    for (const system of Object.values(this.systems)) {
      if (typeof system.update === 'function') {
        system.update(deltaTime);
      }
    }
  }

  render(deltaTime) {
    // Render the current scene
    this.sceneManager.render();
  }

  start() {
    // Start the game loop
    this.gameLoop.start();
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
  const game = new Game();
  game.start();
  
  // Expose game instance for debugging
  window.game = game;
});