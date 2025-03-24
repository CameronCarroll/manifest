import * as THREE from 'three';

const DEBUG = false; // Constant to enable/disable debug logging

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
    this.isAttackMoveMode = false; // Track if we're in attack-move mode
    
    // Middle mouse button panning
    this.isMiddleMouseDown = false;
    this.middleMouseStart = { x: 0, y: 0 };
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.isPanning = false;

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

    // Middle mouse button - camera panning
    if (event.button === 1) {
      // Prevent default browser behavior (often page scrolling with middle mouse)
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      
      // Set middle mouse button state
      this.isMiddleMouseDown = true;
      this.isPanning = true;
      
      // Store initial position for calculating deltas
      this.middleMouseStart = { x: event.clientX, y: event.clientY };
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      
      // Change cursor to indicate panning mode
      document.body.style.cursor = 'grabbing';
      
      return;
    }

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
          // Highlight the enemy target with the selection indicator ring
          if (this.systems.render && this.systems.render.selectionIndicator) {
            const enemyPos = this.entityManager.getComponent(clickedEntityId, 'position');
            this.systems.render.selectionIndicator.highlightEnemyTarget(
              clickedEntityId, 
              enemyPos
            );
          }
          // Prevent animations from appearing when just targeting
          if (this.systems.animation) {
            const animSystem = this.systems.animation;
            // Store the original methods
            const originalStartAttackAnimation = animSystem.startAttackAnimation;
            
            // Temporarily override to prevent animations
            animSystem.startAttackAnimation = (attackerId, targetId) => {
              // Pass isTargeting=true to prevent animations
              return originalStartAttackAnimation.call(animSystem, attackerId, targetId, true);
            };
            
            // Issue the attack command
            this.issueAttackCommand(clickedEntityId);
            
            // Restore the original methods
            animSystem.startAttackAnimation = originalStartAttackAnimation;
          } else {
            this.issueAttackCommand(clickedEntityId);
          }
        } else {
          // If in attack-move mode, issue attack-move command
          if (this.isAttackMoveMode) {
            this.issueAttackMoveCommand(intersect.point);
            this.toggleAttackMoveMode(false); // Turn off attack-move mode after use
          } else {
            // Otherwise issue move command to the clicked position
            this.issueMoveCommand(intersect.point);
          }
        }
      }
      
      return;
    }

    // Left click - selection or attack-move if in attack-move mode
    if (event.button === 0) {
      // If in attack-move mode, issue attack-move command instead of selection
      if (this.isAttackMoveMode) {
        const intersect = this.castRay();
        if (intersect) {
          // Check if we clicked on an enemy entity
          const clickedEntityId = this.getEntityAtPosition(intersect.point);
          
          // If we clicked on an enemy entity, issue attack command
          if (clickedEntityId && this.isEnemyEntity(clickedEntityId)) {
            // Highlight the enemy target with the selection indicator ring
            if (this.systems.render && this.systems.render.selectionIndicator) {
              const enemyPos = this.entityManager.getComponent(clickedEntityId, 'position');
              this.systems.render.selectionIndicator.highlightEnemyTarget(
                clickedEntityId, 
                enemyPos
              );
            }
            this.issueAttackCommand(clickedEntityId);
          } else {
            // Issue attack-move command
            this.issueAttackMoveCommand(intersect.point);
          }
          this.toggleAttackMoveMode(false); // Turn off attack-move mode after use
          return;
        }
      }
      
      // Regular selection behavior when not in attack-move mode
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

    // Handle middle mouse button camera panning
    if (this.isMiddleMouseDown && this.isPanning) {
      // Calculate movement delta
      const deltaX = this.mouseX - this.lastMouseX;
      const deltaY = this.mouseY - this.lastMouseY;
      
      // Update last position for next frame
      this.lastMouseX = this.mouseX;
      this.lastMouseY = this.mouseY;
      
      // Apply camera movement (invert direction for natural feel)
      if (this.sceneManager && this.sceneManager.camera) {
        const camera = this.sceneManager.camera;
        const cameraMoveSpeed = 0.15; // Reduced by 25% from 0.2
        
        // Move camera based on mouse drag (invert deltaX and deltaY for natural feel)
        camera.position.x -= deltaX * cameraMoveSpeed;
        camera.position.z -= deltaY * cameraMoveSpeed;
        
        // Apply camera bounds if they exist
        const bounds = this.sceneManager.cameraBounds;
        if (bounds) {
          camera.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, camera.position.x));
          camera.position.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, camera.position.z));
        }
      }
      
      // Prevent default behavior to avoid text selection during drag
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
      
      return;
    }

    // Check for edge panning
    this.checkEdgePanning();
  }

  onMouseUp(event) {
    // Left mouse button release
    if (event.button === 0) {
      this.isMouseDown = false;

      if (this.isSelecting) {
        this.completeSelection(event);
      }
    }
    
    // Middle mouse button release
    if (event.button === 1) {
      this.isMiddleMouseDown = false;
      this.isPanning = false;
      
      // Reset cursor
      if (this.isAttackMoveMode) {
        document.body.style.cursor = 'crosshair'; // Maintain attack-move cursor
      } else {
        document.body.style.cursor = 'default';
      }
    }
  }

  // Update the onKeyDown method
  // Add this to InputManager.js onKeyDown method
  onKeyDown(event) {
  // Handle keyboard shortcuts
    if (event.key === 'z' && event.ctrlKey) {
      this.undo();
    } else if (event.key === 'y' && event.ctrlKey) {
      this.redo();
    } else if (event.key === 'Escape') {
      this.clearSelection();
      this.toggleAttackMoveMode(false); // Ensure attack-move is off
    } else if (event.key === 'a' && event.shiftKey) {
      this.selectAllPlayerUnits();
    } else if (event.key === 'a' && !event.shiftKey) {
    // Toggle attack-move mode with 'a' key
      this.toggleAttackMoveMode();
    } else if (event.key === 's') {
      this.stopSelectedUnits();
    } // In InputManager.js - onKeyDown method
    else if (event.key === 'c' && event.ctrlKey) {
      console.log('Ctrl+C detected - attempting to toggle collision debug');
      
      // Use window.game to access the game controller
      if (window.game && window.game.gameController) {
        console.log('Using window.game.gameController');
        window.game.gameController.toggleCollisionDebug();
      } else {
        console.error('Cannot find game controller reference in window.game');
        console.log('Available systems:', this.systems);
      }
    }
  // Arrow keys are handled by SceneManager's smooth camera movement system
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
    if (DEBUG) {
      console.log('Toggling entity selection', {
        entityId,
        isPlayerEntity: this.isPlayerEntity(entityId),
        currentSelection: Array.from(this.selectedEntities)
      });
    }

    // Only select player entities
    if (!this.isPlayerEntity(entityId)) {
      if (DEBUG) {
        console.log('Not a player entity, skipping selection');
      }
      return;
    }

    if (this.selectedEntities.has(entityId)) {
      this.selectedEntities.delete(entityId);
    } else {
      this.selectedEntities.add(entityId);
    }

    if (DEBUG) {
      console.log('After selection', {
        selectedEntities: Array.from(this.selectedEntities)
      });
    }

    // Update selection visualization through selectionIndicator
    if (this.systems.render && this.systems.render.selectionIndicator) {
      this.systems.render.selectionIndicator.updateSelectionRings(
        this.selectedEntities, 
        this.entityManager
      );
    }
  }

  handleSingleSelection(_event) {
    if (DEBUG) {
      console.log('Handling single selection');
    }

    // Handle a single-click selection
    const intersect = this.castRay();
    if (DEBUG && intersect) {
      console.log('Ray cast intersect', intersect);
    }

    if (intersect) {
      const entityId = this.getEntityAtPosition(intersect.point);
      if (DEBUG && entityId) {
        console.log('Entity at position', {
          entityId,
          point: intersect.point
        });
      }

      if (entityId) {
        this.toggleEntitySelection(entityId);
      }
    }
  }

  // Also modify the method that checks if an entity is a player entity
  isPlayerEntity(entityId) {
    if (DEBUG) {
      console.log('Checking player entity', {
        entityId,
        hasComponent: this.entityManager.hasComponent(entityId, 'faction')
      });
    }

    if (this.entityManager.hasComponent(entityId, 'faction')) {
      const factionComponent = this.entityManager.getComponent(entityId, 'faction');
      if (DEBUG) {
        console.log('Faction component', factionComponent);
      }
      return factionComponent.faction === 'player';
    }
    return false;
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

    // Update selection visualization through selectionIndicator
    if (this.systems.render && this.systems.render.selectionIndicator) {
      this.systems.render.selectionIndicator.updateSelectionRings(
        this.selectedEntities, 
        this.entityManager
      );
    }
  }

  issueMoveCommand(position) {
    // Skip if no units selected
    if (this.selectedEntities.size === 0) {return;}
    
    // Calculate formation positions based on number of selected units
    const formationPositions = this.calculateFormationPositions(
      Array.from(this.selectedEntities), 
      position
    );
    
    // Progressive assignment - units that are already close to their assigned positions
    // can be given priority to take those positions
    const entityPositions = [];
    const assignments = new Map();
    
    // Gather current positions of all selected entities
    for (const entityId of this.selectedEntities) {
      if (this.entityManager.hasComponent(entityId, 'position')) {
        const currentPos = this.entityManager.getComponent(entityId, 'position');
        entityPositions.push({
          entityId,
          position: currentPos,
          // Get unit type priority for sorting
          priority: this.getUnitTypePriority(entityId)
        });
      }
    }
    
    // First, assign positions to units based on their current proximity
    for (const entity of entityPositions) {
      // Find best position for this unit
      let bestPosition = null;
      let bestDistance = Infinity;
      
      for (let i = 0; i < formationPositions.length; i++) {
        const formationPos = formationPositions[i];
        if (!assignments.has(i)) { // If position not yet assigned
          const dx = formationPos.x - entity.position.x;
          const dz = formationPos.z - entity.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPosition = i;
          }
        }
      }
      
      // Assign this position
      if (bestPosition !== null) {
        assignments.set(bestPosition, entity.entityId);
      }
    }
    
    // Now ensure all units are assigned a position, prioritizing unit types for any remaining positions
    const sortedEntities = [...this.selectedEntities].sort((a, b) => {
      return this.getUnitTypePriority(a) - this.getUnitTypePriority(b);
    });
    
    // For any units not yet assigned, give them remaining positions
    for (const entityId of sortedEntities) {
      // Skip already assigned units
      if (Array.from(assignments.values()).includes(entityId)) {
        continue;
      }
      
      // Find first available position
      for (let i = 0; i < formationPositions.length; i++) {
        if (!assignments.has(i)) {
          assignments.set(i, entityId);
          break;
        }
      }
    }
    
    // Issue move commands based on assignments
    for (const [positionIndex, entityId] of assignments.entries()) {
      if (this.entityManager.hasComponent(entityId, 'position')) {
        // If we have a combat system, stop any attacks
        if (this.systems.combat) {
          this.systems.combat.stopAttack(entityId);
        }
  
        // Get the assigned formation position
        const formationPos = formationPositions[positionIndex];
        
        // Calculate formation offset for memory
        const formationOffset = {
          x: formationPos.x - position.x,
          z: formationPos.z - position.z
        };
        
        // Move entity with formation offset for memory
        this.systems.movement.moveEntity(entityId, formationPos, 5, null, false, formationOffset);
      }
    }
  }
  
  // Helper method to get unit type priority for sorting
  getUnitTypePriority(entityId) {
    if (this.entityManager.hasComponent(entityId, 'faction')) {
      const faction = this.entityManager.getComponent(entityId, 'faction');
      const typePriority = {
        'tank': 0,
        'assault': 1, 
        'sniper': 2,
        'support': 3
      };
      
      return typePriority[faction?.unitType] || 999;
    }
    return 999;
  }

  // Calculate formation positions for a group of units
  calculateFormationPositions(selectedEntities, centerPosition) {
    const positions = [];
    const unitCount = selectedEntities.length;
  
    // Single unit - just send to the target position
    if (unitCount === 1) {
      positions.push({ ...centerPosition });
      return positions;
    }
    
    // Sort entities by type for positioning preference
    const sortedEntities = [...selectedEntities].sort((a, b) => {
      const factionA = this.entityManager.getComponent(a, 'faction');
      const factionB = this.entityManager.getComponent(b, 'faction');
      
      // Define unit type priority (lower number = closer to front)
      const typePriority = {
        'tank': 0,
        'assault': 1, 
        'sniper': 2,
        'support': 3
      };
      
      const priorityA = typePriority[factionA?.unitType] || 999;
      const priorityB = typePriority[factionB?.unitType] || 999;
      
      return priorityA - priorityB;
    });
  
    // Small formations (2-4 units) - simple pattern
    if (unitCount <= 4) {
      const spacing = 2; // Units of spacing between units
      const offset = spacing / 2;
    
      // Position units in a small square/rectangle
      for (let i = 0; i < unitCount; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        positions.push({
          x: centerPosition.x + (col * spacing - offset),
          y: centerPosition.y,
          z: centerPosition.z + (row * spacing - offset)
        });
      }
      return positions;
    }
  
    // Larger formations - use circular or grid pattern
    const spacing = 2;
  
    // Number of rings needed to fit all units
    let ringCount = 1;
    let capacity = 1;
    while (capacity < unitCount) {
      ringCount++;
      // Each ring holds approximately 2πr units at spacing distance
      capacity += Math.floor(2 * Math.PI * ringCount);
    }
  
    // First, add the center position
    positions.push({ ...centerPosition });
  
    // Then add positions in concentric rings
    let remaining = unitCount - 1;
    for (let ring = 1; ring <= ringCount && remaining > 0; ring++) {
      // Calculate how many units fit in this ring
      const unitsInRing = Math.min(Math.floor(2 * Math.PI * ring), remaining);
    
      // Add units evenly spaced around the ring
      for (let i = 0; i < unitsInRing && remaining > 0; i++) {
        const angle = (i / unitsInRing) * 2 * Math.PI;
        positions.push({
          x: centerPosition.x + Math.cos(angle) * ring * spacing,
          y: centerPosition.y,
          z: centerPosition.z + Math.sin(angle) * ring * spacing
        });
        remaining--;
      }
    }
  
    return positions;
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
    
    // Skip selection if in attack-move mode (handled by onMouseDown)
    if (this.isAttackMoveMode) {
      return;
    }

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
    if (DEBUG) {
      console.log('Handling box selection');
    }

    // Handle a box/drag selection
    const selectedEntities = this.getEntitiesInSelectionBox();

    if (DEBUG) {
      console.log('Entities in selection box', {
        count: selectedEntities.size,
        entities: Array.from(selectedEntities)
      });
    }

    // Add all entities in the box to the selection
    for (const entityId of selectedEntities) {
      if (DEBUG) {
        console.log('Adding entity to selection', {
          entityId,
          isPlayerEntity: this.isPlayerEntity(entityId)
        });
      }
      this.selectedEntities.add(entityId);
    }

    if (DEBUG) {
      console.log('Final selected entities', {
        selectedEntities: Array.from(this.selectedEntities)
      });
    }

    // Update selection visualization through selectionIndicator
    if (this.systems.render && this.systems.render.selectionIndicator) {
      this.systems.render.selectionIndicator.updateSelectionRings(
        this.selectedEntities, 
        this.entityManager
      );
    } else if (DEBUG) {
      console.warn('Selection indicator not available for box selection');
    }
  }

  handleCommand(_event) {
    // Get ray intersection
    const intersect = this.castRay();
    if (!intersect) {return;}

    // Assuming we hit something, determine what to do
    const point = intersect.point || { x: 0, y: 0, z: 0 };
    const entityId = this.getEntityAtPosition(point);

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

    // Update selection visualization through selectionIndicator
    if (this.systems.render && this.systems.render.selectionIndicator) {
      this.systems.render.selectionIndicator.updateSelectionRings(
        this.selectedEntities, 
        this.entityManager
      );
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
    if (DEBUG) {
      console.log('Getting entities in selection box', {
        start: this.selectionStart,
        end: this.selectionEnd
      });
    }

    // Convert selection start/end to screen coordinates
    const startX = Math.min(this.selectionStart.x, this.selectionEnd.x);
    const startY = Math.min(this.selectionStart.y, this.selectionEnd.y);
    const endX = Math.max(this.selectionStart.x, this.selectionEnd.x);
    const endY = Math.max(this.selectionStart.y, this.selectionEnd.y);

    if (DEBUG) {
      console.log('Selection box coordinates', {
        startX, startY, endX, endY
      });
    }

    // Entities found in selection box
    const selectedEntities = new Set();

    // Check each entity
    this.entityManager.gameState.entities.forEach((entity, entityId) => {
      if (DEBUG) {
        console.log('Checking entity', {
          entityId,
          hasPosition: this.entityManager.hasComponent(entityId, 'position'),
          isPlayerEntity: this.isPlayerEntity(entityId)
        });
      }

      // Only consider player entities with position
      if (this.isPlayerEntity(entityId) &&
          this.entityManager.hasComponent(entityId, 'position')) {

        const position = this.entityManager.getComponent(entityId, 'position');
        const { camera } = this.sceneManager.getActiveScene();

        if (!camera) {
          console.warn('No camera available for projection');
          return;
        }

        // Convert 3D position to screen coordinates
        const pos3D = new THREE.Vector3(position.x, position.y, position.z);
        const screenPos = pos3D.project(camera);

        if (DEBUG) {
          console.log('Entity projection', {
            entityId,
            position,
            screenPos: {
              x: screenPos.x,
              y: screenPos.y
            }
          });
        }

        // Convert to pixel coordinates
        const screenX = (screenPos.x + 1) / 2 * window.innerWidth;
        const screenY = (-screenPos.y + 1) / 2 * window.innerHeight;

        if (DEBUG) {
          console.log('Screen coordinates', {
            screenX,
            screenY,
            inBox: screenX >= startX && screenX <= endX &&
                   screenY >= startY && screenY <= endY
          });
        }

        // Check if the entity is inside the selection box
        if (screenX >= startX && screenX <= endX &&
            screenY >= startY && screenY <= endY) {
          selectedEntities.add(entityId);
        }
      }
    });

    return selectedEntities;
  }

  // Toggle attack-move mode
  toggleAttackMoveMode(enable = !this.isAttackMoveMode) {
    this.isAttackMoveMode = enable;
  
    // Change cursor
    document.body.style.cursor = this.isAttackMoveMode ? 'crosshair' : 'default';
  
    // Show/hide attack-move indicator
    this.updateAttackMoveIndicator();
  
    console.log(`Attack-move mode ${enable ? 'enabled' : 'disabled'}`);
  }
  // Update the attack-move indicator UI
  updateAttackMoveIndicator() {
  // Get or create the indicator element
    let indicator = document.getElementById('attack-move-indicator');
  
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'attack-move-indicator';
      indicator.style.position = 'absolute';
      indicator.style.bottom = '50px';
      indicator.style.left = '50%';
      indicator.style.transform = 'translateX(-50%)';
      indicator.style.backgroundColor = 'rgba(255, 0, 0, 0.6)';
      indicator.style.color = 'white';
      indicator.style.padding = '5px 15px';
      indicator.style.borderRadius = '5px';
      indicator.style.fontWeight = 'bold';
      indicator.style.zIndex = '100';
      indicator.style.pointerEvents = 'none';
      document.body.appendChild(indicator);
    }
  
    if (this.isAttackMoveMode) {
      indicator.textContent = '⚔️ ATTACK-MOVE (CLICK TO ENGAGE) ⚔️';
      indicator.style.display = 'block';
    } else {
      indicator.style.display = 'none';
    }
  }

  // Issue attack-move command
  issueAttackMoveCommand(position) {
    // Skip if no units selected
    if (this.selectedEntities.size === 0) {return;}
    
    // Calculate formation positions based on number of selected units
    const formationPositions = this.calculateFormationPositions(
      Array.from(this.selectedEntities), 
      position
    );
    
    // Use same progressive assignment logic as in issueMoveCommand
    const entityPositions = [];
    const assignments = new Map();
    
    // Gather current positions of all selected entities
    for (const entityId of this.selectedEntities) {
      if (this.entityManager.hasComponent(entityId, 'position')) {
        const currentPos = this.entityManager.getComponent(entityId, 'position');
        entityPositions.push({
          entityId,
          position: currentPos,
          priority: this.getUnitTypePriority(entityId)
        });
      }
    }
    
    // First, assign positions to units based on their current proximity
    for (const entity of entityPositions) {
      // Find best position for this unit
      let bestPosition = null;
      let bestDistance = Infinity;
      
      for (let i = 0; i < formationPositions.length; i++) {
        const formationPos = formationPositions[i];
        if (!assignments.has(i)) { // If position not yet assigned
          const dx = formationPos.x - entity.position.x;
          const dz = formationPos.z - entity.position.z;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestPosition = i;
          }
        }
      }
      
      // Assign this position
      if (bestPosition !== null) {
        assignments.set(bestPosition, entity.entityId);
      }
    }
    
    // Now ensure all units are assigned a position, prioritizing unit types for any remaining positions
    const sortedEntities = [...this.selectedEntities].sort((a, b) => {
      return this.getUnitTypePriority(a) - this.getUnitTypePriority(b);
    });
    
    // For any units not yet assigned, give them remaining positions
    for (const entityId of sortedEntities) {
      // Skip already assigned units
      if (Array.from(assignments.values()).includes(entityId)) {
        continue;
      }
      
      // Find first available position
      for (let i = 0; i < formationPositions.length; i++) {
        if (!assignments.has(i)) {
          assignments.set(i, entityId);
          break;
        }
      }
    }
    
    // Issue attack-move commands based on assignments
    for (const [positionIndex, entityId] of assignments.entries()) {
      if (this.entityManager.hasComponent(entityId, 'position')) {
        // If we have a combat system, stop any attacks
        if (this.systems.combat) {
          this.systems.combat.stopAttack(entityId);
        }
  
        // Get the assigned formation position
        const formationPos = formationPositions[positionIndex];
        
        // Calculate formation offset for memory
        const formationOffset = {
          x: formationPos.x - position.x,
          z: formationPos.z - position.z
        };
        
        // Move the entity with attack-move flag
        if (this.systems.movement) {
          this.systems.movement.moveEntity(entityId, formationPos, 5, null, true, formationOffset); // Include attackMove flag and formation offset
        }
      }
    }
  }

}

export default InputManager;