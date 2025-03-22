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

});