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
    let mesh;
    
    if (renderComponent.meshId === 'unit') {
      // Create a group to hold multiple geometries
      const group = new THREE.Group();
        
      // Get faction data to determine unit type
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      const unitType = factionComponent ? factionComponent.unitType : 'basic';
        
      // Base body geometry and material - will be modified based on unit type
      let bodyGeometry = new THREE.CylinderGeometry(0.4, 0.6, 1.2, 8);
      const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: renderComponent.color,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1,
        shininess: 30
      });
        
      // Staff/wand geometry and material - will be modified based on unit type
      let staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
      const staffMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x222222,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
        
      // Orb material - will be modified based on unit type
      const orbGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const orbMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00FFFF, // Default cyan color
        emissive: 0x00FFFF,
        emissiveIntensity: 0.7,
        opacity: renderComponent.opacity,
        transparent: true
      });
        
      // Shoulder material - will be modified based on unit type
      const shoulderGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 8);
      const shoulderMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
        
      // Apply unit type variations here
      if (unitType === 'assault') {
        // Red energy weapon
        orbMaterial.color.set(0xFF0000);
        orbMaterial.emissive.set(0xFF0000);
        // More armor/bigger shoulders
        shoulderMaterial.color.set(0x444444);
        // Broader, more armored silhouette
        bodyGeometry = new THREE.CylinderGeometry(0.45, 0.65, 1.2, 8);
      } else if (unitType === 'support' || unitType === 'medic') {
        // Green healing energy
        orbMaterial.color.set(0x00FF00);
        orbMaterial.emissive.set(0x00FF00);
        // Thinner robes
        bodyGeometry = new THREE.CylinderGeometry(0.35, 0.5, 1.3, 8);
      } else if (unitType === 'sniper') {
        // Blue long-range energy
        orbMaterial.color.set(0x0088FF);
        orbMaterial.emissive.set(0x0088FF);
        // Longer staff
        staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 1.8, 6);
      } else if (unitType === 'tank') {
        // Purple heavy energy
        orbMaterial.color.set(0x8800FF);
        orbMaterial.emissive.set(0x8800FF);
        // Bulkier appearance
        bodyGeometry = new THREE.CylinderGeometry(0.5, 0.7, 1.1, 8);
        // Heavier armor
        shoulderMaterial.color.set(0x555555);
      } else if (unitType === 'worker') {
        // Yellow energy
        orbMaterial.color.set(0xFFFF00);
        orbMaterial.emissive.set(0xFFFF00);
        // Smaller staff
        staffGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6);
      }
        
      // Now create all the meshes using the modified geometries and materials
        
      // Body with unit-specific geometry
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = 0.6;
      group.add(body);
        
      // Head
      const headGeometry = new THREE.SphereGeometry(0.2, 8, 8);
      const headMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xEEEEEE,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1.3;
      group.add(head);
        
      // Shoulders with unit-specific material
      const leftShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
      leftShoulder.position.set(-0.4, 1.1, 0);
      leftShoulder.rotation.z = Math.PI / 2;
      group.add(leftShoulder);
        
      const rightShoulder = new THREE.Mesh(shoulderGeometry, shoulderMaterial);
      rightShoulder.position.set(0.4, 1.1, 0);
      rightShoulder.rotation.z = Math.PI / 2;
      group.add(rightShoulder);
        
      // Staff with unit-specific geometry
      const staff = new THREE.Mesh(staffGeometry, staffMaterial);
      staff.position.set(0.3, 0.9, 0.3);
      staff.rotation.x = Math.PI / 4;
      group.add(staff);
        
      // Orb with unit-specific material
      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
        
      // Adjust orb position based on staff length
      if (unitType === 'sniper') {
        orb.position.set(0.6, 1.4, 0.6);
      } else if (unitType === 'worker') {
        orb.position.set(0.4, 1.1, 0.4);
      } else {
        orb.position.set(0.5, 1.2, 0.5);
      }
        
      group.add(orb);
        
      // Optional: Add a point light to make the orb glow
      const pointLight = new THREE.PointLight(orbMaterial.color, 0.5, 3);
      pointLight.position.copy(orb.position);
      group.add(pointLight);
        
      mesh = group;
    } 
    else if (renderComponent.meshId === 'building') {
      // Create a group for building parts
      const group = new THREE.Group();
      
      // Base structure - slightly beveled box
      const baseGeometry = new THREE.BoxGeometry(1.2, 1, 1.2);
      const baseMaterial = new THREE.MeshPhongMaterial({ 
        color: renderComponent.color,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1,
        shininess: 50 // More metallic
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.5;
      group.add(base);
      
      // Roof structure - pyramid or angular top
      const roofGeometry = new THREE.ConeGeometry(0.8, 0.6, 4);
      const roofMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x333333, // Darker roof
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = 1.3;
      roof.rotation.y = Math.PI / 4; // Rotate 45 degrees for better alignment
      group.add(roof);
      
      // Add glowing windows
      const windowGeometry = new THREE.PlaneGeometry(0.2, 0.3);
      const windowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x00FFAA, 
        emissive: 0x00FFAA,
        emissiveIntensity: 0.7,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9
      });
      
      // Add windows to each side
      for (let i = 0; i < 4; i++) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.y = 0.5;
        window.position.x = Math.sin(i * Math.PI/2) * 0.61;
        window.position.z = Math.cos(i * Math.PI/2) * 0.61;
        window.rotation.y = i * Math.PI/2;
        group.add(window);
      }
      
      // Add antennae or magical transmitters
      const antennaGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4);
      const antennaMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x888888,
        opacity: renderComponent.opacity,
        transparent: renderComponent.opacity < 1
      });
      
      const antenna1 = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna1.position.set(0.3, 1.6, 0.3);
      group.add(antenna1);
      
      const antenna2 = new THREE.Mesh(antennaGeometry, antennaMaterial);
      antenna2.position.set(-0.3, 1.6, -0.3);
      group.add(antenna2);
      
      // Add glow effect to antenna tips
      const glowGeometry = new THREE.SphereGeometry(0.04, 8, 8);
      const glowMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xFF00FF, // Magenta glow
        emissive: 0xFF00FF,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.9
      });
      
      const glow1 = new THREE.Mesh(glowGeometry, glowMaterial);
      glow1.position.set(0.3, 1.85, 0.3);
      group.add(glow1);
      
      const glow2 = new THREE.Mesh(glowGeometry, glowMaterial);
      glow2.position.set(-0.3, 1.85, -0.3);
      group.add(glow2);
      
      mesh = group;
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
      
      // For resource nodes, use a different shape
      if (renderComponent.meshId === 'resource') {
        geometry = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 8);
        mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = Math.PI / 2; // Lay flat
      }
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
  
      // Store mesh in the map
      this.meshes.set(entityId, mesh);
  
      // Add to scene
      scene.add(mesh);
    }

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