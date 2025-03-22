import GameState from '../../src/core/GameState.js';
import EntityManager from '../../src/core/EntityManager.js';
import PositionComponent from '../../src/entities/components/PositionComponent.js';
import HealthComponent from '../../src/entities/components/HealthComponent.js';
import FactionComponent from '../../src/entities/components/FactionComponent.js';
import RenderComponent from '../../src/entities/components/RenderComponent.js';
import MovementSystem from '../../src/entities/systems/MovementSystem.js';
import CombatSystem from '../../src/entities/systems/CombatSystem.js';
import AISystem from '../../src/entities/systems/AISystem.js';
import SpawnSystem from '../../src/entities/systems/SpawnSystem.js';
import RenderSystem from '../../src/entities/systems/RenderSystem.js';

describe('Full Game Integration', () => {
  let gameState;
  let entityManager;
  let systems;
  
  beforeEach(() => {
    // Initialize core systems
    gameState = new GameState();
    entityManager = new EntityManager(gameState);
    
    // Initialize component managers
    const positionManager = new PositionComponent();
    const healthManager = new HealthComponent();
    const factionManager = new FactionComponent();
    const renderManager = new RenderComponent();
    
    // Register component managers
    entityManager.registerComponentManager('position', positionManager);
    entityManager.registerComponentManager('health', healthManager);
    entityManager.registerComponentManager('faction', factionManager);
    entityManager.registerComponentManager('render', renderManager);
    
    // Mock SceneManager
    const mockSceneManager = {
      getActiveScene: jest.fn().mockReturnValue({
        scene: { children: [] },
        camera: {}
      })
    };
    
    // Mock ModelLoader
    const mockModelLoader = {
      loadModel: jest.fn(),
      loadTexture: jest.fn(),
      createPlaceholderModel: jest.fn()
    };
    
    // Initialize systems
    systems = {
      movement: new MovementSystem(entityManager),
      combat: new CombatSystem(entityManager),
      ai: new AISystem(entityManager, null, null), // Will set references below
      spawn: new SpawnSystem(entityManager),
      render: new RenderSystem(entityManager, mockSceneManager, mockModelLoader)
    };
    
    // Set system references
    systems.ai.combatSystem = systems.combat;
    systems.ai.movementSystem = systems.movement;
    
    // Mock initialize methods
    Object.values(systems).forEach(system => {
      if (typeof system.initialize === 'function') {
        jest.spyOn(system, 'initialize').mockImplementation(() => {});
      }
    });
  });

  describe('Combat scenario', () => {
    test('should FAIL: establish a balanced combat encounter', () => {
      // This test is intended to fail to guide development
      // We need balancing for combat encounters
      
      // Create a player squad
      const playerIds = [];
      for (let i = 0; i < 5; i++) {
        const entityId = entityManager.createEntity();
        entityManager.addComponent(entityId, 'position', { x: i * 2, y: 0, z: 0 });
        entityManager.addComponent(entityId, 'health', { maxHealth: 100, currentHealth: 100 });
        entityManager.addComponent(entityId, 'faction', { 
          faction: 'player',
          unitType: 'assault',
          attackType: 'ranged',
          damageType: 'normal'
        });
        entityManager.addComponent(entityId, 'render', { 
          meshId: 'unit',
          scale: { x: 1, y: 1, z: 1 },
          color: 0x0000ff
        });
        
        gameState.entities.set(entityId, { 
          position: true, 
          health: true, 
          faction: true,
          render: true
        });
        
        playerIds.push(entityId);
      }
      
      // Create balanced enemy squad
      const createEnemySquad = () => {
        const enemyIds = [];
        
        // Create a balanced squad (2 light, 2 heavy, 1 support)
        const enemyTypes = [
          'lightInfantry', 'lightInfantry',
          'heavyInfantry', 'heavyInfantry',
          'supportUnit'
        ];
        
        for (let i = 0; i < enemyTypes.length; i++) {
          const entityId = systems.spawn.spawnEnemy(
            enemyTypes[i],
            { x: 20 + i * 2, y: 0, z: 0 },
            systems.ai
          );
          
          if (entityId) enemyIds.push(entityId);
        }
        
        return enemyIds;
      };
      
      // Create enemy squad
      const enemyIds = createEnemySquad();
      expect(enemyIds.length).toBe(5);
      
      // Run a simulated battle
      const simulateBattle = () => {
        // Start attacks from both sides
        for (const playerId of playerIds) {
          // Find closest enemy
          let closestEnemyId = null;
          let minDistance = Infinity;
          
          const playerPos = entityManager.getComponent(playerId, 'position');
          
          for (const enemyId of enemyIds) {
            if (!gameState.entities.has(enemyId)) continue;
            
            const enemyPos = entityManager.getComponent(enemyId, 'position');
            const dx = enemyPos.x - playerPos.x;
            const dz = enemyPos.z - playerPos.z;
            const distance = Math.sqrt(dx * dx + dz * dz);
            
            if (distance < minDistance) {
              minDistance = distance;
              closestEnemyId = enemyId;
            }
          }
          
          if (closestEnemyId) {
            systems.combat.startAttack(playerId, closestEnemyId);
          }
        }
        
        // Simulate for 60 seconds
        for (let i = 0; i < 60; i++) {
          systems.movement.update(1.0);
          systems.combat.update(1.0);
          systems.ai.update(1.0);
          
          // Count remaining units
          const remainingPlayers = playerIds.filter(id => {
            const health = entityManager.getComponent(id, 'health');
            return health && health.currentHealth > 0;
          });
          
          const remainingEnemies = enemyIds.filter(id => {
            const health = entityManager.getComponent(id, 'health');
            return health && health.currentHealth > 0;
          });
          
          // If either side is wiped out, return the result
          if (remainingPlayers.length === 0) {
            return { winner: 'enemy', timeToResolve: i };
          }
          
          if (remainingEnemies.length === 0) {
            return { winner: 'player', timeToResolve: i };
          }
        }
        
        // Time limit reached - count remaining units to determine winner
        const remainingPlayers = playerIds.filter(id => {
          const health = entityManager.getComponent(id, 'health');
          return health && health.currentHealth > 0;
        });
        
        const remainingEnemies = enemyIds.filter(id => {
          const health = entityManager.getComponent(id, 'health');
          return health && health.currentHealth > 0;
        });
        
        if (remainingPlayers.length > remainingEnemies.length) {
          return { winner: 'player', timeToResolve: 60 };
        } else {
          return { winner: 'enemy', timeToResolve: 60 };
        }
      };
      
      // Run multiple simulations to test balance
      const simulationResults = [];
      
      // Mock Math.random to control critical hits
      const originalRandom = Math.random;
      let randomIndex = 0;
      const randomValues = [0.1, 0.3, 0.5, 0.7, 0.9]; // Mix of values
      
      Math.random = jest.fn().mockImplementation(() => {
        const value = randomValues[randomIndex];
        randomIndex = (randomIndex + 1) % randomValues.length;
        return value;
      });
      
      // Run multiple simulations
      for (let i = 0; i < 5; i++) {
        // Reset health for all units
        for (const entityId of [...playerIds, ...enemyIds]) {
          const health = entityManager.getComponent(entityId, 'health');
          if (health) {
            health.currentHealth = health.maxHealth;
          }
        }
        
        simulationResults.push(simulateBattle());
      }
      
      // Restore Math.random
      Math.random = originalRandom;
      
      // Count wins for each side
      const playerWins = simulationResults.filter(r => r.winner === 'player').length;
      const enemyWins = simulationResults.filter(r => r.winner === 'enemy').length;
      
      // For balanced gameplay, both sides should have a chance to win
      // This will fail without proper balancing
      expect(playerWins).toBeGreaterThan(0);
      expect(enemyWins).toBeGreaterThan(0);
      
      // Battle should not resolve too quickly or too slowly
      const avgTimeToResolve = simulationResults.reduce((sum, r) => sum + r.timeToResolve, 0) / simulationResults.length;
      expect(avgTimeToResolve).toBeGreaterThan(15); // Not too quick
      expect(avgTimeToResolve).toBeLessThan(45);    // Not too slow
    });
  });

  describe('Save and load', () => {
    test('should correctly save and load complete game state including all systems', () => {
      // Create player units
      for (let i = 0; i < 3; i++) {
        const entityId = entityManager.createEntity();
        entityManager.addComponent(entityId, 'position', { x: i * 5, y: 0, z: 0 });
        entityManager.addComponent(entityId, 'health', { maxHealth: 100, currentHealth: 80 });
        entityManager.addComponent(entityId, 'faction', { faction: 'player' });
        gameState.entities.set(entityId, { position: true, health: true, faction: true });
        
        // Add some units to movement system
        systems.movement.moveEntity(entityId, { x: i * 10, y: 0, z: 10 });
      }
      
      // Create enemy units
      for (let i = 0; i < 2; i++) {
        const entityId = entityManager.createEntity();
        entityManager.addComponent(entityId, 'position', { x: -i * 5, y: 0, z: 0 });
        entityManager.addComponent(entityId, 'health', { maxHealth: 100, currentHealth: 90 });
        entityManager.addComponent(entityId, 'faction', { faction: 'enemy' });
        gameState.entities.set(entityId, { position: true, health: true, faction: true });
        
        // Register with AI
        systems.ai.registerEntity(entityId);
      }
      
      // Set up attacking entity
      const attackerId = Array.from(gameState.entities.keys())[0];
      const targetId = Array.from(gameState.entities.keys())[3]; // An enemy
      systems.combat.startAttack(attackerId, targetId);
      
      // Create spawn points and waves
      const spawnPointId = systems.spawn.createSpawnPoint({ x: 50, y: 0, z: 50 });
      systems.spawn.createWave({
        spawnPointIds: [spawnPointId],
        enemyTypes: ['lightInfantry'],
        totalEnemies: 5,
        spawnInterval: 1
      });
      
      // Set game time and resources
      gameState.gameTime = 120; // 2 minutes
      gameState.playerResources = { minerals: 500, gas: 200 };
      
      // Serialize game state
      const serializedState = gameState.serialize();
      
      // Create a new game state and deserialize
      const newGameState = new GameState();
      newGameState.deserialize(serializedState);
      
      // Create new entity manager with new game state
      const newEntityManager = new EntityManager(newGameState);
      
      // Initialize new component managers
      const newPositionManager = new PositionComponent();
      const newHealthManager = new HealthComponent();
      const newFactionManager = new FactionComponent();
      
      // Register new component managers
      newEntityManager.registerComponentManager('position', newPositionManager);
      newEntityManager.registerComponentManager('health', newHealthManager);
      newEntityManager.registerComponentManager('faction', newFactionManager);
      
      // Initialize new systems
      const newSystems = {
        movement: new MovementSystem(newEntityManager),
        combat: new CombatSystem(newEntityManager),
        ai: new AISystem(newEntityManager, null, null)
      };
      
      // Set system references
      newSystems.ai.combatSystem = newSystems.combat;
      newSystems.ai.movementSystem = newSystems.movement;
      
      // Verify entities were deserialized correctly
      expect(newGameState.entities.size).toBe(gameState.entities.size);
      
      // Deserialize component data (not part of gameState serialization)
      newPositionManager.setAllComponents(
        entityManager.componentManagers.get('position').getAllComponents()
      );
      
      newHealthManager.setAllComponents(
        entityManager.componentManagers.get('health').getAllComponents()
      );
      
      newFactionManager.setAllComponents(
        entityManager.componentManagers.get('faction').getAllComponents()
      );
      
      // Verify systems can be deserialized
      // Movement system
      newSystems.movement.deserialize(systems.movement.serialize());
      expect(newSystems.movement.movingEntities.size).toBe(systems.movement.movingEntities.size);
      
      // Combat system
      newSystems.combat.deserialize(systems.combat.serialize());
      expect(newSystems.combat.attackingEntities.size).toBe(systems.combat.attackingEntities.size);
      
      // AI system
      newSystems.ai.deserialize(systems.ai.serialize());
      expect(newSystems.ai.aiControlledEntities.size).toBe(systems.ai.aiControlledEntities.size);
      
      // Verify game state data
      expect(newGameState.gameTime).toBe(gameState.gameTime);
      expect(newGameState.playerResources).toEqual(gameState.playerResources);
    });
  });

  describe('Game loop and performance', () => {
    test('should FAIL: maintain performance with many entities', () => {
      // This test is intended to fail to guide development
      // We need optimizations for large entity counts
      
      // Create GameLoop mock to measure update time
      const mockGameLoop = {
        updateCallback: null,
        start: function() {
          this.running = true;
        },
        setUpdateCallback: function(callback) {
          this.updateCallback = callback;
        },
        performUpdate: function(deltaTime) {
          if (this.updateCallback) {
            return this.updateCallback(deltaTime);
          }
        }
      };
      
      // Create function to measure update time
      const measureUpdateTime = (entityCount) => {
        // Create specified number of entities
        const entityIds = [];
        
        for (let i = 0; i < entityCount; i++) {
          const entityId = entityManager.createEntity();
          entityManager.addComponent(entityId, 'position', { 
            x: Math.random() * 100 - 50,
            y: 0,
            z: Math.random() * 100 - 50
          });
          entityManager.addComponent(entityId, 'health', { maxHealth: 100, currentHealth: 100 });
          entityManager.addComponent(entityId, 'faction', { 
            faction: i % 2 === 0 ? 'player' : 'enemy',
            unitType: 'assault'
          });
          
          gameState.entities.set(entityId, { position: true, health: true, faction: true });
          
          // Every 10th entity is moving
          if (i % 10 === 0) {
            systems.movement.moveEntity(entityId, { 
              x: Math.random() * 100 - 50,
              y: 0,
              z: Math.random() * 100 - 50
            });
          }
          
          // Every 20th enemy entity is attacking
          if (i % 20 === 0 && i % 2 === 1) {
            const targetId = entityIds.find(id => {
              const faction = entityManager.getComponent(id, 'faction');
              return faction && faction.faction === 'player';
            });
            
            if (targetId) {
              systems.combat.startAttack(entityId, targetId);
            }
          }
          
          // Every enemy entity is AI controlled
          if (i % 2 === 1) {
            systems.ai.registerEntity(entityId);
          }
          
          entityIds.push(entityId);
        }
        
        // Create update function that updates all systems
        const updateFunction = (deltaTime) => {
          systems.movement.update(deltaTime);
          systems.combat.update(deltaTime);
          systems.ai.update(deltaTime);
          systems.spawn.update(deltaTime);
          // Skip render system for performance test
        };
        
        // Set as game loop update callback
        mockGameLoop.setUpdateCallback(updateFunction);
        
        // Measure update time
        const startTime = performance.now();
        mockGameLoop.performUpdate(0.016); // ~60fps
        const endTime = performance.now();
        
        return endTime - startTime;
      };
      
      // Measure update time with different entity counts
      const smallCount = 100;
      const mediumCount = 500;
      const largeCount = 1000;
      
      const smallTime = measureUpdateTime(smallCount);
      const mediumTime = measureUpdateTime(mediumCount);
      const largeTime = measureUpdateTime(largeCount);
      
      // Expect roughly linear scaling (not quadratic)
      const smallToMediumRatio = mediumTime / smallTime;
      const expectedMediumRatio = mediumCount / smallCount;
      
      const mediumToLargeRatio = largeTime / mediumTime;
      const expectedLargeRatio = largeCount / mediumCount;
      
      // Should be less than 1.5x the expected ratio to account for some overhead
      // This will fail without spatial partitioning and other optimizations
      expect(smallToMediumRatio).toBeLessThan(expectedMediumRatio * 1.5);
      expect(mediumToLargeRatio).toBeLessThan(expectedLargeRatio * 1.5);
      
      // Large update should still be fast enough for 60fps (under ~16ms)
      expect(largeTime).toBeLessThan(16);
    });
  });
});