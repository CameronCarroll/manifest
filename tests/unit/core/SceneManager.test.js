import SceneManager from '../../../src/core/SceneManager.js';
import * as THREE from 'three';

// Use the existing THREE mock
jest.mock('three');

describe('SceneManager', () => {
  let sceneManager;
  let originalAddEventListener;
  let mockEvents = {};

  beforeEach(() => {
    // Mock THREE.js methods
    const mockTHREE = require('three');
    mockTHREE.WebGLRenderer = jest.fn().mockImplementation(() => ({
      setSize: jest.fn(),
      setPixelRatio: jest.fn(),
      render: jest.fn(),
      domElement: {}
    }));
    
    mockTHREE.PerspectiveCamera = jest.fn().mockImplementation((fov, aspect, near, far) => ({
      fov: fov || 75,
      aspect: aspect || 1,
      near: near || 0.1,
      far: far || 1000,
      position: {
        x: 0,
        y: 10,
        z: 20,
        set: jest.fn(),
        copy: jest.fn()
      },
      lookAt: jest.fn(),
      updateProjectionMatrix: jest.fn()
    }));
    
    mockTHREE.Scene = jest.fn().mockImplementation(() => ({
      add: jest.fn()
    }));
    
    mockTHREE.Vector3 = jest.fn().mockImplementation((x, y, z) => ({
      x: x || 0,
      y: y || 0,
      z: z || 0,
      copy: jest.fn()
    }));
    
    // Mock document.body.appendChild
    document.body.appendChild = jest.fn();
    
    // Mock window event listeners
    originalAddEventListener = window.addEventListener;
    window.addEventListener = jest.fn((event, callback) => {
      if (!mockEvents[event]) {
        mockEvents[event] = [];
      }
      mockEvents[event].push(callback);
    });
    
    // Create a new instance of SceneManager for each test
    sceneManager = new SceneManager();
  });

  afterEach(() => {
    // Reset mocks and restore window event listeners
    window.addEventListener = originalAddEventListener;
    mockEvents = {};
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    test('should initialize with correct default properties', () => {
      expect(sceneManager.scenes).toBeInstanceOf(Map);
      expect(sceneManager.scenes.size).toBe(0);
      expect(sceneManager.currentScene).toBeNull();
      expect(sceneManager.renderer).toBeDefined();
      expect(sceneManager.camera).toBeNull();
      expect(sceneManager.cameraSpeed).toBe(20);
      expect(sceneManager.cameraBounds).toEqual({
        minX: -50, maxX: 50,
        minZ: -50, maxZ: 50
      });
      expect(Object.values(sceneManager.keys).every(value => value === false)).toBe(true);
    });

    test('should initialize renderer and controls', () => {
      expect(document.body.appendChild).toHaveBeenCalledWith(sceneManager.renderer.domElement);
      expect(sceneManager.renderer.setSize).toHaveBeenCalled();
      expect(sceneManager.renderer.setPixelRatio).toHaveBeenCalled();
      expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(window.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    });
  });

  describe('createScene method', () => {
    test('should create a scene with default camera options', () => {
      const { scene, camera } = sceneManager.createScene('test');
      
      expect(scene).toBeDefined();
      expect(camera).toBeDefined();
      expect(camera.fov).toBe(75);
      expect(camera.near).toBe(0.1);
      expect(camera.far).toBe(1000);
      expect(camera.position).toEqual({ x: 0, y: 10, z: 20, set: expect.any(Function), copy: expect.any(Function) });
      expect(sceneManager.scenes.has('test')).toBe(true);
      expect(sceneManager.scenes.get('test')).toEqual({ scene, camera });
    });

    test('should create a scene with custom camera options', () => {
      const mockVector3 = {
        x: 10,
        y: 20,
        z: 30
      };
      
      const cameraOptions = {
        fov: 60,
        near: 0.5,
        far: 2000,
        position: mockVector3
      };
      
      const { scene, camera } = sceneManager.createScene('custom', cameraOptions);
      
      expect(camera.fov).toBe(60);
      expect(camera.near).toBe(0.5);
      expect(camera.far).toBe(2000);
      expect(camera.position.copy).toHaveBeenCalledWith(mockVector3);
    });
  });

  describe('setActiveScene method', () => {
    test('should set the active scene and return true', () => {
      const { scene, camera } = sceneManager.createScene('main');
      
      const result = sceneManager.setActiveScene('main');
      
      expect(result).toBe(true);
      expect(sceneManager.currentScene).toBe('main');
      expect(sceneManager.camera).toBe(camera);
    });

    test('should return false for non-existent scene', () => {
      // Mock console.error
      const originalConsoleError = console.error;
      console.error = jest.fn();
      
      const result = sceneManager.setActiveScene('nonexistent');
      
      expect(result).toBe(false);
      expect(sceneManager.currentScene).toBeNull();
      expect(sceneManager.camera).toBeNull();
      expect(console.error).toHaveBeenCalledWith('Scene with id nonexistent not found');
      
      // Restore console.error
      console.error = originalConsoleError;
    });
  });

  describe('getActiveScene method', () => {
    test('should return the active scene', () => {
      const sceneData = sceneManager.createScene('active');
      sceneManager.setActiveScene('active');
      
      const result = sceneManager.getActiveScene();
      
      expect(result).toEqual(sceneData);
    });

    test('should return null when no active scene', () => {
      const result = sceneManager.getActiveScene();
      
      expect(result).toBeNull();
    });
  });

  describe('updateCamera method', () => {
    beforeEach(() => {
      sceneManager.createScene('test');
      sceneManager.setActiveScene('test');
    });

    test('should do nothing if no camera is set', () => {
      sceneManager.camera = null;
      
      sceneManager.updateCamera(0.016);
      
      // Nothing should happen, just testing it doesn't throw
    });

    test('should update camera position based on key states', () => {
      // Set up initial position
      sceneManager.camera.position = { x: 0, y: 10, z: 0 };
      
      // Move forward (W or ArrowUp pressed)
      sceneManager.keys.w = true;
      sceneManager.updateCamera(1);
      expect(sceneManager.camera.position.z).toBeLessThan(0);
      
      // Reset and move backward (S or ArrowDown pressed)
      sceneManager.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
      sceneManager.camera.position = { x: 0, y: 10, z: 0 };
      sceneManager.keys.s = true;
      sceneManager.updateCamera(1);
      expect(sceneManager.camera.position.z).toBeGreaterThan(0);
      
      // Reset and move left (A or ArrowLeft pressed)
      sceneManager.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
      sceneManager.camera.position = { x: 0, y: 10, z: 0 };
      sceneManager.keys.a = true;
      sceneManager.updateCamera(1);
      expect(sceneManager.camera.position.x).toBeLessThan(0);
      
      // Reset and move right (D or ArrowRight pressed)
      sceneManager.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
      sceneManager.camera.position = { x: 0, y: 10, z: 0 };
      sceneManager.keys.d = true;
      sceneManager.updateCamera(1);
      expect(sceneManager.camera.position.x).toBeGreaterThan(0);
      
      // Should normalize diagonal movement
      sceneManager.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
      sceneManager.camera.position = { x: 0, y: 10, z: 0 };
      sceneManager.keys.w = true;
      sceneManager.keys.d = true;
      sceneManager.updateCamera(1);
      // In diagonal movement, the magnitude should be normalized
    });

    test('should respect camera bounds', () => {
      // Set bounds
      sceneManager.setCameraBounds(-10, 10, -10, 10);
      
      // Try to move beyond max bounds
      sceneManager.camera.position = { x: 9, y: 10, z: 9 };
      sceneManager.keys.d = true;
      sceneManager.keys.s = true;
      sceneManager.updateCamera(1);
      
      expect(sceneManager.camera.position.x).toBeLessThanOrEqual(10);
      expect(sceneManager.camera.position.z).toBeLessThanOrEqual(10);
      
      // Try to move beyond min bounds
      sceneManager.camera.position = { x: -9, y: 10, z: -9 };
      sceneManager.keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
      sceneManager.keys.a = true;
      sceneManager.keys.w = true;
      sceneManager.updateCamera(1);
      
      expect(sceneManager.camera.position.x).toBeGreaterThanOrEqual(-10);
      expect(sceneManager.camera.position.z).toBeGreaterThanOrEqual(-10);
    });
  });

  describe('setCameraBounds method', () => {
    test('should set camera bounds correctly', () => {
      sceneManager.setCameraBounds(-100, 100, -100, 100);
      
      expect(sceneManager.cameraBounds).toEqual({
        minX: -100, maxX: 100,
        minZ: -100, maxZ: 100
      });
    });
  });

  describe('onWindowResize method', () => {
    test('should update camera and renderer on window resize', () => {
      // Create scene and set active
      sceneManager.createScene('resize-test');
      sceneManager.setActiveScene('resize-test');
      
      // Get resize handler
      const resizeHandler = mockEvents['resize'][0];
      
      // Call resize handler
      resizeHandler();
      
      expect(sceneManager.camera.updateProjectionMatrix).toHaveBeenCalled();
      expect(sceneManager.renderer.setSize).toHaveBeenCalledWith(window.innerWidth, window.innerHeight);
    });

    test('should do nothing if no camera is set', () => {
      sceneManager.camera = null;
      
      // Get resize handler
      const resizeHandler = mockEvents['resize'][0];
      
      // Call resize handler (should not throw)
      resizeHandler();
    });
  });

  describe('render method', () => {
    test('should render current scene', () => {
      const { scene, camera } = sceneManager.createScene('render-test');
      sceneManager.setActiveScene('render-test');
      
      sceneManager.render(0.016);
      
      expect(sceneManager.renderer.render).toHaveBeenCalledWith(scene, camera);
    });

    test('should do nothing if no current scene', () => {
      sceneManager.currentScene = null;
      
      sceneManager.render(0.016);
      
      expect(sceneManager.renderer.render).not.toHaveBeenCalled();
    });
  });

  describe('keyboard controls', () => {
    test('should update key states on keydown', () => {
      // Get keydown handler
      const keydownHandler = mockEvents['keydown'][0];
      
      // Test each key
      keydownHandler({ key: 'w' });
      expect(sceneManager.keys.w).toBe(true);
      
      keydownHandler({ key: 'ArrowUp' });
      expect(sceneManager.keys.ArrowUp).toBe(true);
      
      // Test non-tracked key
      keydownHandler({ key: 'x' });
      expect(sceneManager.keys.x).toBeUndefined();
    });

    test('should update key states on keyup', () => {
      // Set initial state
      sceneManager.keys.w = true;
      sceneManager.keys.ArrowUp = true;
      
      // Get keyup handler
      const keyupHandler = mockEvents['keyup'][0];
      
      // Test each key
      keyupHandler({ key: 'w' });
      expect(sceneManager.keys.w).toBe(false);
      
      keyupHandler({ key: 'ArrowUp' });
      expect(sceneManager.keys.ArrowUp).toBe(false);
      
      // Test non-tracked key
      keyupHandler({ key: 'x' });
      expect(sceneManager.keys.x).toBeUndefined();
    });
  });
});