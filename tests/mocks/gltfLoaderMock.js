import { Scene, Group } from './threeMock.js';

class GLTFLoader {
  constructor() {
    this.load = jest.fn((path, onLoad, onProgress, onError) => {
      // Create a mock GLTF result
      const mockScene = new Scene();
      const mockResult = {
        scene: mockScene,
        scenes: [mockScene],
        animations: [],
        cameras: [],
        asset: { version: '2.0' },
        parser: {},
        userData: {}
      };
      
      if (onLoad) {
        setTimeout(() => onLoad(mockResult), 0);
      }
      
      return mockResult;
    });
  }
}

export { GLTFLoader };
export default GLTFLoader;