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
    this.mapWidth = 80;
    this.mapHeight = 80;
    this.objectDensity = 1.2; // Increased from likely 0.6
    this.resourceDensity = 0.5; // Increased from 0.3
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

    // Initialize tutorial prompts
    this.promptQueue = [
      { message: 'Welcome to the Wasteland Expedition! Guide your team to the ancient beacon.', timeout: 6000 },
      { message: 'Use right-click to move your squad. The terrain is dangerous - proceed with caution.', timeout: 6000 },
      { message: 'Your objective is located somewhere in the east. Explore to find it!', timeout: 6000 }
    ];

    // Show first prompt on load
    this.showNextPrompt();
    
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

    // Focus camera on squad at start
    const camera = this.systems.render.sceneManager.camera;
    if (camera) {
      camera.position.set(this.startPosition.x, 30, this.startPosition.z + 20);
      camera.lookAt(this.startPosition.x, 0, this.startPosition.z);
    }
    
    // Now mark the scenario as initialized so defeat checks can start
    this.isInitialized = true;
    console.log('Scenario initialization complete');
  }
  
  // In generateProceduralMap method, update:
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
  
    // Set map options based on biome type with increased density
    const mapOptions = {
      width: this.mapWidth,
      height: this.mapHeight,
      biomeType: this.biomeType,
      objectDensity: 1.8, // Much higher density (was 0.6)
      resourceDensity: 0.5, // Increased resource density
      elevation: 1.2, // More dramatic terrain variation
      seed: Math.floor(Math.random() * 10000) // Random seed
    };
  
    try {
      console.log(`Starting procedural map generation with options:`, mapOptions);
    
      // Generate the map with proper error handling
      const mapData = await mapGenerator.generateMap(mapOptions);
      console.log('Map generated successfully with bounds:', mapData.bounds);
    
      // Store map data for later reference
      this.mapData = mapData;
    
      // Add additional urban ruins
      this.addUrbanFeatures(scene);
    
      // Add map borders if not already present
      this.addMapBorders(scene, mapOptions);
    } catch (error) {
      console.error('Error generating map:', error);
      this.createFallbackTerrain(scene);
    }
  }

  // Add new method for creating urban features
  addUrbanFeatures(scene) {
  // Add clusters of ruins and obstacles to create "urban wasteland" feel
    const clusterCount = 8; // 8 urban clusters
  
    for (let c = 0; c < clusterCount; c++) {
    // Create a cluster center in a semi-random location
    // Avoid the very center and the beacon area
      let centerX, centerZ;
    
      // Make sure clusters distribute across map but avoid player start and beacon areas
      const angle = (c / clusterCount) * Math.PI * 2;
      const distance = (this.mapWidth * 0.25) + (Math.random() * this.mapWidth * 0.25);
      centerX = Math.cos(angle) * distance;
      centerZ = Math.sin(angle) * distance;
    
      // Ensure we're not placing over the start or beacon locations
      const distToStart = Math.sqrt(
        Math.pow(centerX - this.startPosition.x, 2) + 
      Math.pow(centerZ - this.startPosition.z, 2)
      );
    
      const distToBeacon = Math.sqrt(
        Math.pow(centerX - this.beaconPosition.x, 2) + 
      Math.pow(centerZ - this.beaconPosition.z, 2)
      );
    
      if (distToStart < 15 || distToBeacon < 15) {
        c--; // Try again with a different position
        continue;
      }
    
      // Create 10-15 buildings/ruins in this cluster
      const buildingCount = 10 + Math.floor(Math.random() * 6);
    
      for (let b = 0; b < buildingCount; b++) {
      // Calculate position within cluster
        const buildingAngle = Math.random() * Math.PI * 2;
        const buildingDist = Math.random() * 10; // 10 unit radius for cluster
      
        const posX = centerX + Math.cos(buildingAngle) * buildingDist;
        const posZ = centerZ + Math.sin(buildingAngle) * buildingDist;
      
        // Randomly select building type
        const buildingTypes = ['server_monolith', 'holographic_ruin', 'corrupted_machinery'];
        const buildingType = buildingTypes[Math.floor(Math.random() * buildingTypes.length)];
      
        // Create terrain object with random scale and rotation
        const scale = 0.8 + Math.random() * 0.7; // 0.8 to 1.5 scale
        const position = { x: posX, y: 0, z: posZ };
      
        const building = this.createTerrainFeature(buildingType, position, { 
          x: scale, 
          y: scale * (0.8 + Math.random() * 0.5), 
          z: scale 
        });
      
        // Apply random rotation
        const rendComp = this.entityManager.getComponent(building, 'render');
        if (rendComp && rendComp.meshId === 'terrain') {
          rendComp.rotation = Math.random() * Math.PI * 2;
        }
      
        // Add some smaller debris around buildings
        const debrisCount = Math.floor(Math.random() * 4) + 1;
        for (let d = 0; d < debrisCount; d++) {
          const debrisAngle = Math.random() * Math.PI * 2;
          const debrisDist = 1 + Math.random() * 2;
        
          const debrisX = posX + Math.cos(debrisAngle) * debrisDist;
          const debrisZ = posZ + Math.sin(debrisAngle) * debrisDist;
        
          this.createTerrainFeature('rock', { 
            x: debrisX, 
            y: 0, 
            z: debrisZ 
          }, { 
            x: 0.4 + Math.random() * 0.3,
            y: 0.3 + Math.random() * 0.3,
            z: 0.4 + Math.random() * 0.3
          });
        }
      }
    
      // Add some connecting "road" structures between some buildings
      for (let r = 0; r < buildingCount/2; r++) {
        const roadStartAngle = Math.random() * Math.PI * 2;
        const roadEndAngle = roadStartAngle + Math.PI/2 + Math.random() * Math.PI;
      
        const roadStartDist = Math.random() * 10;
        const roadEndDist = Math.random() * 10;
      
        const startX = centerX + Math.cos(roadStartAngle) * roadStartDist;
        const startZ = centerZ + Math.sin(roadStartAngle) * roadStartDist;
      
        const endX = centerX + Math.cos(roadEndAngle) * roadEndDist;
        const endZ = centerZ + Math.sin(roadEndAngle) * roadEndDist;
      
        // Calculate midpoint and direction
        const roadLength = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endZ - startZ, 2));
        const direction = Math.atan2(endZ - startZ, endX - startX);
      
        // Create road segments
        const segments = Math.floor(roadLength / 2) + 1;
        for (let s = 0; s < segments; s++) {
          const segmentX = startX + (endX - startX) * (s / segments);
          const segmentZ = startZ + (endZ - startZ) * (s / segments);
        
          // Add some randomness to position
          const offsetDist = Math.random() * 0.5;
          const offsetAngle = Math.random() * Math.PI * 2;
        
          const finalX = segmentX + Math.cos(offsetAngle) * offsetDist;
          const finalZ = segmentZ + Math.sin(offsetAngle) * offsetDist;
        
          // Create circuit-like pattern on ground
          this.createTerrainFeature('circuit_tree', { 
            x: finalX, 
            y: -0.4, // Slightly buried to look like roads/patterns
            z: finalZ 
          }, { 
            x: 0.5 + Math.random() * 0.2,
            y: 0.1 + Math.random() * 0.1,
            z: 0.5 + Math.random() * 0.2
          });
        }
      }
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
      scale: { x: 2, y: 4, z: 2 }, // Make beacon larger and taller
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
    
    // Add beacon indicator effect
    this.addBeaconIndicator();
    
    // Initialize progress tracking
    this.beaconProgress = 0;
    this.beaconActivated = false;
  }

  // Add method to create beacon indicator
  addBeaconIndicator() {
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene || !this.beaconId) {return;}
  
    // Get beacon position
    const beaconPos = this.entityManager.getComponent(this.beaconId, 'position');
    if (!beaconPos) {return;}
  
    // Create a light pillar effect
    const beamGeometry = new THREE.CylinderGeometry(0.5, 0.1, 30, 8);
    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
  
    this.beaconBeam = new THREE.Mesh(beamGeometry, beamMaterial);
    this.beaconBeam.position.set(beaconPos.x, 15, beaconPos.z);
  
    // Store animation parameters
    this.beaconBeam.userData = {
      pulsateSpeed: 0.5,
      baseOpacity: 0.3,
      time: 0
    };
  
    // Add to scene
    scene.add(this.beaconBeam);
  
    // Add a point light
    this.beaconLight = new THREE.PointLight(0x00ffff, 1, 30);
    this.beaconLight.position.set(beaconPos.x, 5, beaconPos.z);
    scene.add(this.beaconLight);
  
    // If fog of war is enabled, hide the beam initially
    if (this.fogOfWar) {
      this.beaconBeam.visible = false;
      this.beaconLight.visible = false;
    }
  }

  // Add beacon indicator update method
  updateBeaconIndicator(deltaTime) {
    if (!this.beaconBeam) {return;}
  
    // Check if beacon should be visible due to fog of war
    if (this.fogOfWar) {
    // Get beacon position
      const beaconPos = this.entityManager.getComponent(this.beaconId, 'position');
      if (!beaconPos) {return;}
    
      // Check all player units for distance to beacon
      let closestDistance = Infinity;
    
      this.entityManager.gameState.entities.forEach((entity, entityId) => {
        if (this.isPlayerEntity(entityId) && this.entityManager.hasComponent(entityId, 'position')) {
          const unitPos = this.entityManager.getComponent(entityId, 'position');
        
          // Calculate distance to beacon
          const dx = unitPos.x - beaconPos.x;
          const dz = unitPos.z - beaconPos.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
        
          if (distance < closestDistance) {
            closestDistance = distance;
          }
        }
      });
    
      // Show beacon if any unit is within 25 units
      const beaconVisible = closestDistance <= 25;
      this.beaconBeam.visible = beaconVisible;
      this.beaconLight.visible = beaconVisible;
    
      // If beacon becomes visible for the first time, show notification
      if (beaconVisible && !this.beaconRevealed) {
        this.beaconRevealed = true;
        this.showNotification('Ancient beacon detected nearby! Approach to activate.');
      }
    }
  
    // Animate the beacon beam
    if (this.beaconBeam.visible) {
      const params = this.beaconBeam.userData;
      params.time += deltaTime;
    
      // Pulsating opacity
      this.beaconBeam.material.opacity = params.baseOpacity + 
      Math.sin(params.time * params.pulsateSpeed) * 0.2;
    
      // Slowly rotate
      this.beaconBeam.rotation.y += deltaTime * 0.2;
    }
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

    // Update beacon indicator
    this.updateBeaconIndicator(deltaTime);
    
    // Update objective progress
    this.updateObjectiveProgress();
  }
  
  updateObjectiveProgress() {
    if (!this.gameController.systems.objectives) {return;}
    
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
            if (!this.beaconActivated) {
              this.beaconActivated = true;
              this.gameController.systems.objectives.updateObjectiveProgress('reach_beacon', 1.0);
              this.showNotification('Beacon Activated! Ancient knowledge flows through your expedition team.');
              
              // Enhance the beam effect
              if (this.beaconBeam) {
                this.beaconBeam.material.opacity = 0.7;
                this.beaconBeam.material.color.set(0x00ffdd);
                this.beaconBeam.scale.set(1.5, 1.2, 1.5);
                
                if (this.beaconLight) {
                  this.beaconLight.intensity = 2;
                  this.beaconLight.distance = 50;
                }
              }
            }
          }
        }
      });
      
      // Only update progress display if not yet activated
      if (!this.beaconActivated) {
        // Calculate progress based on distance (0-1 range)
        // But only show this if player is within detection range
        if (closestDistance < 30) {
          const progress = Math.max(0, 1 - (closestDistance / 30));
          this.gameController.systems.objectives.updateObjectiveProgress('reach_beacon', progress);
        }
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
    if (!this.mainEnemyBaseId) {return false;}
    
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

  showNextPrompt() {
    if (this.promptQueue.length === 0) {return;}
    
    const prompt = this.promptQueue.shift();
    this.showNotification(prompt.message);
    
    // Schedule next prompt
    if (this.promptQueue.length > 0) {
      setTimeout(() => this.showNextPrompt(), prompt.timeout);
    }
  }

  showNotification(message) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification-overlay');
    if (!notification) {
      notification = document.createElement('div');
      notification.id = 'notification-overlay';
      notification.style.position = 'absolute';
      notification.style.bottom = '100px';
      notification.style.left = '50%';
      notification.style.transform = 'translateX(-50%)';
      notification.style.padding = '15px 25px';
      notification.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      notification.style.color = 'white';
      notification.style.borderRadius = '10px';
      notification.style.fontSize = '18px';
      notification.style.textAlign = 'center';
      notification.style.zIndex = '100';
      notification.style.maxWidth = '80%';
      notification.style.border = '2px solid #4CAF50';
      document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.style.opacity = '1';
    
    // Fade out after 5 seconds
    setTimeout(() => {
      notification.style.transition = 'opacity 1s';
      notification.style.opacity = '0';
    }, 5000);
  }
}

export default ExplorationScenario;