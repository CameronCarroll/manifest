// src/entities/systems/AnimationSystem.js
import * as THREE from 'three';

class AnimationSystem {
  constructor(entityManager, systems) {
    this.entityManager = entityManager;
    this.systems = systems;
    this.animatingEntities = new Map(); // Maps entityId to animation data
    
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
    const unitType = factionComponent.unitType || 'basic';
    
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
  }
  
  // Clean up any existing weapon for an entity
  cleanupExistingWeapon(entityId) {
    const entityMesh = this.systems.render?.meshes.get(entityId);
    if (!entityMesh) {return;}
    
    // Find and remove any existing weapon meshes
    entityMesh.children.forEach(child => {
      if (child.userData && child.userData.isWeapon) {
        entityMesh.remove(child);
        this.disposeObject(child);
      }
    });
  }
  
  // Start ranged attack animation
  startRangedAttackAnimation(entityId, targetId, unitType) {
    if (this.debug) {console.log(`AnimationSystem: Starting ranged attack for ${entityId} (${unitType})`);}
    
    // Animation timeline:
    // 1. Windup (0.2s) - Charging the attack
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
    this.createProjectileEffect(entityId, targetId, unitType, skipVisualEffects);
  }
  
  // Create projectile effect for ranged attacks
  createProjectileEffect(attackerId, targetId, unitType, skipVisualEffects = false) {
    if (skipVisualEffects) {
      // Skip creating any visual effects when targeting
      return null;
    }
    
    const { scene } = this.systems.sceneManager?.getActiveScene() || {};
    if (!scene) {
      if (this.debug) {console.log('AnimationSystem: No scene available for projectile');}
      return null;
    }
    
    const attackerPos = this.entityManager.getComponent(attackerId, 'position');
    const targetPos = this.entityManager.getComponent(targetId, 'position');
    
    if (!attackerPos || !targetPos) {
      if (this.debug) {console.log('AnimationSystem: Missing positions for projectile');}
      return null;
    }
    
    // Determine projectile appearance based on unit type
    let projectileColor;
    let projectileSize = 0.15;
    
    switch(unitType) {
    case 'assault':
      projectileColor = 0xFF0000; // Red
      break;
    case 'sniper':
      projectileColor = 0x0088FF; // Blue
      projectileSize = 0.1; // Smaller, faster projectile
      break;
    case 'support':
      projectileColor = 0x00FF00; // Green
      projectileSize = 0.2; // Larger healing projectile
      break;
    default:
      projectileColor = 0x00FFFF; // Cyan default
    }
    
    // Create projectile geometry
    const projectileGeometry = new THREE.SphereGeometry(projectileSize, 8, 8);
    const projectileMaterial = new THREE.MeshBasicMaterial({
      color: projectileColor,
      transparent: true,
      opacity: 0.8,
      emissive: projectileColor,
      emissiveIntensity: 0.5
    });
    
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    // Set initial position at attacker
    projectile.position.set(
      attackerPos.x, 
      attackerPos.y + 1.2, // At weapon height
      attackerPos.z
    );
    
    // Calculate direction to target
    const direction = new THREE.Vector3(
      targetPos.x - attackerPos.x,
      0, // Keep y level
      targetPos.z - attackerPos.z
    ).normalize();
    
    // Add data for animation
    projectile.userData = {
      startPos: new THREE.Vector3(attackerPos.x, attackerPos.y + 1.2, attackerPos.z),
      targetPos: new THREE.Vector3(targetPos.x, targetPos.y + 0.6, targetPos.z),
      direction: direction,
      speed: unitType === 'sniper' ? 25 : 15, // Sniper shots are faster
      distanceTraveled: 0,
      maxDistance: new THREE.Vector3(
        targetPos.x - attackerPos.x,
        (targetPos.y + 0.6) - (attackerPos.y + 1.2),
        targetPos.z - attackerPos.z
      ).length(),
      attackerId: attackerId,
      targetId: targetId,
      unitType: unitType
    };
    
    // Add projectile trail
    const trailCount = 5;
    for (let i = 0; i < trailCount; i++) {
      const trailScale = 1 - (i / trailCount) * 0.5;
      const trailOpacity = 0.4 * (1 - i / trailCount);
      
      const trailGeometry = new THREE.SphereGeometry(projectileSize * trailScale, 8, 8);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: projectileColor,
        transparent: true,
        opacity: trailOpacity
      });
      
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.position.copy(projectile.position);
      trail.userData = {
        offset: i * 0.1, // Spacing between trail elements
        index: i
      };
      
      projectile.add(trail);
    }
    
    // Add point light
    const light = new THREE.PointLight(projectileColor, 1, 3);
    projectile.add(light);
    
    // Add to scene
    scene.add(projectile);
    
    // Store reference in animating entities
    const animData = this.animatingEntities.get(attackerId);
    if (animData) {
      animData.projectile = projectile;
    }
    
    return projectile;
  }
  
  // Create a weapon mesh based on unit type
  createWeaponMesh(unitType) {
    let weaponMesh;
    
    // Create group to hold all weapon parts
    const group = new THREE.Group();
    group.userData.isWeapon = true; // Mark as weapon for cleanup
    
    // Base material with glow effect
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: this.getUnitTypeColor(unitType),
      emissive: this.getUnitTypeColor(unitType),
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9,
    });
    
    // Create the main blade/weapon
    let bladeGeometry;
    let handleGeometry;
    
    switch(unitType) {
    case 'assault':
      // Energy sword (cyber katana)
      bladeGeometry = new THREE.BoxGeometry(0.1, 1.2, 0.4);
      handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
      break;
    case 'tank':
      // Heavy energy axe/hammer
      bladeGeometry = new THREE.CylinderGeometry(0.3, 0.2, 0.6, 6);
      handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
      break;
    case 'sniper':
      // Precision energy blade (thin and long)
      bladeGeometry = new THREE.BoxGeometry(0.05, 1.5, 0.2);
      handleGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
      break;
    case 'support':
      // Staff/wand with energy crystal
      bladeGeometry = new THREE.OctahedronGeometry(0.2, 0);
      handleGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.0, 8);
      break;
    default:
      // Default energy blade
      bladeGeometry = new THREE.BoxGeometry(0.1, 1.0, 0.3);
      handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    }
    
    // Create blade with glow
    const blade = new THREE.Mesh(bladeGeometry, baseMaterial);
    
    // Different positioning based on weapon type
    if (unitType === 'support') {
      // Crystal at the top of staff
      blade.position.y = 0.6; 
    } else if (unitType === 'tank') {
      // Axe head perpendicular to handle
      blade.rotation.z = Math.PI / 2;
      blade.position.y = 0.5;
    } else {
      // Default sword-like positioning
      blade.position.y = 0.6;
    }
    
    group.add(blade);
    
    // Add handle with metallic material
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3
    });
    
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    
    // Position handle based on weapon type
    if (unitType === 'support') {
      // Staff positioning
      handle.position.y = 0.0;
    } else if (unitType === 'tank') {
      // Heavy weapon handle
      handle.position.y = -0.15;
    } else {
      // Default sword handle positioning
      handle.position.y = 0.0;
    }
    
    group.add(handle);
    
    // Add cybernetic runes/circuits to the blade
    this.addCyberneticRunes(group, unitType);
    
    // Add point light to enhance the glow effect
    const light = new THREE.PointLight(this.getUnitTypeColor(unitType), 1, 3);
    light.position.copy(blade.position);
    group.add(light);
    
    return group;
  }
  
  // Add cybernetic rune details to weapon
  addCyberneticRunes(weaponGroup, unitType) {
    const runeColor = new THREE.Color(this.getUnitTypeColor(unitType));
    runeColor.offsetHSL(0, -0.2, 0.2); // Slightly different hue for contrast
    
    const runeMaterial = new THREE.MeshBasicMaterial({
      color: runeColor,
      transparent: true,
      opacity: 0.9
    });
    
    // Add glowing rune patterns based on unit type
    const runeCount = unitType === 'support' ? 5 : 3;
    
    for (let i = 0; i < runeCount; i++) {
      // Create small geometric shapes for runes
      let runeGeometry;
      
      switch(Math.floor(Math.random() * 3)) {
      case 0:
        runeGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        break;
      case 1:
        runeGeometry = new THREE.CircleGeometry(0.03, 4);
        break;
      case 2:
        runeGeometry = new THREE.RingGeometry(0.02, 0.04, 4);
        break;
      }
      
      const rune = new THREE.Mesh(runeGeometry, runeMaterial);
      
      // Position runes along the blade/staff
      const mainPart = weaponGroup.children[0]; // The blade is the first child
      const offset = (i / runeCount) - 0.3;
      
      if (unitType === 'support') {
        // Distribute along the staff
        rune.position.set(
          (Math.random() - 0.5) * 0.06, 
          offset * 0.8, 
          (Math.random() - 0.5) * 0.06
        );
      } else if (unitType === 'tank') {
        // Position on the axe head
        rune.position.set(
          offset * 0.5,
          mainPart.position.y,
          (Math.random() - 0.5) * 0.1
        );
        rune.rotation.z = Math.PI / 2;
      } else {
        // Position along the blade
        rune.position.set(
          (Math.random() - 0.5) * 0.06,
          mainPart.position.y + offset * 0.8,
          (Math.random() - 0.5) * 0.1
        );
      }
      
      weaponGroup.add(rune);
    }
  }
  
  // Get color based on unit type
  getUnitTypeColor(unitType) {
    switch(unitType) {
    case 'assault':
      return 0xff3366; // Neon pink/red
    case 'tank':
      return 0x9933ff; // Purple
    case 'sniper':
      return 0x33ccff; // Cyan
    case 'support':
      return 0x33ff66; // Green
    default:
      return 0x3366ff; // Blue
    }
  }
  
  // Create particles for weapon effects
  createParticleSystem(entityId, unitType, attackType) {
    // Create a group to hold particles
    const particleGroup = new THREE.Group();
    
    // Get position to attach particles
    const posComponent = this.entityManager.getComponent(entityId, 'position');
    
    // Create particles based on attack type and unit type
    const particleCount = attackType === 'melee' ? 20 : 30;
    const particleColor = this.getUnitTypeColor(unitType);
    
    for (let i = 0; i < particleCount; i++) {
      // Create particle geometry
      let particleGeometry;
      
      if (attackType === 'melee') {
        // Cubic voxels for melee attacks
        particleGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      } else {
        // Smaller particles for ranged attacks
        particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
      }
      
      // Create particle material with glow
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: particleColor,
        transparent: true,
        opacity: 0.8
      });
      
      // Create particle mesh
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Random initial position - will be animated during update
      particle.position.set(
        (Math.random() - 0.5) * 0.3,
        0.5 + (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      );
      
      // Add data for animation
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.1,
          (Math.random() - 0.5) * 0.1 + 0.05,
          (Math.random() - 0.5) * 0.1
        ),
        life: 1.0,
        decay: 0.1 + Math.random() * 0.2
      };
      
      particleGroup.add(particle);
    }
    
    return particleGroup;
  }
  
  // Update animation state
  updateAnimation(entityId, animData, deltaTime) {
    // Skip animation updates for targeting-only animations
    if (animData.isTargeting === true) {
      // Just remove the targeting animation after a short time
      animData.stateTime += deltaTime;
      if (animData.stateTime > 0.1) {
        this.animatingEntities.delete(entityId);
      }
      return;
    }
    
    // Update state time
    animData.stateTime += deltaTime;
    animData.totalAnimationTime += deltaTime;
    
    // Check for state transitions
    switch(animData.state) {
    case this.STATES.ATTACK_WINDUP:
      this.updateWindupPhase(entityId, animData, deltaTime);
      break;
    case this.STATES.ATTACK_STRIKE:
      this.updateStrikePhase(entityId, animData, deltaTime);
      break;
    case this.STATES.ATTACK_RECOVERY:
      this.updateRecoveryPhase(entityId, animData, deltaTime);
      break;
    }
    
    // Update particle effects
    if (animData.particleSystem) {
      this.updateParticles(animData.particleSystem, deltaTime);
    }
    
    // Update projectile if it exists
    if (animData.projectile) {
      this.updateProjectile(animData.projectile, deltaTime);
    }
  }
  
  // Update projectile movement and effects
  updateProjectile(projectile, deltaTime) {
    if (!projectile || !projectile.userData) {return;}
    
    // Calculate movement
    const moveDistance = projectile.userData.speed * deltaTime;
    const direction = projectile.userData.direction;
    
    // Move projectile
    projectile.position.x += direction.x * moveDistance;
    projectile.position.z += direction.z * moveDistance;
    
    // Calculate current distance traveled
    projectile.userData.distanceTraveled += moveDistance;
    
    // Update trail particles
    projectile.children.forEach(child => {
      if (child.userData && child.userData.offset !== undefined) {
        const trailIndex = child.userData.index;
        const trailOffset = child.userData.offset;
        
        // Calculate position along trail
        const trailX = projectile.position.x - direction.x * trailOffset * trailIndex;
        const trailZ = projectile.position.z - direction.z * trailOffset * trailIndex;
        
        child.position.set(
          trailX - projectile.position.x,
          0,
          trailZ - projectile.position.z
        );
      }
    });
    
    // Check if projectile reached target
    if (projectile.userData.distanceTraveled >= projectile.userData.maxDistance) {
      // Create impact effect at target location
      this.createDamageEffect(
        projectile.userData.targetId, 
        projectile.userData.unitType,
        true // This is actual damage, show effects
      );
      
      // Remove projectile
      if (projectile.parent) {
        projectile.parent.remove(projectile);
      }
      this.disposeObject(projectile);
      
      // Check if we need to clean up the reference in animating entities
      const animData = this.animatingEntities.get(projectile.userData.attackerId);
      if (animData && animData.projectile === projectile) {
        animData.projectile = null;
      }
    }
  }
  
  // Update windup phase
  updateWindupPhase(entityId, animData, deltaTime) {
    // Get the render meshes from render system
    const entityMesh = this.systems.render?.meshes.get(entityId);
    if (!entityMesh) {return;}
    
    // Create and position weapon mesh if it doesn't exist (for melee attacks)
    if (!animData.weaponMesh && animData.attackType === 'melee') {
      animData.weaponMesh = this.createWeaponMesh(animData.unitType);
      
      // Initially the weapon should look like it's materializing
      // Scale from 0 to full size during windup
      animData.weaponMesh.scale.set(0.01, 0.01, 0.01);
      
      // Position relative to entity
      animData.weaponMesh.position.y = 1.0; // Positioned at hand height
      animData.weaponMesh.position.x = 0.5; // Positioned to the side
      animData.weaponMesh.position.z = 0.2; // Slightly forward
      
      // Add to entity mesh
      entityMesh.add(animData.weaponMesh);
      
      // Create particle effect
      animData.particleSystem = this.createParticleSystem(entityId, animData.unitType, animData.attackType);
      animData.weaponMesh.add(animData.particleSystem);
    }
    
    // Animate windup (scale weapon from 0 to 1, material opacity, etc)
    if (animData.weaponMesh) {
      const windupProgress = animData.stateTime / animData.phaseTimings.windup;
      const scaleFactor = Math.min(1.0, windupProgress * 1.2); // Scale up to 1.0
      
      // Scale the weapon up as it materializes
      animData.weaponMesh.scale.set(scaleFactor, scaleFactor, scaleFactor);
      
      // Rotate weapon during windup
      animData.weaponMesh.rotation.z = windupProgress * Math.PI * 0.5;
    }
    
    // For ranged attacks, create any charging effects
    if (animData.attackType === 'ranged' && !animData.chargeEffect) {
      const chargeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const chargeColor = this.getUnitTypeColor(animData.unitType);
      const chargeMaterial = new THREE.MeshBasicMaterial({
        color: chargeColor,
        transparent: true,
        opacity: 0.7
      });
      
      const chargeEffect = new THREE.Mesh(chargeGeometry, chargeMaterial);
      chargeEffect.position.set(0.5, 1.2, 0.4);
      
      // Add to entity mesh
      entityMesh.add(chargeEffect);
      animData.chargeEffect = chargeEffect;
    }
    
    // Update charge effect for ranged attacks
    if (animData.attackType === 'ranged' && animData.chargeEffect) {
      const windupProgress = animData.stateTime / animData.phaseTimings.windup;
      const pulseScale = 0.5 + windupProgress * 0.7;
      animData.chargeEffect.scale.set(pulseScale, pulseScale, pulseScale);
      
      // Pulse opacity
      if (animData.chargeEffect.material) {
        animData.chargeEffect.material.opacity = 0.7 * (0.5 + Math.sin(windupProgress * Math.PI) * 0.5);
      }
    }
    
    // Transition to strike phase when windup is complete
    if (animData.stateTime >= animData.phaseTimings.windup) {
      animData.state = this.STATES.ATTACK_STRIKE;
      animData.stateTime = 0;
      
      // Remove charge effect for ranged attacks before strike
      if (animData.attackType === 'ranged' && animData.chargeEffect) {
        entityMesh.remove(animData.chargeEffect);
        this.disposeObject(animData.chargeEffect);
        animData.chargeEffect = null;
      }
    }
  }
  
  // Update strike phase
  updateStrikePhase(entityId, animData, deltaTime) {
    // Get the render meshes from render system
    const entityMesh = this.systems.render?.meshes.get(entityId);
    if (!entityMesh || (!animData.weaponMesh && animData.attackType === 'melee')) {return;}
    
    const strikeProgress = animData.stateTime / animData.phaseTimings.strike;
    
    // Animate strike (swing weapon for melee)
    if (animData.attackType === 'melee' && animData.weaponMesh) {
      // Swing the weapon
      // Start with weapon raised, then swing down in an arc
      const swingAngle = Math.PI * 1.5 * strikeProgress;
      animData.weaponMesh.rotation.z = Math.PI * 0.5 - swingAngle;
      
      // Move weapon forward during strike
      const forwardDistance = 0.3 * Math.sin(strikeProgress * Math.PI);
      animData.weaponMesh.position.z = 0.2 + forwardDistance;
    }
    
    // If we have a target and we're halfway through the strike, apply damage effect
    if (strikeProgress >= 0.5 && animData.targetId && !animData.damageEffectApplied) {
      this.createDamageEffect(animData.targetId, animData.unitType, true); // This is actual damage, show effects
      animData.damageEffectApplied = true;
    }
    
    // Transition to recovery phase when strike is complete
    if (animData.stateTime >= animData.phaseTimings.strike) {
      animData.state = this.STATES.ATTACK_RECOVERY;
      animData.stateTime = 0;
    }
  }
  
  // Update recovery phase
  updateRecoveryPhase(entityId, animData, deltaTime) {
    // Get the render meshes from render system
    const entityMesh = this.systems.render?.meshes.get(entityId);
    if (!entityMesh) {return;}
    
    const recoveryProgress = animData.stateTime / animData.phaseTimings.recovery;
    
    // Animate recovery (weapon dissipating for melee)
    if (animData.attackType === 'melee' && animData.weaponMesh) {
      // Fade out the weapon
      const opacity = 1.0 - recoveryProgress;
      
      // Find all materials in the weapon mesh and adjust opacity
      animData.weaponMesh.traverse(child => {
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(mat => {
              if (mat.transparent) {
                mat.opacity = opacity;
              }
            });
          } else if (child.material.transparent) {
            child.material.opacity = opacity;
          }
        }
      });
      
      // Scale down slightly
      const scale = 1.0 - recoveryProgress * 0.2;
      animData.weaponMesh.scale.set(scale, scale, scale);
    }
    
    // End animation when recovery is complete
    if (animData.stateTime >= animData.phaseTimings.recovery) {
      // Remove weapon mesh for melee
      if (animData.attackType === 'melee' && animData.weaponMesh) {
        entityMesh.remove(animData.weaponMesh);
        this.disposeObject(animData.weaponMesh);
      }
      
      // Remove particle system if exists
      if (animData.particleSystem) {
        if (animData.weaponMesh) {
          animData.weaponMesh.remove(animData.particleSystem);
        } else {
          entityMesh.remove(animData.particleSystem);
        }
        this.disposeObject(animData.particleSystem);
      }
      
      // Remove from animating entities
      this.animatingEntities.delete(entityId);
    }
  }
  
  // Create damage effect on target
  createDamageEffect(targetId, attackerUnitType, isActualDamage = true) {
    const targetMesh = this.systems.render?.meshes.get(targetId);
    if (!targetMesh) {
      if (this.debug) {console.log(`AnimationSystem: No target mesh found for entity ${targetId}`);}
      return;
    }
    
    // Only create visual effects if this is actual damage, not just targeting
    if (!isActualDamage) {
      return; // Skip creating visual effects when just targeting
    }
    
    // Flash effect
    const flashGeometry = new THREE.SphereGeometry(1.0, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({
      color: this.getUnitTypeColor(attackerUnitType),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    targetMesh.add(flash);
    
    // Store the creation time for animation
    flash.userData = {
      creationTime: Date.now(),
      duration: 300, // ms
      type: 'damageEffect'
    };
    
    // Store the flash effect for cleanup
    if (!this.effectsCache.has(targetId)) {
      this.effectsCache.set(targetId, []);
    }
    this.effectsCache.get(targetId).push(flash);
    
    // Create sparks/debris particles
    const sparkCount = 10;
    const sparkGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const sparkMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    
    for (let i = 0; i < sparkCount; i++) {
      const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
      
      // Random position around impact point
      spark.position.set(
        (Math.random() - 0.5) * 0.5,
        0.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      );
      
      // Store velocity for animation
      spark.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2.0,
          Math.random() * 2.0,
          (Math.random() - 0.5) * 2.0
        ),
        creationTime: Date.now(),
        duration: 500 + Math.random() * 300, // ms
        type: 'damageEffect'
      };
      
      targetMesh.add(spark);
      this.effectsCache.get(targetId).push(spark);
    }
    
    // Add cyber/magic sigil at impact point
    const sigilGeometry = new THREE.CircleGeometry(0.5, 8);
    const sigilMaterial = new THREE.MeshBasicMaterial({
      color: this.getUnitTypeColor(attackerUnitType),
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    
    const sigil = new THREE.Mesh(sigilGeometry, sigilMaterial);
    sigil.rotation.x = Math.PI / 2; // Make horizontal
    sigil.position.y = 0.05; // Just above ground
    
    sigil.userData = {
      creationTime: Date.now(),
      duration: 600, // ms
      type: 'damageEffect'
    };
    
    targetMesh.add(sigil);
    this.effectsCache.get(targetId).push(sigil);
  }
  
  // Update particles for animation
  updateParticles(particleSystem, deltaTime) {
    particleSystem.children.forEach(particle => {
      // Update position based on velocity
      particle.position.x += particle.userData.velocity.x * deltaTime;
      particle.position.y += particle.userData.velocity.y * deltaTime;
      particle.position.z += particle.userData.velocity.z * deltaTime;
      
      // Update life and opacity
      particle.userData.life -= particle.userData.decay * deltaTime;
      
      if (particle.userData.life <= 0) {
        // Reset particle
        particle.userData.life = 1.0;
        particle.position.set(
          (Math.random() - 0.5) * 0.3,
          0.5 + (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        );
      } else {
        // Update opacity based on life
        if (particle.material) {
          particle.material.opacity = particle.userData.life * 0.8;
        }
        
        // Scale particle based on life
        const scale = particle.userData.life * 0.8 + 0.2;
        particle.scale.set(scale, scale, scale);
      }
    });
  }
  
  // Clean up effects based on their lifetime
  updateEffects() {
    const now = Date.now();
    
    this.effectsCache.forEach((effects, targetId) => {
      const targetMesh = this.systems.render?.meshes.get(targetId);
      if (!targetMesh) {
        // Target no longer exists, clean up all effects
        effects.forEach(effect => this.disposeObject(effect));
        this.effectsCache.delete(targetId);
        return;
      }
      
      // Check each effect's lifetime
      const expiredEffects = [];
      
      effects.forEach(effect => {
        const age = now - effect.userData.creationTime;
        
        if (age >= effect.userData.duration) {
          // Effect has expired
          expiredEffects.push(effect);
        } else {
          // Animate the effect based on its age
          const lifeProgress = age / effect.userData.duration;
          
          // Fade out
          if (effect.material) {
            if (Array.isArray(effect.material)) {
              effect.material.forEach(mat => {
                if (mat.transparent) {
                  mat.opacity = 1.0 - lifeProgress;
                }
              });
            } else if (effect.material.transparent) {
              effect.material.opacity = 1.0 - lifeProgress;
            }
          }
          
          // If it's a flash, expand it
          if (effect.geometry instanceof THREE.SphereGeometry && effect.userData.duration <= 300) {
            const scale = 1.0 + lifeProgress;
            effect.scale.set(scale, scale, scale);
          }
          
          // If it's a spark, update position based on velocity
          if (effect.geometry instanceof THREE.BoxGeometry && effect.userData.velocity) {
            effect.position.x += effect.userData.velocity.x * 0.01;
            effect.position.y += effect.userData.velocity.y * 0.01;
            effect.position.z += effect.userData.velocity.z * 0.01;
            
            // Add gravity
            effect.userData.velocity.y -= 0.05;
          }
          
          // If it's a sigil, rotate it
          if (effect.geometry instanceof THREE.CircleGeometry) {
            effect.rotation.z += 0.05;
          }
        }
      });
      
      // Remove expired effects
      expiredEffects.forEach(effect => {
        targetMesh.remove(effect);
        this.disposeObject(effect);
        const index = effects.indexOf(effect);
        if (index !== -1) {
          effects.splice(index, 1);
        }
      });
      
      // Remove entry if all effects are gone
      if (effects.length === 0) {
        this.effectsCache.delete(targetId);
      }
    });
  }
  
  // Update all animations
  update(deltaTime) {
    // Update active attack animations
    this.animatingEntities.forEach((animData, entityId) => {
      this.updateAnimation(entityId, animData, deltaTime);
    });
    
    // Update existing effects (damage flashes, particles, etc)
    this.updateEffects();
    
    // Update any projectiles in the scene that aren't specifically tied to an entity
    const { scene } = this.systems.sceneManager?.getActiveScene() || {};
    if (scene) {
      scene.children.forEach(child => {
        if (child.userData && child.userData.isProjectile) {
          this.updateProjectile(child, deltaTime);
        }
      });
    }
    
    // Update any animation functions stored in userData
    this.systems.render?.meshes.forEach((mesh) => {
      this.updateMeshAnimations(mesh, deltaTime);
    });
  }
  
  // Update mesh animations (for cybernetic elements and special effects)
  updateMeshAnimations(mesh, deltaTime) {
    if (!mesh) {return;}
    
    // Update any animation function in userData
    if (mesh.userData && typeof mesh.userData.update === 'function') {
      mesh.userData.update(deltaTime);
    }
    
    // Update children recursively
    mesh.children.forEach(child => {
      if (child.userData && typeof child.userData.update === 'function') {
        child.userData.update(deltaTime);
      }
      
      // Recurse into children
      if (child.children && child.children.length > 0) {
        this.updateMeshAnimations(child, deltaTime);
      }
    });
  }
  
  // Helper to dispose of Three.js objects
  disposeObject(object) {
    if (!object) {return;}
    
    // Dispose of geometries and materials
    object.traverse(child => {
      if (child.geometry) {
        child.geometry.dispose();
      }
      
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
  
  // Clean up resources
  dispose() {
    // Clean up all animations
    this.animatingEntities.forEach((animData, entityId) => {
      const entityMesh = this.systems.render?.meshes.get(entityId);
      
      if (entityMesh && animData.weaponMesh) {
        entityMesh.remove(animData.weaponMesh);
        this.disposeObject(animData.weaponMesh);
      }
      
      if (entityMesh && animData.particleSystem) {
        entityMesh.remove(animData.particleSystem);
        this.disposeObject(animData.particleSystem);
      }
      
      if (animData.projectile) {
        const { scene } = this.systems.sceneManager?.getActiveScene() || {};
        if (scene) {
          scene.remove(animData.projectile);
          this.disposeObject(animData.projectile);
        }
      }
    });
    
    this.animatingEntities.clear();
    
    // Clean up all effects
    this.effectsCache.forEach((effects, targetId) => {
      const targetMesh = this.systems.render?.meshes.get(targetId);
      
      effects.forEach(effect => {
        if (targetMesh) {
          targetMesh.remove(effect);
        }
        this.disposeObject(effect);
      });
    });
    
    this.effectsCache.clear();
  }
}

export default AnimationSystem;