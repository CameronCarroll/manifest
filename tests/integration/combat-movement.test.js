import GameState from '../../src/core/GameState.js';
import EntityManager from '../../src/core/EntityManager.js';
import CombatSystem from '../../src/entities/systems/CombatSystem.js';
import MovementSystem from '../../src/entities/systems/MovementSystem.js';
import PositionComponent from '../../src/entities/components/PositionComponent.js';
import HealthComponent from '../../src/entities/components/HealthComponent.js';
import FactionComponent from '../../src/entities/components/FactionComponent.js';

describe('Combat and Movement Integration', () => {
  let gameState;
  let entityManager;
  let positionManager;
  let healthManager;
  let factionManager;
  let movementSystem;
  let combatSystem;

  beforeEach(() => {
    // Initialize core systems
    gameState = new GameState();
    entityManager = new EntityManager(gameState);
    
    // Initialize component managers
    positionManager = new PositionComponent();
    healthManager = new HealthComponent();
    factionManager = new FactionComponent();
    
    // Register component managers
    entityManager.registerComponentManager('position', positionManager);
    entityManager.registerComponentManager('health', healthManager);
    entityManager.registerComponentManager('faction', factionManager);
    
    // Initialize systems
    combatSystem = new CombatSystem(entityManager);
    movementSystem = new MovementSystem(entityManager, { combat: combatSystem });
    
    // Set systems for proper integration
    combatSystem.setMovementSystem(movementSystem);
    
    // Add systems to gameState for reference
    gameState.systems = { movement: movementSystem, combat: combatSystem };
  });

  describe('Combat ranges and movement', () => {
    test('should stay in place when enemy is in attack range', () => {
      // Create attacker entity
      const attackerId = entityManager.createEntity();
      entityManager.addComponent(attackerId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(attackerId, 'health', { maxHealth: 100 });
      entityManager.addComponent(attackerId, 'faction', { 
        faction: 'player',
        unitType: 'assault',
        attackType: 'ranged'
      });
      
      // Create target entity within attack range
      const targetId = entityManager.createEntity();
      entityManager.addComponent(targetId, 'position', { x: 5, y: 0, z: 0 }); // Within assault range (7)
      entityManager.addComponent(targetId, 'health', { maxHealth: 100 });
      entityManager.addComponent(targetId, 'faction', { faction: 'enemy' });
      
      // Start attack
      const canAttack = combatSystem.canAttack(attackerId, targetId);
      expect(canAttack).toBe(true);
      
      combatSystem.startAttack(attackerId, targetId);
      
      // Update both systems
      combatSystem.update(0.1);
      movementSystem.update(0.1);
      
      // Attacker should not be moving
      expect(movementSystem.movingEntities.has(attackerId)).toBe(false);
      
      // Attacker should be on attack cooldown
      expect(combatSystem.attackCooldowns.has(attackerId)).toBe(true);
      
      // Target health should be reduced
      const targetHealth = entityManager.getComponent(targetId, 'health');
      expect(targetHealth.currentHealth).toBeLessThan(100);
    });
  });


  describe('Death and cleanup', () => {
    test('should remove entity from combat when destroyed', () => {
      // Create attacker entity
      const attackerId = entityManager.createEntity();
      entityManager.addComponent(attackerId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(attackerId, 'health', { maxHealth: 100 });
      entityManager.addComponent(attackerId, 'faction', { 
        faction: 'player',
        unitType: 'assault',
        attackType: 'ranged'
      });
      
      // Create weak target entity
      const targetId = entityManager.createEntity();
      entityManager.addComponent(targetId, 'position', { x: 5, y: 0, z: 0 });
      entityManager.addComponent(targetId, 'health', { maxHealth: 10, currentHealth: 10 });
      entityManager.addComponent(targetId, 'faction', { faction: 'enemy' });
      
      // Start attack
      combatSystem.startAttack(attackerId, targetId);
      
      // Force high damage
      jest.spyOn(combatSystem, 'calculateDamage').mockReturnValue({ 
        damage: 20, // More than target health
        isCritical: false
      });
      
      // Update combat - the entity is removed within the update
      combatSystem.update(0.1);
      
      // Entity is removed from the game by applyDamage, so we should not
      // try to access the health component.
      
      // Instead we verify that the entity doesn't exist in the game state
      expect(gameState.entities.has(targetId)).toBe(false);
      
      // Attack should be stopped
      expect(combatSystem.attackingEntities.has(attackerId)).toBe(false);
    });
  });
});