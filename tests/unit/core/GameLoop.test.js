import GameLoop from '../../../src/core/GameLoop.js';

describe('GameLoop', () => {
  let gameLoop;
  let mockUpdateCallback;
  let mockRenderCallback;
  let originalRequestAnimationFrame;

  beforeEach(() => {
    // Save original requestAnimationFrame
    originalRequestAnimationFrame = global.requestAnimationFrame;
    
    // Mock callbacks
    mockUpdateCallback = jest.fn();
    mockRenderCallback = jest.fn();
    
    // Create GameLoop instance
    gameLoop = new GameLoop(mockUpdateCallback, mockRenderCallback);
    
    // Mock requestAnimationFrame to call the callback immediately with a timestamp
    global.requestAnimationFrame = jest.fn(callback => {
      setTimeout(() => callback(performance.now()), 0);
      return 1; // Return a dummy ID
    });
    
    // Mock performance.now to return consistent timestamps for testing
    let currentTime = 1000; // Start at 1 second
    jest.spyOn(performance, 'now').mockImplementation(() => {
      currentTime += 16; // Add ~16ms (simulate ~60fps)
      return currentTime;
    });
  });

  afterEach(() => {
    // Restore original requestAnimationFrame
    global.requestAnimationFrame = originalRequestAnimationFrame;
    // Restore performance.now
    if (performance.now.mockRestore) {
      performance.now.mockRestore();
    }
  });

  describe('initialization', () => {
    test('should initialize with provided callbacks', () => {
      expect(gameLoop.updateCallback).toBe(mockUpdateCallback);
      expect(gameLoop.renderCallback).toBe(mockRenderCallback);
      expect(gameLoop.running).toBe(false);
      expect(gameLoop.lastTimestamp).toBe(0);
    });
  });

  describe('start method', () => {
    test('should set running flag and start loop', () => {
      gameLoop.start();
      
      expect(gameLoop.running).toBe(true);
      expect(gameLoop.lastTimestamp).toBeGreaterThan(0);
      expect(global.requestAnimationFrame).toHaveBeenCalled();
    });

    test('should not restart if already running', () => {
      // Set running flag manually
      gameLoop.running = true;
      gameLoop.lastTimestamp = 500;
      
      gameLoop.start();
      
      // Values should remain unchanged
      expect(gameLoop.running).toBe(true);
      expect(gameLoop.lastTimestamp).toBe(500);
      expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    });
  });

  describe('stop method', () => {
    test('should clear running flag', () => {
      // Start the loop
      gameLoop.start();
      expect(gameLoop.running).toBe(true);
      
      // Stop the loop
      gameLoop.stop();
      expect(gameLoop.running).toBe(false);
    });
  });

  describe('loop method', () => {
    test('should call update and render callbacks with delta time', (done) => {
      // Set a fake timestamp
      gameLoop.lastTimestamp = 1000;
      
      // Call loop with a later timestamp
      gameLoop.running = true;
      gameLoop.loop(1016); // 16ms later
      
      // Use setTimeout to allow the mocked requestAnimationFrame to execute
      setTimeout(() => {
        try {
          // Check that callbacks were called with correct delta time
          expect(mockUpdateCallback).toHaveBeenCalledWith(0.016); // 16ms = 0.016s
          expect(mockRenderCallback).toHaveBeenCalledWith(0.016);
          
          // Check that requestAnimationFrame was called to continue the loop
          expect(global.requestAnimationFrame).toHaveBeenCalled();
          done();
        } catch (error) {
          done(error);
        }
      }, 10);
    });

    test('should not continue loop if not running', () => {
      // Call loop but with running=false
      gameLoop.running = false;
      gameLoop.loop(1016);
      
      // Callbacks should not be called
      expect(mockUpdateCallback).not.toHaveBeenCalled();
      expect(mockRenderCallback).not.toHaveBeenCalled();
      expect(global.requestAnimationFrame).not.toHaveBeenCalled();
    });
  });
});