// src/utils/MapGenerator.js
import * as THREE from 'three';

/**
 * MapGenerator - Creates procedurally generated maps using terrain and environmental objects
 */
class MapGenerator {
  constructor(scene, terrainFactory) {
    this.scene = scene;
    this.terrainFactory = terrainFactory;
    this.debug = false;
    this.mapObjects = [];
  }

  // Generate a complete map with terrain and objects
  async generateMap(options = {}) {
    // Default options
    const defaultOptions = {
      width: 100,
      height: 100,
      biomeType: 'mixed', // mixed, reclaimed_urban, techno_organic_forest, crystal_wastes, nanite_swamps, solar_fields
      objectDensity: 0.5, // 0.0 to 1.0
      resourceDensity: 0.3, // 0.0 to 1.0
      elevation: 0.5, // 0.0 to 1.0 (affects terrain height variation)
      seed: Math.random() * 10000 | 0 // Random seed for generation
    };

    // Merge with provided options
    const mapOptions = { ...defaultOptions, ...options };
    
    if (this.debug) {
      console.log(`MapGenerator: Generating map with options:`, mapOptions);
    }

    // Clear any existing map objects
    this.clearMap();

    // Generate terrain
    const terrain = await this.generateTerrain(mapOptions);
    this.mapObjects.push(terrain);

    // Generate heightmap for object placement
    const heightmap = this.generateHeightmap(mapOptions);

    // Place environmental objects
    this.placeEnvironmentalObjects(mapOptions, heightmap);

    // Place resources
    this.placeResources(mapOptions, heightmap);

    // Place landmarks
    this.placeLandmarks(mapOptions, heightmap);

    // Generate paths between landmarks
    this.generatePaths(mapOptions, heightmap);

    return {
      terrain,
      heightmap,
      objects: this.mapObjects,
      bounds: {
        width: mapOptions.width,
        height: mapOptions.height
      }
    };
  }

  // Clear all map objects
  clearMap() {
    // Remove all objects from scene
    this.mapObjects.forEach(object => {
      if (object && object.parent) {
        object.parent.remove(object);
      }
    });

    this.mapObjects = [];
  }

  // Generate terrain mesh
  async generateTerrain(options) {
    // Determine terrain type based on biome
    let terrainType;
    
    if (options.biomeType === 'mixed') {
      // For mixed biome, choose a random terrain type
      const terrainTypes = [
        'reclaimed_urban',
        'techno_organic_forest',
        'crystal_wastes',
        'nanite_swamps',
        'solar_fields'
      ];
      terrainType = terrainTypes[Math.floor(Math.random() * terrainTypes.length)];
    } else {
      terrainType = options.biomeType;
    }

    // Create terrain mesh
    const terrain = await this.terrainFactory.createTerrainMesh(
      terrainType,
      options.width,
      options.height,
      Math.max(20, Math.floor(options.width / 5)), // Width segments
      Math.max(20, Math.floor(options.height / 5)) // Height segments
    );

    // Apply heightmap to terrain
    this.applyHeightmapToTerrain(terrain, options);

    // Add to scene
    this.scene.add(terrain);
    return terrain;
  }

  // Generate a heightmap for the terrain
  generateHeightmap(options) {
    const widthSegments = Math.max(20, Math.floor(options.width / 5));
    const heightSegments = Math.max(20, Math.floor(options.height / 5));
    
    // Create heightmap array
    const heightmap = new Array(widthSegments + 1);
    for (let i = 0; i <= widthSegments; i++) {
      heightmap[i] = new Array(heightSegments + 1);
      for (let j = 0; j <= heightSegments; j++) {
        heightmap[i][j] = 0;
      }
    }

    // Use simplex noise to generate heightmap
    // For simplicity, we'll use a simple algorithm here
    // In a real implementation, you'd want to use a proper noise library
    
    // Generate several layers of noise
    const layers = 4;
    const persistence = 0.5;
    
    for (let layer = 0; layer < layers; layer++) {
      const frequency = Math.pow(2, layer);
      const amplitude = Math.pow(persistence, layer) * options.elevation;
      
      for (let i = 0; i <= widthSegments; i++) {
        for (let j = 0; j <= heightSegments; j++) {
          // Simple noise function (would be replaced with proper simplex noise)
          const noise = this.simpleNoise(
            i / widthSegments * frequency + options.seed,
            j / heightSegments * frequency + options.seed
          );
          
          heightmap[i][j] += noise * amplitude;
        }
      }
    }
    
    // Normalize heightmap values to 0-1 range
    let min = Number.MAX_VALUE;
    let max = Number.MIN_VALUE;
    
    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= heightSegments; j++) {
        min = Math.min(min, heightmap[i][j]);
        max = Math.max(max, heightmap[i][j]);
      }
    }
    
    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= heightSegments; j++) {
        heightmap[i][j] = (heightmap[i][j] - min) / (max - min);
      }
    }
    
    return heightmap;
  }

  // Simple noise function (placeholder for proper simplex noise)
  simpleNoise(x, y) {
    // Simple noise function based on sine waves
    return Math.sin(x * 12.9898 + y * 78.233) * 0.5 + 0.5;
  }

  // Apply heightmap to terrain geometry
  applyHeightmapToTerrain(terrain, options) {
    const geometry = terrain.geometry;
    const positionAttribute = geometry.getAttribute('position');
    const heightmap = this.generateHeightmap(options);
    
    const widthSegments = Math.max(20, Math.floor(options.width / 5));
    const heightSegments = Math.max(20, Math.floor(options.height / 5));
    
    // Apply heightmap to vertices
    for (let i = 0; i <= widthSegments; i++) {
      for (let j = 0; j <= heightSegments; j++) {
        const index = j * (widthSegments + 1) + i;
        
        // Get height from heightmap
        const height = heightmap[i][j] * 5; // Scale height
        
        // Update vertex position
        positionAttribute.setY(index, height);
      }
    }
    
    // Update geometry
    positionAttribute.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  // Place environmental objects on the terrain
  placeEnvironmentalObjects(options, heightmap) {
    const objectTypes = [
      'server_monolith',
      'floating_crystal',
      'corrupted_machinery',
      'circuit_tree',
      'holographic_ruin',
      'energy_geyser',
      'rock',
      'hill'
    ];
    
    // Determine number of objects based on map size and density
    const mapArea = options.width * options.height;
    const objectCount = Math.floor(mapArea * 0.01 * options.objectDensity);
    
    if (this.debug) {
      console.log(`MapGenerator: Placing ${objectCount} environmental objects`);
    }
    
    // Place objects
    for (let i = 0; i < objectCount; i++) {
      // Choose random object type with weighted probability
      const objectType = this.chooseObjectType(objectTypes, options.biomeType);
      
      // Choose random position
      const x = Math.random() * options.width - options.width / 2;
      const z = Math.random() * options.height - options.height / 2;
      
      // Get height at position
      const height = this.getHeightAtPosition(x, z, options, heightmap);
      
      // Create object
      const object = this.terrainFactory.createEnvironmentalObject(objectType, {
        x: x,
        y: height,
        z: z
      });
      
      // Add to scene
      this.scene.add(object);
      this.mapObjects.push(object);
    }
  }

  // Choose object type with weighted probability based on biome
  chooseObjectType(objectTypes, biomeType) {
    // Define weights for each biome
    const weights = {
      reclaimed_urban: {
        server_monolith: 0.2,
        floating_crystal: 0.05,
        corrupted_machinery: 0.2,
        circuit_tree: 0.1,
        holographic_ruin: 0.2,
        energy_geyser: 0.05,
        rock: 0.1,
        hill: 0.1
      },
      techno_organic_forest: {
        server_monolith: 0.05,
        floating_crystal: 0.1,
        corrupted_machinery: 0.1,
        circuit_tree: 0.3,
        holographic_ruin: 0.05,
        energy_geyser: 0.1,
        rock: 0.2,
        hill: 0.1
      },
      crystal_wastes: {
        server_monolith: 0.05,
        floating_crystal: 0.3,
        corrupted_machinery: 0.1,
        circuit_tree: 0.05,
        holographic_ruin: 0.1,
        energy_geyser: 0.2,
        rock: 0.15,
        hill: 0.05
      },
      nanite_swamps: {
        server_monolith: 0.1,
        floating_crystal: 0.1,
        corrupted_machinery: 0.2,
        circuit_tree: 0.15,
        holographic_ruin: 0.05,
        energy_geyser: 0.2,
        rock: 0.1,
        hill: 0.1
      },
      solar_fields: {
        server_monolith: 0.1,
        floating_crystal: 0.1,
        corrupted_machinery: 0.1,
        circuit_tree: 0.1,
        holographic_ruin: 0.1,
        energy_geyser: 0.1,
        rock: 0.2,
        hill: 0.2
      },
      mixed: {
        server_monolith: 0.125,
        floating_crystal: 0.125,
        corrupted_machinery: 0.125,
        circuit_tree: 0.125,
        holographic_ruin: 0.125,
        energy_geyser: 0.125,
        rock: 0.125,
        hill: 0.125
      }
    };
    
    // Get weights for current biome
    const biomeWeights = weights[biomeType] || weights.mixed;
    
    // Calculate cumulative weights
    const cumulativeWeights = [];
    let cumulativeWeight = 0;
    
    for (const type of objectTypes) {
      cumulativeWeight += biomeWeights[type] || 0.1; // Default weight if not specified
      cumulativeWeights.push({ type, weight: cumulativeWeight });
    }
    
    // Choose random object based on weights
    const random = Math.random() * cumulativeWeight;
    
    for (const { type, weight } of cumulativeWeights) {
      if (random <= weight) {
        return type;
      }
    }
    
    // Fallback
    return objectTypes[Math.floor(Math.random() * objectTypes.length)];
  }

  // Get height at position
  getHeightAtPosition(x, z, options, heightmap) {
    // Convert world position to heightmap indices
    const widthSegments = Math.max(20, Math.floor(options.width / 5));
    const heightSegments = Math.max(20, Math.floor(options.height / 5));
    
    const i = Math.floor((x + options.width / 2) / options.width * widthSegments);
    const j = Math.floor((z + options.height / 2) / options.height * heightSegments);
    
    // Clamp indices to valid range
    const clampedI = Math.max(0, Math.min(widthSegments, i));
    const clampedJ = Math.max(0, Math.min(heightSegments, j));
    
    // Get height from heightmap
    return heightmap[clampedI][clampedJ] * 5; // Scale height
  }

  // Place resources on the terrain
  placeResources(options, heightmap) {
    const resourceTypes = ['crystal', 'gas', 'biomass', 'tech'];
    
    // Determine number of resources based on map size and density
    const mapArea = options.width * options.height;
    const resourceCount = Math.floor(mapArea * 0.005 * options.resourceDensity);
    
    if (this.debug) {
      console.log(`MapGenerator: Placing ${resourceCount} resources`);
    }
    
    // Create resource clusters
    const clusterCount = Math.floor(resourceCount / 5) + 1;
    const clustersPerType = Math.max(1, Math.floor(clusterCount / resourceTypes.length));
    
    for (let typeIndex = 0; typeIndex < resourceTypes.length; typeIndex++) {
      const resourceType = resourceTypes[typeIndex];
      
      for (let cluster = 0; cluster < clustersPerType; cluster++) {
        // Choose random cluster center
        const centerX = Math.random() * options.width - options.width / 2;
        const centerZ = Math.random() * options.height - options.height / 2;
        
        // Place resources in cluster
        const resourcesInCluster = Math.floor(Math.random() * 3) + 3; // 3-5 resources per cluster
        
        for (let i = 0; i < resourcesInCluster; i++) {
          // Random position near cluster center
          const angle = Math.random() * Math.PI * 2;
          const distance = Math.random() * 5 + 2; // 2-7 units from center
          
          const x = centerX + Math.sin(angle) * distance;
          const z = centerZ + Math.cos(angle) * distance;
          
          // Check if position is within map bounds
          if (x < -options.width / 2 || x > options.width / 2 ||
              z < -options.height / 2 || z > options.height / 2) {
            continue;
          }
          
          // Get height at position
          const height = this.getHeightAtPosition(x, z, options, heightmap);
          
          // Create resource entity
          this.createResourceEntity(resourceType, { x, y: height, z });
        }
      }
    }
  }

  // Create a resource entity
  createResourceEntity(resourceType, position) {
    // In a real implementation, this would create an entity with resource component
    if (this.debug) {
      console.log(`MapGenerator: Creating ${resourceType} resource at (${position.x}, ${position.y}, ${position.z})`);
    }
    
    // Create visual representation
    const resourceObject = this.terrainFactory.createResourceModel(null, {
      color: this.getResourceColor(resourceType),
      opacity: 1
    }, resourceType);
    
    resourceObject.position.set(position.x, position.y, position.z);
    
    // Add to scene
    this.scene.add(resourceObject);
    this.mapObjects.push(resourceObject);
    
    return resourceObject;
  }

  // Get color for resource type
  getResourceColor(resourceType) {
    switch (resourceType) {
      case 'crystal': return 0x88aaff;
      case 'gas': return 0x00ffaa;
      case 'biomass': return 0x66aa33;
      case 'tech': return 0xff6600;
      default: return 0xffffff;
    }
  }

  // Place landmark objects on the terrain
  placeLandmarks(options, heightmap) {
    // Landmarks are special objects placed at strategic locations
    const landmarkCount = Math.floor(Math.sqrt(options.width * options.height) / 10);
    
    if (this.debug) {
      console.log(`MapGenerator: Placing ${landmarkCount} landmarks`);
    }
    
    // Place landmarks at elevated positions
    const landmarks = [];
    
    // Find highest points in heightmap
    const highPoints = this.findHighPoints(heightmap, options, landmarkCount * 2);
    
    // Place landmarks at some of the high points
    for (let i = 0; i < Math.min(landmarkCount, highPoints.length); i++) {
      const point = highPoints[i];
      
      // Convert heightmap indices to world position
      const x = (point.i / heightmap.length) * options.width - options.width / 2;
      const z = (point.j / heightmap[0].length) * options.height - options.height / 2;
      const y = point.height * 5; // Scale height
      
      // Choose landmark type
      const landmarkType = this.chooseLandmarkType(options.biomeType);
      
      // Create landmark
      const landmark = this.terrainFactory.createEnvironmentalObject(landmarkType, { x, y, z });
      
      // Scale up landmark
      landmark.scale.multiplyScalar(1.5);
      
      // Add to scene
      this.scene.add(landmark);
      this.mapObjects.push(landmark);
      landmarks.push({ position: { x, y, z }, object: landmark });
    }
    
    return landmarks;
  }

  // Find highest points in heightmap
  findHighPoints(heightmap, options, count) {
    const points = [];
    
    // Collect all points with height and position
    for (let i = 0; i < heightmap.length; i++) {
      for (let j = 0; j < heightmap[i].length; j++) {
        points.push({
          i, j,
          height: heightmap[i][j]
        });
      }
    }
    
    // Sort by height (descending)
    points.sort((a, b) => b.height - a.height);
    
    // Filter points to ensure minimum distance between them
    const filteredPoints = [];
    const minDistance = Math.min(heightmap.length, heightmap[0].length) / Math.sqrt(count) / 2;
    
    for (const point of points) {
      // Check if point is far enough from all filtered points
      let isFarEnough = true;
      
      for (const filteredPoint of filteredPoints) {
        const distance = Math.sqrt(
          Math.pow(point.i - filteredPoint.i, 2) +
          Math.pow(point.j - filteredPoint.j, 2)
        );
        
        if (distance < minDistance) {
          isFarEnough = false;
          break;
        }
      }
      
      if (isFarEnough) {
        filteredPoints.push(point);
        
        if (filteredPoints.length >= count) {
          break;
        }
      }
    }
    
    return filteredPoints;
  }

  // Choose landmark type based on biome
  chooseLandmarkType(biomeType) {
    // Define landmark types for each biome
    const landmarkTypes = {
      reclaimed_urban: ['server_monolith', 'holographic_ruin'],
      techno_organic_forest: ['circuit_tree', 'floating_crystal'],
      crystal_wastes: ['floating_crystal', 'energy_geyser'],
      nanite_swamps: ['corrupted_machinery', 'energy_geyser'],
      solar_fields: ['server_monolith', 'circuit_tree'],
      mixed: ['server_monolith', 'floating_crystal', 'corrupted_machinery', 'circuit_tree', 'holographic_ruin', 'energy_geyser']
    };
    
    // Get landmark types for current biome
    const types = landmarkTypes[biomeType] || landmarkTypes.mixed;
    
    // Choose random type
    return types[Math.floor(Math.random() * types.length)];
  }

  // Generate paths between landmarks
  generatePaths(options, heightmap) {
    // In a real implementation, this would generate paths between landmarks
    // For now, we'll just log that paths would be generated
    if (this.debug) {
      console.log(`MapGenerator: Generating paths between landmarks`);
    }
  }
}

export default MapGenerator;
