import GameState from '../../src/core/GameState.js';
import EntityManager from '../../src/core/EntityManager.js';
import PositionComponent from '../../src/entities/components/PositionComponent.js';
import HealthComponent from '../../src/entities/components/HealthComponent.js';
import RenderComponent from '../../src/entities/components/RenderComponent.js';
import MovementSystem from '../../src/entities/systems/MovementSystem.js';

describe('Entity-Component Integration', () => {
  let gameState;
  let entityManager;
  let positionManager;
  let healthManager;
  let renderManager;
  let movementSystem;

  beforeEach(() => {
    // Initialize core systems
    gameState = new GameState();
    entityManager = new EntityManager(gameState);
    
    // Initialize component managers
    positionManager = new PositionComponent();
    healthManager = new HealthComponent();
    renderManager = new RenderComponent();
    
    // Register component managers
    entityManager.registerComponentManager('position', positionManager);
    entityManager.registerComponentManager('health', healthManager);
    entityManager.registerComponentManager('render', renderManager);
    
    // Initialize systems
    movementSystem = new MovementSystem(entityManager);
  });

  test('should create entity with multiple components', () => {
    // Create entity
    const entityId = entityManager.createEntity();
    
    // Add components
    entityManager.addComponent(entityId, 'position', { x: 10, y: 0, z: 20 });
    entityManager.addComponent(entityId, 'health', { maxHealth: 200, currentHealth: 150 });
    entityManager.addComponent(entityId, 'render', { 
      meshId: 'unit',
      scale: { x: 2, y: 2, z: 2 },
      color: 0xff0000
    });
    
    // Verify entity and components exist
    expect(gameState.entities.has(entityId)).toBe(true);
    expect(entityManager.hasComponent(entityId, 'position')).toBe(true);
    expect(entityManager.hasComponent(entityId, 'health')).toBe(true);
    expect(entityManager.hasComponent(entityId, 'render')).toBe(true);
    
    // Verify component data
    const position = entityManager.getComponent(entityId, 'position');
    expect(position).toEqual({ x: 10, y: 0, z: 20, rotation: 0 });
    
    const health = entityManager.getComponent(entityId, 'health');
    expect(health.maxHealth).toBe(200);
    expect(health.currentHealth).toBe(150);
    
    const render = entityManager.getComponent(entityId, 'render');
    expect(render.meshId).toBe('unit');
    expect(render.color).toBe(0xff0000);
  });

  test('should integrate movement system with entity components', () => {
    // Create entity
    const entityId = entityManager.createEntity();
    
    // Add position component
    entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0 });
    
    // Move entity
    const destination = { x: 10, y: 0, z: 0 };
    const result = movementSystem.moveEntity(entityId, destination, 5);
    expect(result).toBe(true);
    
    // Verify entity is being tracked for movement
    expect(movementSystem.movingEntities.has(entityId)).toBe(true);
    
    // Update movement
    movementSystem.update(0.1); // 100ms
    
    // Verify position was updated
    const position = entityManager.getComponent(entityId, 'position');
    expect(position.x).toBeGreaterThan(0);
    expect(position.rotation).not.toBe(0);
  });

  test('should remove entity and all associated components', () => {
    // Create entity with components
    const entityId = entityManager.createEntity();
    entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0 });
    entityManager.addComponent(entityId, 'health', { maxHealth: 100 });
    entityManager.addComponent(entityId, 'render', { meshId: 'unit' });
    
    // Move entity to add it to movement system
    movementSystem.moveEntity(entityId, { x: 10, y: 0, z: 0 });
    
    // Remove entity
    const result = entityManager.removeEntity(entityId);
    expect(result).toBe(true);
    
    // Verify entity is removed
    expect(gameState.entities.has(entityId)).toBe(false);
    
    // Verify components are removed
    expect(entityManager.hasComponent(entityId, 'position')).toBe(false);
    expect(entityManager.hasComponent(entityId, 'health')).toBe(false);
    expect(entityManager.hasComponent(entityId, 'render')).toBe(false);
    
    // Verify entity is removed from movement system
    // This is important for integration testing - ensuring systems clean up properly
    movementSystem.update(0.1);
    expect(movementSystem.movingEntities.has(entityId)).toBe(false);
  });

  test('should handle serialization and deserialization of complete game state', () => {
    // Create entities
    const entityId1 = entityManager.createEntity();
    const entityId2 = entityManager.createEntity();
    
    // Add components to first entity
    entityManager.addComponent(entityId1, 'position', { x: 10, y: 0, z: 20 });
    entityManager.addComponent(entityId1, 'health', { maxHealth: 200, currentHealth: 150 });
    entityManager.addComponent(entityId1, 'render', { meshId: 'unit', color: 0xff0000 });
    
    // Add components to second entity
    entityManager.addComponent(entityId2, 'position', { x: -15, y: 0, z: 5 });
    entityManager.addComponent(entityId2, 'health', { maxHealth: 300, currentHealth: 300 });
    entityManager.addComponent(entityId2, 'render', { meshId: 'building', scale: { x: 2, y: 2, z: 2 } });
    
    // Move first entity
    movementSystem.moveEntity(entityId1, { x: 50, y: 0, z: 50 }, 10);
    
    // Update game state
    gameState.playerResources = { minerals: 500, gas: 200 };
    gameState.gameTime = 300; // 5 minutes
    
    // Serialize game state
    const serializedState = gameState.serialize();
    
    // Create new game state and managers
    const newGameState = new GameState();
    const newEntityManager = new EntityManager(newGameState);
    
    // Initialize new component managers
    const newPositionManager = new PositionComponent();
    const newHealthManager = new HealthComponent();
    const newRenderManager = new RenderComponent();
    
    // Register new component managers
    newEntityManager.registerComponentManager('position', newPositionManager);
    newEntityManager.registerComponentManager('health', newHealthManager);
    newEntityManager.registerComponentManager('render', newRenderManager);
    
    // Initialize new movement system
    const newMovementSystem = new MovementSystem(newEntityManager);
    
    // Deserialize game state
    newGameState.deserialize(serializedState);
    
    // Deserialize component data
    newPositionManager.setAllComponents(positionManager.getAllComponents());
    newHealthManager.setAllComponents(healthManager.getAllComponents());
    newRenderManager.setAllComponents(renderManager.getAllComponents());
    
    // Deserialize movement system
    newMovementSystem.deserialize(movementSystem.serialize());
    
    // Verify game state was transferred
    expect(newGameState.entities.size).toBe(2);
    expect(newGameState.playerResources).toEqual({ minerals: 500, gas: 200 });
    expect(newGameState.gameTime).toBe(300);
    
    // Verify entity components were transferred
    expect(newEntityManager.hasComponent(entityId1, 'position')).toBe(true);
    expect(newEntityManager.hasComponent(entityId1, 'health')).toBe(true);
    expect(newEntityManager.hasComponent(entityId1, 'render')).toBe(true);
    
    expect(newEntityManager.hasComponent(entityId2, 'position')).toBe(true);
    expect(newEntityManager.hasComponent(entityId2, 'health')).toBe(true);
    expect(newEntityManager.hasComponent(entityId2, 'render')).toBe(true);
    
    // Verify component data
    const position1 = newEntityManager.getComponent(entityId1, 'position');
    expect(position1).toEqual({ x: 10, y: 0, z: 20, rotation: 0 });
    
    const health1 = newEntityManager.getComponent(entityId1, 'health');
    expect(health1.maxHealth).toBe(200);
    expect(health1.currentHealth).toBe(150);
    
    const render1 = newEntityManager.getComponent(entityId1, 'render');
    expect(render1.meshId).toBe('unit');
    expect(render1.color).toBe(0xff0000);
    
    // Verify movement system data
    expect(newMovementSystem.movingEntities.has(entityId1)).toBe(true);
    const movementData = newMovementSystem.movingEntities.get(entityId1);
    expect(movementData.destination).toEqual({ x: 50, y: 0, z: 50 });
    expect(movementData.speed).toBe(10);
  });
});