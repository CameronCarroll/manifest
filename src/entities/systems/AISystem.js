class AISystem {
  constructor(entityManager, combatSystem, movementSystem) {
    this.entityManager = entityManager;
    this.combatSystem = combatSystem;
    this.movementSystem = movementSystem;
    this.aiControlledEntities = new Map(); // Maps entityId to AI state data
    
    // AI States
    this.AI_STATES = {
      IDLE: 'idle',
      PATROL: 'patrol',
      PURSUE: 'pursue',
      ATTACK: 'attack',
      RETREAT: 'retreat',
      SUPPORT: 'support'
    };
    
    // Detection range for enemies
    this.DETECTION_RANGE = 15;
    
    // Retreat health threshold (percentage)
    this.RETREAT_THRESHOLD = 0.3;
  }

  initialize() {
    // Initialize system if needed
  }

  // Register an entity for AI control
  registerEntity(entityId, aiType = 'basic') {
    if (!this.entityManager.hasComponent(entityId, 'position') ||
        !this.entityManager.hasComponent(entityId, 'faction')) {
      return false;
    }
    
    const factionComponent = this.entityManager.getComponent(entityId, 'faction');
    
    // Only register non-player entities
    if (factionComponent.faction === 'player') {
      return false;
    }
    
    // Set up AI state based on unit type
    let patrolRadius = 10;
    let aggressiveness = 0.5;
    
    switch (factionComponent.unitType) {
      case 'assault':
        patrolRadius = 15;
        aggressiveness = 0.8;
        break;
      case 'sniper':
        patrolRadius = 20;
        aggressiveness = 0.3;
        break;
      case 'support':
        patrolRadius = 8;
        aggressiveness = 0.2;
        break;
      case 'heavy':
        patrolRadius = 12;
        aggressiveness = 0.7;
        break;
      case 'specialist':
        patrolRadius = 18;
        aggressiveness = 0.6;
        break;
    }
    
    // Get starting position for patrol
    const positionComponent = this.entityManager.getComponent(entityId, 'position');
    const startPosition = {
      x: positionComponent.x,
      y: positionComponent.y,
      z: positionComponent.z
    };
    
    // Register entity with initial state
    this.aiControlledEntities.set(entityId, {
      state: this.AI_STATES.IDLE,
      aiType: aiType,
      startPosition: startPosition,
      patrolRadius: patrolRadius,
      aggressiveness: aggressiveness,
      targetId: null,
      patrolPoint: null,
      stateTime: 0, // Time spent in current state
      lastDecisionTime: 0 // Time since last decision
    });
    
    return true;
  }

  // Unregister an entity from AI control
  unregisterEntity(entityId) {
    return this.aiControlledEntities.delete(entityId);
  }

  // Find nearest target for an AI entity
  findNearestTarget(entityId) {
    if (!this.entityManager.hasComponent(entityId, 'position') ||
        !this.entityManager.hasComponent(entityId, 'faction')) {
      return null;
    }
    
    const position = this.entityManager.getComponent(entityId, 'position');
    const faction = this.entityManager.getComponent(entityId, 'faction');
    
    let nearestTarget = null;
    let nearestDistance = Infinity;
    
    // Check all entities with position, health, and faction components
    this.entityManager.gameState.entities.forEach((entity, potentialTargetId) => {
      if (potentialTargetId === entityId) return; // Skip self
      
      if (this.entityManager.hasComponent(potentialTargetId, 'position') &&
          this.entityManager.hasComponent(potentialTargetId, 'health') &&
          this.entityManager.hasComponent(potentialTargetId, 'faction')) {
        
        const targetFaction = this.entityManager.getComponent(potentialTargetId, 'faction');
        
        // Only target entities of different factions
        if (targetFaction.faction !== faction.faction) {
          const targetPosition = this.entityManager.getComponent(potentialTargetId, 'position');
          
          // Calculate distance
          const dx = targetPosition.x - position.x;
          const dz = targetPosition.z - position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          // Check if this is the nearest target within detection range
          if (distance < nearestDistance && distance <= this.DETECTION_RANGE) {
            nearestDistance = distance;
            nearestTarget = potentialTargetId;
          }
        }
      }
    });
    
    return nearestTarget;
  }

  // Generate a random patrol point around the start position
  getRandomPatrolPoint(entityId) {
    const aiData = this.aiControlledEntities.get(entityId);
    if (!aiData) return null;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * aiData.patrolRadius;
    
    return {
      x: aiData.startPosition.x + Math.cos(angle) * distance,
      y: aiData.startPosition.y,
      z: aiData.startPosition.z + Math.sin(angle) * distance
    };
  }

  // Check if entity should retreat based on health
  shouldRetreat(entityId) {
    if (!this.entityManager.hasComponent(entityId, 'health')) {
      return false;
    }
    
    const health = this.entityManager.getComponent(entityId, 'health');
    return (health.currentHealth / health.maxHealth) < this.RETREAT_THRESHOLD;
  }

  // Update AI state for an entity
  updateEntityState(entityId, deltaTime) {
    const aiData = this.aiControlledEntities.get(entityId);
    if (!aiData) return;
    
    // Update state time
    aiData.stateTime += deltaTime;
    aiData.lastDecisionTime += deltaTime;
    
    // Only make decisions periodically to avoid jitter
    if (aiData.lastDecisionTime < 0.5) return;
    
    // Reset decision timer
    aiData.lastDecisionTime = 0;
    
    // Check if entity should retreat
    if (this.shouldRetreat(entityId) && aiData.state !== this.AI_STATES.RETREAT) {
      aiData.state = this.AI_STATES.RETREAT;
      aiData.stateTime = 0;
      
      // Move back to start position
      this.movementSystem.moveEntity(entityId, aiData.startPosition, 8); // Faster retreat speed
      return;
    }
    
    // State machine logic
    switch (aiData.state) {
      case this.AI_STATES.IDLE:
        // In idle state, occasionally start patrolling
        if (aiData.stateTime > 3 + Math.random() * 2) {
          aiData.state = this.AI_STATES.PATROL;
          aiData.stateTime = 0;
          aiData.patrolPoint = this.getRandomPatrolPoint(entityId);
          
          if (aiData.patrolPoint) {
            this.movementSystem.moveEntity(entityId, aiData.patrolPoint, 3);
          }
        }
        
        // Check for targets while idle
        const target = this.findNearestTarget(entityId);
        if (target) {
          aiData.targetId = target;
          aiData.state = this.AI_STATES.PURSUE;
          aiData.stateTime = 0;
        }
        break;
        
      case this.AI_STATES.PATROL:
        // Check if we've reached patrol point
        const position = this.entityManager.getComponent(entityId, 'position');
        if (aiData.patrolPoint) {
          const dx = aiData.patrolPoint.x - position.x;
          const dz = aiData.patrolPoint.z - position.z;
          const distanceToPatrolPoint = Math.sqrt(dx * dx + dz * dz);
          
          if (distanceToPatrolPoint < 1 || aiData.stateTime > 10) {
            // Either reached point or took too long, go back to idle
            aiData.state = this.AI_STATES.IDLE;
            aiData.stateTime = 0;
            this.movementSystem.stopEntity(entityId);
          }
        }
        
        // Check for targets while patrolling
        const patrolTarget = this.findNearestTarget(entityId);
        if (patrolTarget) {
          aiData.targetId = patrolTarget;
          aiData.state = this.AI_STATES.PURSUE;
          aiData.stateTime = 0;
        }
        break;
        
      case this.AI_STATES.PURSUE:
        // Make sure target still exists
        if (!aiData.targetId || !this.entityManager.hasComponent(aiData.targetId, 'position')) {
          aiData.state = this.AI_STATES.IDLE;
          aiData.stateTime = 0;
          aiData.targetId = null;
          break;
        }
        
        // Check if target is in attack range
        if (this.combatSystem.canAttack(entityId, aiData.targetId)) {
          aiData.state = this.AI_STATES.ATTACK;
          aiData.stateTime = 0;
          this.movementSystem.stopEntity(entityId);
          this.combatSystem.startAttack(entityId, aiData.targetId);
        } else {
          // Move toward target
          const targetPosition = this.entityManager.getComponent(aiData.targetId, 'position');
          this.movementSystem.moveEntity(entityId, targetPosition, 5);
          
          // If pursuit takes too long, give up
          if (aiData.stateTime > 15) {
            aiData.state = this.AI_STATES.PATROL;
            aiData.stateTime = 0;
            aiData.targetId = null;
            aiData.patrolPoint = this.getRandomPatrolPoint(entityId);
            
            if (aiData.patrolPoint) {
              this.movementSystem.moveEntity(entityId, aiData.patrolPoint, 3);
            }
          }
        }
        break;
        
      case this.AI_STATES.ATTACK:
        // Make sure target still exists
        if (!aiData.targetId || !this.entityManager.hasComponent(aiData.targetId, 'position') ||
            !this.entityManager.hasComponent(aiData.targetId, 'health')) {
          aiData.state = this.AI_STATES.IDLE;
          aiData.stateTime = 0;
          aiData.targetId = null;
          this.combatSystem.stopAttack(entityId);
          break;
        }
        
        // Check if target is still in range
        if (!this.combatSystem.canAttack(entityId, aiData.targetId)) {
          aiData.state = this.AI_STATES.PURSUE;
          aiData.stateTime = 0;
          this.combatSystem.stopAttack(entityId);
        }
        
        // Check if target is dead
        const targetHealth = this.entityManager.getComponent(aiData.targetId, 'health');
        if (targetHealth.currentHealth <= 0) {
          aiData.state = this.AI_STATES.IDLE;
          aiData.stateTime = 0;
          aiData.targetId = null;
          this.combatSystem.stopAttack(entityId);
        }
        break;
        
      case this.AI_STATES.RETREAT:
        // Check if we've reached the retreat point (start position)
        const retreatPosition = this.entityManager.getComponent(entityId, 'position');
        const dx = aiData.startPosition.x - retreatPosition.x;
        const dz = aiData.startPosition.z - retreatPosition.z;
        const distanceToRetreat = Math.sqrt(dx * dx + dz * dz);
        
        if (distanceToRetreat < 1 || aiData.stateTime > 10) {
          // Either reached point or took too long
          aiData.state = this.AI_STATES.IDLE;
          aiData.stateTime = 0;
          this.movementSystem.stopEntity(entityId);
          
          // Regenerate some health if we have a health component
          if (this.entityManager.hasComponent(entityId, 'health')) {
            const health = this.entityManager.getComponent(entityId, 'health');
            health.currentHealth = Math.min(health.maxHealth, health.currentHealth + health.maxHealth * 0.3);
          }
        }
        break;
        
      case this.AI_STATES.SUPPORT:
        // Support behavior for support units (not fully implemented)
        aiData.state = this.AI_STATES.IDLE;
        aiData.stateTime = 0;
        break;
    }
  }

  update(deltaTime) {
    // Update all AI-controlled entities
    this.aiControlledEntities.forEach((aiData, entityId) => {
      // Skip if entity no longer exists
      if (!this.entityManager.hasComponent(entityId, 'position')) {
        this.unregisterEntity(entityId);
        return;
      }
      
      this.updateEntityState(entityId, deltaTime);
    });
  }

  // For serialization
  serialize() {
    return Array.from(this.aiControlledEntities.entries());
  }

  // For deserialization
  deserialize(data) {
    this.aiControlledEntities = new Map(data);
  }
}

export default AISystem;
