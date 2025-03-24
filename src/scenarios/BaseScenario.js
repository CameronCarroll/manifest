// scenarios/BaseScenario.js
import * as THREE from 'three';
import TerrainFactory from '../utils/TerrainFactory.js';
import MapGenerator from '../utils/MapGenerator.js';

class BaseScenario {
  constructor(gameController) {
    this.gameController = gameController;
    this.entityManager = gameController.entityManager;
    this.systems = gameController.systems;
    this.gameState = gameController.gameState;
      
    // Scenario configuration
    this.name = 'Base Scenario';
    this.description = 'Base scenario class for inheritance';
      
    // Victory/defeat conditions
    this.victoryConditions = [];
    this.defeatConditions = [];
    
    // Scenario features configuration
    this.features = {
      resources: false,    // Toggle resource UI
      production: false,   // Toggle production queue UI
      economyManagement: false  // Could be used for more complex economic scenarios
    };
    
    // Map configuration
    this.mapWidth = 40;
    this.mapHeight = 40;
    this.objectDensity = 0.6;
    this.resourceDensity = 0.3;
    this.biomeType = 'default';
    
    // UI configuration
    this.promptQueue = [];
    
    // Flag to prevent early defeat check
    this.isInitialized = false;
    
    // Objective tracking
    this.objectiveMarkers = [];
  }
    
  // Initialize the scenario
  start() {
    console.log(`Starting scenario: ${this.name}`);
    this.isInitialized = true;
  }
    
  // Update scenario-specific logic
  update(deltaTime) {
    // Update objective markers if any
    this.updateObjectiveMarkers(deltaTime);
  }
    
  // Check if victory conditions are met
  checkVictory() {
    // Basic implementation, override for complex conditions
    return false;
  }
    
  // Check if defeat conditions are met
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
  
  // Generate a procedural map with proper error handling
  async generateProceduralMap(options = {}) {
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
    
    // Set map options based on biome type with custom settings
    const mapOptions = {
      width: options.width || this.mapWidth,
      height: options.height || this.mapHeight,
      biomeType: options.biomeType || this.biomeType,
      objectDensity: options.objectDensity || this.objectDensity,
      resourceDensity: options.resourceDensity || this.resourceDensity,
      elevation: options.elevation || 1.0,
      seed: options.seed || Math.floor(Math.random() * 10000) // Random seed
    };
    
    try {
      console.log(`Starting procedural map generation with options:`, mapOptions);
      
      // Generate the map with proper error handling
      const mapData = await mapGenerator.generateMap(mapOptions);
      console.log('Map generated successfully with bounds:', mapData.bounds);
      
      // Store map data for later reference
      this.mapData = mapData;
      
      // Add map borders if requested
      if (options.addBorders !== false) {
        this.addMapBorders(scene, mapOptions);
      }
      
      // Set camera bounds based on map size
      this.systems.render.sceneManager.setCameraBounds(
        -mapOptions.width/2, mapOptions.width/2,
        -mapOptions.height/2, mapOptions.height/2
      );
      
      return mapData;
    } catch (error) {
      console.error('Error generating map:', error);
      this.createFallbackTerrain(scene);
      return null;
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
  
  // Create a simple fallback terrain if procedural generation fails
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
  
  // Display a notification to the player
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
  
  // Show next prompt in queue
  showNextPrompt() {
    if (this.promptQueue.length === 0) {return;}
    
    const prompt = this.promptQueue.shift();
    this.showNotification(prompt.message);
    
    // Schedule next prompt
    if (this.promptQueue.length > 0) {
      setTimeout(() => this.showNextPrompt(), prompt.timeout);
    }
  }
  
  // Create a player unit with specified type and configuration
  createPlayerUnit(unitType, position) {
    const entityId = this.entityManager.createEntity();
    
    // Add base components
    this.entityManager.addComponent(entityId, 'position', {
      x: position.x,
      y: position.y || 0,
      z: position.z,
      rotation: Math.random() * Math.PI * 2
    });
    
    // Add health component with appropriate values for the unit type
    const healthValues = this.getUnitHealthValues(unitType);
    this.entityManager.addComponent(entityId, 'health', healthValues);
    
    // Add render component
    this.entityManager.addComponent(entityId, 'render', {
      meshId: 'unit',
      scale: { x: 1, y: 1, z: 1 },
      color: 0x00ffff, // Player faction color (cyan)
      visible: true
    });
    
    // Add faction component
    this.entityManager.addComponent(entityId, 'faction', {
      faction: 'player',
      unitType: this.convertUnitTypeToFactionType(unitType),
      attackType: this.getUnitAttackType(unitType),
      damageType: 'normal'
    });
    
    // Add unit type component if needed
    if (unitType && unitType !== 'default') {
      this.entityManager.addComponent(entityId, 'unitType', {
        type: unitType,
        abilities: this.getUnitAbilities(unitType),
        visualEffects: []
      });
    }
    
    // Register with collision system if available
    if (this.systems && this.systems.collision) {
      this.systems.collision.registerEntity(entityId, false); // Not static
    }
    
    return entityId;
  }
  
  // Create a terrain feature with proper type and appearance
  createTerrainFeature(type, position, scale) {
    const entityId = this.entityManager.createEntity();
    
    // Add position component
    this.entityManager.addComponent(entityId, 'position', {
      x: position.x,
      y: position.y || 0,
      z: position.z
    });
    
    // Add render component with type-specific properties
    let meshId = 'terrain';
    let color = 0x7b7b7b; // Default gray
    let entityScale = scale || { x: 1, y: 1, z: 1 };
    
    if (type === 'rock') {
      color = 0x7b7b7b;
      entityScale = scale || { x: 2 + Math.random() * 1.5, y: 2 + Math.random(), z: 2 + Math.random() * 1.5 };
    } else if (type === 'hill') {
      meshId = 'hill';
      color = 0x6b8e4e; // Green
      entityScale = scale || { x: 5 + Math.random() * 5, y: 2 + Math.random() * 2, z: 5 + Math.random() * 5 };
    } else if (type === 'tree') {
      meshId = 'tree';
      color = 0x228B22; // Forest green
      entityScale = scale || { x: 1.5, y: 3, z: 1.5 };
    } else if (type === 'server_monolith' || type === 'holographic_ruin' || type === 'corrupted_machinery' || type === 'circuit_tree') {
      // Support for advanced terrain types from exploration scenario
      meshId = type === 'circuit_tree' ? 'circuit' : 'ruin';
      color = type === 'holographic_ruin' ? 0x00ffaa : 0x555555;
    }
    
    this.entityManager.addComponent(entityId, 'render', {
      meshId: meshId,
      color: color,
      scale: entityScale
    });
    
    // Register with collision system if available
    if (this.systems && this.systems.collision) {
      this.systems.collision.registerEntity(entityId, true); // Static object
    }
    
    return entityId;
  }
  
  // Create a resource node
  createResourceNode(type, position, amount) {
    const entityId = this.entityManager.createEntity();
      
    this.entityManager.addComponent(entityId, 'position', {
      x: position.x,
      y: position.y || 0,
      z: position.z
    });
      
    this.entityManager.addComponent(entityId, 'resource', {
      type: type || 'minerals',
      amount: amount || 1000
    });
      
    // Add a visual representation
    const color = type === 'gas' ? 0x00ffff : 0xffff00;
    this.entityManager.addComponent(entityId, 'render', {
      meshId: 'resource',
      scale: { x: 1.5, y: 1, z: 1.5 },
      color: color
    });
    
    // Register with collision system if available
    if (this.systems && this.systems.collision) {
      this.systems.collision.registerEntity(entityId, true); // Static object
    }
      
    return entityId;
  }
  
  // Create an enemy building
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
      meshId: 'building',
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
    
    // Add building type component for the rendering system
    this.entityManager.addComponent(entityId, 'buildingType', {
      type: buildingType || 'outpost',
      level: 1,
      visualEffects: []
    });
    
    // Register with collision system
    if (this.systems.collision) {
      this.systems.collision.registerEntity(entityId, true); // Static object
    }
    
    return entityId;
  }
  
  // Spawn enemy units around a position
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
  
  // Spawn random enemy units across the map
  spawnRandomEnemyUnits(count, area = {}) {
    const enemyTypes = ['lightInfantry', 'heavyInfantry', 'sniperUnit', 'specialistUnit'];
    
    // Define map boundaries
    const minX = area.minX || -this.mapWidth/2 + 20;
    const maxX = area.maxX || this.mapWidth/2 - 20;
    const minZ = area.minZ || -this.mapHeight/2 + 20;
    const maxZ = area.maxZ || this.mapHeight/2 - 20;
    
    for (let i = 0; i < count; i++) {
      // Place enemies at random positions within boundaries
      const position = {
        x: minX + Math.random() * (maxX - minX),
        z: minZ + Math.random() * (maxZ - minZ)
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
  
  // Add an objective marker at a position
  addObjectiveMarker(position, type = 'default') {
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {return null;}
    
    // Create a visual indicator based on the type
    let markerObject = null;
    let markerLight = null;
    
    if (type === 'beacon') {
      // Create a light pillar effect
      const beamGeometry = new THREE.CylinderGeometry(0.5, 0.1, 30, 8);
      const beamMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      markerObject = new THREE.Mesh(beamGeometry, beamMaterial);
      markerObject.position.set(position.x, 15, position.z);
      
      // Store animation parameters
      markerObject.userData = {
        pulsateSpeed: 0.5,
        baseOpacity: 0.3,
        time: 0
      };
      
      // Add to scene
      scene.add(markerObject);
      
      // Add a point light
      markerLight = new THREE.PointLight(0x00ffff, 1, 30);
      markerLight.position.set(position.x, 5, position.z);
      scene.add(markerLight);
    } else {
      // Default marker (a floating sphere)
      const sphereGeometry = new THREE.SphereGeometry(1, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: type === 'primary' ? 0x00ff00 : 0xffff00,
        transparent: true,
        opacity: 0.7
      });
      
      markerObject = new THREE.Mesh(sphereGeometry, sphereMaterial);
      markerObject.position.set(position.x, 3, position.z);
      
      // Store animation parameters
      markerObject.userData = {
        floatSpeed: 0.5,
        floatHeight: 1,
        rotateSpeed: 1,
        baseY: 3,
        time: 0
      };
      
      // Add to scene
      scene.add(markerObject);
    }
    
    // Store the marker in our list
    const marker = {
      object: markerObject,
      light: markerLight,
      position: position,
      type: type,
      visible: true
    };
    
    this.objectiveMarkers.push(marker);
    return marker;
  }
  
  // Update all objective markers
  updateObjectiveMarkers(deltaTime) {
    for (const marker of this.objectiveMarkers) {
      if (!marker.object) {continue;}
      
      if (marker.type === 'beacon') {
        const params = marker.object.userData;
        params.time += deltaTime;
        
        // Pulsating opacity
        marker.object.material.opacity = params.baseOpacity + 
          Math.sin(params.time * params.pulsateSpeed) * 0.2;
        
        // Slowly rotate
        marker.object.rotation.y += deltaTime * 0.2;
      } else {
        const params = marker.object.userData;
        params.time += deltaTime;
        
        // Float up and down
        marker.object.position.y = params.baseY + 
          Math.sin(params.time * params.floatSpeed) * params.floatHeight;
        
        // Rotate
        marker.object.rotation.y += deltaTime * params.rotateSpeed;
      }
    }
  }
  
  // Helper for setting up wave-based enemies
  setupEnemyWaves(spawnPoints, waves) {
    // Create spawn points
    const spawnPointIds = spawnPoints.map(position => 
      this.systems.spawn.createSpawnPoint(position)
    );
      
    // Create waves
    waves.forEach(waveConfig => {
      this.systems.spawn.createWave({
        spawnPointIds: spawnPointIds,
        ...waveConfig
      });
    });
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
}
  
export default BaseScenario;