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

    // Fog of War stuff
    this.fogOfWar = false; // Disabled by default in base class
    this.fogLayer = null;
    this.fogCanvas = null;
    this.fogContext = null;
    this.fogTexture = null;
    this.fogOptions = {
      sightRadius: 15,          // Base sight radius for units
      exploredOpacity: 0.4,     // Partially visible for explored areas
      unexploredOpacity: 0.9,   // Nearly opaque for unexplored areas
      updateFrequency: 0.25,     // Update every 250ms to improve performance
      fogColor: 0x000000,       // Black fog
      fadeEdgeWidth: 0.3,       // Fade width at the edge of sight (30% of radius)
      rememberExplored: true,   // Remember areas that were previously explored
      resolution: 2,            // Multiplier for fog texture resolution
      heightInfluence: true,    // Higher elevation = better visibility
      heightFactor: 0.2,         // How much height increases view distance (20%)
      useGradients: false,       // Disable gradients for better performance
      lowResScale: 4,            // Low-res canvas scale factor (higher = better performance)
      useWebGL: true,            // Use WebGL for fog rendering if possible
      maxUnitsPerFrame: 5,       // Process at most 5 units per frame
      visibilityCheckFrequency: 0.5, // Check entity visibility only twice per second
      enableAdvancedFog: true    // Allow toggling advanced features
    };
    this.fogUpdateTimer = 0;
    this.exploredGrid = null;   // Grid to track explored areas
    this.visibilityCheckTimer = 0;
    
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
    
    // Update fog of war
    if (this.fogOfWar) {
      if (this.fogTextureData) {
        this.updateWebGLFog(deltaTime);
      } else {
        this.updateFogOfWar(deltaTime);
      }
      
      // Update entity visibility less frequently
      this.visibilityCheckTimer += deltaTime;
      if (this.visibilityCheckTimer >= this.fogOptions.visibilityCheckFrequency) {
        this.visibilityCheckTimer = 0;
        this.updateEntityVisibility();
      }
    }
    
    // Any other scenario-specific updates would go here
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
    if (!this.entityManager || !this.entityManager.hasComponent(entityId, 'faction')) {
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
      return { maxHealth: 400, currentHealth: 400, armor: 20, shield: 0, regeneration: 0 };
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
      return [];
    case 'neon_assassin':
      return ['sniper_aim'];
    case 'techno_shaman':
      return [];
    case 'biohacker':
      return [];
    case 'scrap_golem':
      return [];
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

  // Add this method to BaseScenario.js
  initializeFogOfWar() {
    console.log('Initializing fog of war system');
    
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {
      console.error('No active scene found for fog of war initialization');
      return false;
    }
    
    // Initialize explored grid for memory
    const gridResolution = 4; // Grid cells per world unit
    const gridWidth = Math.ceil(this.mapWidth * gridResolution);
    const gridHeight = Math.ceil(this.mapHeight * gridResolution);
    
    this.exploredGrid = Array(gridWidth).fill().map(() => 
      Array(gridHeight).fill(false)
    );
    
    // Create fog layer covering the entire map
    const fogGeometry = new THREE.PlaneGeometry(this.mapWidth, this.mapHeight);
    const fogMaterial = new THREE.MeshBasicMaterial({
      color: this.fogOptions.fogColor,
      transparent: true,
      opacity: this.fogOptions.unexploredOpacity,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    this.fogLayer = new THREE.Mesh(fogGeometry, fogMaterial);
    this.fogLayer.rotation.x = -Math.PI / 2; // Lay flat
    this.fogLayer.position.y = 1.0; // Slightly above ground to avoid z-fighting
    this.fogLayer.renderOrder = 1000; // Ensure it renders on top
    scene.add(this.fogLayer);
    
    // Create a canvas for dynamic fog texture
    this.fogCanvas = document.createElement('canvas');
    
    // Ensure dimensions are reasonable for performance
    const canvasWidth = Math.floor(this.mapWidth * this.fogOptions.resolution);
    const canvasHeight = Math.floor(this.mapHeight * this.fogOptions.resolution);
    
    this.fogCanvas.width = Math.min(2048, Math.max(256, canvasWidth));
    this.fogCanvas.height = Math.min(2048, Math.max(256, canvasHeight));
    
    this.fogContext = this.fogCanvas.getContext('2d');
    
    // Initialize canvas as fully black (fog)
    this.fogContext.fillStyle = '#000000';
    this.fogContext.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
    
    // Create texture from canvas
    this.fogTexture = new THREE.CanvasTexture(this.fogCanvas);
    this.fogTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.fogTexture.wrapT = THREE.ClampToEdgeWrapping;
    
    // Apply texture to fog material
    this.fogLayer.material.map = this.fogTexture;
    this.fogLayer.material.needsUpdate = true;
    
    // Set initial fog values
    this.fogUpdateTimer = this.fogOptions.updateFrequency;
    this.lastFogUpdate = null;
    
    console.log(`Fog of war system initialized: canvas size ${this.fogCanvas.width}x${this.fogCanvas.height}`);
    return true;
  }

  // Update fog of war using optimized method
  updateFogOfWar(deltaTime) {
    // Skip if fog of war is disabled or not initialized
    if (!this.fogOfWar || !this.fogContext) {return;}
    
    // Update timer and skip if it's not time to update yet - increase interval for better performance
    this.fogUpdateTimer += deltaTime;
    if (this.fogUpdateTimer < this.fogOptions.updateFrequency) {return;}
    this.fogUpdateTimer = 0;
    
    // Use a downscaled version of the fog canvas for processing
    // This is the key optimization - we'll work on a smaller canvas
    if (!this.lowResFogCanvas) {
      // Create a lower resolution canvas for processing (1/4 the resolution)
      const scaleFactor = this.fogOptions.lowResScale || 4;
      this.lowResFogCanvas = document.createElement('canvas');
      this.lowResFogCanvas.width = Math.max(32, Math.floor(this.fogCanvas.width / scaleFactor));
      this.lowResFogCanvas.height = Math.max(32, Math.floor(this.fogCanvas.height / scaleFactor));
      this.lowResFogContext = this.lowResFogCanvas.getContext('2d');
      
      console.log(`Created low-res fog canvas: ${this.lowResFogCanvas.width}x${this.lowResFogCanvas.height}`);
    }
    
    // On first update or if not remembering explored areas,
    // prepare the low-res canvas by filling with black (fog)
    if (!this.lastFogUpdate || !this.fogOptions.rememberExplored) {
      this.lowResFogContext.fillStyle = 'black';
      this.lowResFogContext.fillRect(0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height);
    } else {
      // On subsequent updates, copy the main canvas (scaled down) to preserve explored areas
      this.lowResFogContext.drawImage(
        this.fogCanvas, 
        0, 0, this.fogCanvas.width, this.fogCanvas.height,
        0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height
      );
    }
    
    // Get ALL player units (don't limit them)
    const playerUnits = [];
    
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (this.isPlayerEntity(entityId) && 
          this.entityManager.hasComponent(entityId, 'position')) {
        
        const pos = this.entityManager.getComponent(entityId, 'position');
        
        // Simple sight radius calculation - avoid complex calculations
        let sightRadius = this.fogOptions.sightRadius;
        if (this.entityManager.hasComponent(entityId, 'unitType')) {
          const unitType = this.entityManager.getComponent(entityId, 'unitType');
          if (unitType.type === 'neon_assassin' || unitType.type === 'sniper') {
            sightRadius *= 1.5;
          }
        }
        
        playerUnits.push({
          position: pos,
          sightRadius: sightRadius
        });
      }
    });
    
    // Process all player units to make sure fog of war clears properly
    if (playerUnits.length > 0) {
      // Scale factors for converting world to canvas coordinates
      const canvasScale = {
        x: this.lowResFogCanvas.width / this.mapWidth,
        y: this.lowResFogCanvas.height / this.mapHeight
      };
      
      const gridResolution = 4; // Match grid resolution from initialization
      
      // Create fog cutouts around player units
      for (const unit of playerUnits) {
        const pos = unit.position;
        
        // Convert world position to low-res canvas coordinates
        // Correct the mapping from world coordinates to canvas coordinates
        const canvasX = (pos.x + this.mapWidth/2) * canvasScale.x;
        // Fix: We need to invert the Z axis when mapping to canvas Y
        const canvasY = (this.mapHeight - (pos.z + this.mapHeight/2)) * canvasScale.y;
        const canvasRadius = unit.sightRadius * canvasScale.x;
        
        // Ensure we use a minimum visible radius
        const effectiveRadius = Math.max(3, canvasRadius);
        
        // Use a simpler circle reveal
        this.lowResFogContext.globalCompositeOperation = 'destination-out';
        
        // Start the circle path
        this.lowResFogContext.beginPath();
        this.lowResFogContext.arc(canvasX, canvasY, effectiveRadius, 0, Math.PI * 2);
        
        // Add a slight gradient at the edge if enabled
        if (this.fogOptions.useGradients) {
          // Create radial gradient for sight radius
          const gradient = this.lowResFogContext.createRadialGradient(
            canvasX, canvasY, 0,
            canvasX, canvasY, effectiveRadius
          );
          
          // Make center more completely clear for better visibility
          gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Full clear at center
          gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.95)'); // Almost full clear
          gradient.addColorStop(0.85, 'rgba(0, 0, 0, 0.5)'); // Half fade
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // No clearing at edge
          
          this.lowResFogContext.fillStyle = gradient;
        } else {
          // Simple fill - make fully visible
          this.lowResFogContext.fillStyle = 'rgba(0, 0, 0, 1)';
        }
        
        this.lowResFogContext.fill();
        
        // Update explored grid for memory
        if (this.fogOptions.rememberExplored && this.exploredGrid) {
          const gridCenterX = Math.floor((pos.x + this.mapWidth/2) * gridResolution);
          // Fix: Invert Z axis for grid coordinates to match canvas
          const gridCenterY = Math.floor((this.mapHeight - (pos.z + this.mapHeight/2)) * gridResolution);
          const gridRadius = Math.ceil(unit.sightRadius * gridResolution);
          
          // Update the explored grid around this unit
          for (let dx = -gridRadius; dx <= gridRadius; dx++) {
            for (let dy = -gridRadius; dy <= gridRadius; dy++) {
              // Check if within circle radius
              if (dx*dx + dy*dy <= gridRadius*gridRadius) {
                const gx = gridCenterX + dx;
                const gy = gridCenterY + dy;
                
                // Ensure we're within grid bounds
                if (gx >= 0 && gx < this.exploredGrid.length && 
                    gy >= 0 && gy < this.exploredGrid[0].length) {
                  this.exploredGrid[gx][gy] = true;
                }
              }
            }
          }
        }
      }
      
      // Reset composite operation
      this.lowResFogContext.globalCompositeOperation = 'source-over';
      
      // Apply explored but not visible overlay (if using memory of explored areas)
      if (this.fogOptions.rememberExplored) {
        // Use a slightly higher opacity for explored areas to create better contrast
        const exploredOpacity = Math.min(0.65, this.fogOptions.exploredOpacity + 0.2);
        this.lowResFogContext.fillStyle = `rgba(0, 0, 0, ${exploredOpacity})`;
        this.lowResFogContext.globalCompositeOperation = 'source-atop';
        this.lowResFogContext.fillRect(0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height);
      }
    }
    
    // Upscale the low-res canvas back to the main fog canvas
    this.fogContext.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
    this.fogContext.drawImage(
      this.lowResFogCanvas,
      0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height,
      0, 0, this.fogCanvas.width, this.fogCanvas.height
    );
    
    // Update texture
    this.lastFogUpdate = Date.now();
    this.fogTexture.needsUpdate = true;
  }
  // Methods to enable/disable fog of war
  enableFogOfWar(options = {}) {
    // Merge provided options with defaults
    this.fogOptions = { ...this.fogOptions, ...options };
    
    // Choose the appropriate initialization method
    let initialized = false;
    
    if (this.fogOptions.useWebGL) {
      // Try WebGL first
      initialized = this.initializeWebGLFog();
    }
    
    // Fall back to canvas method if WebGL failed or was disabled
    if (!initialized && !this.fogLayer) {
      initialized = this.initializeFogOfWar();
    }
    
    if (!initialized) {
      console.error('Failed to initialize fog of war');
      return false;
    }
    
    this.fogOfWar = true;
    if (this.fogLayer) {
      this.fogLayer.visible = true;
    }
    
    // Get the scene to initialize lighting effects
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (scene) {
      // Initialize the fog of war lighting system
      this.updateSceneLighting(scene);
      
      // Create a ground plane that will be affected by fog and lighting
      if (!this.fogGround && this.fogOptions.groundPlane) {
        const groundGeometry = new THREE.PlaneGeometry(this.mapWidth, this.mapHeight);
        const groundMaterial = new THREE.MeshStandardMaterial({
          color: 0x444444,
          roughness: 0.8,
          metalness: 0.2,
          transparent: true,
          opacity: 0.6
        });
        
        this.fogGround = new THREE.Mesh(groundGeometry, groundMaterial);
        this.fogGround.rotation.x = -Math.PI / 2;
        this.fogGround.position.y = 0.05; // Slightly above actual ground
        this.fogGround.renderOrder = 1; // Render after normal ground
        scene.add(this.fogGround);
      }
    }
    
    return true;
  }

  disableFogOfWar() {
    this.fogOfWar = false;
    if (this.fogLayer) {
      this.fogLayer.visible = false;
    }
  }

  // Add method to reveal the entire map (for debug or cheat)
  revealEntireMap() {
    if (!this.fogOfWar || !this.fogContext) {return;}
  
    // Clear the fog canvas completely
    this.fogContext.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
  
    // Mark all grid cells as explored
    if (this.exploredGrid) {
      for (let i = 0; i < this.exploredGrid.length; i++) {
        for (let j = 0; j < this.exploredGrid[i].length; j++) {
          this.exploredGrid[i][j] = true;
        }
      }
    }
  
    // Apply semi-transparent fog to the entire map
    this.fogContext.fillStyle = 'rgba(0, 0, 0, ' + this.fogOptions.exploredOpacity + ')';
    this.fogContext.fillRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
  
    // Update texture
    this.fogTexture.needsUpdate = true;
  }

  // Add method to hide units that are in fog
  updateEntityVisibility() {
    if (!this.fogOfWar || !this.fogLayer) {return;}
  
    // Get the active scene to manage lights
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {return;}
    
    // Process all non-player entities with render components
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      // Skip player entities, they should always be visible
      if (this.isPlayerEntity(entityId)) {return;}
    
      // Only process entities with position and render components
      if (!this.entityManager.hasComponent(entityId, 'position') ||
        !this.entityManager.hasComponent(entityId, 'render')) {
        return;
      }
    
      const pos = this.entityManager.getComponent(entityId, 'position');
      const render = this.entityManager.getComponent(entityId, 'render');
    
      // Get visibility information with detail level
      const visibilityResult = this.getPositionVisibilityDetail(pos);
    
      // Update render visibility based on visibility type
      if (visibilityResult.fullyVisible) {
        // Fully visible - show at full brightness
        render.visible = true;

        // If we have mesh in render system, set its visibility directly
        const mesh = this.systems.render.meshes.get(entityId);
        if (mesh) {
          mesh.visible = true;
          
          // Reset any materials to their original state
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
        // Explored but not in direct sight - show darkened
        render.visible = true;
        
        // Apply darkening effect through the mesh materials directly
        const mesh = this.systems.render.meshes.get(entityId);
        if (mesh) {
          mesh.visible = true;
          
          // Darken all materials for this mesh
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
              // Store original color if not saved
              if (!mat.originalColor) {
                mat.originalColor = mat.color.clone();
              }
              // Apply dark blue tint with low opacity for "explored" look
              mat.color.set(0x001133);
              mat.opacity = 0.7;
              mat.transparent = true;
            });
          } else if (mesh.material) {
            // Store original color if not saved
            if (!mesh.material.originalColor) {
              mesh.material.originalColor = mesh.material.color.clone();
            }
            // Apply dark blue tint with low opacity for "explored" look
            mesh.material.color.set(0x001133);
            mesh.material.opacity = 0.7;
            mesh.material.transparent = true;
          }
        }
      } else {
        // Not visible at all - completely hidden
        render.visible = false;
        
        // Also hide the actual mesh
        const mesh = this.systems.render.meshes.get(entityId);
        if (mesh) {
          mesh.visible = false;
        }
      }
    });
    
    // Make sure to update the scene lighting based on fog of war
    this.updateSceneLighting(scene);
  }
  
  // New method to control scene lighting based on fog of war
  updateSceneLighting(scene) {
    if (!this.fogOfWar) {return;}
    
    // Make sure we have a scene light to control
    if (!this._sceneFogLights) {
      // Create lighting system for fog of war
      this._sceneFogLights = {
        ambient: new THREE.AmbientLight(0xffffff, 1.0), // Bright ambient for visible areas
        explored: new THREE.DirectionalLight(0x2244ff, 0.3) // Blue-tinted directional for explored areas
      };
      
      // Add lights to scene
      scene.add(this._sceneFogLights.ambient);
      scene.add(this._sceneFogLights.explored);
      
      // Position the directional light
      this._sceneFogLights.explored.position.set(0, 50, 0);
      this._sceneFogLights.explored.target.position.set(0, 0, 0);
      scene.add(this._sceneFogLights.explored.target);
    }
  }
  
  // Helper method that returns more detailed visibility information
  getPositionVisibilityDetail(position) {
    if (!this.fogOfWar) {
      return { fullyVisible: true, explored: true };
    }
  
    // Check for direct visibility from player units
    for (const [entityId, entity] of this.entityManager.gameState.entities) {
      if (this.isPlayerEntity(entityId) && 
          this.entityManager.hasComponent(entityId, 'position')) {
        
        const unitPos = this.entityManager.getComponent(entityId, 'position');
        
        // Calculate distance to this unit
        const dx = position.x - unitPos.x;
        const dz = position.z - unitPos.z;
        const distance = Math.sqrt(dx*dx + dz*dz);
        
        // Get unit-specific sight radius
        let sightRadius = this.fogOptions.sightRadius;
        if (this.entityManager.hasComponent(entityId, 'unitType')) {
          const unitType = this.entityManager.getComponent(entityId, 'unitType');
          if (unitType.type === 'neon_assassin' || unitType.type === 'sniper') {
            sightRadius *= 1.5;
          }
        }
      
        // If within sight radius, position is fully visible
        if (distance <= sightRadius) {
          return { fullyVisible: true, explored: true };
        }
      }
    }
  
    // Check if position is in explored area
    if (this.fogOptions.rememberExplored && this.exploredGrid) {
      const gridResolution = 4; // Match the grid resolution from initialization
      const gridX = Math.floor((position.x + this.mapWidth/2) * gridResolution);
      // Use correct Y coordinate calculation to match the one used in updateFogOfWar
      const gridY = Math.floor((this.mapHeight - (position.z + this.mapHeight/2)) * gridResolution);
    
      // Ensure within grid bounds
      if (gridX >= 0 && gridX < this.exploredGrid.length && 
          gridY >= 0 && gridY < this.exploredGrid[0].length) {
        // If the area is explored, it's semi-visible
        if (this.exploredGrid[gridX][gridY]) {
          return { fullyVisible: false, explored: true };
        }
      }
    }
  
    // Not visible at all
    return { fullyVisible: false, explored: false };
  }

  // Helper method to check if a position is visible (not in fog)
  isPositionVisible(position) {
    const result = this.getPositionVisibilityDetail(position);
    // Return true for both fully visible and explored areas
    return result.fullyVisible || result.explored;
  }

  // Add this method to BaseScenario.js
  initializeWebGLFog() {
    console.log('Initializing WebGL-based fog of war');
  
    const { scene } = this.systems.render.sceneManager.getActiveScene();
    if (!scene) {return false;}
  
    // Create a simple custom shader for the fog
    const fogVertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
    const fogFragmentShader = `
    uniform sampler2D fogTexture;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(fogTexture, vUv);
      gl_FragColor = color;
    }
  `;
  
    // Create a data texture with black pixels
    const size = 512; // Start with a smaller texture
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 0;     // R
      data[i+1] = 0;   // G
      data[i+2] = 0;   // B
      data[i+3] = 255; // A (opaque)
    }
  
    // Create texture from the pixel data
    this.fogDataTexture = new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    this.fogDataTexture.needsUpdate = true;
  
    // Create shader material using the texture
    const fogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        fogTexture: { value: this.fogDataTexture }
      },
      vertexShader: fogVertexShader,
      fragmentShader: fogFragmentShader,
      transparent: true,
      depthWrite: false
    });
  
    // Create the fog plane
    const fogGeometry = new THREE.PlaneGeometry(this.mapWidth, this.mapHeight);
    this.fogLayer = new THREE.Mesh(fogGeometry, fogMaterial);
    this.fogLayer.rotation.x = -Math.PI / 2;
    this.fogLayer.position.y = 1.0;
    this.fogLayer.renderOrder = 1000;
    scene.add(this.fogLayer);
  
    // Set up for WebGL fog updates
    this.fogTextureSize = size;
    this.fogTextureData = data;
  
    console.log('WebGL fog initialized');
    return true;
  }

  // Add this method for updating WebGL fog
  updateWebGLFog(deltaTime) {
  // Skip if disabled or not initialized
    if (!this.fogOfWar || !this.fogTextureData) {return;}
  
    // Update timer and skip if not time yet
    this.fogUpdateTimer += deltaTime;
    if (this.fogUpdateTimer < this.fogOptions.updateFrequency) {return;}
    this.fogUpdateTimer = 0;
  
    // Get player units (limited by maxUnitsPerFrame)
    const playerUnits = [];
    let processedUnits = 0;
  
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (processedUnits >= this.fogOptions.maxUnitsPerFrame) {return;}
    
      if (this.isPlayerEntity(entityId) && 
        this.entityManager.hasComponent(entityId, 'position')) {
      
        const pos = this.entityManager.getComponent(entityId, 'position');
        let sightRadius = this.fogOptions.sightRadius;
      
        // Simplified sight radius calculation
        if (this.entityManager.hasComponent(entityId, 'unitType')) {
          const unitType = this.entityManager.getComponent(entityId, 'unitType').type;
          if (unitType === 'neon_assassin' || unitType === 'sniper') {
            sightRadius *= 1.5;
          }
        }
      
        playerUnits.push({
          position: pos,
          sightRadius: sightRadius
        });
        processedUnits++;
      }
    });
  
    // Update the texture data directly
    const size = this.fogTextureSize;
    const data = this.fogTextureData;
    const gridResolution = 4; // Match grid resolution from initialization
  
    // Fade previously explored areas if not using memory
    if (!this.fogOptions.rememberExplored) {
      const fadeSpeed = 0.9; // How quickly explored areas fade back to fog
      for (let i = 0; i < data.length; i += 4) {
      // Increase alpha (more fog) up to maximum
        if (data[i+3] < 255) {
          data[i+3] = Math.min(255, data[i+3] + Math.floor(fadeSpeed * 255 * deltaTime));
        }
      }
    }
  
    // Reveal areas around units
    for (const unit of playerUnits) {
      const worldX = unit.position.x;
      const worldZ = unit.position.z;
    
      // Convert world coordinates to texture coordinates
      const texX = Math.floor((worldX + this.mapWidth/2) / this.mapWidth * size);
      // Fix: Invert Z-axis for proper mapping to texture Y coordinate
      const texY = Math.floor((this.mapHeight - (worldZ + this.mapHeight/2)) / this.mapHeight * size);
    
      // Calculate sight radius in texture space
      const texRadius = Math.floor(unit.sightRadius / this.mapWidth * size);
    
      // Reveal circle around unit - simplified algorithm
      const radiusSquared = texRadius * texRadius;
    
      // Only process a square region around the unit for efficiency
      const minX = Math.max(0, texX - texRadius);
      const maxX = Math.min(size - 1, texX + texRadius);
      const minY = Math.max(0, texY - texRadius);
      const maxY = Math.min(size - 1, texY + texRadius);
    
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
        // Check if pixel is within circle using distance squared
          const dx = x - texX;
          const dy = y - texY;
          const distSquared = dx * dx + dy * dy;
        
          if (distSquared <= radiusSquared) {
          // Calculate fade based on distance from center
            let alpha;
            if (this.fogOptions.enableAdvancedFog) {
            // Proportional fade based on distance from edge
              const dist = Math.sqrt(distSquared);
              const fade = Math.max(0, 1 - dist / texRadius);
              // Change: Use much lower alpha (more transparent) in direct sight areas
              alpha = Math.floor(255 * (1 - fade * 0.95)); // Almost completely clear at center
            } else {
            // Simple visibility - much faster - make fully visible areas clearer
              alpha = Math.floor(255 * 0.1); // Very low fog in direct sight (10% opacity)
            }
          
            // Set pixel alpha (fog opacity)
            const idx = (y * size + x) * 4 + 3;
            if (idx >= 0 && idx < data.length) {
              data[idx] = Math.min(data[idx], alpha);
            }
          }
        }
      }
    
      // Update explored grid for memory
      if (this.fogOptions.rememberExplored && this.exploredGrid) {
        const gridCenterX = Math.floor((worldX + this.mapWidth/2) * gridResolution);
        // Fix: Invert Z axis for grid coordinates to match canvas
        const gridCenterY = Math.floor((this.mapHeight - (worldZ + this.mapHeight/2)) * gridResolution);
        const gridRadius = Math.ceil(unit.sightRadius * gridResolution);
      
        // Update the explored grid around this unit
        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
          for (let dy = -gridRadius; dy <= gridRadius; dy++) {
          // Check if within circle radius
            if (dx*dx + dy*dy <= gridRadius*gridRadius) {
              const gx = gridCenterX + dx;
              const gy = gridCenterY + dy;
            
              // Ensure we're within grid bounds
              if (gx >= 0 && gx < this.exploredGrid.length && 
                gy >= 0 && gy < this.exploredGrid[0].length) {
                this.exploredGrid[gx][gy] = true;
              }
            }
          }
        }
      }
    }
  
    // Update the texture
    this.fogDataTexture.needsUpdate = true;
  }

  // Create a toggle to switch between standard and optimized modes
  toggleOptimizedFog(enabled = true) {
    if (enabled === this.fogOptions.enableAdvancedFog) {return;}
  
    // Store previous state before changing
    const previousMode = this.fogOptions.enableAdvancedFog;
    this.fogOptions.enableAdvancedFog = enabled;
  
    if (enabled) {
      console.log('Using higher quality fog of war (may impact performance)');
      // Gradual transition to higher quality settings
      this.fogOptions.updateFrequency = 0.15; // Not as aggressive as before
      this.fogOptions.useGradients = true;
      
      // Preserve visibility during transition to advanced mode
      if (this.fogLayer && this.fogLayer.material) {
        // Ensure fog layer is properly visible during transition
        this.fogLayer.material.needsUpdate = true;
      }
    } else {
      console.log('Using optimized fog of war for better performance');
      // More conservative update frequency for better stability
      this.fogOptions.updateFrequency = 0.25;
      this.fogOptions.useGradients = false;
      
      // IMPORTANT: In optimized mode, we still want to see units in explored areas
      // Queue a visibility refresh to happen on next frame
      this._forceVisibilityRefresh = true;
    }
    
    // Reset fog update timer to ensure next update happens properly
    this.fogUpdateTimer = this.fogOptions.updateFrequency;
    
    // Update texture if using WebGL
    if (this.fogDataTexture) {
      this.fogDataTexture.needsUpdate = true;
    }
    
    // Always update entity visibility immediately after a mode switch
    this.updateEntityVisibility();
    
    return true;
  }

  // // Add this method to automatically adjust fog quality based on performance
  // autoAdjustFogQuality() {
  //   // We'll use the game loop's frame count instead of tracking our own
  //   // This provides a more accurate FPS measurement
  //   if (!this._fpsHistory) {
  //     this._fpsHistory = [];
  //     this._lastFpsCheck = Date.now();
  //     this._lastFrameCount = this.gameController ? 
  //       (this.gameController.frameCount || 0) : 0;
  //     this._skipNextCheck = false;
  //     this._lastMode = this.fogOptions.enableAdvancedFog;
      
  //     // Force disable FPS-based automatic adjustment - it's causing more problems than it solves
  //     this._disableAutoAdjust = true;
      
  //     // Set fog to optimized mode by default for more stable performance
  //     if (this.fogOptions.enableAdvancedFog) {
  //       console.log('Setting fog to optimized mode for stable performance');
  //       this.toggleOptimizedFog(false);
  //     }
      
  //     return;
  //   }

  //   // Check if auto-adjustment is disabled
  //   if (this._disableAutoAdjust) {
  //     // Still check if visibility refresh is needed
  //     if (this._forceVisibilityRefresh) {
  //       this.updateEntityVisibility();
  //       this._forceVisibilityRefresh = false;
  //     }
  //     return;
  //   }
  
  //   // Check every 3 seconds instead of every second to reduce fluctuations
  //   const now = Date.now();
  //   const elapsed = now - this._lastFpsCheck;
  
  //   if (elapsed >= 3000) { // 3 seconds for more stable readings
  //     // Get current frame count from game controller if available
  //     const currentFrameCount = this.gameController ? 
  //       (this.gameController.frameCount || 0) : 0;
      
  //     // Calculate frames elapsed
  //     const framesElapsed = Math.max(1, currentFrameCount - this._lastFrameCount);
      
  //     // Calculate frames per second
  //     const fps = Math.round(framesElapsed * 1000 / elapsed);
      
  //     // Store values for next check
  //     this._lastFrameCount = currentFrameCount;
  //     this._lastFpsCheck = now;
      
  //     // Debug output
  //     if (fps < 20) {
  //       console.log(`FPS measurement: ${fps} (${framesElapsed} frames in ${elapsed}ms)`);
  //     }
    
  //     // Skip this check if we recently changed modes (allow system to stabilize)
  //     if (this._skipNextCheck) {
  //       this._skipNextCheck = false;
  //       return;
  //     }
    
  //     // Update history with a minimum FPS of 5 to avoid extreme oscillation
  //     this._fpsHistory.push(Math.min(60, Math.max(5, fps)));
  //     if (this._fpsHistory.length > 3) {
  //       this._fpsHistory.shift();
  //     }
    
  //     // Get average FPS
  //     const avgFps = this._fpsHistory.reduce((sum, val) => sum + val, 0) / this._fpsHistory.length;
    
  //     // Check if we need to force visibility refresh due to a mode switch
  //     if (this._forceVisibilityRefresh) {
  //       // Force update all entity visibility
  //       this.updateEntityVisibility();
  //       this._forceVisibilityRefresh = false;
  //     }
      
  //     // Use much more conservative thresholds - we really only want to optimize
  //     // if performance is truly terrible, not just for minor fluctuations
  //     if (avgFps < 15) { // Very low FPS threshold
  //       // Poor performance - optimize fog
  //       if (this.fogOptions.enableAdvancedFog) {
  //         console.log(`Performance optimization: FPS is ${avgFps.toFixed(1)}, switching to optimized fog of war`);
  //         this.toggleOptimizedFog(false);
          
  //         // Force visibility update for all entities
  //         this.updateEntityVisibility();
          
  //         // Skip the next check
  //         this._skipNextCheck = true;
  //         this._lastMode = false;
  //       }
  //     }
  //     // Only improve quality if FPS is extremely good
  //     else if (avgFps > 50 && !this.fogOptions.enableAdvancedFog && 
  //              this._fpsHistory.length === 3 && this._fpsHistory.every(fps => fps > 45)) {
  //       console.log(`Performance excellent: FPS is ${avgFps.toFixed(1)}, enabling advanced fog effects`);
  //       this.toggleOptimizedFog(true);
        
  //       // Skip the next check
  //       this._skipNextCheck = true;
  //       this._lastMode = true;
  //     }
  //   }
  // }
}
  
export default BaseScenario;