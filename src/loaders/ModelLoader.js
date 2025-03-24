import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ModelLoader {
  constructor() {
    // Set up loading manager for tracking and error handling
    this.loadingManager = new THREE.LoadingManager();
    
    // Configure loading manager callbacks
    this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      const percent = (itemsLoaded / itemsTotal * 100).toFixed(2);
      console.log(`Loading assets: ${percent}% (${itemsLoaded}/${itemsTotal})`);
      
      // Call custom progress callback if available
      if (this.onProgress) {
        this.onProgress(percent, itemsLoaded, itemsTotal);
      }
    };
    
    this.loadingManager.onError = (url) => {
      console.error(`Error loading asset: ${url}`);
    };
    
    this.loadingManager.onLoad = () => {
      console.log('All assets loaded successfully');
      
      // Process the next queue item if there are any
      this.processQueue();
    };
    
    // Initialize loaders with the loading manager
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    
    // Initialize caches
    this.loadedModels = new Map();
    this.loadedTextures = new Map();
    
    // Queue system
    this.loadingQueue = [];
    this.isLoading = false;
    this.maxConcurrentLoads = 3;
    this.activeLoads = 0;
    
    this.debug = false;
  }
  
  // Add a model to the loading queue
  queueModel(modelId, modelPath, priority = 2) {
    this.loadingQueue.push({
      type: 'model',
      id: modelId,
      path: modelPath,
      priority: priority // 1 = high, 2 = medium, 3 = low
    });
    
    // Sort queue by priority (lowest number = highest priority)
    this.loadingQueue.sort((a, b) => a.priority - b.priority);
    
    if (this.debug) {
      console.log(`Queued model ${modelId} with priority ${priority}`);
    }
    
    // Start processing if not already in progress
    if (!this.isLoading) {
      this.processQueue();
    }
  }
  
  // Add a texture to the loading queue
  queueTexture(textureId, texturePath, priority = 2) {
    this.loadingQueue.push({
      type: 'texture',
      id: textureId,
      path: texturePath,
      priority: priority
    });
    
    // Sort queue by priority
    this.loadingQueue.sort((a, b) => a.priority - b.priority);
    
    if (this.debug) {
      console.log(`Queued texture ${textureId} with priority ${priority}`);
    }
    
    // Start processing if not already in progress
    if (!this.isLoading) {
      this.processQueue();
    }
  }
  
  // Process the loading queue
  processQueue() {
    if (this.loadingQueue.length === 0) {
      this.isLoading = false;
      return;
    }
    
    this.isLoading = true;
    
    // Process up to maxConcurrentLoads items at once
    while (this.activeLoads < this.maxConcurrentLoads && this.loadingQueue.length > 0) {
      const item = this.loadingQueue.shift();
      this.activeLoads++;
      
      if (item.type === 'model') {
        this.loadModel(item.id, item.path)
          .finally(() => {
            this.activeLoads--;
            this.processQueue();
          });
      } else if (item.type === 'texture') {
        this.loadTexture(item.id, item.path)
          .finally(() => {
            this.activeLoads--;
            this.processQueue();
          });
      }
    }
  }

  async loadModel(modelId, modelPath) {
    // Return cached model if available
    if (this.loadedModels.has(modelId)) {
      if (this.debug) {
        console.log(`Using cached model for ${modelId}`);
      }
      return this.loadedModels.get(modelId).clone();
    }

    if (this.debug) {
      console.log(`Loading model ${modelId} from ${modelPath}`);
    }

    return new Promise((resolve, reject) => {
      try {
        this.gltfLoader.load(
          modelPath,
          (gltf) => {
            const model = gltf.scene;
            
            // Optimize model before caching
            this.optimizeModel(model);
            
            // Cache the model
            this.loadedModels.set(modelId, model);
            resolve(model.clone());
          },
          (progress) => {
            if (progress.lengthComputable) {
              const percent = (progress.loaded / progress.total * 100).toFixed(2);
              if (this.debug) {
                console.log(`Loading model ${modelId}: ${percent}%`);
              }
            }
          },
          (error) => {
            console.error(`Error loading model ${modelId}:`, error);
            
            // Create a placeholder model instead of rejecting
            const placeholder = this.createPlaceholderModel(modelId);
            resolve(placeholder);
          }
        );
      } catch (error) {
        console.error(`Exception during model loading for ${modelId}:`, error);
        const placeholder = this.createPlaceholderModel(modelId);
        resolve(placeholder);
      }
    });
  }

  async loadTexture(textureId, texturePath) {
    // Return cached texture if available
    if (this.loadedTextures.has(textureId)) {
      if (this.debug) {
        console.log(`Using cached texture for ${textureId}`);
      }
      return this.loadedTextures.get(textureId);
    }

    if (this.debug) {
      console.log(`Loading texture ${textureId} from ${texturePath}`);
    }

    return new Promise((resolve, reject) => {
      try {
        this.textureLoader.load(
          texturePath,
          (texture) => {
            // Configure texture properties
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            
            // Cache the texture
            this.loadedTextures.set(textureId, texture);
            resolve(texture);
          },
          (progress) => {
            if (progress.lengthComputable) {
              const percent = (progress.loaded / progress.total * 100).toFixed(2);
              if (this.debug) {
                console.log(`Loading texture ${textureId}: ${percent}%`);
              }
            }
          },
          (error) => {
            console.error(`Error loading texture ${textureId}:`, error);
            
            // Create a placeholder texture instead of rejecting
            const placeholder = this.createPlaceholderTexture(textureId);
            resolve(placeholder);
          }
        );
      } catch (error) {
        console.error(`Exception during texture loading for ${textureId}:`, error);
        const placeholder = this.createPlaceholderTexture(textureId);
        resolve(placeholder);
      }
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
  
  // Optimize a model for performance
  optimizeModel(model) {
    if (!model) return;
    
    try {
      // Traverse the model hierarchy
      model.traverse((node) => {
        // If it's a mesh with geometry, optimize it
        if (node.isMesh && node.geometry) {
          // Compute vertex normals if they don't exist
          if (!node.geometry.attributes.normal) {
            node.geometry.computeVertexNormals();
          }
          
          // Add bounding information for frustum culling
          if (!node.geometry.boundingSphere) {
            node.geometry.computeBoundingSphere();
          }
          
          if (!node.geometry.boundingBox) {
            node.geometry.computeBoundingBox();
          }
          
          // Enable shadows for all meshes
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
    } catch (error) {
      console.warn('Error optimizing model:', error);
    }
  }
  
  // Preload common assets
  preloadCommonAssets() {
    // Queue common textures with high priority
    this.queueTexture('terrain_base', 'assets/textures/terrain/base.jpg', 1);
    this.queueTexture('terrain_normal', 'assets/textures/terrain/normal.jpg', 1);
    
    // Queue placeholder models
    this.queueModel('unit', 'assets/models/unit.gltf', 1);
    this.queueModel('building', 'assets/models/building.gltf', 1);
    
    if (this.debug) {
      console.log('Preloaded common assets');
    }
  }
}

export default ModelLoader;
