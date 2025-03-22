import CombatSystem from '../../../src/entities/systems/CombatSystem.js';

describe('CombatSystem', () => {
  let combatSystem;
  let mockEntityManager;

  beforeEach(() => {
    // Set up mocks
    mockEntityManager = {
      hasComponent: jest.fn(),
      getComponent: jest.fn()
    };
    
    combatSystem = new CombatSystem(mockEntityManager);
  });

  describe('initialization', () => {
    test('should initialize with empty maps', () => {
      expect(combatSystem.attackingEntities).toBeInstanceOf(Map);
      expect(combatSystem.attackingEntities.size).toBe(0);
      expect(combatSystem.attackCooldowns).toBeInstanceOf(Map);
      expect(combatSystem.attackCooldowns.size).toBe(0);
    });
  });

  describe('getAttackRange', () => {
    test('should return melee range for melee attack type', () => {
      const range = combatSystem.getAttackRange('assault', 'melee');
      expect(range).toBe(1.5);
    });

    test('should return unit-specific range for ranged units', () => {
      expect(combatSystem.getAttackRange('sniper', 'ranged')).toBe(15);
      expect(combatSystem.getAttackRange('assault', 'ranged')).toBe(7);
      expect(combatSystem.getAttackRange('support', 'ranged')).toBe(10);
    });

    test('should return default range for unknown unit types', () => {
      expect(combatSystem.getAttackRange('unknown', 'ranged')).toBe(combatSystem.DEFAULT_ATTACK_RANGE);
    });
  });

  describe('startAttack', () => {
    test('should not start attack if attacker cannot attack target', () => {
      // Mock canAttack to return false
      jest.spyOn(combatSystem, 'canAttack').mockReturnValue(false);
      
      const result = combatSystem.startAttack(1, 2);
      
      expect(result).toBe(false);
      expect(combatSystem.attackingEntities.has(1)).toBe(false);
    });

    test('should not start attack if attacker and target are same faction', () => {
      // Mock canAttack to return true
      jest.spyOn(combatSystem, 'canAttack').mockReturnValue(true);
      
      // Mock getComponent to return same faction for both entities
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') {
          return { faction: 'player' };
        }
      });
      
      const result = combatSystem.startAttack(1, 2);
      
      expect(result).toBe(false);
      expect(combatSystem.attackingEntities.has(1)).toBe(false);
    });

    test('should start attack if valid', () => {
      // Mock canAttack to return true
      jest.spyOn(combatSystem, 'canAttack').mockReturnValue(true);
      
      // Mock getComponent to return different factions
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') {
          return entityId === 1 ? { faction: 'player', attackType: 'ranged', damageType: 'normal' } 
                               : { faction: 'enemy' };
        }
      });
      
      const result = combatSystem.startAttack(1, 2);
      
      expect(result).toBe(true);
      expect(combatSystem.attackingEntities.has(1)).toBe(true);
      expect(combatSystem.attackingEntities.get(1)).toEqual({
        targetId: 2,
        attackType: 'ranged',
        damageType: 'normal'
      });
    });
  });

  describe('canAttack', () => {
    test('should return false if required components are missing', () => {
      // Mock hasComponent to return false
      mockEntityManager.hasComponent.mockReturnValue(false);
      
      expect(combatSystem.canAttack(1, 2)).toBe(false);
    });

    test('should return false if attacker is on cooldown', () => {
      // Set up cooldown for attacker
      combatSystem.attackCooldowns.set(1, 1.0);
      
      // Mock hasComponent to return true for all required components
      mockEntityManager.hasComponent.mockReturnValue(true);
      
      expect(combatSystem.canAttack(1, 2)).toBe(false);
    });

    test('should return false if target is out of range', () => {
      // Mock hasComponent to return true
      mockEntityManager.hasComponent.mockReturnValue(true);
      
      // Mock getComponent to return positions that are far apart
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'position') {
          return entityId === 1 ? { x: 0, y: 0, z: 0 } : { x: 100, y: 0, z: 100 };
        }
        if (componentType === 'faction') {
          return { unitType: 'assault', attackType: 'ranged' };
        }
      });
      
      expect(combatSystem.canAttack(1, 2)).toBe(false);
    });

    test('should return true if all conditions are met', () => {
      // Mock hasComponent to return true
      mockEntityManager.hasComponent.mockReturnValue(true);
      
      // Mock getComponent to return positions that are close enough
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'position') {
          return entityId === 1 ? { x: 0, y: 0, z: 0 } : { x: 3, y: 0, z: 0 };
        }
        if (componentType === 'faction') {
          return { unitType: 'assault', attackType: 'ranged' };
        }
      });
      
      expect(combatSystem.canAttack(1, 2)).toBe(true);
    });
  });

  describe('calculateDamage', () => {
    test('should calculate base damage based on unit type', () => {
      // Mock the getComponent method to return different unit types
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') {
          if (entityId === 1) return { unitType: 'assault' };
          if (entityId === 2) return { unitType: 'sniper' };
          if (entityId === 3) return { unitType: 'support' };
          return { unitType: 'unknown' };
        }
        if (componentType === 'health') {
          return { armor: 0 };
        }
      });
      
      // Control random for consistent testing
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1); // Below critical threshold
      
      const damage1 = combatSystem.calculateDamage(1, 5, 'ranged', 'normal');
      const damage2 = combatSystem.calculateDamage(2, 5, 'ranged', 'normal');
      const damage3 = combatSystem.calculateDamage(3, 5, 'ranged', 'normal');
      const damage4 = combatSystem.calculateDamage(4, 5, 'ranged', 'normal');
      
      expect(damage1.damage).toBe(15); // Assault
      expect(damage2.damage).toBe(25); // Sniper
      expect(damage3.damage).toBe(5);  // Support
      expect(damage4.damage).toBe(10); // Default
    });

    test('should apply critical hits', () => {
      // Mock getComponent
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') return { unitType: 'assault' };
        if (componentType === 'health') return { armor: 0 };
      });
      
      // Mock random to force a critical hit
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1); // No crit (below 0.2)
      const normalDamage = combatSystem.calculateDamage(1, 2, 'ranged', 'normal');
      
      jest.spyOn(global.Math, 'random').mockReturnValue(0.5); // Crit (above 0.2)
      const criticalDamage = combatSystem.calculateDamage(1, 2, 'ranged', 'normal');
      
      // Assault has base damage 15
      expect(normalDamage.damage).toBe(15);
      expect(normalDamage.isCritical).toBe(false);
      
      // Critical should be 1.5x damage
      expect(criticalDamage.damage).toBe(22.5); // 15 * 1.5
      expect(criticalDamage.isCritical).toBe(true);
    });

    test('should apply armor reduction', () => {
      // Mock getComponent
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') return { unitType: 'assault' };
        if (componentType === 'health') return { armor: 5 };
      });
      
      // Control random
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
      
      const damageInfo = combatSystem.calculateDamage(1, 2, 'ranged', 'normal');
      
      // Assault base damage (15) - armor (5) = 10
      expect(damageInfo.damage).toBe(10);
    });

    test('should enforce minimum damage of 1', () => {
      // Mock getComponent with high armor
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') return { unitType: 'support' };
        if (componentType === 'health') return { armor: 20 }; // Higher than support's base damage
      });
      
      // Control random
      jest.spyOn(global.Math, 'random').mockReturnValue(0.1);
      
      const damageInfo = combatSystem.calculateDamage(1, 2, 'ranged', 'normal');
      
      // Support base damage (5) - armor (20) would be negative, but minimum is 1
      expect(damageInfo.damage).toBe(1);
    });
  });

  describe('applyDamage', () => {
    test('should return false if target has no health component', () => {
      mockEntityManager.hasComponent.mockReturnValue(false);
      
      const result = combatSystem.applyDamage(1, { damage: 10 });
      
      expect(result).toBe(false);
    });

    test('should reduce health by damage amount', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      
      const mockHealth = { currentHealth: 100, maxHealth: 100 };
      mockEntityManager.getComponent.mockReturnValue(mockHealth);
      
      combatSystem.applyDamage(1, { damage: 30 });
      
      expect(mockHealth.currentHealth).toBe(70);
    });

    test('should return true if target is destroyed', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      
      const mockHealth = { currentHealth: 20, maxHealth: 100 };
      mockEntityManager.getComponent.mockReturnValue(mockHealth);
      
      const result = combatSystem.applyDamage(1, { damage: 30 });
      
      expect(result).toBe(true);
      expect(mockHealth.currentHealth).toBe(0);
    });

    test('should return false if target survives', () => {
      mockEntityManager.hasComponent.mockReturnValue(true);
      
      const mockHealth = { currentHealth: 100, maxHealth: 100 };
      mockEntityManager.getComponent.mockReturnValue(mockHealth);
      
      const result = combatSystem.applyDamage(1, { damage: 30 });
      
      expect(result).toBe(false);
      expect(mockHealth.currentHealth).toBe(70);
    });
  });

  describe('update', () => {
    test('should update cooldowns', () => {
      // Set up initial cooldowns
      combatSystem.attackCooldowns.set(1, 1.0);
      combatSystem.attackCooldowns.set(2, 0.3);
      
      // Update with deltaTime 0.5
      combatSystem.update(0.5);
      
      // Check cooldowns were reduced
      expect(combatSystem.attackCooldowns.get(1)).toBe(0.5);
      expect(combatSystem.attackCooldowns.has(2)).toBe(false); // Should be removed
    });

    test('should stop attack if target no longer exists', () => {
      // Set up attacking entity
      combatSystem.attackingEntities.set(1, { targetId: 2 });
      
      // Mock hasComponent to return false for target
      mockEntityManager.hasComponent.mockImplementation((entityId, componentType) => {
        return entityId === 1; // Only attacker exists
      });
      
      // Update
      combatSystem.update(0.1);
      
      // Attack should be stopped
      expect(combatSystem.attackingEntities.has(1)).toBe(false);
    });

    test('should perform attack when not on cooldown', () => {
      // Spy on methods
      jest.spyOn(combatSystem, 'calculateDamage').mockReturnValue({ damage: 15, isCritical: false });
      jest.spyOn(combatSystem, 'applyDamage').mockReturnValue(false); // Target survives
      jest.spyOn(combatSystem, 'canAttack').mockReturnValue(true);
      
      // Mock entity manager
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') return { unitType: 'assault' };
        return {}; // Default for other components
      });
      
      // Set up attacking entity
      combatSystem.attackingEntities.set(1, { 
        targetId: 2,
        attackType: 'ranged',
        damageType: 'normal'
      });
      
      // Update
      combatSystem.update(0.1);
      
      // Check methods were called
      expect(combatSystem.calculateDamage).toHaveBeenCalled();
      expect(combatSystem.applyDamage).toHaveBeenCalled();
      expect(combatSystem.attackCooldowns.has(1)).toBe(true);
    });

    test('should stop attack if target is destroyed', () => {
      // Spy on methods
      jest.spyOn(combatSystem, 'calculateDamage').mockReturnValue({ damage: 100, isCritical: false });
      jest.spyOn(combatSystem, 'applyDamage').mockReturnValue(true); // Target destroyed
      jest.spyOn(combatSystem, 'canAttack').mockReturnValue(true);
      
      // Mock entity manager
      mockEntityManager.hasComponent.mockReturnValue(true);
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'faction') return { unitType: 'assault' };
        return {}; // Default for other components
      });
      
      // Set up attacking entity
      combatSystem.attackingEntities.set(1, { 
        targetId: 2,
        attackType: 'ranged',
        damageType: 'normal'
      });
      
      // Update
      combatSystem.update(0.1);
      
      // Attack should be stopped after destroying target
      expect(combatSystem.attackingEntities.has(1)).toBe(false);
    });
  });

  describe('serialization', () => {
    test('should correctly serialize and deserialize state', () => {
      // Set up some initial state
      combatSystem.attackingEntities.set(1, { 
        targetId: 2,
        attackType: 'ranged',
        damageType: 'normal'
      });
      combatSystem.attackCooldowns.set(1, 0.5);
      
      // Serialize
      const serialized = combatSystem.serialize();
      
      // Create a new system
      const newSystem = new CombatSystem(mockEntityManager);
      
      // Deserialize
      newSystem.deserialize(serialized);
      
      // Check state was preserved
      expect(newSystem.attackingEntities.get(1)).toEqual({
        targetId: 2,
        attackType: 'ranged',
        damageType: 'normal'
      });
      expect(newSystem.attackCooldowns.get(1)).toBe(0.5);
    });
  });
});