import GameState from '../../src/core/GameState.js';
import EntityManager from '../../src/core/EntityManager.js';
import SpawnSystem from '../../src/entities/systems/SpawnSystem.js';
import AISystem from '../../src/entities/systems/AISystem.js';
import CombatSystem from '../../src/entities/systems/CombatSystem.js';
import MovementSystem from '../../src/entities/systems/MovementSystem.js';
import PositionComponent from '../../src/entities/components/PositionComponent.js';
import HealthComponent from '../../src/entities/components/HealthComponent.js';
import FactionComponent from '../../src/entities/components/FactionComponent.js';
import RenderComponent from '../../src/entities/components/RenderComponent.js';
import ResourceComponent from '../../src/entities/components/ResourceComponent.js';

describe('Spawn System and Gameplay', () => {
  let gameState;
  let entityManager;
  let spawnSystem;
  let aiSystem;
  let combatSystem;
  let movementSystem;

  beforeEach(() => {
    // Mock Math.random to be deterministic
    jest.spyOn(global.Math, 'random').mockImplementation(() => 0.5);
    
    // Initialize core systems
    gameState = new GameState();
    entityManager = new EntityManager(gameState);
    
    // Initialize component managers
    const positionManager = new PositionComponent();
    const healthManager = new HealthComponent();
    const factionManager = new FactionComponent();
    const renderManager = new RenderComponent();
    const resourceManager = new ResourceComponent();
    
    // Register component managers
    entityManager.registerComponentManager('position', positionManager);
    entityManager.registerComponentManager('health', healthManager);
    entityManager.registerComponentManager('faction', factionManager);
    entityManager.registerComponentManager('render', renderManager);
    entityManager.registerComponentManager('resource', resourceManager);
    
    // Initialize systems
    combatSystem = new CombatSystem(entityManager);
    movementSystem = new MovementSystem(entityManager);
    aiSystem = new AISystem(entityManager, combatSystem, movementSystem);
    spawnSystem = new SpawnSystem(entityManager);
    
    // Mock createEntity to use gameState
    entityManager.createEntity = jest.fn().mockImplementation(() => {
      const entityId = gameState.nextEntityId++;
      gameState.entities.set(entityId, {});
      return entityId;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Wave spawning and progression', () => {
    test('should spawn waves of enemies at specified intervals', () => {
      // Create spawn points
      const spawnPointId = spawnSystem.createSpawnPoint({ x: 0, y: 0, z: 0 });
      
      // Create a wave
      spawnSystem.createWave({
        spawnPointIds: [spawnPointId],
        enemyTypes: ['lightInfantry'],
        totalEnemies: 5,
        spawnInterval: 1
      });
      
      // Spy on spawnEnemy
      const spawnSpy = jest.spyOn(spawnSystem, 'spawnEnemy').mockImplementation(() => {
        const entityId = gameState.nextEntityId++;
        gameState.entities.set(entityId, {});
        return entityId;
      });
      
      // Update to spawn first enemy
      spawnSystem.update(1.0, aiSystem);
      expect(spawnSpy).toHaveBeenCalledTimes(1);
      
      // Update to spawn second enemy
      spawnSystem.update(1.0, aiSystem);
      expect(spawnSpy).toHaveBeenCalledTimes(2);
      
      // Fast forward to spawn all remaining enemies
      for (let i = 0; i < 3; i++) {
        spawnSystem.update(1.0, aiSystem);
      }
      
      // All 5 enemies should be spawned
      expect(spawnSpy).toHaveBeenCalledTimes(5);
      
      // Wave should be marked as completed
      const wave = spawnSystem.activeWaves.get(1);
      expect(wave.completed).toBe(true);
    });
  });

  describe('Enemy diversity and balance', () => {
    test('should spawn different enemy types with appropriate attributes', () => {
      // Create spawn point
      const spawnPointId = spawnSystem.createSpawnPoint({ x: 0, y: 0, z: 0 });
      
      // Create wave with multiple enemy types
      spawnSystem.createWave({
        spawnPointIds: [spawnPointId],
        enemyTypes: ['lightInfantry', 'heavyInfantry', 'supportUnit'],
        totalEnemies: 3,
        spawnInterval: 0.1,
        // Explicitly set distribution to be deterministic
        enemyTypeDistribution: {
          lightInfantry: 0.33,
          heavyInfantry: 0.33,
          supportUnit: 0.34
        }
      });
      
      // Control random selection to get each enemy type
      const enemyTypes = ['lightInfantry', 'heavyInfantry', 'supportUnit'];
      let typeIndex = 0;
      
      jest.spyOn(global.Math, 'random').mockImplementation(() => {
        // Return values that will select each type in order
        if (typeIndex >= enemyTypes.length) {
          typeIndex = 0;
        }
        return typeIndex++ / enemyTypes.length;
      });
      
      // Mock addComponent to track component data
      const addedComponents = {};
      entityManager.addComponent = jest.fn().mockImplementation((entityId, type, data) => {
        if (!addedComponents[entityId]) {
          addedComponents[entityId] = {};
        }
        addedComponents[entityId][type] = data;
        return true;
      });
      
      // Spawn one of each enemy type
      for (let i = 0; i < 3; i++) {
        spawnSystem.update(1.0, aiSystem);
      }
      
      // Get all created entities
      const entityIds = Object.keys(addedComponents).map(Number);
      expect(entityIds.length).toBe(3);
      
      // Check if we have all the expected templates
      expect(spawnSystem.enemyTemplates).toHaveProperty('lightInfantry');
      expect(spawnSystem.enemyTemplates).toHaveProperty('heavyInfantry');
      expect(spawnSystem.enemyTemplates).toHaveProperty('supportUnit');
      
      // Verify light infantry properties from the template
      expect(spawnSystem.enemyTemplates.lightInfantry.components.health.maxHealth).toBeLessThan(100);
      expect(spawnSystem.enemyTemplates.lightInfantry.components.faction.unitType).toBe('light');
      expect(spawnSystem.enemyTemplates.lightInfantry.speed).toBeGreaterThan(5);
      
      // Verify heavy infantry properties from the template
      expect(spawnSystem.enemyTemplates.heavyInfantry.components.health.maxHealth).toBeGreaterThan(100);
      expect(spawnSystem.enemyTemplates.heavyInfantry.components.health.armor).toBeGreaterThan(5);
      expect(spawnSystem.enemyTemplates.heavyInfantry.components.faction.unitType).toBe('heavy');
      expect(spawnSystem.enemyTemplates.heavyInfantry.speed).toBeLessThan(5);
      
      // Verify support unit properties from the template
      expect(spawnSystem.enemyTemplates.supportUnit.components.health.regeneration).toBeGreaterThan(0);
      expect(spawnSystem.enemyTemplates.supportUnit.components.faction.unitType).toBe('support');
    });
  });
});