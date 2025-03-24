// src/utils/ModelFactory.js
import * as THREE from 'three';

/**
 * ModelFactory - Creates complex 3D models for different entity types
 * This class centralizes model creation logic that was previously in RenderSystem
 */
class ModelFactory {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.debug = false;
  }

  // Create a unit model based on unit type
  createUnitModel(entityId, renderComponent, unitType, faction) {
    // Create a group to hold multiple geometries
    const group = new THREE.Group();
    
    // Default colors
    const factionColors = {
      player: 0x00ffff, // Cyan for player
      enemy: 0xff00ff,  // Magenta for enemy
      neutral: 0xffff00 // Yellow for neutral
    };
    
    const factionColor = factionColors[faction] || factionColors.player;
    
    // Base body material with faction color influence
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: renderComponent.color,
      opacity: renderComponent.opacity,
      transparent: renderComponent.opacity < 1,
      shininess: 30
    });

    // Create model based on unit type
    switch(unitType) {
      case 'techno_shaman':
        this.createTechnoShamanModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'solar_knight':
        this.createSolarKnightModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'neon_assassin':
        this.createNeonAssassinModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'biohacker':
        this.createBiohackerModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'scrap_golem':
        this.createScrapGolemModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'eco_drone':
        this.createEcoDroneModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'assault':
        this.createAssaultUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'support':
      case 'medic':
        this.createSupportUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'sniper':
        this.createSniperUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'tank':
        this.createTankUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'worker':
        this.createWorkerUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'heavy':
        this.createHeavyUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'light':
        this.createLightUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      case 'specialist':
        this.createSpecialistUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
        break;
      default:
        this.createBasicUnitModel(group, bodyMaterial, factionColor, renderComponent.opacity);
    }
    
    return group;
  }
  
  // Create a building model based on building type
  createBuildingModel(entityId, renderComponent, buildingType, faction) {
    // Create a group to hold multiple geometries
    const group = new THREE.Group();
    
    // Default colors
    const factionColors = {
      player: 0x00ffff, // Cyan for player
      enemy: 0xff00ff,  // Magenta for enemy
      neutral: 0xffff00 // Yellow for neutral
    };
    
    const factionColor = factionColors[faction] || factionColors.player;
    
    // Base building material
    const buildingMaterial = new THREE.MeshPhongMaterial({ 
      color: renderComponent.color,
      opacity: renderComponent.opacity,
      transparent: renderComponent.opacity < 1,
      shininess: 30
    });

    // Create model based on building type
    switch(buildingType) {
      case 'arcane_reactor':
        this.createArcaneReactorModel(group, buildingMaterial, factionColor, renderComponent.opacity);
        break;
      case 'reclaimed_sanctuary':
        this.createReclaimedSanctuaryModel(group, buildingMaterial, factionColor, renderComponent.opacity);
        break;
      case 'bioforge':
        this.createBioforgeModel(group, buildingMaterial, factionColor, renderComponent.opacity);
        break;
      case 'mana_well':
        this.createManaWellModel(group, buildingMaterial, factionColor, renderComponent.opacity);
        break;
      case 'scavenger_outpost':
        this.createScavengerOutpostModel(group, buildingMaterial, factionColor, renderComponent.opacity);
        break;
      case 'harmonic_tower':
        this.createHarmonicTowerModel(group, buildingMaterial, factionColor, renderComponent.opacity);
        break;
      case 'command_center':
        this.createCommandCenterModel(group, buildingMaterial, factionColor, renderComponent.opacity);
        break;
      default:
        this.createBasicBuildingModel(group, buildingMaterial, factionColor, renderComponent.opacity);
    }
    
    return group;
  }
  
  // Create a resource node model
  createResourceModel(entityId, renderComponent, resourceType) {
    const group = new THREE.Group();
    
    // Base resource material
    const resourceMaterial = new THREE.MeshPhongMaterial({ 
      color: renderComponent.color,
      opacity: renderComponent.opacity,
      transparent: renderComponent.opacity < 1,
      shininess: 50
    });
    
    // Create model based on resource type
    switch(resourceType) {
      case 'crystal':
        this.createCrystalResourceModel(group, resourceMaterial, renderComponent.opacity);
        break;
      case 'gas':
        this.createGasResourceModel(group, resourceMaterial, renderComponent.opacity);
        break;
      case 'biomass':
        this.createBiomassResourceModel(group, resourceMaterial, renderComponent.opacity);
        break;
      case 'tech':
        this.createTechResourceModel(group, resourceMaterial, renderComponent.opacity);
        break;
      default:
        this.createBasicResourceModel(group, resourceMaterial, renderComponent.opacity);
    }
    
    return group;
  }
  
  // Create a terrain object model
  createTerrainObjectModel(entityId, renderComponent, objectType) {
    const group = new THREE.Group();
    
    // Base terrain object material
    const terrainMaterial = new THREE.MeshPhongMaterial({ 
      color: renderComponent.color,
      opacity: renderComponent.opacity,
      transparent: renderComponent.opacity < 1,
      shininess: 10
    });
    
    // Create model based on terrain object type
    switch(objectType) {
      case 'rock':
        this.createRockModel(group, terrainMaterial, renderComponent.opacity);
        break;
      case 'hill':
        this.createHillModel(group, terrainMaterial, renderComponent.opacity);
        break;
      case 'server_monolith':
        this.createServerMonolithModel(group, terrainMaterial, renderComponent.opacity);
        break;
      case 'floating_crystal':
        this.createFloatingCrystalModel(group, terrainMaterial, renderComponent.opacity);
        break;
      case 'corrupted_machine':
        this.createCorruptedMachineModel(group, terrainMaterial, renderComponent.opacity);
        break;
      case 'circuit_tree':
        this.createCircuitTreeModel(group, terrainMaterial, renderComponent.opacity);
        break;
      case 'holographic_ruin':
        this.createHolographicRuinModel(group, terrainMaterial, renderComponent.opacity);
        break;
      case 'energy_geyser':
        this.createEnergyGeyserModel(group, terrainMaterial, renderComponent.opacity);
        break;
      default:
        this.createBasicTerrainObjectModel(group, terrainMaterial, renderComponent.opacity);
    }
    
    return group;
  }
  
  // Implementation of specific model creation methods
  
  // New Unit Models
  
  createTechnoShamanModel(group, bodyMaterial, factionColor, opacity) {
    // Base robed figure
    const bodyGeometry = new THREE.CylinderGeometry(0.35, 0.5, 1.3, 8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Hood with solar panels
    const hoodGeometry = new THREE.SphereGeometry(0.25, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const hoodMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1
    });
    const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
    hood.position.y = 0.8;
    hood.rotation.x = Math.PI;
    group.add(hood);
    
    // Solar panels on hood
    const panelGeometry = new THREE.BoxGeometry(0.1, 0.02, 0.1);
    const panelMaterial = new THREE.MeshPhongMaterial({
      color: 0x1155aa,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 80
    });
    
    for (let i = 0; i < 3; i++) {
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(
        Math.sin(i * Math.PI * 2/3) * 0.2,
        0.85,
        Math.cos(i * Math.PI * 2/3) * 0.2
      );
      panel.rotation.x = -Math.PI / 4;
      panel.rotation.y = i * Math.PI * 2/3;
      group.add(panel);
    }
    
    // Staff with crystal
    const staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6);
    const staffMaterial = new THREE.MeshPhongMaterial({
      color: 0x555555,
      opacity: opacity,
      transparent: opacity < 1
    });
    const staff = new THREE.Mesh(staffGeometry, staffMaterial);
    staff.position.set(0.4, 0.5, 0);
    group.add(staff);
    
    // Crystal at top of staff
    const crystalGeometry = new THREE.OctahedronGeometry(0.12, 1);
    const crystalMaterial = new THREE.MeshPhongMaterial({
      color: 0x00FF99,
      emissive: 0x00FF99,
      emissiveIntensity: 0.7,
      opacity: opacity,
      transparent: true
    });
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystal.position.set(0.4, 1.3, 0);
    crystal.rotation.y = Math.PI / 4;
    group.add(crystal);
    
    // Small hovering drones
    const droneGeometry = new THREE.SphereGeometry(0.08, 8, 8);
    const droneMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.3,
      opacity: opacity,
      transparent: opacity < 1
    });
    
    for (let i = 0; i < 2; i++) {
      const drone = new THREE.Mesh(droneGeometry, droneMaterial);
      drone.position.set(
        i === 0 ? 0.3 : -0.3,
        1.1,
        i === 0 ? 0.3 : -0.3
      );
      
      // Add small antenna to drone
      const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.1, 4);
      const antenna = new THREE.Mesh(antennaGeometry, staffMaterial);
      antenna.position.y = 0.08;
      drone.add(antenna);
      
      group.add(drone);
      
      // Store animation parameters in userData
      drone.userData.hoverParams = {
        baseY: drone.position.y,
        phase: i * Math.PI,
        speed: 2 + Math.random()
      };
    }
    
    // Add circuit patterns to robe
    this.addCircuitPatterns(body, factionColor, opacity);
    
    return group;
  }
  
  createSolarKnightModel(group, bodyMaterial, factionColor, opacity) {
    // Bulky lower body with mechanical legs
    const lowerBodyGeometry = new THREE.CylinderGeometry(0.45, 0.55, 0.6, 8);
    const lowerBodyMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 50
    });
    const lowerBody = new THREE.Mesh(lowerBodyGeometry, lowerBodyMaterial);
    lowerBody.position.y = -0.3;
    group.add(lowerBody);
    
    // Armored chest with central solar panel
    const chestGeometry = new THREE.CylinderGeometry(0.4, 0.45, 0.7, 8);
    const chest = new THREE.Mesh(chestGeometry, bodyMaterial);
    chest.position.y = 0.35;
    group.add(chest);
    
    // Solar panel core
    const panelGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.1);
    const panelMaterial = new THREE.MeshPhongMaterial({
      color: 0x1155aa,
      emissive: 0x1155aa,
      emissiveIntensity: 0.3,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 80
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.set(0, 0.35, 0.35);
    panel.rotation.x = Math.PI / 2;
    group.add(panel);
    
    // Helmet with glowing visor
    const helmetGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const helmetMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 70
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 0.85;
    group.add(helmet);
    
    // Visor
    const visorGeometry = new THREE.BoxGeometry(0.3, 0.08, 0.05);
    const visorMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.7,
      opacity: opacity,
      transparent: true
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 0.85, 0.2);
    group.add(visor);
    
    // Small antennae
    const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.15, 4);
    const antennaMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      opacity: opacity,
      transparent: opacity < 1
    });
    
    for (let i = 0; i < 2; i++) {
      const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna.position.set(
        i === 0 ? 0.15 : -0.15,
        1.05,
        0
      );
      group.add(antenna);
    }
    
    // Energy shield
    const shieldGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16, 1, true);
    const shieldMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.3,
      opacity: 0.3,
      transparent: true,
      side: THREE.DoubleSide
    });
    const shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    shield.position.set(0.6, 0.4, 0);
    shield.rotation.z = Math.PI / 2;
    group.add(shield);
    
    // Pulse emitter (weapon)
    const emitterGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.3, 8);
    const emitterMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1
    });
    const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
    emitter.position.set(-0.5, 0.4, 0);
    emitter.rotation.z = Math.PI / 2;
    group.add(emitter);
    
    // Emitter glow
    const glowGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const glowMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.8,
      opacity: 0.7,
      transparent: true
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(-0.65, 0.4, 0);
    group.add(glow);
    
    // Add mechanical details to legs
    this.addMechanicalDetails(lowerBody, factionColor, opacity);
    
    return group;
  }
  
  // Helper methods for adding details
  
  addCircuitPatterns(mesh, color, opacity) {
    // Add glowing circuit patterns to a mesh
    const circuitMaterial = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.7 * opacity,
      transparent: true
    });
    
    // Horizontal rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(0.4 - i * 0.05, 0.01, 8, 16);
      const ring = new THREE.Mesh(ringGeometry, circuitMaterial);
      ring.position.y = -0.3 + i * 0.3;
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }
    
    // Vertical lines
    for (let i = 0; i < 4; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.01, 1, 0.01);
      const line = new THREE.Mesh(lineGeometry, circuitMaterial);
      const angle = i * Math.PI / 2;
      line.position.set(
        Math.sin(angle) * 0.38,
        0,
        Math.cos(angle) * 0.38
      );
      mesh.add(line);
    }
  }
  
  addMechanicalDetails(mesh, color, opacity) {
    // Add mechanical details to a mesh
    const detailMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      opacity: opacity,
      transparent: opacity < 1
    });
    
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.7 * opacity,
      transparent: true
    });
    
    // Pistons
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const pistonGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6);
      const piston = new THREE.Mesh(pistonGeometry, detailMaterial);
      piston.position.set(
        Math.sin(angle) * 0.3,
        -0.15,
        Math.cos(angle) * 0.3
      );
      piston.rotation.x = Math.PI / 6;
      piston.rotation.y = angle;
      mesh.add(piston);
      
      // Piston glow
      const glowGeometry = new THREE.SphereGeometry(0.02, 6, 6);
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = -0.1;
      piston.add(glow);
    }
    
    // Joints
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2 + Math.PI / 4;
      const jointGeometry = new THREE.SphereGeometry(0.05, 8, 8);
      const joint = new THREE.Mesh(jointGeometry, detailMaterial);
      joint.position.set(
        Math.sin(angle) * 0.4,
        -0.25,
        Math.cos(angle) * 0.4
      );
      mesh.add(joint);
    }
  }
  
  // Implement other model creation methods similarly
  // For brevity, I'll include stubs for the remaining methods
  
  createNeonAssassinModel(group, bodyMaterial, factionColor, opacity) {
    // Slim, agile figure with tight-fitting suit
    const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Sleek helmet with targeting lenses
    const helmetGeometry = new THREE.SphereGeometry(0.22, 8, 8);
    const helmetMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 90
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.position.y = 0.8;
    group.add(helmet);
    
    // Multiple targeting lenses
    const lensGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const lensMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.8,
      opacity: opacity,
      transparent: true
    });
    
    // Main lens
    const mainLens = new THREE.Mesh(lensGeometry, lensMaterial);
    mainLens.position.set(0, 0.82, 0.18);
    mainLens.scale.set(1, 0.7, 0.5);
    group.add(mainLens);
    
    // Secondary lenses
    for (let i = 0; i < 2; i++) {
      const lens = new THREE.Mesh(lensGeometry, lensMaterial);
      lens.position.set(
        i === 0 ? 0.12 : -0.12,
        0.85,
        0.15
      );
      lens.scale.set(0.6, 0.4, 0.3);
      group.add(lens);
    }
    
    // Long energy rifle
    const rifleBodyGeometry = new THREE.BoxGeometry(0.05, 0.05, 1.2);
    const rifleMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1
    });
    const rifleBody = new THREE.Mesh(rifleBodyGeometry, rifleMaterial);
    rifleBody.position.set(0.4, 0.4, 0);
    rifleBody.rotation.y = Math.PI / 2;
    group.add(rifleBody);
    
    // Rifle scope
    const scopeGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const scope = new THREE.Mesh(scopeGeometry, rifleMaterial);
    scope.position.set(0.4, 0.48, 0);
    scope.rotation.z = Math.PI / 2;
    group.add(scope);
    
    // Floating targeting components
    const targetCompGeometry = new THREE.RingGeometry(0.04, 0.05, 16);
    const targetCompMaterial = new THREE.MeshBasicMaterial({
      color: factionColor,
      opacity: 0.8 * opacity,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < 2; i++) {
      const targetComp = new THREE.Mesh(targetCompGeometry, targetCompMaterial);
      targetComp.position.set(
        0.4,
        0.4,
        i === 0 ? 0.4 : -0.4
      );
      targetComp.rotation.y = Math.PI / 2;
      group.add(targetComp);
      
      // Store animation parameters in userData
      targetComp.userData.floatParams = {
        baseZ: targetComp.position.z,
        phase: i * Math.PI,
        speed: 3 + Math.random()
      };
    }
    
    // Small jetpack
    const jetpackGeometry = new THREE.BoxGeometry(0.25, 0.3, 0.15);
    const jetpack = new THREE.Mesh(jetpackGeometry, rifleMaterial);
    jetpack.position.set(0, 0.4, -0.25);
    group.add(jetpack);
    
    // Jetpack thrusters
    const thrusterGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.1, 8);
    const thrusterMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      opacity: opacity,
      transparent: opacity < 1
    });
    
    for (let i = 0; i < 2; i++) {
      const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
      thruster.position.set(
        i === 0 ? 0.08 : -0.08,
        0.25,
        -0.3
      );
      group.add(thruster);
      
      // Thruster glow
      const glowGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const glowMaterial = new THREE.MeshPhongMaterial({
        color: factionColor,
        emissive: factionColor,
        emissiveIntensity: 0.8,
        opacity: 0.7,
        transparent: true
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = -0.06;
      thruster.add(glow);
    }
    
    // Add shimmer effect for partial invisibility
    this.addShimmerEffect(body, factionColor, opacity);
    
    return group;
  }
  
  addShimmerEffect(mesh, color, opacity) {
    // Add shimmer effect for partial invisibility
    const shimmerMaterial = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.2 * opacity,
      transparent: true,
      wireframe: true
    });
    
    const shimmerGeometry = new THREE.CylinderGeometry(0.32, 0.42, 1.22, 16, 3);
    const shimmer = new THREE.Mesh(shimmerGeometry, shimmerMaterial);
    mesh.add(shimmer);
    
    // Store animation parameters in userData
    shimmer.userData.shimmerParams = {
      baseOpacity: shimmerMaterial.opacity,
      phase: 0,
      speed: 2
    };
  }
  
  // Stub methods for other unit types
  createBiohackerModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Add biohacker-specific elements
  }
  
  createScrapGolemModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Add scrap golem-specific elements
  }
  
  createEcoDroneModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Add eco-drone operator-specific elements
  }
  
  // Original unit models
  createBasicUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Base body geometry
    const bodyGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.2, 8);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);
    
    // Staff/wand
    const staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
    const staffMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x222222,
      opacity: opacity,
      transparent: opacity < 1
    });
    const staff = new THREE.Mesh(staffGeometry, staffMaterial);
    staff.position.set(0.4, 0.5, 0);
    group.add(staff);
    
    // Orb
    const orbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const orbMaterial = new THREE.MeshPhongMaterial({ 
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.7,
      opacity: opacity,
      transparent: true
    });
    const orb = new THREE.Mesh(orbGeometry, orbMaterial);
    orb.position.set(0.4, 1.1, 0);
    group.add(orb);
    
    // Shoulders
    const shoulderGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8);
    const shoulderMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1
    });
    
    for (let i = 0; i < 2; i++) {
      const shoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
      shoulder.position.set(
        i === 0 ? 0.3 : -0.3,
        0.5,
        0
      );
      shoulder.rotation.z = Math.PI / 2;
      group.add(shoulder);
    }
    
    // Cybernetic elements
    const cyberGeometry = new THREE.BoxGeometry(0.1, 0.03, 0.3);
    const cyberMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9 * opacity
    });
    
    for (let i = 0; i < 3; i++) {
      const cyber = new THREE.Mesh(cyberGeometry, cyberMaterial);
      cyber.position.set(
        0,
        0.2 + i * 0.3,
        0.25
      );
      group.add(cyber);
    }
    
    return group;
  }
  
  createAssaultUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for assault unit specifics
  }
  
  createSupportUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for support unit specifics
  }
  
  createSniperUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for sniper unit specifics
  }
  
  createTankUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for tank unit specifics
  }
  
  createWorkerUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for worker unit specifics
  }
  
  createHeavyUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for heavy unit specifics
  }
  
  createLightUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for light unit specifics
  }
  
  createSpecialistUnitModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation based on existing code
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Modify for specialist unit specifics
  }
  
  // Building models
  
  createArcaneReactorModel(group, buildingMaterial, factionColor, opacity) {
    // Circular platform with runic inscriptions
    const baseGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.2, 16);
    const baseMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      opacity: opacity,
      transparent: opacity < 1
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = -0.1;
    group.add(base);
    
    // Add runic inscriptions to base
    this.addRunicInscriptions(base, factionColor, opacity);
    
    // Central crystal array
    for (let i = 0; i < 5; i++) {
      const angle = i * Math.PI * 2 / 5;
      const radius = 0.4;
      
      const crystalGeometry = new THREE.ConeGeometry(0.1, 0.5, 5);
      const crystalMaterial = new THREE.MeshPhongMaterial({
        color: factionColor,
        emissive: factionColor,
        emissiveIntensity: 0.6,
        opacity: opacity,
        transparent: true,
        shininess: 80
      });
      
      const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
      crystal.position.set(
        Math.sin(angle) * radius,
        0.5,
        Math.cos(angle) * radius
      );
      crystal.rotation.x = Math.PI;
      
      // Store animation parameters in userData
      crystal.userData.floatParams = {
        baseY: crystal.position.y,
        phase: i * Math.PI / 2.5,
        speed: 1 + Math.random() * 0.5
      };
      
      group.add(crystal);
    }
    
    // Solar panels in mandala pattern
    const panelGeometry = new THREE.BoxGeometry(0.4, 0.05, 0.6);
    const panelMaterial = new THREE.MeshPhongMaterial({
      color: 0x1155aa,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 70
    });
    
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const radius = 0.8;
      
      const panel = new THREE.Mesh(panelGeometry, panelMaterial);
      panel.position.set(
        Math.sin(angle) * radius,
        0.1,
        Math.cos(angle) * radius
      );
      panel.rotation.y = angle + Math.PI / 2;
      panel.rotation.x = Math.PI / 12;
      
      group.add(panel);
      
      // Add glow to panel
      const glowGeometry = new THREE.PlaneGeometry(0.3, 0.5);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: factionColor,
        opacity: 0.3 * opacity,
        transparent: true,
        side: THREE.DoubleSide
      });
      
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.y = 0.03;
      panel.add(glow);
    }
    
    // Energy beams
    const beamGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: factionColor,
      opacity: 0.4 * opacity,
      transparent: true
    });
    
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3;
      const radius = 0.3;
      
      const beam = new THREE.Mesh(beamGeometry, beamMaterial);
      beam.position.set(
        Math.sin(angle) * radius,
        0.8,
        Math.cos(angle) * radius
      );
      
      // Store animation parameters in userData
      beam.userData.pulseParams = {
        baseOpacity: beamMaterial.opacity,
        phase: i * Math.PI / 1.5,
        speed: 2 + Math.random()
      };
      
      group.add(beam);
    }
    
    return group;
  }
  
  addRunicInscriptions(mesh, color, opacity) {
    // Add runic inscriptions to a mesh
    const runesMaterial = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.7 * opacity,
      transparent: true
    });
    
    // Inner circle
    const innerCircleGeometry = new THREE.RingGeometry(0.6, 0.65, 32);
    const innerCircle = new THREE.Mesh(innerCircleGeometry, runesMaterial);
    innerCircle.position.y = 0.11;
    innerCircle.rotation.x = -Math.PI / 2;
    mesh.add(innerCircle);
    
    // Outer circle
    const outerCircleGeometry = new THREE.RingGeometry(1.0, 1.05, 32);
    const outerCircle = new THREE.Mesh(outerCircleGeometry, runesMaterial);
    outerCircle.position.y = 0.11;
    outerCircle.rotation.x = -Math.PI / 2;
    mesh.add(outerCircle);
    
    // Rune symbols
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4;
      const radius = 0.8;
      
      // Create a simple rune shape
      const runeGeometry = new THREE.PlaneGeometry(0.1, 0.1);
      const rune = new THREE.Mesh(runeGeometry, runesMaterial);
      rune.position.set(
        Math.sin(angle) * radius,
        0.11,
        Math.cos(angle) * radius
      );
      rune.rotation.x = -Math.PI / 2;
      
      // Add random rotation for variety
      rune.rotation.z = Math.random() * Math.PI;
      
      mesh.add(rune);
    }
    
    // Connecting lines
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      
      const lineGeometry = new THREE.PlaneGeometry(0.8, 0.03);
      const line = new THREE.Mesh(lineGeometry, runesMaterial);
      line.position.set(0, 0.11, 0);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = angle;
      
      mesh.add(line);
    }
  }
  
  // Stub methods for other building types
  createReclaimedSanctuaryModel(group, buildingMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicBuildingModel(group, buildingMaterial, factionColor, opacity);
    // Add reclaimed sanctuary-specific elements
  }
  
  createBioforgeModel(group, buildingMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicBuildingModel(group, buildingMaterial, factionColor, opacity);
    // Add bioforge-specific elements
  }
  
  createManaWellModel(group, buildingMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicBuildingModel(group, buildingMaterial, factionColor, opacity);
    // Add mana well-specific elements
  }
  
  createScavengerOutpostModel(group, buildingMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicBuildingModel(group, buildingMaterial, factionColor, opacity);
    // Add scavenger outpost-specific elements
  }
  
  createHarmonicTowerModel(group, buildingMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicBuildingModel(group, buildingMaterial, factionColor, opacity);
    // Add harmonic tower-specific elements
  }
  
  createCommandCenterModel(group, buildingMaterial, factionColor, opacity) {
    // Base building
    const baseGeometry = new THREE.BoxGeometry(2, 1.5, 2);
    const base = new THREE.Mesh(baseGeometry, buildingMaterial);
    group.add(base);
    
    // Add windows
    const windowGeometry = new THREE.PlaneGeometry(0.4, 0.3);
    const windowMaterial = new THREE.MeshPhongMaterial({
      color: 0x88CCFF,
      opacity: 0.7 * opacity,
      transparent: true,
      emissive: 0x88CCFF,
      emissiveIntensity: 0.3
    });
    
    for (let i = 0; i < 4; i++) {
      const window = new THREE.Mesh(windowGeometry, windowMaterial);
      window.position.set(0, 0.3, 0);
      window.position.x = Math.sin(i * Math.PI/2) * 1.01;
      window.position.z = Math.cos(i * Math.PI/2) * 1.01;
      window.rotation.y = i * Math.PI/2;
      group.add(window);
    }
    
    // Add antennae
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
    const antennaMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x888888,
      opacity: opacity,
      transparent: opacity < 1
    });
    
    const antenna1 = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna1.position.set(0.3, 1.0, 0.3);
    group.add(antenna1);
    
    const antenna2 = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna2.position.set(-0.3, 1.0, -0.3);
    group.add(antenna2);
    
    // Add glow effect to antenna tips
    const glowGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const glowMaterial = new THREE.MeshPhongMaterial({ 
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9 * opacity
    });
    
    const glow1 = new THREE.Mesh(glowGeometry, glowMaterial);
    glow1.position.set(0.3, 1.25, 0.3);
    group.add(glow1);
    
    const glow2 = new THREE.Mesh(glowGeometry, glowMaterial);
    glow2.position.set(-0.3, 1.25, -0.3);
    group.add(glow2);
    
    // Add cybernetic elements
    this.addBuildingCyberneticElements(group, factionColor, opacity);
    
    return group;
  }
  
  addBuildingCyberneticElements(group, color, opacity) {
    // Add cybernetic elements to a building
    const cyberMaterial = new THREE.MeshPhongMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.9 * opacity
    });
    
    // Horizontal lines
    for (let i = 0; i < 3; i++) {
      const lineGeometry = new THREE.BoxGeometry(2.1, 0.05, 0.05);
      const line = new THREE.Mesh(lineGeometry, cyberMaterial);
      line.position.set(0, -0.5 + i * 0.5, 1.03);
      group.add(line);
      
      const lineBack = new THREE.Mesh(lineGeometry, cyberMaterial);
      lineBack.position.set(0, -0.5 + i * 0.5, -1.03);
      group.add(lineBack);
    }
    
    // Vertical lines
    for (let i = 0; i < 3; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.05, 1.6, 0.05);
      const line = new THREE.Mesh(lineGeometry, cyberMaterial);
      line.position.set(-1 + i * 1, 0, 1.03);
      group.add(line);
      
      const lineBack = new THREE.Mesh(lineGeometry, cyberMaterial);
      lineBack.position.set(-1 + i * 1, 0, -1.03);
      group.add(lineBack);
    }
    
    // Side lines
    for (let i = 0; i < 3; i++) {
      const lineGeometry = new THREE.BoxGeometry(0.05, 0.05, 2.1);
      const line = new THREE.Mesh(lineGeometry, cyberMaterial);
      line.position.set(1.03, -0.5 + i * 0.5, 0);
      group.add(line);
      
      const lineBack = new THREE.Mesh(lineGeometry, cyberMaterial);
      lineBack.position.set(-1.03, -0.5 + i * 0.5, 0);
      group.add(lineBack);
    }
  }
  
  createBasicBuildingModel(group, buildingMaterial, factionColor, opacity) {
    // Simple building
    const baseGeometry = new THREE.BoxGeometry(1.5, 1, 1.5);
    const base = new THREE.Mesh(baseGeometry, buildingMaterial);
    group.add(base);
    
    // Add simple details
    const roofGeometry = new THREE.BoxGeometry(1.7, 0.1, 1.7);
    const roofMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1
    });
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 0.55;
    group.add(roof);
    
    // Add a simple antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4);
    const antennaMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x888888,
      opacity: opacity,
      transparent: opacity < 1
    });
    
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 0.8, 0);
    group.add(antenna);
    
    // Add glow to antenna
    const glowGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const glowMaterial = new THREE.MeshPhongMaterial({ 
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.9 * opacity
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(0, 1.0, 0);
    group.add(glow);
    
    return group;
  }
  
  // Resource models
  
  createBasicResourceModel(group, resourceMaterial, opacity) {
    const resourceGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 8);
    const resource = new THREE.Mesh(resourceGeometry, resourceMaterial);
    resource.rotation.x = Math.PI / 2; // Lay flat
    group.add(resource);
    
    return group;
  }
  
  createCrystalResourceModel(group, resourceMaterial, opacity) {
    // Implementation would go here
    this.createBasicResourceModel(group, resourceMaterial, opacity);
    // Add crystal-specific elements
  }
  
  createGasResourceModel(group, resourceMaterial, opacity) {
    // Implementation would go here
    this.createBasicResourceModel(group, resourceMaterial, opacity);
    // Add gas-specific elements
  }
  
  createBiomassResourceModel(group, resourceMaterial, opacity) {
    // Implementation would go here
    this.createBasicResourceModel(group, resourceMaterial, opacity);
    // Add biomass-specific elements
  }
  
  createTechResourceModel(group, resourceMaterial, opacity) {
    // Implementation would go here
    this.createBasicResourceModel(group, resourceMaterial, opacity);
    // Add tech-specific elements
  }
  
  // Terrain object models
  
  createBasicTerrainObjectModel(group, terrainMaterial, opacity) {
    const terrainGeometry = new THREE.BoxGeometry(1, 1, 1);
    const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
    group.add(terrain);
    
    return group;
  }
  
  createRockModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add rock-specific elements
  }
  
  createHillModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add hill-specific elements
  }
  
  createServerMonolithModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add server monolith-specific elements
  }
  
  createFloatingCrystalModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add floating crystal-specific elements
  }
  
  createCorruptedMachineModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add corrupted machine-specific elements
  }
  
  createCircuitTreeModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add circuit tree-specific elements
  }
  
  createHolographicRuinModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add holographic ruin-specific elements
  }
  
  createEnergyGeyserModel(group, terrainMaterial, opacity) {
    // Implementation would go here
    this.createBasicTerrainObjectModel(group, terrainMaterial, opacity);
    // Add energy geyser-specific elements
  }
}

export default ModelFactory;
