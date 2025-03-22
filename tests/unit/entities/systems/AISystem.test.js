import AISystem from '../../../src/entities/systems/AISystem.js';

describe('AISystem', () => {
  let aiSystem;
  let mockEntityManager;
  let mockCombatSystem;
  let mockMovementSystem;

  beforeEach(() => {
    // Set up mocks
    mockEntityManager = {
      hasComponent: jest.fn(),
      getComponent: jest.fn()
    };
    
    mockCombatSystem = {
      canAttack: jest.fn(),
      startAttack: jest.fn(),
      stopAttack: jest.fn()
    };
    
    mockMovementSystem = {
      moveEntity: jest.fn(),
      stopEntity: jest.fn()
    };
    
    aiSystem = new AISystem(mockEntityManager, mockCombatSystem, mockMovementSystem);
  });

  describe('initialization', () => {
    test('should initialize with empty AI-controlled entities map', () => {
      expect(aiSystem.aiControlledEntities).toBeInstanceOf(Map);
      expect(aiSystem.aiControlledEntities.size).toBe(0);
    });

    test('should define AI states', () => {
      expect(aiSystem.AI_STATES.IDLE).toBe('idle');
      expect(aiSystem.AI_STATES.PATROL).toBe('patrol');
      expect(aiSystem.AI_STATES.PURSUE).toBe('pursue');
      expect(aiSystem.AI_STATES.ATTACK).toBe('attack');
      expect(aiSystem.AI_STATES.RETREAT).toBe('retreat');
    });
  });

  describe('registerEntity', () => {
    test('should not register entity without required components', () => {
      mockEntityManager.hasComponent.mockReturnValue(false);
      
      const result = aiSystem.registerEntity(1);
      
      expect(result).toBe(false);
      expect(aiSystem.aiControlledEntities.has(1)).toBe(false);
    });

    test('should not register player entities', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') {
          return { faction: 'player' };
        }
        if (componentType === 'position') {
          return { x: 0, y: 0, z: 0 };
        }
        return null;
      });
      
      const result = aiSystem.registerEntity(1);
      
      expect(result).toBe(false);
      expect(aiSystem.aiControlledEntities.has(1)).toBe(false);
    });

    test('should register non-player entity with appropriate AI settings', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') {
          return { faction: 'enemy', unitType: 'assault' };
        }
        if (componentType === 'position') {
          return { x: 10, y: 0, z: 20 };
        }
        return null;
      });
      
      const result = aiSystem.registerEntity(1);
      
      expect(result).toBe(true);
      expect(aiSystem.aiControlledEntities.has(1)).toBe(true);
      
      const aiData = aiSystem.aiControlledEntities.get(1);
      expect(aiData.state).toBe(aiSystem.AI_STATES.IDLE);
      expect(aiData.startPosition).toEqual({ x: 10, y: 0, z: 20 });
      expect(aiData.aggressiveness).toBeGreaterThan(0);
    });

    test('should apply different settings based on unit type', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') {
          return { faction: 'enemy', unitType: 'sniper' };
        }
        if (componentType === 'position') {
          return { x: 0, y: 0, z: 0 };
        }
        return null;
      });
      
      aiSystem.registerEntity(1);
      
      const aiData = aiSystem.aiControlledEntities.get(1);
      expect(aiData.patrolRadius).toBe(20); // Sniper-specific radius
      expect(aiData.aggressiveness).toBe(0.3); // Sniper-specific aggressiveness
    });
  });

  describe('findNearestTarget', () => {
    beforeEach(() => {
      // Mock entity manager for position queries
      mockEntityManager.hasComponent.mockImplementation((entityId, componentType) => {
        // Entity 1 is our AI unit
        // Entities 2, 3 are enemy targets
        // Entity 4 is same faction (not a target)
        const validIds = new Set([1, 2, 3, 4]);
        return validIds.has(entityId);
      });
      
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'position') {
          if (entityId === 1) return { x: 0, y: 0, z: 0 };
          if (entityId === 2) return { x: 10, y: 0, z: 0 }; // 10 units away
          if (entityId === 3) return { x: 5, y: 0, z: 0 };  // 5 units away
          if (entityId === 4) return { x: 2, y: 0, z: 0 };  // 2 units away but same faction
        }
        if (componentType === 'faction') {
          if (entityId === 1) return { faction: 'enemy' };
          if (entityId === 2) return { faction: 'player' };
          if (entityId === 3) return { faction: 'player' };
          if (entityId === 4) return { faction: 'enemy' }; // Same faction as entity 1
        }
        return null;
      });
      
      // Set up entities in game state
      mockEntityManager.gameState = {
        entities: new Map([
          [1, {}],
          [2, {}],
          [3, {}],
          [4, {}]
        ])
      };
    });

    test('should find nearest target of different faction within detection range', () => {
      // Entity 3 should be the nearest target
      const target = aiSystem.findNearestTarget(1);
      expect(target).toBe(3);
    });

    test('should not find targets beyond detection range', () => {
      // Set a very small detection range
      aiSystem.DETECTION_RANGE = 3;
      
      // Now entity 3 is too far away
      const target = aiSystem.findNearestTarget(1);
      expect(target).toBeNull();
    });

    test('should ignore targets of same faction', () => {
      // Entity 4 is closest but same faction
      const target = aiSystem.findNearestTarget(1);
      expect(target).not.toBe(4);
    });
  });

  describe('getRandomPatrolPoint', () => {
    test('should generate point within patrol radius', () => {
      // Register an entity
      aiSystem.aiControlledEntities.set(1, {
        startPosition: { x: 0, y: 0, z: 0 },
        patrolRadius: 10
      });
      
      // Mock random to get deterministic results
      jest.spyOn(global.Math, 'random').mockReturnValueOnce(0.5).mockReturnValueOnce(0.5);
      
      const patrolPoint = aiSystem.getRandomPatrolPoint(1);
      
      // Distance from start should be 0.5 * patrolRadius
      const dx = patrolPoint.x;
      const dz = patrolPoint.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      expect(distance).toBeLessThanOrEqual(10); // Within radius
    });

    test('should return null for non-existent entity', () => {
      const patrolPoint = aiSystem.getRandomPatrolPoint(999);
      expect(patrolPoint).toBeNull();
    });
  });

  describe('shouldRetreat', () => {
    test('should return true when health below threshold', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockReturnValue({ 
        currentHealth: 20, 
        maxHealth: 100 
      });
      
      // 20/100 = 0.2, below the 0.3 threshold
      const shouldRetreat = aiSystem.shouldRetreat(1);
      expect(shouldRetreat).toBe(true);
    });

    test('should return false when health above threshold', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockReturnValue({ 
        currentHealth: 40, 
        maxHealth: 100 
      });
      
      // 40/100 = 0.4, above the 0.3 threshold
      const shouldRetreat = aiSystem.shouldRetreat(1);
      expect(shouldRetreat).toBe(false);
    });
  });

  describe('state transitions', () => {
    beforeEach(() => {
      // Set up AI entity
      aiSystem.aiControlledEntities.set(1, {
        state: aiSystem.AI_STATES.IDLE,
        aiType: 'basic',
        startPosition: { x: 0, y: 0, z: 0 },
        patrolRadius: 10,
        aggressiveness: 0.5,
        targetId: null,
        patrolPoint: null,
        stateTime: 0,
        lastDecisionTime: 0.5 // Ready to make a decision
      });
      
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'position') {
          return { x: 0, y: 0, z: 0 };
        }
        if (componentType === 'health') {
          return { currentHealth: 80, maxHealth: 100 };
        }
        return null;
      });
    });

    test('should transition from IDLE to PATROL after some time', () => {
      // Set high state time to trigger transition
      aiSystem.aiControlledEntities.get(1).stateTime = 5;
      
      // Mock random patrol point generation
      jest.spyOn(aiSystem, 'getRandomPatrolPoint').mockReturnValue({ x: 5, y: 0, z: 5 });
      
      // Mock findNearestTarget to return no targets
      jest.spyOn(aiSystem, 'findNearestTarget').mockReturnValue(null);
      
      // Update entity state
      aiSystem.updateEntityState(1, 0.1);
      
      // Verify transition to patrol
      const aiData = aiSystem.aiControlledEntities.get(1);
      expect(aiData.state).toBe(aiSystem.AI_STATES.PATROL);
      expect(mockMovementSystem.moveEntity).toHaveBeenCalledWith(1, { x: 5, y: 0, z: 5 }, expect.any(Number));
    });

    test('should transition to PURSUE when target found', () => {
      // Set initial state to IDLE
      aiSystem.aiControlledEntities.get(1).state = aiSystem.AI_STATES.IDLE;
      
      // Mock findNearestTarget to return a target
      jest.spyOn(aiSystem, 'findNearestTarget').mockReturnValue(2);
      
      // Update entity state
      aiSystem.updateEntityState(1, 0.1);
      
      // Verify transition to pursue
      const aiData = aiSystem.aiControlledEntities.get(1);
      expect(aiData.state).toBe(aiSystem.AI_STATES.PURSUE);
      expect(aiData.targetId).toBe(2);
    });

    test('should transition from PURSUE to ATTACK when in range', () => {
      // Set initial state to PURSUE with a target
      const aiData = aiSystem.aiControlledEntities.get(1);
      aiData.state = aiSystem.AI_STATES.PURSUE;
      aiData.targetId = 2;
      
      // Mock canAttack to return true
      mockCombatSystem.canAttack.mockReturnValue(true);
      
      // Update entity state
      aiSystem.updateEntityState(1, 0.1);
      
      // Verify transition to attack
      expect(aiData.state).toBe(aiSystem.AI_STATES.ATTACK);
      expect(mockMovementSystem.stopEntity).toHaveBeenCalledWith(1);
      expect(mockCombatSystem.startAttack).toHaveBeenCalledWith(1, 2);
    });

    test('should transition to RETREAT when health is low', () => {
      // Set health to low value
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'health') {
          return { currentHealth: 20, maxHealth: 100 };
        }
        return { x: 0, y: 0, z: 0 };
      });
      
      // Update entity state (from any state)
      aiSystem.updateEntityState(1, 0.1);
      
      // Verify transition to retreat
      const aiData = aiSystem.aiControlledEntities.get(1);
      expect(aiData.state).toBe(aiSystem.AI_STATES.RETREAT);
      expect(mockMovementSystem.moveEntity).toHaveBeenCalledWith(1, aiData.startPosition, expect.any(Number));
    });

    test('should return to IDLE after target is lost', () => {
      // Set initial state to ATTACK with a target
      const aiData = aiSystem.aiControlledEntities.get(1);
      aiData.state = aiSystem.AI_STATES.ATTACK;
      aiData.targetId = 2;
      
      // Mock that target no longer exists
      mockEntityManager.hasComponent.mockImplementation((entityId, componentType) => {
        return entityId !== 2; // Target doesn't exist
      });
      
      // Update entity state
      aiSystem.updateEntityState(1, 0.1);
      
      // Verify transition to idle
      expect(aiData.state).toBe(aiSystem.AI_STATES.IDLE);
      expect(aiData.targetId).toBeNull();
      expect(mockCombatSystem.stopAttack).toHaveBeenCalledWith(1);
    });
  });

  describe('update', () => {
    test('should update all AI-controlled entities', () => {
      // Set up multiple AI entities
      aiSystem.aiControlledEntities.set(1, { state: aiSystem.AI_STATES.IDLE, stateTime: 0, lastDecisionTime: 0 });
      aiSystem.aiControlledEntities.set(2, { state: aiSystem.AI_STATES.PATROL, stateTime: 0, lastDecisionTime: 0 });
      
      // Spy on updateEntityState
      const updateEntityStateSpy = jest.spyOn(aiSystem, 'updateEntityState').mockImplementation(() => {});
      
      // Mock entity manager
      mockEntityManager.hasComponent.mockReturnValue(true);
      
      // Update all entities
      aiSystem.update(0.1);
      
      // Verify each entity was updated
      expect(updateEntityStateSpy).toHaveBeenCalledTimes(2);
      expect(updateEntityStateSpy).toHaveBeenCalledWith(1, 0.1);
      expect(updateEntityStateSpy).toHaveBeenCalledWith(2, 0.1);
    });

    test('should remove entities that no longer exist', () => {
      // Set up AI entity
      aiSystem.aiControlledEntities.set(1, {});
      
      // Mock entity manager to say entity doesn't exist
      mockEntityManager.hasComponent.mockReturnValue(false);
      
      // Update
      aiSystem.update(0.1);
      
      // Entity should be removed
      expect(aiSystem.aiControlledEntities.has(1)).toBe(false);
    });
  });

  describe('serialization', () => {
    test('should correctly serialize and deserialize state', () => {
      // Set up some initial state
      aiSystem.aiControlledEntities.set(1, {
        state: aiSystem.AI_STATES.PATROL,
        targetId: null,
        startPosition: { x: 0, y: 0, z: 0 },
        patrolRadius: 10
      });
      
      // Serialize
      const serialized = aiSystem.serialize();
      
      // Create a new system
      const newSystem = new AISystem(mockEntityManager, mockCombatSystem, mockMovementSystem);
      
      // Deserialize
      newSystem.deserialize(serialized);
      
      // Check state was preserved
      expect(newSystem.aiControlledEntities.get(1)).toEqual({
        state: aiSystem.AI_STATES.PATROL,
        targetId: null,
        startPosition: { x: 0, y: 0, z: 0 },
        patrolRadius: 10
      });
    });
  });
});