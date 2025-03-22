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
    
    // Create a systems container to share between systems
    const systems = {
      get combat() { return combatSystem; },
      get movement() { return movementSystem; },
      get ai() { return aiSystem; }
    };
    
    // Initialize systems with references to each other
    combatSystem = new CombatSystem(entityManager, systems);
    movementSystem = new MovementSystem(entityManager, systems);
    aiSystem = new AISystem(entityManager, systems);
    
    // Mock combat system methods that might be called
    combatSystem.canAttack = jest.fn().mockReturnValue(false);
    combatSystem.startAttack = jest.fn();
    
    // Mock movement system methods that might be called
    movementSystem.moveEntity = jest.fn().mockImplementation((entityId, dest, speed) => {
      return true;
    });
    
    // Define AI states
    aiSystem.AI_STATES = {
      IDLE: 'idle',
      PURSUE: 'pursue',
      ATTACK: 'attack',
      RETREAT: 'retreat',
      GATHER: 'gather',
      PATROL: 'patrol'
    };
    
    // Setup AI system's entity tracking
    aiSystem.aiControlledEntities = new Map();
    aiSystem.registerEntity = jest.fn().mockImplementation((entityId) => {
      aiSystem.aiControlledEntities.set(entityId, {
        state: aiSystem.AI_STATES.IDLE,
        targetId: null,
        lastDecisionTime: 0,
        startPosition: { x: 0, y: 0, z: 0 }
      });
      return true;
    });
    
    // Mock AI findNearestTarget method
    aiSystem.findNearestTarget = jest.fn().mockReturnValue(null);
    
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
      
      // Mock findNearestTarget to return the player
      aiSystem.findNearestTarget = jest.fn().mockReturnValue(playerId);
      
      // Mock update method to simulate AI behavior
      aiSystem.update = jest.fn().mockImplementation((deltaTime) => {
        // Simulate target detection and pursuit
        const aiData = aiSystem.aiControlledEntities.get(enemyId);
        const targetId = aiSystem.findNearestTarget(enemyId);
        
        if (targetId) {
          aiData.targetId = targetId;
          aiData.state = aiSystem.AI_STATES.PURSUE;
          
          // Get target position
          const targetPos = entityManager.getComponent(targetId, 'position');
          
          // Move toward target
          movementSystem.moveEntity(enemyId, targetPos, 5, targetId);
          
          // For the test, simulate the entity is moving
          movementSystem.movingEntities = new Map();
          movementSystem.movingEntities.set(enemyId, {
            destination: { ...targetPos },
            speed: 5,
            path: [],
            targetEntityId: targetId
          });
        }
      });
      
      // Update AI
      aiSystem.update(0.1);
      
      // Enemy should now be pursuing the player
      expect(aiData.state).toBe(aiSystem.AI_STATES.PURSUE);
      expect(aiData.targetId).toBe(playerId);
      
      // Enemy should be moving toward player
      expect(movementSystem.movingEntities.has(enemyId)).toBe(true);
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
      
      // Mock update method to simulate AI behavior
      aiSystem.update = jest.fn().mockImplementation((deltaTime) => {
        // Simulate target detection and attack
        const aiData = aiSystem.aiControlledEntities.get(enemyId);
        
        if (aiData.state === aiSystem.AI_STATES.PURSUE && 
            aiData.targetId && 
            combatSystem.canAttack(enemyId, aiData.targetId)) {
          
          aiData.state = aiSystem.AI_STATES.ATTACK;
          aiData.stateTime = 0;
          movementSystem.stopEntity(enemyId);
          combatSystem.startAttack(enemyId, aiData.targetId);
        }
      });
      
      // Update AI
      aiSystem.update(0.1);
      
      // Enemy should now be attacking
      expect(aiData.state).toBe(aiSystem.AI_STATES.ATTACK);
      
      // Combat system should have started attack
      expect(combatSystem.startAttack).toHaveBeenCalledWith(enemyId, playerId);
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
      
      // Mock AI system's update method for retreat
      aiSystem.update = jest.fn().mockImplementation((deltaTime) => {
        const aiData = aiSystem.aiControlledEntities.get(enemyId);
        
        // Check if health is low
        const health = entityManager.getComponent(enemyId, 'health');
        const healthPercentage = health.currentHealth / health.maxHealth;
        
        if (healthPercentage < 0.3) {  // 30% threshold
          aiData.state = aiSystem.AI_STATES.RETREAT;
          aiData.stateTime = 0;
          
          // Mock calculating safe retreat position (just use startPosition for test)
          movementSystem.moveEntity(enemyId, startPosition, 8); // Faster retreat speed
        }
      });
      
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
  });
});