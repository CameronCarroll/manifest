// A* Pathfinding implementation for RTS game

class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  empty() {
    return this.elements.length === 0;
  }

  put(item, priority) {
    this.elements.push({ item, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  get() {
    return this.elements.shift().item;
  }
}

class Grid {
  constructor(width, height, obstacles = []) {
    this.width = width;
    this.height = height;
    this.obstacles = new Set();
    this.weights = {};
    
    // Add obstacles
    for (const obstacle of obstacles) {
      this.obstacles.add(`${obstacle.x},${obstacle.y}`);
    }
  }

  inBounds(position) {
    return position.x >= 0 && position.x < this.width &&
           position.y >= 0 && position.y < this.height;
  }

  passable(position) {
    return !this.obstacles.has(`${position.x},${position.y}`);
  }

  neighbors(position) {
    const { x, y } = position;
    const results = [
      { x: x + 1, y: y },
      { x: x - 1, y: y },
      { x: x, y: y + 1 },
      { x: x, y: y - 1 },
      // Optionally include diagonals
      { x: x + 1, y: y + 1 },
      { x: x + 1, y: y - 1 },
      { x: x - 1, y: y + 1 },
      { x: x - 1, y: y - 1 }
    ];
    
    // Filter out positions outside the grid or with obstacles
    return results.filter(pos => this.inBounds(pos) && this.passable(pos));
  }

  cost(from, to) {
    // Diagonal movement costs more
    const isDiagonal = from.x !== to.x && from.y !== to.y;
    const baseWeight = isDiagonal ? 1.4 : 1.0;
    const key = `${to.x},${to.y}`;
    return baseWeight + (this.weights[key] || 0);
  }

  // Add or update weight for a position
  setWeight(position, weight) {
    const key = `${position.x},${position.y}`;
    this.weights[key] = weight;
  }

  // Add obstacle at position
  addObstacle(position) {
    this.obstacles.add(`${position.x},${position.y}`);
  }

  // Remove obstacle at position
  removeObstacle(position) {
    this.obstacles.delete(`${position.x},${position.y}`);
  }
}

class PathFinder {
  constructor(grid) {
    this.grid = grid;
  }

  // Heuristic for A* (Manhattan distance)
  heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  // A* search algorithm
  findPath(start, goal) {
    // Edge case handling
    if (!this.grid.inBounds(start) || !this.grid.passable(start)) {
      console.error('Start position is invalid');
      return [];
    }
    
    if (!this.grid.inBounds(goal) || !this.grid.passable(goal)) {
      console.error('Goal position is invalid');
      return [];
    }
    
    const frontier = new PriorityQueue();
    frontier.put(start, 0);
    
    const cameFrom = {};
    const costSoFar = {};
    
    cameFrom[`${start.x},${start.y}`] = null;
    costSoFar[`${start.x},${start.y}`] = 0;
    
    while (!frontier.empty()) {
      const current = frontier.get();
      
      // Goal reached
      if (current.x === goal.x && current.y === goal.y) {
        break;
      }
      
      for (const next of this.grid.neighbors(current)) {
        const newCost = costSoFar[`${current.x},${current.y}`] + this.grid.cost(current, next);
        
        if (costSoFar[`${next.x},${next.y}`] === undefined || newCost < costSoFar[`${next.x},${next.y}`]) {
          costSoFar[`${next.x},${next.y}`] = newCost;
          const priority = newCost + this.heuristic(goal, next);
          frontier.put(next, priority);
          cameFrom[`${next.x},${next.y}`] = current;
        }
      }
    }
    
    // Reconstruct path
    const path = [];
    let current = goal;
    
    if (cameFrom[`${goal.x},${goal.y}`] === undefined) {
      console.log('No path found');
      return [];
    }
    
    while (!(current.x === start.x && current.y === start.y)) {
      path.push(current);
      current = cameFrom[`${current.x},${current.y}`];
      
      if (!current) {
        console.error('Path reconstruction failed');
        return [];
      }
    }
    
    path.push(start);
    path.reverse();
    
    return path;
  }
}

// Helper function to convert from world coordinates to grid coordinates
function worldToGrid(worldPos, gridCellSize, gridOrigin = { x: 0, z: 0 }) {
  const gridX = Math.floor((worldPos.x - gridOrigin.x) / gridCellSize);
  const gridY = Math.floor((worldPos.z - gridOrigin.z) / gridCellSize);
  return { x: gridX, y: gridY };
}

// Helper function to convert from grid coordinates to world coordinates
function gridToWorld(gridPos, gridCellSize, gridOrigin = { x: 0, z: 0 }) {
  const worldX = gridPos.x * gridCellSize + gridOrigin.x + gridCellSize / 2;
  const worldZ = gridPos.y * gridCellSize + gridOrigin.z + gridCellSize / 2;
  return { x: worldX, y: 0, z: worldZ };
}

export { Grid, PathFinder, worldToGrid, gridToWorld };
