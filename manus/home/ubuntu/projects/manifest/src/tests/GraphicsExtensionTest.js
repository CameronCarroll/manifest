// src/tests/GraphicsExtensionTest.js
import * as THREE from 'three';
import ModelFactory from '../utils/ModelFactory.js';
import AnimationFactory from '../utils/AnimationFactory.js';
import TerrainFactory from '../utils/TerrainFactory.js';
import MapGenerator from '../utils/MapGenerator.js';

/**
 * GraphicsExtensionTest - Test suite for the new graphics extensions
 * This file contains tests for the new models, animations, and procedural generation
 */
class GraphicsExtensionTest {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.clock = new THREE.Clock();
    this.testObjects = [];
    this.testResults = {
      models: { passed: 0, failed: 0 },
      animations: { passed: 0, failed: 0 },
      terrain: { passed: 0, failed: 0 },
      mapGeneration: { passed: 0, failed: 0 }
    };
    
    // Initialize factories
    this.modelLoader = new THREE.TextureLoader(); // Placeholder for actual ModelLoader
    this.modelFactory = new ModelFactory(scene, this.modelLoader);
    this.animationFactory = new AnimationFactory(scene);
    this.terrainFactory = new TerrainFactory(scene, this.modelLoader);
    this.mapGenerator = new MapGenerator(scene, this.terrainFactory);
    
    console.log('GraphicsExtensionTest: Initialized test suite');
  }
  
  // Run all tests
  async runAllTests() {
    console.log('GraphicsExtensionTest: Running all tests');
    
    // Clear scene
    this.clearTestObjects();
    
    // Run tests
    await this.testUnitModels();
    await this.testBuildingModels();
    await this.testAnimations();
    await this.testTerrainTextures();
    await this.testEnvironmentalObjects();
    await this.testProceduralMapGeneration();
    
    // Report results
    this.reportResults();
    
    return this.testResults;
  }
  
  // Clear test objects from scene
  clearTestObjects() {
    this.testObjects.forEach(object => {
      if (object && object.parent) {
        object.parent.remove(object);
      }
    });
    
    this.testObjects = [];
  }
  
  // Test unit models
  async testUnitModels() {
    console.log('GraphicsExtensionTest: Testing unit models');
    
    // Clear previous test objects
    this.clearTestObjects();
    
    // Unit types to test
    const unitTypes = [
      'techno_shaman',
      'solar_knight',
      'neon_assassin',
      'biohacker',
      'scrap_golem',
      'eco_drone',
      'basic',
      'assault',
      'support',
      'sniper',
      'tank',
      'worker'
    ];
    
    // Test each unit type
    let xPos = -15;
    for (const unitType of unitTypes) {
      try {
        // Create render component
        const renderComponent = {
          meshId: 'unit',
          color: 0xffffff,
          opacity: 1,
          scale: { x: 1, y: 1, z: 1 },
          visible: true
        };
        
        // Create unit model
        const unitModel = this.modelFactory.createUnitModel('test', renderComponent, unitType, 'player');
        
        // Position model
        unitModel.position.set(xPos, 0, 0);
        
        // Add to scene
        this.scene.add(unitModel);
        this.testObjects.push(unitModel);
        
        // Register for animation
        this.animationFactory.registerEntityForAnimation('test_' + unitType, unitModel, unitType);
        
        // Increment position for next model
        xPos += 3;
        
        // Test passed
        this.testResults.models.passed++;
        console.log(`GraphicsExtensionTest: Unit model '${unitType}' created successfully`);
      } catch (error) {
        // Test failed
        this.testResults.models.failed++;
        console.error(`GraphicsExtensionTest: Failed to create unit model '${unitType}':`, error);
      }
    }
  }
  
  // Test building models
  async testBuildingModels() {
    console.log('GraphicsExtensionTest: Testing building models');
    
    // Clear previous test objects
    this.clearTestObjects();
    
    // Building types to test
    const buildingTypes = [
      'arcane_reactor',
      'reclaimed_sanctuary',
      'bioforge',
      'mana_well',
      'scavenger_outpost',
      'harmonic_tower',
      'command_center'
    ];
    
    // Test each building type
    let xPos = -15;
    for (const buildingType of buildingTypes) {
      try {
        // Create render component
        const renderComponent = {
          meshId: 'building',
          color: 0xffffff,
          opacity: 1,
          scale: { x: 1, y: 1, z: 1 },
          visible: true
        };
        
        // Create building model
        const buildingModel = this.modelFactory.createBuildingModel('test', renderComponent, buildingType, 'player');
        
        // Position model
        buildingModel.position.set(xPos, 0, 0);
        
        // Add to scene
        this.scene.add(buildingModel);
        this.testObjects.push(buildingModel);
        
        // Register for animation
        this.animationFactory.registerEntityForAnimation('test_' + buildingType, buildingModel, buildingType);
        
        // Increment position for next model
        xPos += 5;
        
        // Test passed
        this.testResults.models.passed++;
        console.log(`GraphicsExtensionTest: Building model '${buildingType}' created successfully`);
      } catch (error) {
        // Test failed
        this.testResults.models.failed++;
        console.error(`GraphicsExtensionTest: Failed to create building model '${buildingType}':`, error);
      }
    }
  }
  
  // Test animations
  async testAnimations() {
    console.log('GraphicsExtensionTest: Testing animations');
    
    // Clear previous test objects
    this.clearTestObjects();
    
    // Create test models with animations
    const testModels = [
      { type: 'techno_shaman', entityId: 'test_shaman', position: { x: -6, y: 0, z: 0 } },
      { type: 'solar_knight', entityId: 'test_knight', position: { x: -3, y: 0, z: 0 } },
      { type: 'neon_assassin', entityId: 'test_assassin', position: { x: 0, y: 0, z: 0 } },
      { type: 'arcane_reactor', entityId: 'test_reactor', position: { x: 3, y: 0, z: 0 } },
      { type: 'floating_crystal', entityId: 'test_crystal', position: { x: 6, y: 0, z: 0 } }
    ];
    
    for (const model of testModels) {
      try {
        let testObject;
        
        // Create appropriate model
        if (['techno_shaman', 'solar_knight', 'neon_assassin'].includes(model.type)) {
          // Unit model
          const renderComponent = {
            meshId: 'unit',
            color: 0xffffff,
            opacity: 1,
            scale: { x: 1, y: 1, z: 1 },
            visible: true
          };
          
          testObject = this.modelFactory.createUnitModel(model.entityId, renderComponent, model.type, 'player');
        } else if (['arcane_reactor'].includes(model.type)) {
          // Building model
          const renderComponent = {
            meshId: 'building',
            color: 0xffffff,
            opacity: 1,
            scale: { x: 1, y: 1, z: 1 },
            visible: true
          };
          
          testObject = this.modelFactory.createBuildingModel(model.entityId, renderComponent, model.type, 'player');
        } else if (['floating_crystal'].includes(model.type)) {
          // Environmental object
          testObject = this.terrainFactory.createEnvironmentalObject(model.type);
        }
        
        if (testObject) {
          // Position model
          testObject.position.set(model.position.x, model.position.y, model.position.z);
          
          // Add to scene
          this.scene.add(testObject);
          this.testObjects.push(testObject);
          
          // Register for animation
          if (['techno_shaman', 'solar_knight', 'neon_assassin', 'arcane_reactor'].includes(model.type)) {
            this.animationFactory.registerEntityForAnimation(model.entityId, testObject, model.type);
          }
          
          // Test passed
          this.testResults.animations.passed++;
          console.log(`GraphicsExtensionTest: Animation for '${model.type}' set up successfully`);
        }
      } catch (error) {
        // Test failed
        this.testResults.animations.failed++;
        console.error(`GraphicsExtensionTest: Failed to set up animation for '${model.type}':`, error);
      }
    }
    
    // Test animation updates
    try {
      // Simulate animation updates
      const deltaTime = 0.1;
      this.animationFactory.update(deltaTime);
      
      // Test passed
      this.testResults.animations.passed++;
      console.log('GraphicsExtensionTest: Animation update successful');
    } catch (error) {
      // Test failed
      this.testResults.animations.failed++;
      console.error('GraphicsExtensionTest: Animation update failed:', error);
    }
  }
  
  // Test terrain textures
  async testTerrainTextures() {
    console.log('GraphicsExtensionTest: Testing terrain textures');
    
    // Clear previous test objects
    this.clearTestObjects();
    
    // Terrain types to test
    const terrainTypes = [
      'reclaimed_urban',
      'techno_organic_forest',
      'crystal_wastes',
      'nanite_swamps',
      'solar_fields'
    ];
    
    // Test each terrain type
    let zPos = -10;
    for (const terrainType of terrainTypes) {
      try {
        // Create terrain mesh
        const terrainMesh = await this.terrainFactory.createTerrainMesh(
          terrainType,
          10, // width
          10, // height
          10, // widthSegments
          10  // heightSegments
        );
        
        // Position terrain
        terrainMesh.position.set(0, 0, zPos);
        
        // Add to scene
        this.scene.add(terrainMesh);
        this.testObjects.push(terrainMesh);
        
        // Increment position for next terrain
        zPos += 12;
        
        // Test passed
        this.testResults.terrain.passed++;
        console.log(`GraphicsExtensionTest: Terrain texture '${terrainType}' created successfully`);
      } catch (error) {
        // Test failed
        this.testResults.terrain.failed++;
        console.error(`GraphicsExtensionTest: Failed to create terrain texture '${terrainType}':`, error);
      }
    }
  }
  
  // Test environmental objects
  async testEnvironmentalObjects() {
    console.log('GraphicsExtensionTest: Testing environmental objects');
    
    // Clear previous test objects
    this.clearTestObjects();
    
    // Object types to test
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
    
    // Test each object type
    let xPos = -15;
    for (const objectType of objectTypes) {
      try {
        // Create environmental object
        const environmentalObject = this.terrainFactory.createEnvironmentalObject(
          objectType,
          { x: xPos, y: 0, z: 0 }
        );
        
        // Add to scene
        this.scene.add(environmentalObject);
        this.testObjects.push(environmentalObject);
        
        // Increment position for next object
        xPos += 5;
        
        // Test passed
        this.testResults.terrain.passed++;
        console.log(`GraphicsExtensionTest: Environmental object '${objectType}' created successfully`);
      } catch (error) {
        // Test failed
        this.testResults.terrain.failed++;
        console.error(`GraphicsExtensionTest: Failed to create environmental object '${objectType}':`, error);
      }
    }
  }
  
  // Test procedural map generation
  async testProceduralMapGeneration() {
    console.log('GraphicsExtensionTest: Testing procedural map generation');
    
    // Clear previous test objects
    this.clearTestObjects();
    
    // Test map generation with different biomes
    const biomeTypes = [
      'reclaimed_urban',
      'techno_organic_forest',
      'crystal_wastes',
      'nanite_swamps',
      'solar_fields',
      'mixed'
    ];
    
    // Test small map generation for each biome
    for (const biomeType of biomeTypes) {
      try {
        // Clear previous map
        this.clearTestObjects();
        
        // Generate map
        const mapOptions = {
          width: 50,
          height: 50,
          biomeType: biomeType,
          objectDensity: 0.3,
          resourceDensity: 0.2,
          elevation: 0.5,
          seed: Math.random() * 10000 | 0
        };
        
        const mapResult = await this.mapGenerator.generateMap(mapOptions);
        
        // Add map objects to test objects for cleanup
        if (mapResult.terrain) {
          this.testObjects.push(mapResult.terrain);
        }
        
        if (mapResult.objects) {
          this.testObjects.push(...mapResult.objects);
        }
        
        // Test passed
        this.testResults.mapGeneration.passed++;
        console.log(`GraphicsExtensionTest: Map generation for biome '${biomeType}' successful`);
      } catch (error) {
        // Test failed
        this.testResults.mapGeneration.failed++;
        console.error(`GraphicsExtensionTest: Map generation for biome '${biomeType}' failed:`, error);
      }
    }
  }
  
  // Report test results
  reportResults() {
    console.log('GraphicsExtensionTest: Test Results');
    console.log('----------------------------------');
    console.log(`Models: ${this.testResults.models.passed} passed, ${this.testResults.models.failed} failed`);
    console.log(`Animations: ${this.testResults.animations.passed} passed, ${this.testResults.animations.failed} failed`);
    console.log(`Terrain: ${this.testResults.terrain.passed} passed, ${this.testResults.terrain.failed} failed`);
    console.log(`Map Generation: ${this.testResults.mapGeneration.passed} passed, ${this.testResults.mapGeneration.failed} failed`);
    console.log('----------------------------------');
    
    const totalPassed = this.testResults.models.passed + 
                        this.testResults.animations.passed + 
                        this.testResults.terrain.passed + 
                        this.testResults.mapGeneration.passed;
    
    const totalFailed = this.testResults.models.failed + 
                        this.testResults.animations.failed + 
                        this.testResults.terrain.failed + 
                        this.testResults.mapGeneration.failed;
    
    console.log(`Total: ${totalPassed} passed, ${totalFailed} failed`);
    
    if (totalFailed === 0) {
      console.log('All tests passed successfully!');
    } else {
      console.log('Some tests failed. Check the logs for details.');
    }
  }
  
  // Update animations for test objects
  update() {
    const deltaTime = this.clock.getDelta();
    
    // Update animation factory
    if (this.animationFactory) {
      this.animationFactory.update(deltaTime);
    }
    
    // Update terrain factory animations
    if (this.terrainFactory) {
      this.terrainFactory.updateAnimations?.(deltaTime);
    }
  }
}

export default GraphicsExtensionTest;
