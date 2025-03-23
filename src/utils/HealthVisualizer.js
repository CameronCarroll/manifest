import * as THREE from 'three';

class HealthVisualizer {
  constructor(scene) {
    this.scene = scene;
    this.healthBars = new Map(); // Maps entityId to health bar mesh
    this.tempDamageIndicators = []; // For temporary floating damage numbers
    
    // Create materials for visualization
    this.createMaterials();
  }
  
  createMaterials() {
    // Material for health bars
    this.healthBarMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00, // Green
      transparent: true,
      opacity: 0.8
    });
    
    // Material for health bar backgrounds
    this.healthBarBgMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000, // Red
      transparent: true,
      opacity: 0.5
    });
    
    // Material for damage text
    this.damageTextMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff, // White
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
    
    // Material for critical damage text
    this.criticalDamageTextMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00, // Yellow
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide
    });
  }
  
  // Create or update health bar for an entity
  updateHealthBar(entityId, entityManager) {
    // Check if entity has health component
    if (!entityManager.hasComponent(entityId, 'health') ||
        !entityManager.hasComponent(entityId, 'position')) {
      return;
    }
    
    const healthComponent = entityManager.getComponent(entityId, 'health');
    const positionComponent = entityManager.getComponent(entityId, 'position');
    
    // Calculate health percentage
    const healthPercent = healthComponent.currentHealth / healthComponent.maxHealth;
    
    // Create or update health bar
    if (!this.healthBars.has(entityId)) {
      // Create a group to hold both background and fill bars
      const group = new THREE.Group();
      
      // Create background (red) bar
      const bgGeometry = new THREE.PlaneGeometry(1.2, 0.15);
      const bgBar = new THREE.Mesh(bgGeometry, this.healthBarBgMaterial);
      group.add(bgBar);
      
      // Create health (green) bar
      const barGeometry = new THREE.PlaneGeometry(1.2 * healthPercent, 0.15);
      const bar = new THREE.Mesh(barGeometry, this.healthBarMaterial);
      bar.position.x = (1.2 * (healthPercent - 1)) / 2; // Align left
      group.add(bar);
      
      // Position above entity
      group.position.set(positionComponent.x, 2.0, positionComponent.z);
      
      // Make bar face the camera
      group.rotation.x = -Math.PI / 2; // Face up, will be updated to look at camera
      
      // Add to scene
      this.scene.add(group);
      
      // Store reference
      this.healthBars.set(entityId, {
        group,
        bar,
        bgBar
      });
    } else {
      // Update existing health bar
      const healthBar = this.healthBars.get(entityId);
      
      // Update position
      healthBar.group.position.set(positionComponent.x, 2.0, positionComponent.z);
      
      // Update health bar width based on current health
      healthBar.bar.scale.x = healthPercent;
      healthBar.bar.position.x = (1.2 * (healthPercent - 1)) / 2; // Align left
      
      // Update color based on health percentage
      if (healthPercent < 0.3) {
        healthBar.bar.material.color.setHex(0xff3300); // Red-orange for low health
      } else if (healthPercent < 0.6) {
        healthBar.bar.material.color.setHex(0xffcc00); // Yellow for medium health
      } else {
        healthBar.bar.material.color.setHex(0x00ff00); // Green for high health
      }
    }
  }
  
  // Remove health bar for an entity
  removeHealthBar(entityId) {
    if (this.healthBars.has(entityId)) {
      const healthBar = this.healthBars.get(entityId);
      this.scene.remove(healthBar.group);
      
      // Dispose of geometries
      if (healthBar.bar.geometry) {
        healthBar.bar.geometry.dispose();
      }
      if (healthBar.bgBar.geometry) {
        healthBar.bgBar.geometry.dispose();
      }
      
      this.healthBars.delete(entityId);
    }
  }
  
  // Show floating damage number
  showDamageNumber(position, damage, isCritical = false) {
    // Create a simple cube for the damage indicator
    // Size based on damage amount (larger for higher damage)
    const size = 0.1 + Math.min(0.3, damage / 100);
    
    // Create geometry based on critical hit status
    let geometry;
    if (isCritical) {
      // Use a star-like shape for critical hits
      geometry = new THREE.OctahedronGeometry(size * 1.2);
    } else {
      // Use a simple cube for normal hits
      geometry = new THREE.BoxGeometry(size, size, size);
    }
    
    // Choose material based on critical hit status
    const material = isCritical ? 
      this.criticalDamageTextMaterial.clone() : 
      this.damageTextMaterial.clone();
    
    // Create the mesh
    const indicatorMesh = new THREE.Mesh(geometry, material);
    
    // Position slightly above the entity with some randomness
    indicatorMesh.position.set(
      position.x + (Math.random() * 0.6 - 0.3), // Add slight randomness
      position.y + 1.8 + (Math.random() * 0.4),
      position.z + (Math.random() * 0.6 - 0.3)
    );
    
    // Add to scene
    this.scene.add(indicatorMesh);
    
    // Store animation data in the mesh's userData
    indicatorMesh.userData = {
      creationTime: Date.now(),
      duration: isCritical ? 1500 : 1000, // milliseconds
      initialY: indicatorMesh.position.y,
      velocity: {
        y: 1.5 + Math.random() * 1.0, // Random upward velocity
      },
      damage: damage, // Store damage amount for potential color mapping
      rotationSpeed: isCritical ? 5.0 : 2.0 // Rotation speed (faster for criticals)
    };
    
    // Add to temp indicators for animation and cleanup
    this.tempDamageIndicators.push(indicatorMesh);
    
    return indicatorMesh;
  }
  
  // Process damage events from combat system
  processDamageEvents(damageEvents) {
    damageEvents.forEach(event => {
      // Show floating damage number
      this.showDamageNumber(
        event.position,
        Math.round(event.damage),
        event.isCritical
      );
    });
  }
  
  // Update all health visualizations
  update(deltaTime, entityManager, camera) {
    // Update health bars for all entities
    entityManager.gameState.entities.forEach((entity, entityId) => {
      // Only show health bars for enemy entities
      if (entityManager.hasComponent(entityId, 'faction')) {
        const faction = entityManager.getComponent(entityId, 'faction');
        if (faction.faction === 'enemy') {
          this.updateHealthBar(entityId, entityManager);
        }
      }
    });
    
    // Make health bars face the camera
    if (camera) {
      this.healthBars.forEach((healthBar) => {
        healthBar.group.lookAt(camera.position);
      });
    }
    
    // Update temporary damage indicators
    const now = Date.now();
    const indicatorsToRemove = [];
    
    this.tempDamageIndicators.forEach(indicator => {
      if (!indicator.userData) {return;}
      
      const age = now - indicator.userData.creationTime;
      const lifePercent = age / indicator.userData.duration;
      
      if (lifePercent >= 1.0) {
        // Mark for removal
        indicatorsToRemove.push(indicator);
      } else {
        // Move upward
        indicator.position.y += indicator.userData.velocity.y * deltaTime;
        
        // Rotate the indicator for visual interest
        indicator.rotation.x += indicator.userData.rotationSpeed * deltaTime;
        indicator.rotation.y += indicator.userData.rotationSpeed * 0.7 * deltaTime;
        
        // Fade out gradually
        indicator.material.opacity = 1.0 - lifePercent;
        
        // Scale up critical hits briefly
        if (indicator.material === this.criticalDamageTextMaterial) {
          const scalePhase = Math.min(1.0, lifePercent * 3);
          const scale = 1.0 + Math.sin(scalePhase * Math.PI) * 0.5;
          indicator.scale.set(scale, scale, scale);
        }
      }
    });
    
    // Remove expired indicators
    indicatorsToRemove.forEach(indicator => {
      this.scene.remove(indicator);
      if (indicator.geometry) {
        indicator.geometry.dispose();
      }
      if (indicator.material) {
        indicator.material.dispose();
      }
      
      const index = this.tempDamageIndicators.indexOf(indicator);
      if (index !== -1) {
        this.tempDamageIndicators.splice(index, 1);
      }
    });
  }
  
  // Clean up resources
  dispose() {
    // Remove and dispose of all health bars
    this.healthBars.forEach((healthBar, entityId) => {
      this.removeHealthBar(entityId);
    });
    
    // Remove and dispose of all temporary indicators
    this.tempDamageIndicators.forEach(indicator => {
      this.scene.remove(indicator);
      if (indicator.geometry) {
        indicator.geometry.dispose();
      }
      if (indicator.material) {
        indicator.material.dispose();
      }
    });
    
    this.tempDamageIndicators = [];
    
    // Dispose of materials
    this.healthBarMaterial.dispose();
    this.healthBarBgMaterial.dispose();
    this.damageTextMaterial.dispose();
    this.criticalDamageTextMaterial.dispose();
  }
}

export default HealthVisualizer;