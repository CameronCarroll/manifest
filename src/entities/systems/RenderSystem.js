import * as THREE from 'three';
import SelectionIndicator from '../../utils/SelectionIndicator.js';

export default class RenderSystem {
  constructor(entityManager, sceneManager, modelLoader) {
    this.entityManager = entityManager;
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.meshes = new Map(); // Maps entityId to THREE.Mesh
    this.selectionIndicator = null;
  }

  initialize() {
    const { scene } = this.sceneManager.getActiveScene();
    if (scene) {
      this.selectionIndicator = new SelectionIndicator(scene);
    }
  }

  update(deltaTime) {
    const { scene } = this.sceneManager.getActiveScene();
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
        }
      } else if (this.meshes.has(entityId)) {
        // Remove mesh if the entity no longer has required components
        this.removeMesh(entityId, scene);
      }
    });
  }

  createMesh(entityId, renderComponent, scene) {
    // This would use the modelLoader to load the actual 3D model based on renderComponent.meshId
    // For simplicity, we'll create placeholder meshes
    let mesh;
    
    // Check if we're dealing with a unit or building based on meshId or other properties
    if (renderComponent.meshId === 'unit') {
      // Create a unit mesh (cylinder for now)
      const geometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
      const material = new THREE.MeshPhongMaterial({ 
        color: renderComponent.color,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
      mesh = new THREE.Mesh(geometry, material);
      
      // Position the mesh so its bottom is at y=0
      mesh.position.y = 0.5;
    } else if (renderComponent.meshId === 'building') {
      // Create a building mesh (box for now)
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshPhongMaterial({ 
        color: renderComponent.color,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
      mesh = new THREE.Mesh(geometry, material);
      
      // Position the mesh so its bottom is at y=0
      mesh.position.y = 0.5;
    } else {
      // Default shape
      const geometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshPhongMaterial({ 
        color: renderComponent.color,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
      mesh = new THREE.Mesh(geometry, material);
    }
    
    // Apply scale
    mesh.scale.set(
      renderComponent.scale.x,
      renderComponent.scale.y,
      renderComponent.scale.z
    );
    
    // Store mesh and add to scene
    this.meshes.set(entityId, mesh);
    scene.add(mesh);
    
    return mesh;
  }

  removeMesh(entityId, scene) {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      scene.remove(mesh);
      this.meshes.delete(entityId);
      
      // Properly dispose of geometries and materials
      if (mesh.geometry) {mesh.geometry.dispose();}
      
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  }

  // Update selection visualization
  updateSelections(selectedEntities) {
    if (this.selectionIndicator) {
      this.selectionIndicator.updateSelectionRings(selectedEntities, this.entityManager);
    }
  }

  // Clean up resources when the system is shut down
  dispose() {
    const { scene } = this.sceneManager.getActiveScene();
    if (!scene) {return;}
    
    // Remove all meshes and dispose of resources
    this.meshes.forEach((mesh, entityId) => {
      this.removeMesh(entityId, scene);
    });
    
    this.meshes.clear();
    
    // Dispose of selection indicator
    if (this.selectionIndicator) {
      this.selectionIndicator.dispose();
      this.selectionIndicator = null;
    }
  }
}