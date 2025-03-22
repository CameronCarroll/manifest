import * as THREE from 'three';

class SceneManager {
  constructor() {
    this.scenes = new Map();
    this.currentScene = null;
    this.renderer = null;
    this.camera = null;
    this.initRenderer();
  }

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(this.renderer.domElement);

    window.addEventListener('resize', this.onWindowResize.bind(this));
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

  render() {
    if (!this.currentScene) return;
    
    const { scene, camera } = this.scenes.get(this.currentScene);
    this.renderer.render(scene, camera);
  }
}

export default SceneManager;
