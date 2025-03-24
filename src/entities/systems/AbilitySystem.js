// src/entities/systems/AbilitySystem.js
import * as THREE from 'three';
class AbilitySystem {
  constructor(entityManager, systems) {
    this.entityManager = entityManager;
    this.systems = systems;
    this.activeAbilities = new Map(); // Maps entityId to active ability data
    this.abilityCooldowns = new Map(); // Maps entityId + abilityId to cooldown
    this.keybindings = {
      '1': 'ability1',
      '2': 'ability2',
      '3': 'ability3',
      '4': 'ability4'
    };
      
    // Register ability types
    this.abilityRegistry = {
      'sniper_aim': this.activateSniperAim.bind(this)
    };
  }

  initialize() {
    console.log('Initializing AbilitySystem');
    
    // Clean up any existing ability effects
    this.cleanupOrphanedAbilityEffects();
    
    // Clear active abilities and cooldowns
    this.activeAbilities.clear();
    this.abilityCooldowns.clear();
  }

  // Update ability states
  update(deltaTime) {
    // Update active abilities
    this.activeAbilities.forEach((abilityData, entityId) => {
      this.updateAbility(entityId, abilityData, deltaTime);
    });
      
    // Update cooldowns
    this.abilityCooldowns.forEach((cooldown, key) => {
      cooldown -= deltaTime;
      if (cooldown <= 0) {
        this.abilityCooldowns.delete(key);
      } else {
        this.abilityCooldowns.set(key, cooldown);
      }
    });

    // Check for orphaned effects every 5 seconds
    this._cleanupTimer = (this._cleanupTimer || 0) + deltaTime;
    if (this._cleanupTimer > 5) {
      this.cleanupOrphanedAbilityEffects();
      this._cleanupTimer = 0;
    }
  }
    
  // Process player input for abilities
  handleKeyPress(key, selectedEntities) {
    const abilitySlot = this.keybindings[key];
    if (!abilitySlot) {return false;}
      
    // Activate ability for all selected entities that have it
    let activated = false;
    selectedEntities.forEach(entityId => {
      const abilities = this.getEntityAbilities(entityId);
      if (abilities && abilities[parseInt(key) - 1]) {
        this.activateAbility(entityId, abilities[parseInt(key) - 1]);
        activated = true;
      }
    });
      
    return activated;
  }
    
  // Get abilities for an entity
  getEntityAbilities(entityId) {
    if (this.entityManager.hasComponent(entityId, 'unitType')) {
      return this.entityManager.getComponent(entityId, 'unitType').abilities;
    }
    return [];
  }
    
  // Activate an ability for an entity
  activateAbility(entityId, abilityName) {
    // Check if ability exists in registry
    if (!this.abilityRegistry[abilityName]) {
      console.warn(`Ability ${abilityName} not found in registry`);
      return false;
    }
      
    // Check cooldown
    const cooldownKey = `${entityId}_${abilityName}`;
    if (this.abilityCooldowns.has(cooldownKey)) {
      console.log(`Ability ${abilityName} on cooldown`);
      return false;
    }
      
    // Call ability function from registry
    return this.abilityRegistry[abilityName](entityId);
  }
    
  
    
  // Update a specific ability
  updateAbility(entityId, abilityData, deltaTime) {
    const { type, state, time } = abilityData;
      
    // Update ability based on type
    switch (type) {
    case 'sniper_aim':
      this.updateSniperAim(entityId, abilityData, deltaTime);
      break;
        // Add other ability updates here
    }
      
    // Update ability time
    abilityData.time += deltaTime;
  }
    
  // Sniper aim ability implementation
  // In the activateSniperAim method

  activateSniperAim(entityId) {
  // Check if entity is a sniper
    const isSniper = this.isSniperUnit(entityId);
    if (!isSniper) {return false;}
  
    console.log(`Activating sniper aim for ${entityId}`);
  
    // Check if ability is already active - if so, deactivate it
    if (this.activeAbilities.has(entityId) && 
      this.activeAbilities.get(entityId).type === 'sniper_aim') {
      console.log(`Deactivating sniper aim for ${entityId}`);
      this.cancelAbility(entityId);
    
      // Set cooldown to prevent instant reactivation
      const cooldownKey = `${entityId}_sniper_aim`;
      this.abilityCooldowns.set(cooldownKey, 0.5); // Half-second cooldown for toggling
    
      return true;
    }
  
    // Stop any current movement or attacks
    if (this.systems.movement) {
      this.systems.movement.stopEntity(entityId);
    }
    if (this.systems.combat) {
      this.systems.combat.stopAttack(entityId);
    }
  
    // Get entity position
    const position = this.entityManager.getComponent(entityId, 'position');
    if (!position) {return false;}
  
    // Create line-of-sight visualization
    const lineOfSight = this.createSniperLineOfSight(entityId, position);
  
    // Store ability state
    this.activeAbilities.set(entityId, {
      type: 'sniper_aim',
      state: 'active',
      time: 0,
      lineOfSight: lineOfSight,
      lastFireTime: 0,
      cooldown: 1.5, // Time between shots
      maxRange: 15,
      direction: position.rotation
    });
  
    return true;
  }
    
  // Update sniper aim ability
  updateSniperAim(entityId, abilityData, deltaTime) {
    // Get entity position
    const position = this.entityManager.getComponent(entityId, 'position');
    if (!position) {return;}
      
    // Update line of sight visualization
    this.updateSniperLineOfSight(entityId, abilityData, position);
      
    // Update firing cooldown
    abilityData.lastFireTime += deltaTime;
      
    // Check for enemies crossing the line
    if (abilityData.lastFireTime >= abilityData.cooldown) {
      const enemyHit = this.checkSniperLineOfSightForEnemies(entityId, abilityData, position);
      if (enemyHit) {
        // Fire at enemy
        console.log(`Sniper ${entityId} firing at ${enemyHit}`);
          
        if (this.systems.combat) {
          this.systems.combat.startAttack(entityId, enemyHit);
        }
          
        // Reset fire timer
        abilityData.lastFireTime = 0;
      }
    }
  }
    
  // Create sniper line of sight visualization
  createSniperLineOfSight(entityId, position) {
    // Get the scene from the render system
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {
      console.error('No scene available to create sniper line of sight');
      return null;
    }
    
    // Calculate direction vector
    const direction = {
      x: Math.sin(position.rotation),
      z: Math.cos(position.rotation)
    };
    
    // Create line geometry
    const maxRange = 15; // Maximum sniper range
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.5, 0), // Slightly above ground
      new THREE.Vector3(direction.x * maxRange, 0.5, direction.z * maxRange)
    ]);
    
    // Create line material (red, semi-transparent)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.7,
      linewidth: 3 // Note: LineBasicMaterial ignores linewidth in WebGL
    });
    
    // Create line and add to scene
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.position.set(position.x, 0.5, position.z);
    
    // Store entityId in userData for debugging
    line.userData.ownerId = entityId;
    line.userData.type = 'sniperLineOfSight';
    
    console.log(`Creating line of sight for ${entityId} at (${position.x}, ${position.z})`);
    
    // Add to scene
    scene.add(line);
    
    return line;
  }
    
  // Update sniper line of sight visualization
  updateSniperLineOfSight(entityId, abilityData, position) {
    const { lineOfSight, maxRange } = abilityData;
    if (!lineOfSight) {return;}
      
    // Update line position
    lineOfSight.position.set(position.x, 0.5, position.z);
      
    // Update line direction
    const direction = {
      x: Math.sin(position.rotation),
      z: Math.cos(position.rotation)
    };
      
    // Update line geometry
    const points = [
      new THREE.Vector3(0, 0.5, 0),
      new THREE.Vector3(direction.x * maxRange, 0.5, direction.z * maxRange)
    ];
      
    lineOfSight.geometry.setFromPoints(points);
      
    // Store current direction
    abilityData.direction = position.rotation;
  }
    
  // Check for enemies crossing the sniper's line of sight
  checkSniperLineOfSightForEnemies(entityId, abilityData, position) {
    const { maxRange, direction } = abilityData;
      
    // Get direction vector
    const dirX = Math.sin(direction);
    const dirZ = Math.cos(direction);
      
    // Find potential targets
    let nearestTarget = null;
    let nearestDistance = maxRange;
      
    this.entityManager.gameState.entities.forEach((entity, potentialTargetId) => {
      // Skip self
      if (potentialTargetId === entityId) {return;}
        
      // Check if entity has position and health components
      if (!this.entityManager.hasComponent(potentialTargetId, 'position') ||
            !this.entityManager.hasComponent(potentialTargetId, 'health') ||
            !this.entityManager.hasComponent(potentialTargetId, 'faction')) {
        return;
      }
        
      // Check if entity is an enemy
      const targetFaction = this.entityManager.getComponent(potentialTargetId, 'faction');
      const entityFaction = this.entityManager.getComponent(entityId, 'faction');
        
      if (targetFaction.faction === entityFaction.faction) {
        return; // Skip allies
      }
        
      // Get target position
      const targetPos = this.entityManager.getComponent(potentialTargetId, 'position');
        
      // Calculate vector to target
      const dx = targetPos.x - position.x;
      const dz = targetPos.z - position.z;
        
      // Calculate distance
      const distance = Math.sqrt(dx * dx + dz * dz);
        
      // Skip if outside max range
      if (distance > maxRange) {return;}
        
      // Calculate angle between sniper direction and target direction
      const targetDir = Math.atan2(dx, dz);
      let angleDiff = Math.abs(targetDir - direction);
        
      // Handle angle wrapping
      if (angleDiff > Math.PI) {
        angleDiff = 2 * Math.PI - angleDiff;
      }
        
      // Check if target is within a small angle of the line of sight
      const maxAngle = 0.1; // About 5.7 degrees
        
      if (angleDiff <= maxAngle && distance < nearestDistance) {
        nearestTarget = potentialTargetId;
        nearestDistance = distance;
      }
    });
      
    return nearestTarget;
  }
    
  // Check if entity is a sniper unit
  isSniperUnit(entityId) {
    if (this.entityManager.hasComponent(entityId, 'unitType')) {
      const unitType = this.entityManager.getComponent(entityId, 'unitType');
      return unitType.type === 'neon_assassin' || 
               (this.entityManager.hasComponent(entityId, 'faction') && 
                this.entityManager.getComponent(entityId, 'faction').unitType === 'sniper');
    }
      
    // Fallback to faction component if unitType not available
    if (this.entityManager.hasComponent(entityId, 'faction')) {
      const faction = this.entityManager.getComponent(entityId, 'faction');
      return faction.unitType === 'sniper';
    }
      
    return false;
  }
    
  // Cancel an active ability
  cancelAbility(entityId) {
    if (!this.activeAbilities.has(entityId)) {
      return false;
    }
      
    const abilityData = this.activeAbilities.get(entityId);
      
    // Clean up based on ability type
    switch (abilityData.type) {
    case 'sniper_aim':
      this.cleanupSniperAim(entityId, abilityData);
      break;
        // Add other ability cleanup cases
    }
      
    // Remove from active abilities
    this.activeAbilities.delete(entityId);
      
    return true;
  }
    
  cleanupSniperAim(entityId, abilityData) {
    const { lineOfSight } = abilityData;
    
    if (lineOfSight) {
      // Get the scene directly from the parent of the line
      const scene = lineOfSight.parent;
      if (scene) {
        scene.remove(lineOfSight);
        
        // Make sure it's really removed from the scene
        const index = scene.children.indexOf(lineOfSight);
        if (index !== -1) {
          scene.children.splice(index, 1);
        }
      }
      
      // Dispose of geometry and material to prevent memory leaks
      if (lineOfSight.geometry) {
        lineOfSight.geometry.dispose();
      }
      
      if (lineOfSight.material) {
        lineOfSight.material.dispose();
      }
    }
    
    console.log(`Cleaned up sniper aim for ${entityId}`);
  }
  // Add this to the AbilitySystem class

  // Utility method to clean up any orphaned ability effects
  cleanupOrphanedAbilityEffects() {
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {return;}
  
    // Find all objects with the sniperLineOfSight type
    const linesToRemove = [];
    scene.traverse(object => {
      if (object.userData && object.userData.type === 'sniperLineOfSight') {
        const ownerId = object.userData.ownerId;
      
        // Check if owner entity still has an active ability
        const hasActiveAbility = this.activeAbilities.has(ownerId) && 
                              this.activeAbilities.get(ownerId).type === 'sniper_aim';
      
        if (!hasActiveAbility) {
          linesToRemove.push(object);
        }
      }
    });
  
    // Remove orphaned lines
    for (const line of linesToRemove) {
      console.log(`Removing orphaned line of sight for entity ${line.userData.ownerId}`);
      scene.remove(line);
    
      if (line.geometry) {line.geometry.dispose();}
      if (line.material) {line.material.dispose();}
    }
  
    return linesToRemove.length;
  }
  // Other ability implementations would go here
}
  
export default AbilitySystem;