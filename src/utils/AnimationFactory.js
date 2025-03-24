// src/utils/AnimationFactory.js
import * as THREE from 'three';

/**
 * AnimationFactory - Creates and manages complex animations for different entity types
 * This class centralizes animation logic to support the new model types
 */
class AnimationFactory {
  constructor(scene) {
    this.scene = scene;
    this.animations = new Map(); // Maps entityId to animation data
    this.particleSystems = new Map(); // Maps entityId to particle systems
    this.debug = false;
  }

  // Update all animations
  update(deltaTime) {
    // Update unit animations
    this.animations.forEach((animData, entityId) => {
      if (animData.type === 'techno_shaman') {
        this.updateTechnoShamanAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'solar_knight') {
        this.updateSolarKnightAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'neon_assassin') {
        this.updateNeonAssassinAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'biohacker') {
        this.updateBiohackerAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'scrap_golem') {
        this.updateScrapGolemAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'eco_drone') {
        this.updateEcoDroneAnimation(entityId, animData, deltaTime);
      }
      // Add other unit type animations as needed
    });
    
    // Update building animations
    this.animations.forEach((animData, entityId) => {
      if (animData.type === 'arcane_reactor') {
        this.updateArcaneReactorAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'reclaimed_sanctuary') {
        this.updateReclaimedSanctuaryAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'bioforge') {
        this.updateBioforgeAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'mana_well') {
        this.updateManaWellAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'scavenger_outpost') {
        this.updateScavengerOutpostAnimation(entityId, animData, deltaTime);
      } else if (animData.type === 'harmonic_tower') {
        this.updateHarmonicTowerAnimation(entityId, animData, deltaTime);
      }
      // Add other building type animations as needed
    });
    
    // Update particle systems
    this.particleSystems.forEach((particleSystem, entityId) => {
      particleSystem.update(deltaTime);
    });
  }
  
  // Register an entity for animation
  registerEntityForAnimation(entityId, mesh, type) {
    // Store animation data
    this.animations.set(entityId, {
      mesh: mesh,
      type: type,
      time: 0,
      state: 'idle'
    });
    
    // Initialize specific animation types
    if (type === 'techno_shaman') {
      this.initTechnoShamanAnimation(entityId, mesh);
    } else if (type === 'solar_knight') {
      this.initSolarKnightAnimation(entityId, mesh);
    } else if (type === 'neon_assassin') {
      this.initNeonAssassinAnimation(entityId, mesh);
    } else if (type === 'arcane_reactor') {
      this.initArcaneReactorAnimation(entityId, mesh);
    }
    // Add other initialization methods as needed
  }
  
  // Remove an entity from animation
  removeEntityFromAnimation(entityId) {
    this.animations.delete(entityId);
    
    // Clean up any particle systems
    if (this.particleSystems.has(entityId)) {
      const particleSystem = this.particleSystems.get(entityId);
      particleSystem.dispose();
      this.particleSystems.delete(entityId);
    }
  }
  
  // Set entity animation state
  setEntityState(entityId, state, options = {}) {
    if (this.debug) {
      console.log(`AnimationFactory: Setting entity ${entityId} to state ${state}`, options);
    }
    
    // Check if we have animation data for this entity
    const animData = this.animations.get(entityId);
    if (!animData) {
      if (this.debug) {
        console.warn(`AnimationFactory: No animation data for entity ${entityId}`);
      }
      return false;
    }
    
    // Update the animation state
    animData.state = state;
    
    // Store options if provided (like targetId, attackType, etc.)
    if (options) {
      animData.options = options;
    }
    
    // Apply state-specific changes
    if (state === 'attacking') {
      // For some unit types, trigger special effects
      if (animData.type === 'techno_shaman' && options.attackType === 'ranged') {
        // Show healing particles for techno_shaman
        if (animData.healingParticles) {
          animData.healingParticles.visible = true;
        }
      } else if (animData.type === 'solar_knight' && options.attackType === 'melee') {
        // Show solar flares for solar_knight
        if (animData.solarFlares) {
          animData.solarFlares.visible = true;
        }
      }
      // Add more unit-specific attack animations as needed
    } else if (state === 'idle') {
      // Reset to idle state
      // Hide all special effects
      if (animData.type === 'techno_shaman' && animData.healingParticles) {
        animData.healingParticles.visible = false;
      } else if (animData.type === 'solar_knight' && animData.solarFlares) {
        animData.solarFlares.visible = false;
      }
      // Add more unit-specific idle reset as needed
    }
    
    return true;
  }
  
  // Create damage effect for an entity
  createDamageEffect(targetId) {
    if (this.debug) {
      console.log(`AnimationFactory: Creating damage effect for entity ${targetId}`);
    }
    
    // Get the entity's mesh from the animations map
    const animData = this.animations.get(targetId);
    if (!animData || !animData.mesh) {
      if (this.debug) {
        console.warn(`AnimationFactory: Cannot create damage effect - no mesh for entity ${targetId}`);
      }
      return null;
    }
    
    const mesh = animData.mesh;
    
    // Create a particle effect at the entity's position
    const particleCount = 15;
    const particles = new THREE.Group();
    
    // Create different particle effects based on entity type
    let particleColor = 0xff0000; // Default red for damage
    let particleSize = 0.05;
    let particleLifetime = 1.0; // seconds
    
    // Customize effects based on entity type
    if (animData.type === 'techno_shaman') {
      particleColor = 0xff3377; // Pink/purple for techno units
      particleSize = 0.07;
    } else if (animData.type === 'solar_knight') {
      particleColor = 0xffaa00; // Orange/yellow for solar units
      particleSize = 0.06;
    } else if (animData.type.includes('scrap_')) {
      particleColor = 0x774422; // Brown for scrap units
      particleSize = 0.08;
    }
    
    // Create particle geometry and material
    const particleGeometry = new THREE.SphereGeometry(particleSize, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: particleColor,
      transparent: true,
      opacity: 0.8
    });
    
    // Create particles with random positions
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      
      // Position around the entity's center
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 0.2 + Math.random() * 0.4;
      
      particle.position.set(
        Math.sin(theta) * Math.sin(phi) * radius,
        Math.cos(phi) * radius + 0.5, // Slightly above center
        Math.cos(theta) * Math.sin(phi) * radius
      );
      
      // Initial velocity for the particle
      particle.userData = {
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          Math.random() * 2 + 1,
          (Math.random() - 0.5) * 2
        ),
        lifetime: particleLifetime,
        age: 0
      };
      
      particles.add(particle);
    }
    
    // Add update method to particles
    particles.update = (deltaTime) => {
      let allParticlesExpired = true;
      
      particles.children.forEach(particle => {
        const data = particle.userData;
        data.age += deltaTime;
        
        if (data.age < data.lifetime) {
          allParticlesExpired = false;
          
          // Move particle based on velocity
          particle.position.x += data.velocity.x * deltaTime;
          particle.position.y += data.velocity.y * deltaTime;
          particle.position.z += data.velocity.z * deltaTime;
          
          // Apply gravity
          data.velocity.y -= 3.0 * deltaTime;
          
          // Fade out based on age
          const fadeStart = data.lifetime * 0.6;
          if (data.age > fadeStart) {
            const fadeProgress = (data.age - fadeStart) / (data.lifetime - fadeStart);
            particle.material.opacity = 0.8 * (1.0 - fadeProgress);
          }
        } else {
          // Make particle invisible when expired
          particle.visible = false;
        }
      });
      
      // Remove particles when all have expired
      if (allParticlesExpired) {
        if (mesh) {
          mesh.remove(particles);
        }
        // Dispose of resources
        particles.children.forEach(particle => {
          if (particle.geometry) particle.geometry.dispose();
          if (particle.material) particle.material.dispose();
        });
      }
    };
    
    // Add to mesh and register in particle systems
    mesh.add(particles);
    
    // Add or update entry in particleSystems map
    if (this.particleSystems.has(targetId)) {
      const oldSystem = this.particleSystems.get(targetId);
      if (oldSystem.parent) {
        oldSystem.parent.remove(oldSystem);
      }
    }
    this.particleSystems.set(targetId, particles);
    
    return particles;
  }
  
  // Initialize Techno-Shaman animations
  initTechnoShamanAnimation(entityId, mesh) {
    // Find drone elements for hovering animation
    const drones = [];
    mesh.traverse(child => {
      if (child.userData.hoverParams) {
        drones.push(child);
      }
    });
    
    // Update animation data
    const animData = this.animations.get(entityId);
    if (animData) {
      animData.drones = drones;
      animData.healingParticles = this.createHealingParticles(mesh);
      this.animations.set(entityId, animData);
    }
  }
  
  // Update Techno-Shaman animations
  updateTechnoShamanAnimation(entityId, animData, deltaTime) {
    animData.time += deltaTime;
    
    // Animate hovering drones
    if (animData.drones && animData.drones.length > 0) {
      animData.drones.forEach(drone => {
        const params = drone.userData.hoverParams;
        if (params) {
          // Hovering motion
          drone.position.y = params.baseY + Math.sin(animData.time * params.speed + params.phase) * 0.1;
          
          // Slight rotation
          drone.rotation.y += deltaTime * 0.5;
        }
      });
    }
    
    // Update healing particles if in healing state
    if (animData.state === 'healing' && animData.healingParticles) {
      animData.healingParticles.visible = true;
      // Additional healing particle animation logic
    } else if (animData.healingParticles) {
      animData.healingParticles.visible = false;
    }
  }
  
  // Create healing particles for Techno-Shaman
  createHealingParticles(mesh) {
    // Create a simple particle system for healing effects
    const particleCount = 20;
    const particles = new THREE.Group();
    
    const particleGeometry = new THREE.SphereGeometry(0.03, 4, 4);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x33FF99,
      transparent: true,
      opacity: 0.7
    });
    
    for (let i = 0; i < particleCount; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);
      
      // Random position around the mesh
      const theta = Math.random() * Math.PI * 2;
      const radius = 0.3 + Math.random() * 0.3;
      
      particle.position.set(
        Math.sin(theta) * radius,
        0.5 + Math.random() * 0.5,
        Math.cos(theta) * radius
      );
      
      // Store animation parameters
      particle.userData = {
        basePos: particle.position.clone(),
        phase: Math.random() * Math.PI * 2,
        speed: 1 + Math.random() * 2,
        amplitude: 0.1 + Math.random() * 0.2
      };
      
      particles.add(particle);
    }
    
    // Add update method to particles group
    particles.update = (deltaTime) => {
      const time = performance.now() * 0.001;
      
      particles.children.forEach(particle => {
        const params = particle.userData;
        
        // Orbital motion
        particle.position.x = params.basePos.x + Math.sin(time * params.speed + params.phase) * params.amplitude;
        particle.position.z = params.basePos.z + Math.cos(time * params.speed + params.phase) * params.amplitude;
        
        // Pulsing opacity
        particle.material.opacity = 0.3 + Math.sin(time * 2 + params.phase) * 0.3;
      });
    };
    
    // Add to mesh and register in particle systems
    mesh.add(particles);
    particles.visible = false; // Start hidden
    
    return particles;
  }
  
  // Initialize Solar Knight animations
  initSolarKnightAnimation(entityId, mesh) {
    // Find shield element for pulsing animation
    let shield = null;
    mesh.traverse(child => {
      if (child.material && child.material.opacity === 0.3) {
        shield = child;
      }
    });
    
    // Update animation data
    const animData = this.animations.get(entityId);
    if (animData) {
      animData.shield = shield;
      animData.solarFlares = this.createSolarFlares(mesh);
      this.animations.set(entityId, animData);
    }
  }
  
  // Update Solar Knight animations
  updateSolarKnightAnimation(entityId, animData, deltaTime) {
    animData.time += deltaTime;
    
    // Animate shield pulsing
    if (animData.shield) {
      animData.shield.material.opacity = 0.2 + Math.sin(animData.time * 2) * 0.1;
    }
    
    // Update solar flares if in damaged state
    if (animData.state === 'damaged' && animData.solarFlares) {
      animData.solarFlares.visible = true;
      // Additional solar flare animation logic
    } else if (animData.solarFlares) {
      animData.solarFlares.visible = false;
    }
  }
  
  // Create solar flares for Solar Knight
  createSolarFlares(mesh) {
    // Implementation similar to healing particles but with different colors and behavior
    const flares = new THREE.Group();
    // Implementation details...
    return flares;
  }
  
  // Initialize Neon Assassin animations
  initNeonAssassinAnimation(entityId, mesh) {
    // Find shimmer effect for invisibility animation
    let shimmer = null;
    mesh.traverse(child => {
      if (child.userData.shimmerParams) {
        shimmer = child;
      }
    });
    
    // Find floating targeting components
    const targetComps = [];
    mesh.traverse(child => {
      if (child.userData.floatParams) {
        targetComps.push(child);
      }
    });
    
    // Update animation data
    const animData = this.animations.get(entityId);
    if (animData) {
      animData.shimmer = shimmer;
      animData.targetComps = targetComps;
      this.animations.set(entityId, animData);
    }
  }
  
  // Update Neon Assassin animations
  updateNeonAssassinAnimation(entityId, animData, deltaTime) {
    animData.time += deltaTime;
    
    // Animate shimmer effect
    if (animData.shimmer) {
      const params = animData.shimmer.userData.shimmerParams;
      if (params) {
        // Pulsing opacity for shimmer effect
        animData.shimmer.material.opacity = params.baseOpacity + Math.sin(animData.time * params.speed) * 0.1;
        
        // Rotate wireframe for dynamic effect
        animData.shimmer.rotation.y += deltaTime * 0.2;
      }
    }
    
    // Animate floating targeting components
    if (animData.targetComps && animData.targetComps.length > 0) {
      animData.targetComps.forEach(comp => {
        const params = comp.userData.floatParams;
        if (params) {
          // Floating motion
          comp.position.z = params.baseZ + Math.sin(animData.time * params.speed + params.phase) * 0.1;
          
          // Rotation
          comp.rotation.z += deltaTime * 0.5;
        }
      });
    }
  }
  
  // Initialize Arcane Reactor animations
  initArcaneReactorAnimation(entityId, mesh) {
    // Find floating crystals
    const crystals = [];
    mesh.traverse(child => {
      if (child.userData.floatParams) {
        crystals.push(child);
      }
    });
    
    // Find energy beams
    const beams = [];
    mesh.traverse(child => {
      if (child.userData.pulseParams) {
        beams.push(child);
      }
    });
    
    // Update animation data
    const animData = this.animations.get(entityId);
    if (animData) {
      animData.crystals = crystals;
      animData.beams = beams;
      animData.energyWaves = this.createEnergyWaves(mesh);
      this.animations.set(entityId, animData);
    }
  }
  
  // Update Arcane Reactor animations
  updateArcaneReactorAnimation(entityId, animData, deltaTime) {
    animData.time += deltaTime;
    
    // Animate floating crystals
    if (animData.crystals && animData.crystals.length > 0) {
      animData.crystals.forEach(crystal => {
        const params = crystal.userData.floatParams;
        if (params) {
          // Floating motion
          crystal.position.y = params.baseY + Math.sin(animData.time * params.speed + params.phase) * 0.1;
          
          // Slight rotation
          crystal.rotation.y += deltaTime * 0.2;
        }
      });
    }
    
    // Animate energy beams
    if (animData.beams && animData.beams.length > 0) {
      animData.beams.forEach(beam => {
        const params = beam.userData.pulseParams;
        if (params) {
          // Pulsing opacity
          beam.material.opacity = params.baseOpacity + Math.sin(animData.time * params.speed + params.phase) * 0.2;
        }
      });
    }
    
    // Update energy waves
    if (animData.energyWaves) {
      animData.energyWaves.update(deltaTime);
    }
  }
  
  // Create energy waves for Arcane Reactor
  createEnergyWaves(mesh) {
    // Create expanding ring waves that emanate from the reactor
    const waves = new THREE.Group();
    const waveCount = 3;
    const waveMaterial = new THREE.MeshBasicMaterial({
      color: 0x00FFFF,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < waveCount; i++) {
      const waveGeometry = new THREE.RingGeometry(0.1, 0.15, 32);
      const wave = new THREE.Mesh(waveGeometry, waveMaterial.clone());
      wave.rotation.x = Math.PI / 2;
      wave.position.y = 0.1;
      
      // Store animation parameters
      wave.userData = {
        phase: (i / waveCount) * Math.PI * 2,
        speed: 0.5,
        maxRadius: 2.0
      };
      
      waves.add(wave);
    }
    
    // Add update method to waves group
    waves.update = (deltaTime) => {
      const time = performance.now() * 0.001;
      
      waves.children.forEach(wave => {
        const params = wave.userData;
        
        // Calculate current radius based on time and phase
        const cyclePos = ((time * params.speed + params.phase) % (Math.PI * 2)) / (Math.PI * 2);
        const radius = cyclePos * params.maxRadius;
        
        // Update geometry
        wave.scale.set(radius, radius, 1);
        
        // Fade out as it expands
        wave.material.opacity = 0.5 * (1 - cyclePos);
      });
    };
    
    // Add to mesh
    mesh.add(waves);
    
    return waves;
  }
  
  // Stub methods for other unit and building animations
  
  initBiohackerAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateBiohackerAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
  
  initScrapGolemAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateScrapGolemAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
  
  initEcoDroneAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateEcoDroneAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
  
  initReclaimedSanctuaryAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateReclaimedSanctuaryAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
  
  initBioforgeAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateBioforgeAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
  
  initManaWellAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateManaWellAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
  
  initScavengerOutpostAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateScavengerOutpostAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
  
  initHarmonicTowerAnimation(entityId, mesh) {
    // Implementation would go here
  }
  
  updateHarmonicTowerAnimation(entityId, animData, deltaTime) {
    // Implementation would go here
  }
}

export default AnimationFactory;
