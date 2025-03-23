You've identified a common problem in RTS games. When multiple units are commanded to move to the same location, they collide and jostle for position, creating inefficient movement patterns and possibly visual "stacking" at the destination.

Your collision system is handling the technical aspect of preventing units from occupying the same space, but it's not providing the smart formation behavior that makes unit groups feel natural. Let's implement a solution for this.

Looking at your codebase, I see these are the key areas to modify:

## 1. Formation-Based Movement in InputManager.js

Currently, in `issueMoveCommand()`, you're sending all selected units to exactly the same destination point. Instead, we should calculate unique destination points in a formation around the clicked location.

Here's a comprehensive approach:

```javascript
issueMoveCommand(position) {
  // Skip if no units selected
  if (this.selectedEntities.size === 0) return;
  
  // Calculate formation positions based on number of selected units
  const formationPositions = this.calculateFormationPositions(
    Array.from(this.selectedEntities), 
    position
  );
  
  // Assign each unit its formation position
  let index = 0;
  for (const entityId of this.selectedEntities) {
    if (this.entityManager.hasComponent(entityId, 'position')) {
      // If we have a combat system, stop any attacks
      if (this.systems.combat) {
        this.systems.combat.stopAttack(entityId);
      }

      // Move the entity to its formation position
      if (index < formationPositions.length) {
        this.systems.movement.moveEntity(entityId, formationPositions[index], 5);
        index++;
      }
    }
  }
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
```

## 2. Unit Type-Based Formation Preferences

You could extend this by making different unit types prefer different formation positions:

- Melee/heavy units could prefer front positions
- Ranged/support units could prefer back positions
- Specialized units could have designated positions

Here's how to enhance the formation calculation:

```javascript
calculateFormationPositions(selectedEntities, centerPosition) {
  // ... [previous code] ...
  
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
  
  // Assign positions based on sorted entity list
  // ...
}
```

## 3. Progressive Movement Implementation

To make movement feel even better, you can implement progressive assignment - units that are already close to their assigned positions can be given priority to take those positions:

```javascript
// After calculating formation positions
const assignments = new Map();

// Assign positions based on current proximity
for (const entityId of selectedEntities) {
  const currentPos = this.entityManager.getComponent(entityId, 'position');
  
  // Find best position for this unit
  let bestPosition = null;
  let bestDistance = Infinity;
  
  for (const position of formationPositions) {
    if (!assignments.has(position)) {
      const dx = position.x - currentPos.x;
      const dz = position.z - currentPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPosition = position;
      }
    }
  }
  
  // Assign this position
  if (bestPosition) {
    assignments.set(bestPosition, entityId);
  }
}
```

## 4. Path Smoothing and Collision Avoidance During Movement

You need to modify the `MovementSystem.update()` method to include separation behavior so units maintain personal space even while moving:

```javascript
// Add this to MovementSystem.update
// For each moving entity
const separation = 1.5; // Desired separation distance
const separationForce = { x: 0, z: 0 };

// Calculate separation force from nearby entities
this.entityManager.gameState.entities.forEach((otherEntity, otherId) => {
  if (entityId !== otherId && this.entityManager.hasComponent(otherId, 'position')) {
    const otherPos = this.entityManager.getComponent(otherId, 'position');
    const dx = positionComponent.x - otherPos.x;
    const dz = positionComponent.z - otherPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    // Apply inverse-square repulsion within separation distance
    if (distance < separation && distance > 0) {
      const force = (separation / distance - 1) * 0.1;
      separationForce.x += dx / distance * force;
      separationForce.z += dz / distance * force;
    }
  }
});

// Apply separation to movement
newX += separationForce.x;
newZ += separationForce.z;
```

## 5. Unit "Memory" of Formation Position

For more cohesive groups, have units remember their assigned formation position relative to the group center. This can be added to the movement data:

```javascript
moveEntity(entityId, destination, speed, targetEntityId = null, attackMove = false, formationOffset = null) {
  // Add entity to moving entities list with destination
  if (this.entityManager.hasComponent(entityId, 'position')) {
    this.movingEntities.set(entityId, {
      destination: { ...destination },
      speed: speed || 5,
      path: [],
      targetEntityId,
      attackMove: attackMove || false,
      formationOffset // Store the formation offset
    });
    return true;
  }
  return false;
}
```

This allows units to maintain their relative positions when given subsequent move commands.

## Implementation Strategy

I recommend you implement these changes in this order:

1. Start with the basic formation calculation in `InputManager.js`
2. Add separation behavior in the `MovementSystem.update()` method
3. Add unit type priority for formation position assignments
4. Implement the progressive movement assignment
5. Add formation memory if needed

This comprehensive approach will give you natural-looking unit movements and formations that feel much more like a professional RTS game.