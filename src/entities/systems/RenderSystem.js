import * as THREE from 'three';
import SelectionIndicator from '../../utils/SelectionIndicator.js';
import HealthVisualizer from '../../utils/HealthVisualizer.js';

export default class RenderSystem {
  constructor(entityManager, sceneManager, modelLoader, systems) {
    this.entityManager = entityManager;
    this.sceneManager = sceneManager;
    this.modelLoader = modelLoader;
    this.systems = systems; // Store the entire systems context
    this.meshes = new Map(); // Maps entityId to THREE.Mesh
    this.selectionIndicator = null;
    this.healthVisualizer = null;
    
    // Debugging
    this.debug = true;
  }

  // In src/entities/systems/RenderSystem.js
  initialize() {
    const { scene } = this.sceneManager.getActiveScene();
    if (scene) {
      // Pass the entire systems context
      this.selectionIndicator = new SelectionIndicator(scene, this.systems);
      
      // Create health visualizer
      this.healthVisualizer = new HealthVisualizer(scene);
      
      if (this.debug) {
        console.log('RenderSystem: Selection indicator and health visualizer created');
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
  }

  createMesh(entityId, renderComponent, scene) {
    let mesh;
    
    if (renderComponent.meshId === 'unit') {
      // Create a group to hold multiple geometries
      const group = new THREE.Group();
        
      // Get faction data to determine unit type
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      const unitType = factionComponent ? factionComponent.unitType : 'basic';
      const faction = factionComponent ? factionComponent.faction : 'player';
        
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
      
      // Cybernetic elements
      const cyberGeometry = new THREE.BoxGeometry(0.1, 0.03, 0.3);
      const cyberMaterial = new THREE.MeshPhongMaterial({
        color: faction === 'player' ? 0x00ffff : 0xff00ff, // Cyan for player, magenta for enemy
        emissive: faction === 'player' ? 0x00ffff : 0xff00ff,
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.9
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
      } else if (unitType === 'heavy') {
        // For enemy heavy units - make them larger and more imposing
        bodyGeometry = new THREE.CylinderGeometry(0.55, 0.75, 1.3, 8);
        shoulderMaterial.color.set(0x666666);
        orbMaterial.color.set(0xFF0066);
        orbMaterial.emissive.set(0xFF0066);
      } else if (unitType === 'light') {
        // For enemy light units - make them smaller and faster looking
        bodyGeometry = new THREE.CylinderGeometry(0.35, 0.5, 1.1, 8);
        orbMaterial.color.set(0xFF3300);
        orbMaterial.emissive.set(0xFF3300);
      } else if (unitType === 'specialist') {
        // For enemy specialist units - unique appearance
        bodyGeometry = new THREE.CylinderGeometry(0.4, 0.5, 1.2, 6);
        orbMaterial.color.set(0xAA00FF);
        orbMaterial.emissive.set(0xAA00FF);
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
      
      // Add cybernetic elements
      this.addCyberneticElements(group, faction, unitType);
        
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
      
      // Add cybernetic elements to the building
      this.addBuildingCyberneticElements(group);
      
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
        const resourceGeometry = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 8);
        mesh = new THREE.Mesh(resourceGeometry, material);
        mesh.rotation.x = Math.PI / 2; // Lay flat
        
        // Add glow effect for resources
        const resourceType = this.entityManager.getComponent(entityId, 'resource')?.type;
        if (resourceType) {
          const glowColor = resourceType === 'gas' ? 0x00ffff : 0xffff00;
          const glowMaterial = new THREE.MeshBasicMaterial({
            color: glowColor,
            transparent: true,
            opacity: 0.6
          });
          
          const glowMesh = new THREE.Mesh(resourceGeometry, glowMaterial);
          glowMesh.scale.set(1.1, 1.1, 1.1);
          mesh.add(glowMesh);
          
          // Add pulsing animation 
          glowMesh.userData.pulseTime = 0;
          glowMesh.userData.updatePulse = (deltaTime) => {
            glowMesh.userData.pulseTime += deltaTime;
            const scale = 1.1 + Math.sin(glowMesh.userData.pulseTime * 2) * 0.1;
            glowMesh.scale.set(scale, scale, scale);
          };
        }
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
  
  // Add cybernetic elements to unit meshes
  addCyberneticElements(group, faction, unitType) {
    // Determine color by faction and unit type
    let primaryColor, secondaryColor;
    
    if (faction === 'player') {
      primaryColor = 0x00ffff; // Cyan
      secondaryColor = 0x00ff99; // Teal
    } else {
      primaryColor = 0xff00ff; // Magenta
      secondaryColor = 0xff3366; // Pink/red
    }
    
    // Get body mesh (first cylinder)
    const bodyMesh = group.children.find(child => 
      child.geometry instanceof THREE.CylinderGeometry && 
      child.position.y === 0.6
    );
    
    if (!bodyMesh) {return;}
    
    // Add glowing circuit patterns
    const circuitMaterial = new THREE.MeshBasicMaterial({
      color: primaryColor,
      transparent: true,
      opacity: 0.9
    });
    
    // Add circuit lines
    const circuitCount = 3;
    for (let i = 0; i < circuitCount; i++) {
      const circuitGeometry = new THREE.BoxGeometry(0.05, 0.6, 0.02);
      const circuit = new THREE.Mesh(circuitGeometry, circuitMaterial);
      
      // Position around the body
      const angle = (i / circuitCount) * Math.PI * 2;
      const radius = bodyMesh.geometry.parameters.radiusTop * 0.9;
      
      circuit.position.x = Math.cos(angle) * radius;
      circuit.position.z = Math.sin(angle) * radius;
      circuit.position.y = 0.6;
      
      bodyMesh.add(circuit);
    }
    
    // Add shoulder circuit accents
    const shoulders = group.children.filter(child => 
      child.geometry instanceof THREE.CylinderGeometry && 
      child.position.y === 1.1
    );
    
    shoulders.forEach(shoulder => {
      const accentGeometry = new THREE.RingGeometry(0.1, 0.15, 8);
      const accentMaterial = new THREE.MeshBasicMaterial({
        color: secondaryColor,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      const accent = new THREE.Mesh(accentGeometry, accentMaterial);
      accent.rotation.x = Math.PI / 2;
      accent.position.y = 0.02;
      
      shoulder.add(accent);
    });
    
    // Add a holographic floating element above the head
    const head = group.children.find(child => 
      child.geometry instanceof THREE.SphereGeometry && 
      child.position.y === 1.3
    );
    
    if (head) {
      const holoGeometry = new THREE.TorusGeometry(0.1, 0.01, 8, 16);
      const holoMaterial = new THREE.MeshBasicMaterial({
        color: primaryColor,
        transparent: true,
        opacity: 0.7
      });
      
      const holo = new THREE.Mesh(holoGeometry, holoMaterial);
      holo.position.y = 0.25;
      
      // Store animation state in userData
      holo.userData = {
        rotationSpeed: 2,
        pulseTime: 0
      };
      
      // Add update function to animate
      holo.userData.update = (deltaTime) => {
        holo.rotation.y += holo.userData.rotationSpeed * deltaTime;
        holo.userData.pulseTime += deltaTime;
        
        const pulse = (Math.sin(holo.userData.pulseTime * 5) + 1) / 2;
        holo.scale.set(1 + pulse * 0.1, 1 + pulse * 0.1, 1 + pulse * 0.1);
        
        if (holo.material) {
          holo.material.opacity = 0.4 + pulse * 0.4;
        }
      };
      
      head.add(holo);
    }
    
    // For support units, add additional magical cyber elements
    if (unitType === 'support' || unitType === 'medic') {
      const runeGeometry = new THREE.CircleGeometry(0.1, 6);
      const runeMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ff99,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      // Add floating runes around the body
      const runeCount = 3;
      for (let i = 0; i < runeCount; i++) {
        const rune = new THREE.Mesh(runeGeometry, runeMaterial);
        
        const angle = (i / runeCount) * Math.PI * 2;
        const radius = 0.7;
        
        rune.position.x = Math.cos(angle) * radius;
        rune.position.z = Math.sin(angle) * radius;
        rune.position.y = 0.8 + i * 0.2;
        
        // Face toward center
        rune.lookAt(0, rune.position.y, 0);
        
        // Store animation params
        rune.userData = {
          baseY: rune.position.y,
          offset: i * Math.PI * 0.5,
          speed: 1 + Math.random() * 0.5
        };
        
        // Add update function
        rune.userData.update = (deltaTime) => {
          const time = Date.now() * 0.001;
          rune.position.y = rune.userData.baseY + Math.sin(time * rune.userData.speed + rune.userData.offset) * 0.1;
          rune.rotation.z += deltaTime * 0.5;
        };
        
        group.add(rune);
      }
    }
  }
  
  // Add cybernetic elements to buildings
  addBuildingCyberneticElements(group) {
    // Add holographic floating data projections
    const holoGeometry = new THREE.PlaneGeometry(0.4, 0.4);
    const holoMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide
    });
    
    const holo = new THREE.Mesh(holoGeometry, holoMaterial);
    holo.position.set(0, 1.8, 0);
    
    // Rotate to be horizontal
    holo.rotation.x = Math.PI / 2;
    
    // Store animation state
    holo.userData = {
      rotationSpeed: 0.5,
      time: 0
    };
    
    // Add update function
    holo.userData.update = (deltaTime) => {
      holo.rotation.z += holo.userData.rotationSpeed * deltaTime;
      holo.userData.time += deltaTime;
      
      const pulse = (Math.sin(holo.userData.time * 2) + 1) / 2;
      holo.material.opacity = 0.4 + pulse * 0.3;
    };
    
    group.add(holo);
    
    // Add energy conduits along the building
    const conduitCount = 4;
    const conduitMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.7
    });
    
    for (let i = 0; i < conduitCount; i++) {
      const conduitGeometry = new THREE.BoxGeometry(0.05, 0.8, 0.05);
      const conduit = new THREE.Mesh(conduitGeometry, conduitMaterial);
      
      // Position at corners
      const angle = (i / conduitCount) * Math.PI * 2;
      const radius = 0.5;
      
      conduit.position.x = Math.cos(angle) * radius;
      conduit.position.z = Math.sin(angle) * radius;
      conduit.position.y = 0.5;
      
      // Add animation data
      conduit.userData = {
        pulseTime: i * Math.PI / 2,
        pulseSpeed: 2
      };
      
      // Add update function
      conduit.userData.update = (deltaTime) => {
        conduit.userData.pulseTime += deltaTime * conduit.userData.pulseSpeed;
        
        const pulse = (Math.sin(conduit.userData.pulseTime) + 1) / 2;
        
        if (conduit.material) {
          conduit.material.opacity = 0.5 + pulse * 0.5;
        }
      };
      
      group.add(conduit);
    }
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
    console.log('RenderSystem updateSelections called', { 
      selectedEntities: Array.from(selectedEntities),
      selectionIndicatorExists: !!this.selectionIndicator 
    });
  
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
    
    // Dispose of health visualizer
    if (this.healthVisualizer) {
      this.healthVisualizer.dispose();
      this.healthVisualizer = null;
    }
  }
}