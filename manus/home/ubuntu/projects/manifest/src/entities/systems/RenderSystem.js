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
      
      // Initialize model factory
      this.modelFactory = new ModelFactory(scene, this.modelLoader);
      
      if (this.debug) {
        console.log('RenderSystem: Selection indicator, health visualizer, and model factory created');
      }
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
      
      // Update health visualizations
      this.healthVisualizer.update(deltaTime, this.entityManager, camera);
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
    
    // Determine entity type and use appropriate factory method
    if (renderComponent.meshId === 'unit') {
      // Get faction and unit type data
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      const faction = factionComponent ? factionComponent.faction : 'player';
      
      // Check for unit type component first
      let unitType = 'basic';
      if (this.entityManager.hasComponent(entityId, 'unitType')) {
        unitType = this.entityManager.getComponent(entityId, 'unitType').type;
      } else if (factionComponent) {
        // Fall back to faction component unitType for backward compatibility
        unitType = factionComponent.unitType || 'basic';
      }
      
      // Create unit mesh using factory
      mesh = this.modelFactory.createUnitModel(entityId, renderComponent, unitType, faction);
      
      // Register for animation if animation system exists
      if (this.systems.animation && this.systems.animation.animationFactory) {
        this.systems.animation.animationFactory.registerEntityForAnimation(entityId, mesh, unitType);
      }
    }
    else if (renderComponent.meshId === 'building') {
      // Get faction data
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      const faction = factionComponent ? factionComponent.faction : 'player';
      
      // Check for building type component first
      let buildingType = 'command_center';
      if (this.entityManager.hasComponent(entityId, 'buildingType')) {
        buildingType = this.entityManager.getComponent(entityId, 'buildingType').type;
      }
      
      // Create building mesh using factory
      mesh = this.modelFactory.createBuildingModel(entityId, renderComponent, buildingType, faction);
      
      // Register for animation if animation system exists
      if (this.systems.animation && this.systems.animation.animationFactory) {
        this.systems.animation.animationFactory.registerEntityForAnimation(entityId, mesh, buildingType);
      }
    }
    else if (renderComponent.meshId === 'resource') {
      // Get resource type
      const resourceComponent = this.entityManager.getComponent(entityId, 'resource');
      const resourceType = resourceComponent ? resourceComponent.type : 'basic';
      
      // Create resource mesh using factory
      mesh = this.modelFactory.createResourceModel(entityId, renderComponent, resourceType);
    }
    else if (renderComponent.meshId === 'terrain') {
      // Get terrain object type
      const terrainType = renderComponent.terrainType || 'rock';
      
      // Create terrain object mesh using factory
      mesh = this.modelFactory.createTerrainObjectModel(entityId, renderComponent, terrainType);
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
    
    // Apply scale from render component
    if (mesh) {
      if (renderComponent.scale) {
        mesh.scale.set(
          renderComponent.scale.x,
          renderComponent.scale.y,
          renderComponent.scale.z
        );
      }
      
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
      if (mesh.geometry) mesh.geometry.dispose();
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
