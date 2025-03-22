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
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    const canvas = this.sceneManager.renderer.domElement;
    
    // Mouse movement
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    
    // Mouse clicks
    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    
    // Keyboard inputs
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  onMouseMove(event) {
    // Track mouse position for various interactions
    this.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
  }

  onMouseDown(event) {
    // Handle selection or command initiation
    if (event.button === 0) { // Left click
      this.handleSelection(event);
    } else if (event.button === 2) { // Right click
      this.handleCommand(event);
    }
  }

  onMouseUp(event) {
    // Complete drag operations if needed
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

  handleSelection(event) {
    // Perform raycasting to select entities
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
        console.log(`Selected entity: ${entityId}`);
      } else {
        if (!event.shiftKey) {
          this.clearSelection();
        }
      }
    } else {
      if (!event.shiftKey) {
        this.clearSelection();
      }
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
    const mouse = new THREE.Vector2(this.mouseX, this.mouseY);
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

  getRaycaster() {
    if (!this._raycaster) {
      this._raycaster = new THREE.Raycaster();
    }
    
    const mouse = new THREE.Vector2(this.mouseX, this.mouseY);
    this._raycaster.setFromCamera(mouse, this.sceneManager.camera);
    
    return this._raycaster;
  }

  findEntityIdFromMesh(mesh) {
    // Find entity ID from mesh
    // This would need to be implemented based on how you associate meshes with entities
    const renderSystem = this.systems.render;
    
    if (renderSystem) {
      for (const [entityId, entityMesh] of renderSystem.meshes.entries()) {
        if (mesh === entityMesh || mesh.parent === entityMesh) {
          return entityId;
        }
      }
    }
    
    return null;
  }

  clearSelection() {
    this.selectedEntities.clear();
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
}

export default InputManager;
