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
      
      // Get safe retreat position
      const safeRetreatPosition = this.calculateSafeRetreatPosition(entityId);
      
      // Move back to start position with increased speed
      this.movementSystem.moveEntity(entityId, safeRetreatPosition, 8); // Faster retreat speed
      return;
    }
    
    // Enhanced state machine logic
    switch (aiData.state) {
      case this.AI_STATES.IDLE:
        // In idle state, check for targets and occasionally start patrolling
        const target = this.findNearestTarget(entityId);
        if (target) {
          aiData.targetId = target;
          aiData.state = this.AI_STATES.PURSUE;
          aiData.stateTime = 0;
        } else if (aiData.stateTime > 3 + Math.random() * 2) {
          aiData.state = this.AI_STATES.PATROL;
          aiData.stateTime = 0;
          aiData.patrolPoint = this.getRandomPatrolPoint(entityId);
          
          if (aiData.patrolPoint) {
            this.movementSystem.moveEntity(entityId, aiData.patrolPoint, 3);
          }
        }
        break;
        
      case this.AI_STATES.PATROL:
        // Check if we've reached patrol point or found a target
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
        
        // Get the faction component to determine unit type
        const factionComp = this.entityManager.getComponent(entityId, 'faction');
        const unitType = factionComp ? factionComp.unitType : 'basic';
        
        // Different behavior based on unit type
        let pursuitSpeed = 5;
        let maintainDistance = 0;
        
        switch (unitType) {
          case 'sniper':
            pursuitSpeed = 3;
            maintainDistance = 12; // Snipers stay far back
            break;
          case 'assault':
            pursuitSpeed = 6;
            maintainDistance = 0; // Assault units get close
            break;
          case 'support':
            pursuitSpeed = 4;
            maintainDistance = 8; // Support units stay at medium range
            break;
          case 'heavy':
            pursuitSpeed = 3.5;
            maintainDistance = 0; // Heavy units get close
            break;
          case 'specialist':
            pursuitSpeed = 5;
            maintainDistance = 5; // Specialists at medium-close range
            break;
        }
        
        // Check if target is in attack range
        if (this.combatSystem.canAttack(entityId, aiData.targetId)) {
          aiData.state = this.AI_STATES.ATTACK;
          aiData.stateTime = 0;
          this.movementSystem.stopEntity(entityId);
          this.combatSystem.startAttack(entityId, aiData.targetId);
        } else {
          // Calculate pursuit position with formation spacing
          const targetPosition = this.entityManager.getComponent(aiData.targetId, 'position');
          
          if (targetPosition) {
            // If unit should maintain distance, calculate position
            let pursuePosX = targetPosition.x;
            let pursuePosZ = targetPosition.z;
            
            if (maintainDistance > 0) {
              // Get current position
              const currentPos = this.entityManager.getComponent(entityId, 'position');
              
              // Calculate direction vector from target to unit
              const dx = currentPos.x - targetPosition.x;
              const dz = currentPos.z - targetPosition.z;
              const dist = Math.sqrt(dx * dx + dz * dz);
              
              if (dist > 0) {
                // Normalize direction vector
                const dirX = dx / dist;
                const dirZ = dz / dist;
                
                // Calculate position at desired distance
                pursuePosX = targetPosition.x + dirX * maintainDistance;
                pursuePosZ = targetPosition.z + dirZ * maintainDistance;
              }
            }
            
            // Apply formation spacing
            const pursuePosition = {
              x: pursuePosX,
              y: targetPosition.y,
              z: pursuePosZ
            };
            
            const formationPosition = this.calculateFormationPosition(entityId, pursuePosition);
            
            // Move toward target position
            this.movementSystem.moveEntity(entityId, formationPosition, pursuitSpeed, aiData.targetId);
          }
          
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
        
        // Calculate distance to the safe retreat position
        const safePosition = this.calculateSafeRetreatPosition(entityId);
        const dx = safePosition.x - retreatPosition.x;
        const dz = safePosition.z - retreatPosition.z;
        const distanceToRetreat = Math.sqrt(dx * dx + dz * dz);
        
        // If close to the retreat point, or have been retreating too long
        if (distanceToRetreat < 1 || aiData.stateTime > 10) {
          // Either reached safe point or took too long
          aiData.state = this.AI_STATES.IDLE;
          aiData.stateTime = 0;
          this.movementSystem.stopEntity(entityId);
          
          // Regenerate some health if we have a health component
          if (this.entityManager.hasComponent(entityId, 'health')) {
            const health = this.entityManager.getComponent(entityId, 'health');
            health.currentHealth = Math.min(health.maxHealth, health.currentHealth + health.maxHealth * 0.3);
          }
        } else if (aiData.stateTime % 2 < 0.1) {
          // Periodically update retreat path to avoid players
          const newSafePosition = this.calculateSafeRetreatPosition(entityId);
          this.movementSystem.moveEntity(entityId, newSafePosition, 8);
        }
        break;
        
      case this.AI_STATES.SUPPORT:
        // Support behavior for support units
        if (!aiData.targetId || !this.entityManager.hasComponent(aiData.targetId, 'position')) {
          // Find friendly unit to support
          const friendlyUnit = this.findFriendlyToSupport(entityId);
          if (friendlyUnit) {
            aiData.targetId = friendlyUnit;
            
            // Move to support position
            const friendlyPos = this.entityManager.getComponent(friendlyUnit, 'position');
            const supportPos = {
              x: friendlyPos.x + (Math.random() * 4 - 2), // Random offset 
              y: friendlyPos.y,
              z: friendlyPos.z + (Math.random() * 4 - 2)  // Random offset
            };
            
            this.movementSystem.moveEntity(entityId, supportPos, 4);
          } else {
            // No one to support, go back to idle
            aiData.state = this.AI_STATES.IDLE;
            aiData.stateTime = 0;
          }
        }
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

  calculateFormationPosition(entityId, basePosition) {
    // Get count of nearby friendly units
    const position = this.entityManager.getComponent(entityId, 'position');
    if (!position) return basePosition;
    
    let nearbyCount = 0;
    let offsetX = 0;
    let offsetZ = 0;
    
    // Check all AI-controlled entities for nearby friends
    this.aiControlledEntities.forEach((data, otherEntityId) => {
      if (entityId !== otherEntityId) {
        const otherPos = this.entityManager.getComponent(otherEntityId, 'position');
        if (otherPos) {
          const dx = position.x - otherPos.x;
          const dz = position.z - otherPos.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < 5) {
            // Apply repulsion vector - stronger for closer units
            const repulsionForce = 2.5 * (1 - (distance / 5));
            
            // Normalize direction
            const length = Math.max(0.1, Math.sqrt(dx * dx + dz * dz));
            const dirX = dx / length;
            const dirZ = dz / length;
            
            // Add to offset with some randomness for natural movement
            offsetX += dirX * repulsionForce * (0.8 + Math.random() * 0.4);
            offsetZ += dirZ * repulsionForce * (0.8 + Math.random() * 0.4);
            nearbyCount++;
          }
        }
      }
    });
    
    // Apply formation offset to base position if there are nearby units
    if (nearbyCount > 0) {
      // Add a slight random offset for more natural movement
      const randX = (Math.random() * 2 - 1) * 0.5;
      const randZ = (Math.random() * 2 - 1) * 0.5;
      
      const formationPosition = {
        x: basePosition.x + offsetX + randX,
        y: basePosition.y,
        z: basePosition.z + offsetZ + randZ
      };
      return formationPosition;
    }
    
    return basePosition;
  }

  calculateSafeRetreatPosition(entityId) {
    const position = this.entityManager.getComponent(entityId, 'position');
    const aiData = this.aiControlledEntities.get(entityId);
    
    if (!position || !aiData) {
      return aiData ? aiData.startPosition : { x: 0, y: 0, z: 0 };
    }
    
    // Find player units
    const playerUnits = [];
    this.entityManager.gameState.entities.forEach((entity, id) => {
      if (this.entityManager.hasComponent(id, 'faction') && 
          this.entityManager.hasComponent(id, 'position')) {
        const faction = this.entityManager.getComponent(id, 'faction');
        if (faction.faction === 'player') {
          playerUnits.push({
            id,
            position: this.entityManager.getComponent(id, 'position')
          });
        }
      }
    });
    
    // If no player units found, just return start position
    if (playerUnits.length === 0) {
      return aiData.startPosition;
    }
    
    // Calculate vector to start position
    let retreatX = aiData.startPosition.x - position.x;
    let retreatZ = aiData.startPosition.z - position.z;
    
    // Normalize base retreat vector
    const baseLength = Math.sqrt(retreatX * retreatX + retreatZ * retreatZ);
    if (baseLength > 0.001) {
      retreatX = retreatX / baseLength;
      retreatZ = retreatZ / baseLength;
    } else {
      // If somehow at start position, retreat in a random direction
      const angle = Math.random() * Math.PI * 2;
      retreatX = Math.cos(angle);
      retreatZ = Math.sin(angle);
    }
    
    // Add weighted avoidance vectors from all player units
    playerUnits.forEach(unit => {
      const dx = position.x - unit.position.x;
      const dz = position.z - unit.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < 25) { // Only avoid nearby players
        // Stronger avoidance for closer units
        const avoidanceStrength = 15 / Math.max(1, distance);
        
        // Normalize avoidance vector
        const avoidLength = Math.max(0.001, distance);
        const avoidX = dx / avoidLength;
        const avoidZ = dz / avoidLength;
        
        // Add to retreat vector
        retreatX += avoidX * avoidanceStrength;
        retreatZ += avoidZ * avoidanceStrength;
      }
    });
    
    // Normalize and scale the final retreat vector
    const length = Math.sqrt(retreatX * retreatX + retreatZ * retreatZ);
    if (length > 0.001) {
      retreatX = retreatX / length * 20; // Scale to reasonable distance
      retreatZ = retreatZ / length * 20;
    }
    
    return {
      x: position.x + retreatX,
      y: position.y,
      z: position.z + retreatZ
    };
  }
  
  // Add method to find friendly units to support
  findFriendlyToSupport(entityId) {
    if (!this.entityManager.hasComponent(entityId, 'position') ||
        !this.entityManager.hasComponent(entityId, 'faction')) {
      return null;
    }
    
    const position = this.entityManager.getComponent(entityId, 'position');
    const faction = this.entityManager.getComponent(entityId, 'faction');
    
    let bestTarget = null;
    let bestScore = -Infinity;
    
    // Check all entities with position, health, and faction components
    this.entityManager.gameState.entities.forEach((entity, potentialTargetId) => {
      if (potentialTargetId === entityId) return; // Skip self
      
      if (this.entityManager.hasComponent(potentialTargetId, 'position') &&
          this.entityManager.hasComponent(potentialTargetId, 'health') &&
          this.entityManager.hasComponent(potentialTargetId, 'faction')) {
        
        const targetFaction = this.entityManager.getComponent(potentialTargetId, 'faction');
        
        // Only target friendly entities
        if (targetFaction.faction === faction.faction) {
          const targetPosition = this.entityManager.getComponent(potentialTargetId, 'position');
          const targetHealth = this.entityManager.getComponent(potentialTargetId, 'health');
          
          // Calculate distance
          const dx = targetPosition.x - position.x;
          const dz = targetPosition.z - position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          // Prioritize units that are:
          // 1. In combat
          // 2. Low on health
          // 3. Not too far away
          
          // Check if unit is in combat
          const inCombat = this.combatSystem.attackingEntities.has(potentialTargetId);
          
          // Calculate health percentage
          const healthPercentage = targetHealth.currentHealth / targetHealth.maxHealth;
          
          // Score based on these factors
          const distanceScore = Math.max(0, 30 - distance);
          const healthScore = (1 - healthPercentage) * 20;
          const combatScore = inCombat ? 15 : 0;
          
          const totalScore = distanceScore + healthScore + combatScore;
          
          if (totalScore > bestScore && distance < this.DETECTION_RANGE * 1.5) {
            bestScore = totalScore;
            bestTarget = potentialTargetId;
          }
        }
      }
    });
    
    return bestTarget;
  }
}

export default AISystem;
