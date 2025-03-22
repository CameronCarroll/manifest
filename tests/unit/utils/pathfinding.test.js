import { Grid, PathFinder, worldToGrid, gridToWorld } from '../../../src/utils/pathfinding.js';

describe('Grid', () => {
  let grid;
  const width = 10;
  const height = 10;
  
  beforeEach(() => {
    grid = new Grid(width, height);
  });
  
  test('should initialize with correct dimensions', () => {
    expect(grid.width).toBe(width);
    expect(grid.height).toBe(height);
    expect(grid.obstacles).toBeInstanceOf(Set);
    expect(grid.obstacles.size).toBe(0);
  });
  
  test('should initialize with provided obstacles', () => {
    const obstacles = [
      { x: 1, y: 1 },
      { x: 2, y: 3 }
    ];
    
    grid = new Grid(width, height, obstacles);
    
    expect(grid.obstacles.size).toBe(obstacles.length);
    expect(grid.obstacles.has('1,1')).toBe(true);
    expect(grid.obstacles.has('2,3')).toBe(true);
  });
  
  test('inBounds should check if position is within grid bounds', () => {
    expect(grid.inBounds({ x: 0, y: 0 })).toBe(true);
    expect(grid.inBounds({ x: 9, y: 9 })).toBe(true);
    expect(grid.inBounds({ x: -1, y: 0 })).toBe(false);
    expect(grid.inBounds({ x: 0, y: -1 })).toBe(false);
    expect(grid.inBounds({ x: 10, y: 0 })).toBe(false);
    expect(grid.inBounds({ x: 0, y: 10 })).toBe(false);
  });
  
  test('passable should check if position has an obstacle', () => {
    grid.addObstacle({ x: 1, y: 1 });
    
    expect(grid.passable({ x: 0, y: 0 })).toBe(true);
    expect(grid.passable({ x: 1, y: 1 })).toBe(false);
  });
  
  test('neighbors should return valid adjacent positions', () => {
    grid.addObstacle({ x: 1, y: 1 });
    
    const neighbors = grid.neighbors({ x: 0, y: 0 });
    
    // Should have 2 neighbors (1,0), (0,1) as (1,1) is an obstacle
    expect(neighbors.length).toBe(2);
    
    // Check that all neighbors are inBounds and passable
    neighbors.forEach(neighbor => {
      expect(grid.inBounds(neighbor)).toBe(true);
      expect(grid.passable(neighbor)).toBe(true);
    });
  });
  
  test('cost should calculate correct movement cost based on direction', () => {
    // Orthogonal movement (non-diagonal)
    expect(grid.cost({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(1.0);
    expect(grid.cost({ x: 0, y: 0 }, { x: 0, y: 1 })).toBe(1.0);
    
    // Diagonal movement
    expect(grid.cost({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1.4);
  });
  
  test('setWeight should add weight to a position', () => {
    grid.setWeight({ x: 1, y: 1 }, 5);
    
    expect(grid.cost({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(1.4 + 5);
  });
  
  test('addObstacle should add an obstacle', () => {
    grid.addObstacle({ x: 1, y: 1 });
    
    expect(grid.obstacles.has('1,1')).toBe(true);
    expect(grid.passable({ x: 1, y: 1 })).toBe(false);
  });
  
  test('removeObstacle should remove an obstacle', () => {
    grid.addObstacle({ x: 1, y: 1 });
    grid.removeObstacle({ x: 1, y: 1 });
    
    expect(grid.obstacles.has('1,1')).toBe(false);
    expect(grid.passable({ x: 1, y: 1 })).toBe(true);
  });
});

describe('PathFinder', () => {
  let grid;
  let pathFinder;
  
  beforeEach(() => {
    grid = new Grid(10, 10);
    pathFinder = new PathFinder(grid);
  });
  
  test('heuristic should calculate Manhattan distance', () => {
    expect(pathFinder.heuristic({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(7); // |3-0| + |4-0| = 7
    expect(pathFinder.heuristic({ x: 2, y: 3 }, { x: 5, y: 8 })).toBe(8); // |5-2| + |8-3| = 3 + 5 = 8
  });
  
  test('findPath should return empty array for invalid start position', () => {
    // Out of bounds start
    const path1 = pathFinder.findPath({ x: -1, y: 0 }, { x: 5, y: 5 });
    expect(path1).toEqual([]);
    
    // Obstacle at start
    grid.addObstacle({ x: 0, y: 0 });
    const path2 = pathFinder.findPath({ x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path2).toEqual([]);
  });
  
  test('findPath should return empty array for invalid goal position', () => {
    // Out of bounds goal
    const path1 = pathFinder.findPath({ x: 0, y: 0 }, { x: 10, y: 10 });
    expect(path1).toEqual([]);
    
    // Obstacle at goal
    grid.addObstacle({ x: 5, y: 5 });
    const path2 = pathFinder.findPath({ x: 0, y: 0 }, { x: 5, y: 5 });
    expect(path2).toEqual([]);
  });
  
  test('findPath should find direct path with no obstacles', () => {
    const start = { x: 0, y: 0 };
    const goal = { x: 2, y: 2 };
    
    const path = pathFinder.findPath(start, goal);
    
    // Path should include start and goal
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(goal);
  });
  
  test('findPath should navigate around obstacles', () => {
    const start = { x: 0, y: 0 };
    const goal = { x: 4, y: 0 };
    
    // Create a wall of obstacles
    grid.addObstacle({ x: 2, y: 0 });
    grid.addObstacle({ x: 2, y: 1 });
    // Don't add out of bounds obstacle, it causes errors
    // grid.addObstacle({ x: 2, y: -1 }); // This is out of bounds
    
    const path = pathFinder.findPath(start, goal);
    
    // Path should go around the obstacles
    expect(path.length).toBeGreaterThan(0);
    expect(path[0]).toEqual(start);
    expect(path[path.length - 1]).toEqual(goal);
    
    // The path should not contain any obstacles
    path.forEach(pos => {
      expect(grid.passable(pos)).toBe(true);
    });
  });
});

describe('Coordinate conversion utilities', () => {
  test('worldToGrid should convert world coordinates to grid coordinates', () => {
    const cellSize = 10;
    
    // Simple case with default origin
    expect(worldToGrid({ x: 15, z: 25 }, cellSize)).toEqual({ x: 1, y: 2 });
    
    // With custom origin
    const origin = { x: 100, z: 200 };
    expect(worldToGrid({ x: 115, z: 225 }, cellSize, origin)).toEqual({ x: 1, y: 2 });
  });
  
  test('gridToWorld should convert grid coordinates to world coordinates', () => {
    const cellSize = 10;
    
    // Simple case with default origin
    const worldPos1 = gridToWorld({ x: 1, y: 2 }, cellSize);
    expect(worldPos1.x).toBe(15); // 1 * 10 + 5 (half cell)
    expect(worldPos1.z).toBe(25); // 2 * 10 + 5 (half cell)
    
    // With custom origin
    const origin = { x: 100, z: 200 };
    const worldPos2 = gridToWorld({ x: 1, y: 2 }, cellSize, origin);
    expect(worldPos2.x).toBe(115); // 100 + 1 * 10 + 5
    expect(worldPos2.z).toBe(225); // 200 + 2 * 10 + 5
  });
});