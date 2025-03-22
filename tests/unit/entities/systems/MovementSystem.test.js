import MovementSystem from '../../../../src/entities/systems/MovementSystem.js';

// Mock EntityManager
class MockEntityManager {
  constructor() {
    this.components = {
      position: new Map()
    };
  }

  hasComponent(entityId, componentType) {
    return this.components[componentType] && this.components[componentType].has(entityId);
  }

  getComponent(entityId, componentType) {
    if (this.hasComponent(entityId, componentType)) {
      return this.components[componentType].get(entityId);
    }
    return null;
  }

  // Helper to add components for testing
  addComponent(entityId, componentType, data) {
    if (!this.components[componentType]) {
      this.components[componentType] = new Map();
    }
    this.components[componentType].set(entityId, data);
  }
}

describe('MovementSystem', () => {
  let movementSystem;
  let entityManager;

  beforeEach(() => {
    entityManager = new MockEntityManager();
    movementSystem = new MovementSystem(entityManager);
  });

  describe('initialization', () => {
    test('should initialize with empty moving entities', () => {
      expect(movementSystem.movingEntities).toBeInstanceOf(Map);
      expect(movementSystem.movingEntities.size).toBe(0);
    });
  });

  describe('moveEntity', () => {
    test('should add entity to moving entities with provided destination and speed', () => {
      const entityId = 1;
      const destination = { x: 10, y: 0, z: 10 };
      const speed = 7;

      // Add position component to entity
      entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0, rotation: 0 });

      // Move entity
      const result = movementSystem.moveEntity(entityId, destination, speed);
      
      // Verify
      expect(result).toBe(true);
      expect(movementSystem.movingEntities.has(entityId)).toBe(true);
      
      const movementData = movementSystem.movingEntities.get(entityId);
      expect(movementData.destination).toEqual(destination);
      expect(movementData.speed).toBe(speed);
      expect(movementData.path).toEqual([]);
    });

    test('should add entity with default speed if not provided', () => {
      const entityId = 1;
      const destination = { x: 10, y: 0, z: 10 };

      // Add position component to entity
      entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0, rotation: 0 });

      // Move entity without specifying speed
      movementSystem.moveEntity(entityId, destination);
      
      // Verify default speed is used
      const movementData = movementSystem.movingEntities.get(entityId);
      expect(movementData.speed).toBe(5); // Default speed is 5
    });

    test('should return false if entity has no position component', () => {
      const entityId = 1;
      const destination = { x: 10, y: 0, z: 10 };

      // No position component added

      // Try to move entity
      const result = movementSystem.moveEntity(entityId, destination);
      
      // Verify
      expect(result).toBe(false);
      expect(movementSystem.movingEntities.has(entityId)).toBe(false);
    });
  });

  describe('stopEntity', () => {
    test('should remove entity from moving entities', () => {
      const entityId = 1;

      // Setup: add entity to moving entities
      entityManager.addComponent(entityId, 'position', { x: 0, y: 0, z: 0, rotation: 0 });
      movementSystem.moveEntity(entityId, { x: 10, y: 0, z: 10 });
      expect(movementSystem.movingEntities.has(entityId)).toBe(true);

      // Stop entity
      const result = movementSystem.stopEntity(entityId);
      
      // Verify
      expect(result).toBe(true);
      expect(movementSystem.movingEntities.has(entityId)).toBe(false);
    });

    test('should return false if entity is not moving', () => {
      const entityId = 1;

      // Entity not added to moving entities

      // Try to stop entity
      const result = movementSystem.stopEntity(entityId);
      
      // Verify
      expect(result).toBe(false);
    });
  });

  describe('update', () => {
    test('should update position based on movement data', () => {
      const entityId = 1;
      const startPosition = { x: 0, y: 0, z: 0, rotation: 0 };
      const destination = { x: 10, y: 0, z: 0 }; // Moving along x-axis
      const speed = 5;
      const deltaTime = 0.1; // 100ms

      // Add position component to entity
      entityManager.addComponent(entityId, 'position', { ...startPosition });

      // Move entity
      movementSystem.moveEntity(entityId, destination, speed);

      // Update movement
      movementSystem.update(deltaTime);

      // Calculate expected position after update
      // movement = speed * deltaTime = 5 * 0.1 = 0.5 units
      // Since we're moving in x direction only, new x = 0 + 0.5 = 0.5
      const expectedX = 0.5;
      
      // Verify position was updated
      const positionComponent = entityManager.getComponent(entityId, 'position');
      expect(positionComponent.x).toBeCloseTo(expectedX);
      expect(positionComponent.z).toBe(0); // z shouldn't change
      
      // Verify rotation was updated to face movement direction
      expect(positionComponent.rotation).toBeCloseTo(Math.atan2(10, 0)); // atan2(dx, dz)
    });

    test('should stop when entity reaches destination', () => {
      const entityId = 1;
      const startPosition = { x: 0, y: 0, z: 0, rotation: 0 };
      const destination = { x: 0.05, y: 0, z: 0 }; // Very close destination
      const speed = 5;
      const deltaTime = 0.1; // 100ms

      // Add position component to entity
      entityManager.addComponent(entityId, 'position', { ...startPosition });

      // Move entity
      movementSystem.moveEntity(entityId, destination, speed);

      // Update movement
      movementSystem.update(deltaTime);

      // Entity should reach destination and stop
      expect(movementSystem.movingEntities.has(entityId)).toBe(false);
      
      // Position should be exactly at destination
      const positionComponent = entityManager.getComponent(entityId, 'position');
      expect(positionComponent.x).toBe(destination.x);
      expect(positionComponent.z).toBe(destination.z);
    });

    test('should handle diagonal movement correctly', () => {
      const entityId = 1;
      const startPosition = { x: 0, y: 0, z: 0, rotation: 0 };
      const destination = { x: 10, y: 0, z: 10 }; // Diagonal movement
      const speed = 5;
      const deltaTime = 0.1; // 100ms

      // Add position component to entity
      entityManager.addComponent(entityId, 'position', { ...startPosition });

      // Move entity
      movementSystem.moveEntity(entityId, destination, speed);

      // Update movement
      movementSystem.update(deltaTime);

      // Calculate expected position after update
      // For diagonal movement, we need to normalize the direction vector
      // Distance to travel = 5 * 0.1 = 0.5 units
      // Direction = (10,10) / sqrt(200) = (0.7071, 0.7071)
      // So we move ~0.3536 units in each direction
      const expectedMovement = 0.5 / Math.sqrt(2);
      
      // Verify position was updated
      const positionComponent = entityManager.getComponent(entityId, 'position');
      expect(positionComponent.x).toBeCloseTo(expectedMovement);
      expect(positionComponent.z).toBeCloseTo(expectedMovement);
      
      // Verify rotation is correct (45 degrees in radians = PI/4 ≈ 0.7854)
      expect(positionComponent.rotation).toBeCloseTo(Math.PI / 4);
    });

    test('should handle entity losing position component', () => {
      const entityId = 1;
      const startPosition = { x: 0, y: 0, z: 0, rotation: 0 };
      const destination = { x: 10, y: 0, z: 0 };

      // Add position component to entity
      entityManager.addComponent(entityId, 'position', { ...startPosition });

      // Move entity
      movementSystem.moveEntity(entityId, destination);
      expect(movementSystem.movingEntities.has(entityId)).toBe(true);

      // Remove position component
      entityManager.components.position.delete(entityId);

      // Update movement
      movementSystem.update(0.1);

      // Entity should be removed from moving entities
      expect(movementSystem.movingEntities.has(entityId)).toBe(false);
    });
  });

  describe('serialization', () => {
    test('should serialize moving entities data', () => {
      const entityId1 = 1;
      const entityId2 = 2;
      
      // Setup: add entities to moving entities
      entityManager.addComponent(entityId1, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(entityId2, 'position', { x: 5, y: 0, z: 5 });
      
      movementSystem.moveEntity(entityId1, { x: 10, y: 0, z: 0 }, 5);
      movementSystem.moveEntity(entityId2, { x: 15, y: 0, z: 15 }, 7);
      
      // Serialize
      const serialized = movementSystem.serialize();
      
      // Verify serialized data
      expect(serialized).toEqual([
        [entityId1, {
          destination: { x: 10, y: 0, z: 0 },
          speed: 5,
          path: []
        }],
        [entityId2, {
          destination: { x: 15, y: 0, z: 15 },
          speed: 7,
          path: []
        }]
      ]);
    });

    test('should deserialize moving entities data', () => {
      const entityId1 = 1;
      const entityId2 = 2;
      
      const serializedData = [
        [entityId1, {
          destination: { x: 10, y: 0, z: 0 },
          speed: 5,
          path: []
        }],
        [entityId2, {
          destination: { x: 15, y: 0, z: 15 },
          speed: 7,
          path: []
        }]
      ];
      
      // Deserialize
      movementSystem.deserialize(serializedData);
      
      // Verify deserialized data
      expect(movementSystem.movingEntities.size).toBe(2);
      expect(movementSystem.movingEntities.get(entityId1)).toEqual({
        destination: { x: 10, y: 0, z: 0 },
        speed: 5,
        path: []
      });
      expect(movementSystem.movingEntities.get(entityId2)).toEqual({
        destination: { x: 15, y: 0, z: 15 },
        speed: 7,
        path: []
      });
    });
  });
});