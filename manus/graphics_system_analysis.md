# Current Graphics System Analysis

## Overview
The game uses Three.js for rendering and implements a component-entity-system architecture. The graphics system is primarily composed of:

1. **RenderSystem**: Handles the creation and updating of 3D meshes for entities
2. **AnimationSystem**: Manages animations for entities, particularly combat animations
3. **ModelLoader**: Loads and caches 3D models and textures
4. **RenderComponent**: Stores rendering properties for entities

## RenderSystem
The RenderSystem is responsible for:
- Creating and managing 3D meshes for entities
- Updating mesh positions based on entity positions
- Handling selection indicators and health visualizers
- Creating different visual representations for different entity types

Current entity types with unique visuals:
- **Units**: Different unit types (assault, support, sniper, tank, worker, heavy, light, specialist)
- **Buildings**: Command center with windows, antennae, and cybernetic elements
- **Resources**: Resource nodes with glow effects

The mesh creation is currently handled directly in the RenderSystem rather than using external model files, with different geometries and materials created programmatically based on entity type.

## AnimationSystem
The AnimationSystem handles:
- Combat animations (melee and ranged attacks)
- Projectile effects with different appearances based on unit type
- Animation state management (windup, strike, recovery phases)

The system creates visual effects for:
- **Melee attacks**: Summoned weapons
- **Ranged attacks**: Projectiles with different colors and properties based on unit type
- **Damage effects**: Visual feedback when entities take damage

## ModelLoader
The ModelLoader provides:
- Loading of GLTF models from files
- Loading of textures
- Caching of loaded models and textures
- Creation of placeholder models and textures

While the ModelLoader supports loading external 3D models, the current implementation primarily uses programmatically generated geometries rather than external model files.

## RenderComponent
The RenderComponent stores rendering properties for entities:
- meshId: Reference to the 3D model
- visible: Whether the entity is visible
- scale: Scale in x, y, z dimensions
- color: Base color
- opacity: Transparency level

## Current Limitations and Opportunities for Extension

### Limitations
1. **Limited Model Variety**: Currently using programmatically generated geometries rather than detailed 3D models
2. **Basic Texturing**: Limited use of textures for terrain and objects
3. **Hardcoded Visual Styles**: Visual appearance is defined directly in code rather than in configurable assets
4. **Limited Map Objects**: Only basic rocks and hills are implemented
5. **No Procedural Generation**: Maps appear to be manually created rather than procedurally generated

### Opportunities for Extension
1. **External 3D Models**: Create and load detailed 3D models for units and buildings
2. **Enhanced Texturing**: Implement detailed textures for terrain and objects
3. **More Unit/Building Types**: Add new types with unique visual styles
4. **Improved Animation System**: Extend to support more complex animations
5. **Procedural Map Generation**: Implement algorithms to generate varied playfields
6. **Enhanced Visual Effects**: Add particle systems, post-processing effects, and lighting improvements

## Integration with Other Systems
The graphics systems integrate with:
- **EntityManager**: To access entity components
- **SceneManager**: To access the Three.js scene
- **CombatSystem**: To trigger attack animations
- **MovementSystem**: To update entity positions

This integration allows for coordinated updates between game logic and visual representation.
