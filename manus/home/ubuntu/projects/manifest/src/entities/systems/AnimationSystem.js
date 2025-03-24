// src/entities/systems/AnimationSystem.js - Refactored version
import * as THREE from 'three';
import AnimationFactory from '../../utils/AnimationFactory.js';

class AnimationSystem {
  constructor(entityManager, systems) {
    this.entityManager = entityManager;
    this.systems = systems;
    this.animatingEntities = new Map(); // Maps entityId to animation data
    this.animationFactory = null;
    
    // Animation states
    this.STATES = {
      IDLE: 'idle',
      ATTACK_WINDUP: 'attack_windup',
      ATTACK_STRIKE: 'attack_strike',
      ATTACK_RECOVERY: 'attack_recovery'
    };
    
    // Effects cache
    this.effectsCache = new Map();
    
    // Debug flag - set to true to see detailed logs
    this.debug = false;
  }

  initialize() {
    if (this.debug) {console.log('AnimationSystem: initializing');}
    
    const { scene } = this.systems.sceneManager.getActiveScene();
    if (scene) {
      // Initialize animation factory
      this.animationFactory = new AnimationFactory(scene);
      
      if (this.debug) {
        console.log('AnimationSystem: Animation factory created');
      }
    }
    
    // Subscribe to combat events
    if (this.systems.combat) {
      // Store original startAttack method
      const originalStartAttack = this.systems.combat.startAttack;
      
      // Override with our version that triggers animations
      this.systems.combat.startAttack = (attackerId, targetId) => {
        const result = originalStartAttack.call(this.systems.combat, attackerId, targetId);
        if (result) {
          if (this.debug) {console.log(`AnimationSystem: Starting attack animation for ${attackerId} targeting ${targetId}`);}
          this.startAttackAnimation(attackerId, targetId);
        } else {
          if (this.debug) {console.log(`AnimationSystem: Attack failed for ${attackerId} targeting ${targetId}`);}
        }
        return result;
      };
    }
  }
  
  // Start attack animation for an entity
  startAttackAnimation(entityId, targetId, isTargeting = false) {
    if (!this.entityManager.hasComponent(entityId, 'position') ||
        !this.entityManager.hasComponent(entityId, 'faction')) {
      if (this.debug) {console.log(`AnimationSystem: Missing components for entity ${entityId}`);}
      return false;
    }
    
    // If this is just targeting (not actual attack), either skip animation completely
    // or mark the animation as targeting-only to prevent visual effects
    if (isTargeting) {
      if (this.debug) {console.log(`AnimationSystem: Skipping or marking targeting-only animation for ${targetId}`);}
      
      // Store minimal animation data with isTargeting flag to prevent visual effects
      this.animatingEntities.set(entityId, {
        targetId: targetId,
        isTargeting: true,
        stateTime: 0,
        damageEffectApplied: true // Prevent damage effects
      });
      
      return true;
    }
    
    // Get the faction component to determine attack type
    const factionComponent = this.entityManager.getComponent(entityId, 'faction');
    if (!factionComponent) {
      if (this.debug) {console.log(`AnimationSystem: No faction component for entity ${entityId}`);}
      return false;
    }
    
    const attackType = factionComponent.attackType || 'ranged';
    
    // Get unit type from UnitType component if available, otherwise from faction component
    let unitType = 'basic';
    if (this.entityManager.hasComponent(entityId, 'unitType')) {
      unitType = this.entityManager.getComponent(entityId, 'unitType').type;
    } else {
      unitType = factionComponent.unitType || 'basic';
    }
    
    if (this.debug) {console.log(`AnimationSystem: Entity ${entityId} (${unitType}) using ${attackType} attack`);}
    
    // Handle different attack types
    if (attackType === 'melee') {
      this.startMeleeAttackAnimation(entityId, targetId, unitType);
    } else {
      this.startRangedAttackAnimation(entityId, targetId, unitType);
    }
    
    return true;
  }
  
  // Start melee attack animation (summoned weapon)
  startMeleeAttackAnimation(entityId, targetId, unitType) {
    if (this.debug) {console.log(`AnimationSystem: Starting melee attack for ${entityId} (${unitType})`);}
    
    // Animation timeline:
    // 1. Windup (0.2s) - Summoning the weapon
    // 2. Strike (0.3s) - Attacking with the weapon
    // 3. Recovery (0.2s) - Weapon dissipating
    
    this.animatingEntities.set(entityId, {
      state: this.STATES.ATTACK_WINDUP,
      targetId: targetId,
      stateTime: 0,
      totalAnimationTime: 0,
      attackType: 'melee',
      unitType: unitType,
      weaponMesh: null,
      particleSystem: null,
      damageEffectApplied: false,
      // Timing configuration
      phaseTimings: {
        windup: 0.2,  // seconds
        strike: 0.3,  // seconds
        recovery: 0.2 // seconds
      }
    });
    
    // If we already have a weapon animation in progress for this entity, remove it first
    this.cleanupExistingWeapon(entityId);
    
    // Create weapon effect using animation factory if available
    if (this.animationFactory) {
      const mesh = this.systems.render?.meshes.get(entityId);
      if (mesh) {
        // Set the entity's animation state to 'attacking'
        this.animationFactory.setEntityState(entityId, 'attacking', {
          targetId: targetId,
          attackType: 'melee',
          unitType: unitType
        });
      }
    } else {
      // Fall back to original weapon creation if animation factory not available
      this.createMeleeWeapon(entityId, targetId, unitType);
    }
  }
  
  // Clean up any existing weapon for an entity
  cleanupExistingWeapon(entityId) {
    const entityMesh = this.systems.render?.meshes.get(entityId);
    if (!entityMesh) {return;}
    
    // Find and remove any existing weapon meshes
    entityMesh.traverse(child => {
      if (child.userData.isWeapon) {
        entityMesh.remove(child);
      }
    });
    
    // Clean up any existing particle systems
    const animData = this.animatingEntities.get(entityId);
    if (animData && animData.particleSystem) {
      entityMesh.remove(animData.particleSystem);
      animData.particleSystem = null;
    }
  }
  
  // Start ranged attack animation (projectile)
  startRangedAttackAnimation(entityId, targetId, unitType) {
    if (this.debug) {console.log(`AnimationSystem: Starting ranged attack for ${entityId} (${unitType})`);}
    
    // Animation timeline:
    // 1. Windup (0.2s) - Charging the projectile
    // 2. Strike (0.1s) - Releasing the projectile
    // 3. Recovery (0.1s) - Reset stance
    
    this.animatingEntities.set(entityId, {
      state: this.STATES.ATTACK_WINDUP,
      targetId: targetId,
      stateTime: 0,
      totalAnimationTime: 0,
      attackType: 'ranged',
      unitType: unitType,
      projectile: null,
      particleSystem: null,
      damageEffectApplied: false,
      // Timing configuration
      phaseTimings: {
        windup: 0.2,  // seconds
        strike: 0.1,  // seconds
        recovery: 0.1 // seconds
      }
    });
    
    // Skip projectile animation in targeting mode
    const skipVisualEffects = this.animatingEntities.get(entityId)?.isTargeting === true;
    
    // Create projectile effect using animation factory if available
    if (this.animationFactory && !skipVisualEffects) {
      const mesh = this.systems.render?.meshes.get(entityId);
      if (mesh) {
        // Set the entity's animation state to 'attacking'
        this.animationFactory.setEntityState(entityId, 'attacking', {
          targetId: targetId,
          attackType: 'ranged',
          unitType: unitType
        });
      }
    } else if (!skipVisualEffects) {
      // Fall back to original projectile creation if animation factory not available
      this.createProjectileEffect(entityId, targetId, unitType);
    }
  }
  
  // Update method - called every frame
  update(deltaTime) {
    // Process all animating entities
    this.animatingEntities.forEach((animData, entityId) => {
      // Skip if this is just targeting
      if (animData.isTargeting) {
        return;
      }
      
      // Update animation timers
      animData.stateTime += deltaTime;
      animData.totalAnimationTime += deltaTime;
      
      // Process animation states
      if (animData.attackType === 'melee') {
        this.updateMeleeAnimation(entityId, animData, deltaTime);
      } else if (animData.attackType === 'ranged') {
        this.updateRangedAnimation(entityId, animData, deltaTime);
      }
      
      // Update projectile or weapon position if it exists
      if (animData.projectile) {
        this.updateProjectilePosition(entityId, animData, deltaTime);
      }
      
      // Update particle systems if they exist
      if (animData.particleSystem) {
        animData.particleSystem.update(deltaTime);
      }
    });
    
    // Clean up completed animations
    this.animatingEntities.forEach((animData, entityId) => {
      if (animData.state === 'completed' && animData.totalAnimationTime > 1.0) {
        // Allow some extra time for effects to finish
        this.animatingEntities.delete(entityId);
        
        // Reset entity state in animation factory
        if (this.animationFactory) {
          this.animationFactory.setEntityState(entityId, 'idle');
        }
      }
    });
  }
  
  // Update melee animation state
  updateMeleeAnimation(entityId, animData, deltaTime) {
    const { windup, strike, recovery } = animData.phaseTimings;
    
    // State transitions
    if (animData.state === this.STATES.ATTACK_WINDUP && animData.stateTime >= windup) {
      // Transition to strike phase
      animData.state = this.STATES.ATTACK_STRIKE;
      animData.stateTime = 0;
      
      if (this.debug) {console.log(`AnimationSystem: Entity ${entityId} transitioning to strike phase`);}
    }
    else if (animData.state === this.STATES.ATTACK_STRIKE && animData.stateTime >= strike) {
      // Transition to recovery phase
      animData.state = this.STATES.ATTACK_RECOVERY;
      animData.stateTime = 0;
      
      if (this.debug) {console.log(`AnimationSystem: Entity ${entityId} transitioning to recovery phase`);}
    }
    else if (animData.state === this.STATES.ATTACK_RECOVERY && animData.stateTime >= recovery) {
      // Animation completed
      animData.state = 'completed';
      
      if (this.debug) {console.log(`AnimationSystem: Entity ${entityId} melee animation completed`);}
    }
    
    // Apply damage effect during strike phase if not already applied
    if (animData.state === this.STATES.ATTACK_STRIKE && !animData.damageEffectApplied) {
      this.applyDamageEffect(entityId, animData.targetId);
      animData.damageEffectApplied = true;
    }
  }
  
  // Update ranged animation state
  updateRangedAnimation(entityId, animData, deltaTime) {
    const { windup, strike, recovery } = animData.phaseTimings;
    
    // State transitions
    if (animData.state === this.STATES.ATTACK_WINDUP && animData.stateTime >= windup) {
      // Transition to strike phase
      animData.state = this.STATES.ATTACK_STRIKE;
      animData.stateTime = 0;
      
      if (this.debug) {console.log(`AnimationSystem: Entity ${entityId} transitioning to strike phase`);}
      
      // Launch projectile at the start of strike phase
      if (!animData.projectile && !animData.isTargeting) {
        this.launchProjectile(entityId, animData.targetId, animData.unitType);
      }
    }
    else if (animData.state === this.STATES.ATTACK_STRIKE && animData.stateTime >= strike) {
      // Transition to recovery phase
      animData.state = this.STATES.ATTACK_RECOVERY;
      animData.stateTime = 0;
      
      if (this.debug) {console.log(`AnimationSystem: Entity ${entityId} transitioning to recovery phase`);}
    }
    else if (animData.state === this.STATES.ATTACK_RECOVERY && animData.stateTime >= recovery) {
      // Animation completed
      animData.state = 'completed';
      
      if (this.debug) {console.log(`AnimationSystem: Entity ${entityId} ranged animation completed`);}
    }
  }
  
  // Apply damage effect to target
  applyDamageEffect(attackerId, targetId) {
    // This method would create visual effects when damage is applied
    // Implementation details would depend on the specific game requirements
    if (this.debug) {console.log(`AnimationSystem: Applying damage effect from ${attackerId} to ${targetId}`);}
    
    // Use animation factory if available
    if (this.animationFactory) {
      this.animationFactory.createDamageEffect(targetId);
    }
  }
  
  // Create melee weapon for entity
  createMeleeWeapon(entityId, targetId, unitType) {
    // This is a fallback method when animation factory is not available
    // Implementation would be similar to the original code
    if (this.debug) {console.log(`AnimationSystem: Creating melee weapon for ${entityId} (${unitType})`);}
    
    // Implementation details...
  }
  
  // Create projectile effect
  createProjectileEffect(attackerId, targetId, unitType) {
    // This is a fallback method when animation factory is not available
    // Implementation would be similar to the original code
    if (this.debug) {console.log(`AnimationSystem: Creating projectile for ${attackerId} (${unitType})`);}
    
    // Implementation details...
  }
  
  // Launch projectile
  launchProjectile(attackerId, targetId, unitType) {
    // This is a fallback method when animation factory is not available
    // Implementation would be similar to the original code
    if (this.debug) {console.log(`AnimationSystem: Launching projectile from ${attackerId} to ${targetId}`);}
    
    // Implementation details...
  }
  
  // Update projectile position
  updateProjectilePosition(entityId, animData, deltaTime) {
    // This is a fallback method when animation factory is not available
    // Implementation would be similar to the original code
    
    // Implementation details...
  }
}

export default AnimationSystem;
