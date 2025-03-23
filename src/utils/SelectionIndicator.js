import * as THREE from 'three';

// Class to handle selection visualization
class SelectionIndicator {
  constructor(scene, systems) {
    console.log('SelectionIndicator - Constructor called');
    console.log('Received scene:', scene);
    console.log('Received systems:', systems);
  
    this.scene = scene;
    this.systems = systems;
    this.selectionRings = new Map();
    this.createMaterials();
  }

  update(deltaTime) {
    // Update target indicators
    this.updateTargetIndicators(deltaTime);
  }

  createMaterials() {
    // Material for friendly unit selection
    this.friendlySelectionMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false // Prevents z-fighting with ground
    });
    
    // Material for enemy unit selection (if needed)
    this.enemySelectionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Red
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    // Add enemy targeting material
    this.enemyTargetingMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Bright red
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  // Add selection ring for an entity
  addSelectionRing(entityId, position, radius = 1.2, isEnemy = false) {
    console.log('Adding selection ring', { 
      entityId, 
      position, 
      radius, 
      isEnemy 
    });

    // Remove existing ring if there is one
    this.removeSelectionRing(entityId);
    
    // Create a ring geometry
    const ringGeometry = new THREE.RingGeometry(radius * 0.9, radius, 32);
    const material = isEnemy ? this.enemySelectionMaterial : this.friendlySelectionMaterial;
    const ring = new THREE.Mesh(ringGeometry, material);
    
    // Position the ring
    ring.position.set(position.x, 0.1, position.z); // Slightly above ground
    ring.rotation.x = -Math.PI / 2; // Lay flat on the ground
    
    // Add to scene
    this.scene.add(ring);
    this.selectionRings.set(entityId, ring);
    
    return ring;
  }

  // Update ring position for an entity
  updateSelectionRingPosition(entityId, position) {
    const ring = this.selectionRings.get(entityId);
    if (ring) {
      ring.position.set(position.x, 0.1, position.z);
    }
  }

  // Remove selection ring for an entity
  removeSelectionRing(entityId) {
    const ring = this.selectionRings.get(entityId);
    if (ring) {
      this.scene.remove(ring);
      if (ring.geometry) {ring.geometry.dispose();}
      this.selectionRings.delete(entityId);
    }
  }

  // Clear all selection rings
  clearAllSelectionRings() {
    for (const entityId of this.selectionRings.keys()) {
      this.removeSelectionRing(entityId);
    }
  }

  // Update all selection rings based on current selection
  updateSelectionRings(selectedEntities, entityManager) {
    console.log('Updating selection rings', { 
      selectedEntities: Array.from(selectedEntities),
      entityManagerExists: !!entityManager 
    });
  
    // First, remove rings for entities no longer selected
    for (const entityId of this.selectionRings.keys()) {
      if (!selectedEntities.has(entityId)) {
        this.removeSelectionRing(entityId);
      }
    }
    
    // Then, add/update rings for selected entities
    for (const entityId of selectedEntities) {
      // Check if entity has position component
      if (entityManager.hasComponent(entityId, 'position')) {
        const positionComponent = entityManager.getComponent(entityId, 'position');
        
        // If ring already exists, update its position
        if (this.selectionRings.has(entityId)) {
          this.updateSelectionRingPosition(entityId, positionComponent);
        } else {
          // Create a new ring
          // Calculate radius based on entity's render component
          let radius = 1.2; // Default size
          if (entityManager.hasComponent(entityId, 'render')) {
            const renderComponent = entityManager.getComponent(entityId, 'render');
            radius = Math.max(
              renderComponent.scale.x, 
              renderComponent.scale.z
            ) * 0.7;
          }
          
          // Determine if it's an enemy unit
          const isEnemy = entityManager.hasComponent(entityId, 'faction') && 
            entityManager.getComponent(entityId, 'faction').faction !== 'player';
          
          // Add the selection ring
          this.addSelectionRing(entityId, positionComponent, radius, isEnemy);
        }
      }
    }
  }

  // New method to highlight enemy for attack targeting
  highlightEnemyTarget(entityId, position, radius = 1.5, duration = 1.0) {
    console.log('highlightEnemyTarget - Called');
    
    // Try multiple ways to get the sceneManager
    const sceneManager = 
      this.systems?.sceneManager || 
      this.systems?.render?.sceneManager;
  
    console.log('SceneManager:', sceneManager);
  
    // Remove any existing enemy target highlights
    this.removeEnemyTargetHighlight();
    
    // Safety checks
    if (!sceneManager) {
      console.error('NO SCENE MANAGER AVAILABLE');
      console.log('Full systems object:', this.systems);
      console.log('Render system:', this.systems?.render);
      return null;
    }
  
    const activeScene = sceneManager.getActiveScene();
    if (!activeScene || !activeScene.scene) {
      console.error('No active scene available');
      return null;
    }
  
    const ringGeometry = new THREE.RingGeometry(radius * 0.9, radius, 32);
    const ring = new THREE.Mesh(ringGeometry, this.enemyTargetingMaterial.clone());
    
    // Position the ring
    ring.position.set(position.x, 0.1, position.z);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.isEnemyTargetIndicator = true;
    ring.userData.creationTime = Date.now();
    ring.userData.duration = duration * 1000; // Convert to milliseconds
    ring.userData.fadeStartTime = Date.now() + 200; // Start fading after 200ms
    
    // Add to scene
    activeScene.scene.add(ring);
    
    return ring;
  }

  updateTargetIndicators(deltaTime) {
    // Try multiple ways to get the sceneManager
    const sceneManager = 
      this.systems?.sceneManager || 
      this.systems?.render?.sceneManager;
  
    // Safety checks
    if (!sceneManager) {
      return;
    }
  
    const activeScene = sceneManager.getActiveScene();
    if (!activeScene || !activeScene.scene) {
      return;
    }
  
    const now = Date.now();
    
    // Find all enemy targeting indicators
    const targetIndicators = activeScene.scene.children.filter(
      child => child.userData.isEnemyTargetIndicator
    );
    
    // Update each indicator
    targetIndicators.forEach(indicator => {
      if (!indicator.userData.creationTime) {return;}
      
      const age = now - indicator.userData.creationTime;
      
      // Check if it's time to start fading
      if (now >= indicator.userData.fadeStartTime) {
        // Calculate fade progress
        const fadeStartAge = indicator.userData.fadeStartTime - indicator.userData.creationTime;
        const fadeDuration = indicator.userData.duration - fadeStartAge;
        const fadeProgress = Math.min(1.0, (age - fadeStartAge) / fadeDuration);
        
        // Apply fade
        indicator.material.opacity = 0.7 * (1.0 - fadeProgress);
        
        // Scale up slightly as it fades
        const scale = 1.0 + fadeProgress * 0.5;
        indicator.scale.set(scale, scale, scale);
      }
      
      // Remove if lifetime is exceeded
      if (age >= indicator.userData.duration) {
        activeScene.scene.remove(indicator);
        indicator.geometry.dispose();
        indicator.material.dispose();
      }
    });
  }

  // Method to remove enemy target highlight
  removeEnemyTargetHighlight() {
    // Try multiple ways to get the sceneManager
    const sceneManager = 
      this.systems?.sceneManager || 
      this.systems?.render?.sceneManager;
  
    // Safety checks
    if (!sceneManager) {
      console.error('SceneManager not available for removing enemy target highlight');
      return;
    }
  
    const activeScene = sceneManager.getActiveScene();
    if (!activeScene || !activeScene.scene) {
      console.error('No active scene available');
      return;
    }
  
    // Remove any existing enemy targeting rings
    const existingRings = activeScene.scene.children.filter(
      child => child.userData.isEnemyTargetIndicator
    );
    
    existingRings.forEach(ring => {
      activeScene.scene.remove(ring);
      ring.geometry.dispose();
    });
  }
  
  // Dispose resources when not needed
  dispose() {
    // Existing selection ring cleanup
    this.clearAllSelectionRings();
    
    // Remove enemy targeting indicators
    this.removeEnemyTargetHighlight();
    
    // Dispose of materials
    if (this.friendlySelectionMaterial) {this.friendlySelectionMaterial.dispose();}
    if (this.enemySelectionMaterial) {this.enemySelectionMaterial.dispose();}
    if (this.enemyTargetingMaterial) {this.enemyTargetingMaterial.dispose();}
  }
}

export default SelectionIndicator;