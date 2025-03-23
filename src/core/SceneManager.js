import * as THREE from 'three';

class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
    this.renderer = null;
    this.camera = null;
    
    // Camera zoom parameters
    this.minZoom = 20; // Closest zoom
    this.maxZoom = 100; // Furthest zoom
    this.zoomSpeed = 1.1; // Zoom sensitivity
    
    // Camera control properties
    this.cameraSpeed = 25; // Units per second - increased by 25%
    this.cameraBounds = {
      minX: -50, maxX: 50,
      minZ: -50, maxZ: 50
    };
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false
    };
    
    this.initRenderer();
    this.initControls();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this));
    window.addEventListener('wheel', this.onMouseWheel.bind(this));
  }

  initControls() {
    // Keyboard events for camera movement
    window.addEventListener('keydown', (event) => {
      if (this.keys.hasOwnProperty(event.key)) {
        this.keys[event.key] = true;
      }
    });
    
    window.addEventListener('keyup', (event) => {
      if (this.keys.hasOwnProperty(event.key)) {
        this.keys[event.key] = false;
      }
    });
  }

  onMouseWheel(event) {
    if (!this.camera) {
      return;
    }

    // Prevent default scroll behavior
    event.preventDefault();

    // Zoom based on wheel delta
    // Different browsers handle wheel events differently
    const delta = event.deltaY > 0 ? 1 : -1;
    
    // Calculate new camera height
    const zoomFactor = delta > 0 ? this.zoomSpeed : 1 / this.zoomSpeed;
    const currentHeight = this.camera.position.y;
    const newHeight = Math.min(
      Math.max(currentHeight * zoomFactor, this.minZoom), 
      this.maxZoom
    );

    // Update camera position while maintaining proportional distance from ground
    const heightRatio = newHeight / currentHeight;
    this.camera.position.y = newHeight;
    this.camera.position.x *= heightRatio;
    this.camera.position.z *= heightRatio;
  }

  onWindowResize() {
    if (!this.camera) {return;}
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  createScene(id, cameraOptions = {}) {
    console.log('[Camera Debug] Creating scene with options:', JSON.stringify(cameraOptions, null, 2));
  
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      cameraOptions.fov || 75,
      window.innerWidth / window.innerHeight,
      cameraOptions.near || 0.1,
      cameraOptions.far || 1000
    );
    
    console.log('[Camera Debug] Initial camera position before set:', camera.position);
  
    if (cameraOptions.position) {
      // Validate the position object before copying
      if (
        cameraOptions.position instanceof THREE.Vector3 && 
        !isNaN(cameraOptions.position.x) && 
        !isNaN(cameraOptions.position.y) && 
        !isNaN(cameraOptions.position.z)
      ) {
        camera.position.copy(cameraOptions.position);
        console.log('[Camera Debug] Position copied from options:', camera.position);
      } else {
        console.warn('[Camera Debug] Invalid position object, using default');
        camera.position.set(0, 10, 20);
      }
    } else {
      camera.position.set(0, 10, 20);
      console.log('[Camera Debug] Using default position:', camera.position);
    }
  
    camera.lookAt(0, 0, 0);
    
    console.log('[Camera Debug] Final camera position:', camera.position);
    
    this.scenes.set(id, { scene, camera });
    return { scene, camera };
  }

  setActiveScene(id) {
    if (!this.scenes.has(id)) {
      console.error(`Scene with id ${id} not found`);
      return false;
    }
    
    this.currentScene = id;
    const { camera } = this.scenes.get(id);
    this.camera = camera;
    return true;
  }

  getActiveScene() {
    if (!this.currentScene) {return null;}
    return this.scenes.get(this.currentScene);
  }

  updateCamera(deltaTime) {
    if (!this.camera) {return;}

    let moveX = 0;
    let moveZ = 0;

    // Handle arrow keys for camera movement
    if (this.keys.ArrowUp) {moveZ -= 1;}
    if (this.keys.ArrowDown) {moveZ += 1;}
    if (this.keys.ArrowLeft) {moveX -= 1;}
    if (this.keys.ArrowRight) {moveX += 1;}

    // Normalize diagonal movement
    if (moveX !== 0 && moveZ !== 0) {
      const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
      moveX /= length;
      moveZ /= length;
    }

    // Apply camera speed and delta time
    moveX *= this.cameraSpeed * deltaTime;
    moveZ *= this.cameraSpeed * deltaTime;

    // Move camera in XZ plane
    this.camera.position.x += moveX;
    this.camera.position.z += moveZ;

    // Apply camera bounds
    this.camera.position.x = Math.max(this.cameraBounds.minX, Math.min(this.cameraBounds.maxX, this.camera.position.x));
    this.camera.position.z = Math.max(this.cameraBounds.minZ, Math.min(this.cameraBounds.maxZ, this.camera.position.z));
  }

  setCameraBounds(minX, maxX, minZ, maxZ) {
    this.cameraBounds = { minX, maxX, minZ, maxZ };
  }

  render(deltaTime) {
    if (!this.currentScene) {return;}
    
    // Update camera position based on input
    this.updateCamera(deltaTime);
    
    const { scene, camera } = this.scenes.get(this.currentScene);
    this.renderer.render(scene, camera);
  }
}

export default SceneManager;