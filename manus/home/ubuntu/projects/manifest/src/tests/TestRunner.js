// src/tests/TestRunner.js
import * as THREE from 'three';
import GraphicsExtensionTest from './GraphicsExtensionTest.js';

/**
 * TestRunner - Utility to run the graphics extension tests
 */
class TestRunner {
  constructor() {
    // Set up renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);
    
    // Set up scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111111);
    
    // Set up camera
    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.set(0, 10, 20);
    this.camera.lookAt(0, 0, 0);
    
    // Set up lights
    this.setupLights();
    
    // Set up test suite
    this.testSuite = new GraphicsExtensionTest(this.scene, this.camera, this.renderer);
    
    // Animation loop
    this.animate = this.animate.bind(this);
    
    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }
  
  // Set up lights
  setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -25;
    directionalLight.shadow.camera.right = 25;
    directionalLight.shadow.camera.top = 25;
    directionalLight.shadow.camera.bottom = -25;
    
    this.scene.add(directionalLight);
    
    // Point light for additional illumination
    const pointLight = new THREE.PointLight(0x8888ff, 0.5);
    pointLight.position.set(-10, 15, -10);
    this.scene.add(pointLight);
  }
  
  // Run tests
  async runTests() {
    console.log('TestRunner: Starting tests');
    
    try {
      // Run all tests
      const results = await this.testSuite.runAllTests();
      
      // Start animation loop to visualize results
      this.animate();
      
      return results;
    } catch (error) {
      console.error('TestRunner: Error running tests:', error);
      return null;
    }
  }
  
  // Animation loop
  animate() {
    requestAnimationFrame(this.animate);
    
    // Update test animations
    if (this.testSuite) {
      this.testSuite.update();
    }
    
    // Render scene
    this.renderer.render(this.scene, this.camera);
  }
  
  // Handle window resize
  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  // Clean up
  dispose() {
    // Remove renderer from DOM
    if (this.renderer && this.renderer.domElement) {
      document.body.removeChild(this.renderer.domElement);
    }
    
    // Dispose of test objects
    if (this.testSuite) {
      this.testSuite.clearTestObjects();
    }
    
    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize);
  }
}

export default TestRunner;
