import * as THREE from 'three';

class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
    this.renderer = null;
    this.camera = null;
    
    // Camera control properties
    this.cameraSpeed = 20; // Units per second
    this.cameraBounds = {
      minX: -50, maxX: 50,
      minZ: -50, maxZ: 50
    };
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      w: false,
      a: false,
      s: false,
      d: false
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

  onWindowResize() {
    if (!this.camera) return;
    
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  createScene(id, cameraOptions = {}) {
    const scene = new THREE.Scene();
    
    const camera = new THREE.PerspectiveCamera(
      cameraOptions.fov || 75,
      window.innerWidth / window.innerHeight,
      cameraOptions.near || 0.1,
      cameraOptions.far || 1000
    );
    
    if (cameraOptions.position) {
      camera.position.copy(cameraOptions.position);
    } else {
      camera.position.set(0, 10, 20);
    }
    
    camera.lookAt(0, 0, 0);
    
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
    if (!this.currentScene) return null;
    return this.scenes.get(this.currentScene);
  }

  updateCamera(deltaTime) {
    if (!this.camera) return;

    let moveX = 0;
    let moveZ = 0;

    // Handle WASD and arrow keys for camera movement
    if (this.keys.ArrowUp || this.keys.w) moveZ -= 1;
    if (this.keys.ArrowDown || this.keys.s) moveZ += 1;
    if (this.keys.ArrowLeft || this.keys.a) moveX -= 1;
    if (this.keys.ArrowRight || this.keys.d) moveX += 1;

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
    if (!this.currentScene) return;
    
    // Update camera position based on input
    this.updateCamera(deltaTime);
    
    const { scene, camera } = this.scenes.get(this.currentScene);
    this.renderer.render(scene, camera);
  }
}

export default SceneManager;