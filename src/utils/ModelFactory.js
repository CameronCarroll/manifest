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
    this.modelCache = new Map(); // Add model caching
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
    
    // Staff with crystal (make it more like a laser sword)
    const staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 8);
    const staffMaterial = new THREE.MeshPhongMaterial({
      color: 0x555555,
      opacity: opacity,
      transparent: opacity < 1
    });
    const staff = new THREE.Mesh(staffGeometry, staffMaterial);
    staff.position.set(0.4, 0.5, 0);
    group.add(staff);

    // Energy blade (laser sword effect)
    const bladeGeometry = new THREE.CylinderGeometry(0.04, 0.02, 1.0, 8);
    const bladeMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffaa,
      emissive: 0x00ffaa,
      emissiveIntensity: 0.9,
      opacity: 0.8,
      transparent: true
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 0.8, 0); // Position at the end of the staff
    staff.add(blade);
    
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
    // Create a more anatomical body instead of a simple cylinder
    // First create a group for the body so we can add the shimmer effect to it all
    const bodyGroup = new THREE.Group();
    group.add(bodyGroup);
    
    // Torso - sleeker and more humanoid
    const torsoGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.6, 8);
    const torsoMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111, // Very dark for stealth suit
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 70 // High-tech glossy material
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 0.3;
    bodyGroup.add(torso);
    
    // Add tech lines to suit - glowing faction-colored circuitry
    this.addTechLines(torso, factionColor, opacity);
    
    // Shoulders - angular and armored
    const shoulderGeometry = new THREE.BoxGeometry(0.12, 0.1, 0.15);
    const shoulderMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 50
    });
    
    // Left shoulder
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    leftShoulder.position.set(-0.3, 0.5, 0);
    leftShoulder.rotation.z = -0.3; // Angle outward
    bodyGroup.add(leftShoulder);
    
    // Right shoulder
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
    rightShoulder.position.set(0.3, 0.5, 0);
    rightShoulder.rotation.z = 0.3; // Angle outward
    bodyGroup.add(rightShoulder);
    
    // Arms - sleek and cybernetic
    const upperArmGeometry = new THREE.CylinderGeometry(0.05, 0.04, 0.3, 6);
    const armMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 80
    });
    
    // Left arm
    const leftArm = new THREE.Mesh(upperArmGeometry, armMaterial);
    leftArm.position.set(-0.3, 0.35, 0);
    leftArm.rotation.z = 0.2;
    bodyGroup.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(upperArmGeometry, armMaterial);
    rightArm.position.set(0.3, 0.35, 0);
    rightArm.rotation.z = -0.2;
    bodyGroup.add(rightArm);
    
    // Legs - streamlined for mobility
    const upperLegGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.4, 6);
    const legMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 60
    });
    
    // Add tech armor plates to legs - angular shapes
    const plateGeometry = new THREE.BoxGeometry(0.15, 0.1, 0.12);
    const plateMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 80
    });
    
    // Left leg
    const leftLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
    leftLeg.position.set(-0.15, -0.1, 0);
    bodyGroup.add(leftLeg);
    
    const leftPlate = new THREE.Mesh(plateGeometry, plateMaterial);
    leftPlate.position.set(-0.17, -0.05, 0.08);
    leftPlate.rotation.x = 0.2;
    bodyGroup.add(leftPlate);
    
    // Right leg
    const rightLeg = new THREE.Mesh(upperLegGeometry, legMaterial);
    rightLeg.position.set(0.15, -0.1, 0);
    bodyGroup.add(rightLeg);
    
    const rightPlate = new THREE.Mesh(plateGeometry, plateMaterial);
    rightPlate.position.set(0.17, -0.05, 0.08);
    rightPlate.rotation.x = 0.2;
    bodyGroup.add(rightPlate);
    
    // Lower legs - cybernetic and agile
    const lowerLegGeometry = new THREE.CylinderGeometry(0.07, 0.05, 0.35, 6);
    
    // Left lower leg
    const leftLowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
    leftLowerLeg.position.set(-0.15, -0.45, 0);
    bodyGroup.add(leftLowerLeg);
    
    // Right lower leg
    const rightLowerLeg = new THREE.Mesh(lowerLegGeometry, legMaterial);
    rightLowerLeg.position.set(0.15, -0.45, 0);
    bodyGroup.add(rightLowerLeg);
    
    // Helmet - redesigned with more details and visor
    const helmetGroup = new THREE.Group();
    helmetGroup.position.y = 0.7;
    group.add(helmetGroup);
    
    // Base helmet shape - still sleek but more defined
    const helmetGeometry = new THREE.SphereGeometry(0.2, 12, 12);
    const helmetMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 90
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.scale.y = 1.1; // Elongate vertically
    helmet.scale.z = 1.1; // Extend forward slightly
    helmetGroup.add(helmet);
    
    // Visor - wide and angular
    const visorGeometry = new THREE.BoxGeometry(0.35, 0.1, 0.05);
    const visorMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.4,
      opacity: 0.7 * opacity,
      transparent: true,
      shininess: 100
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(0, 0.02, 0.15);
    visor.rotation.x = 0.2; // Angle downward slightly
    helmetGroup.add(visor);
    
    // Targeting lenses - more defined and technological
    // Main targeting lens
    const mainLensGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.05, 8);
    const lensMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.8,
      opacity: opacity,
      transparent: true,
      shininess: 100
    });
    
    const mainLens = new THREE.Mesh(mainLensGeometry, lensMaterial);
    mainLens.position.set(0.12, 0.1, 0.15);
    mainLens.rotation.x = Math.PI/2;
    helmetGroup.add(mainLens);
    
    // Lens glowing end
    const lensGlowGeometry = new THREE.CircleGeometry(0.03, 8);
    const lensGlowMaterial = new THREE.MeshBasicMaterial({
      color: factionColor,
      opacity: 0.9 * opacity,
      transparent: true
    });
    
    const lensGlow = new THREE.Mesh(lensGlowGeometry, lensGlowMaterial);
    lensGlow.position.set(0.12, 0.1, 0.175);
    lensGlow.rotation.x = Math.PI/2;
    helmetGroup.add(lensGlow);
    
    // Secondary smaller lenses
    for (let i = 0; i < 2; i++) {
      const smallLensGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.04, 6);
      const smallLens = new THREE.Mesh(smallLensGeometry, lensMaterial);
      smallLens.position.set(
        i === 0 ? -0.15 : 0.15,
        i === 0 ? 0.05 : -0.05,
        0.16
      );
      smallLens.rotation.x = Math.PI/2;
      helmetGroup.add(smallLens);
      
      // Small lens glow
      const smallGlowGeometry = new THREE.CircleGeometry(0.015, 6);
      const smallGlow = new THREE.Mesh(smallGlowGeometry, lensGlowMaterial);
      smallGlow.position.set(
        i === 0 ? -0.15 : 0.15,
        i === 0 ? 0.05 : -0.05,
        0.181
      );
      smallGlow.rotation.x = Math.PI/2;
      helmetGroup.add(smallGlow);
    }
    
    // Angular armor pieces on helmet
    const helmetPlateGeometry = new THREE.BoxGeometry(0.15, 0.08, 0.1);
    const helmetPlateMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 70
    });
    
    // Top helmet plate
    const topPlate = new THREE.Mesh(helmetPlateGeometry, helmetPlateMaterial);
    topPlate.position.set(0, 0.16, 0);
    topPlate.rotation.x = -0.3;
    helmetGroup.add(topPlate);
    
    // Back helmet plate/antenna housing
    const backPlate = new THREE.Mesh(helmetPlateGeometry, helmetPlateMaterial);
    backPlate.scale.set(0.8, 1, 0.6);
    backPlate.position.set(0, 0.05, -0.15);
    helmetGroup.add(backPlate);
    
    // Small antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.005, 0.15, 4);
    const antennaMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 80
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0, 0.15, -0.15);
    helmetGroup.add(antenna);
    
    // Antenna tip glow
    const antennaTipGeometry = new THREE.SphereGeometry(0.01, 6, 6);
    const antennaTipMaterial = new THREE.MeshBasicMaterial({
      color: factionColor,
      opacity: 0.9 * opacity,
      transparent: true
    });
    const antennaTip = new THREE.Mesh(antennaTipGeometry, antennaTipMaterial);
    antennaTip.position.y = 0.075;
    antenna.add(antennaTip);
    
    // FIXED - Create right hand to hold the rifle
    const handGeometry = new THREE.SphereGeometry(0.04, 8, 8);
    const handMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 60
    });
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(0.5, 0.4, 0.1);
    rightHand.scale.set(1, 0.8, 0.8); // Slightly flattened hand
    bodyGroup.add(rightHand);
    
    // FIXED - Right forearm connecting to hand
    const forearmGeometry = new THREE.CylinderGeometry(0.04, 0.05, 0.25, 6);
    const rightForearm = new THREE.Mesh(forearmGeometry, armMaterial);
    rightForearm.position.set(0.4, 0.4, 0.05);
    rightForearm.rotation.z = Math.PI/2; // Horizontal
    bodyGroup.add(rightForearm);
    
    // -------- RIFLE - COMPLETELY REDESIGNED FOR PROPER POSITIONING --------
    // Create a rifle group that's positioned relative to the hand
    const rifleGroup = new THREE.Group();
    rifleGroup.position.set(0.6, 0.4, 0.1); // Position at the hand
    group.add(rifleGroup);
    
    // Main rifle body
    const rifleMainGeometry = new THREE.BoxGeometry(1.1, 0.06, 0.08);
    const rifleMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 50
    });
    const rifleMain = new THREE.Mesh(rifleMainGeometry, rifleMaterial);
    rifleMain.position.z = 0; // Center along the z-axis
    rifleMain.position.x = 0.3; // Extended forward from hand
    rifleGroup.add(rifleMain);
    
    // Rifle stock
    const stockGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.08);
    const stockMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 40
    });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.x = -0.4; // Behind the grip
    stock.position.y = -0.03; // Slightly lower than main barrel
    rifleGroup.add(stock);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.08, 0.12, 0.06);
    const grip = new THREE.Mesh(gripGeometry, stockMaterial);
    grip.position.x = -0.1;
    grip.position.y = -0.08;
    rifleGroup.add(grip);
    
    // Barrel/muzzle
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8);
    const barrelMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 60
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI/2; // Align with rifle direction
    barrel.position.x = 0.9; // At the front of the rifle
    rifleGroup.add(barrel);
    
    // Barrel energy glow
    const barrelGlowGeometry = new THREE.CircleGeometry(0.02, 8);
    const barrelGlowMaterial = new THREE.MeshBasicMaterial({
      color: factionColor,
      opacity: 0.7 * opacity,
      transparent: true
    });
    const barrelGlow = new THREE.Mesh(barrelGlowGeometry, barrelGlowMaterial);
    barrelGlow.position.x = 1.0; // At the tip of the barrel
    barrelGlow.rotation.y = Math.PI/2; // Face forward
    rifleGroup.add(barrelGlow);
    
    // FIXED - Top-mounted scope (positioned on top of rifle)
    const scopeGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8);
    const scopeMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 70
    });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.rotation.z = Math.PI/2; // Align with rifle direction
    scope.position.x = 0.4; // Positioned along the barrel
    scope.position.y = 0.06; // On TOP of the rifle
    rifleGroup.add(scope);
    
    // FIXED - Scope lens (front)
    const scopeLensGeometry = new THREE.CircleGeometry(0.015, 8);
    const scopeLensMaterial = new THREE.MeshBasicMaterial({
      color: factionColor,
      opacity: 0.7 * opacity,
      transparent: true
    });
    const scopeLens = new THREE.Mesh(scopeLensGeometry, scopeLensMaterial);
    scopeLens.position.x = 0.6; // At front of scope
    scopeLens.position.y = 0.06; // Match scope height
    scopeLens.rotation.y = Math.PI/2; // Face forward
    rifleGroup.add(scopeLens);
    
    // FIXED - Scope mounting brackets
    const bracketGeometry = new THREE.BoxGeometry(0.05, 0.04, 0.03);
    const bracketMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 50
    });
    
    // Front bracket
    const frontBracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
    frontBracket.position.x = 0.55;
    frontBracket.position.y = 0.03;
    rifleGroup.add(frontBracket);
    
    // Rear bracket
    const rearBracket = new THREE.Mesh(bracketGeometry, bracketMaterial);
    rearBracket.position.x = 0.25;
    rearBracket.position.y = 0.03;
    rifleGroup.add(rearBracket);
    
    // FIXED - Targeting components properly positioned around rifle
    const targetCompGeometry = new THREE.RingGeometry(0.04, 0.05, 16);
    const targetCompMaterial = new THREE.MeshBasicMaterial({
      color: factionColor,
      opacity: 0.8 * opacity,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // Place targeting rings at logical positions around the rifle
    for (let i = 0; i < 3; i++) {
      const targetComp = new THREE.Mesh(targetCompGeometry, targetCompMaterial);
      
      // Different positions for each ring
      if (i === 0) {
        // Front targeting ring
        targetComp.position.set(0.7, 0.1, 0);
        targetComp.rotation.x = Math.PI/4;
      } else if (i === 1) {
        // Side targeting ring
        targetComp.position.set(0.4, 0.0, 0.1);
        targetComp.rotation.y = Math.PI/2;
        targetComp.rotation.z = Math.PI/6;
      } else {
        // Top targeting ring near scope
        targetComp.position.set(0.2, 0.12, 0);
        targetComp.rotation.x = Math.PI/3;
      }
      
      rifleGroup.add(targetComp);
      
      // Store animation parameters in userData
      targetComp.userData.floatParams = {
        baseX: targetComp.position.x,
        baseY: targetComp.position.y,
        baseZ: targetComp.position.z,
        phase: i * Math.PI / 1.5, // Offset phase for each ring
        speed: 2 + Math.random() * 2
      };
    }
    
    // Add connecting data lines between the targeting components
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0.7, 0.1, 0),
      new THREE.Vector3(0.4, 0.0, 0.1),
      new THREE.Vector3(0.2, 0.12, 0)
    ]);
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: factionColor,
      transparent: true,
      opacity: 0.5 * opacity
    });
    
    const dataLine = new THREE.Line(lineGeometry, lineMaterial);
    rifleGroup.add(dataLine);
    
    // Enhanced jetpack with more detail
    const jetpackGroup = new THREE.Group();
    jetpackGroup.position.set(0, 0.4, -0.25);
    group.add(jetpackGroup);
    
    // Main jetpack housing
    const jetpackGeometry = new THREE.BoxGeometry(0.25, 0.3, 0.15);
    const jetpackMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 50
    });
    const jetpack = new THREE.Mesh(jetpackGeometry, jetpackMaterial);
    jetpackGroup.add(jetpack);
    
    // Jetpack details - add tech lines and vents
    const jetVentGeometry = new THREE.BoxGeometry(0.07, 0.05, 0.02);
    const jetVentMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 80
    });
    
    // Add vents on each side
    for (let i = 0; i < 4; i++) {
      const vent = new THREE.Mesh(jetVentGeometry, jetVentMaterial);
      vent.position.set(
        (i % 2 === 0 ? 0.1 : -0.1),
        (i < 2 ? 0.08 : -0.08),
        -0.08
      );
      jetpackGroup.add(vent);
    }
    
    // Jetpack thrusters - enhanced
    const thrusterGeometry = new THREE.CylinderGeometry(0.04, 0.06, 0.15, 8);
    const thrusterMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 60
    });
    
    for (let i = 0; i < 2; i++) {
      const thruster = new THREE.Mesh(thrusterGeometry, thrusterMaterial);
      thruster.position.set(
        i === 0 ? 0.08 : -0.08,
        -0.15,
        -0.08
      );
      thruster.rotation.x = Math.PI / 8; // Angle slightly outward
      jetpackGroup.add(thruster);
      
      // Enhanced thruster glow with interior and exterior components
      // Inner glow
      const innerGlowGeometry = new THREE.SphereGeometry(0.03, 8, 8);
      const innerGlowMaterial = new THREE.MeshPhongMaterial({
        color: factionColor,
        emissive: factionColor,
        emissiveIntensity: 0.8,
        opacity: 0.8 * opacity,
        transparent: true
      });
      const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
      innerGlow.position.y = -0.08;
      thruster.add(innerGlow);
      
      // Add trail effect (cone pointing backward)
      const trailGeometry = new THREE.ConeGeometry(0.03, 0.15, 8);
      const trailMaterial = new THREE.MeshBasicMaterial({
        color: factionColor,
        transparent: true,
        opacity: 0.4 * opacity
      });
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.position.y = -0.15;
      trail.rotation.x = Math.PI; // Point backward
      thruster.add(trail);
      
      // Store animation parameters for thruster effects
      thruster.userData.thrusterParams = {
        baseOpacity: trailMaterial.opacity,
        phase: i * Math.PI,
        speed: 5 + Math.random() * 2
      };
    }
    
    // Add shimmer effect for partial invisibility/optical camo
    this.addEnhancedShimmerEffect(bodyGroup, factionColor, opacity);
    
    return group;
  }
  
  // Helper method to add circuit-like tech lines to the assassin's suit
  addTechLines(mesh, color, opacity) {
    // Create circuit-pattern details on the body
    const circuitMaterial = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.6 * opacity,
      transparent: true
    });
    
    // Horizontal circuit rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(0.26 - i * 0.03, 0.01, 8, 12);
      const ring = new THREE.Mesh(ringGeometry, circuitMaterial);
      ring.position.y = 0.1 + i * 0.2;
      ring.rotation.x = Math.PI / 2;
      mesh.add(ring);
    }
    
    // Vertical circuit lines
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const lineGeometry = new THREE.BoxGeometry(0.01, 0.6, 0.01);
      const line = new THREE.Mesh(lineGeometry, circuitMaterial);
      line.position.set(
        Math.sin(angle) * 0.25,
        0.3,
        Math.cos(angle) * 0.25
      );
      mesh.add(line);
      
      // Add small connecting lines between vertical and horizontal
      for (let j = 0; j < 2; j++) {
        const connectorGeometry = new THREE.BoxGeometry(0.08, 0.01, 0.01);
        const connector = new THREE.Mesh(connectorGeometry, circuitMaterial);
        connector.position.set(
          Math.sin(angle) * 0.2,
          0.1 + j * 0.4,
          Math.cos(angle) * 0.2
        );
        connector.rotation.z = angle;
        mesh.add(connector);
      }
    }
  }
  
  // Enhanced shimmer effect for optical camouflage
  addEnhancedShimmerEffect(mesh, color, opacity) {
    // Create more complex optical camo effect
    // Outer wireframe shimmer
    const shimmerMaterial1 = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.2 * opacity,
      transparent: true,
      wireframe: true,
      wireframeLinewidth: 1
    });
    
    const shimmerGeometry1 = new THREE.CylinderGeometry(0.32, 0.42, 1.22, 12, 6);
    const shimmer1 = new THREE.Mesh(shimmerGeometry1, shimmerMaterial1);
    mesh.add(shimmer1);
    
    // Inner subtle glow
    const shimmerMaterial2 = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      opacity: 0.1 * opacity,
      transparent: true,
      side: THREE.BackSide // Inside glow
    });
    
    const shimmerGeometry2 = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 12, 2);
    const shimmer2 = new THREE.Mesh(shimmerGeometry2, shimmerMaterial2);
    mesh.add(shimmer2);
    
    // Add distortion wave effect along the body
    const waveGeometry = new THREE.CylinderGeometry(0.31, 0.41, 0.1, 16, 1);
    const waveMaterial = new THREE.MeshBasicMaterial({
      color: color,
      opacity: 0.3 * opacity,
      transparent: true
    });
    
    const wave = new THREE.Mesh(waveGeometry, waveMaterial);
    wave.position.y = -0.3; // Start at bottom
    mesh.add(wave);
    
    // Store animation parameters for optical shimmer effects
    shimmer1.userData.shimmerParams = {
      baseOpacity: shimmerMaterial1.opacity,
      phase: 0,
      speed: 2
    };
    
    shimmer2.userData.shimmerParams = {
      baseOpacity: shimmerMaterial2.opacity,
      phase: Math.PI / 2, // Offset phase
      speed: 1.5
    };
    
    wave.userData.waveParams = {
      baseY: wave.position.y,
      phase: 0,
      speed: 1.5,
      distance: 1.2 // Total travel distance
    };
  }
  
  // Stub methods for other unit types
  createBiohackerModel(group, bodyMaterial, factionColor, opacity) {
    // Implementation would go here
    this.createBasicUnitModel(group, bodyMaterial, factionColor, opacity);
    // Add biohacker-specific elements
  }
  
  // In ModelFactory.js, add or enhance the createScrapGolemModel method:

  createScrapGolemModel(group, bodyMaterial, factionColor, opacity) {
    // Base torso - made from an industrial container
    const torsoGeometry = new THREE.BoxGeometry(0.8, 0.7, 0.5);
    const torsoMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513, // Rusty brown
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 5 // Very low shine for rusty metal
    });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 0.4;
    group.add(torso);
    
    // Add exposed machinery/gears to the torso
    const gearGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8);
    const gearMaterial = new THREE.MeshPhongMaterial({
      color: 0xCCCCCC, // Silver metal
      opacity: opacity,
      transparent: opacity < 1,
      shininess: 70
    });
    
    // Add several gears in different positions
    for (let i = 0; i < 3; i++) {
      const gear = new THREE.Mesh(gearGeometry, gearMaterial);
      gear.position.set(
        -0.2 + i * 0.2,
        0.5,
        0.26 // Front of torso
      );
      gear.rotation.x = Math.PI / 2; // Rotate to face forward
      torso.add(gear);
    }
    
    // Add a glowing core with faction color
    const coreGeometry = new THREE.SphereGeometry(0.12, 8, 8);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.8,
      opacity: opacity * 0.9,
      transparent: true
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.set(0, 0.4, 0.1);
    group.add(core);
    
    // Chunky, mismatched legs made from scrap
    // Left leg - hydraulic piston style
    const leftLegUpper = this.createPistonLeg();
    leftLegUpper.position.set(-0.3, 0, 0);
    group.add(leftLegUpper);
    
    // Right leg - industrial container style
    const rightLegUpper = this.createBoxLeg();
    rightLegUpper.position.set(0.3, 0, 0);
    group.add(rightLegUpper);
    
    // Mismatched arms
    // Left arm - industrial claw
    const leftArm = this.createClawArm(factionColor, opacity);
    leftArm.position.set(-0.45, 0.5, 0);
    leftArm.userData.isWeapon = false;
    group.add(leftArm);
    
    // Right arm - heavy metal crusher/hammer
    const rightArm = this.createCrusherArm(factionColor, opacity);
    rightArm.position.set(0.45, 0.5, 0);
    rightArm.userData.isWeapon = true;
    rightArm.userData.originalPosition = { 
      x: rightArm.position.x, 
      y: rightArm.position.y, 
      z: rightArm.position.z 
    };
    group.add(rightArm);
    
    // Head - old diving helmet style with asymmetric features
    const head = this.createScrapHead(factionColor, opacity);
    head.position.y = 0.85;
    group.add(head);
    
    // Add pipes and wires connecting parts
    this.addPipesAndWires(group, factionColor, opacity);
    
    return group;
  }
  
  // Helper method to create a piston-style leg
  createPistonLeg() {
    const legGroup = new THREE.Group();
    
    // Upper section - cylinder
    const upperLegGeometry = new THREE.CylinderGeometry(0.1, 0.08, 0.4, 6);
    const upperLegMaterial = new THREE.MeshPhongMaterial({
      color: 0x777777,
      shininess: 30
    });
    const upperLeg = new THREE.Mesh(upperLegGeometry, upperLegMaterial);
    upperLeg.position.y = -0.2;
    legGroup.add(upperLeg);
    
    // Hydraulic piston
    const pistonGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6);
    const pistonMaterial = new THREE.MeshPhongMaterial({
      color: 0xCCCCCC,
      shininess: 80
    });
    const piston = new THREE.Mesh(pistonGeometry, pistonMaterial);
    piston.position.set(0.06, -0.25, 0);
    piston.rotation.z = 0.2;
    legGroup.add(piston);
    
    // Foot - industrial clamp
    const footGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.3);
    const footMaterial = new THREE.MeshPhongMaterial({
      color: 0x555555,
      shininess: 10
    });
    const foot = new THREE.Mesh(footGeometry, footMaterial);
    foot.position.y = -0.45;
    legGroup.add(foot);
    
    return legGroup;
  }
  
  // Helper method to create a box-style leg
  createBoxLeg() {
    const legGroup = new THREE.Group();
    
    // Upper section - box
    const upperLegGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.2);
    const upperLegMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513, // Match torso
      shininess: 5
    });
    const upperLeg = new THREE.Mesh(upperLegGeometry, upperLegMaterial);
    upperLeg.position.y = -0.15;
    legGroup.add(upperLeg);
    
    // Joint
    const jointGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const jointMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 40
    });
    const joint = new THREE.Mesh(jointGeometry, jointMaterial);
    joint.position.y = -0.3;
    legGroup.add(joint);
    
    // Lower section - jury-rigged pipes
    const lowerLegGeometry = new THREE.CylinderGeometry(0.05, 0.08, 0.25, 6);
    const lowerLegMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      shininess: 20
    });
    const lowerLeg = new THREE.Mesh(lowerLegGeometry, lowerLegMaterial);
    lowerLeg.position.y = -0.45;
    legGroup.add(lowerLeg);
    
    // Foot - heavy industrial plate
    const footGeometry = new THREE.BoxGeometry(0.25, 0.06, 0.3);
    const footMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 10
    });
    const foot = new THREE.Mesh(footGeometry, footMaterial);
    foot.position.y = -0.6;
    legGroup.add(foot);
    
    return legGroup;
  }
  
  // Helper method to create an industrial claw arm
  createClawArm(factionColor, opacity) {
    const armGroup = new THREE.Group();
    
    // Upper arm
    const upperArmGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.4, 6);
    const upperArmMaterial = new THREE.MeshPhongMaterial({
      color: 0x777777,
      shininess: 20
    });
    const upperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
    upperArm.rotation.z = Math.PI / 2.5; // Angle outward
    upperArm.position.x = -0.2;
    armGroup.add(upperArm);
    
    // Elbow joint
    const elbowGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const elbowMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 40
    });
    const elbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
    elbow.position.x = -0.4;
    armGroup.add(elbow);
    
    // Forearm
    const forearmGeometry = new THREE.CylinderGeometry(0.05, 0.07, 0.35, 6);
    const forearmMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      shininess: 30
    });
    const forearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    forearm.rotation.z = Math.PI / 2;
    forearm.position.x = -0.6;
    armGroup.add(forearm);
    
    // Claw base
    const clawBaseGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.1, 6);
    const clawBaseMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 30
    });
    const clawBase = new THREE.Mesh(clawBaseGeometry, clawBaseMaterial);
    clawBase.rotation.z = Math.PI / 2;
    clawBase.position.x = -0.75;
    armGroup.add(clawBase);
    
    // Claw prongs
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const clawProngGeometry = new THREE.BoxGeometry(0.15, 0.03, 0.03);
      const clawProngMaterial = new THREE.MeshPhongMaterial({
        color: 0x999999,
        shininess: 70
      });
      const clawProng = new THREE.Mesh(clawProngGeometry, clawProngMaterial);
      clawProng.position.set(
        -0.83,
        Math.sin(angle) * 0.06,
        Math.cos(angle) * 0.06
      );
      clawProng.rotation.z = -0.3; // Angle the prongs forward
      armGroup.add(clawProng);
    }
    
    return armGroup;
  }
  
  // Helper method to create a crusher/hammer arm
  createCrusherArm(factionColor, opacity) {
    const armGroup = new THREE.Group();
    
    // Upper arm - heavy duty
    const upperArmGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.2);
    const upperArmMaterial = new THREE.MeshPhongMaterial({
      color: 0x666666,
      shininess: 20
    });
    const upperArm = new THREE.Mesh(upperArmGeometry, upperArmMaterial);
    upperArm.rotation.z = -Math.PI / 3; // Angle outward
    upperArm.position.set(0.15, -0.1, 0);
    armGroup.add(upperArm);
    
    // Elbow - industrial joint
    const elbowGeometry = new THREE.BoxGeometry(0.12, 0.12, 0.18);
    const elbowMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 10
    });
    const elbow = new THREE.Mesh(elbowGeometry, elbowMaterial);
    elbow.position.set(0.3, -0.25, 0);
    armGroup.add(elbow);
    
    // Forearm - piston type
    const forearmGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 6);
    const forearmMaterial = new THREE.MeshPhongMaterial({
      color: 0x777777,
      shininess: 30
    });
    const forearm = new THREE.Mesh(forearmGeometry, forearmMaterial);
    forearm.rotation.z = Math.PI / 2;
    forearm.position.set(0.5, -0.25, 0);
    armGroup.add(forearm);
    
    // Crusher weapon - heavy mass with faction energy
    const crusherGeometry = new THREE.BoxGeometry(0.2, 0.25, 0.3);
    const crusherMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 5
    });
    const crusher = new THREE.Mesh(crusherGeometry, crusherMaterial);
    crusher.position.set(0.7, -0.25, 0);
    armGroup.add(crusher);
    
    // Energy parts on the crusher
    const energyGeometry = new THREE.SphereGeometry(0.06, 8, 8);
    const energyMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.8,
      opacity: 0.8 * opacity,
      transparent: true
    });
    
    // Add energy nodes on sides of crusher
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * 0.2 - 0.1; // -0.1 or 0.1
      const z = Math.floor(i / 2) * 0.2 - 0.1; // -0.1 or 0.1
      
      const energyNode = new THREE.Mesh(energyGeometry, energyMaterial);
      energyNode.position.set(0.7 + x, -0.25, z);
      armGroup.add(energyNode);
    }
    
    return armGroup;
  }
  
  // Helper method to create a scrap diving helmet head
  createScrapHead(factionColor, opacity) {
    const headGroup = new THREE.Group();
    
    // Main helmet - slightly squashed sphere
    const helmetGeometry = new THREE.SphereGeometry(0.25, 8, 8);
    const helmetMaterial = new THREE.MeshPhongMaterial({
      color: 0x8B4513, // Match torso
      shininess: 10,
      opacity: opacity,
      transparent: opacity < 1
    });
    const helmet = new THREE.Mesh(helmetGeometry, helmetMaterial);
    helmet.scale.y = 0.8; // Squash vertically
    headGroup.add(helmet);
    
    // Viewport - glowing faction-colored "eye"
    const viewportGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const viewportMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.7,
      opacity: 0.8 * opacity,
      transparent: true
    });
    const viewport = new THREE.Mesh(viewportGeometry, viewportMaterial);
    viewport.position.set(0, 0, 0.18);
    viewport.scale.set(1, 0.7, 0.5); // Flatten into an oval
    headGroup.add(viewport);
    
    // Asymmetric details - bolts, vents, and pipes
    
    // Bolts around the viewport
    const boltGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.05, 6);
    const boltMaterial = new THREE.MeshPhongMaterial({
      color: 0xCCCCCC,
      shininess: 80
    });
    
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI) / 2.5;
      const boltDist = 0.15;
      const bolt = new THREE.Mesh(boltGeometry, boltMaterial);
      bolt.position.set(
        Math.sin(angle) * boltDist,
        Math.cos(angle) * boltDist,
        0.18
      );
      bolt.rotation.x = Math.PI / 2;
      headGroup.add(bolt);
    }
    
    // Top vent - off-center
    const ventGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 6);
    const ventMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 20
    });
    const vent = new THREE.Mesh(ventGeometry, ventMaterial);
    vent.position.set(0.1, 0.2, 0);
    headGroup.add(vent);
    
    // Small side antenna
    const antennaGeometry = new THREE.CylinderGeometry(0.01, 0.005, 0.2, 4);
    const antennaMaterial = new THREE.MeshPhongMaterial({
      color: 0x888888,
      shininess: 50
    });
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(-0.2, 0.15, 0);
    antenna.rotation.z = 0.4;
    headGroup.add(antenna);
    
    return headGroup;
  }
  
  // Helper method to add pipes and wires connecting parts
  addPipesAndWires(group, factionColor, opacity) {
    // Add a few cables and pipes between body parts
    
    // Pipe from back to head
    const pipeGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.5, -0.25), // Back of torso
        new THREE.Vector3(0, 0.7, -0.2),
        new THREE.Vector3(0, 0.8, -0.15)  // Back of head
      ]),
      5, // tube segments
      0.03, // tube radius
      8,   // radial segments
      false // closed
    );
    
    const pipeMaterial = new THREE.MeshPhongMaterial({
      color: 0x444444,
      shininess: 30
    });
    
    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
    group.add(pipe);
    
    // Wire from torso to right arm with faction color
    const wireGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.2, 0.4, 0.1),  // Side of torso near core
        new THREE.Vector3(0.3, 0.45, 0.05),
        new THREE.Vector3(0.4, 0.4, 0)     // Inner elbow of right arm
      ]),
      5, // tube segments
      0.02, // tube radius
      6,   // radial segments
      false // closed
    );
    
    const wireMaterial = new THREE.MeshPhongMaterial({
      color: factionColor,
      emissive: factionColor,
      emissiveIntensity: 0.3,
      opacity: 0.8 * opacity,
      transparent: true
    });
    
    const wire = new THREE.Mesh(wireGeometry, wireMaterial);
    group.add(wire);
    
    // Additional cable along left side
    const cableGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.2, 0.2, 0),   // Lower torso
        new THREE.Vector3(-0.3, 0.1, 0),
        new THREE.Vector3(-0.3, 0, 0.1)    // Upper leg
      ]),
      5, // tube segments
      0.015, // tube radius
      6,   // radial segments
      false // closed
    );
    
    const cableMaterial = new THREE.MeshPhongMaterial({
      color: 0x222222,
      shininess: 10
    });
    
    const cable = new THREE.Mesh(cableGeometry, cableMaterial);
    group.add(cable);
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
