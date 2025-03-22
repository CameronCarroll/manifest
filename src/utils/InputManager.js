import * as THREE from 'three';

// Command Pattern implementation
class Command {
  constructor() {}
  execute() {}
  undo() {}
}

class MoveCommand extends Command {
  constructor(entityId, destination, movementSystem) {
    super();
    this.entityId = entityId;
    this.destination = destination;
    this.movementSystem = movementSystem;
    this.previousPosition = null;
  }

  execute() {
    const entityManager = this.movementSystem.entityManager;
    const positionComponent = entityManager.getComponent(this.entityId, 'position');
    
    if (positionComponent) {
      this.previousPosition = { ...positionComponent };
      this.movementSystem.moveEntity(this.entityId, this.destination);
      return true;
    }
    return false;
  }

  undo() {
    if (this.previousPosition) {
      const entityManager = this.movementSystem.entityManager;
      const positionComponent = entityManager.getComponent(this.entityId, 'position');
      
      if (positionComponent) {
        this.movementSystem.stopEntity(this.entityId);
        Object.assign(positionComponent, this.previousPosition);
        return true;
      }
    }
    return false;
  }
}

class InputManager {
  constructor(entityManager, sceneManager, systems) {
    this.entityManager = entityManager;
    this.sceneManager = sceneManager;
    this.systems = systems;
    this.selectedEntities = new Set();
    this.commandHistory = [];
    this.undoStack = [];
    this.redoStack = [];
    this.maxHistorySize = 50;
    
    // Mouse position tracking
    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseDown = false;
    this.selectionStart = { x: 0, y: 0 };
    this.selectionEnd = { x: 0, y: 0 };
    this.isSelecting = false;
    
    // Screen edge panning
    this.edgePanThreshold = 20; // Pixels from edge to start panning
    this.edgePanSpeed = 15; // Speed of edge panning
    this.isEdgePanning = false;
    
    // Selection box visuals
    this.selectionBox = document.createElement('div');
    this.selectionBox.style.position = 'absolute';
    this.selectionBox.style.border = '1px solid #39ff14';
    this.selectionBox.style.backgroundColor = 'rgba(57, 255, 20, 0.1)';
    this.selectionBox.style.pointerEvents = 'none';
    this.selectionBox.style.display = 'none';
    document.body.appendChild(this.selectionBox);
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    const canvas = this.sceneManager.renderer.domElement;
    
    // Mouse movement
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Mouse clicks
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Prevent context menu on right-click
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    
    // Keyboard inputs
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  onMouseMove(event) {
    // Track mouse position for various interactions
    this.mouseX = event.clientX;
    this.mouseY = event.clientY;
    
    // Normalized mouse position for raycasting
    this.normalizedMouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.normalizedMouseY = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Check for edge panning
    this.checkEdgePanning();
    
    // Update selection box if selecting
    if (this.isSelecting) {
      this.updateSelectionBox(event);
    }
  }

  onMouseDown(event) {
    this.isMouseDown = true;
    
    // Start selection or command
    if (event.button === 0) { // Left click
      this.startSelection(event);
    } else if (event.button === 2) { // Right click
      this.handleCommand(event);
    }
  }

  onMouseUp(event) {
    this.isMouseDown = false;
    
    if (event.button === 0) { // Left click
      this.completeSelection(event);
    }
  }

  onKeyDown(event) {
    // Handle keyboard shortcuts
    switch (event.key) {
      case 'z':
        if (event.ctrlKey || event.metaKey) {
          this.undo();
        }
        break;
      case 'y':
        if (event.ctrlKey || event.metaKey) {
          this.redo();
        }
        break;
      case 'Escape':
        this.clearSelection();
        break;
    }
  }

  startSelection(event) {
    this.selectionStart = { x: event.clientX, y: event.clientY };
    this.selectionEnd = { x: event.clientX, y: event.clientY };
    this.isSelecting = true;
    
    // Show and position selection box
    this.selectionBox.style.display = 'block';
    this.updateSelectionBox(event);
  }

  updateSelectionBox(event) {
    this.selectionEnd = { x: event.clientX, y: event.clientY };
    
    // Calculate box position and dimensions
    const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const width = Math.abs(this.selectionEnd.x - this.selectionStart.x);
    const height = Math.abs(this.selectionEnd.y - this.selectionStart.y);
    
    // Apply to DOM element
    this.selectionBox.style.left = `${left}px`;
    this.selectionBox.style.top = `${top}px`;
    this.selectionBox.style.width = `${width}px`;
    this.selectionBox.style.height = `${height}px`;
  }

  completeSelection(event) {
    if (!this.isSelecting) return;
    
    this.isSelecting = false;
    this.selectionBox.style.display = 'none';
    
    // Check if it was a small movement (click) or a drag (box selection)
    const dragDistance = Math.sqrt(
      Math.pow(this.selectionStart.x - this.selectionEnd.x, 2) + 
      Math.pow(this.selectionStart.y - this.selectionEnd.y, 2)
    );
    
    if (dragDistance < 5) {
      // Single click selection
      this.handleSingleSelection(event);
    } else {
      // Box selection
      this.handleBoxSelection();
    }
  }

  handleSingleSelection(event) {
    // Raycasting for single entity selection
    const raycaster = this.getRaycaster();
    const activeScene = this.sceneManager.getActiveScene();
    
    if (!activeScene) return;
    
    const { scene } = activeScene;
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
      // Find the entity ID associated with the mesh
      const entityId = this.findEntityIdFromMesh(intersects[0].object);
      
      if (entityId !== null) {
        // Check if Shift key is pressed for multi-selection
        if (!event.shiftKey) {
          this.clearSelection();
        }
        
        this.selectedEntities.add(entityId);
        this.highlightSelectedEntity(entityId);
        console.log(`Selected entity: ${entityId}`);
      } else if (!event.shiftKey) {
        this.clearSelection();
      }
    } else if (!event.shiftKey) {
      this.clearSelection();
    }
  }

  handleBoxSelection() {
    // Convert selection box to normalized device coordinates
    const left = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const right = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const top = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const bottom = Math.max(this.selectionStart.y, this.selectionEnd.y);
    
    const normalized = {
      left: (left / window.innerWidth) * 2 - 1,
      right: (right / window.innerWidth) * 2 - 1,
      top: -(top / window.innerHeight) * 2 + 1,
      bottom: -(bottom / window.innerHeight) * 2 + 1
    };
    
    // Get all entities with position and render components
    const selectableEntities = [];
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (this.entityManager.hasComponent(entityId, 'position') && 
          this.entityManager.hasComponent(entityId, 'render')) {
        selectableEntities.push(entityId);
      }
    });
    
    // Clear previous selection unless shift is pressed
    if (!event.shiftKey) {
      this.clearSelection();
    }
    
    // Check each entity if it's inside the selection box
    const camera = this.sceneManager.camera;
    for (const entityId of selectableEntities) {
      const position = this.entityManager.getComponent(entityId, 'position');
      
      // Convert world position to screen position
      const worldPos = new THREE.Vector3(position.x, position.y, position.z);
      const screenPos = worldPos.project(camera);
      
      // Check if the entity is inside the selection box
      if (screenPos.x >= normalized.left && screenPos.x <= normalized.right &&
          screenPos.y >= normalized.bottom && screenPos.y <= normalized.top) {
        this.selectedEntities.add(entityId);
        this.highlightSelectedEntity(entityId);
      }
    }
    
    console.log(`Selected ${this.selectedEntities.size} entities`);
  }

  highlightSelectedEntity(entityId) {
    // Update selection indicators
    if (this.systems.render) {
      this.systems.render.updateSelections(this.selectedEntities);
    }
  }

  handleCommand(event) {
    // Create and execute a command based on current selection and click location
    if (this.selectedEntities.size === 0) return;
    
    const raycaster = this.getRaycaster();
    const activeScene = this.sceneManager.getActiveScene();
    
    if (!activeScene) return;
    
    // Find the point on the ground plane where the user clicked
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const mouse = new THREE.Vector2(this.normalizedMouseX, this.normalizedMouseY);
    const destination = new THREE.Vector3();
    
    raycaster.setFromCamera(mouse, activeScene.camera);
    raycaster.ray.intersectPlane(groundPlane, destination);
    
    // Create and execute move commands for all selected entities
    const movementSystem = this.systems.movement;
    
    if (movementSystem) {
      const commands = [];
      
      for (const entityId of this.selectedEntities) {
        const command = new MoveCommand(entityId, destination, movementSystem);
        if (command.execute()) {
          commands.push(command);
        }
      }
      
      if (commands.length > 0) {
        this.executeCommands(commands);
      }
    }
  }

  checkEdgePanning() {
    // Check if mouse is near screen edge for camera panning
    this.isEdgePanning = false;
    const panDirection = { x: 0, z: 0 };
    
    if (this.mouseX < this.edgePanThreshold) {
      panDirection.x = -1; // Pan left
      this.isEdgePanning = true;
    } else if (this.mouseX > window.innerWidth - this.edgePanThreshold) {
      panDirection.x = 1; // Pan right
      this.isEdgePanning = true;
    }
    
    if (this.mouseY < this.edgePanThreshold) {
      panDirection.z = -1; // Pan up
      this.isEdgePanning = true;
    } else if (this.mouseY > window.innerHeight - this.edgePanThreshold) {
      panDirection.z = 1; // Pan down
      this.isEdgePanning = true;
    }
    
    // Normalize diagonal panning
    if (panDirection.x !== 0 && panDirection.z !== 0) {
      const length = Math.sqrt(panDirection.x * panDirection.x + panDirection.z * panDirection.z);
      panDirection.x /= length;
      panDirection.z /= length;
    }
    
    if (this.isEdgePanning) {
      // Apply edge panning to camera
      const camera = this.sceneManager.camera;
      if (camera) {
        const cameraBounds = this.sceneManager.cameraBounds;
        
        camera.position.x += panDirection.x * this.edgePanSpeed * 0.1;
        camera.position.z += panDirection.z * this.edgePanSpeed * 0.1;
        
        // Apply bounds
        camera.position.x = Math.max(cameraBounds.minX, Math.min(cameraBounds.maxX, camera.position.x));
        camera.position.z = Math.max(cameraBounds.minZ, Math.min(cameraBounds.maxZ, camera.position.z));
      }
    }
  }

  getRaycaster() {
    if (!this._raycaster) {
      this._raycaster = new THREE.Raycaster();
    }
    
    const mouse = new THREE.Vector2(this.normalizedMouseX, this.normalizedMouseY);
    this._raycaster.setFromCamera(mouse, this.sceneManager.camera);
    
    return this._raycaster;
  }

  findEntityIdFromMesh(mesh) {
    // Find entity ID from mesh
    const renderSystem = this.systems.render;
    
    if (renderSystem) {
      for (const [entityId, entityMesh] of renderSystem.meshes.entries()) {
        if (mesh === entityMesh || mesh.isDescendantOf(entityMesh)) {
          return entityId;
        }
      }
    }
    
    return null;
  }

  clearSelection() {
    this.selectedEntities.clear();
    
    // Update visual selection indicators
    if (this.systems.render) {
      this.systems.render.updateSelections(this.selectedEntities);
    }
    
    console.log('Selection cleared');
  }

  executeCommands(commands) {
    this.undoStack.push(commands);
    this.redoStack = [];
    
    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  undo() {
    if (this.undoStack.length === 0) return false;
    
    const commands = this.undoStack.pop();
    
    // Undo commands in reverse order
    for (let i = commands.length - 1; i >= 0; i--) {
      commands[i].undo();
    }
    
    this.redoStack.push(commands);
    return true;
  }

  redo() {
    if (this.redoStack.length === 0) return false;
    
    const commands = this.redoStack.pop();
    
    // Redo commands in original order
    for (let i = 0; i < commands.length; i++) {
      commands[i].execute();
    }
    
    this.undoStack.push(commands);
    return true;
  }

  // Add helper method for THREE.js
  isDescendantOf(child, parent) {
    let current = child;
    while (current !== null && current !== undefined) {
      if (current === parent) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }
}

export default InputManager;