# Graphics Extension Documentation

## Overview
This document provides an overview of the graphics extensions implemented for the cyberpunk postapocalyptic solarpunk RTS game with magic elements. The extensions include new models for units and buildings, improved animation systems, map textures and objects, and procedural map generation.

## New Components

### UnitTypeComponent
A new component that stores unit type information, allowing for more diverse unit types beyond what was available in the original faction component.

```javascript
// src/entities/components/UnitTypeComponent.js
```

### BuildingTypeComponent
A new component that stores building type information, enabling a wider variety of building types with unique visual styles.

```javascript
// src/entities/components/BuildingTypeComponent.js
```

## New Factory Classes

### ModelFactory
Centralizes model creation logic that was previously in RenderSystem. Creates detailed 3D models for units, buildings, resources, and terrain objects.

```javascript
// src/utils/ModelFactory.js
```

### AnimationFactory
Handles animations for all models, providing more complex and varied animations than the original system.

```javascript
// src/utils/AnimationFactory.js
```

### TerrainFactory
Creates terrain textures and environmental objects, supporting the new map features.

```javascript
// src/utils/TerrainFactory.js
```

### MapGenerator
Implements procedural map generation using the terrain and environmental objects.

```javascript
// src/utils/MapGenerator.js
```

## Refactored Systems

### RenderSystem
Refactored to use the ModelFactory for creating meshes based on entity types.

```javascript
// src/entities/systems/RenderSystem.js
```

### AnimationSystem
Refactored to use the AnimationFactory for handling animations.

```javascript
// src/entities/systems/AnimationSystem.js
```

## New Unit Types

### Techno-Shaman (Advanced Support)
A spiritual tech healer who channels energy through salvaged technology.
- Robed figure with circuit patterns
- Hood with solar panels
- Staff with floating crystal
- Hovering drones that emit healing particles
- Green-blue energy tendrils

### Solar Knight (Advanced Tank)
Heavily armored warrior using solar-powered exoskeleton.
- Bulky lower body with mechanical legs
- Armored chest with central solar panel core
- Helmet with glowing visor and antennae
- Energy shield and pulse emitter
- Solar flare bursts when taking damage

### Neon Assassin (Advanced Sniper)
Stealthy long-range specialist with optical camouflage.
- Slim, agile figure with tight-fitting suit
- Sleek helmet with multiple targeting lenses
- Long energy rifle with floating targeting components
- Small jetpack with energy trails
- Shimmer effect for partial invisibility

### Biohacker (New Specialist)
Combines biological and technological elements to manipulate the environment.
- Asymmetrical body (one side organic, one mechanical)
- Partially exposed brain with cybernetic implants
- One normal arm, one with extendable vine-like tendrils
- Backpack with bubbling chemical vials
- Spores/nanobots that swirl around

### Scrap Golem (New Heavy Unit)
Massive construct assembled from technological debris and animated by magic.
- Bulky, asymmetrical body made of machine parts
- Glowing magical energy core
- Mismatched arms (one hammer, one grappling)
- Small head with a single glowing eye
- Leaking energy from joints, orbiting debris

### Eco-Drone Operator (New Worker)
Specialist who controls swarms of small drones for resource gathering.
- Lightweight frame with control interfaces
- Augmented reality visor with plant elements
- Drone dock with small detachable drones
- Control gauntlets with holographic displays
- Connection beams between operator and drones

## New Building Types

### Arcane Reactor (Power Generation)
Fusion of magical crystals and solar technology.
- Circular platform with runic inscriptions
- Central floating crystal array
- Solar panels in mandala pattern
- Energy beams connecting to nearby structures
- Pulsing energy waves

### Reclaimed Sanctuary (Main Base)
Repurposed pre-apocalypse structure with living walls and tech integration.
- Partially buried concrete foundation
- Walls combining salvaged materials and plants
- Solar panel array with wind turbines
- Shimmering force field door
- Hanging gardens, communication arrays, defensive turrets

### Bioforge (Production Facility)
Hybrid factory/greenhouse for creating units and equipment.
- Terraced structure with flowing water
- Transparent sections showing assembly processes
- Industrial elements with organic growth
- Chimneys emitting clean steam and glowing spores
- Moving assembly arms and growing plant elements

### Mana Well (Resource Extractor)
Structure that taps into underground magical energy.
- Crystalline formation emerging from ground
- Swirling energy vortex in geometric frame
- Techno-organic tendrils anchoring to ground
- Energy streams flowing upward
- Rhythmic pulsing as resources are extracted

### Scavenger Outpost (Forward Base)
Mobile, deployable structure for frontline operations.
- Hexagonal platform with mechanical legs
- Modular components that reconfigure
- Long-range scanner with magical amplifier
- Small automated turrets and energy barriers
- Transformation sequence when deploying/packing

### Harmonic Tower (Defense Structure)
Defensive structure that disrupts enemy technology and magic.
- Triangular foundation with circuit patterns
- Spiraling structure with tech and crystal segments
- Three-pronged energy emitter
- Visible frequency waves distorting the air
- Rotational elements that spin when active

## Map Features

### Terrain Types
1. **Reclaimed Urban**: Cracked concrete with plants growing through
2. **Techno-Organic Forest**: Bioluminescent plants incorporating old technology
3. **Crystal Wastes**: Barren landscape with geometric crystal formations
4. **Nanite Swamps**: Murky areas with shifting metallic surfaces
5. **Solar Fields**: Damaged solar panels with adaptive plant life

### Environmental Objects
1. **Ancient Server Monoliths**: Tall structures resembling server racks
2. **Floating Mana Crystals**: Levitating crystal formations
3. **Corrupted Machinery**: Partially functioning machines with magical corruption
4. **Living Circuit Trees**: Tree-like structures with glowing circuit patterns
5. **Holographic Ruins**: Partially visible projections of buildings
6. **Energy Geysers**: Erupting sources of magical/technological energy

## Procedural Map Generation
The MapGenerator class creates varied playfields using:
- Biome-based generation for different visual styles
- Faction territories with unique architectural styles
- Natural clustering of similar resource types
- Terrain height variations for natural barriers
- Procedurally generated paths connecting points of interest
- Strategic landmark placement for navigation

## Testing
A comprehensive test suite is included to validate all the new graphics extensions:
- Unit model tests
- Building model tests
- Animation tests
- Terrain texture tests
- Environmental object tests
- Procedural map generation tests

```javascript
// src/tests/GraphicsExtensionTest.js
// src/tests/TestRunner.js
```

## Integration
All new components and systems are designed to work seamlessly with the existing game architecture. The refactored RenderSystem and AnimationSystem maintain backward compatibility while supporting the new features.

## Usage Examples

### Creating a New Unit
```javascript
// Create a Techno-Shaman unit
entityManager.addComponent(entityId, 'unitType', { type: 'techno_shaman' });
entityManager.addComponent(entityId, 'render', { 
  meshId: 'unit',
  color: 0x00ffff, // Faction color
  opacity: 1,
  scale: { x: 1, y: 1, z: 1 },
  visible: true
});
```

### Creating a New Building
```javascript
// Create an Arcane Reactor building
entityManager.addComponent(entityId, 'buildingType', { type: 'arcane_reactor' });
entityManager.addComponent(entityId, 'render', { 
  meshId: 'building',
  color: 0x00ffff, // Faction color
  opacity: 1,
  scale: { x: 1, y: 1, z: 1 },
  visible: true
});
```

### Generating a Procedural Map
```javascript
// Create a procedural map
const mapGenerator = new MapGenerator(scene, terrainFactory);
const mapOptions = {
  width: 100,
  height: 100,
  biomeType: 'techno_organic_forest',
  objectDensity: 0.5,
  resourceDensity: 0.3,
  elevation: 0.5,
  seed: 12345
};
const mapResult = await mapGenerator.generateMap(mapOptions);
```

## Future Enhancements
Potential areas for further development:
1. External 3D model loading for even more detailed units and buildings
2. Advanced particle systems for magical effects
3. Dynamic weather system affecting gameplay and visuals
4. Day/night cycle with unique night appearances
5. More complex procedural generation algorithms for varied maps
6. Enhanced visual effects using post-processing

## Conclusion
These graphics extensions significantly enhance the visual appeal and variety of the game while maintaining the cyberpunk postapocalyptic solarpunk theme with magical elements. The modular design allows for easy addition of more unit types, building types, and environmental objects in the future.
