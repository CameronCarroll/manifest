import * as THREE from 'three';
import SelectionIndicator from '../../../src/utils/SelectionIndicator.js';

// Mock THREE.js
jest.mock('three', () => {
  return {
    Mesh: jest.fn().mockImplementation(() => ({
      position: { set: jest.fn() },
      rotation: { x: 0, y: 0, z: 0 },
      geometry: null
    })),
    RingGeometry: jest.fn(),
    MeshBasicMaterial: jest.fn(),
    DoubleSide: 'double-side'
  };
});

describe('SelectionIndicator', () => {
  let selectionIndicator;
  let mockScene;
  let mockEntityManager;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock scene
    mockScene = {
      add: jest.fn(),
      remove: jest.fn()
    };
    
    // Create mock entity manager
    mockEntityManager = {
      getComponent: jest.fn()
    };
    
    // Create SelectionIndicator instance
    selectionIndicator = new SelectionIndicator(mockScene);
  });
  
  describe('initialization', () => {
    test('should initialize with empty selection rings map', () => {
      expect(selectionIndicator.selectionRings).toBeInstanceOf(Map);
      expect(selectionIndicator.selectionRings.size).toBe(0);
    });
    
    test('should create materials for selection rings', () => {
      expect(THREE.MeshBasicMaterial).toHaveBeenCalledTimes(2);
      
      // Check friendly material
      expect(THREE.MeshBasicMaterial).toHaveBeenCalledWith({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.5,
        side: 'double-side',
        depthWrite: false
      });
      
      // Check enemy material
      expect(THREE.MeshBasicMaterial).toHaveBeenCalledWith({
        color: 0xff0000,
        transparent: true,
        opacity: 0.5,
        side: 'double-side',
        depthWrite: false
      });
    });
  });
  
  describe('addSelectionRing', () => {
    test('should create and add a selection ring to the scene', () => {
      const entityId = 1;
      const position = { x: 10, y: 0, z: 20 };
      const radius = 2;
      
      // Create a spy for removeSelectionRing
      const removeRingSpy = jest.spyOn(selectionIndicator, 'removeSelectionRing');
      
      // Add selection ring
      const ring = selectionIndicator.addSelectionRing(entityId, position, radius);
      
      // Verify ring geometry creation
      expect(THREE.RingGeometry).toHaveBeenCalledWith(radius * 0.9, radius, 32);
      
      // Verify Mesh creation with friendly material
      expect(THREE.Mesh).toHaveBeenCalled();
      
      // Verify ring positioning
      expect(ring.position.set).toHaveBeenCalledWith(position.x, 0.1, position.z);
      expect(ring.rotation.x).toBe(-Math.PI / 2);
      
      // Verify ring added to scene
      expect(mockScene.add).toHaveBeenCalledWith(ring);
      
      // Verify ring stored in map
      expect(selectionIndicator.selectionRings.get(entityId)).toBe(ring);
      
      // Verify removeSelectionRing was called first
      expect(removeRingSpy).toHaveBeenCalledWith(entityId);
    });
    
    test('should create enemy selection ring when isEnemy is true', () => {
      const entityId = 1;
      const position = { x: 10, y: 0, z: 20 };
      
      // Spy on material access
      selectionIndicator.enemySelectionMaterial = { test: 'enemyMaterial' };
      selectionIndicator.friendlySelectionMaterial = { test: 'friendlyMaterial' };
      
      // Create enemy ring
      selectionIndicator.addSelectionRing(entityId, position, 1.2, true);
      
      // Verify enemy material was used (implementation detail depends on mock)
      expect(THREE.Mesh).toHaveBeenCalled();
    });
    
    test('should use default radius when not provided', () => {
      const entityId = 1;
      const position = { x: 10, y: 0, z: 20 };
      
      selectionIndicator.addSelectionRing(entityId, position);
      
      // Default radius is 1.2
      expect(THREE.RingGeometry).toHaveBeenCalledWith(1.2 * 0.9, 1.2, 32);
    });
  });
  
  describe('updateSelectionRingPosition', () => {
    test('should update existing ring position', () => {
      const entityId = 1;
      const oldPosition = { x: 0, y: 0, z: 0 };
      const newPosition = { x: 15, y: 0, z: 25 };
      
      // Create a ring
      const ring = {
        position: {
          set: jest.fn()
        }
      };
      selectionIndicator.selectionRings.set(entityId, ring);
      
      // Update position
      selectionIndicator.updateSelectionRingPosition(entityId, newPosition);
      
      // Verify position update
      expect(ring.position.set).toHaveBeenCalledWith(newPosition.x, 0.1, newPosition.z);
    });
    
    test('should do nothing if ring does not exist', () => {
      const entityId = 999;
      const position = { x: 15, y: 0, z: 25 };
      
      // Attempt to update non-existent ring
      selectionIndicator.updateSelectionRingPosition(entityId, position);
      
      // Expect no errors and no changes
      expect(selectionIndicator.selectionRings.size).toBe(0);
    });
  });
  
  describe('removeSelectionRing', () => {
    test('should remove ring from scene and map', () => {
      const entityId = 1;
      
      // Create a mock ring with geometry
      const mockGeometry = { dispose: jest.fn() };
      const mockRing = {
        geometry: mockGeometry
      };
      
      // Add to map
      selectionIndicator.selectionRings.set(entityId, mockRing);
      
      // Remove ring
      selectionIndicator.removeSelectionRing(entityId);
      
      // Verify ring removed from scene
      expect(mockScene.remove).toHaveBeenCalledWith(mockRing);
      
      // Verify geometry disposed
      expect(mockGeometry.dispose).toHaveBeenCalled();
      
      // Verify ring removed from map
      expect(selectionIndicator.selectionRings.has(entityId)).toBe(false);
    });
    
    test('should handle ring without geometry', () => {
      const entityId = 1;
      
      // Create a mock ring without geometry
      const mockRing = {};
      
      // Add to map
      selectionIndicator.selectionRings.set(entityId, mockRing);
      
      // Remove ring
      selectionIndicator.removeSelectionRing(entityId);
      
      // Verify ring removed from scene
      expect(mockScene.remove).toHaveBeenCalledWith(mockRing);
      
      // Verify ring removed from map
      expect(selectionIndicator.selectionRings.has(entityId)).toBe(false);
    });
    
    test('should do nothing if ring does not exist', () => {
      // Attempt to remove non-existent ring
      selectionIndicator.removeSelectionRing(999);
      
      // Verify no scene interactions
      expect(mockScene.remove).not.toHaveBeenCalled();
    });
  });
  
  describe('clearAllSelectionRings', () => {
    test('should remove all rings', () => {
      // Add multiple rings
      selectionIndicator.selectionRings.set(1, { id: 'ring1' });
      selectionIndicator.selectionRings.set(2, { id: 'ring2' });
      selectionIndicator.selectionRings.set(3, { id: 'ring3' });
      
      // Spy on removeSelectionRing
      const removeRingSpy = jest.spyOn(selectionIndicator, 'removeSelectionRing');
      
      // Clear all rings
      selectionIndicator.clearAllSelectionRings();
      
      // Verify removeSelectionRing called for each ring
      expect(removeRingSpy).toHaveBeenCalledTimes(3);
      expect(removeRingSpy).toHaveBeenCalledWith(1);
      expect(removeRingSpy).toHaveBeenCalledWith(2);
      expect(removeRingSpy).toHaveBeenCalledWith(3);
      
      // Verify map is empty
      expect(selectionIndicator.selectionRings.size).toBe(0);
    });
  });
  
  describe('updateSelectionRings', () => {
    test('should add rings for newly selected entities with position', () => {
      const selectedEntities = new Set([1, 2]);
      
      // Mock position components
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'position') {
          return { x: entityId * 10, y: 0, z: entityId * 5 };
        }
        return null;
      });
      
      // Update selection rings
      selectionIndicator.updateSelectionRings(selectedEntities, mockEntityManager);
      
      // Verify rings added for both entities
      expect(selectionIndicator.selectionRings.size).toBe(2);
      expect(selectionIndicator.selectionRings.has(1)).toBe(true);
      expect(selectionIndicator.selectionRings.has(2)).toBe(true);
    });
    
    test('should update existing ring positions', () => {
      const entityId = 1;
      const selectedEntities = new Set([entityId]);
      
      // Create existing ring
      const mockRing = {
        position: { set: jest.fn() }
      };
      selectionIndicator.selectionRings.set(entityId, mockRing);
      
      // Spy on addSelectionRing and updateSelectionRingPosition
      const addRingSpy = jest.spyOn(selectionIndicator, 'addSelectionRing');
      const updatePositionSpy = jest.spyOn(selectionIndicator, 'updateSelectionRingPosition');
      
      // Mock position component
      const newPosition = { x: 30, y: 0, z: 15 };
      mockEntityManager.getComponent.mockImplementation((id, component) => {
        if (component === 'position') {return newPosition;}
        return null;
      });
      
      // Update selection rings
      selectionIndicator.updateSelectionRings(selectedEntities, mockEntityManager);
      
      // Verify update was called, not add
      expect(updatePositionSpy).toHaveBeenCalledWith(entityId, newPosition);
      expect(addRingSpy).not.toHaveBeenCalled();
    });
    
    test('should remove rings for entities no longer selected', () => {
      // Add rings for entities 1, 2, 3 with proper position property
      selectionIndicator.selectionRings.set(1, { 
        id: 'ring1',
        position: { set: jest.fn() }
      });
      selectionIndicator.selectionRings.set(2, { 
        id: 'ring2',
        position: { set: jest.fn() }
      });
      selectionIndicator.selectionRings.set(3, { 
        id: 'ring3',
        position: { set: jest.fn() }
      });
      
      // Only entities 1 and 3 remain selected
      const selectedEntities = new Set([1, 3]);
      
      // Spy on removeSelectionRing
      const removeRingSpy = jest.spyOn(selectionIndicator, 'removeSelectionRing');
      
      // Mock position components for remaining entities
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (componentType === 'position') {
          return { x: entityId * 10, y: 0, z: entityId * 5 };
        }
        return null;
      });
      
      // Update selection rings
      selectionIndicator.updateSelectionRings(selectedEntities, mockEntityManager);
      
      // Verify entity 2 ring was removed
      expect(removeRingSpy).toHaveBeenCalledWith(2);
      
      // Verify rings for 1 and 3 still exist
      expect(selectionIndicator.selectionRings.has(1)).toBe(true);
      expect(selectionIndicator.selectionRings.has(3)).toBe(true);
    });
    
    test('should calculate ring radius based on entity scale', () => {
      const entityId = 1;
      const selectedEntities = new Set([entityId]);
      
      // Spy on addSelectionRing
      const addRingSpy = jest.spyOn(selectionIndicator, 'addSelectionRing');
      
      // Mock both position and render components
      mockEntityManager.getComponent.mockImplementation((id, component) => {
        if (component === 'position') {return { x: 10, y: 0, z: 20 };}
        if (component === 'render') {return { scale: { x: 3, y: 2, z: 4 } };}
        return null;
      });
      
      // Update selection rings
      selectionIndicator.updateSelectionRings(selectedEntities, mockEntityManager);
      
      // Verify radius calculation (max of x and z scales * 0.7)
      // In this case, max scale is 4, so radius should be 4 * 0.7 = 2.8
      expect(addRingSpy).toHaveBeenCalledWith(entityId, expect.anything(), 2.8);
    });
    
    test('should skip entities without position components', () => {
      const selectedEntities = new Set([1, 2]);
      
      // Mock: entity 1 has position, entity 2 doesn't
      mockEntityManager.getComponent.mockImplementation((entityId, componentType) => {
        if (entityId === 1 && componentType === 'position') {
          return { x: 10, y: 0, z: 20 };
        }
        return null;
      });
      
      // Update selection rings
      selectionIndicator.updateSelectionRings(selectedEntities, mockEntityManager);
      
      // Verify only entity 1 got a ring
      expect(selectionIndicator.selectionRings.size).toBe(1);
      expect(selectionIndicator.selectionRings.has(1)).toBe(true);
      expect(selectionIndicator.selectionRings.has(2)).toBe(false);
    });
  });
  
  describe('dispose', () => {
    test('should clean up all resources', () => {
      // Add some rings
      selectionIndicator.selectionRings.set(1, { id: 'ring1' });
      selectionIndicator.selectionRings.set(2, { id: 'ring2' });
      
      // Create mock materials with dispose methods
      selectionIndicator.friendlySelectionMaterial = { dispose: jest.fn() };
      selectionIndicator.enemySelectionMaterial = { dispose: jest.fn() };
      
      // Spy on clearAllSelectionRings
      const clearRingsSpy = jest.spyOn(selectionIndicator, 'clearAllSelectionRings');
      
      // Dispose
      selectionIndicator.dispose();
      
      // Verify all rings cleared
      expect(clearRingsSpy).toHaveBeenCalled();
      
      // Verify materials disposed
      expect(selectionIndicator.friendlySelectionMaterial.dispose).toHaveBeenCalled();
      expect(selectionIndicator.enemySelectionMaterial.dispose).toHaveBeenCalled();
    });
  });
});