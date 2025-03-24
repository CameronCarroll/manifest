// src/entities/systems/RenderSystem.js - Refactored version
import * as THREE from 'three';
import SelectionIndicator from '../../utils/SelectionIndicator.js';
import HealthVisualizer from '../../utils/HealthVisualizer.js';
import ModelFactory from '../../utils/ModelFactory.js';

export default class RenderSystem {
  constructor(entityManager, sceneManager, modelLoader, systems) {
    this.entityManager = entityManager;
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.systems = systems; // Store the entire systems context
    this.meshes = new Map(); // Maps entityId to THREE.Mesh
    this.selectionIndicator = null;
    this.healthVisualizer = null;
    this.modelFactory = null;
    
    // Debugging
    this.debug = true;
  }

  initialize() {
    const { scene } = this.sceneManager.getActiveScene();
    if (scene) {
      // Pass the entire systems context
      this.selectionIndicator = new SelectionIndicator(scene, this.systems);
      
      // Create health visualizer
      this.healthVisualizer = new HealthVisualizer(scene);
      
      // Initialize model factory with enhanced error handling
      try {
        this.modelFactory = new ModelFactory(scene, this.modelLoader);
        
        // Setup caching for model factory to improve performance
        this.modelFactory.modelCache = new Map();
        
        if (this.debug) {
          console.log('RenderSystem: Model factory initialized successfully with caching');
        }
      } catch (error) {
        console.error('Failed to initialize model factory:', error);
        // Create anyway to prevent null pointer errors
        this.modelFactory = new ModelFactory(scene, this.modelLoader);
      }
      
      if (this.debug) {
        console.log('RenderSystem: Selection indicator, health visualizer, and model factory created');
      }
    } else {
      console.error('RenderSystem: Cannot initialize - no active scene available');
    }
  }

  update(deltaTime) {
    const { scene, camera } = this.sceneManager.getActiveScene();
    if (!scene) {return;}

    // Process entities with both position and render components
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      const hasRender = this.entityManager.hasComponent(entityId, 'render');
      const hasPosition = this.entityManager.hasComponent(entityId, 'position');

      if (hasRender && hasPosition) {
        const renderComponent = this.entityManager.getComponent(entityId, 'render');
        const positionComponent = this.entityManager.getComponent(entityId, 'position');

        // Create mesh if it doesn't exist yet
        if (!this.meshes.has(entityId)) {
          this.createMesh(entityId, renderComponent, scene);
        }

        // Update mesh position and rotation
        const mesh = this.meshes.get(entityId);
        if (mesh) {
          mesh.position.set(positionComponent.x, positionComponent.y, positionComponent.z);
          mesh.rotation.y = positionComponent.rotation;
          mesh.visible = renderComponent.visible;
          
          // Update other properties if they've changed
          if (mesh.scale.x !== renderComponent.scale.x ||
              mesh.scale.y !== renderComponent.scale.y ||
              mesh.scale.z !== renderComponent.scale.z) {
            mesh.scale.set(
              renderComponent.scale.x,
              renderComponent.scale.y,
              renderComponent.scale.z
            );
          }
          
          // Store entityId in mesh userData for raycasting
          mesh.userData.entityId = entityId;
        }

        if (this.selectionIndicator && this.selectionIndicator.selectionRings.has(entityId)) {
          this.selectionIndicator.updateSelectionRingPosition(entityId, positionComponent);
        }
      } else if (this.meshes.has(entityId)) {
        // Remove mesh if the entity no longer has required components
        this.removeMesh(entityId, scene);
      }
    });

    // Process damage events from combat system and update health bars
    if (this.healthVisualizer && this.systems.combat) {
      // Process any new damage events
      if (this.systems.combat.damageEvents && this.systems.combat.damageEvents.length > 0) {
        this.healthVisualizer.processDamageEvents(this.systems.combat.damageEvents);
      }
      
      // Get active scenario reference for fog of war check
      let activeScenario = null;
      if (this.entityManager && this.entityManager.gameState && this.entityManager.gameState.activeScenario) {
        activeScenario = this.entityManager.gameState.activeScenario;
      }
      
      // Update health visualizations with scenario reference for fog of war
      this.healthVisualizer.update(deltaTime, this.entityManager, camera, activeScenario);
    }

    if (this.selectionIndicator) {
      this.selectionIndicator.updateTargetIndicators(deltaTime);
    }
    
    // Update animations if animation system exists
    if (this.systems.animation && this.systems.animation.animationFactory) {
      this.systems.animation.animationFactory.update(deltaTime);
    }
  }

  createMesh(entityId, renderComponent, scene) {
    let mesh;
    
    // Check if the model factory is available
    if (!this.modelFactory) {
      console.error('RenderSystem: Model factory not initialized, cannot create mesh for entity', entityId);
      return;
    }
    
    try {
      // Determine entity type and use appropriate factory method
      if (renderComponent.meshId === 'unit') {
        // Get faction and unit type data
        const factionComponent = this.entityManager.getComponent(entityId, 'faction');
        const faction = factionComponent ? factionComponent.faction : 'player';
        
        // Use unit type component (no fallback needed since we're not supporting backward compatibility)
        let unitType = 'basic';
        if (this.entityManager.hasComponent(entityId, 'unitType')) {
          unitType = this.entityManager.getComponent(entityId, 'unitType').type;
        }
        
        // Create unit mesh using factory
        const cacheKey = `unit_${unitType}_${faction}`;
        
        // Check cache first
        if (this.modelFactory.modelCache.has(cacheKey)) {
          // Clone from cache to improve performance
          const cachedModel = this.modelFactory.modelCache.get(cacheKey);
          mesh = cachedModel.clone();
          if (this.debug) {
            console.log(`Using cached model for ${unitType}`);
          }
        } else {
          // Create new model and cache it
          mesh = this.modelFactory.createUnitModel(entityId, renderComponent, unitType, faction);
          this.modelFactory.modelCache.set(cacheKey, mesh.clone());
        }
        
        // Register for animation if animation system exists
        if (this.systems.animation && this.systems.animation.animationFactory) {
          this.systems.animation.animationFactory.registerEntityForAnimation(entityId, mesh, unitType);
        }
      }
      else if (renderComponent.meshId === 'building') {
        // Get faction data
        const factionComponent = this.entityManager.getComponent(entityId, 'faction');
        const faction = factionComponent ? factionComponent.faction : 'player';
        
        // Get building type from component
        let buildingType = 'command_center';
        if (this.entityManager.hasComponent(entityId, 'buildingType')) {
          buildingType = this.entityManager.getComponent(entityId, 'buildingType').type;
        }
        
        // Create building mesh using factory (with caching)
        const cacheKey = `building_${buildingType}_${faction}`;
        
        // Check cache first
        if (this.modelFactory.modelCache.has(cacheKey)) {
          mesh = this.modelFactory.modelCache.get(cacheKey).clone();
        } else {
          mesh = this.modelFactory.createBuildingModel(entityId, renderComponent, buildingType, faction);
          this.modelFactory.modelCache.set(cacheKey, mesh.clone());
        }
        
        // Register for animation if animation system exists
        if (this.systems.animation && this.systems.animation.animationFactory) {
          this.systems.animation.animationFactory.registerEntityForAnimation(entityId, mesh, buildingType);
        }
      }
      else if (renderComponent.meshId === 'resource') {
        // Get resource type
        const resourceComponent = this.entityManager.getComponent(entityId, 'resource');
        const resourceType = resourceComponent ? resourceComponent.type : 'basic';
        
        // Use caching for resources too
        const cacheKey = `resource_${resourceType}`;
        
        if (this.modelFactory.modelCache.has(cacheKey)) {
          mesh = this.modelFactory.modelCache.get(cacheKey).clone();
        } else {
          mesh = this.modelFactory.createResourceModel(entityId, renderComponent, resourceType);
          this.modelFactory.modelCache.set(cacheKey, mesh.clone());
        }
      }
      else if (renderComponent.meshId === 'terrain') {
        // Get terrain object type
        const terrainType = renderComponent.terrainType || 'rock';
        
        // Create terrain object mesh using factory (with caching)
        const cacheKey = `terrain_${terrainType}`;
        
        if (this.modelFactory.modelCache.has(cacheKey)) {
          mesh = this.modelFactory.modelCache.get(cacheKey).clone();
        } else {
          mesh = this.modelFactory.createTerrainObjectModel(entityId, renderComponent, terrainType);
          this.modelFactory.modelCache.set(cacheKey, mesh.clone());
        }
      }
      else {
        // Default fallback for any other mesh types
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshPhongMaterial({ 
          color: renderComponent.color || 0xffffff,
          opacity: renderComponent.opacity || 1,
          transparent: (renderComponent.opacity && renderComponent.opacity < 1)
        });
        mesh = new THREE.Mesh(geometry, material);
      }
    } catch (error) {
      console.error('RenderSystem: Error creating mesh for entity', entityId, error);
      // Create a simple placeholder mesh as fallback
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0xff0000, // Red color to indicate error
        opacity: renderComponent.opacity || 1,
        transparent: (renderComponent.opacity && renderComponent.opacity < 1)
      });
      mesh = new THREE.Mesh(geometry, material);
    }
    
    // Apply scale from render component
    if (mesh) {
      if (renderComponent.scale) {
        mesh.scale.set(
          renderComponent.scale.x,
          renderComponent.scale.y,
          renderComponent.scale.z
        );
      }
      
      // Store entity ID in mesh userData
      mesh.userData.entityId = entityId;
      
      // Add to scene and store in meshes map
      scene.add(mesh);
      this.meshes.set(entityId, mesh);
    }
  }

  removeMesh(entityId, scene) {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      scene.remove(mesh);
      
      // Clean up any animations
      if (this.systems.animation && this.systems.animation.animationFactory) {
        this.systems.animation.animationFactory.removeEntityFromAnimation(entityId);
      }
      
      // Dispose of geometries and materials
      if (mesh.geometry) {mesh.geometry.dispose();}
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
      
      this.meshes.delete(entityId);
    }
    
    // Remove selection indicators if they exist
    if (this.selectionIndicator) {
      this.selectionIndicator.removeSelectionRing(entityId);
    }
  }
}
