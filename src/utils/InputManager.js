import * as THREE from 'three';

class InputManager {
  constructor(entityManager, sceneManager, systems) {
    this.entityManager = entityManager;
    this.sceneManager = sceneManager;
    this.systems = systems;
    
    this.mouseX = 0;
    this.mouseY = 0;
    this.normalizedMouseX = 0;
    this.normalizedMouseY = 0;
    this.isMouseDown = false;
    this.isSelecting = false;
    this.selectionStart = { x: 0, y: 0 };
    this.selectionEnd = { x: 0, y: 0 };
    this.selectedEntities = new Set();
    this.commandHistory = [];
    this.undoStack = [];
    this.redoStack = [];
    
    // Edge panning
    this.isEdgePanning = false;
    this.edgePanThreshold = 20; // Pixels from edge to trigger panning
    this.edgePanSpeed = 20; // Movement speed when edge panning
    
    // Bind event handlers
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.checkEdgePanning = this.checkEdgePanning.bind(this);
    
    // Initialize event listeners
    this.setupEventListeners();
  }
  
  onMouseDown(event) {
    // Get normalized device coordinates
    this.updateMousePosition(event);
    
    // Check for double click
    const now = Date.now();
    const isDoubleClick = (now - this.lastClickTime) < this.doubleClickDelay;
    this.lastClickTime = now;
    
    // Right click - issue move/attack command
    if (event.button === 2) {
      event.preventDefault();
      
      // Cast ray to find intersected objects
      const intersect = this.castRay();
      
      if (intersect) {
        // Check if we clicked on an entity
        const clickedEntityId = this.getEntityAtPosition(intersect.point);
        
        // If we clicked on an enemy entity, issue attack command
        if (clickedEntityId && this.isEnemyEntity(clickedEntityId)) {
          this.issueAttackCommand(clickedEntityId);
        } else {
          // Otherwise issue move command to the clicked position
          this.issueMoveCommand(intersect.point);
        }
      }
      
      return;
    }
    
    // Left click - selection
    if (event.button === 0) {
      // Start selection
      this.isSelecting = true;
      this.selectionStart.copy(this.mousePosition);
      this.selectionEnd.copy(this.mousePosition);
      
      // If not holding shift, clear previous selection
      if (!event.shiftKey) {
        this.clearSelection();
      }
      
      // If it's a double click, select all units of the same type
      if (isDoubleClick) {
        const intersect = this.castRay();
        if (intersect) {
          const clickedEntityId = this.getEntityAtPosition(intersect.point);
          if (clickedEntityId) {
            this.selectAllUnitsOfSameType(clickedEntityId);
          }
        }
      }
    }
  }
  
  onMouseMove(event) {
    this.updateMousePosition(event);
    
    // Update selection box if selecting
    if (this.isSelecting) {
      this.selectionEnd.copy(this.mousePosition);
      // Could draw selection box here
    }
  }
  
  onMouseUp(event) {
    if (event.button === 0 && this.isSelecting) {
      // Finish selection
      this.isSelecting = false;
      
      // If selection area is very small, treat as a single click
      const selectionWidth = Math.abs(this.selectionEnd.x - this.selectionStart.x);
      const selectionHeight = Math.abs(this.selectionEnd.y - this.selectionStart.y);
      
      if (selectionWidth < 0.01 && selectionHeight < 0.01) {
        // Single click selection
        const intersect = this.castRay();
        if (intersect) {
          const clickedEntityId = this.getEntityAtPosition(intersect.point);
          if (clickedEntityId) {
            this.toggleEntitySelection(clickedEntityId);
          }
        }
      } else {
        // Box selection
        this.selectEntitiesInBox(this.selectionStart, this.selectionEnd);
      }
      
      // Update selection visualization
      if (this.systems.render) {
        this.systems.render.updateSelections(Array.from(this.selectedEntities));
      }
    }
  }
  
  onKeyDown(event) {
    // Handle keyboard shortcuts
    switch (event.key) {
      case 'Escape':
        // Clear selection
        this.clearSelection();
        if (this.systems.render) {
          this.systems.render.updateSelections([]);
        }
        break;
        
      case 'a':
        // If holding shift, select all player units
        if (event.shiftKey) {
          this.selectAllPlayerUnits();
        }
        break;
        
      case 's':
        // Stop selected units
        this.stopSelectedUnits();
        break;
        
      // Add more keyboard shortcuts as needed
    }
  }
  
  updateMousePosition(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  
  castRay() {
    const { camera } = this.sceneManager.getActiveScene();
    if (!camera) return null;
    
    // Update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mousePosition, camera);
    
    // Calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.sceneManager.getActiveScene().scene.children, true);
    
    // Filter out non-mesh objects and return the first valid intersection
    for (const intersect of intersects) {
      // Skip selection indicator objects
      if (intersect.object.userData.isSelectionIndicator) continue;
      
      // Skip objects that aren't the ground or entities
      if (intersect.object.userData.isGround || intersect.object.userData.entityId) {
        return intersect;
      }
    }
    
    return null;
  }
  
  getEntityAtPosition(position) {
    // Find the entity closest to the given position
    let closestEntityId = null;
    let closestDistance = 2; // Maximum distance to consider (adjust as needed)
    
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (this.entityManager.hasComponent(entityId, 'position') &&
          this.entityManager.hasComponent(entityId, 'render')) {
        const posComponent = this.entityManager.getComponent(entityId, 'position');
        
        // Calculate distance to entity
        const dx = posComponent.x - position.x;
        const dz = posComponent.z - position.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < closestDistance) {
          closestDistance = distance;
          closestEntityId = entityId;
        }
      }
    });
    
    return closestEntityId;
  }
  
  isEnemyEntity(entityId) {
    // Check if the entity is an enemy
    if (this.entityManager.hasComponent(entityId, 'faction')) {
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      return factionComponent.faction === 'enemy';
    }
    return false;
  }
  
  isPlayerEntity(entityId) {
    // Check if the entity is a player unit
    if (this.entityManager.hasComponent(entityId, 'faction')) {
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      return factionComponent.faction === 'player';
    }
    return false;
  }
  
  toggleEntitySelection(entityId) {
    // Only select player entities
    if (!this.isPlayerEntity(entityId)) return;
    
    if (this.selectedEntities.has(entityId)) {
      this.selectedEntities.delete(entityId);
    } else {
      this.selectedEntities.add(entityId);
    }
  }
  
  clearSelection() {
    this.selectedEntities.clear();
  }
  
  selectEntitiesInBox(start, end) {
    // Convert normalized device coordinates to screen coordinates
    const screenStart = new THREE.Vector2(
      (start.x + 1) / 2 * window.innerWidth,
      (-start.y + 1) / 2 * window.innerHeight
    );
    const screenEnd = new THREE.Vector2(
      (end.x + 1) / 2 * window.innerWidth,
      (-end.y + 1) / 2 * window.innerHeight
    );
    
    // Ensure start is the top-left and end is the bottom-right
    const minX = Math.min(screenStart.x, screenEnd.x);
    const maxX = Math.max(screenStart.x, screenEnd.x);
    const minY = Math.min(screenStart.y, screenEnd.y);
    const maxY = Math.max(screenStart.y, screenEnd.y);
    
    // Check each entity to see if it's in the selection box
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      // Only select player entities with position and render components
      if (this.isPlayerEntity(entityId) &&
          this.entityManager.hasComponent(entityId, 'position') &&
          this.entityManager.hasComponent(entityId, 'render')) {
        
        const posComponent = this.entityManager.getComponent(entityId, 'position');
        
        // Project 3D position to screen coordinates
        const { camera } = this.sceneManager.getActiveScene();
        if (!camera) return;
        
        const position = new THREE.Vector3(posComponent.x, posComponent.y, posComponent.z);
        const screenPosition = position.project(camera);
        
        const screenX = (screenPosition.x + 1) / 2 * window.innerWidth;
        const screenY = (-screenPosition.y + 1) / 2 * window.innerHeight;
        
        // Check if the entity is within the selection box
        if (screenX >= minX && screenX <= maxX && screenY >= minY && screenY <= maxY) {
          this.selectedEntities.add(entityId);
        }
      }
    });
  }
  
  selectAllUnitsOfSameType(entityId) {
    // Only proceed if the entity is a player unit
    if (!this.isPlayerEntity(entityId)) return;
    
    // Get the unit type
    const factionComponent = this.entityManager.getComponent(entityId, 'faction');
    const unitType = factionComponent.unitType;
    
    // Select all player units of the same type
    this.entityManager.gameState.entities.forEach((entity, id) => {
      if (this.isPlayerEntity(id) &&
          this.entityManager.hasComponent(id, 'faction')) {
        const otherFactionComponent = this.entityManager.getComponent(id, 'faction');
        if (otherFactionComponent.unitType === unitType) {
          this.selectedEntities.add(id);
        }
      }
    });
  }
  
  selectAllPlayerUnits() {
    // Select all player units
    this.entityManager.gameState.entities.forEach((entity, id) => {
      if (this.isPlayerEntity(id)) {
        this.selectedEntities.add(id);
      }
    });
    
    // Update selection visualization
    if (this.systems.render) {
      this.systems.render.updateSelections(Array.from(this.selectedEntities));
    }
  }
  
  issueMoveCommand(position) {
    // Issue move command to all selected entities
    for (const entityId of this.selectedEntities) {
      if (this.entityManager.hasComponent(entityId, 'position')) {
        // If we have a combat system, stop any attacks
        if (this.systems.combat) {
          this.systems.combat.stopAttack(entityId);
        }
        
        // Move the entity
        this.systems.movement.moveEntity(entityId, position, 5);
      }
    }
  }
  
  issueAttackCommand(targetEntityId) {
    // Issue attack command to all selected entities
    for (const entityId of this.selectedEntities) {
      if (this.systems.combat && 
          this.entityManager.hasComponent(entityId, 'position') &&
          this.entityManager.hasComponent(entityId, 'faction')) {
        
        // Start attack
        this.systems.combat.startAttack(entityId, targetEntityId);
        
        // If target is not in range, move toward it
        if (!this.systems.combat.canAttack(entityId, targetEntityId)) {
          const targetPosition = this.entityManager.getComponent(targetEntityId, 'position');
          this.systems.movement.moveEntity(entityId, targetPosition, 5);
        }
      }
    }
  }
  
  stopSelectedUnits() {
    // Stop all selected entities from moving and attacking
    for (const entityId of this.selectedEntities) {
      if (this.systems.movement) {
        this.systems.movement.stopEntity(entityId);
      }
      
      if (this.systems.combat) {
        this.systems.combat.stopAttack(entityId);
      }
    }
  }
  
  dispose() {
    // Remove event listeners
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  setupEventListeners() {
    // Add event listeners for mouse and keyboard
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('keydown', this.onKeyDown);
    
    // Create selection box element and add to document
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.position = 'absolute';
    this.selectionBox.style.border = '1px solid #39ff14';
    this.selectionBox.style.backgroundColor = 'rgba(57, 255, 20, 0.1)';
    this.selectionBox.style.pointerEvents = 'none';
    this.selectionBox.style.display = 'none';
    document.body.appendChild(this.selectionBox);
    
    // Add context menu prevention
    this.sceneManager.renderer.domElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
}

export default InputManager;
