// src/scenarios/ExplorationScenario.js
import BaseScenario from './BaseScenario.js';
import * as THREE from 'three';

class ExplorationScenario extends BaseScenario {
  constructor(gameController) {
    super(gameController);
    
    this.name = 'Wasteland Expedition';
    this.description = 'Lead your expedition across the dangerous wasteland to discover the ancient techno-arcane beacon';
    
    // Disable economy features
    this.features.resources = false;
    this.features.production = false;
    
    // Map properties - now inherited from BaseScenario with overrides
    this.mapWidth = 80;
    this.mapHeight = 80;
    this.objectDensity = 1.2;
    this.resourceDensity = 0.5;
    this.biomeType = 'crystal_wastes';
    
    // In ExplorationScenario constructor - update the starting and beacon positions
    this.startPosition = { x: -this.mapWidth/2 + 10, z: this.mapHeight/2 - 10 }; // Bottom left
    this.beaconPosition = { x: this.mapWidth/2 - 10, z: -this.mapHeight/2 + 10 }; //
    
    // Enemy properties
    this.enemyBuildingCount = 3;
    this.enemyUnitCount = 5;
    this.mainEnemyBaseId = null;
    this.beaconId = null;

    // Add these properties for the hold objective
    this.beaconHoldTime = 0;        // Current time holding the beacon
    this.requiredHoldTime = 45;     // 45 seconds required to win
    this.isHoldingBeacon = false;   // Flag for if player is at the beacon

    // Enable fog of war by default in this scenario
    this.fogOfWar = true;
    
    // Optimized fog settings for ExplorationScenario constructor
    this.fogOptions = {
      sightRadius: 20,           // Better visibility in wasteland
      exploredOpacity: 0.7,      // Darker explored areas (increased from 0.5 for better contrast)
      unexploredOpacity: 0.95,   // Nearly opaque unexplored areas
      updateFrequency: 0.5,     // Update 4 times per second (was 0.1)
      fogColor: 0x000033,        // Dark blue fog for mystical feel (slightly brighter)
      fadeEdgeWidth: 0.4,        // Wider fade at edges
      rememberExplored: true,    // Remember areas you've seen
      resolution: 2,             // Lower resolution (was 3)
      heightInfluence: true,
      heightFactor: 0.3,         // Height provides better visibility
      useWebGL: true,            // Try to use faster WebGL rendering
      maxUnitsPerFrame: 3,       // Process max 3 units per frame
      visibilityCheckFrequency: 0.5,  // Check visibility twice per second
      enableAdvancedFog: true,   // Enable advanced fog for better visuals
      lowResScale: 6,            // Even lower resolution for processing
      useGradients: true,        // Enable gradients for better fog visual distinction
      groundPlane: true          // Add the ground plane effect for explored areas
    };
  }
  
  async start() {
    // Call base start method which sets isInitialized = true
    super.start();
    
    // Temporarily set isInitialized to false until our setup is complete
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
    
    // Generate the procedural map using the base class method with specific options
    await this.generateProceduralMap({
      width: this.mapWidth,
      height: this.mapHeight,
      biomeType: this.biomeType,
      objectDensity: 1.8, // Higher density for exploration scenario
      resourceDensity: 0.5,
      elevation: 1.2 // More dramatic terrain variation
    });

    // When the map is ready, enable fog of war
    if (this.fogOfWar) {
      // Make sure to set this flag to false to allow proper fog functionality
      this._forceOptimizedFog = false;
      
      // Enable fog of war with the specified options
      this.enableFogOfWar(this.fogOptions);
      
      // Force the initial full fog state
      if (this.fogContext) {
        // Fill the entire fog canvas with black
        this.fogContext.fillStyle = 'black';
        this.fogContext.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
        
        // Make sure to update the texture
        if (this.fogTexture) {
          this.fogTexture.needsUpdate = true;
        }
        
        // Initialize the explored grid to completely unexplored
        if (this.exploredGrid) {
          for (let i = 0; i < this.exploredGrid.length; i++) {
            for (let j = 0; j < this.exploredGrid[i].length; j++) {
              this.exploredGrid[i][j] = false;
            }
          }
        }
        
        // Force a fog update immediately
        this.fogUpdateTimer = this.fogOptions.updateFrequency;
      }
      
      // Add specific message about the foggy, dangerous wasteland
      this.promptQueue.push({ 
        message: 'The wasteland is shrouded in fog. Explore carefully to reveal the terrain.', 
        timeout: 8000 
      });
    }
    
    // Add additional urban ruins - this is specific to exploration scenario
    this.addUrbanFeatures();
    
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

  // Add method for creating urban features specific to exploration scenario
  addUrbanFeatures() {
    // Get the scene from the renderer
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {
      console.error('Scene not found for urban features');
      return;
    }
    
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
  
  createPlayerSquad() {
    console.log('Creating player expedition squad');
    
    // Use the new unit types for a more diverse and interesting squad
    const squadComposition = [
      { type: 'neon_assassin', offset: { x: 0, z: -2 } },
      { type: 'scrap_golem', offset: { x: 0, z: 0 } }
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
    
    // Add beacon visual indicator using base class method
    this.addObjectiveMarker(this.beaconPosition, 'beacon');
    
    // Initialize progress tracking
    this.beaconProgress = 0;
    this.beaconActivated = false;
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
      title: 'Secure the Ancient Beacon',
      description: 'Hold the techno-arcane beacon at the far end of the wasteland for 45 seconds'
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
    // Call base class update which will handle fog of war updates and objective marker animations
    super.update(deltaTime);
    
    // Update objective progress
    this.updateObjectiveProgress(deltaTime);

    // Update entity visibility based on fog of war - ensure we do this every frame
    // to maintain visibility in explored areas even when using optimized fog
    if (this.fogOfWar) {
      // Update more frequently than default to keep entities visible in explored areas
      this.visibilityCheckTimer += deltaTime;
      if (this.visibilityCheckTimer >= 0.3) { // More frequent than default 0.5
        this.visibilityCheckTimer = 0;
        this.updateEntityVisibility();
      }
      
      // Special case for when we're in exploration scenario:
      // Ensure that nearby units always have their visibility updated correctly
      this.updateNearbyEntityVisibility();
      
      // Every 5 seconds, enforce a fog update to ensure it's working properly
      if (!this._extraFogTimer) {this._extraFogTimer = 0;}
      this._extraFogTimer += deltaTime;
      
      if (this._extraFogTimer >= 5.0) {
        this._extraFogTimer = 0;
        
        // Force a fog update by using the regular method but with a minimum delay
        if (this.fogOptions.enableAdvancedFog) {
          // Try the WebGL method first
          if (this.fogTextureData) {
            this.updateWebGLFog(0.5);
          } else {
            this.updateFogOfWar(0.5);
          }
        } else {
          // Directly use the optimized method
          this.updateFogOfWar(0.5);
        }
      }
    }
    
    // Handle adaptive performance but with constraints on visibility
    if (this._performanceCheckTimer === undefined) {
      this._performanceCheckTimer = 0;
      this._lastPerformanceMode = this.fogOptions.enableAdvancedFog;
      
      // Important: We want full fog functionality in Exploration Scenario
      this._forceOptimizedFog = false;
    }
    
    this._performanceCheckTimer += deltaTime;
    // Check performance less often to prevent rapid switching
    if (this._performanceCheckTimer >= 3.0) {
      this._performanceCheckTimer = 0;
      
      // Only use auto-adjustment if not forcing a specific mode
      if (!this._forceOptimizedFog) {
        // Only check performance if we haven't switched modes recently
        if (this._lastPerformanceMode === this.fogOptions.enableAdvancedFog) {
          //this.autoAdjustFogQuality();
        } else {
          // Update the last mode to the current one
          this._lastPerformanceMode = this.fogOptions.enableAdvancedFog;
        }
      }
    }
  }
  
  updateObjectiveProgress(deltaTime) {
    if (!this.gameController.systems.objectives) {return;}
    
    // Update beacon objective progress based on hold time
    if (this.beaconId && this.entityManager.hasComponent(this.beaconId, 'position')) {
      const beaconPosition = this.entityManager.getComponent(this.beaconId, 'position');
      let anyUnitAtBeacon = false;
      let closestDistance = Infinity;
      
      // Check if any player unit is at the beacon
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
          
          // Check if unit is close enough to the beacon (more generous 10-unit radius)
          if (distance < 10) {
            anyUnitAtBeacon = true;
            
            // Reveal the beacon area on the map
            if (this.fogOfWar) {
              this.revealMapFeature(beaconPosition, 40);
            }
            
            // Visual indicator if not already activated
            if (!this.beaconActivated) {
              this.beaconActivated = true;
              this.showNotification('Beacon found! Hold position for 45 seconds to complete the mission.');
              
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
      
      // Update hold timer based on whether any unit is at the beacon
      if (anyUnitAtBeacon) {
        if (!this.isHoldingBeacon) {
          this.isHoldingBeacon = true;
          this.showNotification('Holding beacon position: ' + Math.floor(this.beaconHoldTime) + '/' + this.requiredHoldTime + ' seconds');
        }
        
        this.beaconHoldTime += deltaTime;
        
        // Show periodic updates about hold progress
        if (Math.floor(this.beaconHoldTime) % 10 === 0 && Math.floor(this.beaconHoldTime) > 0) {
          const now = Date.now();
          const secondsLeft = this.requiredHoldTime - Math.floor(this.beaconHoldTime);
          if (secondsLeft > 0 && (!this._lastNotificationTime || 
              (now - this._lastNotificationTime > 5000))) {
            this.showNotification('Holding beacon: ' + secondsLeft + ' seconds remaining!');
            this._lastNotificationTime = now;
          }
        }
        
        // Update objective progress based on hold time
        const progress = Math.min(1.0, this.beaconHoldTime / this.requiredHoldTime);
        this.gameController.systems.objectives.updateObjectiveProgress('reach_beacon', progress);
      } else {
        // Reset timer if no units at beacon
        if (this.isHoldingBeacon) {
          this.isHoldingBeacon = false;
          if (this.beaconHoldTime > 0) {
            this.showNotification('Lost contact with beacon! Hold timer reset.');
          }
        }
        
        // Only reset timer if player has already found the beacon
        if (this.beaconActivated) {
          this.beaconHoldTime = 0;
          this.gameController.systems.objectives.updateObjectiveProgress('reach_beacon', 0);
        }
      }
      
      // Only update progress display if not yet activated
      if (!this.beaconActivated) {
        // Calculate progress based on distance (0-1 range)
        // But only show this if player is within detection range
        if (closestDistance < 30) {
          const progress = Math.max(0, 1 - (closestDistance / 30)) * 0.2; // Only go up to 20% before reaching beacon
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
  }
  
  checkBeaconReached() {
    // Check if any player unit has reached the beacon AND held it long enough
    if (!this.beaconId || !this.entityManager.hasComponent(this.beaconId, 'position')) {
      return false;
    }
    
    // Return true only if the beacon is activated AND the hold time is sufficient
    return this.beaconActivated && this.beaconHoldTime >= this.requiredHoldTime;
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
      return ['sniper_aim'];
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
  // Optimized method to only update visibility for nearby entities
  // This helps maintain visual quality while preserving performance
  updateNearbyEntityVisibility() {
    if (!this.fogOfWar) {return;}
    
    // Find player units to determine "center of interest"
    let centerX = 0;
    let centerZ = 0;
    let playerUnitCount = 0;
    
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (this.isPlayerEntity(entityId) && 
          this.entityManager.hasComponent(entityId, 'position')) {
        const pos = this.entityManager.getComponent(entityId, 'position');
        centerX += pos.x;
        centerZ += pos.z;
        playerUnitCount++;
      }
    });
    
    // If no player units found, return
    if (playerUnitCount === 0) {return;}
    
    // Calculate average position (center of interest)
    centerX /= playerUnitCount;
    centerZ /= playerUnitCount;
    
    // Define radius of interest around player units
    const interestRadius = 30; // Units within 30 units of player center
    
    // Update visibility only for entities near the player
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      // Skip player entities
      if (this.isPlayerEntity(entityId)) {return;}
      
      // Skip entities without position or render components
      if (!this.entityManager.hasComponent(entityId, 'position') ||
          !this.entityManager.hasComponent(entityId, 'render')) {
        return;
      }
      
      const pos = this.entityManager.getComponent(entityId, 'position');
      
      // Calculate distance to center of interest
      const dx = pos.x - centerX;
      const dz = pos.z - centerZ;
      const distance = Math.sqrt(dx*dx + dz*dz);
      
      // Only update entities within interest radius
      if (distance <= interestRadius) {
        const visibilityResult = this.getPositionVisibilityDetail(pos);
        const render = this.entityManager.getComponent(entityId, 'render');
        
        // Update render visibility based on visibility type
        if (visibilityResult.fullyVisible) {
          render.visible = true;
          
          // Get mesh from render system and update visibility
          const mesh = this.systems.render.meshes.get(entityId);
          if (mesh) {
            mesh.visible = true;
            
            // Reset materials to original appearance
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                if (mat.originalColor) {
                  mat.color.set(mat.originalColor);
                }
                if (mat.opacity !== undefined) {
                  mat.opacity = 1.0;
                }
              });
            } else if (mesh.material) {
              if (mesh.material.originalColor) {
                mesh.material.color.set(mesh.material.originalColor);
              }
              if (mesh.material.opacity !== undefined) {
                mesh.material.opacity = 1.0;
              }
            }
          }
        } else if (visibilityResult.explored) {
          render.visible = true;
          
          // Apply semi-visible effect for explored areas
          const mesh = this.systems.render.meshes.get(entityId);
          if (mesh) {
            mesh.visible = true;
            
            // Apply darkening to materials
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach(mat => {
                if (!mat.originalColor) {
                  mat.originalColor = mat.color.clone();
                }
                mat.color.set(0x001133);
                mat.opacity = 0.7;
                mat.transparent = true;
              });
            } else if (mesh.material) {
              if (!mesh.material.originalColor) {
                mesh.material.originalColor = mesh.material.color.clone();
              }
              mesh.material.color.set(0x001133);
              mesh.material.opacity = 0.7;
              mesh.material.transparent = true;
            }
          }
        } else {
          // Not visible at all
          render.visible = false;
          
          const mesh = this.systems.render.meshes.get(entityId);
          if (mesh) {
            mesh.visible = false;
          }
        }
      }
    });
  }

  // Add to ExplorationScenario.js
  revealMapFeature(position, radius = 30) {
    if (!this.fogOfWar || !this.fogContext) {return;}
  
    // Convert world position to canvas coordinates
    const canvasX = (position.x + this.mapWidth/2) * (this.fogCanvas.width / this.mapWidth);
    // Fix: Invert the Z axis when mapping to canvas Y
    const canvasY = (this.mapHeight - (position.z + this.mapHeight/2)) * (this.fogCanvas.height / this.mapHeight);
    const canvasRadius = radius * (this.fogCanvas.width / this.mapWidth);
  
    // Create radial gradient for reveal effect
    const gradient = this.fogContext.createRadialGradient(
      canvasX, canvasY, 0,
      canvasX, canvasY, canvasRadius
    );
  
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Clear at center
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)'); // Semi-transparent at middle
    gradient.addColorStop(1, 'rgba(0, 0, 0, ' + this.fogOptions.exploredOpacity + ')'); // Fade to explored opacity
  
    // Apply gradient using 'destination-out' to clear fog
    this.fogContext.globalCompositeOperation = 'destination-out';
    this.fogContext.fillStyle = gradient;
    this.fogContext.beginPath();
    this.fogContext.arc(canvasX, canvasY, canvasRadius, 0, Math.PI * 2);
    this.fogContext.fill();
  
    // Reset composite operation
    this.fogContext.globalCompositeOperation = 'source-over';
  
    // Mark area as explored in the grid
    const gridResolution = 4;
    const gridCenterX = Math.floor((position.x + this.mapWidth/2) * gridResolution);
    // Fix: Invert Z axis for grid coordinates to match canvas
    const gridCenterY = Math.floor((this.mapHeight - (position.z + this.mapHeight/2)) * gridResolution);
    const gridRadius = Math.ceil(radius * gridResolution);
  
    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
      for (let dy = -gridRadius; dy <= gridRadius; dy++) {
        if (dx*dx + dy*dy <= gridRadius*gridRadius) {
          const gx = gridCenterX + dx;
          const gy = gridCenterY + dy;
        
          if (gx >= 0 && gx < this.exploredGrid.length && 
            gy >= 0 && gy < this.exploredGrid[0].length) {
            this.exploredGrid[gx][gy] = true;
          }
        }
      }
    }
  
    // Update texture
    this.fogTexture.needsUpdate = true;
  }
}

export default ExplorationScenario;