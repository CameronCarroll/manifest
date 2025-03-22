import EntityManager from '../../../src/core/EntityManager.js';
import GameState from '../../../src/core/GameState.js';

// Mock component manager class for testing
class MockComponentManager {
  constructor() {
    this.components = new Map();
  }

  addComponent(entityId, data) {
    this.components.set(entityId, data);
  }

  removeComponent(entityId) {
    this.components.delete(entityId);
  }

  getComponent(entityId) {
    return this.components.get(entityId);
  }

  hasComponent(entityId) {
    return this.components.has(entityId);
  }
}

describe('EntityManager', () => {
  let entityManager;
  let gameState;
  let mockPositionManager;
  let mockHealthManager;

  beforeEach(() => {
    gameState = new GameState();
    entityManager = new EntityManager(gameState);
    
    // Setup mock component managers
    mockPositionManager = new MockComponentManager();
    mockHealthManager = new MockComponentManager();
    
    entityManager.registerComponentManager('position', mockPositionManager);
    entityManager.registerComponentManager('health', mockHealthManager);
  });

  describe('entity creation and removal', () => {
    test('should create a new entity with incrementing ID', () => {
      const entityId1 = entityManager.createEntity();
      const entityId2 = entityManager.createEntity();
      
      expect(entityId1).toBe(1);
      expect(entityId2).toBe(2);
      expect(gameState.entities.has(entityId1)).toBe(true);
      expect(gameState.entities.has(entityId2)).toBe(true);
      expect(gameState.nextEntityId).toBe(3);
    });

    test('should remove an entity and its components', () => {
      const entityId = entityManager.createEntity();
      entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(entityId, 'health', { current: 100, max: 100 });
      
      expect(entityManager.removeEntity(entityId)).toBe(true);
      expect(gameState.entities.has(entityId)).toBe(false);
      expect(mockPositionManager.hasComponent(entityId)).toBe(false);
      expect(mockHealthManager.hasComponent(entityId)).toBe(false);
    });

    test('should return false when removing non-existent entity', () => {
      expect(entityManager.removeEntity(999)).toBe(false);
    });
  });

  describe('component management', () => {
    test('should add component to an entity', () => {
      const entityId = entityManager.createEntity();
      const positionData = { x: 10, y: 5, z: 20 };
      
      expect(entityManager.addComponent(entityId, 'position', positionData)).toBe(true);
      expect(mockPositionManager.getComponent(entityId)).toEqual(positionData);
      expect(gameState.entities.get(entityId)).toEqual({ position: true });
    });

    test('should return false when adding component to non-existent entity', () => {
      expect(entityManager.addComponent(999, 'position', { x: 0, y: 0, z: 0 })).toBe(false);
    });

    test('should return false when adding component with non-registered manager', () => {
      const entityId = entityManager.createEntity();
      expect(entityManager.addComponent(entityId, 'nonExistentComponent', {})).toBe(false);
    });

    test('should remove component from an entity', () => {
      const entityId = entityManager.createEntity();
      entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0 });
      
      expect(entityManager.removeComponent(entityId, 'position')).toBe(true);
      expect(mockPositionManager.hasComponent(entityId)).toBe(false);
      expect(gameState.entities.get(entityId).position).toBeUndefined();
    });

    test('should return false when removing component from non-existent entity', () => {
      expect(entityManager.removeComponent(999, 'position')).toBe(false);
    });

    test('should return false when removing non-existent component', () => {
      const entityId = entityManager.createEntity();
      expect(entityManager.removeComponent(entityId, 'nonExistentComponent')).toBe(false);
    });

    test('should get component data', () => {
      const entityId = entityManager.createEntity();
      const positionData = { x: 10, y: 5, z: 20 };
      
      entityManager.addComponent(entityId, 'position', positionData);
      
      expect(entityManager.getComponent(entityId, 'position')).toEqual(positionData);
    });

    test('should return null when getting component from non-existent entity', () => {
      expect(entityManager.getComponent(999, 'position')).toBeNull();
    });

    test('should return null when getting non-existent component', () => {
      const entityId = entityManager.createEntity();
      expect(entityManager.getComponent(entityId, 'nonExistentComponent')).toBeNull();
    });

    test('should check if entity has component', () => {
      const entityId = entityManager.createEntity();
      entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0 });
      
      expect(entityManager.hasComponent(entityId, 'position')).toBe(true);
      expect(entityManager.hasComponent(entityId, 'health')).toBe(false);
    });

    test('should return false when checking component on non-existent entity', () => {
      expect(entityManager.hasComponent(999, 'position')).toBe(false);
    });
  });
});