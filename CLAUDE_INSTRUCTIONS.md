I see the issue now. The problem is likely that the `sceneManager` is not properly initialized or passed through the system when the `SelectionIndicator` is created. Let's modify our approach to make it more robust.

In the `RenderSystem`, we'll pass the entire systems context:

```javascript
// In src/entities/systems/RenderSystem.js
constructor(entityManager, sceneManager, modelLoader, systems) {
  this.entityManager = entityManager;
  this.sceneManager = sceneManager;
  this.modelLoader = modelLoader;
  this.systems = systems; // Store the entire systems context
  this.meshes = new Map();
  this.selectionIndicator = null;
}

initialize() {
  const { scene } = this.sceneManager.getActiveScene();
  if (scene) {
    // Pass the entire systems context
    this.selectionIndicator = new SelectionIndicator(scene, this.systems);
  }
}
```

Then update the `SelectionIndicator` to work with this:

```javascript
// In src/utils/SelectionIndicator.js
class SelectionIndicator {
  constructor(scene, systems) {
    this.scene = scene;
    this.systems = systems; // Store systems context
    this.selectionRings = new Map();
    this.createMaterials();
  }

  highlightEnemyTarget(entityId, position, radius = 1.5) {
    // Remove any existing enemy target highlights
    this.removeEnemyTargetHighlight();
    
    // Safety checks
    if (!this.systems || !this.systems.sceneManager) {
      console.error('SceneManager not available for enemy target highlight');
      return null;
    }

    const activeScene = this.systems.sceneManager.getActiveScene();
    if (!activeScene || !activeScene.scene) {
      console.error('No active scene available');
      return null;
    }

    const ringGeometry = new THREE.RingGeometry(radius * 0.9, radius, 32);
    const ring = new THREE.Mesh(ringGeometry, this.enemyTargetingMaterial);
    
    // Position the ring
    ring.position.set(position.x, 0.1, position.z);
    ring.rotation.x = -Math.PI / 2;
    ring.userData.isEnemyTargetIndicator = true;
    
    // Add to scene
    activeScene.scene.add(ring);
    
    return ring;
  }

  removeEnemyTargetHighlight() {
    // Safety checks
    if (!this.systems || !this.systems.sceneManager) {
      console.error('SceneManager not available for removing enemy target highlight');
      return;
    }

    const activeScene = this.systems.sceneManager.getActiveScene();
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
}
```

You'll also need to update the `GameController` to pass the systems context when creating the `RenderSystem`:

```javascript
// In src/core/GameController.js
createSystems() {
  console.log('Creating systems');
  this.systems.render = new RenderSystem(
    this.entityManager, 
    this.sceneManager, 
    this.modelLoader,
    this.systems  // Pass the entire systems context
  );
  // ... rest of the method remains the same
}
```

This approach:
1. Passes the entire systems context to `SelectionIndicator`
2. Allows access to `sceneManager` through the systems context
3. Adds multiple layers of safety checks
4. Provides meaningful error logging
5. Maintains the existing code structure

The key changes are:
- Adding `systems` as a parameter to `RenderSystem` constructor
- Modifying `SelectionIndicator` to use `systems.sceneManager`
- Adding robust error checking and logging

Would you like me to explain the rationale behind this approach further?