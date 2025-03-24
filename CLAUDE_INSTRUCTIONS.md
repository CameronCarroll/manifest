You're right to be concerned about performance. Fog of war is notoriously expensive, especially when implemented with a dynamic canvas-based approach. Let's optimize it to maintain good performance:

## Performance Optimizations for Fog of War

Here's a more efficient implementation focusing on key performance bottlenecks:

```javascript
// Replace the updateFogOfWar method with this optimized version
updateFogOfWar(deltaTime) {
  // Skip if fog of war is disabled or not initialized
  if (!this.fogOfWar || !this.fogContext) return;
  
  // Update timer and skip if it's not time to update yet - increase interval for better performance
  this.fogUpdateTimer += deltaTime;
  if (this.fogUpdateTimer < this.fogOptions.updateFrequency) return;
  this.fogUpdateTimer = 0;
  
  // Use a downscaled version of the fog canvas for processing
  // This is the key optimization - we'll work on a smaller canvas
  if (!this.lowResFogCanvas) {
    // Create a lower resolution canvas for processing (1/4 the resolution)
    this.lowResFogCanvas = document.createElement('canvas');
    this.lowResFogCanvas.width = this.fogCanvas.width / 4;
    this.lowResFogCanvas.height = this.fogCanvas.height / 4;
    this.lowResFogContext = this.lowResFogCanvas.getContext('2d');
  }
  
  // Clear the low-res canvas or start with unexplored fog
  if (!this.fogOptions.rememberExplored) {
    this.lowResFogContext.fillStyle = 'black';
    this.lowResFogContext.fillRect(0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height);
  } else if (!this.lastFogUpdate) {
    // On first update, copy from the main canvas (scaled down)
    this.lowResFogContext.drawImage(
      this.fogCanvas, 
      0, 0, this.fogCanvas.width, this.fogCanvas.height,
      0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height
    );
  }
  
  // Get visible player units only - limit the number we process each frame
  const playerUnits = [];
  let processedUnits = 0;
  const maxUnitsPerFrame = 5; // Limit how many units we process each frame
  
  this.entityManager.gameState.entities.forEach((entity, entityId) => {
    if (processedUnits >= maxUnitsPerFrame) return;
    
    if (this.isPlayerEntity(entityId) && 
        this.entityManager.hasComponent(entityId, 'position')) {
      
      const pos = this.entityManager.getComponent(entityId, 'position');
      
      // Simple sight radius calculation - avoid complex calculations
      let sightRadius = this.fogOptions.sightRadius;
      if (this.entityManager.hasComponent(entityId, 'unitType')) {
        const unitType = this.entityManager.getComponent(entityId, 'unitType');
        if (unitType.type === 'neon_assassin' || unitType.type === 'sniper') {
          sightRadius *= 1.5;
        }
      }
      
      playerUnits.push({
        position: pos,
        sightRadius: sightRadius
      });
      
      processedUnits++;
    }
  });
  
  // Scale factors for converting world to canvas coordinates
  const canvasScale = {
    x: this.lowResFogCanvas.width / this.mapWidth,
    y: this.lowResFogCanvas.height / this.mapHeight
  };
  
  // Create fog cutouts around player units
  for (const unit of playerUnits) {
    const pos = unit.position;
    
    // Convert world position to low-res canvas coordinates
    const canvasX = (pos.x + this.mapWidth/2) * canvasScale.x;
    const canvasY = (pos.z + this.mapHeight/2) * canvasScale.y;
    const canvasRadius = unit.sightRadius * canvasScale.x;
    
    // Use a simpler circle reveal - avoid expensive gradients
    this.lowResFogContext.globalCompositeOperation = 'destination-out';
    
    // Use a simple circle instead of a complex gradient
    this.lowResFogContext.beginPath();
    this.lowResFogContext.arc(canvasX, canvasY, canvasRadius, 0, Math.PI * 2);
    
    // Optional: Add a slight gradient at the edge for nicer visuals
    if (this.fogOptions.useGradients) {
      // Create radial gradient for sight radius
      const gradient = this.lowResFogContext.createRadialGradient(
        canvasX, canvasY, 0,
        canvasX, canvasY, canvasRadius
      );
      
      gradient.addColorStop(0, 'rgba(0, 0, 0, 1)'); // Full clear at center
      gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.9)'); // Start fade
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)'); // No clearing at edge
      
      this.lowResFogContext.fillStyle = gradient;
    } else {
      // Simple fill is much faster
      this.lowResFogContext.fillStyle = 'rgba(0, 0, 0, 1)';
    }
    
    this.lowResFogContext.fill();
  }
  
  // Reset composite operation
  this.lowResFogContext.globalCompositeOperation = 'source-over';
  
  // Apply explored but not visible overlay (if using memory of explored areas)
  if (this.fogOptions.rememberExplored) {
    this.lowResFogContext.fillStyle = `rgba(0, 0, 0, ${this.fogOptions.exploredOpacity})`;
    this.lowResFogContext.globalCompositeOperation = 'source-atop';
    this.lowResFogContext.fillRect(0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height);
  }
  
  // Upscale the low-res canvas back to the main fog canvas
  this.fogContext.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
  this.fogContext.drawImage(
    this.lowResFogCanvas,
    0, 0, this.lowResFogCanvas.width, this.lowResFogCanvas.height,
    0, 0, this.fogCanvas.width, this.fogCanvas.height
  );
  
  // Update texture less frequently
  this.lastFogUpdate = Date.now();
  this.fogTexture.needsUpdate = true;
}
```

Now let's add more optimization techniques:

```javascript
// Add these properties to the fogOptions in the BaseScenario constructor
this.fogOptions = {
  // ... existing options ...
  updateFrequency: 0.25,     // Update 4 times per second instead of 10
  useGradients: false,       // Disable gradients for better performance
  lowResScale: 4,            // Low-res canvas scale factor (higher = better performance)
  useWebGL: true,            // Use WebGL for fog rendering if possible
  maxUnitsPerFrame: 5,       // Process at most 5 units per frame
  visibilityCheckFrequency: 0.5, // Check entity visibility only twice per second
  enableAdvancedFog: true    // Allow toggling advanced features
};

// Add this visibility timer
this.visibilityCheckTimer = 0;
```

Add this WebGL-based fog implementation alternative that's faster:

```javascript
// Add this method to BaseScenario.js
initializeWebGLFog() {
  console.log('Initializing WebGL-based fog of war');
  
  const { scene } = this.systems.render.sceneManager.getActiveScene();
  if (!scene) return false;
  
  // Create a simple custom shader for the fog
  const fogVertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;
  
  const fogFragmentShader = `
    uniform sampler2D fogTexture;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(fogTexture, vUv);
      gl_FragColor = color;
    }
  `;
  
  // Create a data texture with black pixels
  const size = 512; // Start with a smaller texture
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 0;     // R
    data[i+1] = 0;   // G
    data[i+2] = 0;   // B
    data[i+3] = 255; // A (opaque)
  }
  
  // Create texture from the pixel data
  this.fogDataTexture = new THREE.DataTexture(
    data,
    size,
    size,
    THREE.RGBAFormat,
    THREE.UnsignedByteType
  );
  this.fogDataTexture.needsUpdate = true;
  
  // Create shader material using the texture
  const fogMaterial = new THREE.ShaderMaterial({
    uniforms: {
      fogTexture: { value: this.fogDataTexture }
    },
    vertexShader: fogVertexShader,
    fragmentShader: fogFragmentShader,
    transparent: true,
    depthWrite: false
  });
  
  // Create the fog plane
  const fogGeometry = new THREE.PlaneGeometry(this.mapWidth, this.mapHeight);
  this.fogLayer = new THREE.Mesh(fogGeometry, fogMaterial);
  this.fogLayer.rotation.x = -Math.PI / 2;
  this.fogLayer.position.y = 1.0;
  this.fogLayer.renderOrder = 1000;
  scene.add(this.fogLayer);
  
  // Set up for WebGL fog updates
  this.fogTextureSize = size;
  this.fogTextureData = data;
  
  console.log('WebGL fog initialized');
  return true;
}

// Add this method for updating WebGL fog
updateWebGLFog(deltaTime) {
  // Skip if disabled or not initialized
  if (!this.fogOfWar || !this.fogTextureData) return;
  
  // Update timer and skip if not time yet
  this.fogUpdateTimer += deltaTime;
  if (this.fogUpdateTimer < this.fogOptions.updateFrequency) return;
  this.fogUpdateTimer = 0;
  
  // Get player units (limited by maxUnitsPerFrame)
  const playerUnits = [];
  let processedUnits = 0;
  
  this.entityManager.gameState.entities.forEach((entity, entityId) => {
    if (processedUnits >= this.fogOptions.maxUnitsPerFrame) return;
    
    if (this.isPlayerEntity(entityId) && 
        this.entityManager.hasComponent(entityId, 'position')) {
      
      const pos = this.entityManager.getComponent(entityId, 'position');
      let sightRadius = this.fogOptions.sightRadius;
      
      // Simplified sight radius calculation
      if (this.entityManager.hasComponent(entityId, 'unitType')) {
        const unitType = this.entityManager.getComponent(entityId, 'unitType').type;
        if (unitType === 'neon_assassin' || unitType === 'sniper') {
          sightRadius *= 1.5;
        }
      }
      
      playerUnits.push({
        position: pos,
        sightRadius: sightRadius
      });
      processedUnits++;
    }
  });
  
  // Update the texture data directly
  const size = this.fogTextureSize;
  const data = this.fogTextureData;
  
  // Fade previously explored areas if not using memory
  if (!this.fogOptions.rememberExplored) {
    const fadeSpeed = 0.9; // How quickly explored areas fade back to fog
    for (let i = 0; i < data.length; i += 4) {
      // Increase alpha (more fog) up to maximum
      if (data[i+3] < 255) {
        data[i+3] = Math.min(255, data[i+3] + Math.floor(fadeSpeed * 255 * deltaTime));
      }
    }
  }
  
  // Reveal areas around units
  for (const unit of playerUnits) {
    const worldX = unit.position.x;
    const worldZ = unit.position.z;
    
    // Convert world coordinates to texture coordinates
    const texX = Math.floor((worldX + this.mapWidth/2) / this.mapWidth * size);
    const texY = Math.floor((worldZ + this.mapHeight/2) / this.mapHeight * size);
    
    // Calculate sight radius in texture space
    const texRadius = Math.floor(unit.sightRadius / this.mapWidth * size);
    
    // Reveal circle around unit - simplified algorithm
    const radiusSquared = texRadius * texRadius;
    
    // Only process a square region around the unit for efficiency
    const minX = Math.max(0, texX - texRadius);
    const maxX = Math.min(size - 1, texX + texRadius);
    const minY = Math.max(0, texY - texRadius);
    const maxY = Math.min(size - 1, texY + texRadius);
    
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Check if pixel is within circle using distance squared
        const dx = x - texX;
        const dy = y - texY;
        const distSquared = dx * dx + dy * dy;
        
        if (distSquared <= radiusSquared) {
          // Calculate fade based on distance from center
          let alpha;
          if (this.fogOptions.enableAdvancedFog) {
            // Proportional fade based on distance from edge
            const dist = Math.sqrt(distSquared);
            const fade = Math.max(0, 1 - dist / texRadius);
            alpha = Math.floor(255 * (1 - fade * 0.9)); // Keep a bit of fog even at center
          } else {
            // Simple visibility - much faster
            alpha = this.fogOptions.exploredOpacity * 255;
          }
          
          // Set pixel alpha (fog opacity)
          const idx = (y * size + x) * 4 + 3;
          if (idx >= 0 && idx < data.length) {
            data[idx] = Math.min(data[idx], alpha);
          }
        }
      }
    }
  }
  
  // Update the texture
  this.fogDataTexture.needsUpdate = true;
}

// Create a toggle to switch between standard and optimized modes
toggleOptimizedFog(enabled = true) {
  if (enabled === this.fogOptions.enableAdvancedFog) return;
  
  this.fogOptions.enableAdvancedFog = enabled;
  
  if (enabled) {
    console.log('Using higher quality fog of war (may impact performance)');
    this.fogOptions.updateFrequency = 0.1;
    this.fogOptions.useGradients = true;
  } else {
    console.log('Using optimized fog of war for better performance');
    this.fogOptions.updateFrequency = 0.25;
    this.fogOptions.useGradients = false;
  }
}
```

Now update the existing methods to use the optimized approach:

```javascript
// Modify the enableFogOfWar method to use WebGL when possible
enableFogOfWar(options = {}) {
  // Merge provided options with defaults
  this.fogOptions = { ...this.fogOptions, ...options };
  
  // Choose the appropriate initialization method
  let initialized = false;
  
  if (this.fogOptions.useWebGL) {
    // Try WebGL first
    initialized = this.initializeWebGLFog();
  }
  
  // Fall back to canvas method if WebGL failed or was disabled
  if (!initialized && !this.fogLayer) {
    initialized = this.initializeFogOfWar();
  }
  
  if (!initialized) {
    console.error('Failed to initialize fog of war');
    return false;
  }
  
  this.fogOfWar = true;
  if (this.fogLayer) {
    this.fogLayer.visible = true;
  }
  
  return true;
}

// Modify update method to use appropriate fog update function
update(deltaTime) {
  // Update objective markers if any
  this.updateObjectiveMarkers(deltaTime);
  
  // Update fog of war
  if (this.fogOfWar) {
    if (this.fogTextureData) {
      this.updateWebGLFog(deltaTime);
    } else {
      this.updateFogOfWar(deltaTime);
    }
    
    // Update entity visibility less frequently
    this.visibilityCheckTimer += deltaTime;
    if (this.visibilityCheckTimer >= this.fogOptions.visibilityCheckFrequency) {
      this.visibilityCheckTimer = 0;
      this.updateEntityVisibility();
    }
  }
  
  // Any other scenario-specific updates would go here
}
```

Finally, add a method to adjust fog of war quality based on performance:

```javascript
// Add this method to automatically adjust fog quality based on performance
autoAdjustFogQuality() {
  // Track frame rate over time
  if (!this._fpsHistory) {
    this._fpsHistory = [];
    this._lastFpsCheck = Date.now();
    this._framesCount = 0;
    return; // First call just initializes tracking
  }
  
  // Count frames
  this._framesCount++;
  
  // Check every second
  const now = Date.now();
  const elapsed = now - this._lastFpsCheck;
  
  if (elapsed >= 1000) {
    const fps = Math.round(this._framesCount * 1000 / elapsed);
    this._framesCount = 0;
    this._lastFpsCheck = now;
    
    // Add to history (keep last 5 readings)
    this._fpsHistory.push(fps);
    if (this._fpsHistory.length > 5) {
      this._fpsHistory.shift();
    }
    
    // Get average FPS
    const avgFps = this._fpsHistory.reduce((sum, val) => sum + val, 0) / this._fpsHistory.length;
    
    // Adjust fog quality based on FPS
    if (avgFps < 30) {
      // Poor performance - optimize fog
      if (this.fogOptions.enableAdvancedFog) {
        console.log(`Low FPS detected (${avgFps.toFixed(1)}), optimizing fog of war`);
        this.toggleOptimizedFog(false);
      }
      
      // If still bad, increase update interval
      if (avgFps < 20 && this.fogOptions.updateFrequency < 0.4) {
        this.fogOptions.updateFrequency += 0.1;
        console.log(`Very low FPS, reducing fog update frequency to ${this.fogOptions.updateFrequency.toFixed(1)}s`);
      }
    }
    // Optionally improve quality if FPS is very high
    else if (avgFps > 55 && !this.fogOptions.enableAdvancedFog) {
      console.log(`High FPS detected (${avgFps.toFixed(1)}), can enable advanced fog effects`);
      this.toggleOptimizedFog(true);
    }
  }
}
```

## Add to ExplorationScenario.js

```javascript
// Optimized fog settings for ExplorationScenario constructor
this.fogOptions = {
  sightRadius: 20,           // Better visibility in wasteland
  exploredOpacity: 0.5,      // Darker explored areas
  unexploredOpacity: 0.95,   // Nearly opaque unexplored areas
  updateFrequency: 0.25,     // Update 4 times per second (was 0.1)
  fogColor: 0x000022,        // Dark blue fog for mystical feel
  fadeEdgeWidth: 0.4,        // Wider fade at edges
  rememberExplored: true,    // Remember areas you've seen
  resolution: 2,             // Lower resolution (was 3)
  heightInfluence: true,
  heightFactor: 0.3,         // Height provides better visibility
  useWebGL: true,            // Try to use faster WebGL rendering
  maxUnitsPerFrame: 3,       // Process max 3 units per frame
  visibilityCheckFrequency: 0.5,  // Check visibility twice per second
  enableAdvancedFog: false,  // Start with optimized fog
  lowResScale: 6,            // Even lower resolution for processing
  useGradients: false        // Disable gradients for better performance
};

// Add to the update method in ExplorationScenario.js
update(deltaTime) {
  // Call base update to handle objective markers and basic fog of war updates
  super.update(deltaTime);
  
  // Auto-adjust fog quality based on performance
  this.autoAdjustFogQuality();
  
  // Rest of the update method...
}
```

## Key Performance Optimizations

1. **Lower Resolution Processing**: Instead of updating the full-resolution fog texture, we create a downscaled version for processing and then upscale the result.

2. **WebGL Implementation**: The WebGL-based implementation directly manipulates texture data and uses GPU acceleration which is much faster than canvas operations.

3. **Reduced Update Frequency**: We've reduced how often the fog is updated from 10 times/second to 4 times/second.

4. **Limited Units Processing**: Instead of processing all player units each frame, we limit how many units are considered per update.

5. **Simplified Effect**: Removed expensive gradients and other visual effects when performance is critical.

6. **Adaptive Quality**: Added an auto-adjustment system that monitors FPS and adjusts fog quality automatically.

7. **Optimized Area Calculations**: Instead of checking every pixel in the texture, we only check pixels within a bounding box around each unit.

8. **Reduced Visibility Check Frequency**: Entity visibility checks are now performed less frequently.

9. **Simpler Math**: Replaced complex calculations with simpler alternatives where possible.

10. **Memory Management**: Added proper initialization and resource management to avoid memory leaks.

These optimizations should greatly improve performance while still maintaining an acceptable visual quality for the fog of war effect. The auto-adjustment system will also ensure the game runs smoothly across different devices by automatically finding the right balance between visual quality and performance.