import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ModelLoader {
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.loadedModels = new Map();
    this.loadedTextures = new Map();
  }

  async loadModel(modelId, modelPath) {
    if (this.loadedModels.has(modelId)) {
      return this.loadedModels.get(modelId).clone();
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        modelPath,
        (gltf) => {
          const model = gltf.scene;
          this.loadedModels.set(modelId, model);
          resolve(model.clone());
        },
        (progress) => {
          console.log(`Loading model ${modelId}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error(`Error loading model ${modelId}:`, error);
          reject(error);
        }
      );
    });
  }

  async loadTexture(textureId, texturePath) {
    if (this.loadedTextures.has(textureId)) {
      return this.loadedTextures.get(textureId);
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        texturePath,
        (texture) => {
          this.loadedTextures.set(textureId, texture);
          resolve(texture);
        },
        (progress) => {
          console.log(`Loading texture ${textureId}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
        },
        (error) => {
          console.error(`Error loading texture ${textureId}:`, error);
          reject(error);
        }
      );
    });
  }

  // Create a placeholder model (for testing or when a model is not available)
  createPlaceholderModel(modelId, options = {}) {
    const {
      geometry = new THREE.BoxGeometry(1, 1, 1),
      material = new THREE.MeshPhongMaterial({ color: 0x00ff00 }),
      scale = { x: 1, y: 1, z: 1 }
    } = options;

    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale.x, scale.y, scale.z);
    this.loadedModels.set(modelId, mesh);
    return mesh.clone();
  }

  // Create a placeholder texture
  createPlaceholderTexture(textureId, options = {}) {
    const {
      width = 64,
      height = 64,
      color = 0xffffff
    } = options;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.fillRect(0, 0, width, height);

    const texture = new THREE.CanvasTexture(canvas);
    this.loadedTextures.set(textureId, texture);
    return texture;
  }

  // Clear cached models and textures
  clearCache() {
    this.loadedModels.clear();
    this.loadedTextures.clear();
  }
}

export default ModelLoader;
