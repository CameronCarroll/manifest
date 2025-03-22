import * as THREE from 'three';

class RenderSystem {
  constructor(entityManager, sceneManager, modelLoader) {
    this.entityManager = entityManager;
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.meshes = new Map(); // Maps entityId to THREE.Mesh
  }

  initialize() {
    // Initial setup if needed
  }

  update(deltaTime) {
    const { scene } = this.sceneManager.getActiveScene();
    if (!scene) return;

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
    // For simplicity, we'll create a placeholder cube
    let mesh;
    
    // Placeholder - in a real implementation, you would load models based on meshId
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhongMaterial({ 
      color: renderComponent.color,
      opacity: renderComponent.opacity,
      transparent: renderComponent.opacity < 1
    });
    mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(
      renderComponent.scale.x,
      renderComponent.scale.y,
      renderComponent.scale.z
    );
    
    this.meshes.set(entityId, mesh);
    scene.add(mesh);
  }

  removeMesh(entityId, scene) {
    const mesh = this.meshes.get(entityId);
    if (mesh) {
      scene.remove(mesh);
      this.meshes.delete(entityId);
      
      // Properly dispose of geometries and materials
      if (mesh.geometry) mesh.geometry.dispose();
      
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
  }

  // Clean up resources when the system is shut down
  dispose() {
    const { scene } = this.sceneManager.getActiveScene();
    if (!scene) return;
    
    // Remove all meshes and dispose of resources
    this.meshes.forEach((mesh, entityId) => {
      this.removeMesh(entityId, scene);
    });
    
    this.meshes.clear();
  }
}

export default RenderSystem;
