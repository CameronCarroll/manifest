// Comprehensive Three.js mock for testing
class Object3D {
  constructor() {
    this.children = [];
    this.parent = null;
    this.position = { x: 0, y: 0, z: 0, set: jest.fn() };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.scale = { x: 1, y: 1, z: 1, set: jest.fn() };
    this.visible = true;
    this.userData = {};
    this.matrixWorld = { copy: jest.fn() };
    this.matrix = { copy: jest.fn() };
    this.up = { x: 0, y: 1, z: 0 };
  }
  
  add(child) {
    this.children.push(child);
    child.parent = this;
    return this;
  }
  
  remove(child) {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
    }
    return this;
  }
  
  updateMatrix() {
    return this;
  }
  
  updateMatrixWorld() {
    return this;
  }
  
  lookAt() {
    return this;
  }
  
  traverse(callback) {
    callback(this);
    this.children.forEach(child => child.traverse(callback));
  }
  
  isDescendantOf(parent) {
    let current = this.parent;
    while (current) {
      if (current === parent) {return true;}
      current = current.parent;
    }
    return false;
  }
}
  
// Three.js classes
class Scene extends Object3D {}
class Group extends Object3D {}
class Mesh extends Object3D {
  constructor(geometry, material) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.type = 'Mesh';
  }
  
  clone() {
    return new Mesh(this.geometry, this.material);
  }
}
  
class Camera extends Object3D {
  constructor() {
    super();
    this.matrixWorldInverse = { copy: jest.fn() };
    this.projectionMatrix = { copy: jest.fn() };
    this.projectionMatrixInverse = { copy: jest.fn() };
  }
  
  updateProjectionMatrix() {
    return this;
  }
}
  
class PerspectiveCamera extends Camera {
  constructor(fov, aspect, near, far) {
    super();
    this.fov = fov || 50;
    this.aspect = aspect || 1;
    this.near = near || 0.1;
    this.far = far || 2000;
    this.zoom = 1;
  }
}
  
class WebGLRenderer {
  constructor(parameters = {}) {
    this.domElement = document.createElement('canvas');
    this.capabilities = { isWebGL2: true };
    this.shadowMap = { enabled: false, type: 1 };
    this.outputEncoding = 3000;
    this.setSize = jest.fn();
    this.setPixelRatio = jest.fn();
    this.render = jest.fn();
    this.setClearColor = jest.fn();
    this.clear = jest.fn();
    this.getRenderTarget = jest.fn();
    this.setRenderTarget = jest.fn();
  }
}
  
// Geometry classes
class BufferGeometry {
  constructor() {
    this.attributes = {};
    this.dispose = jest.fn();
  }
  
  setAttribute(name, attribute) {
    this.attributes[name] = attribute;
    return this;
  }
}
  
class BoxGeometry extends BufferGeometry {
  constructor(width, height, depth) {
    super();
    this.parameters = { width, height, depth };
  }
}
  
class PlaneGeometry extends BufferGeometry {
  constructor(width, height) {
    super();
    this.parameters = { width, height };
  }
}
  
class SphereGeometry extends BufferGeometry {
  constructor(radius, widthSegments, heightSegments) {
    super();
    this.parameters = { radius, widthSegments, heightSegments };
  }
}
  
class CylinderGeometry extends BufferGeometry {
  constructor(radiusTop, radiusBottom, height, radialSegments) {
    super();
    this.parameters = { radiusTop, radiusBottom, height, radialSegments };
  }
}
  
class RingGeometry extends BufferGeometry {
  constructor(innerRadius, outerRadius, thetaSegments) {
    super();
    this.parameters = { innerRadius, outerRadius, thetaSegments };
  }
}
  
class DodecahedronGeometry extends BufferGeometry {
  constructor(radius, detail) {
    super();
    this.parameters = { radius, detail };
  }
}
  
class ConeGeometry extends BufferGeometry {
  constructor(radius, height, radialSegments) {
    super();
    this.parameters = { radius, height, radialSegments };
  }
}
  
// Material classes
class Material {
  constructor() {
    this.transparent = false;
    this.opacity = 1;
    this.side = 0; // FrontSide
    this.visible = true;
    this.dispose = jest.fn();
  }
  
  clone() {
    return new Material();
  }
}
  
class MeshBasicMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.color = parameters.color || 0xffffff;
    Object.assign(this, parameters);
  }
  
  clone() {
    return new MeshBasicMaterial({ color: this.color });
  }
}
  
class MeshPhongMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.color = parameters.color || 0xffffff;
    Object.assign(this, parameters);
  }
  
  clone() {
    return new MeshPhongMaterial({ color: this.color });
  }
}
  
class MeshStandardMaterial extends Material {
  constructor(parameters = {}) {
    super();
    this.color = parameters.color || 0xffffff;
    this.roughness = parameters.roughness !== undefined ? parameters.roughness : 1;
    this.metalness = parameters.metalness !== undefined ? parameters.metalness : 0;
    Object.assign(this, parameters);
  }
  
  clone() {
    return new MeshStandardMaterial({ 
      color: this.color, 
      roughness: this.roughness, 
      metalness: this.metalness 
    });
  }
}
  
// Light classes
class Light extends Object3D {
  constructor(color, intensity) {
    super();
    this.color = color || 0xffffff;
    this.intensity = intensity !== undefined ? intensity : 1;
  }
}
  
class AmbientLight extends Light {}
class DirectionalLight extends Light {}
  
// Math classes
class Vector2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }
}
  
class Vector3 {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  
  set(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }
  
  copy(v) {
    this.x = v.x;
    this.y = v.y;
    this.z = v.z;
    return this;
  }
  
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }
  
  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }
  
  project(camera) {
    // Simple mock that doesn't do actual projection math
    return new Vector3(this.x, this.y, this.z);
  }
}
  
class Plane {
  constructor(normal = new Vector3(0, 0, 1), constant = 0) {
    this.normal = normal;
    this.constant = constant;
  }
}
  
class Raycaster {
  constructor() {
    this.ray = {
      origin: new Vector3(),
      direction: new Vector3(),
      intersectPlane: jest.fn().mockReturnValue(new Vector3())
    };
    this.near = 0;
    this.far = Infinity;
  }
  
  setFromCamera(coords, camera) {
    return this;
  }
  
  intersectObjects(objects, recursive = false) {
    // Return empty array by default, can be mocked as needed for tests
    return [];
  }
}
  
class GridHelper extends Object3D {
  constructor(size, divisions) {
    super();
    this.size = size;
    this.divisions = divisions;
  }
}
  
// Texture classes
class Texture {
  constructor() {
    this.dispose = jest.fn();
  }
}
  
class CanvasTexture extends Texture {}
  
// Texture loader
class TextureLoader {
  constructor() {
    this.load = jest.fn((url, onLoad, onProgress, onError) => {
      if (onLoad) {onLoad(new Texture());}
      return new Texture();
    });
  }
}
  
// Constants
const DoubleSide = 2;
  
// Export Three.js mock
export {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  PlaneGeometry,
  SphereGeometry,
  CylinderGeometry,
  RingGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Mesh,
  Group,
  Vector2,
  Vector3,
  Raycaster,
  Plane,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  TextureLoader,
  CanvasTexture,
  DoubleSide,
};
  
// Default export
export default {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  PlaneGeometry,
  SphereGeometry,
  CylinderGeometry,
  RingGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshPhongMaterial,
  MeshStandardMaterial,
  Mesh,
  Group,
  Vector2,
  Vector3,
  Raycaster,
  Plane,
  AmbientLight,
  DirectionalLight,
  GridHelper,
  TextureLoader,
  CanvasTexture,
  DoubleSide,
};