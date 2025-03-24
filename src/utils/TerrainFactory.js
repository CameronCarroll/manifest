// src/utils/TerrainFactory.js
import * as THREE from 'three';

/**
 * TerrainFactory - Creates terrain textures and environmental objects
 * This class centralizes terrain creation logic
 */
class TerrainFactory {
  constructor(scene, textureLoader) {
    this.scene = scene;
    this.textureLoader = textureLoader;
    this.textures = new Map();
    this.debug = false;
  }

  // Create a terrain texture based on type
  async createTerrainTexture(terrainType) {
    // Check if we already have this texture cached
    if (this.textures.has(terrainType)) {
      return this.textures.get(terrainType);
    }

    // Base texture paths
    const texturePaths = {
      reclaimed_urban: {
        diffuse: '/assets/textures/terrain/reclaimed_urban_diffuse.jpg',
        normal: '/assets/textures/terrain/reclaimed_urban_normal.jpg',
        roughness: '/assets/textures/terrain/reclaimed_urban_roughness.jpg',
        displacement: '/assets/textures/terrain/reclaimed_urban_displacement.jpg'
      },
      techno_organic_forest: {
        diffuse: '/assets/textures/terrain/techno_organic_forest_diffuse.jpg',
        normal: '/assets/textures/terrain/techno_organic_forest_normal.jpg',
        roughness: '/assets/textures/terrain/techno_organic_forest_roughness.jpg',
        displacement: '/assets/textures/terrain/techno_organic_forest_displacement.jpg'
      },
      crystal_wastes: {
        diffuse: '/assets/textures/terrain/crystal_wastes_diffuse.jpg',
        normal: '/assets/textures/terrain/crystal_wastes_normal.jpg',
        roughness: '/assets/textures/terrain/crystal_wastes_roughness.jpg',
        displacement: '/assets/textures/terrain/crystal_wastes_displacement.jpg'
      },
      nanite_swamps: {
        diffuse: '/assets/textures/terrain/nanite_swamps_diffuse.jpg',
        normal: '/assets/textures/terrain/nanite_swamps_normal.jpg',
        roughness: '/assets/textures/terrain/nanite_swamps_roughness.jpg',
        displacement: '/assets/textures/terrain/nanite_swamps_displacement.jpg'
      },
      solar_fields: {
        diffuse: '/assets/textures/terrain/solar_fields_diffuse.jpg',
        normal: '/assets/textures/terrain/solar_fields_normal.jpg',
        roughness: '/assets/textures/terrain/solar_fields_roughness.jpg',
        displacement: '/assets/textures/terrain/solar_fields_displacement.jpg'
      }
    };

    // If texture doesn't exist, create a procedural one
    if (!texturePaths[terrainType]) {
      return this.createProceduralTexture(terrainType);
    }

    try {
      // Load textures
      const paths = texturePaths[terrainType];
      const diffuseTexture = await this.loadTexture(paths.diffuse);
      const normalTexture = await this.loadTexture(paths.normal);
      const roughnessTexture = await this.loadTexture(paths.roughness);
      const displacementTexture = await this.loadTexture(paths.displacement);

      // Configure texture properties
      diffuseTexture.wrapS = THREE.RepeatWrapping;
      diffuseTexture.wrapT = THREE.RepeatWrapping;
      diffuseTexture.repeat.set(4, 4);

      normalTexture.wrapS = THREE.RepeatWrapping;
      normalTexture.wrapT = THREE.RepeatWrapping;
      normalTexture.repeat.set(4, 4);

      roughnessTexture.wrapS = THREE.RepeatWrapping;
      roughnessTexture.wrapT = THREE.RepeatWrapping;
      roughnessTexture.repeat.set(4, 4);

      displacementTexture.wrapS = THREE.RepeatWrapping;
      displacementTexture.wrapT = THREE.RepeatWrapping;
      displacementTexture.repeat.set(4, 4);

      // Create material
      const material = new THREE.MeshStandardMaterial({
        map: diffuseTexture,
        normalMap: normalTexture,
        roughnessMap: roughnessTexture,
        displacementMap: displacementTexture,
        displacementScale: 0.2
      });

      // Cache and return
      this.textures.set(terrainType, material);
      return material;
    } catch (error) {
      console.error(`Error loading terrain textures for ${terrainType}:`, error);
      return this.createProceduralTexture(terrainType);
    }
  }

  // Load a texture with error handling
  async loadTexture(path) {
    return new Promise((resolve, reject) => {
      try {
        this.textureLoader.load(
          path,
          texture => resolve(texture),
          undefined,
          error => {
            console.warn(`Failed to load texture ${path}, creating procedural fallback`);
            resolve(this.createProceduralTextureImage(path));
          }
        );
      } catch (error) {
        console.warn(`Error in texture loading for ${path}:`, error);
        resolve(this.createProceduralTextureImage(path));
      }
    });
  }

  // Create a procedural texture as fallback
  createProceduralTextureImage(path) {
    // Extract texture type from path
    const isNormal = path.includes('normal');
    const isRoughness = path.includes('roughness');
    const isDisplacement = path.includes('displacement');
    const isDiffuse = !isNormal && !isRoughness && !isDisplacement;

    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Determine base color based on texture type
    let baseColor;
    if (isNormal) {
      baseColor = '#8080ff'; // Normal map blue
    } else if (isRoughness) {
      baseColor = '#808080'; // Medium roughness
    } else if (isDisplacement) {
      baseColor = '#808080'; // Medium displacement
    } else {
      // For diffuse, determine color based on terrain type
      if (path.includes('reclaimed_urban')) {
        baseColor = '#606060'; // Concrete gray
      } else if (path.includes('techno_organic_forest')) {
        baseColor = '#305030'; // Dark green
      } else if (path.includes('crystal_wastes')) {
        baseColor = '#a0a0c0'; // Light purple-blue
      } else if (path.includes('nanite_swamps')) {
        baseColor = '#405060'; // Blue-gray
      } else if (path.includes('solar_fields')) {
        baseColor = '#a0a060'; // Yellow-brown
      } else {
        baseColor = '#808080'; // Default gray
      }
    }

    // Fill background
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add noise pattern
    this.addNoiseToCanvas(ctx, canvas.width, canvas.height, isNormal, isRoughness, isDisplacement);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);

    return texture;
  }

  // Add noise pattern to canvas
  addNoiseToCanvas(ctx, width, height, isNormal, isRoughness, isDisplacement) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      // Different noise patterns based on texture type
      if (isNormal) {
        // Subtle variations for normal map
        data[i] = data[i] + (Math.random() * 20 - 10);     // R
        data[i + 1] = data[i + 1] + (Math.random() * 20 - 10); // G
        data[i + 2] = data[i + 2];                         // B - keep blue channel
      } else if (isRoughness) {
        // Grainy pattern for roughness
        const noise = Math.random() * 40 - 20;
        data[i] = data[i] + noise;     // R
        data[i + 1] = data[i + 1] + noise; // G
        data[i + 2] = data[i + 2] + noise; // B
      } else if (isDisplacement) {
        // Height variations for displacement
        const noise = Math.random() * 60 - 30;
        data[i] = data[i] + noise;     // R
        data[i + 1] = data[i + 1] + noise; // G
        data[i + 2] = data[i + 2] + noise; // B
      } else {
        // Color variations for diffuse
        data[i] = data[i] + (Math.random() * 30 - 15);     // R
        data[i + 1] = data[i + 1] + (Math.random() * 30 - 15); // G
        data[i + 2] = data[i + 2] + (Math.random() * 30 - 15); // B
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Add larger patterns
    if (isDisplacement) {
      // Add some hills and valleys
      for (let i = 0; i < 20; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = 20 + Math.random() * 50;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, Math.random() > 0.5 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    } else if (!isNormal) {
      // Add some patterns for diffuse and roughness
      for (let i = 0; i < 10; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = 10 + Math.random() * 30;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, 'rgba(255,255,255,0.1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }
    }
  }

  // Create a procedural terrain texture
  createProceduralTexture(terrainType) {
    // Create basic textures
    const diffuseTexture = this.createProceduralTextureImage(`/assets/textures/terrain/${terrainType}_diffuse.jpg`);
    const normalTexture = this.createProceduralTextureImage(`/assets/textures/terrain/${terrainType}_normal.jpg`);
    const roughnessTexture = this.createProceduralTextureImage(`/assets/textures/terrain/${terrainType}_roughness.jpg`);
    const displacementTexture = this.createProceduralTextureImage(`/assets/textures/terrain/${terrainType}_displacement.jpg`);

    // Create material
    const material = new THREE.MeshStandardMaterial({
      map: diffuseTexture,
      normalMap: normalTexture,
      roughnessMap: roughnessTexture,
      displacementMap: displacementTexture,
      displacementScale: 0.2
    });

    // Cache and return
    this.textures.set(terrainType, material);
    return material;
  }

  // Create a terrain mesh with the specified texture
  async createTerrainMesh(terrainType, width, height, widthSegments, heightSegments) {
    const material = await this.createTerrainTexture(terrainType);
    const geometry = new THREE.PlaneGeometry(width, height, widthSegments, heightSegments);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2; // Lay flat
    mesh.receiveShadow = true;
    
    return mesh;
  }

  // Create an environmental object based on type
  createEnvironmentalObject(objectType, position = { x: 0, y: 0, z: 0 }) {
    let object;
    
    switch (objectType) {
      case 'server_monolith':
        object = this.createServerMonolith();
        break;
      case 'floating_crystal':
        object = this.createFloatingCrystal();
        break;
      case 'corrupted_machinery':
        object = this.createCorruptedMachinery();
        break;
      case 'circuit_tree':
        object = this.createCircuitTree();
        break;
      case 'holographic_ruin':
        object = this.createHolographicRuin();
        break;
      case 'energy_geyser':
        object = this.createEnergyGeyser();
        break;
      case 'rock':
        object = this.createRock();
        break;
      case 'hill':
        object = this.createHill();
        break;
      default:
        object = this.createRock(); // Default fallback
    }
    
    // Set position
    object.position.set(position.x, position.y, position.z);
    
    return object;
  }

  // Create a server monolith object
  createServerMonolith() {
    const group = new THREE.Group();
    
    // Main server rack
    const rackGeometry = new THREE.BoxGeometry(1.5, 4, 1);
    const rackMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 50
    });
    const rack = new THREE.Mesh(rackGeometry, rackMaterial);
    rack.position.y = 2; // Half height
    group.add(rack);
    
    // Server units
    const serverUnitGeometry = new THREE.BoxGeometry(1.4, 0.2, 0.9);
    const serverUnitMaterial = new THREE.MeshPhongMaterial({
      color: 0x111111,
      shininess: 70
    });
    
    // Add multiple server units
    for (let i = 0; i < 15; i++) {
      const serverUnit = new THREE.Mesh(serverUnitGeometry, serverUnitMaterial);
      serverUnit.position.y = 0.5 + i * 0.25;
      group.add(serverUnit);
      
      // Add blinking lights to some units
      if (i % 3 === 0) {
        const lightsGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const redLight = new THREE.Mesh(
          lightsGeometry,
          new THREE.MeshBasicMaterial({ color: 0xff0000, emissive: 0xff0000 })
        );
        redLight.position.set(0.6, serverUnit.position.y, 0.3);
        
        const greenLight = new THREE.Mesh(
          lightsGeometry,
          new THREE.MeshBasicMaterial({ color: 0x00ff00, emissive: 0x00ff00 })
        );
        greenLight.position.set(0.5, serverUnit.position.y, 0.3);
        
        group.add(redLight, greenLight);
        
        // Add blinking animation
        redLight.userData = {
          isLight: true,
          blinkSpeed: 0.5 + Math.random() * 2
        };
        
        greenLight.userData = {
          isLight: true,
          blinkSpeed: 0.2 + Math.random()
        };
      }
    }
    
    // Add overgrowth elements
    const vineGeometry = new THREE.CylinderGeometry(0.03, 0.03, 3, 4);
    const vineMaterial = new THREE.MeshPhongMaterial({
      color: 0x225522,
      shininess: 10
    });
    
    for (let i = 0; i < 5; i++) {
      const vine = new THREE.Mesh(vineGeometry, vineMaterial);
      const angle = i * Math.PI * 2 / 5;
      const radius = 0.8;
      
      vine.position.set(
        Math.sin(angle) * radius,
        1.5,
        Math.cos(angle) * radius
      );
      
      // Bend the vine
      vine.rotation.x = Math.random() * 0.5 - 0.25;
      vine.rotation.z = Math.random() * 0.5 - 0.25;
      
      group.add(vine);
      
      // Add leaves
      const leafGeometry = new THREE.SphereGeometry(0.1, 4, 4);
      leafGeometry.scale(1, 0.3, 1);
      const leafMaterial = new THREE.MeshPhongMaterial({
        color: 0x33aa33,
        shininess: 5
      });
      
      for (let j = 0; j < 3; j++) {
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.position.y = 0.5 + j * 1;
        leaf.rotation.x = Math.random() * Math.PI;
        leaf.rotation.y = Math.random() * Math.PI;
        leaf.rotation.z = Math.random() * Math.PI;
        vine.add(leaf);
      }
    }
    
    // Add animation data
    group.userData = {
      animationType: 'server_monolith',
      time: 0
    };
    
    return group;
  }

  // Create a floating crystal object
  createFloatingCrystal() {
    const group = new THREE.Group();
    
    // Main crystal
    const crystalGeometry = new THREE.OctahedronGeometry(0.7, 1);
    const crystalMaterial = new THREE.MeshPhongMaterial({
      color: 0x88aaff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.5,
      shininess: 90,
      transparent: true,
      opacity: 0.8
    });
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial);
    crystal.position.y = 1.5; // Floating height
    group.add(crystal);
    
    // Add smaller crystals around the main one
    for (let i = 0; i < 5; i++) {
      const smallCrystalGeometry = new THREE.OctahedronGeometry(0.2, 0);
      const smallCrystal = new THREE.Mesh(smallCrystalGeometry, crystalMaterial.clone());
      
      const angle = i * Math.PI * 2 / 5;
      const radius = 0.8;
      const height = 1.3 + Math.random() * 0.5;
      
      smallCrystal.position.set(
        Math.sin(angle) * radius,
        height,
        Math.cos(angle) * radius
      );
      
      smallCrystal.rotation.x = Math.random() * Math.PI;
      smallCrystal.rotation.y = Math.random() * Math.PI;
      smallCrystal.rotation.z = Math.random() * Math.PI;
      
      // Store animation parameters
      smallCrystal.userData = {
        baseY: smallCrystal.position.y,
        floatSpeed: 0.5 + Math.random() * 0.5,
        floatHeight: 0.1 + Math.random() * 0.1,
        rotationSpeed: 0.2 + Math.random() * 0.3
      };
      
      group.add(smallCrystal);
    }
    
    // Add light glow
    const glowGeometry = new THREE.SphereGeometry(0.9, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x88aaff,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 1.5;
    group.add(glow);
    
    // Add energy tendrils connecting to the ground
    for (let i = 0; i < 3; i++) {
      const tendrilGeometry = new THREE.CylinderGeometry(0.02, 0.02, 1.5, 4);
      const tendrilMaterial = new THREE.MeshBasicMaterial({
        color: 0x88aaff,
        transparent: true,
        opacity: 0.5
      });
      const tendril = new THREE.Mesh(tendrilGeometry, tendrilMaterial);
      
      const angle = i * Math.PI * 2 / 3;
      const radius = 0.3;
      
      tendril.position.set(
        Math.sin(angle) * radius,
        0.75, // Half height
        Math.cos(angle) * radius
      );
      
      // Store animation parameters
      tendril.userData = {
        pulseSpeed: 1 + Math.random(),
        baseOpacity: tendrilMaterial.opacity
      };
      
      group.add(tendril);
    }
    
    // Add animation data
    group.userData = {
      animationType: 'floating_crystal',
      time: 0,
      mainCrystal: crystal,
      glow: glow
    };
    
    // Store animation parameters for main crystal
    crystal.userData = {
      baseY: crystal.position.y,
      floatSpeed: 0.3,
      floatHeight: 0.2,
      rotationSpeed: 0.1
    };
    
    return group;
  }

  // Create a corrupted machinery object
  createCorruptedMachinery() {
    const group = new THREE.Group();
    
    // Base machine
    const baseGeometry = new THREE.BoxGeometry(2, 0.5, 1.5);
    const baseMaterial = new THREE.MeshPhongMaterial({
      color: 0x555555,
      shininess: 30
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.25;
    group.add(base);
    
    // Add mechanical components
    const cylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 16);
    const cylinderMaterial = new THREE.MeshPhongMaterial({
      color: 0x777777,
      shininess: 50
    });
    const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
    cylinder.position.set(0, 1.1, 0);
    cylinder.rotation.x = Math.PI / 2;
    group.add(cylinder);
    
    // Add pistons
    for (let i = 0; i < 2; i++) {
      const pistonGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
      const piston = new THREE.Mesh(pistonGeometry, cylinderMaterial);
      piston.position.set(
        i === 0 ? 0.5 : -0.5,
        0.8,
        0
      );
      piston.rotation.x = Math.PI / 2;
      
      // Store animation parameters
      piston.userData = {
        isPiston: true,
        baseZ: piston.position.z,
        pistonSpeed: 0.5 + Math.random() * 0.5,
        pistonDistance: 0.2
      };
      
      group.add(piston);
    }
    
    // Add corruption effects
    const corruptionGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const corruptionMaterial = new THREE.MeshPhongMaterial({
      color: 0xaa00aa,
      emissive: 0x550055,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    });
    
    for (let i = 0; i < 8; i++) {
      const corruption = new THREE.Mesh(corruptionGeometry, corruptionMaterial.clone());
      
      // Random position on the machine
      corruption.position.set(
        (Math.random() * 2 - 1) * 0.8,
        0.5 + Math.random() * 0.8,
        (Math.random() * 2 - 1) * 0.6
      );
      
      corruption.scale.set(
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5
      );
      
      // Store animation parameters
      corruption.userData = {
        isCorruption: true,
        pulseSpeed: 0.5 + Math.random() * 1.5,
        baseScale: corruption.scale.clone()
      };
      
      group.add(corruption);
    }
    
    // Add tendrils
    const tendrilGeometry = new THREE.CylinderGeometry(0.03, 0.01, 1, 4);
    const tendrilMaterial = new THREE.MeshPhongMaterial({
      color: 0xaa00aa,
      emissive: 0x550055,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.7
    });
    
    for (let i = 0; i < 6; i++) {
      const tendril = new THREE.Mesh(tendrilGeometry, tendrilMaterial);
      
      // Random position and rotation
      const angle = i * Math.PI * 2 / 6;
      const radius = 0.7;
      
      tendril.position.set(
        Math.sin(angle) * radius,
        0.5,
        Math.cos(angle) * radius
      );
      
      tendril.rotation.x = Math.random() * 0.5 - 0.25;
      tendril.rotation.z = Math.random() * 0.5 - 0.25;
      
      // Store animation parameters
      tendril.userData = {
        isTendril: true,
        waveSpeed: 0.5 + Math.random(),
        waveAmount: 0.1 + Math.random() * 0.1
      };
      
      group.add(tendril);
    }
    
    // Add animation data
    group.userData = {
      animationType: 'corrupted_machinery',
      time: 0
    };
    
    return group;
  }

  // Create a circuit tree object
  createCircuitTree() {
    const group = new THREE.Group();
    
    // Tree trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8);
    const trunkMaterial = new THREE.MeshPhongMaterial({
      color: 0x553311,
      shininess: 5
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.5;
    group.add(trunk);
    
    // Add circuit patterns to trunk
    this.addCircuitPatterns(trunk, 0x00ffaa, 1.0);
    
    // Add branches
    const branchGeometry = new THREE.CylinderGeometry(0.1, 0.15, 1.5, 6);
    const branchMaterial = new THREE.MeshPhongMaterial({
      color: 0x442200,
      shininess: 5
    });
    
    for (let i = 0; i < 5; i++) {
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      // Position around trunk
      const angle = i * Math.PI * 2 / 5;
      const height = 1.5 + Math.random() * 1.5;
      
      branch.position.set(
        Math.sin(angle) * 0.3,
        height,
        Math.cos(angle) * 0.3
      );
      
      // Rotate outward
      branch.rotation.z = Math.sin(angle) * (Math.PI / 3);
      branch.rotation.x = Math.cos(angle) * (Math.PI / 3);
      
      // Add circuit patterns to branch
      this.addCircuitPatterns(branch, 0x00ffaa, 1.0);
      
      group.add(branch);
      
      // Add leaves to branch
      this.addCircuitLeaves(branch, 3 + Math.floor(Math.random() * 3));
    }
    
    // Add animation data
    group.userData = {
      animationType: 'circuit_tree',
      time: 0
    };
    
    return group;
  }

  // Add circuit patterns to an object
  addCircuitPatterns(mesh, color, opacity) {
    // Create circuit pattern material
    const circuitMaterial = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity * 0.8
    });
    
    // Add horizontal rings
    for (let i = 0; i < 3; i++) {
      const ringGeometry = new THREE.TorusGeometry(mesh.geometry.parameters.radiusTop * 1.01, 0.02, 8, 16);
      const ring = new THREE.Mesh(ringGeometry, circuitMaterial);
      ring.position.y = mesh.geometry.parameters.height * (0.2 + i * 0.3);
      ring.rotation.x = Math.PI / 2;
      
      // Store animation parameters
      ring.userData = {
        isCircuit: true,
        pulseSpeed: 0.5 + Math.random(),
        baseOpacity: circuitMaterial.opacity
      };
      
      mesh.add(ring);
    }
    
    // Add vertical lines
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const lineGeometry = new THREE.BoxGeometry(0.02, mesh.geometry.parameters.height * 0.8, 0.02);
      const line = new THREE.Mesh(lineGeometry, circuitMaterial);
      
      line.position.set(
        Math.sin(angle) * (mesh.geometry.parameters.radiusTop * 1.01),
        0,
        Math.cos(angle) * (mesh.geometry.parameters.radiusTop * 1.01)
      );
      
      // Store animation parameters
      line.userData = {
        isCircuit: true,
        pulseSpeed: 0.3 + Math.random() * 0.5,
        baseOpacity: circuitMaterial.opacity
      };
      
      mesh.add(line);
    }
  }

  // Add circuit leaves to a branch
  addCircuitLeaves(branch, count) {
    for (let i = 0; i < count; i++) {
      // Create leaf geometry
      const leafGeometry = new THREE.CircleGeometry(0.2, 5);
      const leafMaterial = new THREE.MeshPhongMaterial({
        color: 0x00aa44,
        shininess: 10,
        side: THREE.DoubleSide
      });
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      
      // Position along branch
      leaf.position.set(
        (Math.random() * 2 - 1) * 0.1,
        branch.geometry.parameters.height * (0.3 + Math.random() * 0.6),
        (Math.random() * 2 - 1) * 0.1
      );
      
      // Random rotation
      leaf.rotation.x = Math.random() * Math.PI;
      leaf.rotation.y = Math.random() * Math.PI;
      leaf.rotation.z = Math.random() * Math.PI;
      
      branch.add(leaf);
      
      // Add circuit pattern to leaf
      const circuitGeometry = new THREE.CircleGeometry(0.15, 5);
      const circuitMaterial = new THREE.MeshBasicMaterial({
        color: 0x00ffaa,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      const circuit = new THREE.Mesh(circuitGeometry, circuitMaterial);
      circuit.position.z = 0.01; // Slight offset
      
      // Store animation parameters
      circuit.userData = {
        isCircuit: true,
        pulseSpeed: 0.5 + Math.random(),
        baseOpacity: circuitMaterial.opacity
      };
      
      leaf.add(circuit);
    }
  }

  // Create a holographic ruin object
  createHolographicRuin() {
    const group = new THREE.Group();
    
    // Base projector
    const baseGeometry = new THREE.CylinderGeometry(0.5, 0.7, 0.3, 16);
    const baseMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 50
    });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.15;
    group.add(base);
    
    // Add tech details to base
    const ringGeometry = new THREE.RingGeometry(0.4, 0.45, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.position.y = 0.31;
    ring.rotation.x = -Math.PI / 2;
    
    // Store animation parameters
    ring.userData = {
      isHologram: true,
      pulseSpeed: 1.0,
      baseOpacity: ringMaterial.opacity
    };
    
    group.add(ring);
    
    // Create holographic building
    const buildingGeometry = new THREE.BoxGeometry(1.5, 2, 1.5);
    const buildingMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    });
    const building = new THREE.Mesh(buildingGeometry, buildingMaterial);
    building.position.y = 1.3;
    
    // Store animation parameters
    building.userData = {
      isHologram: true,
      glitchSpeed: 0.5,
      glitchIntensity: 0.1,
      baseOpacity: buildingMaterial.opacity
    };
    
    group.add(building);
    
    // Add holographic details
    const detailGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const detailMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5
    });
    
    for (let i = 0; i < 5; i++) {
      const detail = new THREE.Mesh(detailGeometry, detailMaterial.clone());
      
      // Random position within building
      detail.position.set(
        (Math.random() * 2 - 1) * 0.5,
        0.5 + Math.random() * 1.5,
        (Math.random() * 2 - 1) * 0.5
      );
      
      detail.scale.set(
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5,
        0.5 + Math.random() * 0.5
      );
      
      // Store animation parameters
      detail.userData = {
        isHologram: true,
        floatSpeed: 0.3 + Math.random() * 0.3,
        floatHeight: 0.1 + Math.random() * 0.1,
        baseY: detail.position.y,
        glitchSpeed: 0.2 + Math.random() * 0.5,
        glitchIntensity: 0.05 + Math.random() * 0.1,
        baseOpacity: detail.material.opacity
      };
      
      group.add(detail);
    }
    
    // Add animation data
    group.userData = {
      animationType: 'holographic_ruin',
      time: 0
    };
    
    return group;
  }

  // Create an energy geyser object
  createEnergyGeyser() {
    const group = new THREE.Group();
    
    // Base crater
    const craterGeometry = new THREE.CircleGeometry(1, 32);
    const craterMaterial = new THREE.MeshPhongMaterial({
      color: 0x333333,
      shininess: 10,
      side: THREE.DoubleSide
    });
    const crater = new THREE.Mesh(craterGeometry, craterMaterial);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 0.01; // Slightly above ground
    group.add(crater);
    
    // Inner energy pool
    const poolGeometry = new THREE.CircleGeometry(0.7, 32);
    const poolMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const pool = new THREE.Mesh(poolGeometry, poolMaterial);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0.02; // Above crater
    
    // Store animation parameters
    pool.userData = {
      isEnergyPool: true,
      pulseSpeed: 1.0,
      baseOpacity: poolMaterial.opacity
    };
    
    group.add(pool);
    
    // Energy column
    const columnGeometry = new THREE.CylinderGeometry(0.2, 0.5, 3, 16);
    const columnMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.5
    });
    const column = new THREE.Mesh(columnGeometry, columnMaterial);
    column.position.y = 1.5; // Half height
    
    // Store animation parameters
    column.userData = {
      isEnergyColumn: true,
      pulseSpeed: 0.8,
      baseOpacity: columnMaterial.opacity,
      baseScale: new THREE.Vector3(1, 1, 1)
    };
    
    group.add(column);
    
    // Energy particles
    const particleGroup = new THREE.Group();
    const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const particleMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.8
    });
    
    for (let i = 0; i < 20; i++) {
      const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
      
      // Random position within column
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.3;
      const height = Math.random() * 3;
      
      particle.position.set(
        Math.sin(angle) * radius,
        height,
        Math.cos(angle) * radius
      );
      
      particle.scale.set(
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.7,
        0.3 + Math.random() * 0.7
      );
      
      // Store animation parameters
      particle.userData = {
        isParticle: true,
        speed: 0.5 + Math.random() * 1.5,
        baseY: particle.position.y,
        maxY: 3.0,
        baseOpacity: particle.material.opacity
      };
      
      particleGroup.add(particle);
    }
    
    group.add(particleGroup);
    
    // Add animation data
    group.userData = {
      animationType: 'energy_geyser',
      time: 0,
      particleGroup: particleGroup
    };
    
    return group;
  }

  // Create a rock object
  createRock() {
    const group = new THREE.Group();
    
    // Create a random rock shape
    const rockGeometry = new THREE.DodecahedronGeometry(0.5, 1);
    
    // Randomize vertices for more natural look
    const positionAttribute = rockGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Add random variation to each vertex
      vertex.x += (Math.random() * 2 - 1) * 0.1;
      vertex.y += (Math.random() * 2 - 1) * 0.1;
      vertex.z += (Math.random() * 2 - 1) * 0.1;
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    rockGeometry.computeVertexNormals();
    
    // Create rock material
    const rockMaterial = new THREE.MeshPhongMaterial({
      color: 0x777777,
      shininess: 5
    });
    
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.y = 0.3; // Half height
    
    // Random rotation
    rock.rotation.x = Math.random() * Math.PI;
    rock.rotation.y = Math.random() * Math.PI;
    rock.rotation.z = Math.random() * Math.PI;
    
    // Random scale
    const scale = 0.7 + Math.random() * 0.6;
    rock.scale.set(scale, scale * 0.8, scale);
    
    group.add(rock);
    
    return group;
  }

  // Create a hill object
  createHill() {
    const group = new THREE.Group();
    
    // Create hill geometry
    const hillGeometry = new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    
    // Randomize vertices for more natural look
    const positionAttribute = hillGeometry.getAttribute('position');
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i);
      
      // Don't modify bottom vertices (y near 0)
      if (vertex.y > 0.1) {
        // Add random variation to each vertex
        vertex.x += (Math.random() * 2 - 1) * 0.1;
        vertex.y += (Math.random() * 2 - 1) * 0.1;
        vertex.z += (Math.random() * 2 - 1) * 0.1;
      }
      
      positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    hillGeometry.computeVertexNormals();
    
    // Create hill material
    const hillMaterial = new THREE.MeshPhongMaterial({
      color: 0x556633,
      shininess: 5
    });
    
    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    
    // Random scale
    const scaleXZ = 1.5 + Math.random() * 1.0;
    const scaleY = 0.7 + Math.random() * 0.5;
    hill.scale.set(scaleXZ, scaleY, scaleXZ);
    
    group.add(hill);
    
    // Add some rocks on the hill
    for (let i = 0; i < 3; i++) {
      const rock = this.createRock();
      
      // Position on hill surface
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.7;
      
      rock.position.set(
        Math.sin(angle) * radius,
        0.3 + Math.sin(radius / 0.7 * Math.PI / 2) * scaleY,
        Math.cos(angle) * radius
      );
      
      rock.scale.multiplyScalar(0.5); // Make rocks smaller
      
      group.add(rock);
    }
    
    return group;
  }

  // Update animations for environmental objects
  updateAnimations(deltaTime) {
    // This method would be called from the animation system
    // to update all environmental object animations
  }
}

export default TerrainFactory;
