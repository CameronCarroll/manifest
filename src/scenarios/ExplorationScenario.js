// src/scenarios/ExplorationScenario.js
import BaseScenario from './BaseScenario.js';
import TerrainFactory from '../utils/TerrainFactory.js';
import MapGenerator from '../utils/MapGenerator.js';
import * as THREE from 'three';

class ExplorationScenario extends BaseScenario {
  constructor(gameController) {
    super(gameController);
    
    this.name = 'Wasteland Expedition';
    this.description = 'Lead your expedition across the dangerous wasteland to discover the ancient techno-arcane beacon';
    
    // Disable economy features
    this.features.resources = false;
    this.features.production = false;
    
    // Map properties
    this.mapWidth = 200;
    this.mapHeight = 200;
    this.biomeType = 'crystal_wastes'; // Using one of the new biome types
    
    // Mission settings
    this.startPosition = { x: -this.mapWidth/2 + 20, z: 0 };
    this.beaconPosition = { x: this.mapWidth/2 - 20, z: 0 };
    
    // Enemy properties
    this.enemyBuildingCount = 3;
    this.enemyUnitCount = 15;
    this.mainEnemyBaseId = null; // Will store the ID of the main enemy base
    this.beaconId = null; // Will store the ID of the objective beacon
  }
  
  async start() {
    super.start();
    
    // Initialize the flag to prevent early defeat check
    this.isInitialized = false;
    
    console.log('Starting Wasteland Expedition scenario');
    
    // Generate the procedural map
    await this.generateProceduralMap();
    
    // Set camera bounds based on map size
    this.systems.render.sceneManager.setCameraBounds(
      -this.mapWidth/2, this.mapWidth/2,
      -this.mapHeight/2, this.mapHeight/2
    );
    
    // Create player squad at start position
    this.createPlayerSquad();
    
    // Place enemy structures and units
    this.placeEnemyStructures();
    
    // Place the beacon (objective)
    this.placeBeacon();
    
    // Set up objectives
    this.setupObjectives();
    
    // Now mark the scenario as initialized so defeat checks can start
    this.isInitialized = true;
    console.log('Scenario initialization complete');
  }
  
  async generateProceduralMap() {
    console.log('Generating procedural map...');
    
    // Get the active scene from the renderer
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    
    // Create texture loader
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    
    // Create terrain factory with explicit texture loader
    const terrainFactory = new TerrainFactory(scene, textureLoader);
    terrainFactory.debug = true; // Enable debug logging for development
    
    // Create map generator
    const mapGenerator = new MapGenerator(scene, terrainFactory);
    mapGenerator.debug = true; // Enable debug logging
    
    // Set map options based on biome type
    const mapOptions = {
      width: this.mapWidth,
      height: this.mapHeight,
      biomeType: this.biomeType,
      objectDensity: 0.6, // Higher density for more interesting terrain
      resourceDensity: 0.3,
      elevation: 0.7, // More varied terrain
      seed: Math.floor(Math.random() * 10000) // Random seed
    };
    
    try {
      console.log(`Starting procedural map generation with options:`, mapOptions);
      
      // Generate the map with proper error handling
      const mapData = await mapGenerator.generateMap(mapOptions);
      console.log('Map generated successfully with bounds:', mapData.bounds);
      
      // Store map data for later reference
      this.mapData = mapData;
      
      // Add map borders if not already present
      this.addMapBorders(scene, mapOptions);
    } catch (error) {
      console.error('Error generating map:', error);
      this.createFallbackTerrain(scene);
    }
  }
  
  // Add borders to the map to help with orientation
  addMapBorders(scene, mapOptions) {
    const borderWidth = 2;
    const borderHeight = 5;
    
    // Create border material
    const borderMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.8,
      metalness: 0.3
    });
    
    // Create north border
    const northBorderGeometry = new THREE.BoxGeometry(mapOptions.width, borderHeight, borderWidth);
    const northBorder = new THREE.Mesh(northBorderGeometry, borderMaterial);
    northBorder.position.set(0, borderHeight / 2, -mapOptions.height / 2 - borderWidth / 2);
    scene.add(northBorder);
    
    // Create south border
    const southBorderGeometry = new THREE.BoxGeometry(mapOptions.width, borderHeight, borderWidth);
    const southBorder = new THREE.Mesh(southBorderGeometry, borderMaterial);
    southBorder.position.set(0, borderHeight / 2, mapOptions.height / 2 + borderWidth / 2);
    scene.add(southBorder);
    
    // Create east border
    const eastBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, mapOptions.height + borderWidth * 2);
    const eastBorder = new THREE.Mesh(eastBorderGeometry, borderMaterial);
    eastBorder.position.set(mapOptions.width / 2 + borderWidth / 2, borderHeight / 2, 0);
    scene.add(eastBorder);
    
    // Create west border
    const westBorderGeometry = new THREE.BoxGeometry(borderWidth, borderHeight, mapOptions.height + borderWidth * 2);
    const westBorder = new THREE.Mesh(westBorderGeometry, borderMaterial);
    westBorder.position.set(-mapOptions.width / 2 - borderWidth / 2, borderHeight / 2, 0);
    scene.add(westBorder);
  }
  
  createFallbackTerrain(scene) {
    console.log('Creating fallback terrain');
    
    // Create a simple flat terrain with some basic features if procedural generation fails
    const groundGeometry = new THREE.PlaneGeometry(this.mapWidth, this.mapHeight);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3a7c5f, 
      roughness: 0.8,
      metalness: 0.2
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    
    scene.add(ground);
  }
  
  createPlayerSquad() {
    console.log('Creating player expedition squad');
    
    // Use the new unit types for a more diverse and interesting squad
    const squadComposition = [
      { type: 'solar_knight', offset: { x: 0, z: -3 } },
      { type: 'techno_shaman', offset: { x: -2, z: -1 } },
      { type: 'neon_assassin', offset: { x: 2, z: -1 } },
      { type: 'biohacker', offset: { x: -1, z: 1 } },
      { type: 'scrap_golem', offset: { x: 1, z: 1 } }
    ];
    
    for (const unit of squadComposition) {
      const position = {
        x: this.startPosition.x + unit.offset.x,
        z: this.startPosition.z + unit.offset.z
      };
      
      // Create the unit entity
      const entityId = this.entityManager.createEntity();
      
      // Add position component
      this.entityManager.addComponent(entityId, 'position', {
        x: position.x,
        y: 0,
        z: position.z,
        rotation: Math.random() * Math.PI * 2
      });
      
      // Add health component with appropriate values for the unit type
      const healthValues = this.getUnitHealthValues(unit.type);
      this.entityManager.addComponent(entityId, 'health', healthValues);
      
      // Add render component
      this.entityManager.addComponent(entityId, 'render', {
        meshId: 'unit', // Base mesh ID that the ModelFactory will use
        scale: { x: 1, y: 1, z: 1 },
        color: 0x00ffff, // Player faction color (cyan)
        visible: true
      });
      
      // Add faction component
      this.entityManager.addComponent(entityId, 'faction', {
        faction: 'player',
        unitType: this.convertUnitTypeToFactionType(unit.type),
        attackType: this.getUnitAttackType(unit.type),
        damageType: 'normal'
      });
      
      // Add unit type component for the new rendering system
      this.entityManager.addComponent(entityId, 'unitType', {
        type: unit.type,
        abilities: this.getUnitAbilities(unit.type),
        visualEffects: []
      });
      
      // Register with collision system
      if (this.systems.collision) {
        this.systems.collision.registerEntity(entityId, false); // Not static
      }
    }
    
    // Focus camera on squad
    const camera = this.systems.render.sceneManager.camera;
    if (camera) {
      camera.position.x = this.startPosition.x;
      camera.position.z = this.startPosition.z + 30;
      camera.lookAt(this.startPosition.x, 0, this.startPosition.z);
    }
  }
  
  placeEnemyStructures() {
    console.log('Placing enemy structures and units');
    
    // Place main enemy command tower near the beacon
    this.mainEnemyBaseId = this.createEnemyBuilding(
      'harmonic_tower',
      {
        x: this.beaconPosition.x - 15,
        z: this.beaconPosition.z
      },
      2.0 // Larger scale for main base
    );
    
    // Place additional enemy buildings across the map
    const buildingTypes = ['arcane_reactor', 'bioforge', 'scavenger_outpost'];
    
    for (let i = 0; i < this.enemyBuildingCount; i++) {
      // Place buildings in a path across the map
      const progress = (i + 1) / (this.enemyBuildingCount + 1);
      const position = {
        x: -this.mapWidth/2 + 40 + progress * (this.mapWidth - 80),
        z: (Math.random() - 0.5) * (this.mapHeight - 60)
      };
      
      const buildingType = buildingTypes[i % buildingTypes.length];
      this.createEnemyBuilding(buildingType, position);
      
      // Spawn enemy units around each building
      this.spawnEnemyUnitsAroundPosition(position, 3);
    }
    
    // Place additional enemy units throughout the map
    this.spawnRandomEnemyUnits(this.enemyUnitCount - (this.enemyBuildingCount * 3));
  }
  
  createEnemyBuilding(buildingType, position, scale = 1.0) {
    // Create enemy building entity
    const entityId = this.entityManager.createEntity();
    
    // Add position component
    this.entityManager.addComponent(entityId, 'position', {
      x: position.x,
      y: 0,
      z: position.z,
      rotation: Math.random() * Math.PI * 2
    });
    
    // Add health component
    this.entityManager.addComponent(entityId, 'health', {
      maxHealth: 500 * scale,
      currentHealth: 500 * scale,
      armor: 8,
      shield: 0,
      regeneration: 0
    });
    
    // Add render component
    this.entityManager.addComponent(entityId, 'render', {
      meshId: 'building', // Base mesh ID for buildings
      scale: { x: scale, y: scale, z: scale },
      color: 0xff00ff, // Enemy faction color (magenta)
      visible: true
    });
    
    // Add faction component
    this.entityManager.addComponent(entityId, 'faction', {
      faction: 'enemy',
      unitType: 'building',
      attackType: 'ranged',
      damageType: 'normal'
    });
    
    // Add building type component for the new rendering system
    this.entityManager.addComponent(entityId, 'buildingType', {
      type: buildingType,
      level: 1,
      visualEffects: []
    });
    
    // Register with collision system
    if (this.systems.collision) {
      this.systems.collision.registerEntity(entityId, true); // Static object
    }
    
    return entityId;
  }
  
  placeBeacon() {
    console.log('Placing objective beacon');
    
    // Create the beacon entity
    const beaconId = this.entityManager.createEntity();
    
    // Add position component
    this.entityManager.addComponent(beaconId, 'position', {
      x: this.beaconPosition.x,
      y: 0,
      z: this.beaconPosition.z,
      rotation: 0
    });
    
    // Add render component with special appearance
    this.entityManager.addComponent(beaconId, 'render', {
      meshId: 'building', // Base mesh ID
      scale: { x: 1.5, y: 3, z: 1.5 },
      color: 0x00ffff, // Cyan color like player units
      visible: true
    });
    
    // Add building type component for the new rendering system
    this.entityManager.addComponent(beaconId, 'buildingType', {
      type: 'mana_well', // Use the new mana well building type
      level: 1,
      visualEffects: []
    });
    
    // Store the beacon ID for objective checking
    this.beaconId = beaconId;
  }
  
  spawnEnemyUnitsAroundPosition(position, count) {
    const enemyTypes = ['lightInfantry', 'heavyInfantry', 'sniperUnit', 'supportUnit'];
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 5 + Math.random() * 5;
      
      const unitPosition = {
        x: position.x + Math.cos(angle) * distance,
        z: position.z + Math.sin(angle) * distance
      };
      
      const unitType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      
      // Use the spawn system to create the enemy
      if (this.systems.spawn) {
        const enemyId = this.systems.spawn.spawnEnemy(unitType, unitPosition, this.systems.ai);
        
        // Make sure the AI system registers this entity
        if (this.systems.ai && enemyId) {
          this.systems.ai.registerEntity(enemyId);
        }
      }
    }
  }
  
  spawnRandomEnemyUnits(count) {
    const enemyTypes = ['lightInfantry', 'heavyInfantry', 'sniperUnit', 'specialistUnit'];
    
    for (let i = 0; i < count; i++) {
      // Place enemies along a rough path from start to beacon
      const progress = (i + 1) / (count + 1);
      const position = {
        x: -this.mapWidth/2 + 40 + progress * (this.mapWidth - 80),
        z: (Math.random() - 0.5) * (this.mapHeight - 40) * (1 - Math.abs(progress - 0.5))
      };
      
      const unitType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      
      if (this.systems.spawn) {
        const enemyId = this.systems.spawn.spawnEnemy(unitType, position, this.systems.ai);
        
        if (this.systems.ai && enemyId) {
          this.systems.ai.registerEntity(enemyId);
        }
      }
    }
  }
  
  setupObjectives() {
    console.log('Setting up mission objectives');
    
    if (!this.gameController.systems.objectives) {
      console.warn('Objectives system not found');
      return;
    }
    
    const objectives = this.gameController.systems.objectives;
    
    // Add objective to reach the beacon
    objectives.addObjective({
      id: 'reach_beacon',
      title: 'Activate the Ancient Beacon',
      description: 'Guide your expedition to the techno-arcane beacon at the far end of the wasteland'
    });
    
    // Add alternative objective to destroy enemy command tower
    objectives.addObjective({
      id: 'destroy_tower',
      title: 'Destroy Enemy Command Tower',
      description: 'Alternatively, destroy the enemy command tower guarding the beacon'
    });
    
    // Define win conditions
    objectives.defineWinCondition({
      type: 'CUSTOM',
      objectiveId: ['reach_beacon', 'destroy_tower'],
      checkFunction: () => this.checkBeaconReached() || this.checkMainBaseDestroyed()
    });
    
    // Define fail condition - if all player units are destroyed
    objectives.defineFailCondition({
      type: 'ALL_UNITS_DESTROYED',
    });
  }
  
  update(deltaTime) {
    super.update(deltaTime);
    
    // Update objective progress
    this.updateObjectiveProgress();
  }
  
  updateObjectiveProgress() {
    if (!this.gameController.systems.objectives) return;
    
    // Update beacon objective progress based on closest unit's distance
    if (this.beaconId && this.entityManager.hasComponent(this.beaconId, 'position')) {
      const beaconPosition = this.entityManager.getComponent(this.beaconId, 'position');
      let closestDistance = Infinity;
      
      // Find the closest player unit to the beacon
      this.entityManager.gameState.entities.forEach((entity, entityId) => {
        if (this.isPlayerEntity(entityId) && this.entityManager.hasComponent(entityId, 'position')) {
          const unitPosition = this.entityManager.getComponent(entityId, 'position');
          
          // Calculate distance to beacon
          const dx = unitPosition.x - beaconPosition.x;
          const dz = unitPosition.z - beaconPosition.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < closestDistance) {
            closestDistance = distance;
          }
          
          // Check if unit has reached the beacon
          if (distance < 5) {
            this.gameController.systems.objectives.updateObjectiveProgress('reach_beacon', 1.0);
          }
        }
      });
      
      // Calculate progress based on distance (0-1 range)
      if (closestDistance < Infinity) {
        const maxDistance = this.mapWidth; // Maximum theoretical distance
        const progress = Math.max(0, 1 - (closestDistance / maxDistance));
        this.gameController.systems.objectives.updateObjectiveProgress('reach_beacon', progress);
      }
    }
    
    // Update tower destruction objective progress
    if (this.mainEnemyBaseId && this.entityManager.hasComponent(this.mainEnemyBaseId, 'health')) {
      const health = this.entityManager.getComponent(this.mainEnemyBaseId, 'health');
      if (health) {
        const progress = 1 - (health.currentHealth / health.maxHealth);
        this.gameController.systems.objectives.updateObjectiveProgress('destroy_tower', progress);
      } else {
        // Health component is gone, tower is destroyed
        this.gameController.systems.objectives.updateObjectiveProgress('destroy_tower', 1.0);
      }
    }
  }
  
  checkBeaconReached() {
    // Check if any player unit has reached the beacon
    if (!this.beaconId || !this.entityManager.hasComponent(this.beaconId, 'position')) {
      return false;
    }
    
    const beaconPosition = this.entityManager.getComponent(this.beaconId, 'position');
    let reached = false;
    
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (this.isPlayerEntity(entityId) && this.entityManager.hasComponent(entityId, 'position')) {
        const unitPosition = this.entityManager.getComponent(entityId, 'position');
        
        // Check if unit is close enough to the beacon
        const dx = unitPosition.x - beaconPosition.x;
        const dz = unitPosition.z - beaconPosition.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 5) { // Within 5 units of the beacon
          reached = true;
        }
      }
    });
    
    return reached;
  }
  
  checkMainBaseDestroyed() {
    // Check if the main enemy base is destroyed
    if (!this.mainEnemyBaseId) return false;
    
    // If entity no longer exists or has no health component, it's destroyed
    if (!this.entityManager.hasComponent(this.mainEnemyBaseId, 'health')) {
      return true;
    }
    
    // Check if health is depleted
    const health = this.entityManager.getComponent(this.mainEnemyBaseId, 'health');
    return health && health.currentHealth <= 0;
  }
  
  // Helper: Get health values for different unit types
  getUnitHealthValues(unitType) {
    switch(unitType) {
      case 'solar_knight':
        return { maxHealth: 200, currentHealth: 200, armor: 10, shield: 50, regeneration: 0 };
      case 'techno_shaman':
        return { maxHealth: 120, currentHealth: 120, armor: 3, shield: 30, regeneration: 1 };
      case 'neon_assassin':
        return { maxHealth: 90, currentHealth: 90, armor: 2, shield: 0, regeneration: 0 };
      case 'biohacker':
        return { maxHealth: 110, currentHealth: 110, armor: 3, shield: 0, regeneration: 2 };
      case 'scrap_golem':
        return { maxHealth: 300, currentHealth: 300, armor: 15, shield: 0, regeneration: 0 };
      default:
        return { maxHealth: 100, currentHealth: 100, armor: 5, shield: 0, regeneration: 0 };
    }
  }
  
  // Helper: Get attack type for different unit types
  getUnitAttackType(unitType) {
    switch(unitType) {
      case 'solar_knight':
        return 'melee';
      case 'neon_assassin':
        return 'ranged';
      case 'techno_shaman':
        return 'ranged';
      case 'biohacker':
        return 'ranged';
      case 'scrap_golem':
        return 'melee';
      default:
        return 'ranged';
    }
  }
  
  // Helper: Get abilities for different unit types
  getUnitAbilities(unitType) {
    switch(unitType) {
      case 'solar_knight':
        return ['shield_bash', 'solar_flare'];
      case 'neon_assassin':
        return ['stealth', 'critical_strike'];
      case 'techno_shaman':
        return ['heal', 'drone_swarm'];
      case 'biohacker':
        return ['nanite_injection', 'area_denial'];
      case 'scrap_golem':
        return ['ground_pound', 'debris_throw'];
      default:
        return [];
    }
  }
  
  // Helper: Convert new unit types to compatible faction unit types
  convertUnitTypeToFactionType(unitType) {
    switch(unitType) {
      case 'solar_knight':
        return 'tank';
      case 'neon_assassin':
        return 'sniper';
      case 'techno_shaman':
        return 'support';
      case 'biohacker':
        return 'specialist';
      case 'scrap_golem':
        return 'heavy';
      default:
        return 'assault';
    }
  }
  
  // Helper method to check if an entity belongs to the player
  isPlayerEntity(entityId) {
    // Check if entity has a faction component
    if (!this.entityManager.hasComponent(entityId, 'faction')) {
      return false;
    }
    
    // Check if the faction is 'player'
    const factionComponent = this.entityManager.getComponent(entityId, 'faction');
    return factionComponent && factionComponent.faction === 'player';
  }
  
  // Override the victory/defeat check methods for BaseScenario
  checkVictory() {
    return this.checkBeaconReached() || this.checkMainBaseDestroyed();
  }
  
  checkDefeat() {
    // Add a flag to prevent defeat until scenario is fully initialized
    if (!this.isInitialized) {
      return false;
    }
    
    // Check if all player units are destroyed
    let playerUnitCount = 0;
    
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (this.isPlayerEntity(entityId)) {
        playerUnitCount++;
      }
    });
    
    return playerUnitCount === 0;
  }
}

export default ExplorationScenario;