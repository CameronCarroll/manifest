class CombatSystem {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.attackingEntities = new Map(); // Maps entityId to attack data
    this.attackCooldowns = new Map(); // Maps entityId to cooldown time
    this.DEFAULT_ATTACK_RANGE = 5;
    this.DEFAULT_ATTACK_COOLDOWN = 1; // 1 second between attacks
  }

  initialize() {
    // Initialize system if needed
  }

  // Start an attack from one entity to another
  startAttack(attackerId, targetId) {
    if (!this.canAttack(attackerId, targetId)) {
      return false;
    }

    const attackerFaction = this.entityManager.getComponent(attackerId, 'faction');
    const targetFaction = this.entityManager.getComponent(targetId, 'faction');

    // Only allow attacks between different factions
    if (attackerFaction.faction === targetFaction.faction) {
      return false;
    }

    // Set up the attack data
    this.attackingEntities.set(attackerId, {
      targetId: targetId,
      attackType: attackerFaction.attackType || 'ranged',
      damageType: attackerFaction.damageType || 'normal'
    });

    return true;
  }

  // Stop an entity from attacking
  stopAttack(entityId) {
    return this.attackingEntities.delete(entityId);
  }

  // Check if an entity can attack another
  canAttack(attackerId, targetId) {
    // Check if attacker and target exist and have required components
    if (!this.entityManager.hasComponent(attackerId, 'position') ||
        !this.entityManager.hasComponent(attackerId, 'faction') ||
        !this.entityManager.hasComponent(targetId, 'position') ||
        !this.entityManager.hasComponent(targetId, 'faction') ||
        !this.entityManager.hasComponent(targetId, 'health')) {
      return false;
    }

    // Check if attacker is on cooldown
    if (this.attackCooldowns.has(attackerId)) {
      return false;
    }

    // Check if target is in range
    const attackerPos = this.entityManager.getComponent(attackerId, 'position');
    const targetPos = this.entityManager.getComponent(targetId, 'position');
    
    const dx = targetPos.x - attackerPos.x;
    const dz = targetPos.z - attackerPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Get attacker's attack range (could be based on unit type or weapon)
    const attackerFaction = this.entityManager.getComponent(attackerId, 'faction');
    const attackRange = this.getAttackRange(attackerFaction.unitType, attackerFaction.attackType);
    
    return distance <= attackRange;
  }

  // Get attack range based on unit type and attack type
  getAttackRange(unitType, attackType) {
    // Different unit types and attack types have different ranges
    if (attackType === 'melee') {
      return 1.5; // Melee range
    }
    
    // Unit type specific ranges for ranged attacks
    switch (unitType) {
      case 'sniper':
        return 15;
      case 'assault':
        return 7;
      case 'support':
        return 10;
      default:
        return this.DEFAULT_ATTACK_RANGE;
    }
  }

  // Calculate damage based on attacker and defender stats
  calculateDamage(attackerId, targetId, attackType, damageType) {
    // Base damage depends on unit type
    const attackerFaction = this.entityManager.getComponent(attackerId, 'faction');
    let baseDamage = 10; // Default damage
    
    switch (attackerFaction.unitType) {
      case 'assault':
        baseDamage = 15;
        break;
      case 'sniper':
        baseDamage = 25;
        break;
      case 'support':
        baseDamage = 5;
        break;
      default:
        baseDamage = 10;
    }
    
    // Apply critical hit chance (20% chance for 50% more damage)
    const isCritical = Math.random() < 0.2;
    if (isCritical) {
      baseDamage *= 1.5;
    }
    
    // Apply damage type modifiers
    const targetFaction = this.entityManager.getComponent(targetId, 'faction');
    const targetHealth = this.entityManager.getComponent(targetId, 'health');
    
    // Apply armor reduction
    let finalDamage = baseDamage - targetHealth.armor;
    if (finalDamage < 1) finalDamage = 1; // Minimum damage of 1
    
    return {
      damage: finalDamage,
      isCritical: isCritical
    };
  }

  // Apply damage to a target
  applyDamage(targetId, damageInfo) {
    if (!this.entityManager.hasComponent(targetId, 'health')) {
      return false;
    }
    
    const healthComponent = this.entityManager.getComponent(targetId, 'health');
    
    // Apply damage
    healthComponent.currentHealth -= damageInfo.damage;
    
    // Check if target is destroyed
    if (healthComponent.currentHealth <= 0) {
      healthComponent.currentHealth = 0;
      // Could trigger death event or remove entity here
      // this.entityManager.removeEntity(targetId);
      return true; // Target destroyed
    }
    
    return false; // Target still alive
  }

  update(deltaTime) {
    // Update cooldowns
    this.attackCooldowns.forEach((cooldown, entityId) => {
      cooldown -= deltaTime;
      if (cooldown <= 0) {
        this.attackCooldowns.delete(entityId);
      } else {
        this.attackCooldowns.set(entityId, cooldown);
      }
    });
    
    // Process all attacking entities
    this.attackingEntities.forEach((attackData, attackerId) => {
      const targetId = attackData.targetId;
      
      // Skip if attacker or target no longer exists
      if (!this.entityManager.hasComponent(attackerId, 'position') ||
          !this.entityManager.hasComponent(targetId, 'position') ||
          !this.entityManager.hasComponent(targetId, 'health')) {
        this.stopAttack(attackerId);
        return;
      }
      
      // Check if target is in range
      if (!this.canAttack(attackerId, targetId)) {
        // If attacker is not on cooldown, it means target is out of range
        if (!this.attackCooldowns.has(attackerId)) {
          // Could trigger movement to get in range here
          // this.systems.movement.moveEntity(attackerId, targetPos, speed);
        }
        return;
      }
      
      // If not on cooldown, perform attack
      if (!this.attackCooldowns.has(attackerId)) {
        // Calculate damage
        const damageInfo = this.calculateDamage(
          attackerId, 
          targetId, 
          attackData.attackType, 
          attackData.damageType
        );
        
        // Apply damage to target
        const targetDestroyed = this.applyDamage(targetId, damageInfo);
        
        // Set cooldown for next attack
        const attackerFaction = this.entityManager.getComponent(attackerId, 'faction');
        let cooldown = this.DEFAULT_ATTACK_COOLDOWN;
        
        // Different unit types have different attack speeds
        switch (attackerFaction.unitType) {
          case 'assault':
            cooldown = 0.8;
            break;
          case 'sniper':
            cooldown = 2.0;
            break;
          case 'support':
            cooldown = 1.5;
            break;
        }
        
        this.attackCooldowns.set(attackerId, cooldown);
        
        // If target was destroyed, stop attacking
        if (targetDestroyed) {
          this.stopAttack(attackerId);
        }
      }
    });
  }

  // For serialization
  serialize() {
    return {
      attackingEntities: Array.from(this.attackingEntities.entries()),
      attackCooldowns: Array.from(this.attackCooldowns.entries())
    };
  }

  // For deserialization
  deserialize(data) {
    this.attackingEntities = new Map(data.attackingEntities);
    this.attackCooldowns = new Map(data.attackCooldowns);
  }
}

export default CombatSystem;
