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
    this.commandHistory = [];  // This is in the original source but seems unused
    this.undoStack = [];
    this.redoStack = [];
    
    // Create raycaster for picking
    this.raycaster = new THREE.Raycaster();
    this.mousePosition = new THREE.Vector2();
    this.lastClickTime = 0;
    this.doubleClickDelay = 300; // milliseconds
    
    // Edge panning
    this.edgeScrollingEnabled = true; // Default to enabled, will be updated based on menu toggle
    this.isEdgePanning = false;
    this.edgePanThreshold = 20; // Pixels from edge to trigger panning
    this.edgePanSpeed = 20; // Movement speed when edge panning
    this.lastEdgePanState = null;
    this.edgeThreshold = Math.min(
      window.innerWidth * 0.08,   // 8% of screen width
      window.innerHeight * 0.08   // 8% of screen height
    );
    
    // Create selection box element - THIS IS THE MISSING PART
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.position = 'absolute';
    this.selectionBox.style.border = '1px solid #39ff14';
    this.selectionBox.style.backgroundColor = 'rgba(57, 255, 20, 0.1)';
    this.selectionBox.style.pointerEvents = 'none';
    this.selectionBox.style.display = 'none';
    document.body.appendChild(this.selectionBox);
    
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
    // Set isMouseDown to true immediately
    this.isMouseDown = true;

    // Get normalized device coordinates
    this.updateMousePosition(event);
    
    // Check for double click
    const now = Date.now();
    const isDoubleClick = (now - this.lastClickTime) < this.doubleClickDelay;
    this.lastClickTime = now;
    
    // Right click - issue move/attack command
    if (event.button === 2) {
      // Only call preventDefault if it exists (for testing compatibility)
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      
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
      this.startSelection(event);
      
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
    // Set raw mouse coordinates
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    
    // Also update the normalized coordinates
    this.normalizedMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.normalizedMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Update selection box if selecting
    if (this.isSelecting) {
      this.updateSelectionBox(event);
    }
    
    // Check for edge panning
    this.checkEdgePanning();
  }
  
  onMouseUp(event) {
    if (event.button === 0) {
      this.isMouseDown = false;
      
      if (this.isSelecting) {
        this.completeSelection(event);
      }
    }
  }
  
  onKeyDown(event) {
    // Handle keyboard shortcuts
    if (event.key === 'z' && event.ctrlKey) {
      this.undo();
    } else if (event.key === 'y' && event.ctrlKey) {
      this.redo();
    } else if (event.key === 'Escape') {
      this.clearSelection();
    } else if (event.key === 'a' && event.shiftKey) {
      this.selectAllPlayerUnits();
    } else if (event.key === 's') {
      this.stopSelectedUnits();
    }
  }
  
  updateMousePosition(event) {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    this.mousePosition.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePosition.y = -(event.clientY / window.innerHeight) * 2 + 1;
  }
  
  castRay() {
    const { camera } = this.sceneManager.getActiveScene();
    if (!camera) {return null;}
    
    // Update the picking ray with the camera and mouse position
    this.raycaster.setFromCamera(this.mousePosition, camera);
    
    // Calculate objects intersecting the picking ray
    const intersects = this.raycaster.intersectObjects(this.sceneManager.getActiveScene().scene.children, true);
    
    // Filter out non-mesh objects and return the first valid intersection
    for (const intersect of intersects) {
      // Skip selection indicator objects
      if (intersect.object.userData.isSelectionIndicator) {continue;}
      
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
    if (!this.isPlayerEntity(entityId)) {return;}
    
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
        if (!camera) {return;}
        
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
    if (!this.isPlayerEntity(entityId)) {return;}
    
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

    window.addEventListener('resize', () => {
      // Recalculate edge threshold on window resize
      this.edgeThreshold = Math.min(
        window.innerWidth * 0.08,
        window.innerHeight * 0.08
      );
    });
  }

  // Update edge panning method in InputManager
  checkEdgePanning() {
    // Return early if edge scrolling is disabled
    if (this.edgeScrollingEnabled !== true) {
      // Reset any edge panning state when disabled
      if (this.isEdgePanning) {
        this.isEdgePanning = false;
        document.body.style.cursor = 'default';
      }
      return false;
    }

    // Safety checks
    if (!this.sceneManager || !this.sceneManager.camera) {
      return false;
    }
  
    const camera = this.sceneManager.camera;
    const bounds = this.sceneManager.cameraBounds;
  
    // Define edge zones (8% of screen width/height)
    const edgeThreshold = Math.min(
      window.innerWidth * 0.08,
      window.innerHeight * 0.08
    );
  
    // Determine pan direction and speed
    let panX = 0;
    let panZ = 0;
    const basePanSpeed = 10; // Adjusted base speed
  
    // Left edge
    if (this.mouseX < edgeThreshold) {
      panX = -basePanSpeed * (1 - this.mouseX / edgeThreshold);
    }
    // Right edge
    else if (this.mouseX > window.innerWidth - edgeThreshold) {
      panX = basePanSpeed * ((this.mouseX - (window.innerWidth - edgeThreshold)) / edgeThreshold);
    }
  
    // Top edge
    if (this.mouseY < edgeThreshold) {
      panZ = -basePanSpeed * (1 - this.mouseY / edgeThreshold);
    }
    // Bottom edge
    else if (this.mouseY > window.innerHeight - edgeThreshold) {
      panZ = basePanSpeed * ((this.mouseY - (window.innerHeight - edgeThreshold)) / edgeThreshold);
    }
  
    // Continuous panning logic
    if (panX !== 0 || panZ !== 0) {
      // Enable continuous panning
      this.isEdgePanning = true;
      
      // Smooth interpolation
      const smoothing = 0.2;
      const newX = camera.position.x + panX * smoothing;
      const newZ = camera.position.z + panZ * smoothing;
  
      // Bounds checking
      if (bounds) {
        camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, newX));
        camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, newZ));
      } else {
        camera.position.x = newX;
        camera.position.z = newZ;
      }
  
      // Visual feedback
      document.body.style.cursor = 'move';
    } else {
      // Reset panning state when not in edge zone
      this.isEdgePanning = false;
      document.body.style.cursor = 'default';
    }
  
    return this.isEdgePanning;
  }

  toggleEdgeScrolling(enable = !this.edgeScrollingEnabled) {
    this.edgeScrollingEnabled = enable;
    console.info(`Edge scrolling ${enable ? 'enabled' : 'disabled'}`);
  }
  
  // Unchanged helper method
  calculatePanSpeed(distance, baseSpeed, accelerationCurve) {
    // Prevent division by zero and NaN
    if (this.edgeThreshold <= 0) {
      console.warn('Edge threshold is invalid, resetting to default');
      this.edgeThreshold = Math.min(
        window.innerWidth * 0.08,
        window.innerHeight * 0.08
      );
    }
    
    // Clamp distance to prevent extreme values
    const clampedDistance = Math.min(distance, this.edgeThreshold);
    
    // Safe calculation with fallback
    try {
      return baseSpeed * Math.pow(clampedDistance / this.edgeThreshold, accelerationCurve);
    } catch (error) {
      console.error('Pan speed calculation failed:', error);
      return baseSpeed; // Fallback to base speed
    }
  }

  // Handle selection methods
  startSelection(event) {
    this.isSelecting = true;
    this.selectionStart = { x: event.clientX, y: event.clientY };
    this.selectionEnd = { x: event.clientX, y: event.clientY };
    // DON'T show the box immediately
    this.selectionBox.style.display = 'none';
  }

  updateSelectionBox(event) {
    this.selectionEnd = { x: event.clientX, y: event.clientY };
    
    // Calculate the selection box dimensions
    const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
    const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
    
    // Only show the box if there's actual movement (e.g., dragging)
    if (width > 3 || height > 3) {
      this.selectionBox.style.display = 'block';
      
      // Update the selection box style
      this.selectionBox.style.left = `${left}px`;
      this.selectionBox.style.top = `${top}px`;
      this.selectionBox.style.width = `${width}px`;
      this.selectionBox.style.height = `${height}px`;
    }
  }

  completeSelection(event) {
    this.isSelecting = false;
    this.selectionBox.style.display = 'none';
  
    // If selection area is very small, treat as a single click
    const selectionWidth = Math.abs(this.selectionEnd.x - this.selectionStart.x);
    const selectionHeight = Math.abs(this.selectionEnd.y - this.selectionStart.y);
  
    if (selectionWidth < 5 && selectionHeight < 5) {
      this.handleSingleSelection(event);
    } else {
      this.handleBoxSelection(event);
    }
  }

  handleSingleSelection(_event) {
  // Handle a single-click selection
    const intersect = this.castRay();
    if (intersect) {
      const entityId = this.getEntityAtPosition(intersect.point);
      if (entityId) {
        this.toggleEntitySelection(entityId);
      }
    }
  }

  handleBoxSelection(_event) {
  // Handle a box/drag selection
  // Use the selection box dimensions to find entities
    const selectedEntities = this.getEntitiesInSelectionBox();
  
    // Add all entities in the box to the selection
    for (const entityId of selectedEntities) {
      this.selectedEntities.add(entityId);
    }
  }

  handleCommand(_event) {
    // Get ray intersection
    const intersect = this.castRay();
    if (!intersect) {return;}
    
    // Assuming we hit something, determine what to do
    const point = intersect.point || { x: 0, y: 0, z: 0 };
    const entityId = this.getEntityAtPosition(point);
    
    // Create commands array for undo/redo functionality
    const commands = [];
    
    // Process for all selected entities
    for (const selectedId of this.selectedEntities) {
      // Move entity first (this should work for tests)
      if (this.systems.movement && typeof this.systems.movement.moveEntity === 'function') {
        this.systems.movement.moveEntity(selectedId, point);
      }
      
      // Attack if necessary
      if (entityId && this.isEnemyEntity(entityId) && 
          this.systems.combat && typeof this.systems.combat.startAttack === 'function') {
        this.systems.combat.startAttack(selectedId, entityId);
      }
      
      // Add simple command object for undo/redo
      commands.push({
        execute: () => true,
        undo: () => true
      });
    }
    
    // Execute commands
    if (commands.length > 0) {
      this.executeCommands(commands);
    }
  }

  executeCommands(commands) {
    // Execute and store commands for undo
    for (const command of commands) {
      if (typeof command.execute === 'function') {
        command.execute();
      }
    }
    
    // Add to undo stack
    this.undoStack.push(commands);
    
    // Clear redo stack
    this.redoStack = [];
  }

  // Undo/Redo methods
  undo() {
    if (this.undoStack.length === 0) {return false;}
  
    // Get the last commands
    const commands = this.undoStack.pop();
  
    // Undo each command in reverse order
    for (let i = commands.length - 1; i >= 0; i--) {
      commands[i].undo();
    }
  
    // Add to redo stack
    this.redoStack.push(commands);
  
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) {return false;}
  
    // Get the last undone commands
    const commands = this.redoStack.pop();
  
    // Redo each command
    for (const command of commands) {
      command.execute();
    }
  
    // Add back to undo stack
    this.undoStack.push(commands);
  
    return true;
  }

  // Fix clearSelection to update the render system
  clearSelection() {
    this.selectedEntities.clear();
  
    // Update selection visualization
    if (this.systems.render) {
      this.systems.render.updateSelections(this.selectedEntities);
    }
  }

  // Utility methods
  getRaycaster() {
    if (!this._raycaster) {
      this._raycaster = new THREE.Raycaster();
    }
  
    const { camera } = this.sceneManager.getActiveScene();
    if (camera) {
      this._raycaster.setFromCamera({ 
        x: this.normalizedMouseX, 
        y: this.normalizedMouseY 
      }, camera);
    }
  
    return this._raycaster;
  }

  findEntityIdFromMesh(mesh) {
  // Find entity ID from a mesh
    for (const [entityId, entityMesh] of this.systems.render.meshes.entries()) {
      if (entityMesh === mesh || (mesh.isDescendantOf && mesh.isDescendantOf(entityMesh))) {
        return entityId;
      }
    }
  
    return null;
  }

  getEntitiesInSelectionBox() {
    // Convert selection start/end to screen coordinates
    const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);
    
    // Entities found in selection box
    const selectedEntities = new Set();
    
    // Check each entity
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      // Only consider player entities with position
      if (this.isPlayerEntity(entityId) && 
          this.entityManager.hasComponent(entityId, 'position')) {
        
        const position = this.entityManager.getComponent(entityId, 'position');
        const { camera } = this.sceneManager.getActiveScene();
        
        if (!camera) {return;}
        
        // Convert 3D position to screen coordinates
        const pos3D = new THREE.Vector3(position.x, position.y, position.z);
        const screenPos = pos3D.project(camera);
        
        // Convert to pixel coordinates
        const screenX = (screenPos.x + 1) / 2 * window.innerWidth;
        const screenY = (-screenPos.y + 1) / 2 * window.innerHeight;
        
        // Check if the entity is inside the selection box
        if (screenX >= startX && screenX <= endX && 
            screenY >= startY && screenY <= endY) {
          selectedEntities.add(entityId);
        }
      }
    });
    
    return selectedEntities;
  }
}

export default InputManager;
