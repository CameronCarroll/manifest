Looking at the code for `ExplorationScenario` and `BaseScenario`, I can identify several opportunities for refactoring to improve code reuse across different scenarios. The current `ExplorationScenario` contains multiple methods that could be generalized and moved to `BaseScenario`.

Here's my analysis of what should be refactored to the base class:

## Methods to Move to BaseScenario

1. **Map Generation and Terrain Management**
   - `generateProceduralMap()` with configurable parameters
   - `addMapBorders()` 
   - `createFallbackTerrain()`
   - The existing `createTerrainFeature()` method could be enhanced

2. **UI and Notification System**
   - `showNotification()` 
   - `showNextPrompt()` and prompt queue management

3. **Beacon/Objective Indicator System**
   - `addBeaconIndicator()` and `updateBeaconIndicator()`
   - These could be generalized to a broader "objective marker" system

4. **Entity Creation Methods**
   - `createEnemyBuilding()` to complement the existing `createPlayerUnit()`
   - `spawnEnemyUnitsAroundPosition()` and `spawnRandomEnemyUnits()`

5. **Unit Management Utilities**
   - `getUnitHealthValues()`, `getUnitAttackType()`, `getUnitAbilities()`
   - `convertUnitTypeToFactionType()`
   - `isPlayerEntity()` utility function

6. **Objective Management**
   - The objective tracking logic in `updateObjectiveProgress()` would be useful across scenarios

## Implementation Strategy

Here's how I would refactor the code:

```javascript
// In BaseScenario.js

// Add new configurable properties
constructor(gameController) {
  // Existing code...
  
  // Map configuration
  this.mapWidth = 40;
  this.mapHeight = 40;
  this.objectDensity = 0.6;
  this.resourceDensity = 0.3;
  this.biomeType = 'default';
  
  // UI configuration
  this.promptQueue = [];
  
  // Combat configuration
  this.unitTypes = {}; // Define in subclasses
}

// Add map generation methods
async generateProceduralMap(options = {}) {
  // Generalized version of the map generation logic
  // with fallback mechanisms
}

addMapBorders(scene, mapOptions) {
  // Existing logic from ExplorationScenario
}

createFallbackTerrain(scene) {
  // Existing logic from ExplorationScenario
}

// Add UI methods
showNotification(message) {
  // Existing logic from ExplorationScenario
}

showNextPrompt() {
  // Existing logic from ExplorationScenario
}

// Add entity management methods
createEnemyBuilding(buildingType, position, scale = 1.0) {
  // Existing logic from ExplorationScenario
}

spawnEnemyUnitsAroundPosition(position, count) {
  // Generalized version
}

spawnRandomEnemyUnits(count, area = {}) {
  // Generalized version with configurable area
}

// Add utility methods
isPlayerEntity(entityId) {
  // Existing logic from ExplorationScenario
}

// Add objective marker system
addObjectiveMarker(position, type = 'default') {
  // Generalized version of addBeaconIndicator
}

updateObjectiveMarkers(deltaTime) {
  // Generalized version of updateBeaconIndicator
}
```

## Benefits of Refactoring

1. **Reduced Code Duplication**: Multiple scenarios can leverage the same infrastructure code.

2. **Improved Maintainability**: Bug fixes in the base functionality will apply to all scenarios.

3. **Standardized Interfaces**: Creates a more consistent API for creating new scenarios.

4. **Enhanced Modularity**: Makes it easier to create variations of scenarios by combining different features.

5. **Simplified Scenario Development**: New scenarios can focus on unique gameplay mechanics rather than reimplementing infrastructure.

## Implementation Considerations

1. **Parameterization**: Methods need to be generalized with appropriate parameters, defaulting to the current implementation but allowing customization.

2. **Backwards Compatibility**: Ensure existing scenarios still work with the refactored base class.

3. **Documentation**: Add clear documentation for how to use and extend the base scenario functionality.

4. **Progressive Refactoring**: Consider implementing this refactoring in phases rather than all at once to minimize the risk of breaking existing scenarios.

The urban feature creation (`addUrbanFeatures()`) and specialized enemy/beacon placement would remain in the exploration scenario as they're specific to that gameplay experience, but they'd use the generalized infrastructure provided by the enhanced base scenario.