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
      maxRange: 25, // Increased significantly beyond normal vision range
      direction: position.rotation,
      isImmobilized: true // Flag to indicate sniper cannot move while aiming
    });
  
    // Add a custom property to the entity to mark as a sniper in aim mode
    // This will be checked by other systems to prevent auto-attacks and movement
    if (this.entityManager.gameState) {
      // Store the original entity data if needed
      const entity = this.entityManager.gameState.entities.get(entityId) || {};
      if (!entity.customProperties) {
        entity.customProperties = {};
      }
      entity.customProperties.isAiming = true;
      entity.customProperties.noAutoAttack = true;
      this.entityManager.gameState.entities.set(entityId, entity);
    }
  
    return true;
  }
    
  // Update sniper aim ability
  // Update updateSniperAim to check for fog of war visibility
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
      // Change the order to ensure visual effect happens first:
      if (enemyHit) {
        console.log(`Sniper ${entityId} firing aimed shot at ${enemyHit}`);
    
        if (this.systems && this.systems.combat) {
          // Set up special damage parameters for aimed shot
          const specialDamage = {
            damageMultiplier: 10.0,
            ignoreArmor: true,
            isCritical: true,
            isAimedShot: true
          };
    
          // Create dramatic visual effect BEFORE starting the attack
          this.createSniperShotEffect(entityId, enemyHit);
    
          // Start the attack with special parameters
          this.systems.combat.startAttack(entityId, enemyHit, specialDamage);
      
          // Set extended cooldown after firing
          abilityData.lastFireTime = 0;
          abilityData.cooldown = 5.0;
        }
      }
    }
  }

  // Add method to create visual effect for sniper shot
  createSniperShotEffect(attackerId, targetId) {
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {return;}
  
    const attackerPos = this.entityManager.getComponent(attackerId, 'position');
    const targetPos = this.entityManager.getComponent(targetId, 'position');
    if (!attackerPos || !targetPos) {return;}
  
    // Use LineGeometry instead of Cylinder for more reliable positioning
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(attackerPos.x, 0.5, attackerPos.z),
      new THREE.Vector3(targetPos.x, 0.5, targetPos.z)
    ]);
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8,
      linewidth: 3  // Note: This may not work in all browsers due to WebGL limitations
    });
    
    const beam = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(beam);
    
    // Add muzzle flash at shooter position
    const flashGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.9
    });
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.set(attackerPos.x, 0.5, attackerPos.z);
    scene.add(flash);
    
    // Add impact effect at target position
    const impactGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const impactMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.8
    });
    const impact = new THREE.Mesh(impactGeometry, impactMaterial);
    impact.position.set(targetPos.x, 0.5, targetPos.z);
    scene.add(impact);
  
    // Remove all effects after a short delay
    setTimeout(() => {
      scene.remove(beam);
      scene.remove(flash);
      scene.remove(impact);
      
      // Dispose geometries and materials to prevent memory leaks
      lineGeometry.dispose();
      lineMaterial.dispose();
      flashGeometry.dispose();
      flashMaterial.dispose();
      impactGeometry.dispose();
      impactMaterial.dispose();
    }, 300);
  }
    
  // Create sniper line of sight visualization
  // Update the sniper line of sight creation to increase max range
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
  
    // Create line geometry with much longer range
    const maxRange = 25; // Maximum sniper range (increased from 15)
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
    line.userData.maxRange = maxRange;
  
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
  // Update checkSniperLineOfSightForEnemies to check for fog of war visibility
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
      
      // Calculate whether target is on or near the line of sight
      // Using parametric line formula and point-to-line distance
      
      // Calculate projection of point onto line
      const t = (dx * dirX + dz * dirZ) / (dirX * dirX + dirZ * dirZ);
      
      // Skip if target is behind sniper
      if (t < 0) {return;}
      
      // Skip if target is beyond max range along line
      if (t > maxRange) {return;}
      
      // Calculate closest point on line
      const closestX = position.x + dirX * t;
      const closestZ = position.z + dirZ * t;
      
      // Calculate distance from target to line
      const lineDistX = targetPos.x - closestX;
      const lineDistZ = targetPos.z - closestZ;
      const lineDistance = Math.sqrt(lineDistX * lineDistX + lineDistZ * lineDistZ);
      
      // Width of targeting beam - wider makes it easier to hit targets
      const beamWidth = 1.25;
      
      // Check if target is close enough to the line
      if (lineDistance <= beamWidth && t < nearestDistance) {
        // Check for fog of war visibility (if applicable)
        if (this.isTargetVisible(potentialTargetId)) {
          nearestTarget = potentialTargetId;
          nearestDistance = t; // Use distance along line, not direct distance
        }
      }
    });
    
    return nearestTarget;
  }

  // Add a helper method to check if a target is visible (not in fog of war)
  isTargetVisible(targetId) {
  // If no fog of war is active, all targets are visible
    if (!this.entityManager.gameState.activeScenario || 
      !this.entityManager.gameState.activeScenario.fogOfWar) {
      return true;
    }
  
    // Get target position
    if (!this.entityManager.hasComponent(targetId, 'position')) {
      return false;
    }
  
    const targetPos = this.entityManager.getComponent(targetId, 'position');
  
    // Use the scenario's visibility check function if available
    if (this.entityManager.gameState.activeScenario.isPositionVisible) {
      return this.entityManager.gameState.activeScenario.isPositionVisible(targetPos);
    }
  
    // Alternative: Check if target's render component is visible
    if (this.entityManager.hasComponent(targetId, 'render')) {
      const renderComp = this.entityManager.getComponent(targetId, 'render');
      return renderComp.visible;
    }
  
    // Default to true if we can't determine fog of war status
    return true;
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
      
      // Remove custom properties
      if (this.entityManager.gameState) {
        const entity = this.entityManager.gameState.entities.get(entityId);
        if (entity && entity.customProperties) {
          entity.customProperties.isAiming = false;
          entity.customProperties.noAutoAttack = false;
          this.entityManager.gameState.entities.set(entityId, entity);
        }
      }
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