module.exports = {
    // Use a transformer for ES modules
    transform: {
      '^.+\\.(js|mjs)$': 'babel-jest',
    },
    
    // The root directory where Jest should scan for tests
    rootDir: './',
    
    // The test environment that will be used for testing
    testEnvironment: 'jsdom',
    
    // The glob patterns Jest uses to detect test files
    testMatch: [
      '**/tests/**/*.test.js',
      '**/tests/**/*.spec.js',
    ],
    
    // Files to ignore
    testPathIgnorePatterns: [
      '/node_modules/',
      '/public/'
    ],
    
    // Collect coverage information
    collectCoverage: true,
    
    // Directory where Jest should output its coverage files
    coverageDirectory: 'coverage',
    
    // Files for which to collect coverage
    collectCoverageFrom: [
      'src/**/*.js',
      '!src/index.js',
      '!**/node_modules/**',
    ],
    
    // Setup files to run before each test
    // setupFilesAfterEnv: ['<rootDir>/tests/jest.setup.js'],
    
    // Mock paths for imports
    moduleNameMapper: {
      // Mock CSS imports
      '\\.(css|less|scss)$': '<rootDir>/tests/mocks/styleMock.js',
      // Mock static asset imports
      '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/tests/mocks/fileMock.js',
      // Handle Three.js imports
      '^three$': '<rootDir>/tests/mocks/threeMock.js',
      '^three/examples/jsm/loaders/GLTFLoader.js$': '<rootDir>/tests/mocks/gltfLoaderMock.js',
    },
    
    // Handle ES modules
    moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],
    
    // Verbose output
    verbose: true,
  };