import GameState from '../../src/core/GameState.js';
import EntityManager from '../../src/core/EntityManager.js';
import AISystem from '../../src/entities/systems/AISystem.js';
import CombatSystem from '../../src/entities/systems/CombatSystem.js';
import MovementSystem from '../../src/entities/systems/MovementSystem.js';
import PositionComponent from '../../src/entities/components/PositionComponent.js';
import HealthComponent from '../../src/entities/components/HealthComponent.js';
import FactionComponent from '../../src/entities/components/FactionComponent.js';

describe('AI and Combat Integration', () => {
  let gameState;
  let entityManager;
  let aiSystem;
  let combatSystem;
  let movementSystem;

  beforeEach(() => {
    // Initialize core systems
    gameState = new GameState();
    entityManager = new EntityManager(gameState);
    
    // Initialize component managers
    const positionManager = new PositionComponent();
    const healthManager = new HealthComponent();
    const factionManager = new FactionComponent();
    
    // Register component managers
    entityManager.registerComponentManager('position', positionManager);
    entityManager.registerComponentManager('health', healthManager);
    entityManager.registerComponentManager('faction', factionManager);
    
    // Initialize systems
    combatSystem = new CombatSystem(entityManager);
    movementSystem = new MovementSystem(entityManager);
    aiSystem = new AISystem(entityManager, combatSystem, movementSystem);
    
    // Patch gameState entities
    gameState.entities = new Map();
  });

  describe('AI Target Detection and Pursuit', () => {
    test('should detect and pursue player units within detection range', () => {
      // Create player unit
      const playerId = entityManager.createEntity();
      entityManager.addComponent(playerId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(playerId, 'health', { maxHealth: 100 });
      entityManager.addComponent(playerId, 'faction', { faction: 'player' });
      
      // Add to gameState entities for AI detection
      gameState.entities.set(playerId, { position: true, health: true, faction: true });
      
      // Create enemy unit
      const enemyId = entityManager.createEntity();
      entityManager.addComponent(enemyId, 'position', { x: 10, y: 0, z: 0 }); // Within detection range
      entityManager.addComponent(enemyId, 'health', { maxHealth: 100 });
      entityManager.addComponent(enemyId, 'faction', { 
        faction: 'enemy',
        unitType: 'assault',
        attackType: 'ranged'
      });
      
      // Add to gameState entities
      gameState.entities.set(enemyId, { position: true, health: true, faction: true });
      
      // Register with AI system
      aiSystem.registerEntity(enemyId);
      
      // Set AI state to IDLE and make sure it's ready for a decision
      const aiData = aiSystem.aiControlledEntities.get(enemyId);
      aiData.state = aiSystem.AI_STATES.IDLE;
      aiData.lastDecisionTime = 1.0; // Override the time to force decision
      
      // Update AI
      aiSystem.update(0.1);
      
      // Enemy should now be pursuing the player
      expect(aiData.state).toBe(aiSystem.AI_STATES.PURSUE);
      expect(aiData.targetId).toBe(playerId);
      
      // Enemy should be moving toward player
      expect(movementSystem.movingEntities.has(enemyId)).toBe(true);
    });

    test('should FAIL: efficiently group pursuit from multiple AI units', () => {
      // This test is intended to fail to guide development
      // We need smarter group movement for efficiency
      
      // Create player unit
      const playerId = entityManager.createEntity();
      entityManager.addComponent(playerId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(playerId, 'health', { maxHealth: 100 });
      entityManager.addComponent(playerId, 'faction', { faction: 'player' });
      
      // Add to gameState entities
      gameState.entities.set(playerId, { position: true, health: true, faction: true });
      
      // Create multiple enemy units
      const enemyIds = [];
      for (let i = 0; i < 5; i++) {
        const enemyId = entityManager.createEntity();
        entityManager.addComponent(enemyId, 'position', { x: 10 + i, y: 0, z: 0 });
        entityManager.addComponent(enemyId, 'health', { maxHealth: 100 });
        entityManager.addComponent(enemyId, 'faction', { 
          faction: 'enemy',
          unitType: 'assault',
          attackType: 'ranged'
        });
        
        // Add to gameState entities
        gameState.entities.set(enemyId, { position: true, health: true, faction: true });
        
        // Register with AI system
        aiSystem.registerEntity(enemyId);
        aiSystem.aiControlledEntities.get(enemyId).lastDecisionTime = 1.0;
        
        enemyIds.push(enemyId);
      }
      
      // Update AI
      aiSystem.update(0.1);
      
      // All enemies should be pursuing
      for (const enemyId of enemyIds) {
        const aiData = aiSystem.aiControlledEntities.get(enemyId);
        expect(aiData.state).toBe(aiSystem.AI_STATES.PURSUE);
      }
      
      // Update movement several times
      for (let i = 0; i < 10; i++) {
        movementSystem.update(0.1);
      }
      
      // Calculate the average distance between enemies
      // This ideally should show that enemies maintain some spacing
      let totalDistance = 0;
      let pairs = 0;
      
      for (let i = 0; i < enemyIds.length; i++) {
        const pos1 = entityManager.getComponent(enemyIds[i], 'position');
        
        for (let j = i + 1; j < enemyIds.length; j++) {
          const pos2 = entityManager.getComponent(enemyIds[j], 'position');
          
          const dx = pos1.x - pos2.x;
          const dz = pos1.z - pos2.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          totalDistance += distance;
          pairs++;
        }
      }
      
      const averageDistance = totalDistance / pairs;
      
      // Enemies should maintain some minimum distance from each other
      // This will fail since we don't have formation or spacing logic
      expect(averageDistance).toBeGreaterThan(2.0);
    });
  });

  describe('AI Attack Behavior', () => {
    test('should transition from pursuit to attack when in range', () => {
      // Create player unit
      const playerId = entityManager.createEntity();
      entityManager.addComponent(playerId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(playerId, 'health', { maxHealth: 100 });
      entityManager.addComponent(playerId, 'faction', { faction: 'player' });
      
      // Add to gameState entities
      gameState.entities.set(playerId, { position: true, health: true, faction: true });
      
      // Create enemy unit within attack range
      const enemyId = entityManager.createEntity();
      entityManager.addComponent(enemyId, 'position', { x: 5, y: 0, z: 0 }); // Within attack range
      entityManager.addComponent(enemyId, 'health', { maxHealth: 100 });
      entityManager.addComponent(enemyId, 'faction', { 
        faction: 'enemy',
        unitType: 'assault',
        attackType: 'ranged'
      });
      
      // Add to gameState entities
      gameState.entities.set(enemyId, { position: true, health: true, faction: true });
      
      // Register with AI system
      aiSystem.registerEntity(enemyId);
      
      // Set AI state to PURSUE and ready for decision
      const aiData = aiSystem.aiControlledEntities.get(enemyId);
      aiData.state = aiSystem.AI_STATES.PURSUE;
      aiData.targetId = playerId;
      aiData.lastDecisionTime = 1.0;
      
      // Mock canAttack to return true
      jest.spyOn(combatSystem, 'canAttack').mockReturnValue(true);
      
      // Update AI
      aiSystem.update(0.1);
      
      // Enemy should now be attacking
      expect(aiData.state).toBe(aiSystem.AI_STATES.ATTACK);
      
      // Combat system should have started attack
      expect(combatSystem.startAttack).toHaveBeenCalledWith(enemyId, playerId);
    });

    test('should FAIL: use different attack patterns based on unit type', () => {
      // This test is intended to fail to guide development
      // We need type-specific combat behaviors
      
      // Create player unit
      const playerId = entityManager.createEntity();
      entityManager.addComponent(playerId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(playerId, 'health', { maxHealth: 100 });
      entityManager.addComponent(playerId, 'faction', { faction: 'player' });
      
      // Add to gameState entities
      gameState.entities.set(playerId, { position: true, health: true, faction: true });
      
      // Create different enemy unit types
      const enemyTypes = ['sniper', 'assault', 'support'];
      const enemyIds = [];
      
      for (let i = 0; i < enemyTypes.length; i++) {
        const enemyId = entityManager.createEntity();
        entityManager.addComponent(enemyId, 'position', { x: 5, y: 0, z: i * 2 });
        entityManager.addComponent(enemyId, 'health', { maxHealth: 100 });
        entityManager.addComponent(enemyId, 'faction', { 
          faction: 'enemy',
          unitType: enemyTypes[i]
        });
        
        // Add to gameState entities
        gameState.entities.set(enemyId, { position: true, health: true, faction: true });
        
        // Register with AI system
        aiSystem.registerEntity(enemyId);
        
        // Set AI state to ATTACK
        const aiData = aiSystem.aiControlledEntities.get(enemyId);
        aiData.state = aiSystem.AI_STATES.ATTACK;
        aiData.targetId = playerId;
        
        // Mock combat system
        jest.spyOn(combatSystem, 'canAttack').mockReturnValue(true);
        
        enemyIds.push(enemyId);
      }
      
      // Track initial positions
      const initialPositions = enemyIds.map(id => {
        const pos = entityManager.getComponent(id, 'position');
        return { x: pos.x, z: pos.z };
      });
      
      // Update multiple times
      for (let i = 0; i < 10; i++) {
        aiSystem.update(0.1);
        movementSystem.update(0.1);
      }
      
      // Get new positions
      const newPositions = enemyIds.map(id => {
        const pos = entityManager.getComponent(id, 'position');
        return { x: pos.x, z: pos.z };
      });
      
      // Calculate position differences - units should behave differently
      const differences = [];
      
      for (let i = 0; i < enemyIds.length; i++) {
        const dx = newPositions[i].x - initialPositions[i].x;
        const dz = newPositions[i].z - initialPositions[i].z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        differences.push(distance);
      }
      
      // Different unit types should have different movement patterns
      // This will fail since we don't have type-specific behaviors
      expect(differences[0]).not.toBeCloseTo(differences[1]); // Sniper vs Assault
      expect(differences[1]).not.toBeCloseTo(differences[2]); // Assault vs Support
    });
  });

  describe('AI Retreat Behavior', () => {
    test('should retreat when health is low', () => {
      // Create enemy unit with low health
      const enemyId = entityManager.createEntity();
      entityManager.addComponent(enemyId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(enemyId, 'health', { maxHealth: 100, currentHealth: 20 }); // 20% health
      entityManager.addComponent(enemyId, 'faction', { faction: 'enemy' });
      
      // Add to gameState entities
      gameState.entities.set(enemyId, { position: true, health: true, faction: true });
      
      // Set start position in a different location to see retreat movement
      const startPosition = { x: 20, y: 0, z: 20 };
      
      // Register with AI system
      aiSystem.registerEntity(enemyId);
      
      // Set start position
      aiSystem.aiControlledEntities.get(enemyId).startPosition = startPosition;
      aiSystem.aiControlledEntities.get(enemyId).lastDecisionTime = 1.0;
      
      // Update AI
      aiSystem.update(0.1);
      
      // Enemy should be retreating
      expect(aiSystem.aiControlledEntities.get(enemyId).state).toBe(aiSystem.AI_STATES.RETREAT);
      
      // Enemy should be moving toward start position
      expect(movementSystem.moveEntity).toHaveBeenCalledWith(
        enemyId,
        startPosition,
        expect.any(Number)
      );
    });

    test('should FAIL: use tactical retreat paths avoiding player units', () => {
      // This test is intended to fail to guide development
      // We need smarter retreat paths that avoid enemies
      
      // Create player units in different positions
      const playerPositions = [
        { x: 10, y: 0, z: 0 },
        { x: 0, y: 0, z: 10 },
        { x: -10, y: 0, z: 0 }
      ];
      
      for (let i = 0; i < playerPositions.length; i++) {
        const playerId = entityManager.createEntity();
        entityManager.addComponent(playerId, 'position', playerPositions[i]);
        entityManager.addComponent(playerId, 'health', { maxHealth: 100 });
        entityManager.addComponent(playerId, 'faction', { faction: 'player' });
        gameState.entities.set(playerId, { position: true, health: true, faction: true });
      }
      
      // Create enemy unit with low health
      const enemyId = entityManager.createEntity();
      entityManager.addComponent(enemyId, 'position', { x: 0, y: 0, z: 0 });
      entityManager.addComponent(enemyId, 'health', { maxHealth: 100, currentHealth: 20 });
      entityManager.addComponent(enemyId, 'faction', { faction: 'enemy' });
      gameState.entities.set(enemyId, { position: true, health: true, faction: true });
      
      // Set start position
      const startPosition = { x: 0, y: 0, z: -20 }; // Behind a player unit
      
      // Register with AI system
      aiSystem.registerEntity(enemyId);
      aiSystem.aiControlledEntities.get(enemyId).startPosition = startPosition;
      aiSystem.aiControlledEntities.get(enemyId).lastDecisionTime = 1.0;
      
      // Update AI
      aiSystem.update(0.1);
      
      // Mock findNearestTarget to show awareness of player positions
      jest.spyOn(aiSystem, 'findNearestTarget').mockReturnValue(playerPositions[2]); // Some player
      
      // Update movement several times
      for (let i = 0; i < 10; i++) {
        movementSystem.update(0.1);
      }
      
      // Get enemy position after movement
      const enemyPos = entityManager.getComponent(enemyId, 'position');
      
      // Calculate minimum distance to any player
      let minDistanceToPlayer = Infinity;
      
      for (const playerPos of playerPositions) {
        const dx = playerPos.x - enemyPos.x;
        const dz = playerPos.z - enemyPos.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        minDistanceToPlayer = Math.min(minDistanceToPlayer, distance);
      }
      
      // Enemy should maintain safe distance from players while retreating
      // This will fail since we don't have smart retreat pathing
      expect(minDistanceToPlayer).toBeGreaterThan(15);
    });
  });
});